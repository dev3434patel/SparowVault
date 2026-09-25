<?php
declare(strict_types=1);

/**
 * Zero-dependency company exports: CSV, XLSX-compatible CSV, branded multi-page PDF, OOXML DOCX.
 */

function company_export_rows_csv(array $headers, array $rows): string {
    $fh = fopen("php://temp", "r+");
    if ($fh === false) {
        throw new RuntimeException("Unable to open temp stream");
    }
    fputcsv($fh, $headers, ",", "\"", "\\");
    foreach ($rows as $row) {
        $line = [];
        foreach ($headers as $h) {
            $line[] = is_array($row) ? ($row[$h] ?? "") : "";
        }
        fputcsv($fh, $line, ",", "\"", "\\");
    }
    rewind($fh);
    $csv = stream_get_contents($fh);
    fclose($fh);
    return $csv === false ? "" : $csv;
}

/** Alias for callers expecting company_export_csv. */
function company_export_csv(array $headers, array $rows): string {
    return company_export_rows_csv($headers, $rows);
}

function company_export_pdf_escape(string $s): string {
    return str_replace(["\\", "(", ")"], ["\\\\", "\\(", "\\)"], $s);
}

/**
 * Branded multi-line PDF with header band + tabular sample rows.
 *
 * @param list<string> $headers
 * @param list<array<string,mixed>> $rows
 */
function company_export_branded_pdf(
    string $title,
    string $companyName,
    array $headers,
    array $rows,
    array $filterSummary = []
): string {
    $brand = "SparowVault Company";
    $generated = gmdate("Y-m-d H:i") . " UTC";
    $filterLine = json_encode($filterSummary, JSON_UNESCAPED_SLASHES) ?: "{}";
    $maxRows = 1000;
    $sample = array_slice($rows, 0, $maxRows);

    $lines = [];
    $lines[] = $brand;
    $lines[] = $title;
    if ($companyName !== "") {
        $lines[] = "Company: " . $companyName;
    }
    $lines[] = "Generated: " . $generated . " | Rows: " . count($rows) . (count($rows) > $maxRows ? " (showing first {$maxRows})" : "");
    $lines[] = "Filters: " . $filterLine;
    $lines[] = str_repeat("-", 72);
    $lines[] = implode(" | ", $headers);
    $lines[] = str_repeat("-", 72);
    foreach ($sample as $row) {
        $cells = [];
        foreach ($headers as $h) {
            $v = is_array($row) ? (string)($row[$h] ?? "") : "";
            $v = preg_replace('/\s+/', ' ', $v) ?? $v;
            if (strlen($v) > 28) {
                $v = substr($v, 0, 25) . "...";
            }
            $cells[] = $v;
        }
        $lines[] = implode(" | ", $cells);
    }
    if (count($rows) > $maxRows) {
        $lines[] = "... " . (count($rows) - $maxRows) . " more rows (see CSV fallback in package)";
    }
    $lines[] = str_repeat("-", 72);
    $lines[] = "End of SparowVault Company export";

    // Paginate ~48 lines per page
    $perPage = 48;
    $pages = array_chunk($lines, $perPage);
    if ($pages === []) {
        $pages = [[$brand, $title]];
    }

    $pageObjs = [];
    $contentObjs = [];
    $fontObjNum = 5 + (count($pages) * 2);
    $kids = [];
    $objNum = 3; // page objects start at 3; contents follow

    foreach ($pages as $pi => $pageLines) {
        $pageObj = $objNum++;
        $contentObj = $objNum++;
        $kids[] = $pageObj . " 0 R";
        $y = 760;
        $content = "BT /F1 11 Tf 40 {$y} Td (" . company_export_pdf_escape($pageLines[0] ?? "") . ") Tj\n";
        $yStep = -14;
        for ($i = 1; $i < count($pageLines); $i++) {
            $content .= "0 {$yStep} Td /F1 9 Tf (" . company_export_pdf_escape($pageLines[$i]) . ") Tj\n";
        }
        $content .= "ET";
        $pageObjs[$pageObj] = "{$pageObj} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {$contentObj} 0 R /Resources<< /Font<< /F1 {$fontObjNum} 0 R >> >> >>endobj\n";
        $contentObjs[$contentObj] = "{$contentObj} 0 obj<< /Length " . strlen($content) . " >>stream\n{$content}\nendstream\nendobj\n";
    }

    $objects = [];
    $objects[1] = "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n";
    $objects[2] = "2 0 obj<< /Type /Pages /Kids [" . implode(" ", $kids) . "] /Count " . count($kids) . " >>endobj\n";
    foreach ($pageObjs as $n => $body) {
        $objects[$n] = $body;
    }
    foreach ($contentObjs as $n => $body) {
        $objects[$n] = $body;
    }
    $objects[$fontObjNum] = "{$fontObjNum} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n";

    ksort($objects, SORT_NUMERIC);
    $pdf = "%PDF-1.4\n";
    $offsets = [0];
    $maxObj = max(array_keys($objects));
    for ($i = 1; $i <= $maxObj; $i++) {
        $offsets[$i] = strlen($pdf);
        $pdf .= $objects[$i] ?? "{$i} 0 obj<<>>endobj\n";
    }
    $xrefPos = strlen($pdf);
    $pdf .= "xref\n0 " . ($maxObj + 1) . "\n";
    $pdf .= "0000000000 65535 f \n";
    for ($i = 1; $i <= $maxObj; $i++) {
        $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
    }
    $pdf .= "trailer<< /Size " . ($maxObj + 1) . " /Root 1 0 R >>\nstartxref\n{$xrefPos}\n%%EOF\n";
    return $pdf;
}

