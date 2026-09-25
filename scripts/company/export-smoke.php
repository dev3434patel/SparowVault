<?php
declare(strict_types=1);
require_once __DIR__ . "/../../php/helpers/company/exports.php";

$headers = ["ledger", "debit", "credit"];
$rows = [
    ["ledger" => "Cash", "debit" => "100", "credit" => "0"],
    ["ledger" => "Expense", "debit" => "0", "credit" => "100"],
];

$pdf = company_export_build("pdf", "trial_balance", $headers, $rows, ["companyName" => "Demo Co"]);
if (!str_contains($pdf["body"], "%PDF")) {
    fwrite(STDERR, "PDF missing header\n");
    exit(1);
}
if (($pdf["package"]["brand"] ?? "") !== "SparowVault Company") {
    fwrite(STDERR, "PDF brand missing\n");
    exit(1);
}

$docx = company_export_build("docx", "trial_balance", $headers, $rows, ["companyName" => "Demo Co"]);
if (($docx["package"]["brand"] ?? "") !== "SparowVault Company" && ($docx["package"]["note"] ?? "") === "") {
    // RTF fallback still OK if ZipArchive missing
    if ($docx["format"] !== "docx") {
        fwrite(STDERR, "DOCX build failed\n");
        exit(1);
    }
}
if (strlen($docx["body"]) < 32) {
    fwrite(STDERR, "DOCX body too small\n");
    exit(1);
}

echo "export smoke PASS pdf=" . strlen($pdf["body"]) . " docx=" . strlen($docx["body"]) . "\n";
