import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const BASE = process.env.BASE_URL ?? "http://localhost:5000";
const DB_NAME = process.env.TEST_DB_NAME ?? process.env.DB_NAME ?? "";

if (!/(test|cert|local)/i.test(DB_NAME)) {
  console.error("TEST_DB_NAME or DB_NAME must contain test, cert, or local for Local Phase 10.");
  process.exit(2);
}

const LOG_DIR = join(process.cwd(), "local-phase-10-logs");
await mkdir(LOG_DIR, { recursive: true });

const db = await mysql.createConnection({
  host: process.env.TEST_DB_HOST ?? process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT ?? process.env.DB_PORT ?? 3306),
  user: process.env.TEST_DB_USER ?? process.env.DB_USER ?? "root",
  password: process.env.TEST_DB_PASS ?? process.env.DB_PASS ?? "",
  database: DB_NAME,
});

const stamp = Date.now().toString(36);
const userA = {
  username: `phase10a_${stamp}`,
  displayName: "Phase 10 A",
  pin: "583921",
};
const userB = {
  username: `phase10b_${stamp}`,
  displayName: "Phase 10 B",
  pin: "674532",
};
const admin = {
  username: `phase10admin_${stamp}`,
  displayName: "Phase 10 Admin",
  pin: "785432",
};

const checks = [];
const createdUsernames = [userA.username, userB.username, admin.username];

function record(name, passed, details = {}) {
  checks.push({ name, passed, details });
  const label = passed ? "PASS" : "FAIL";
  console.log(`${label} ${name}`);
  if (!passed && Object.keys(details).length > 0) {
    console.log(JSON.stringify(details, null, 2));
  }
}

