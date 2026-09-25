# Company Browser E2E Report

**Status:** PASS (structural A–N) · LIVE optional

Structural journeys **A–N** are certified by `npm run company:test:browser` (`scripts/company/browser-smoke.mjs`):

| ID | Journey |
|----|---------|
| A | Create company + seeded COA |
| B | Select / gateway |
| C | Dashboard |
| D | Parties |
| E | Ledgers |
| F | Vouchers |
| G | Quick received |
| H | Quick paid |
| I | Receivables |
| J | Payables |
| K | Reports |
| L | Approvals |
| M | Audit / Export / Search |
| N | Settings / period locks + App lock gate |

Live HTTP probes: set `COMPANY_E2E_BASEURL` (+ optional `COMPANY_E2E_COOKIE`).

Evidence: `docs/company/evidence/EVIDENCE_COMPANY_BROWSER.txt`
