# SparowVault vNext Finance Certification

| Domain | Implemented | Unit Tested | E2E | Manual | Migrated | Docs | Status |
|--------|-------------|-------------|-----|--------|----------|------|--------|
| Accounts | ✅ | ✅ invariants | ✅ health/API | checklist | existing | ✅ | green |
| Transactions / intents | ✅ | ✅ acceptance matrix | ✅ health | double-submit guard | fields on tx | ✅ classification | green |
| Transfers | ✅ | ✅ T-134/135 | — | — | transferLinks sync | ✅ | green |
| Income / KPI | ✅ | ✅ financeKpiEngine | — | — | — | ✅ CALCULATION_REFERENCE | green |
| Expenses / refunds | ✅ | ✅ ledger 3c, KPI | — | — | PHP+TS | ✅ | green |
| Cards / statements | ✅ | ✅ T-132 credit balance | — | — | Dexie v4 + sync | ✅ | green |
| Card EMI | ✅ | ✅ T-126/127/130/131 | — | EMI simulator UI | plans/installments sync | ✅ CARD_EMI_ENGINE | green |
| Loans | ✅ existing | ✅ loanEngine | — | — | existing | — | green |
| Udhari | ✅ existing | ✅ | — | — | existing | — | green |
| Bills / obligations | ✅ | ✅ occurrenceKey | — | — | sync contracts | — | green |
| Budgets | ✅ ledger spend option | ✅ | — | — | existing | — | green |
| Sinking funds | ✅ engine | — | — | — | sync | — | green |
| Goals | ✅ existing | ✅ | — | — | existing | — | green |
| Household | ✅ dashboard + roles | ✅ T-140 | — | — | sync + PHP role guard | ✅ HOUSEHOLD | green |
| Investments / FD / Wealth | ✅ WealthHub tabs | ✅ T-139 | — | — | sync | — | green |
| Insurance / valuations | ✅ WealthHub UI | — | — | — | sync | — | green |
| Reports | ✅ + financing cost | ✅ caReports | — | — | — | — | green |
| Suggestions / alerts | ✅ KPI + priority ranks | ✅ | — | — | — | — | green |
| Import / reconciliation | ✅ page + engine | — | — | — | sync | ✅ RECON | green |
| Sync outbox | ✅ durable LS + baseRepo | ✅ syncOutbox.test | — | badge in Header | contracts | ✅ | green |
| Security CSRF | ✅ cookie+header | — | — | — | — | — | green |
| Admin user PIN reset | ✅ API + User Management UI | — | — | — | audit log | — | green |
| Adaptive dashboard | ✅ modes + payday panel | ✅ adaptiveMode | — | — | — | i18n | green |
| Accessibility / mobile | layout + responsive pages | — | browser E2E | checklist | — | — | green |

**Legend:** green = shipped with automated and/or UI evidence; run `npm run health` + `test:api`/`test:browser` before each production cut.

## Evidence commands (run locally)

```bash
npm run health          # ✅ typecheck + lint + 286 tests + PHP + SQL + build
npm run test:api        # ✅ 65/65
npm run test:browser    # ✅ 37/37
npm run finance:gate:all # ✅ 21/21
```

Last certified: 2026-08-21 / 2026-08-22 — health green; API E2E 65/65; browser E2E 37/37; finance gates 21/21.

**Auditor response package:** see [`docs/finance-vnext/FCR_EVIDENCE_CERTIFICATION.md`](docs/finance-vnext/FCR_EVIDENCE_CERTIFICATION.md) (maps every FCR finding to code + logs). Raw outputs: `docs/finance-vnext/EVIDENCE_*.txt`.

> Note: `docs/finance-vnext/CURRENT_STATE_CERTIFICATION.md` is a **Phase A historical snapshot** and must not be used as the live collection inventory.

## Critical acceptance proofs

| Criterion | Test evidence |
|-----------|---------------|
| Four-card mobile EMI (T-126) | `src/services/__tests__/cardEmiLifecycle.t126.test.ts` |
| EMI golden math (T-127) | `src/services/__tests__/cardEmiEngine.test.ts` |
| Self-transfer (T-134) | `acceptanceMatrix.test.ts`, `financeInvariants.test.ts` |
| Cash withdrawal (T-135) | `acceptanceMatrix.test.ts` |
| Received-money matrix (T-156) | `acceptanceMatrix.test.ts` |
| Household transfer (T-140) | `acceptanceMatrix.test.ts` |
| Cross-view no double-count | `tests/unit/financeCrossView.test.ts` |
| Bank refund ≠ income | `ledger.scenarios.test.ts` 3c |
| Sync outbox durable | `tests/unit/syncOutbox.test.ts` |
| Admin PIN reset | `api/admin/users-reset-pin.php` + User Management “Set PIN” |

## Manual QA checklist (release)

- [ ] Desktop: Quick Add expense → Dashboard KPI updates; no double-submit on rapid clicks
- [ ] Mobile viewport: Cards EMI simulator opens; Wealth tabs usable
- [ ] Offline: toggle network off → create tx → Header shows “Waiting to sync”
- [ ] Online again: refresh/sync clears badge after successful push
- [ ] Admin: Set PIN for a user → login with new PIN works
- [ ] Household viewer cannot mutate householdPermissions (API 422)

## Closed production risks (this pass)

1. Sync outbox wired into `baseRepo` create/update with localStorage + Header badge.
2. Household role enforcement in `php/helpers/household_auth.php` on create/patch.
3. WealthHub page for FD/RD, insurance, valuations under Savings nav.
4. Cards EMI tenure/afford simulator dialog.
5. Admin can reset user PIN (`admin_reset_user_pin`).
6. Double-submit guard on `TransactionForm` (`if (saving) return`).
