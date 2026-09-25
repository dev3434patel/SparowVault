# Method Lock — Whole-Project Audit 20260924-004757

## Evidence hierarchy (descending authority)

1. Current runtime behavior
2. Current repository code
3. Current database schema (migration + live SHOW if available)
4. Current API behavior
5. Executed current tests (this run’s `raw/`)
6. Screenshots / browser evidence (`screens/`)
7. Current generated documentation (this package)
8. Historical audits (reference only — never inherit PASS)
9. Original blueprints (intent only)

## Dual measurement

| Metric | Meaning |
|--------|---------|
| Implementation Completion | How much of the intended surface exists in code/UI/DB |
| Verification Completion | How much was proven in this run (tests/browser/EXPLAIN) |

## Allowed status labels

`PASS` | `PARTIAL` | `FAIL` | `BLOCKED` | `NOT IMPLEMENTED` | `FUTURE` | `NOT APPLICABLE` | `NOT VERIFIED`

## BLOCKED rule

Use `BLOCKED` only when environment prevents verification (DB down, missing credentials, tool crash). Record exact blocker in `raw/`.

## FUTURE scope (not FAIL)

Documents, recurring, cross-domain bridge, org subscriptions (tracker #116–119), GST filing, payroll, inventory, SaaS billing — unless product-active in current UI.

## No remediation-during-audit

Do not implement features. Fix only if a defect blocks evidence collection.
