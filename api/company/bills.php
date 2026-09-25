<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    $side = strtoupper((string)($_GET["side"] ?? ""));
    if ($side === "PAYABLE") {
        company_require_permission($db, $auth["userId"], $companyId, "view_payables");
    } else {
        company_require_permission($db, $auth["userId"], $companyId, "view_receivables");
    }
    $sql = "SELECT * FROM company_bill_refs WHERE company_id = ? AND status IN ('OPEN','PARTIAL')";
    $params = [$companyId];
    if ($side === "RECEIVABLE" || $side === "PAYABLE") {
        $sql .= " AND side = ?";
        $params[] = $side;
    }
    $sql .= " ORDER BY due_date ASC";
    $st = $db->prepare($sql);
    $st->execute($params);
    json_ok(["bills" => $st->fetchAll(PDO::FETCH_ASSOC)]);
} catch (Throwable $e) {
    company_handle_exception($e);
}
