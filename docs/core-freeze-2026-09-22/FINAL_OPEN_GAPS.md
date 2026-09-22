# FINAL_OPEN_GAPS.md

SparowVault Core Freeze — only genuine unresolved items.

## External certification (cannot close in software alone)

1. **Real-bank statement holdout corpus** — 0 / 20 layouts `verified-for-scope`. Keep `statements:gate:strict` failing until evidence exists.
2. **Hosted production/staging** — HTTPS, provider Apache, cron, monitoring — **NOT_TESTED** (local Apache extract PASS only).
3. **Physical multi-device** — desktop/phone soak — **NOT_TESTED** (Playwright dual-context substitute only).

## Explicit evidence reconfirmed this freeze

4. ~~Migration/restore financial checksum~~ → **PASS** (`evidence/MIGRATION_CHECKSUM.md`, restore drill).
5. ~~Large-history performance~~ → **PASS** synthetic 50k (`evidence/LARGE_HISTORY_PERFORMANCE.md`).

## Non-blocking improvements

6. Confirm each vNext page’s authoritative repo/hydration path under load (architectural note).
7. Live Razorpay checkout with real test keys (env-dependent).
8. Browser UI soak with large Dexie datasets (beyond synthetic engine loop).
9. Rotated PDF import — future feature only; current reject is intentional.

## Must never claim until (1) is closed

> “All Indian bank statements are supported with perfect accuracy.”
