<?php
declare(strict_types=1);
/**
 * Workspace create → get race/regression harness.
 * Expects 0 unexpected 404 after create (fixes company_id assert bug).
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";

$iterations = (int)(getenv("COMPANY_HYDRATE_ITERS") ?: 100);
$db = db_conn();
$user = $db->query("SELECT id FROM users WHERE deleted_at IS NULL AND is_active=1 ORDER BY created_at ASC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    fwrite(STDERR, "No user\n");
    exit(1);
}
$userId = (string)$user["id"];
$fail = 0;
$lines = ["WORKSPACE HYDRATE RACE " . gmdate("c") . " iterations=$iterations"];

for ($i = 0; $i < $iterations; $i++) {
    $companyId = company_new_id();
    $db->beginTransaction();
    try {
        $db->prepare(
            "INSERT INTO company_workspaces (id, owner_user_id, legal_name, display_name, currency, financial_year_start_month, books_start_date, timezone, country, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'INR', 4, CURDATE(), 'Asia/Kolkata', 'IN', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())"
        )->execute([$companyId, $userId, "Hydrate $i", "Hydrate $i"]);
        company_seed_workspace($db, $companyId, $userId);
        $db->commit();
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        $fail++;
        $lines[] = "FAIL create i=$i " . $e->getMessage();
        continue;
    }

    // Immediate get (same as SPA hydrate)
    try {
        company_require_membership($db, $userId, $companyId);
        $st = $db->prepare("SELECT * FROM company_workspaces WHERE id = ? AND deleted_at IS NULL");
        $st->execute([$companyId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row === null || (string)($row["id"] ?? "") !== $companyId) {
            $fail++;
            $lines[] = "FAIL get-404 i=$i id=$companyId";
        }
    } catch (Throwable $e) {
        $fail++;
        $lines[] = "FAIL get i=$i " . $e->getMessage();
    }
}

$lines[] = "SUMMARY fail=$fail / $iterations";
$out = implode("\n", $lines) . "\n";
echo $out;
$evidenceDir = getenv("COMPANY_PRODUCT_EVIDENCE_DIR") ?: (__DIR__ . "/../../docs/company/product-completion/adhoc/raw");
if (!is_dir($evidenceDir)) mkdir($evidenceDir, 0777, true);
file_put_contents($evidenceDir . "/EVIDENCE_WORKSPACE_HYDRATE_RACE.txt", $out);
echo $fail === 0 ? "HYDRATE RACE PASS\n" : "HYDRATE RACE FAIL\n";
exit($fail === 0 ? 0 : 1);