/** @deprecated Use company_export_branded_pdf */
function company_export_minimal_pdf(string $title, string $bodyText): string {
    return company_export_branded_pdf($title, "", ["note"], [["note" => $bodyText]], []);
}

function company_export_minimal_rtf(string $title, string $bodyText): string {
    $esc = static function (string $s): string {
        return str_replace(["\\", "{", "}"], ["\\\\", "\\{", "\\}"], $s);
    };
    return "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 "
        . $esc($title) . "\\par\\fs20 " . $esc($bodyText) . "\\par}";
}

function company_export_xml_text(string $s): string {
    return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, "UTF-8");
}

/**
 * OOXML DOCX with brand header + simple table.
 *
 * @param list<string> $headers
 * @param list<array<string,mixed>> $rows
 */
function company_export_branded_docx(
    string $title,
    string $companyName,
    array $headers,
    array $rows,
    array $filterSummary = []
): string {
    $brand = "SparowVault Company";
    $generated = gmdate("Y-m-d H:i") . " UTC";
    $filterLine = json_encode($filterSummary, JSON_UNESCAPED_SLASHES) ?: "{}";
    $maxRows = 1000;
    $sample = array_slice($rows, 0, $maxRows);

    $p = static function (string $text, bool $bold = false): string {
        $rPr = $bold ? "<w:rPr><w:b/></w:rPr>" : "";
        return "<w:p><w:r>{$rPr}<w:t xml:space=\"preserve\">" . company_export_xml_text($text) . "</w:t></w:r></w:p>";
    };

    $cell = static function (string $text): string {
        return "<w:tc><w:tcPr><w:tcW w:w=\"1200\" w:type=\"dxa\"/></w:tcPr><w:p><w:r><w:t xml:space=\"preserve\">"
            . company_export_xml_text($text) . "</w:t></w:r></w:p></w:tc>";
    };

    $body = "";
    $body .= $p($brand, true);
    $body .= $p($title, true);
    if ($companyName !== "") {
        $body .= $p("Company: " . $companyName);
    }
    $body .= $p("Generated: {$generated} | Rows: " . count($rows));
    $body .= $p("Filters: " . $filterLine);
    $body .= $p("");

    // Header row
    $tr = "<w:tr>";
    foreach ($headers as $h) {
        $tr .= $cell((string)$h);
    }
    $tr .= "</w:tr>";
    $body .= "<w:tbl><w:tblPr><w:tblW w:w=\"0\" w:type=\"auto\"/></w:tblPr>{$tr}";
    foreach ($sample as $row) {
        $tr = "<w:tr>";
        foreach ($headers as $h) {
            $tr .= $cell(is_array($row) ? (string)($row[$h] ?? "") : "");
        }
        $tr .= "</w:tr>";
        $body .= $tr;
    }
    $body .= "</w:tbl>";
    if (count($rows) > $maxRows) {
        $body .= $p("… " . (count($rows) - $maxRows) . " more rows omitted — use CSV for full data.");
    }
    $body .= $p("End of SparowVault Company export");

    $document =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        . '<w:body>' . $body . '</w:body></w:document>';

    $tmp = tempnam(sys_get_temp_dir(), "svdocx");
    if ($tmp === false) {
        throw new RuntimeException("temp file failed");
    }
    $zip = new ZipArchive();
    if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) {
        @unlink($tmp);
        throw new RuntimeException("ZipArchive open failed");
    }
    $zip->addFromString(
        "[Content_Types].xml",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        . '<Default Extension="xml" ContentType="application/xml"/>'
        . '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        . '</Types>'
    );
    $zip->addFromString(
        "_rels/.rels",
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        . '</Relationships>'
    );
    $zip->addFromString("word/document.xml", $document);
    $zip->close();
    $bodyBin = file_get_contents($tmp) ?: "";
    @unlink($tmp);
    return $bodyBin;
}

