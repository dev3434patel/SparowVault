# Personal child status (lane P)

Code inspection of P01–P47 on 2 October 2026. This file is not an 83-surface completion claim. Company reports, card-statement type ownership, and live bank evidence stay outside this lane.

`npx vitest run src/services/__tests__/personalBookWorkflows.test.ts src/services/__tests__/obligationEngine.test.ts` — 22 passed.

## Fixed in this lane

- **P14 Transfers.** Two statement observations now attach to the one existing transfer link. The credit leg is not income, the link amount stays the transfer amount, and a fee is stored only as `feeTransactionId`. The same account is rejected. No second transaction is inserted.
- **P20 Bill calendar.** A custom due can be saved and shown with the recurring, loan, card statement, card EMI, udhari, and insurance sources. List, week, and month filters use that same set. An unobserved card minimum is not a confirmed minimum (`cardStatementDuePaise` is null). A labeled calendar row may still show the observed closing balance. Matching an existing payment does not post cash.
- **P21 Reminders.** Create, snooze, and complete were already on the bill calendar. Create now stores an optional linked record id. Reminders stay in-app; closing the browser does not send a push.
- **P25 Shared card limit.** The cards screen already wrote a limit group. A second save now updates that same group, and the screen lists the saved name and amount.
- **P40 Attachments.** Supplied file content is stored with a SHA-256 note, or the save throws when it is over the storage limit. A metadata-only string is no longer a successful content save. Another profile cannot read the blob. Deleting the attachment leaves the linked transaction in place.

## Verified and left in place

- **P01–P04** Shell, sidebar, mobile More, and command palette routes are present, including audit and subscription commands.
- **P05** English and Gujarati personal message modules are wired. This lane did not re-check every long label for clipping.
- **P06–P09** Month snapshot and basic, normal, premium, essential, family, and wealth selections are present. Essential, family, and wealth are not the same section list.
- **P10–P13** Ledger, income and expense pages, tags, and parent category totals are present. Category parents were not rebuilt.
- **P15–P19** Budgets, goals, envelopes, sinking-fund reservations, and the recurring editor are present. Envelope and goal earmarks do not insert a cash movement. The recurring editor was not rebuilt.
- **P22–P24, P26–P29** Accounts, cards, loans, udhari, investments, and wealth tabs are present. Card EMI save on the cards screen converts an existing purchase and does not post that purchase again.
- **P30 local invite.** Creating an invite stores a member and a code. Accepting it sets the name and keeps the viewer role. It is not only a label on the owner’s own rows.
- **P31** A local viewer cannot change household records.
- **P32–P36, P38** Reports, suggestions, alert switches, reconciliation confirm/reject/unmatch, CSV import, and JSON backup of the personal stores are present. Alert switches and reconciliation confirm were not rebuilt.
- **P41–P47** Settings, profile and PIN, the personal cloud allowlist, audit, the subscription page when checkout is off, plan caps, and the admin shell are present.

## Still blocked

- **P30 / P31 second person.** The invite lives on the inviting profile’s own member rows. A different login cannot accept it, and offline revoke across two people was not run.
- **P37** Real-bank PDF certification was not run.
- **P39** Live licensed Account Aggregator access was not run. The local provider remains labeled as not a licensed aggregator.
- **P43** A second-client sync roundtrip was not run. The allowlist already names the personal collections.
