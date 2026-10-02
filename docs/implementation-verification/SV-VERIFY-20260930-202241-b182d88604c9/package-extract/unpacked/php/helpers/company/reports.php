<?php
declare(strict_types=1);

/**
 * Company books reports — POSTED vouchers only; amounts in paise integers.
 */

require_once __DIR__ . "/reports_statements.php";
require_once __DIR__ . "/reports_subledgers.php";
require_once __DIR__ . "/reports_management.php";

/**
 * Report registry — single SoT shared with FE (config/company-report-registry.json).
 *
 * @return array{version:int,reports:list<array>}
 */
function company_report_registry(): array {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $path = dirname(__DIR__, 3) . "/config/company-report-registry.json";
    if (!is_readable($path)) {
        throw new RuntimeException("Report registry missing: " . $path);
    }
    $data = json_decode((string)file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data) || !isset($data["reports"]) || !is_array($data["reports"])) {
        throw new RuntimeException("Invalid report registry");
    }
    $cache = $data;
    return $cache;
}

/** @return array<string,array> keyed by report key (lowercase) */
function company_report_map(): array {
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [];
    foreach (company_report_registry()["reports"] as $row) {
        if (!is_array($row) || empty($row["key"])) {
            continue;
        }
        $map[strtolower((string)$row["key"])] = $row;
    }
    // Soft alias used by older clients
    if (isset($map["profit-loss"]) && !isset($map["pnl"])) {
        $map["pnl"] = array_merge($map["profit-loss"], ["key" => "pnl", "aliasOf" => "profit-loss"]);
    }
    return $map;
}

function company_report_entry(string $reportKey): ?array {
    $map = company_report_map();
    return $map[strtolower(trim($reportKey))] ?? null;
}

/**
 * Handler table — registry `handler` field → callable.
 * Only enabled reports with a real handler (or aliasOf) are runnable.
 *
 * @return array<string,callable>
 */
function company_report_handler_table(): array {
    return [
        "trial_balance" => static function (PDO $db, string $companyId, array $opts) {
            return company_trial_balance($db, $companyId, (string)$opts["asOf"], $opts["from"] ?? null);
        },
        "profit_loss" => static function (PDO $db, string $companyId, array $opts) {
            return company_profit_loss($db, $companyId, (string)$opts["from"], (string)$opts["to"]);
        },
        "balance_sheet" => static function (PDO $db, string $companyId, array $opts) {
            return company_balance_sheet($db, $companyId, (string)$opts["asOf"]);
        },
        "day_book" => static function (PDO $db, string $companyId, array $opts) {
            return company_day_book($db, $companyId, (string)$opts["from"], (string)$opts["to"], [
                "partyId" => $opts["partyId"] ?? null,
                "voucherType" => $opts["voucherType"] ?? null,
                "search" => $opts["search"] ?? null,
            ]);
        },
        "party_statement" => static function (PDO $db, string $companyId, array $opts) {
            $partyId = (string)($opts["partyId"] ?? "");
            if ($partyId === "") {
                throw new CompanyPostingException("partyId required", 422, "VALIDATION_ERROR");
            }
            return company_party_statement($db, $companyId, $partyId, (string)$opts["from"], (string)$opts["to"]);
        },
        "ageing" => static function (PDO $db, string $companyId, array $opts) {
            $side = strtolower((string)($opts["side"] ?? "receivable"));
            return company_ageing($db, $companyId, $side, (string)$opts["asOf"]);
        },
        "cash_bank_book" => static function (PDO $db, string $companyId, array $opts) {
            $ledgerId = (string)($opts["ledgerId"] ?? "");
            if ($ledgerId === "") {
                throw new CompanyPostingException("ledgerId required", 422, "VALIDATION_ERROR");
            }
            return company_cash_bank_book($db, $companyId, $ledgerId, (string)$opts["from"], (string)$opts["to"]);
        },
        "receipts_payments" => static function (PDO $db, string $companyId, array $opts) {
            return company_report_receipts_payments($db, $companyId, (string)$opts["from"], (string)$opts["to"]);
        },
        "project_report" => static function (PDO $db, string $companyId, array $opts) {
            return company_report_posted_dimension($db, $companyId, (string)$opts["from"], (string)$opts["to"], "project");
        },
        "business_report" => static function (PDO $db, string $companyId, array $opts) {
            return company_report_posted_dimension($db, $companyId, (string)$opts["from"], (string)$opts["to"], "business");
        },
        "area_report" => static function (PDO $db, string $companyId, array $opts) {
            return company_report_posted_dimension($db, $companyId, (string)$opts["from"], (string)$opts["to"], "area");
        },
        "category_report" => static function (PDO $db, string $companyId, array $opts) {
            return company_report_posted_dimension($db, $companyId, (string)$opts["from"], (string)$opts["to"], "category");
        },
        "user_activity" => static function (PDO $db, string $companyId, array $opts) {
            return company_report_user_activity($db, $companyId, (string)$opts["from"], (string)$opts["to"]);
        },
    ];
}