async function req(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(new URL(path, BASE), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function cleanup() {
  await db.query("SET FOREIGN_KEY_CHECKS=0");
  for (const username of createdUsernames) {
    await db.query("DELETE FROM users WHERE username = ?", [username]);
  }
  await db.query(
    "DELETE FROM api_rate_limits WHERE bucket_key LIKE 'auth_%|%' OR bucket_key LIKE 'account_%|%' OR bucket_key LIKE 'admin_%|%'",
  );
  await db.query("SET FOREIGN_KEY_CHECKS=1");
}

async function currentPolicyAcceptances() {
  const res = await req("GET", "/api/policies/current.php");
  if (res.status !== 200) {
    throw new Error(`Unable to fetch policies: ${res.status}`);
  }
  const versions = res.json?.data?.versions ?? {};
  return {
    versions,
    acceptances: ["terms", "privacy"].map((key) => ({ key, version: versions[key] })),
  };
}

async function registerUser(user, policyAcceptances) {
  const res = await req("POST", "/api/auth/register.php", {
    body: {
      username: user.username,
      displayName: user.displayName,
      pin: user.pin,
      policyAcceptances,
    },
  });
  if (res.status !== 201) {
    throw new Error(`Register failed for ${user.username}: ${res.status} ${JSON.stringify(res.json)}`);
  }
  return { token: res.json.data.token, id: res.json.data.user.id };
}

async function loginUser(user) {
  return req("POST", "/api/auth/login.php", {
    body: { username: user.username, pin: user.pin },
  });
}

async function createTempAdmin() {
  const salt = randomBytes(16).toString("hex");
  const pinHash = await bcrypt.hash(`${admin.pin}:${salt}`, 12);
  const id = `admin_phase10_${stamp}`;
  await db.query(
    `INSERT INTO users
       (id, username, display_name, pin_hash, pin_salt, role, is_active, must_change_pin, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'admin', 1, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [id, admin.username, admin.displayName, pinHash, salt],
  );
  return id;
}

async function pushCategory(token, userId, id, name) {
  return req("POST", "/api/cloud/sync/push.php", {
    token,
    body: {
      collections: {
        categories: [
          {
            id,
            userId,
            name,
            type: "expense",
            color: "#0ea5e9",
            icon: "shield",
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    },
  });
}

async function auditActionCount(userId, actionKey) {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS c FROM user_audit_logs WHERE user_id = ? AND action_key = ?",
    [userId, actionKey],
  );
  return Number(rows[0]?.c ?? 0);
}

function containsEntity(collections, entityId) {
  return Object.values(collections ?? {}).some((items) =>
    Array.isArray(items) && items.some((item) => item.entityId === entityId || item.id === entityId),
  );
}

function hasForbiddenSensitiveKeys(value, forbidden, path = "") {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenSensitiveKeys(item, forbidden, `${path}[${index}]`));
  }
  const hits = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (forbidden.has(key)) hits.push(childPath);
    hits.push(...hasForbiddenSensitiveKeys(child, forbidden, childPath));
  }
  return hits;
}

try {
  await cleanup();

  const { versions, acceptances } = await currentPolicyAcceptances();

  const noPolicy = await req("POST", "/api/auth/register.php", {
    body: {
      username: `phase10nopolicy_${stamp}`,
      displayName: "No Policy",
      pin: "672345",
    },
  });
  record("Terms/privacy acceptance required at registration", noPolicy.status === 422 && noPolicy.json?.code === "POLICY_ACCEPTANCE_REQUIRED", {
    status: noPolicy.status,
    code: noPolicy.json?.code,
  });

  const a = await registerUser(userA, acceptances);
  const b = await registerUser(userB, acceptances);
  await createTempAdmin();

  const [policyRows] = await db.query(
    "SELECT policy_key, version FROM user_policy_acceptances WHERE user_id = ? AND policy_key IN ('terms', 'privacy') ORDER BY policy_key",
    [a.id],
  );
  const policyMap = Object.fromEntries(policyRows.map((row) => [row.policy_key, row.version]));
  record("Policy version stored for Terms and Privacy", policyMap.terms === versions.terms && policyMap.privacy === versions.privacy, {
    storedKeys: Object.keys(policyMap),
  });

  await db.query(
    "UPDATE user_policy_acceptances SET version = '1900-01-01' WHERE user_id = ? AND policy_key = 'privacy'",
    [a.id],
  );
  const staleLogin = await loginUser(userA);
  const outstanding = staleLogin.json?.data?.user?.policyOutstanding ?? [];
  record("Updated policy forces re-acceptance on login", staleLogin.status === 200 && outstanding.some((item) => item.key === "privacy"), {
    status: staleLogin.status,
    outstandingKeys: outstanding.map((item) => item.key),
  });
  a.token = staleLogin.json?.data?.token ?? a.token;

  const acceptPrivacy = await req("POST", "/api/policies/accept.php", {
    token: a.token,
    body: { accept: [{ key: "privacy", version: versions.privacy }] },
  });
  const [privacyAcceptedRows] = await db.query(
    "SELECT version FROM user_policy_acceptances WHERE user_id = ? AND policy_key = 'privacy'",
    [a.id],
  );
  record("Policy re-acceptance is stored and audited", acceptPrivacy.status === 200 && privacyAcceptedRows.some((row) => row.version === versions.privacy) && (await auditActionCount(a.id, "POLICY_ACCEPTED")) >= 2, {
    status: acceptPrivacy.status,
  });

  const entityA = `phase10_cat_a_${stamp}`;
  const entityB = `phase10_cat_b_${stamp}`;
  const pushA = await pushCategory(a.token, a.id, entityA, "Phase 10 A Private Row");
  const pushB = await pushCategory(b.token, b.id, entityB, "Phase 10 B Private Row");
  record("Own and sibling user test rows created", pushA.status === 200 && pushB.status === 200, {
    pushA: pushA.status,
    pushB: pushB.status,
  });

  const profile = await req("PATCH", "/api/auth/profile.php", {
    token: a.token,
    body: {
      displayName: "Phase 10 A Updated",
      mobile: "9999999999",
      email: `phase10a_${stamp}@example.test`,
      avatarEmoji: "SV",
      avatarColor: "#0ea5e9",
    },
  });
  record("Profile update succeeds and writes user audit log", profile.status === 200 && (await auditActionCount(a.id, "PROFILE_UPDATED")) >= 1, {
    status: profile.status,
  });

  const changePin = await req("POST", "/api/auth/change-pin.php", {
    token: a.token,
    body: { currentPin: userA.pin, newPin: "583922" },
  });
  if (changePin.status === 200) userA.pin = "583922";
  record("PIN change succeeds and writes user audit log", changePin.status === 200 && (await auditActionCount(a.id, "PIN_CHANGED")) >= 1, {
    status: changePin.status,
  });

  const recovery = await req("POST", "/api/auth/security-recovery.php", {
    token: a.token,
    body: { securityQuestion: "What is your phase ten test phrase?", securityAnswer: "bluehorse" },
  });
  record("Security recovery setup writes user audit log", recovery.status === 200 && (await auditActionCount(a.id, "SECURITY_RECOVERY_UPDATED")) >= 1, {
    status: recovery.status,
  });

  const resetPin = await req("POST", "/api/auth/reset-pin.php", {
    token: a.token,
    body: { securityAnswer: "bluehorse", newPin: "583923" },
  });
  if (resetPin.status === 200) userA.pin = "583923";
  record("Security-answer PIN reset writes user audit log", resetPin.status === 200 && (await auditActionCount(a.id, "PIN_RESET_WITH_SECURITY_ANSWER")) >= 1, {
    status: resetPin.status,
  });

  const exportNoPin = await req("POST", "/api/auth/data-export.php", { token: a.token, body: {} });
  const exportWrongPin = await req("POST", "/api/auth/data-export.php", { token: a.token, body: { pin: "111111" } });
  record("Data export requires PIN", exportNoPin.status === 401 && exportNoPin.json?.code === "PIN_REQUIRED" && exportWrongPin.status === 401 && exportWrongPin.json?.code === "PIN_REQUIRED", {
    noPinStatus: exportNoPin.status,
    wrongPinStatus: exportWrongPin.status,
  });

  const exportOwn = await req("POST", "/api/auth/data-export.php", { token: a.token, body: { pin: userA.pin } });
  const ownCollections = exportOwn.json?.data?.collections ?? {};
  record("Export contains only authenticated user's data", exportOwn.status === 200 && containsEntity(ownCollections, entityA) && !containsEntity(ownCollections, entityB), {
    status: exportOwn.status,
    hasOwn: containsEntity(ownCollections, entityA),
    hasSibling: containsEntity(ownCollections, entityB),
  });

  const exportWithForeignId = await req("POST", "/api/auth/data-export.php", {
    token: a.token,
    body: { pin: userA.pin, userId: b.id },
  });
  const foreignCollections = exportWithForeignId.json?.data?.collections ?? {};
  record("Client-supplied foreign userId is ignored for export", exportWithForeignId.status === 200 && exportWithForeignId.json?.data?.user?.id === a.id && !containsEntity(foreignCollections, entityB), {
    status: exportWithForeignId.status,
    exportedUserId: exportWithForeignId.json?.data?.user?.id,
  });

  const adminLogin = await req("POST", "/api/auth/admin-login.php", {
    body: { username: admin.username, pin: admin.pin },
  });
  const adminToken = adminLogin.json?.data?.token;
  record("Temporary local admin login works for support simulation", adminLogin.status === 200 && Boolean(adminToken), {
    status: adminLogin.status,
  });

  const adminExportVictim = await req("POST", "/api/auth/data-export.php", {
    token: adminToken,
    body: { pin: admin.pin, userId: a.id },
  });
  const adminExportCollections = adminExportVictim.json?.data?.collections ?? {};
  record("Support/admin cannot export a user's data by passing userId", adminExportVictim.status >= 400 || (adminExportVictim.json?.data?.user?.id !== a.id && !containsEntity(adminExportCollections, entityA)), {
    status: adminExportVictim.status,
    exportedUserId: adminExportVictim.json?.data?.user?.id ?? null,
    leakedVictimRow: containsEntity(adminExportCollections, entityA),
  });

  const adminUsers = await req("GET", "/api/admin/users.php", { token: adminToken });
  const forbidden = new Set([
    "pin_hash",
    "pin_salt",
    "email",
    "mobile",
    "mobile_e164",
    "email_lc",
    "security_answer_hash",
    "recovery_answer_hash",
  ]);
  const sensitiveKeyHits = hasForbiddenSensitiveKeys(adminUsers.json?.data, forbidden);
  record("Support/admin user list omits sensitive fields", adminUsers.status === 200 && sensitiveKeyHits.length === 0, {
    status: adminUsers.status,
    sensitiveKeyHits,
  });

  const deleteNoPin = await req("DELETE", "/api/auth/account.php", { token: a.token, body: {} });
  const deleteWrongPin = await req("DELETE", "/api/auth/account.php", { token: a.token, body: { pin: "222222" } });
  record("Account deletion requires PIN", deleteNoPin.status === 401 && deleteNoPin.json?.code === "PIN_REQUIRED" && deleteWrongPin.status === 401 && deleteWrongPin.json?.code === "PIN_REQUIRED", {
    noPinStatus: deleteNoPin.status,
    wrongPinStatus: deleteWrongPin.status,
  });

  const deleteGood = await req("DELETE", "/api/auth/account.php", {
    token: a.token,
    body: { pin: userA.pin, reason: "self" },
  });
  const [deleteAuditRows] = await db.query(
    "SELECT COUNT(*) AS c FROM audit_logs WHERE actor_user_id = ? AND action_key = 'ACCOUNT_DELETED'",
    [a.id],
  );
  record("Account deletion succeeds and writes platform audit log", deleteGood.status === 200 && deleteGood.json?.data?.deleted === true && Number(deleteAuditRows[0]?.c ?? 0) >= 1, {
    status: deleteGood.status,
    auditRows: Number(deleteAuditRows[0]?.c ?? 0),
  });

  const deletedLogin = await loginUser(userA);
  const deletedMe = await req("GET", "/api/auth/me.php", { token: a.token });
  record("Deleted user cannot login or keep using old token", (deletedLogin.status === 401 || deletedLogin.status === 403) && (deletedMe.status === 401 || deletedMe.status === 403), {
    loginStatus: deletedLogin.status,
    meStatus: deletedMe.status,
  });

  const requiredAuditActions = [
    "REGISTER",
    "POLICY_ACCEPTED",
    "LOGIN",
    "PROFILE_UPDATED",
    "PIN_CHANGED",
    "SECURITY_RECOVERY_UPDATED",
    "PIN_RESET_WITH_SECURITY_ANSWER",
    "DATA_EXPORT",
    "ACCOUNT_DELETION_REQUESTED",
  ];
  const [auditRows] = await db.query(
    `SELECT action_key, COUNT(*) AS c
       FROM user_audit_logs
      WHERE user_id = ?
        AND action_key IN (${requiredAuditActions.map(() => "?").join(",")})
      GROUP BY action_key`,
    [a.id, ...requiredAuditActions],
  );
  const auditCounts = Object.fromEntries(auditRows.map((row) => [row.action_key, Number(row.c)]));
  const missingAuditActions = requiredAuditActions.filter((action) => !auditCounts[action]);
  record("User audit logs record sensitive actions", missingAuditActions.length === 0, {
    auditCounts,
    missingAuditActions,
  });

  const [sqlPolicyCheck] = await db.query(
    "SELECT policy_key, version, accepted_at FROM user_policy_acceptances WHERE user_id = ? ORDER BY policy_key",
    [a.id],
  );
  const [sqlDeletionCheck] = await db.query(
    "SELECT is_active, deleted_at, deleted_reason FROM users WHERE id = ? LIMIT 1",
    [a.id],
  );
  const [sqlExportAuditCheck] = await db.query(
    "SELECT action_key, created_at FROM user_audit_logs WHERE user_id = ? AND action_key IN ('DATA_EXPORT', 'ACCOUNT_DELETION_REQUESTED') ORDER BY created_at",
    [a.id],
  );

  const report = {
    baseUrl: BASE,
    database: DB_NAME,
    generatedAt: new Date().toISOString(),
    testUsers: {
      userAId: a.id,
      userBId: b.id,
      adminUsername: admin.username,
    },
    checks,
    sqlChecks: {
      policyAcceptanceRows: sqlPolicyCheck,
      deletionRow: sqlDeletionCheck,
      exportAndDeletionAuditRows: sqlExportAuditCheck,
    },
  };
  await writeFile(join(LOG_DIR, "privacy-audit-results.json"), JSON.stringify(report, null, 2));
} catch (error) {
  record("driver", false, { message: error instanceof Error ? error.message : String(error) });
  await writeFile(
    join(LOG_DIR, "privacy-audit-results.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), checks, error: String(error) }, null, 2),
  );
} finally {
  await cleanup().catch(() => {});
  await db.end();
}

const failed = checks.filter((check) => !check.passed);
console.log(`\n${failed.length === 0 ? "ALL PASS" : `${failed.length} FAIL(S)`}`);
process.exit(failed.length === 0 ? 0 : 1);
