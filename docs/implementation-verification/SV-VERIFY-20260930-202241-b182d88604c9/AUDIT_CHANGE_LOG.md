# Audit change log

- Product source was not patched. `productSourceModifiedDuringAudit` is false.
- `docs/certification/PHASE_L_VNEXT_FINANCE_GATE_REPORT.md` was rewritten by finance:gate:all and then restored to the pre-gate bytes. The hash matches the snapshot.
- Evidence, runners, and this report live only under this run directory.
- The first personal transfer-link assertion failed because the harness omitted the user id. The rerun is the recorded personal oracle. The cash totals had already matched on the first run.
- The company sales raw net used debit minus credit. The report reads a credit balance as positive revenue. The raw JSON is unchanged.
- No PIN, token, or payroll identity was written into the shareable JSON.
