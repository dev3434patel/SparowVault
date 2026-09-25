# 06 — Feature Matrix

| Feature | Implemented | Correct | Reachable | Understandable | Tested | Verdict |
|---------|-------------|-----------|-----------|----------------|--------|---------|
| Create company + COA seed | YES | PASS | YES | YES | gate/http | PASS |
| Select / switch company | YES | PASS | YES | YES | browser | PASS |
| Invite accept token | STUB | — | FUTURE banner | — | — | FUTURE |
| Dashboard KPIs + actions | YES | PASS | YES | YES | product browser PARTIAL | PASS |
| Quick Received/Paid | YES | PASS | YES | YES | PHP+unit | PASS |
| Quick Transfer/Journal | YES | PASS | YES | YES | unit/browser crawl | PASS |
| Parties CRUD | YES | PASS | YES | YES | auth B FAIL test | PASS (product) / PARTIAL (E2E) |
| Party detail statement | YES | PASS | YES | YES | code | PARTIAL verify |
| Ledgers / COA | YES | PASS | YES | YES | crawl | PASS |
| Opening balance post | YES | PASS | Ledgers | MEDIUM | PARTIAL | PARTIAL |
| Voucher list/detail/reverse | YES | PASS | YES | YES | PHP reverse | PASS |
| Voucher new route | NO UI | — | URL→list | Confusing | crawl | FAIL usability |
| Bills AR/AP | YES | PASS | YES | YES | product browser | PASS |
| On-account allocate | YES | PASS | API+UI | MEDIUM | PHP | PARTIAL UX |
| Dimensions BU/Area/Project/CC/Branch | YES | PASS | YES | YES | crawl | PASS |
| Party categories master | ROUTE ONLY | — | Falls to BU | Confusing | crawl | FAIL |
| Approvals queue | YES | PASS | YES | MEDIUM | surface | PARTIAL |
| Period lock | YES | PASS | Settings | YES | product UI | PARTIAL enforce-browser |
| Reports hub core 4+ | YES | PASS | YES | YES | gates | PASS |
| Management reports | disabled | — | FUTURE | — | — | FUTURE |
| Export packs | YES | PASS | YES | YES | fidelity PASS | PASS |
| Audit trail | YES | PASS | YES | YES | crawl | PASS |
| Users invite | YES | PASS | YES | MEDIUM | surface | PARTIAL |
| Global search | YES | PASS | YES | YES | crawl | PASS |
| Documents/Recurring/Cross-domain | schema only | — | — | — | — | FUTURE |

**Implementation (product-active):** ~88%  
**Verified this run:** ~72%
