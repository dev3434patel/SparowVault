# Card EMI Engine (vNext Phase E)

| Field | Value |
|-------|-------|
| Version | `CARD_EMI_CALCULATION_VERSION = vnext-emi-1.0` |
| Engine | `src/services/cardEmiEngine.ts` |
| Ledger | `financeEventBuilder` cases `card_emi_conversion`, `card_emi_charge` (+ PHP mirror) |

## Lifecycle

```text
Purchase (CC expense)
  → expense_category ↑ + credit_card liability ↑
Conversion (card_emi_conversion)
  → credit_card liability ↓ principal amount
  → card_emi_plan principal ↑
  → optional fee/tax expense + liability
Installment billing (card_emi_charge)
  → card_emi_plan principal ↓ (billed portion)
  → credit_card liability ↑ principal + interest/fee/tax
  → financing expense for interest/fee/tax only
Card payment (cc_payment)
  → bank ↓ + credit_card liability ↓
  → consumption expense ₹0
```

## Schedule strategies

- **reducing_balance** — `calculateEMI(principalPaise, annualRate, tenureMonths)`
- **zero_rate / no-cost EMI** — principal ÷ tenure; projected interest 0
- **Issuer actual** — `CardEmiInstallment.source = issuer_actual` never silently overwritten by estimates

## Golden tests

| ID | File | Asserts |
|----|------|---------|
| T-127 | `cardEmiEngine.test.ts` | ₹60k @ 15% × 12 ≈ ₹5,415.50; sum principal exact |
| T-126 | `cardEmiLifecycle.t126.test.ts` | purchase once; conversion; fee/tax; payment not expense |
| T-130 | same | no-cost EMI net financing after offsets |
| T-131 | same | refund during EMI ≠ income |

## Data confidence

Use `DataConfidenceBadge` (`actual` / `estimated` / `imported` / …).
