# Company Final Defect Register (this audit)

| ID | Sev | Status | Summary | Evidence |
|----|-----|--------|---------|----------|
| AUD-001 | P1 | CLOSED | Invite route fake stub | InviteAcceptPage.tsx |
| AUD-002 | P1 | CLOSED | Preview hash context drift risk | company_preview_hash_context |
| AUD-003 | P2 | CLOSED | Dashboard typecheck | DashboardPage reduce\<number\> |
| AUD-004 | P2 | OPEN/ACCEPTED | Full authenticated Playwright journeys (login→post→report) not automated; live HTTP 200 SPA probes only | EVIDENCE_COMPANY_BROWSER_LIVE.txt |
| AUD-005 | P2 | OPEN | Full 10-company / 100k voucher / 500k line matrix incomplete on first attempt | EVIDENCE_COMPANY_100K_PERFORMANCE.txt |
| AUD-006 | P0 | CLOSED | Voucher numbers collided after 9999 (string ORDER BY) | numeric MAX + 8-digit pad + php-tests |

**P0 open:** 0  
**P1 accounting open:** 0  
**P1 product stub open:** 0 (invite fixed)
