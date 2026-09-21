# Local restore report

Backup/restore drill available via `npm run finance:backup:restore-drill` and statement suite backup checks.

This finalization orchestrator records restore as **VERIFY_REQUIRED** against disposable DB — see `test:statements` log for backup assertions when suite exits 0.
