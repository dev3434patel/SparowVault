# Remaining prerequisites

## Local

**None.** All locally runnable mandatory items are evidenced in this delta.

## External (correctly blocked / deferred)

1. Authorized real bank statement corpus + independent holdouts → `verified-for-scope: 0`, `blockedFor20BankClaim: true`
2. Physical multi-device sync soak → `NOT_TESTED` (see PHYSICAL_DEVICE_NOT_TESTED.md)
3. Hosted DNS/TLS/provider production → `NOT_TESTED` (see HOSTED_DEFERRED_CHECKLIST.md)

Non-goals: invent layouts, weaken `statements:gate:strict`, remote PDF AI.
