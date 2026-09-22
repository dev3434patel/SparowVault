# FINAL_FINANCE_CERTIFICATION.md

## Gates (this freeze)

| Gate | Exit | Log |
|------|------|-----|
| `npm run typecheck` | 0 | `evidence/cmd-typecheck.log` |
| `npm run check:php` | 0 (84 files) | `evidence/cmd-check-php.log` |
| `npm test` (vitest) | 0 — **54 files / 438 tests** | `evidence/cmd-vitest-all.log` |
| `npm run finance:gate:all` | 0 — **21 pass / 0 warn / 0 skip** | `evidence/cmd-finance-gate-all.log` |
| `npm run test:statements` | 0 | `evidence/cmd-test-statements.log` |
| Migration checksum | PASS | `evidence/MIGRATION_CHECKSUM.md` |
| Backup restore drill | PASS | `evidence/cmd-restore-drill.log` + EVIDENCE_FINAL_BACKUP_* |
| 50k load loop | PASS | `evidence/cmd-load-50k.log` |

## Semantics certified locally

- Paise money paths  
- CC purchase → expense + liability (not bank cash)  
- CC payment → liability settle (not second expense)  
- Card EMI / T-126 lifecycle  
- Transfers ≠ P&L  
- Udhari receivable/payable  
- Goals: earmark vs funded_transfer  
- Household consolidation (module present + gates)  
- Durable outbox + mutationId idempotency + conflict on hash mismatch  

## Not certified here

- Hosted production money path  
- Physical multi-device totals under real latency  
