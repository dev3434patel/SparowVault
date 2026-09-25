# Company Export Fidelity Report

**Run:** `20260923-210013`  
**Browser evidence:** `COMPANY_BROWSER_A_N_REPORT.md` journey **M**  
**Screens:** `screens/browser-a-n/M-export.png`

## UI surface

Authenticated Playwright opened `/company/app/export` and confirmed:

- Heading: Export / Backup  
- Buttons: **PDF**, **XLSX**, CSV, Trial balance CSV  

## Export pipeline

Server helper `php/helpers/company/exports.php` builds PDF/DOCX/XLSX/CSV with XML/HTML escaping (`htmlspecialchars` / `company_export_xml_text`). Security matrix verified XSS payload does not become a raw executable `<script>` context in DOCX.

## Fidelity depth for this run

| Check | Status |
|-------|--------|
| Export page reachable (auth) | PASS |
| PDF / XLSX controls present | PASS |
| Escape safety (DOCX/XSS probe) | PASS |
| Pixel-perfect branded multi-page golden compare | NOT RUN (product polish — not accounting-core blocker) |
| 1000+ row page-break visual QA | NOT RUN |

## Verdict

**PASS for export surface + escape safety.**  
Branded multi-page visual fidelity remains a **product completeness** item, not required to lift accounting-core conditional status by itself.
