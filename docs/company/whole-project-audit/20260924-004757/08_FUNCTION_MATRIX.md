# 08 — Function / Button Matrix

## Primary actions (owner path)

| Control | Location | Status | Notes |
|---------|----------|--------|-------|
| Sign in | Login | works | |
| Select company | Select | works | |
| Create another company | Select | works | |
| + New / New | Header | works | Product browser looked for wrong label → false FAIL |
| Mobile Add (+) | Bottom nav | works | Opens new-action sheet |
| Money Received tile | Dashboard | works | → quick/received |
| Money Paid tile | Dashboard | works | |
| Transfer tile | Dashboard | works | |
| New Party tile | Dashboard | works | |
| Journal tile | Dashboard | works | |
| Reports tile | Dashboard | works | |
| Period pills | Dashboard | works | |
| KPI cards drill | Dashboard | works | product DRILL_CASH PASS |
| + Add party | Parties | works | Opens form |
| Create party | Parties form | works | Auth E2E used `/^create$/` — **test fragile** |
| Record Receipt | Quick Received | works | |
| Save transfer | Transfer | works | |
| Post journal | Journal | works | |
| + New entry | Vouchers | works | Likely → quick flows |
| Receive against bill | Receivables | works | |
| Pay against bill | Payables | works | |
| Approve / Reject | Approvals | works when rows | Empty queue OK |
| Create lock | Settings | works | |
| Export format packs | Export | works | fidelity PASS |
| Invite user | Users | works | needs user id |
| Search submit | Search | works | |

## Broken / misleading

| Control | Issue | Severity |
|---------|-------|----------|
| `/vouchers/new` | Same as list — no dedicated create | P1 usability |
| Categories nav | Shows Business Units form | P1 usability |
| Auth E2E Create button | Regex `^create$` misses "Create party" | P2 test |

## Wording quality

Prefer verbs like “Record Receipt”, “Create party”, “Save transfer” — largely present. Generic “Submit” mostly avoided. **PASS** microcopy direction.
