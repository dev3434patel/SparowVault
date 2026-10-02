# Sync and concurrency

Cloud sync's phase-02 contract test failed on the first vitest run (2 assertions). No overlapping PHP workers were started. Two browser promises against one PHP process would not show a database race, so concurrency is NOT_RUN. Generic sync push and pull were not executed against the disposable database.
