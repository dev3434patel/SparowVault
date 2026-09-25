# Company Browser A–N Report (Authenticated)

**Base:** http://localhost:5173
**User:** cert_211549
**Screens:** screens/browser-a-n/

| ID | Journey | Verdict | Detail |
|----|---------|---------|--------|
| A | Create company → dashboard | PASS | url=http://localhost:5173/company/app api=true name=Cert Co muehsvwu |
| X | Suite aborted | FAIL | TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^create$/i })
 |

**Summary:** 1 PASS · 1 FAIL

Authenticated A–N: **FAIL** (do not certify from structural smoke)
