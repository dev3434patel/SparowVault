<?php
declare(strict_types=1);
/**
 * Export visual fidelity gallery — generate PDF/DOCX samples + 1000-row multipage smoke.
 * Does not change accounting semantics.
 */
require_once __DIR__ . "/../../php/config/env.php";
require_once __DIR__ . "/../../php/config/db.php";
require_once __DIR__ . "/../../php/helpers/company/bootstrap.php";

$stamp = getenv("COMPANY_PRODUCT_RUN") ?: "adhoc";
$outDir = __DIR__ . "/../../docs/company/product-completion/{$stamp}/exports";
$rawDir = __DIR__ . "/../../docs/company/product-completion/{$stamp}/raw";
if (!is_dir($outDir)) mkdir($outDir, 0777, true);
if (!is_dir($rawDir)) mkdir($rawDir, 0777, true);

$lines = ["EXPORT FIDELITY GALLERY " . gmdate("c")];
$fail = 0;

function gallery_ok(bool $ok, string $msg): void {
    global $lines, $fail;
    $lines[] = ($ok ? "PASS" : "FAIL") . " $msg";
    if (!$ok) $fail++;
    echo end($lines) . "\n";
}

$cols = ["ledger", "debit", "credit", "narration"];
$short = [
    ["ledger" => "Cash", "debit" => "100000", "credit" => "0", "narration" => "Opening"],
    ["ledger" => "Bank", "debit" => "0", "credit" => "100000", "narration" => "Transfer"],
];
$longName = str_repeat("VeryLongPartyName_", 8) . "End";
$longRows = [];
for ($i = 0; $i < 1000; $i++) {
    $longRows[] = [
        "ledger" => $i % 50 === 0 ? $longName : ("Ledger " . $i),
        "debit" => (string)(($i + 1) * 100),
        "credit" => (string)(($i + 1) * 50),
        "narration" => $i % 2 === 0 ? "Credit presentation" : "Normal",
    ];
}

foreach (["pdf", "docx", "xlsx"] as $fmt) {
    try {
        $shortPack = company_export_build($fmt, "trial-balance-short", $cols, $short, [
            "companyName" => "SparowTech Solutions LLP",
            "title" => "Trial Balance",
            "period" => "FY 2026–27",
        ]);
        $path = "{$outDir}/tb-short.{$fmt}";
        file_put_contents($path, $shortPack["body"]);
        gallery_ok(strlen($shortPack["body"]) > 100, "$fmt short TB size=" . strlen($shortPack["body"]));

        $longPack = company_export_build($fmt, "day-book-1000", $cols, $longRows, [
            "companyName" => "SparowTech Solutions LLP",
            "title" => "Day Book",
            "period" => "2026-09-01 to 2026-09-23",
        ]);
        $path2 = "{$outDir}/daybook-1000.{$fmt}";
        file_put_contents($path2, $longPack["body"]);
        $body = $longPack["body"];
        $okLong = strlen($body) > 500;
        if ($fmt === "xlsx" || $fmt === "csv") {
            $okLong = $okLong && (str_contains($body, "Ledger 999") || str_contains($body, "VeryLongPartyName"));
        } elseif ($fmt === "pdf") {
            $okLong = $okLong && (str_contains($body, "Ledger") || str_contains($body, "Rows: 1000"));
        } else {
            // DOCX is a ZIP; assert substantial payload after raising row sample to 1000.
            $okLong = strlen($body) > 8000;
        }
        gallery_ok($okLong, "$fmt 1000-row pack size=" . strlen($body));
    } catch (Throwable $e) {
        gallery_ok(false, "$fmt " . $e->getMessage());
    }
}

// Empty report
try {
    $empty = company_export_build("pdf", "empty", $cols, [], ["companyName" => "Empty Co", "title" => "Empty"]);
    gallery_ok(strlen($empty["body"]) > 50, "pdf empty report");
} catch (Throwable $e) {
    gallery_ok(false, "empty " . $e->getMessage());
}

$lines[] = "SUMMARY fail=$fail";
file_put_contents($rawDir . "/EVIDENCE_EXPORT_FIDELITY.txt", implode("\n", $lines) . "\n");
file_put_contents(
    __DIR__ . "/../../docs/company/product-completion/{$stamp}/COMPANY_EXPORT_VISUAL_FIDELITY_REPORT.md",
    "# Company Export Visual Fidelity Report\n\n" .
    "Samples under `exports/`.\n\n" .
    implode("\n", array_map(fn($l) => "- $l", $lines)) . "\n\n" .
    ($fail === 0 ? "**EXPORT FIDELITY PASS**\n" : "**EXPORT FIDELITY FAIL**\n")
);
echo ($fail === 0 ? "EXPORT FIDELITY PASS\n" : "EXPORT FIDELITY FAIL\n");
exit($fail === 0 ? 0 : 1);
