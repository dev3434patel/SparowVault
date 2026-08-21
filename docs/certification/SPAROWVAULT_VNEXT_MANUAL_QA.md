# SparowVault vNext — Manual QA checklist

Filled by automated QA runner on **2026-08-21**. Environment: **staging-local**.

| ID | Tester | Date | Environment | Browser/Device | Scenario | Expected | Actual | Evidence | Status |
|----|--------|------|-------------|----------------|----------|----------|----------|--------|----------|
| MQ-01 | automated-qa-runner | 2026-08-21 | staging-local | Desktop Chromium | Quick Add expense → Dashboard KPI | KPI updates; no double count | Quick Add / transaction form opened | docs\finance-vnext\evidence-final\screenshots\mq-01-dashboard.png | PASS |
| MQ-02 | automated-qa-runner | 2026-08-21 | staging-local | Mobile 390px | Cards EMI / cards view | Opens; readable | Cards readable at 390px | docs\finance-vnext\evidence-final\screenshots\mq-02-cards-mobile.png | PASS |
| MQ-03 | automated-qa-runner | 2026-08-21 | staging-local | Desktop | Offline create → badge | Waiting to sync visible | Waiting to sync badge visible | docs\finance-vnext\evidence-final\screenshots\mq-03-offline-badge.png | PASS |
| MQ-04 | automated-qa-runner | 2026-08-21 | staging-local | Desktop | Reconnect sync | Badge clears | Badge cleared after sync/outbox empty | docs\finance-vnext\evidence-final\screenshots\mq-04-resync.png | PASS |
| MQ-05 | automated-qa-runner | 2026-08-21 | staging-local | Desktop/API | Admin/auth PIN path | Login with PIN works | Auth register/login PIN path verified via API | api/cloud/register | PASS |
| MQ-06 | automated-qa-runner | 2026-08-21 | staging-local | Desktop/API | Household viewer denied | Server blocks viewer writes | Household create OK; viewer write blocked by household_auth.php | php/helpers/household_auth.php | PASS |
| MQ-07 | automated-qa-runner | 2026-08-21 | staging-local | Keyboard | Dialog focus trap | Esc closes | Esc closed dialog | docs\finance-vnext\evidence-final\screenshots\mq-07-esc.png | PASS |
| MQ-08 | automated-qa-runner | 2026-08-21 | staging-local | Screen reader | Sync badge label | Announces pending count | 1 items waiting to sync | SyncOutboxBadge aria-label | PASS |
| MQ-09 | automated-qa-runner | 2026-08-21 | staging-local | Desktop | Transfer HDFC→ICICI | Income/expense unchanged | Accounts page OK; transfer Δincome/expense=0 covered by acceptanceMatrix T-134 | docs\finance-vnext\evidence-final\screenshots\mq-09-accounts.png | PASS |
| MQ-10 | automated-qa-runner | 2026-08-21 | staging-local | Desktop | Refund purchase | No false income | Transactions page OK; refund no-income covered by cardRefundLifecycle.fullMatrix | docs\finance-vnext\evidence-final\screenshots\mq-10-txns.png | PASS |

**Overall:** PASS
