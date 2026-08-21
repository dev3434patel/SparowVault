<?php

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/utils.php";
require_once __DIR__ . "/../helpers/security.php";
require_once __DIR__ . "/../helpers/validator.php";
require_once __DIR__ . "/../helpers/policy.php";
require_once __DIR__ . "/../helpers/user_audit.php";

function auth_throttle_status_safe(string $username, string $ip): array {
    try {
        return login_throttle_status($username, $ip);
    } catch (Throwable $e) {
        return ["blocked" => false, "attempts" => 0];
    }
}

function auth_record_failure_safe(string $username, string $ip): void {
    try {
        record_login_failure($username, $ip);
    } catch (Throwable $e) {
        // Best-effort: auth must not crash if throttle storage is unavailable.
    }
}

function auth_clear_failures_safe(string $username, string $ip): void {
    try {
        clear_login_failures($username, $ip);
    } catch (Throwable $e) {
        // Best-effort cleanup only.
    }
}

function cloud_logout(): void {
    clear_auth_cookie();
    json_ok(["loggedOut" => true]);
}

function cloud_auth_response(string $token, array $user, ?string $csrfToken = null): array {
    $payload = ["user" => $user];
    $env = strtolower((string)(($_ENV["APP_ENV"] ?? getenv("APP_ENV")) ?: "development"));
    if ($env !== "production") {
        // Dev/test compatibility for CLI E2E harnesses. Browser auth uses the httpOnly cookie.
        $payload["token"] = $token;
    }
    if ($csrfToken !== null && $csrfToken !== "") {
        // Returned so cross-origin SPAs can set X-CSRF-Token when document.cookie cannot read sv_csrf.
        $payload["csrfToken"] = $csrfToken;
    }
    return $payload;
}

