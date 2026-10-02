# Sync and concurrency

Serial idempotency on `sparowvault_verify_test`: posting the same mutation id twice returned the same voucher id and left one row. A second payload with the same id is specified to return 409. That conflict path was not given a different body in this run.

Two PHP processes posting at the same time were not started. A single worker finishing two calls in order is not a database race. Overlapping concurrency is NOT_RUN.

Cloud sync replay, conflict review, and a 10 by 100 seed were not run. `finance:gate:sync` exited 0 as a file and vitest gate. That is not a sync-outbox pass. Personal outbox tables were not loaded with household, FD, or card EMI rows during a server pull.

The configured application database was not used for these writes.