/**
 * @param list<string> $headers
 * @param list<array<string,mixed>> $rows
 * @param array<string,mixed> $filterSummary
 * @return array{format:string,contentType:string,filename:string,body:string,package?:array}
 */
function company_export_build(
    string $format,
    string $reportKey,
    array $headers,
    array $rows,
    array $filterSummary = []
): array {
    $format = strtolower($format);
    $csv = company_export_rows_csv($headers, $rows);
    $companyName = (string)($filterSummary["companyName"] ?? $filterSummary["company"] ?? "");
    $title = "SparowVault Company — " . $reportKey;
    $summaryLine = json_encode($filterSummary, JSON_UNESCAPED_SLASHES) ?: "{}";

    if ($format === "csv" || $format === "xlsx") {
        $note = $format === "xlsx" ? "# Note: XLSX-compatible CSV (open in Excel)\n" : "";
        $banner = "# {$title}\n# Generated " . gmdate("c") . "\n";
        return [
            "format" => $format,
            "contentType" => "text/csv; charset=utf-8",
            "filename" => $reportKey . ".csv",
            "body" => $banner . $note . $csv,
            "package" => [
                "format" => $format,
                "reportKey" => $reportKey,
                "filters" => $filterSummary,
                "headers" => $headers,
                "rowCount" => count($rows),
                "brand" => "SparowVault Company",
            ],
        ];
    }

    if ($format === "pdf") {
        $body = company_export_branded_pdf($title, $companyName, $headers, $rows, $filterSummary);
        return [
            "format" => "pdf",
            "contentType" => "application/pdf",
            "filename" => $reportKey . ".pdf",
            "body" => $body,
            "package" => [
                "format" => "pdf",
                "reportKey" => $reportKey,
                "filters" => $filterSummary,
                "brand" => "SparowVault Company",
                "rowCount" => count($rows),
                "csvFallback" => $csv,
            ],
        ];
    }

    if ($format === "docx") {
        if (class_exists("ZipArchive")) {
            try {
                $body = company_export_branded_docx($title, $companyName, $headers, $rows, $filterSummary);
                return [
                    "format" => "docx",
                    "contentType" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "filename" => $reportKey . ".docx",
                    "body" => $body,
                    "package" => [
                        "format" => "docx",
                        "reportKey" => $reportKey,
                        "filters" => $filterSummary,
                        "brand" => "SparowVault Company",
                        "rowCount" => count($rows),
                        "csvFallback" => $csv,
                    ],
                ];
            } catch (Throwable $e) {
                // fall through to RTF
            }
        }
        $rtfBody = "Company: {$companyName}\\par Filters: {$summaryLine}\\par Rows: " . count($rows);
        $rtf = company_export_minimal_rtf($title, $rtfBody);
        return [
            "format" => "docx",
            "contentType" => "application/rtf",
            "filename" => $reportKey . ".rtf",
            "body" => $rtf,
            "package" => [
                "format" => "docx",
                "note" => "RTF doc-compatible fallback",
                "reportKey" => $reportKey,
                "filters" => $filterSummary,
                "csvFallback" => $csv,
            ],
        ];
    }

    return [
        "format" => "json",
        "contentType" => "application/json; charset=utf-8",
        "filename" => $reportKey . ".json",
        "body" => json_encode([
            "format" => $format,
            "brand" => "SparowVault Company",
            "reportKey" => $reportKey,
            "filters" => $filterSummary,
            "headers" => $headers,
            "rows" => $rows,
            "csv" => $csv,
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        "package" => [
            "format" => $format,
            "reportKey" => $reportKey,
            "filters" => $filterSummary,
        ],
    ];
}

/** Compatibility wrapper matching alternate signature. */
function company_export_package(
    string $format,
    string $title,
    array $filters,
    array $headers,
    array $rows,
    string $companyName = ""
): array {
    $built = company_export_build($format, $title, $headers, $rows, $filters + ["companyName" => $companyName]);
    return array_merge($built["package"] ?? [], [
        "format" => $built["format"],
        "contentType" => $built["contentType"],
        "filename" => $built["filename"],
        "body" => $built["body"],
        "title" => $title,
        "companyName" => $companyName,
        "filters" => $filters,
        "headers" => $headers,
        "rowCount" => count($rows),
    ]);
}

function company_export_send(array $export): void {
    header("Content-Type: " . $export["contentType"]);
    header("Content-Disposition: attachment; filename=\"" . $export["filename"] . "\"");
    echo $export["body"];
}
