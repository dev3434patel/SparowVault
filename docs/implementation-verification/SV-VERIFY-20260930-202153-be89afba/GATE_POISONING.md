# Gate poisoning

`gate-poison.mjs` is not an application result. It scores dummy manifests.

| Fixture | Expected | Actual |
|---|---|---|
| Missing evidence | fail | fail, `missing-evidence` |
| Stale hash | fail | fail, `stale-or-missing-hash` |
| Zero tests | fail | fail, `zero-tests` |
| Failed mandatory local row | fail | fail, `failed-mandatory-local` |
| Bank scope marked PASS | fail | fail |
| Complete local rows plus bank `BLOCKED_EXTERNAL` | pass | pass |

Exit 0. These rows do not certify SparowVault.

The stock golden is the same kind of trap inside the product: `company_phase_sv_golden.php` prints value 600 and exits 0, while the paise book for that story is 60000. A helper exit code was not copied into the oracle as a pass.
