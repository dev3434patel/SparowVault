# Company Current Truth (Phase 001)

**Evidence run:** `docs/company/final-certification/20260923-200918`  
**Git HEAD:** `ab5058539ec0ec23cc684d426d0d90d93cfb6d97`  
**Branch:** `feat/statement-intelligence-v2` (dirty — company module largely untracked at audit start)

## Inventory summary

| Surface | Count / note |
|---------|--------------|
| Route keys | 33 (`routes.ts`) |
| Core LIVE pages | All app pages except invite was stub → **fixed** to FUTURE-honest `InviteAcceptPage` |
| API files | 24 under `api/company/` |
| `company_*` tables | 34 in core migration |
| Purpose SoT | `config/company-purpose-rules.json` (PHP + TS) |
| Gates | `company:gate:all` 12 specialized |

## Explicit FUTURE (not LIVE)

Documents, recurring, cross-domain bridge, org subscriptions, invite-token redeem.

## Defects found & fixed this audit

| ID | Defect | Fix |
|----|--------|-----|
| AUD-001 | `/company/invite/accept` rendered fake Placeholder | `InviteAcceptPage` FUTURE-honest |
| AUD-002 | Preview hash context could drift preview vs post | `company_preview_hash_context()` shared by controller + post |
| AUD-003 | Dashboard `reduce` untyped (typecheck fail) | `reduce<number>` (prior wave) |

## Baseline commands (all PASS after fixes)

See `raw/EVIDENCE_*` in this folder.
