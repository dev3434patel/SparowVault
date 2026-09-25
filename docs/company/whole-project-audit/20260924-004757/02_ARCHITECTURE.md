# 02 — Architecture

## Top-level flow

```text
Browser
  → App.tsx (/company*) 
  → CompanyApp (path router) + CompanyProviders
  → Pages + layout (CompanyAppShell)
  → companyApi (src/company/api/client.ts)
  → /api/company/*.php
  → php/controllers/company.php
  → php/helpers/company/{posting,reports,authz,seed,purpose,exports,audit}
  → MySQL company_* tables
```

## Exceptions / boundary leaks

| Exception | Detail | Risk |
|-----------|--------|------|
| Shared `authStore` | Same JWT/PIN lock for personal + company | Intentional; OK |
| Shared `apiClient` / money utils | Transport + formatting only | Low |
| FE `purposeEngine` on QuickTransfer | Client builds draft lines before PHP post | Medium drift |
| FE `coaSeed` preview | Display-only; PHP seeds on create | Low |
| FE `reportEngine` | Tests only; pages call PHP reports | Dual-maintenance debt |
| Personal outbox skipped | `App.tsx` skips Dexie replay on company portal | Correct isolation |

## Quality assessment

| Dimension | Score /10 | Evidence |
|-----------|----------:|----------|
| Separation of concerns | 7 | Thin API wrappers; posting helper is core; UsersPage mega-file hurts |
| Coupling | 6 | posting↔authz↔seed tight; report registry not shared with PHP |
| Cohesion | 7 | Domain helpers clear; FE barrels obscure Settings/Audit/Export/Search |
| Module boundaries | 7 | `/company` mount isolation strong |
| Domain boundaries | 8 | No personal Dexie in company tree |
| Testability | 7 | Strong service/PHP domain tests; weak page tests |
| Maintainability | 6 | Dashboard 658 LOC, UsersPage 501, client 457 |
| Extensibility | 6 | FUTURE tables exist; APIs/UI missing |

## Oversized components

- `DashboardPage.tsx` ~658 LOC
- `UsersPage.tsx` ~501 LOC (5 screens)
- `api/client.ts` ~457 LOC

## Verdict

**PARTIAL** — professional enough for a domain module; not yet clean multi-tenant SaaS boundaries on every permission surface; FE mega-pages and dual purpose/report logic reduce maintainability.
