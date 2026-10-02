# Status summary

| Decision field | Value |
|---|---|
| Run | SV-VERIFY-20260930-202153-be89afba |
| Verdict | LOCAL_REMEDIATION_REQUIRED |
| productSourceModifiedDuringAudit | false |
| Parents | 83 |
| Children | 332 |
| Parents locally complete | 0 |
| Open findings | F-001, F-002, F-003, F-004, F-005, F-006 |
| Personal oracles O01–O06 | PASS |
| Company O07, O08, O10, O11, O13 | PASS |
| Company O09, O12 | FAIL |
| Alert combinations | 64 / 64 PASS |
| Six PHP management reports | PASS, each returned 1 row on the fixture day |
| Suites red on first run | lint, vitest (2), statements:gate:strict |
| 20-bank layouts verified | 0 |
| Restore into a second database | not applied |

A parent stays open when any mandatory child was not fully verified. Route checks in the browser were limited to the packaged login redirect for `/company/app/invoices`.
