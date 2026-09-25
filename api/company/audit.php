<?php
require_once __DIR__ . "/../../php/bootstrap_api.php";
require_once __DIR__ . "/bootstrap.php";
require_once __DIR__ . "/../../php/controllers/company.php";

try {
    $auth = company_auth_user();
    $companyId = company_query_company_id();
    $db = db_conn();
    company_require_permission($db, $auth["userId"], $companyId, "view_audit");

    $from = (string)($_GET["from"] ?? date("Y-m-01"));
    $to = (string)($_GET["to"] ?? date("Y-m-d"));
    $action = trim((string)($_GET["action"] ?? ""));
    $entity = trim((string)($_GET["entityType"] ?? $_GET["entity"] ?? ""));
    $limit = min(200, max(1, (int)($_GET["limit"] ?? 50)));

    $sql = "SELECT * FROM company_audit_logs WHERE company_id = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?";
    $params = [$companyId, $from, $to];
    if ($action !== "") {
        $sql .= " AND action = ?";
        $params[] = $action;
    }
    if ($entity !== "") {
        $sql .= " AND entity_type = ?";
        $params[] = $entity;
    }
    $sql .= " ORDER BY created_at DESC LIMIT " . (int)$limit;
    $st = $db->prepare($sql);
    $st->execute($params);
    json_ok(["events" => $st->fetchAll(PDO::FETCH_ASSOC)]);
} catch (Throwable $e) {
    company_handle_exception($e);
}
