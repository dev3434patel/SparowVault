# Remaining work (post core freeze)

## Closed for Baseline A — SOFTWARE COMPLETE

Internal gates, finance gates, statement pipeline, migration checksum, restore drill, 50k engine load, feature-flag static matrix, freeze package under `docs/core-freeze-2026-09-22/`.

## Still open — Baseline B (production / external)

1. Real-bank holdouts → `verified-for-scope` (keep strict gate)  
2. Hosted staging/production validation  
3. Physical multi-device soak  
4. Optional: browser large-Dexie UI soak; live Razorpay test keys  

## Non-goals

- Inventing bank layouts  
- Weakening `statements:gate:strict`  
- Rewriting ledger / EMI / outbox / digest without cause  