/**
 * Resolve registry entry, enforce enabled, return [permission, handlerName, optsPatch].
 *
 * @return array{0:string,1:string,2:array}
 */
function company_report_resolve(string $reportKey): array {
    $key = strtolower(trim($reportKey));
    $entry = company_report_entry($key);
    if ($entry === null) {
        throw new CompanyPostingException("Unknown report: " . $reportKey, 404, "REPORT_UNKNOWN");
    }
    if (empty($entry["enabled"])) {
        throw new CompanyPostingException("Report disabled: " . $key, 404, "REPORT_DISABLED");
    }

    $optsPatch = [];
    $handlerName = null;
    $permission = (string)($entry["permission"] ?? "view_day_book");

    if (!empty($entry["aliasOf"])) {
        $targetKey = strtolower((string)$entry["aliasOf"]);
        $target = company_report_entry($targetKey);
        if ($target === null || empty($target["enabled"])) {
            throw new CompanyPostingException("Report alias target missing: " . $targetKey, 404, "REPORT_UNKNOWN");
        }
        $handlerName = (string)($target["handler"] ?? "");
        if (!empty($entry["side"])) {
            $optsPatch["side"] = (string)$entry["side"];
        }
        // Keep request-key permission (e.g. payables → view_payables)
    } else {
        $handlerName = (string)($entry["handler"] ?? "");
    }

    if ($handlerName === "") {
        throw new CompanyPostingException("Report has no handler: " . $key, 404, "REPORT_UNKNOWN");
    }

    return [$permission, $handlerName, $optsPatch];
}

/**
 * Run a registry-backed report (no auth). Used by HTTP dispatch and parity tests.
 *
 * @param array<string,mixed> $opts
 * @return mixed
 */
function company_report_run(PDO $db, string $companyId, string $reportKey, array $opts = []) {
    [$permission, $handlerName, $optsPatch] = company_report_resolve($reportKey);
    unset($permission); // caller enforces auth; resolve still validates enabled/unknown
    $handlers = company_report_handler_table();
    if (!isset($handlers[$handlerName])) {
        throw new CompanyPostingException("Report handler missing: " . $handlerName, 404, "REPORT_UNKNOWN");
    }
    $merged = array_merge($opts, $optsPatch);
    return $handlers[$handlerName]($db, $companyId, $merged);
}

/**
 * Report key → view_* permission map — derived from registry (Phase 2B / PHASE_04).
 *
 * @return array<string,string>
 */
function company_report_view_permission_map(): array {
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [];
    foreach (company_report_registry()["reports"] as $row) {
        if (!is_array($row) || empty($row["key"]) || empty($row["permission"])) {
            continue;
        }
        $map[strtolower((string)$row["key"])] = (string)$row["permission"];
    }
    if (isset($map["profit-loss"])) {
        $map["pnl"] = $map["profit-loss"];
    }
    return $map;
}

function company_report_view_permission(string $reportKey): string {
    $map = company_report_view_permission_map();
    $key = strtolower(trim($reportKey));
    return $map[$key] ?? "view_day_book";
}

function company_require_report_view_permission(PDO $db, string $userId, string $companyId, string $reportKey): void {
    $perm = company_report_view_permission($reportKey);
    company_require_permission($db, $userId, $companyId, $perm);
}
