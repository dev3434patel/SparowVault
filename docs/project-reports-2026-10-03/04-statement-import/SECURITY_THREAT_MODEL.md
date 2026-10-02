# Security threat model — statement processing (ST-15)

## Assets

- PDF bytes and statement passwords (device-local)
- Reviewed financial JSON
- Draft rows (sensitive even without PDF)
- Auth sessions / CSRF tokens
- Ledger effects after commit

## Threats and controls

| Threat | Control |
|--------|---------|
| PDF/password uploaded to server | JSON-only import route; unexpected keys rejected |
| Cross-user destination account | Server derives user from session; ownership recheck |
| CSRF on import | `csrf_require_for_mutations` |
| Oversized payload | 20 MB PDF / 60 pages / 2000 rows / 1 MiB JSON |
| OCR asset abuse | Self-hosted workers; no remote PDF OCR |
| Draft leakage across users | Per-user localStorage key; hash match on resume |
| Prompt-like narration | Treated as data; no code execution |
| Hosted CSP/MIME for OCR | Deferred hosted checklist (local production-like only) |

## Logging

Failures must not log PDF bytes, passwords, PINs, cookies, or raw OCR page dumps.
