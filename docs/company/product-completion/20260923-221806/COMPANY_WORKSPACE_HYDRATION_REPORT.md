# Company Workspace Hydration Report

## Root cause

`company_workspaces_get` called `company_assert_same_company()`, which requires `row.company_id`. Workspace rows use PK `id` only → **deterministic 404**.

## Fix

- Assert `(string)$row["id"] === $companyId` in [`php/controllers/company.php`](../../../php/controllers/company.php)
- Store hydrate sequence token + ignore stale failures ([`companyStore.ts`](../../../src/company/store/companyStore.ts))
- Create flow seeds workspace from create response ([`CreateCompanyPage.tsx`](../../../src/company/pages/CreateCompanyPage.tsx))

## Harness

`php scripts/company/workspace-hydrate-race.php` — 100 create→get iterations.

## Result

```text
HYDRATE RACE PASS
SUMMARY fail=0 / 100
```

Evidence: `raw/EVIDENCE_WORKSPACE_HYDRATE_RACE.txt`
