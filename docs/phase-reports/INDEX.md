# SparowVault — Phase reports index

This folder is for **per-phase deep-dive completion reports**. The
short-form top-level summary lives at the repo root
(`PHASE_NN_COMPLETION_REPORT.md`); deep narrative reports live here.

## File layout

| Path                                              | Purpose                                                                 |
|---------------------------------------------------|-------------------------------------------------------------------------|
| `PHASE_GATE_INDEX.md` (repo root)                 | Auto-generated index of pass/fail across all phases.                    |
| `PHASE_NN_COMPLETION_REPORT.md` (repo root)       | Short-form, auto-rewritten by each `phase:NN:gate` runner.              |
| `docs/phase-reports/phase-NN.md`                  | Long-form narrative — files changed, rationale, risks, screenshots.     |
| `docs/phase-reports/phase-NN-manual-checklist.md` | Per-phase manual verification matrix (when the phase needs one).        |
| `docs/phase-completion-template.md`               | Template for new long-form reports.                                     |
| `docs/finance-correctness-test-plan.md`           | Living document. Every money-touching phase updates this.               |
| `docs/backup-checklist.md`                        | Run before every production migration.                                  |

## How a phase ends, formally

1. Run `npm run phase:NN:gate` until all automated rows are ✅.
2. Walk the **Manual verification** checklist in the regenerated
   `PHASE_NN_COMPLETION_REPORT.md`. Tick every box. If a box can't be
   ticked, the phase is NOT complete — fix and re-run.
3. Copy `docs/phase-completion-template.md` to
   `docs/phase-reports/phase-NN.md` and fill in the narrative
   (files changed / rationale / known issues / rollback).
4. Append to the bottom of `PHASE_NN_COMPLETION_REPORT.md`:
   `YYYY-MM-DD — Phase NN verified complete by <name>.`
5. Open the next phase's branch.

## Quick links to completion reports

- [Phase 00](../../PHASE_00_COMPLETION_REPORT.md) — Baseline safety
- [Phase 01](../../PHASE_01_COMPLETION_REPORT.md) — Security launch blockers
- [Phase 01 gate](../../PHASE_01_GATE_REPORT.md)
- [Phase 02](../../PHASE_02_COMPLETION_REPORT.md) — CI + calculation tests
- [Phase 03](../../PHASE_03_COMPLETION_REPORT.md) — Paise integers
- [Phase 04](../../PHASE_04_COMPLETION_REPORT.md) — Indexed sync + validation
- [Phase 05](../../PHASE_05_COMPLETION_REPORT.md) — Financial ledger
- [Phase 06](../../PHASE_06_COMPLETION_REPORT.md) — Smart transaction form
- [Phase 07](../../PHASE_07_COMPLETION_REPORT.md) — Credit-card engine
- [Phase 08](../../PHASE_08_COMPLETION_REPORT.md) — Loan engine
- [Phase 09](../../PHASE_09_COMPLETION_REPORT.md) — Udhari engine
- [Phase 10](../../PHASE_10_COMPLETION_REPORT.md) — Goals/cashflow/budgets
- [Phase 11](../../PHASE_11_COMPLETION_REPORT.md) — AI suggestion engine
- [Phase 12](../../PHASE_12_COMPLETION_REPORT.md) — Dashboard/colors/reports
- [Phase 13](../../PHASE_13_COMPLETION_REPORT.md) — Privacy / compliance / audit / retention
- [Phase 14](../../PHASE_14_COMPLETION_REPORT.md) — SaaS billing fairness + feature gating
- [Phase 15](../../PHASE_15_COMPLETION_REPORT.md) — Premium CA reports + business/personal
- [Phase 16](../../PHASE_16_COMPLETION_REPORT.md) — Persona-aware AI coach
- [Phase 17](../../PHASE_17_COMPLETION_REPORT.md) — Staging / monitoring / backup / launch readiness

All 18 phases (0-17) are now scaffolded. Run `npm run phase:all:gates` to walk every gate.
