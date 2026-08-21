# SparowVault vNext — Baseline Test Results

| Field | Value |
|-------|-------|
| Generated | 2026-08-21 |
| Phase | A — Current-State Certification |
| Environment | Windows 10, Node (project local), PHP CLI with Imagick warnings (non-blocking) |

---

## 1. Commands Executed (This Session)

| Command | Exit code | Result |
|---------|-----------|--------|
| `npm run test` | 0 | **31 files, 247 tests — ALL PASS** |
| `npm run typecheck` | 0 | **PASS** |
| `npm run check:php` | 0 | **72 PHP files parse cleanly** |

### Not run in this session (prior certification reference)

From `SPAROWVAULT_FINAL_CERTIFICATION_REPORT.md` (2026-05-15):

| Command | Prior result |
|---------|--------------|
| `npm run lint` | PASS |
| `npm run check:sql` | PASS |
| `npm run build` | PASS |
| `npm run health` | PASS |
| `npm run test:api` | PASS |
| `npm run test:webhook` | PASS |
| `npm run test:webhook:ownership` | PASS |
| `npm run test:account:endpoints` | PASS |
| `npm run test:browser` | 37/37 PASS |
| `npm run phase:all:gates` | 18/18 PASS |

**Recommendation:** Re-run `npm run health` and `npm run phase:all:gates` before any vNext release certification.

---

## 2. Unit Test Breakdown (2026-08-21)

```
Test Files  31 passed (31)
Tests       247 passed (247)
Duration    ~7.9s
```

### Finance-critical test files

| File | Tests | Coverage area |
|------|-------|---------------|
| `src/services/__tests__/ledger.scenarios.test.ts` | 20 | Core ledger: expense, CC purchase/payment/refund, EMI, loan, udhari, transfer, goals, investments |
| `src/services/__tests__/calculations.characterization.test.ts` | 19 | netMonthlySavings, budget projection, trends (locked behavior) |
| `src/services/__tests__/cardEngine.test.ts` | 8 | Outstanding, utilization, statement window, repair queue |
| `src/services/__tests__/loanEngine.test.ts` | 9 | Amortization, EMI, foreclosure, overdue |
| `src/services/__tests__/udhariEngine.test.ts` | 5 | Receivable/payable ageing |
| `src/services/__tests__/accountBalanceEngine.test.ts` | 3 | Account closing from effects |
| `src/services/__tests__/cashflowSurvivalEngine.test.ts` | 1 | Safe daily spend fixture |
| `src/services/__tests__/transactionPreview.test.ts` | 7 | Pre-save effect preview |
| `src/services/__tests__/debtQa.test.ts` | 3 | Debt QA scenarios |
| `src/utils/__tests__/money.test.ts` | 20 | Paise parsing, entity accessors |
| `tests/unit/phase-03-money-contract.test.ts` | 6 | PHP money parser contract |
| `tests/unit/phase-02-sync-contracts.test.ts` | 9 | Sync allowlist drift, schema idempotency |
| `tests/unit/caReports.test.ts` | 10 | CA report generation |
| `tests/unit/localCombinationMatrix.test.ts` | 24 | Cross-module combination matrix |

---

## 3. Ledger Scenario Coverage (Existing)

The following **are tested** today in `ledger.scenarios.test.ts`:

1. Cash expense → account↓ expense↑
2. Credit card purchase → liability↑ expense↑, no bank↓
3. Credit card payment → bank↓ liability↓, no expense
4. Credit card refund → liability↓ expense↓, no income
5. EMI payment → bank↓ principal↓ interest expense↑
6. EMI penalty/fee → expense category
7. Loan disbursement → bank↑ loan liability↑, no income
8. Loan prepayment → bank↓ principal↓
9. Udhari given → receivable↑, no expense
10. Udhari received (borrowed) → payable↑, no income
11. Transfer → account A↓ B↑, no income/expense
12. Udhari collect → receivable↓, no income
13. Udhari repay → payable↓
14. Udhari write-off → receivable↓ bad debt expense↑
15. Goal contribution / withdrawal
16. Investment buy / sell
17. Soft-deleted transaction excluded

---

## 4. vNext Required Tests — NOT YET PRESENT

These are specified in the vNext master prompt and **must be added** in later phases:

| Test ID | Scenario | Target phase |
|---------|----------|--------------|
| T-126 | Mobile ₹60k CC purchase → EMI conversion → statement → payment E2E | E |
| T-127 | Synthetic EMI golden calculation (₹60k @ 15% × 12) | E |
| T-128 | GST/tax on fees and interest | E |
| T-129 | First-EMI stub period variations | E |
| T-130 | No-cost EMI net financing cost | E |
| T-131 | Card refund after payment / during EMI | E |
| T-132 | Card overpayment → credit balance display | D |
| T-133 | Partial card payment | D |
| T-134 | Self-transfer ₹25k invariant | B (exists as ledger #7) |
| T-135 | Cash withdrawal bank→cash | B/C |
| T-136 | Loan borrow + EMI | Partial (ledger 4,4c) |
| T-137 | Udhari lend/collect/write-off | Covered |
| T-138 | Reimbursement workflow | C |
| T-139 | Bank→FD asset transfer | Partial (investment buy) |
| T-140 | Household transfer | G |
| T-141 | Property-based invariants (fast-check) | B+ |
| T-125 | Four credit cards fixture user | D/E |

---

## 5. Regression Baseline Checksums

Before any migration or money-semantics change, capture per fixture user:

```
totalIncome, totalExpense, totalLiquidAssets, totalLiabilities,
totalReceivables, totalInvestments, netWorth,
transactionCount, financialEventCount, financialEffectCount
```

Fixture users exist under `tests/fixtures/users/`:

- `01-cash-heavy.ts`
- `02-credit-card.ts`
- `03-multi-account.ts`
- `04-personal-loan.ts`
- `05-udhari-goals.ts`

**Action:** Add checksum script in Phase B (`scripts/finance-checksum.mjs`).

---

## 6. Known Test Harness Notes

- PHP Imagick version warning appears during Vitest (PHP subprocess tests) — does not fail tests.
- Ledger tests use minimal Transaction casts; resilient to effect ordering.
- Characterization tests **lock** current `netMonthlySavings` behavior including known quirks — update intentionally in Phase B.

---

## 7. Phase A Gate Status

| Gate | Status |
|------|--------|
| Repository inspected | ✅ |
| Baseline unit tests green | ✅ 247/247 |
| Typecheck green | ✅ |
| PHP syntax green | ✅ |
| Money logic modified | ❌ None (correct for Phase A) |
| vNext finance gates (`finance:gate:*`) | ❌ Not created yet — Phase L |

---

## 8. Raw Test Output Summary

```
 ✓ tests/unit/phase-01-secrets.test.ts (16)
 ✓ src/services/__tests__/ledger.scenarios.test.ts (20)
 ✓ src/services/__tests__/calculations.characterization.test.ts (19)
 ✓ src/services/__tests__/loanEngine.test.ts (9)
 ✓ src/services/__tests__/cardEngine.test.ts (8)
 ✓ tests/unit/phase-02-sync-contracts.test.ts (9)
 ✓ tests/unit/localCombinationMatrix.test.ts (24)
 ... (31 files total)
```

Full log available by re-running: `npm run test`
