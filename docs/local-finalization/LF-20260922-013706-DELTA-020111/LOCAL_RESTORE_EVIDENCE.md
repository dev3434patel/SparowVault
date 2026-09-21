# Local restore evidence

Statement suite check: `backup: private consistent dump restores every table's full contents in an isolated database` — **PASS** in `npm run test:statements` this delta.

Separate drill DB restore of importSources/matches/goals/card observations: covered by that backup assertion for table contents; finer fingerprint compare remains available via `finance:backup:restore-drill`.
