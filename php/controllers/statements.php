<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../helpers/http.php";
require_once __DIR__ . "/../helpers/auth.php";
require_once __DIR__ . "/../helpers/security.php";
require_once __DIR__ . "/../helpers/utils.php";
require_once __DIR__ . "/../helpers/cloud_write.php";

function statement_integer($value, string $field, bool $signed = false): int {
    if (!is_int($value) || abs($value) > 1000000000000 || (!$signed && $value < 0)) throw new InvalidArgumentException("Invalid " . $field . " in integer paise");
    return $value;
}
function statement_text($value, string $field, int $max, bool $empty = false): string {
    if (!is_string($value) || (!$empty && trim($value) === "") || strlen($value) > $max || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value)) throw new InvalidArgumentException("Invalid " . $field);
    return trim($value);
}
function statement_date($value): string {
    $date = statement_text($value, "transaction date", 10);
    $parsed = DateTimeImmutable::createFromFormat("!Y-m-d", $date);
    if (!$parsed || $parsed->format("Y-m-d") !== $date || $date < "1900-01-01" || $date > "2100-12-31") throw new InvalidArgumentException("Invalid transaction date");
    return $date;
}
function statement_owned(PDO $db, string $user, string $collection, string $id): array {
    $record = cloud_write_row($db, $user, $collection, $id);
    if (!$record || !empty($record["isDeleted"]) || !empty($record["isInactive"])) throw new InvalidArgumentException("Linked " . $collection . " record is not active or owned by this user");
    return $record;
}

