# 02 — Architecture (20261001-014647)

```text
Browser
  → App.tsx (/company)
  → CompanyApp + CompanyProviders
  → Pages (split modules, i18n, PermissionGate)
  → companyApi (src/company/api/client/*.ts)
  → api/company/*.php
  → php/controllers/company.php
  → helpers: posting.php + posting_guards/preview/commit/bills, reports*, authz, purpose, exports
  → MySQL company_*
```

Exceptions: shared authStore; FE purposeEngine for catalogues; PHP is posting SoT. Modules page writes inventory/GST/payroll/bridge via newer endpoints (product-adjacent, not core books).

Oversized risk reduced vs Sep 24: Users, Settings, Audit, Export, Search are separate pages. Dashboard split into hooks/components.

**Status: PASS / PARTIAL** — clearer module split; Modules page mixes FUTURE domains into the live shell.
