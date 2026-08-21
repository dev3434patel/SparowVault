# Phase Completion Report — Phase {N}: {title}

> Copy this file to `docs/phase-reports/phase-{NN}.md` at the START of a phase
> and fill in as the phase progresses. The phase is not complete until every
> section below has a real answer and the **Phase gate** row at the bottom is
> green.

| Field           | Value                                            |
|-----------------|--------------------------------------------------|
| Phase           | {NN} — {title}                                   |
| Branch          | `phase-{NN}-{slug}`                              |
| Started         | YYYY-MM-DD                                       |
| Completed       | YYYY-MM-DD                                       |
| Owner           | {name}                                           |
| Reviewer        | {name}                                           |

## 1. Goal of the phase
{One-paragraph restatement of the goal in this phase's instructions. If the goal
shifted mid-phase, note both the original and the revised goal.}

## 2. Files changed
List every file created, modified, or removed. Group by area.

### Created
- `path/to/file.ts` — purpose

### Modified
- `path/to/file.ts` — what changed and why

### Removed
- `path/to/file.ts` — reason, and where the responsibility moved

## 3. Migrations added
- `sql/{date}_{slug}.sql` — short description
  - Forward: idempotent (`IF NOT EXISTS` / `IF EXISTS`)? Yes / No
  - Rollback file: `sql/{date}_{slug}_rollback.sql`
  - Tested on test DB? Yes / No (date)

If **no** migrations were added, write "None."

## 4. Features added
- {Feature}: brief description, files involved, who is the user, what behaviour
  did it change.

## 5. Tests added
| File | Type | What it covers | Passes locally |
|------|------|----------------|----------------|
| `…`  | unit | …              | ✅ / ❌         |
| `…`  | e2e  | …              | ✅ / ❌         |

If a behaviour change has **no** test, explain why and what the manual
verification was.

## 6. Tests passed
Paste the exact command lines and their summary output, e.g.

```
$ npm run typecheck
$ npm run lint
$ npm run test
$ npm run test:calculations
$ npm run check:php
$ npm run check:sql
$ npm run build
```

## 7. Known issues
- Anything you encountered but consciously left for a later phase, with the
  proposed follow-up phase.

## 8. Backward-compatibility check
- Existing app builds? ✅ / ❌
- Existing login/register flow works? ✅ / ❌
- Existing Dexie stores initialise? ✅ / ❌
- Existing cloud push/pull works in test env? ✅ / ❌

## 9. Security / privacy review
- New secrets introduced? Where stored?
- New endpoints? Each is rate-limited and user-scoped?
- Any new logging — does it scrub PIN / token / authorisation?

## 10. Money-correctness review
- Did this phase touch any code that totals, projects, or settles money?
- If yes, list the calculation(s) and how double-counting is prevented.

## 11. Phase gate
| Gate                                                      | Status |
|-----------------------------------------------------------|--------|
| All acceptance criteria from the phase brief met          | ☐      |
| `npm run typecheck` clean                                 | ☐      |
| `npm run lint` clean                                      | ☐      |
| `npm run test` green                                      | ☐      |
| `npm run check:php` clean                                 | ☐      |
| `npm run check:sql` clean                                 | ☐      |
| `npm run build` succeeds                                  | ☐      |
| Backup checklist run (if migration was applied)           | ☐      |
| No production secrets committed                           | ☐      |
| Phase report (this file) complete and committed           | ☐      |

**Phase 100% complete?** YES / BLOCKED (with reason)
