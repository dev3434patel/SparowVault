# Phase matrix

The playbook phase-dependency file was not in the workspace. Phases below are the audit groups that were actually run.

| Phase | What ran | Result |
|---|---|---|
| A00 freeze | git identity, authority hashes, missing sources | recorded |
| A00 database guard | wrong `TEST_DB_NAME` | PASS (exit 2) |
| A00 database guard | wrong `TEST_DATABASE_URL` | FAIL (F-001) |
| A00 suites | typecheck, php syntax, sql static, finance gates | PASS as file/unit checks |
| A00 suites | lint, vitest, statement strict gate | FAIL, first outcomes kept |
| Trace | 83 parents, 332 children | written, no parent closed |
| O01–O06 personal | disposable IndexedDB | PASS |
| O07–O08, O10–O11, O13 | verify MySQL | PASS |
| O09, O12 | verify MySQL | FAIL |
| Auth | viewer, manager opening balance, PIN, foreign company, stale hash | PASS after the manager probe |
| Reports | six formerly disabled keys | PASS on PHP |
| Journeys J01–J10 | mapped to the oracles because the playbook file is missing | see JOURNEYS.md |
| Concurrency | serial idempotency | PASS |
| Concurrency | two overlapping workers | NOT_RUN |
| 10×100 seed | not run | reduced coverage |
| Package | vite build into this run, serve, MIME, secret scan | client extract served |
| Restore | second database | not loaded (F-006) |
| Gate poisoning | six dummy manifests | the five bad fixtures fail, the complete local fixture passes |
| External | AA, Razorpay, filing, 20-bank corpus, hosting | BLOCKED_EXTERNAL |
