# Company Test Report

**Date:** 2026-09-23  
**Status:** **PARTIAL**

## Unit

```text
vitest run src/company/services/__tests__
→ 6 files, 29 tests PASS
```

Covers purpose scenarios, invariants, report engine, property vouchers, balance helpers, scenarios A–J (logic).

## Gates

| Command | Role |
|---------|------|
| `npm run company:gate:accounting` | File + vitest accounting |
| `npm run company:gate:all` | Aggregate company gate |
| `npm run finance:gate:all` | Personal finance non-regression |

## Not completed this session

- Full `npm run test:api` company endpoints suite
- Browser E2E for `/company` flows
- Synthetic 500k line performance bench
- Live MySQL migration + post scenarios A–J against DB

## Verdict

**PARTIAL**
