<?php
/**
 * Canonical review digest — must stay aligned with src/services/statements/reviewDigest.ts
 * buildServerAlignedDigestMaterial + SHA-256 hex.
 */
function statement_review_digest_material(array $body): string {
    $rowsOut = [];
    $rows = $body["rows"] ?? [];
    if (!is_array($rows)) $rows = [];
    foreach ($rows as $row) {
        if (!is_array($row)) continue;
        $decision = is_array($row["decision"] ?? null) ? $row["decision"] : [];
        $rowsOut[] = [
            "id" => (string)($row["id"] ?? ""),
            "date" => (string)($row["date"] ?? ""),
            "debitPaise" => (int)($row["debitPaise"] ?? 0),
            "creditPaise" => (int)($row["creditPaise"] ?? 0),
            "balancePaise" => array_key_exists("balancePaise", $row) && $row["balancePaise"] !== null ? (int)$row["balancePaise"] : null,
            "description" => (string)($row["description"] ?? ""),
            "reference" => (string)($row["reference"] ?? ""),
            "decision" => [
                "include" => (bool)($decision["include"] ?? false),
                "reviewed" => (bool)($decision["reviewed"] ?? false),
                "kind" => (string)($decision["kind"] ?? ""),
                "categoryId" => (string)($decision["categoryId"] ?? ""),
                "scope" => (string)($decision["scope"] ?? ""),
                "counterpartId" => (string)($decision["counterpartId"] ?? ""),
                "matchTransactionId" => isset($decision["matchTransactionId"]) && is_string($decision["matchTransactionId"])
                    ? $decision["matchTransactionId"]
                    : null,
            ],
        ];
    }
    $evidence = $body["sourceEvidence"] ?? [];
    if (!is_array($evidence)) $evidence = [];
    $payload = [
        "accountId" => (string)($body["accountId"] ?? ""),
        "bank" => $body["bank"] ?? null,
        "documentHash" => (string)($body["documentHash"] ?? ""),
        "parserVersion" => (string)($body["parserVersion"] ?? ""),
        "openingPaise" => (int)($body["openingPaise"] ?? 0),
        "closingPaise" => (int)($body["closingPaise"] ?? 0),
        "order" => (string)($body["order"] ?? ""),
        "rows" => $rowsOut,
        "sourceEvidence" => $evidence === [] ? new stdClass() : $evidence,
        "reviewRevision" => is_int($body["reviewRevision"] ?? null) ? $body["reviewRevision"] : null,
    ];
    // Empty object vs {} — JSON encode empty assoc as object when using stdClass.
    if ($evidence === []) {
        $payload["sourceEvidence"] = new stdClass();
    }
    return json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function statement_review_digest(array $body): string {
    return hash("sha256", statement_review_digest_material($body));
}