function statements_commit(PDO $db, string $user, array $body): array {
    $allowed = ["userId", "accountId", "bank", "documentHash", "parserVersion", "openingPaise", "closingPaise", "order", "rows", "mutationId", "ocrSourceConfirmed"];
    if (array_diff(array_keys($body), $allowed)) throw new InvalidArgumentException("Unexpected statement field; files and passwords are not accepted by this endpoint");
    if (($body["userId"] ?? null) !== $user) throw new CloudWriteException("Account changed. Sign in to the original account.", 403, "OWNER_MISMATCH");
    $accountId = statement_text($body["accountId"] ?? null, "account", 191);
    $bank = $body["bank"] ?? null;
    $banks = json_decode(file_get_contents(__DIR__ . "/../config/statement_banks.json"), true, 512, JSON_THROW_ON_ERROR);
    if (!in_array($bank, array_column($banks, "id"), true)) throw new InvalidArgumentException("Unsupported bank");
    $documentHash = $body["documentHash"] ?? "";
    if (!is_string($documentHash) || !preg_match('/^[a-f0-9]{64}$/D', $documentHash) || !in_array($body["parserVersion"] ?? null, ["statement-text-v1", "statement-text-v2", "statement-ocr-v1"], true)) throw new InvalidArgumentException("Invalid document provenance");
    if ($body["parserVersion"] === "statement-ocr-v1" && ($body["ocrSourceConfirmed"] ?? false) !== true) throw new InvalidArgumentException("OCR dates, amounts and completeness must be checked against the original PDF");
    $account = statement_owned($db, $user, "accounts", $accountId);
    if (!in_array($account["type"] ?? "", ["bank", "savings", "current", "debit_linked"], true)) throw new InvalidArgumentException("Select a bank account for this statement");
    $priorImports = $db->prepare("SELECT payload FROM cloud_collection_rows WHERE user_id=? AND collection_name='transactions'");
    $priorImports->execute([$user]);
    while ($found = $priorImports->fetch()) {
        $source = decode_payload($found["payload"])["statementSource"] ?? [];
        if (($source["documentHash"] ?? null) === $documentHash && ($source["accountId"] ?? null) !== $accountId) throw new CloudWriteException("This PDF already has an import for a different account. Reconcile the original import first.", 409, "DOCUMENT_ACCOUNT_CONFLICT");
    }
    $opening = statement_integer($body["openingPaise"] ?? null, "opening balance", true);
    $closing = statement_integer($body["closingPaise"] ?? null, "closing balance", true);
    $rows = $body["rows"] ?? null;
    if (!is_array($rows) || !array_is_list($rows) || !count($rows) || count($rows) > 2000) throw new InvalidArgumentException("A statement must contain 1 to 2000 rows");
    if (!in_array($body["order"] ?? null, ["ascending", "descending"], true)) throw new InvalidArgumentException("Invalid row order");
    if ($body["order"] === "descending") $rows = array_reverse($rows);
    $running = $opening;
    $lastDate = "";
    $seen = [];
    $pending = [];
    $result = ["imported" => 0, "duplicates" => 0, "skipped" => 0, "transactionIds" => []];
    foreach ($rows as $row) {
        if (!is_array($row) || array_diff(array_keys($row), ["id", "page", "y", "date", "valueDate", "description", "reference", "debitPaise", "creditPaise", "balancePaise", "issues", "decision"])) throw new InvalidArgumentException("Invalid statement row");
        if (($row["issues"] ?? null) !== []) throw new InvalidArgumentException("Unresolved extraction issues block the statement");
        $date = statement_date($row["date"] ?? null);
        if ($date < $lastDate) throw new InvalidArgumentException("Statement rows are not chronological");
        $lastDate = $date;
        $debit = statement_integer($row["debitPaise"] ?? null, "debit");
        $credit = statement_integer($row["creditPaise"] ?? null, "credit");
        $balance = statement_integer($row["balancePaise"] ?? null, "running balance", true);
        if (($debit > 0) === ($credit > 0)) throw new InvalidArgumentException("Exactly one positive debit or credit is required");
        $running += $credit - $debit;
        if ($running !== $balance) throw new InvalidArgumentException("Statement running balance mismatch");
        $description = statement_text($row["description"] ?? null, "narration", 2000);
        $reference = statement_text($row["reference"] ?? "", "reference", 250, true);
        $page = $row["page"] ?? null;
        if (!is_int($page) || $page < 1 || $page > 60) throw new InvalidArgumentException("Invalid source page");
        $valueDate = isset($row["valueDate"]) ? statement_date($row["valueDate"]) : null;
        $normalized = strtoupper(preg_replace('/\s+/u', ' ', $description));
        $fingerprint = cloud_write_hash([$accountId, $date, $debit, $credit, $balance, $normalized, strtoupper($reference)]);
        if (isset($seen[$fingerprint])) throw new InvalidArgumentException("Indistinguishable repeated rows require manual reconciliation");
        $seen[$fingerprint] = true;
        $decision = $row["decision"] ?? null;
        if (!is_array($decision) || !is_bool($decision["include"] ?? null) || array_diff(array_keys($decision), ["include", "reviewed", "kind", "categoryId", "scope", "counterpartId"])) throw new InvalidArgumentException("Invalid review decision");
        if (!$decision["include"]) { $result["skipped"]++; continue; }
        if (($decision["reviewed"] ?? null) !== true || !in_array($decision["scope"] ?? null, ["personal", "business"], true)) throw new InvalidArgumentException("Every included row needs confirmed review and personal/business scope");
        $kind = $decision["kind"] ?? null;
        $contribution = $kind === "contribution";
        if ($contribution) $kind = "refund";
        if (!in_array($kind, ["income", "expense", "transfer", "refund", "cc_payment"], true)) throw new InvalidArgumentException("Unsupported transaction purpose; use the dedicated finance workflow");
        if ((in_array($kind, ["income", "refund"], true) && !$credit) || (in_array($kind, ["expense", "cc_payment"], true) && !$debit)) throw new InvalidArgumentException("Transaction purpose contradicts statement direction");
        $id = "stmt_" . hash("sha256", $user . "\0" . $fingerprint);
        if ($existing = cloud_write_row($db, $user, "transactions", $id)) {
            if (!empty($existing["isDeleted"])) throw new CloudWriteException("A matching imported row was deleted; restore it explicitly instead of importing again", 409, "DELETED_IMPORT_CONFLICT");
            if (($existing["statementSource"]["fingerprint"] ?? null) !== $fingerprint) throw new CloudWriteException("Import identity conflict", 409, "IMPORT_CONFLICT");
            $result["duplicates"]++; $result["transactionIds"][] = $id; continue;
        }
        $now = now_iso();
        $payload = ["id" => $id, "userId" => $user, "date" => $date, "type" => $kind, "amountPaise" => $debit + $credit, "amount" => ($debit + $credit) / 100,
            "accountId" => $accountId, "description" => $description, "merchantOrPerson" => "", "paymentMode" => "bank_transfer", "businessOrPersonal" => $decision["scope"],
            "createdAt" => $now, "updatedAt" => $now, "version" => 1, "isDeleted" => 0, "tags" => ["statement-import"], "notes" => "",
            "billAvailable" => 0, "gstApplicable" => 0, "taxFlag" => 0, "needWant" => "unassigned", "fixedVariable" => "unassigned", "plannedUnplanned" => "unassigned",
            "statementSource" => ["fingerprint" => $fingerprint, "documentHash" => $documentHash, "bank" => $bank, "accountId" => $accountId, "page" => $page,
                "debitPaise" => $debit, "creditPaise" => $credit, "balancePaise" => $balance, "reference" => $reference, "valueDate" => $valueDate, "parserVersion" => $body["parserVersion"], "reviewedAt" => $now]];
        if ($body["parserVersion"] === "statement-ocr-v1") $payload["statementSource"]["ocrSourceConfirmed"] = true;
        if ($contribution) $payload["transactionIntent"] = "expense_contribution";
        if (preg_match('/\bUPI\b/i', $description)) $payload["paymentMode"] = "upi";
        if (in_array($kind, ["income", "expense", "refund"], true)) {
            $categoryId = statement_text($decision["categoryId"] ?? null, "category", 191);
            $category = statement_owned($db, $user, "categories", $categoryId);
            if (!empty($category["archived"]) || !in_array($category["appliesTo"] ?? null, [$kind === "income" ? "income" : "expense", "mixed"], true)) throw new InvalidArgumentException("Category does not match the transaction purpose");
            $payload["categoryId"] = $categoryId;
        }
        if (in_array($kind, ["transfer", "cc_payment", "refund"], true)) {
            $counterpart = statement_text($decision["counterpartId"] ?? null, "linked record", 191);
            if ($kind === "transfer") {
                statement_owned($db, $user, "accounts", $counterpart);
                if ($counterpart === $accountId) throw new InvalidArgumentException("Transfer accounts must differ");
                $payload["accountId"] = $debit ? $accountId : $counterpart;
                $payload["toAccountId"] = $debit ? $counterpart : $accountId;
            } elseif ($kind === "cc_payment") {
                $card = statement_owned($db, $user, "cards", $counterpart);
                if (($card["type"] ?? null) !== "credit") throw new InvalidArgumentException("Select a credit card for a card payment");
                $payload["linkedCardId"] = $counterpart;
            } else {
                $original = statement_owned($db, $user, "transactions", $counterpart);
                if (($original["type"] ?? null) !== "expense" || ($original["categoryId"] ?? null) !== $payload["categoryId"]) throw new InvalidArgumentException("Refund must link to the original expense and its category");
                if (substr((string)($original["date"] ?? ""), 0, 10) > $date) throw new InvalidArgumentException("Refund cannot precede the original expense");
                $payload["linkedOriginalTransactionId"] = $counterpart;
            }
        }
        $pending[] = $payload;
    }
    if ($running !== $closing) throw new InvalidArgumentException("Statement closing balance mismatch");
    // No request writes occur until the complete statement and every selected decision are validated.
    foreach ($pending as $payload) {
        if ($payload["type"] === "refund") {
            $originalId = $payload["linkedOriginalTransactionId"];
            $original = statement_owned($db, $user, "transactions", $originalId);
            $alreadyRefunded = 0;
            $st = $db->prepare("SELECT payload FROM cloud_collection_rows WHERE user_id=? AND collection_name='transactions' AND deleted_at IS NULL");
            $st->execute([$user]);
            while ($found = $st->fetch()) {
                $tx = decode_payload($found["payload"]);
                if (($tx["type"] ?? null) === "refund" && ($tx["linkedOriginalTransactionId"] ?? null) === $originalId) $alreadyRefunded += (int)($tx["amountPaise"] ?? round(($tx["amount"] ?? 0) * 100));
            }
            if ($alreadyRefunded + $payload["amountPaise"] > (int)($original["amountPaise"] ?? round(($original["amount"] ?? 0) * 100))) throw new InvalidArgumentException("Refund exceeds the original expense remaining amount");
        }
        cloud_write_save($db, $user, "transactions", $payload);
        $result["imported"]++; $result["transactionIds"][] = $payload["id"];
    }
    return $result;
}

function statements_import(): void {
    try { $auth = auth_require_active_user(); }
    catch (Throwable) { json_error("Sign in to import a statement", 401, "UNAUTHORIZED"); return; }
    csrf_require_for_mutations();
    rate_limit_guard("statement_import", 20, 60);
    $body = require_json_body();
    if (!is_string($body["mutationId"] ?? null) || $body["mutationId"] === "") { json_error("A stable mutationId is required", 422, "VALIDATION_ERROR"); return; }
    $db = db_conn();
    cloud_write_respond($auth["id"], ["operation" => "statement_import", "mutationId" => $body["mutationId"], "body" => $body], fn() => statements_commit($db, $auth["id"], $body));
}