function cloud_register(): void {
    rate_limit_guard("auth_register", 20, 300);
    $body = require_json_body();
    try {
        validate_required_fields($body, ["username", "displayName", "pin"]);
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $username = strtolower(trim((string)($body["username"] ?? "")));
    $displayName = trim((string)($body["displayName"] ?? ""));
    $pin = (string)($body["pin"] ?? "");
    $policyAcceptances = $body["policyAcceptances"] ?? [];

    if (strlen($username) < 3 || strlen($username) > 24 || preg_match('/^[a-zA-Z0-9._-]+$/', $username) !== 1) {
        json_error("Invalid payload");
        return;
    }
    $pinError = auth_pin_validation_error($pin);
    if ($displayName === "" || strlen($displayName) > 60 || $pinError !== null) {
        json_error($pinError ?? "Display name must be 1 to 60 characters", 422, "VALIDATION_ERROR");
        return;
    }
    if (!is_array($policyAcceptances)) {
        json_error("Policy acceptance is required", 422, "POLICY_ACCEPTANCE_REQUIRED");
        return;
    }
    $currentPolicies = policy_current_versions();
    $acceptedMap = [];
    foreach ($policyAcceptances as $item) {
        if (!is_array($item)) continue;
        $acceptedMap[(string)($item["key"] ?? "")] = (string)($item["version"] ?? "");
    }
    foreach (["terms", "privacy"] as $requiredPolicy) {
        if (($acceptedMap[$requiredPolicy] ?? "") !== $currentPolicies[$requiredPolicy]) {
            json_error("Terms and Privacy acceptance is required", 422, "POLICY_ACCEPTANCE_REQUIRED");
            return;
        }
    }

    $db = db_conn();
    if (db_user_by_username($username)) {
        json_error("Username already exists", 409);
        return;
    }

    $userId = uid("cu");
    $pinSalt = create_pin_salt();
    $pinHash = hash_secret($pin . ":" . $pinSalt);
    $db->beginTransaction();
    try {
        $ins = $db->prepare("INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'user', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())");
        $ins->execute([$userId, $username, $displayName, $pinHash, $pinSalt]);
        $ip = (string)($_SERVER["REMOTE_ADDR"] ?? "");
        $ua = (string)($_SERVER["HTTP_USER_AGENT"] ?? "");
        foreach ($acceptedMap as $key => $version) {
            if (isset($currentPolicies[$key]) && $currentPolicies[$key] === $version) {
                policy_record_acceptance($userId, $key, $version, $ip, $ua);
            }
        }
        user_audit_log($userId, "REGISTER", "user", $userId, null, ["username" => $username]);
        user_audit_log($userId, "POLICY_ACCEPTED", "policy", "registration", null, $acceptedMap);
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    $token = sign_cloud_token(["userId" => $userId, "username" => $username, "role" => "user"]);
    set_auth_cookie($token);
    $csrf = csrf_issue_token();
    json_ok(cloud_auth_response($token, ["id" => $userId, "username" => $username, "displayName" => $displayName, "role" => "user", "policyOutstanding" => []], $csrf), 201);
}

function cloud_login(): void {
    rate_limit_guard("auth_login", 30, 300);
    $body = require_json_body();
    try {
        validate_required_fields($body, ["username", "pin"]);
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $username = strtolower(trim((string)($body["username"] ?? "")));
    $pin = (string)($body["pin"] ?? "");

    $pinError = auth_pin_validation_error($pin);
    if (strlen($username) < 3 || strlen($username) > 24 || $pinError !== null) {
        json_error($pinError ?? "Invalid username or PIN format", 422, "VALIDATION_ERROR");
        return;
    }

    $ip = (string)($_SERVER["REMOTE_ADDR"] ?? "unknown");
    $throttle = auth_throttle_status_safe($username, $ip);
    if (($throttle["blocked"] ?? false) === true) {
        json_error("Too many failed attempts. Try again later.", 429, "AUTH_THROTTLED");
        return;
    }

    $user = db_user_by_username($username);
    if (!$user) {
        auth_record_failure_safe($username, $ip);
        json_error("Invalid username or PIN", 401);
        return;
    }
    if (((int)$user["is_active"]) !== 1) {
        json_error("Account inactive", 403, "ACCOUNT_INACTIVE");
        return;
    }
    if ((string)$user["role"] === "admin") {
        json_error("Use /admin login for admin accounts", 403, "USE_ADMIN_PORTAL");
        return;
    }
    if (!verify_secret($pin . ":" . (string)$user["pin_salt"], (string)$user["pin_hash"])) {
        auth_record_failure_safe($username, $ip);
        user_audit_log((string)$user["id"], "FAILED_LOGIN", "user", (string)$user["id"], null, ["username" => $username]);
        json_error("Invalid username or PIN", 401);
        return;
    }
    auth_clear_failures_safe($username, $ip);
    $policyOutstanding = policy_user_outstanding_keys((string)$user["id"]);
    policy_mark_user_checked((string)$user["id"]);
    user_audit_log((string)$user["id"], "LOGIN", "user", (string)$user["id"], null, ["username" => $username, "policyOutstanding" => count($policyOutstanding)]);

    $token = sign_cloud_token(["userId" => $user["id"], "username" => $user["username"], "role" => $user["role"]]);
    set_auth_cookie($token);
    $csrf = csrf_issue_token();
    json_ok(cloud_auth_response($token, ["id" => $user["id"], "username" => $user["username"], "displayName" => $user["display_name"], "role" => $user["role"], "policyOutstanding" => $policyOutstanding], $csrf));
}

function cloud_admin_login(): void {
    rate_limit_guard("auth_admin_login", 30, 300);
    $body = require_json_body();
    try {
        validate_required_fields($body, ["username", "pin"]);
    } catch (InvalidArgumentException $e) {
        json_error($e->getMessage(), 422, "VALIDATION_ERROR");
        return;
    }
    $username = strtolower(trim((string)($body["username"] ?? "")));
    $pin = (string)($body["pin"] ?? "");
    $pinError = auth_pin_validation_error($pin);
    if (strlen($username) < 3 || strlen($username) > 24 || $pinError !== null) {
        json_error($pinError ?? "Invalid username or PIN format", 422, "VALIDATION_ERROR");
        return;
    }
    $ip = (string)($_SERVER["REMOTE_ADDR"] ?? "unknown");
    $throttle = auth_throttle_status_safe($username, $ip);
    if (($throttle["blocked"] ?? false) === true) {
        json_error("Too many failed attempts. Try again later.", 429, "AUTH_THROTTLED");
        return;
    }
    $user = db_user_by_username($username);
    if (!$user || (string)$user["role"] !== "admin") {
        auth_record_failure_safe($username, $ip);
        json_error("Invalid username or PIN", 401);
        return;
    }
    if (((int)$user["is_active"]) !== 1) {
        json_error("Account inactive", 403, "ACCOUNT_INACTIVE");
        return;
    }
    if (!verify_secret($pin . ":" . (string)$user["pin_salt"], (string)$user["pin_hash"])) {
        auth_record_failure_safe($username, $ip);
        json_error("Invalid username or PIN", 401);
        return;
    }
    auth_clear_failures_safe($username, $ip);
    $token = sign_cloud_token(["userId" => $user["id"], "username" => $user["username"], "role" => "admin"]);
    set_auth_cookie($token);
    $csrf = csrf_issue_token();
    json_ok(cloud_auth_response($token, ["id" => $user["id"], "username" => $user["username"], "displayName" => $user["display_name"], "role" => "admin"], $csrf));
}

function cloud_me(): void {
    try {
        $active = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    ensure_security_recovery_table();
    $db = db_conn();
    // Phase 1 (F): the must_change_pin column exists only after sql/migrations/phase_01_security.sql.
    // Use a conditional column list so unmigrated dev environments don't 500.
    $hasMustChange = false;
    try {
        $check = $db->query("SELECT must_change_pin FROM users LIMIT 0");
        $hasMustChange = $check !== false;
    } catch (Throwable) {
        $hasMustChange = false;
    }
    $extra = $hasMustChange ? ", u.must_change_pin" : "";
    $st = $db->prepare(
        "SELECT u.id, u.username, u.display_name, u.role, u.created_at, u.updated_at, u.mobile, u.email, u.avatar_emoji, u.avatar_color, r.security_question{$extra}
         FROM users u
         LEFT JOIN user_security_recovery r ON r.user_id = u.id
         WHERE u.id = ?
         LIMIT 1"
    );
    $st->execute([$active["id"]]);
    $user = $st->fetch();
    if (!$user) {
        json_error("Cloud user not found", 404);
        return;
    }
    $csrf = csrf_issue_token();
    json_ok([
        "id" => $user["id"],
        "username" => $user["username"],
        "displayName" => $user["display_name"],
        "role" => $user["role"],
        "mobile" => $user["mobile"] ?: null,
        "email" => $user["email"] ?: null,
        "avatarEmoji" => $user["avatar_emoji"] ?: null,
        "avatarColor" => $user["avatar_color"] ?: null,
        "securityQuestion" => $user["security_question"] ?: null,
        // Phase 1 (F): force-PIN-change flag — the client must route admins
        // straight to the Change PIN screen until this is 0.
        "mustChangePin" => $hasMustChange ? ((int)($user["must_change_pin"] ?? 0) === 1) : false,
        "createdAt" => gmdate("Y-m-d\TH:i:s.000\Z", strtotime($user["created_at"])),
        "updatedAt" => gmdate("Y-m-d\TH:i:s.000\Z", strtotime($user["updated_at"])),
        "csrfToken" => $csrf,
    ]);
}

function cloud_profile_update(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $body = require_json_body();
    $displayName = trim((string)($body["displayName"] ?? ""));
    if ($displayName === "" || strlen($displayName) > 60) {
        json_error("Display name must be 1 to 60 characters", 422, "VALIDATION_ERROR");
        return;
    }
    $mobile = trim((string)($body["mobile"] ?? ""));
    $email = trim((string)($body["email"] ?? ""));
    $avatarEmoji = trim((string)($body["avatarEmoji"] ?? ""));
    $avatarColor = trim((string)($body["avatarColor"] ?? ""));
    if ($mobile !== "" && strlen($mobile) > 32) {
        json_error("Mobile must be up to 32 characters", 422, "VALIDATION_ERROR");
        return;
    }
    if ($email !== "" && (strlen($email) > 120 || filter_var($email, FILTER_VALIDATE_EMAIL) === false)) {
        json_error("Email is invalid", 422, "VALIDATION_ERROR");
        return;
    }
    if ($avatarEmoji !== "" && strlen($avatarEmoji) > 16) {
        json_error("Avatar emoji is invalid", 422, "VALIDATION_ERROR");
        return;
    }
    if ($avatarColor !== "" && preg_match('/^#[0-9a-fA-F]{6}$/', $avatarColor) !== 1) {
        json_error("Avatar color must be a hex color like #0ea5e9", 422, "VALIDATION_ERROR");
        return;
    }
    $db = db_conn();
    $st = $db->prepare(
        "UPDATE users
         SET display_name = ?, mobile = NULLIF(?, ''), email = NULLIF(?, ''), avatar_emoji = NULLIF(?, ''), avatar_color = NULLIF(?, ''), updated_at = UTC_TIMESTAMP()
         WHERE id = ?
         LIMIT 1"
    );
    $st->execute([$displayName, $mobile, $email, $avatarEmoji, $avatarColor, $auth["id"]]);
    user_audit_log($auth["id"], "PROFILE_UPDATED", "user", $auth["id"], null, [
        "displayNameUpdated" => true,
        "mobilePresent" => $mobile !== "",
        "emailPresent" => $email !== "",
        "avatarEmojiPresent" => $avatarEmoji !== "",
        "avatarColorPresent" => $avatarColor !== "",
    ]);
    json_ok(["updated" => true]);
}

function ensure_security_recovery_table(): void {
    $db = db_conn();
    $db->exec(
        "CREATE TABLE IF NOT EXISTS user_security_recovery (
            user_id VARCHAR(191) NOT NULL PRIMARY KEY,
            security_question VARCHAR(255) NOT NULL,
            security_answer_hash VARCHAR(255) NOT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_security_recovery_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
        )"
    );
}

function cloud_change_pin(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $body = require_json_body();
    $currentPin = (string)($body["currentPin"] ?? "");
    $newPin = (string)($body["newPin"] ?? "");
    if (!auth_valid_pin($currentPin) || !auth_valid_pin($newPin)) {
        json_error("PIN must be 4 to 8 digits", 422, "VALIDATION_ERROR");
        return;
    }
    if ($currentPin === $newPin) {
        json_error("New PIN must be different from current PIN", 422, "VALIDATION_ERROR");
        return;
    }
    $user = user_auth_row_by_id($auth["id"]);
    if (!$user) {
        json_error("Profile not found", 404);
        return;
    }
    if (!verify_secret($currentPin . ":" . (string)$user["pin_salt"], (string)$user["pin_hash"])) {
        json_error("Current PIN incorrect", 401);
        return;
    }
    $nextSalt = create_pin_salt();
    $nextHash = hash_secret($newPin . ":" . $nextSalt);
    $db = db_conn();
    // Phase 1 (F): also clear must_change_pin if the column exists.
    $hasMustChange = false;
    try {
        $check = $db->query("SELECT must_change_pin FROM users LIMIT 0");
        $hasMustChange = $check !== false;
    } catch (Throwable) {
        $hasMustChange = false;
    }
    if ($hasMustChange) {
        $db->prepare("UPDATE users SET pin_hash = ?, pin_salt = ?, must_change_pin = 0, updated_at = UTC_TIMESTAMP() WHERE id = ? LIMIT 1")
            ->execute([$nextHash, $nextSalt, $auth["id"]]);
    } else {
        $db->prepare("UPDATE users SET pin_hash = ?, pin_salt = ?, updated_at = UTC_TIMESTAMP() WHERE id = ? LIMIT 1")
            ->execute([$nextHash, $nextSalt, $auth["id"]]);
    }
    user_audit_log($auth["id"], "PIN_CHANGED", "user", $auth["id"], null, [
        "method" => "current_pin",
        "mustChangePinCleared" => $hasMustChange,
    ]);
    json_ok(["updated" => true]);
}

function cloud_set_security_recovery(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $body = require_json_body();
    $question = trim((string)($body["securityQuestion"] ?? ""));
    $answer = trim(strtolower((string)($body["securityAnswer"] ?? "")));
    if (strlen($question) < 5 || strlen($question) > 255) {
        json_error("Security question must be 5 to 255 characters", 422, "VALIDATION_ERROR");
        return;
    }
    if (strlen($answer) < 3 || strlen($answer) > 255) {
        json_error("Security answer must be 3 to 255 characters", 422, "VALIDATION_ERROR");
        return;
    }
    $user = user_auth_row_by_id($auth["id"]);
    if (!$user) {
        json_error("Profile not found", 404);
        return;
    }
    ensure_security_recovery_table();
    $answerHash = hash_secret($answer . ":" . (string)$user["pin_salt"]);
    $db = db_conn();
    $db->prepare(
        "INSERT INTO user_security_recovery (user_id, security_question, security_answer_hash, updated_at, created_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE security_question = VALUES(security_question), security_answer_hash = VALUES(security_answer_hash), updated_at = UTC_TIMESTAMP()"
    )->execute([$auth["id"], $question, $answerHash]);
    user_audit_log($auth["id"], "SECURITY_RECOVERY_UPDATED", "user_security_recovery", $auth["id"], null, [
        "securityQuestionLength" => strlen($question),
    ]);
    json_ok(["updated" => true]);
}

function cloud_reset_pin_with_security(): void {
    try {
        $auth = auth_require_active_user();
    } catch (Throwable $e) {
        json_error($e->getMessage(), 401);
        return;
    }
    $body = require_json_body();
    $answer = trim(strtolower((string)($body["securityAnswer"] ?? "")));
    $newPin = (string)($body["newPin"] ?? "");
    if (!auth_valid_pin($newPin)) {
        json_error("PIN must be 4 to 8 digits", 422, "VALIDATION_ERROR");
        return;
    }
    if ($answer === "") {
        json_error("Security answer is required", 422, "VALIDATION_ERROR");
        return;
    }
    $user = user_auth_row_by_id($auth["id"]);
    if (!$user) {
        json_error("Profile not found", 404);
        return;
    }
    ensure_security_recovery_table();
    $db = db_conn();
    $rowSt = $db->prepare("SELECT security_answer_hash FROM user_security_recovery WHERE user_id = ? LIMIT 1");
    $rowSt->execute([$auth["id"]]);
    $recovery = $rowSt->fetch();
    if (!$recovery) {
        json_error("Security recovery is not configured", 422);
        return;
    }
    $ok = verify_secret($answer . ":" . (string)$user["pin_salt"], (string)$recovery["security_answer_hash"]);
    if (!$ok) {
        json_error("Security answer is incorrect", 401);
        return;
    }
    $nextSalt = create_pin_salt();
    $nextPinHash = hash_secret($newPin . ":" . $nextSalt);
    $nextAnswerHash = hash_secret($answer . ":" . $nextSalt);
    $db->prepare("UPDATE users SET pin_hash = ?, pin_salt = ?, updated_at = UTC_TIMESTAMP() WHERE id = ? LIMIT 1")
        ->execute([$nextPinHash, $nextSalt, $auth["id"]]);
    $db->prepare("UPDATE user_security_recovery SET security_answer_hash = ?, updated_at = UTC_TIMESTAMP() WHERE user_id = ? LIMIT 1")
        ->execute([$nextAnswerHash, $auth["id"]]);
    user_audit_log($auth["id"], "PIN_RESET_WITH_SECURITY_ANSWER", "user", $auth["id"], null, [
        "method" => "security_answer",
    ]);
    json_ok(["updated" => true]);
}
