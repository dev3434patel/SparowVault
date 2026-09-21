# Executed Test Matrix - 11 September 2026

Counts overlap across suites. Rows record actual assertions, not independently covered features. Repeated administrative denial status failures share one root cause. The extended audit's wipe-after-failed-restore probe is blocked by a rejected outbox item; the clean wipe defect is independently confirmed in Module workflows. Unexecuted combinations are in the full report, not silently marked pass.

## Development integrity/statement/browser

Source: [verification/atomic-writes.json](verification/atomic-writes.json)

| # | Assertion | Outcome | Failure detail |
|---|---|---|---|
| 1 | 24 identical concurrent retries produce one immutable receipt and record | PASS |  |
| 2 | 24 different payloads cannot share one mutation key | PASS |  |
| 3 | stale PATCH is rejected and retry returns the original committed result | PASS |  |
| 4 | invalid sync batch rolls back source, ledger and audit | PASS |  |
| 5 | malformed sync rows are rejected rather than silently skipped | PASS |  |
| 6 | stale sync cannot resurrect a soft-deleted record | PASS |  |
| 7 | nonexistent and foreign transaction references are rejected | PASS |  |
| 8 | same transaction ID in two tenants has isolated ledger effects | PASS |  |
| 9 | referenced account cannot be deleted | PASS |  |
| 10 | ledger failure rolls back entity, receipt and audit | PASS |  |
| 11 | batch PATCH rolls back its first row when a later row is missing | PASS |  |
| 12 | bulk hard-delete voids posted ledger and retains server audit | PASS |  |
| 13 | hard-delete tombstones prevent stale snapshot resurrection | PASS |  |
| 14 | mutation keys are isolated by user and bound to collection | PASS |  |
| 15 | sync validates a final parent graph independent of collection order | PASS |  |
| 16 | household viewer restrictions hold on batch, sync and bulk hard-delete | PASS |  |
| 17 | bulk import uses reference validation and retry-safe row writes | PASS |  |
| 18 | owner-bound reads and queued patches reject a changed authenticated user | PASS |  |
| 19 | statement: method, authentication and CSRF are enforced | PASS |  |
| 20 | statement: mismatched balance cannot partially post source, effects or audit | PASS |  |
| 21 | statement: foreign categories, account switch and invalid calendar dates are rejected | PASS |  |
| 22 | statement: explicit review, matching direction, scope and category are mandatory | PASS |  |
| 23 | statement: concurrent identical reviewed imports produce exactly three transactions | PASS |  |
| 24 | statement: re-exported PDF and new request key do not duplicate imported rows | PASS |  |
| 25 | statement: approved transaction provenance excludes PDF bytes and passwords | PASS |  |
| 26 | statement: the same PDF cannot be posted into a second bank account | PASS |  |
| 27 | statement: excluded rows still participate in complete balance validation | PASS |  |
| 28 | statement: own-account transfer posts both account legs without income/expense categories | PASS |  |
| 29 | statement: excessive linked refunds roll back the entire batch | PASS |  |
| 30 | statement: reviewed refund reduces expense and increases bank balance without income | PASS |  |
| 31 | statement: card payment reduces cash and card liability without recording another expense | PASS |  |
| 32 | statement: import throttling rejects requests beyond its configured limit | PASS |  |
| 33 | contribution: 400 meal + 200 return = 200 expense, -200 cash, zero income | PASS |  |
| 34 | contribution: concurrent returns cannot exceed remaining expense | PASS |  |
| 35 | contribution: category, scope, date, income type and missing original are rejected | PASS |  |
| 36 | statement: OCR confirmation is required server-side and contribution preserves provenance | PASS |  |
| 37 | security: logout revokes captured bearer token but not another session | PASS |  |
| 38 | security: recovery requires PIN and survives PIN changes; old sessions are revoked | PASS |  |
| 39 | security: cookie mutations require CSRF, GET me does not rotate a valid token | PASS |  |
| 40 | security: concurrent PIN changes cannot both overwrite the same credential | PASS |  |
| 41 | security: forced PIN change blocks financial access until credential replacement | PASS |  |
| 42 | security: dev server refuses source, configuration, backup and dependency paths | PASS |  |
| 43 | security: untrusted and opaque origins never receive credentialed CORS | PASS |  |
| 44 | security: spoofed forwarded IP headers cannot evade the login limit | PASS |  |
| 45 | backup: private consistent dump restores every table's full contents in an isolated database | PASS |  |
| 46 | browser: real account form creates a durable server record | PASS |  |
| 47 | browser: a 503 create survives cloud refresh with a replayable payload | PASS |  |
| 48 | browser: sync review renders without overflow at desktop and mobile sizes | PASS |  |
| 49 | browser: actual browser process restart preserves IndexedDB payload | PASS |  |
| 50 | browser: two-tab reconnect drains queue and persists exactly one server row | PASS |  |
| 51 | browser: validation rejection opens actionable sync review | PASS |  |
| 52 | browser: pending-change download contains the recoverable rejected payload | PASS |  |
| 53 | browser: confirmed server-version resolution clears a rejected queue item | PASS |  |
| 54 | browser: no uncaught application errors during durability workflows | PASS |  |
| 55 | statement browser: encrypted PDF asks for password, rejects wrong password, extracts with correct one | PASS |  |
| 56 | statement browser: mobile review is contained and header upload remains reachable | PASS |  |
| 57 | statement browser: confirmed decisions import correct amounts and no PDF/password leaves the browser | PASS |  |
| 58 | statement browser: all five synthetic bank headings and multipage statements extract | PASS |  |
| 59 | statement browser: numbered Kotak export resolves period, headerless continuation and independent summary | PASS |  |
| 60 | statement browser: local OCR extracts clean and encrypted scanned statements with mandatory review | PASS |  |
| 61 | statement browser: unsupported scanned content is blocked without guessed financial entries | PASS |  |
| 62 | contribution browser: original-expense action posts a linked return and displays net cost | PASS |  |
| 63 | statement browser: malformed non-PDF is rejected and no uncaught errors occurred | PASS |  |

## Production artifact

Source: [verification/production-artifact.json](verification/production-artifact.json)

| # | Assertion | Outcome | Failure detail |
|---|---|---|---|
| 1 | 24 identical concurrent retries produce one immutable receipt and record | PASS |  |
| 2 | 24 different payloads cannot share one mutation key | PASS |  |
| 3 | stale PATCH is rejected and retry returns the original committed result | PASS |  |
| 4 | invalid sync batch rolls back source, ledger and audit | PASS |  |
| 5 | malformed sync rows are rejected rather than silently skipped | PASS |  |
| 6 | stale sync cannot resurrect a soft-deleted record | PASS |  |
| 7 | nonexistent and foreign transaction references are rejected | PASS |  |
| 8 | same transaction ID in two tenants has isolated ledger effects | PASS |  |
| 9 | referenced account cannot be deleted | PASS |  |
| 10 | ledger failure rolls back entity, receipt and audit | PASS |  |
| 11 | batch PATCH rolls back its first row when a later row is missing | PASS |  |
| 12 | bulk hard-delete voids posted ledger and retains server audit | PASS |  |
| 13 | hard-delete tombstones prevent stale snapshot resurrection | PASS |  |
| 14 | mutation keys are isolated by user and bound to collection | PASS |  |
| 15 | sync validates a final parent graph independent of collection order | PASS |  |
| 16 | household viewer restrictions hold on batch, sync and bulk hard-delete | PASS |  |
| 17 | bulk import uses reference validation and retry-safe row writes | PASS |  |
| 18 | owner-bound reads and queued patches reject a changed authenticated user | PASS |  |
| 19 | statement: method, authentication and CSRF are enforced | PASS |  |
| 20 | statement: mismatched balance cannot partially post source, effects or audit | PASS |  |
| 21 | statement: foreign categories, account switch and invalid calendar dates are rejected | PASS |  |
| 22 | statement: explicit review, matching direction, scope and category are mandatory | PASS |  |
| 23 | statement: concurrent identical reviewed imports produce exactly three transactions | PASS |  |
| 24 | statement: re-exported PDF and new request key do not duplicate imported rows | PASS |  |
| 25 | statement: approved transaction provenance excludes PDF bytes and passwords | PASS |  |
| 26 | statement: the same PDF cannot be posted into a second bank account | PASS |  |
| 27 | statement: excluded rows still participate in complete balance validation | PASS |  |
| 28 | statement: own-account transfer posts both account legs without income/expense categories | PASS |  |
| 29 | statement: excessive linked refunds roll back the entire batch | PASS |  |
| 30 | statement: reviewed refund reduces expense and increases bank balance without income | PASS |  |
| 31 | statement: card payment reduces cash and card liability without recording another expense | PASS |  |
| 32 | statement: import throttling rejects requests beyond its configured limit | PASS |  |
| 33 | contribution: 400 meal + 200 return = 200 expense, -200 cash, zero income | PASS |  |
| 34 | contribution: concurrent returns cannot exceed remaining expense | PASS |  |
| 35 | contribution: category, scope, date, income type and missing original are rejected | PASS |  |
| 36 | statement: OCR confirmation is required server-side and contribution preserves provenance | PASS |  |
| 37 | security: logout revokes captured bearer token but not another session | PASS |  |
| 38 | security: recovery requires PIN and survives PIN changes; old sessions are revoked | PASS |  |
| 39 | security: cookie mutations require CSRF, GET me does not rotate a valid token | PASS |  |
| 40 | security: concurrent PIN changes cannot both overwrite the same credential | PASS |  |
| 41 | security: forced PIN change blocks financial access until credential replacement | PASS |  |
| 42 | security: dev server refuses source, configuration, backup and dependency paths | PASS |  |
| 43 | security: untrusted and opaque origins never receive credentialed CORS | PASS |  |
| 44 | security: spoofed forwarded IP headers cannot evade the login limit | PASS |  |
| 45 | backup: private consistent dump restores every table's full contents in an isolated database | PASS |  |
| 46 | statement browser: encrypted PDF asks for password, rejects wrong password, extracts with correct one | PASS |  |
| 47 | statement browser: mobile review is contained and header upload remains reachable | PASS |  |
| 48 | statement browser: confirmed decisions import correct amounts and no PDF/password leaves the browser | PASS |  |
| 49 | statement browser: all five synthetic bank headings and multipage statements extract | PASS |  |
| 50 | statement browser: numbered Kotak export resolves period, headerless continuation and independent summary | PASS |  |
| 51 | statement browser: local OCR extracts clean and encrypted scanned statements with mandatory review | PASS |  |
| 52 | statement browser: unsupported scanned content is blocked without guessed financial entries | PASS |  |
| 53 | contribution browser: original-expense action posts a linked return and displays net cost | PASS |  |
| 54 | statement browser: malformed non-PDF is rejected and no uncaught errors occurred | PASS |  |

## Extended audit

Source: [extended-final-verified/atomic-writes.json](extended-final-verified/atomic-writes.json)

| # | Assertion | Outcome | Failure detail |
|---|---|---|---|
| 1 | 24 identical concurrent retries produce one immutable receipt and record | PASS |  |
| 2 | 24 different payloads cannot share one mutation key | PASS |  |
| 3 | stale PATCH is rejected and retry returns the original committed result | PASS |  |
| 4 | invalid sync batch rolls back source, ledger and audit | PASS |  |
| 5 | malformed sync rows are rejected rather than silently skipped | PASS |  |
| 6 | stale sync cannot resurrect a soft-deleted record | PASS |  |
| 7 | nonexistent and foreign transaction references are rejected | PASS |  |
| 8 | same transaction ID in two tenants has isolated ledger effects | PASS |  |
| 9 | referenced account cannot be deleted | PASS |  |
| 10 | ledger failure rolls back entity, receipt and audit | PASS |  |
| 11 | batch PATCH rolls back its first row when a later row is missing | PASS |  |
| 12 | bulk hard-delete voids posted ledger and retains server audit | PASS |  |
| 13 | hard-delete tombstones prevent stale snapshot resurrection | PASS |  |
| 14 | mutation keys are isolated by user and bound to collection | PASS |  |
| 15 | sync validates a final parent graph independent of collection order | PASS |  |
| 16 | household viewer restrictions hold on batch, sync and bulk hard-delete | PASS |  |
| 17 | bulk import uses reference validation and retry-safe row writes | PASS |  |
| 18 | owner-bound reads and queued patches reject a changed authenticated user | PASS |  |
| 19 | audit RBAC: anonymous denied GET /api/admin/dashboard.php | NONPASSING | Expected 401/403, got 500 |
| 20 | audit RBAC: user denied GET /api/admin/dashboard.php | NONPASSING | Expected 401/403, got 500 |
| 21 | audit admin: GET /api/admin/dashboard.php | PASS |  |
| 22 | audit RBAC: anonymous denied GET /api/admin/users.php | NONPASSING | Expected 401/403, got 500 |
| 23 | audit RBAC: user denied GET /api/admin/users.php | NONPASSING | Expected 401/403, got 500 |
| 24 | audit admin: GET /api/admin/users.php | PASS |  |
| 25 | audit RBAC: anonymous denied GET /api/admin/plans.php | NONPASSING | Expected 401/403, got 500 |
| 26 | audit RBAC: user denied GET /api/admin/plans.php | NONPASSING | Expected 401/403, got 500 |
| 27 | audit admin: GET /api/admin/plans.php | PASS |  |
| 28 | audit RBAC: anonymous denied GET /api/admin/subscriptions.php | NONPASSING | Expected 401/403, got 500 |
| 29 | audit RBAC: user denied GET /api/admin/subscriptions.php | NONPASSING | Expected 401/403, got 500 |
| 30 | audit admin: GET /api/admin/subscriptions.php | PASS |  |
| 31 | audit RBAC: anonymous denied GET /api/admin/feature-flags.php | NONPASSING | Expected 401/403, got 500 |
| 32 | audit RBAC: user denied GET /api/admin/feature-flags.php | NONPASSING | Expected 401/403, got 500 |
| 33 | audit admin: GET /api/admin/feature-flags.php | PASS |  |
| 34 | audit RBAC: anonymous denied GET /api/admin/settings.php | NONPASSING | Expected 401/403, got 500 |
| 35 | audit RBAC: user denied GET /api/admin/settings.php | NONPASSING | Expected 401/403, got 500 |
| 36 | audit admin: GET /api/admin/settings.php | PASS |  |
| 37 | audit RBAC: anonymous denied POST /api/admin/users-toggle-active.php | NONPASSING | Expected 401/403, got 500 |
| 38 | audit RBAC: user denied POST /api/admin/users-toggle-active.php | NONPASSING | Expected 401/403, got 500 |
| 39 | audit RBAC: anonymous denied POST /api/admin/users-reset-pin.php | NONPASSING | Expected 401/403, got 500 |
| 40 | audit RBAC: user denied POST /api/admin/users-reset-pin.php | NONPASSING | Expected 401/403, got 500 |
| 41 | audit RBAC: anonymous denied POST /api/admin/users-assign-plan.php | NONPASSING | Expected 401/403, got 500 |
| 42 | audit RBAC: user denied POST /api/admin/users-assign-plan.php | NONPASSING | Expected 401/403, got 500 |
| 43 | audit collection read: accounts owner isolation | PASS |  |
| 44 | audit collection read: alerts owner isolation | PASS |  |
| 45 | audit collection read: assetValuations owner isolation | PASS |  |
| 46 | audit collection read: attachments owner isolation | PASS |  |
| 47 | audit collection read: auditLogs owner isolation | PASS |  |
| 48 | audit collection read: budgets owner isolation | PASS |  |
| 49 | audit collection read: cardEmiInstallments owner isolation | PASS |  |
| 50 | audit collection read: cardEmiPlans owner isolation | PASS |  |
| 51 | audit collection read: cardPaymentAllocations owner isolation | PASS |  |
| 52 | audit collection read: cardStatements owner isolation | PASS |  |
| 53 | audit collection read: cards owner isolation | PASS |  |
| 54 | audit collection read: categories owner isolation | PASS |  |
| 55 | audit collection read: creditLimitGroups owner isolation | PASS |  |
| 56 | audit collection read: emis owner isolation | PASS |  |
| 57 | audit collection read: exportHistory owner isolation | PASS |  |
| 58 | audit collection read: fixedIncomeAssets owner isolation | PASS |  |
| 59 | audit collection read: goalContribs owner isolation | PASS |  |
| 60 | audit collection read: goals owner isolation | PASS |  |
| 61 | audit collection read: householdMembers owner isolation | PASS |  |
| 62 | audit collection read: householdPermissions owner isolation | PASS |  |
| 63 | audit collection read: households owner isolation | PASS |  |
| 64 | audit collection read: importSources owner isolation | PASS |  |
| 65 | audit collection read: insurancePolicies owner isolation | PASS |  |
| 66 | audit collection read: investments owner isolation | PASS |  |
| 67 | audit collection read: loans owner isolation | PASS |  |
| 68 | audit collection read: obligations owner isolation | PASS |  |
| 69 | audit collection read: reconciliationMatches owner isolation | PASS |  |
| 70 | audit collection read: recurringRules owner isolation | PASS |  |
| 71 | audit collection read: reminders owner isolation | PASS |  |
| 72 | audit collection read: savingsContribs owner isolation | PASS |  |
| 73 | audit collection read: settings owner isolation | PASS |  |
| 74 | audit collection read: sinkingFunds owner isolation | PASS |  |
| 75 | audit collection read: snapshots owner isolation | PASS |  |
| 76 | audit collection read: transactions owner isolation | PASS |  |
| 77 | audit collection read: transferLinks owner isolation | PASS |  |
| 78 | audit collection read: udhari owner isolation | PASS |  |
| 79 | audit collection read: udhariSettlements owner isolation | PASS |  |
| 80 | audit input: malformed JSON and unsupported collection rejected | PASS |  |
| 81 | audit security: stored text remains data and SQL metacharacters do not bypass ownership | PASS |  |
| 82 | audit concurrency: stale versionless PATCH must not overwrite a newer edit | NONPASSING | Stale versionless update accepted: 200, version=3 |
| 83 | audit security: client cannot fabricate and erase visible audit history | NONPASSING | Forged visible audit accepted=201; erase=200. Server user_audit_logs is a separate table. |
| 84 | audit schema/reference: invalid accounts rejected | NONPASSING | Invalid accounts persisted with HTTP 201  201 !== 422  |
| 85 | audit schema/reference: invalid loans rejected | NONPASSING | Invalid loans persisted with HTTP 201  201 !== 422  |
| 86 | audit schema/reference: invalid goalContribs rejected | NONPASSING | Invalid goalContribs persisted with HTTP 201  201 !== 422  |
| 87 | audit schema/reference: invalid emis rejected | NONPASSING | Invalid emis persisted with HTTP 201  201 !== 422  |
| 88 | audit export API: correct PIN exports own collections without credentials | PASS |  |
| 89 | audit export API: incorrect PIN cannot export | PASS |  |
| 90 | audit webhook: invalid signature cannot poison a later authentic delivery | NONPASSING | Authentic retry acknowledged but payment remains unprocessed after invalid first delivery + actual - expected  + 'created' - 'captured' |
| 91 | browser: real account form creates a durable server record | PASS |  |
| 92 | browser: a 503 create survives cloud refresh with a replayable payload | PASS |  |
| 93 | browser: sync review renders without overflow at desktop and mobile sizes | PASS |  |
| 94 | browser: actual browser process restart preserves IndexedDB payload | PASS |  |
| 95 | browser: two-tab reconnect drains queue and persists exactly one server row | PASS |  |
| 96 | browser: validation rejection opens actionable sync review | PASS |  |
| 97 | browser: pending-change download contains the recoverable rejected payload | PASS |  |
| 98 | browser: confirmed server-version resolution clears a rejected queue item | PASS |  |
| 99 | browser: no uncaught application errors during durability workflows | PASS |  |
| 100 | audit UI: / loads at 1440px | PASS |  |
| 101 | audit UI: /transactions loads at 1440px | PASS |  |
| 102 | audit UI: /income loads at 1440px | PASS |  |
| 103 | audit UI: /expenses loads at 1440px | PASS |  |
| 104 | audit UI: /categories loads at 1440px | PASS |  |
| 105 | audit UI: /budgets loads at 1440px | PASS |  |
| 106 | audit UI: /goals loads at 1440px | PASS |  |
| 107 | audit UI: /accounts loads at 1440px | PASS |  |
| 108 | audit UI: /cards loads at 1440px | PASS |  |
| 109 | audit UI: /loans loads at 1440px | PASS |  |
| 110 | audit UI: /udhari loads at 1440px | PASS |  |
| 111 | audit UI: /savings loads at 1440px | PASS |  |
| 112 | audit UI: /reports loads at 1440px | PASS |  |
| 113 | audit UI: /suggestions loads at 1440px | PASS |  |
| 114 | audit UI: /export loads at 1440px | PASS |  |
| 115 | audit UI: /import loads at 1440px | PASS |  |
| 116 | audit UI: /bills loads at 1440px | PASS |  |
| 117 | audit UI: /reconciliation loads at 1440px | PASS |  |
| 118 | audit UI: /household loads at 1440px | PASS |  |
| 119 | audit UI: /alerts loads at 1440px | PASS |  |
| 120 | audit UI: /settings loads at 1440px | PASS |  |
| 121 | audit UI: /profile loads at 1440px | PASS |  |
| 122 | audit UI: /audit loads at 1440px | PASS |  |
| 123 | audit UI: /subscription loads at 1440px | PASS |  |
| 124 | audit UI: / loads at 768px | PASS |  |
| 125 | audit UI: /transactions loads at 768px | PASS |  |
| 126 | audit UI: /income loads at 768px | PASS |  |
| 127 | audit UI: /expenses loads at 768px | PASS |  |
| 128 | audit UI: /categories loads at 768px | PASS |  |
| 129 | audit UI: /budgets loads at 768px | PASS |  |
| 130 | audit UI: /goals loads at 768px | PASS |  |
| 131 | audit UI: /accounts loads at 768px | PASS |  |
| 132 | audit UI: /cards loads at 768px | PASS |  |
| 133 | audit UI: /loans loads at 768px | PASS |  |
| 134 | audit UI: /udhari loads at 768px | PASS |  |
| 135 | audit UI: /savings loads at 768px | PASS |  |
| 136 | audit UI: /reports loads at 768px | PASS |  |
| 137 | audit UI: /suggestions loads at 768px | PASS |  |
| 138 | audit UI: /export loads at 768px | PASS |  |
| 139 | audit UI: /import loads at 768px | PASS |  |
| 140 | audit UI: /bills loads at 768px | PASS |  |
| 141 | audit UI: /reconciliation loads at 768px | PASS |  |
| 142 | audit UI: /household loads at 768px | PASS |  |
| 143 | audit UI: /alerts loads at 768px | PASS |  |
| 144 | audit UI: /settings loads at 768px | PASS |  |
| 145 | audit UI: /profile loads at 768px | PASS |  |
| 146 | audit UI: /audit loads at 768px | PASS |  |
| 147 | audit UI: /subscription loads at 768px | PASS |  |
| 148 | audit UI: / loads at 390px | PASS |  |
| 149 | audit UI: /transactions loads at 390px | PASS |  |
| 150 | audit UI: /income loads at 390px | PASS |  |
| 151 | audit UI: /expenses loads at 390px | PASS |  |
| 152 | audit UI: /categories loads at 390px | PASS |  |
| 153 | audit UI: /budgets loads at 390px | PASS |  |
| 154 | audit UI: /goals loads at 390px | PASS |  |
| 155 | audit UI: /accounts loads at 390px | PASS |  |
| 156 | audit UI: /cards loads at 390px | PASS |  |
| 157 | audit UI: /loans loads at 390px | PASS |  |
| 158 | audit UI: /udhari loads at 390px | PASS |  |
| 159 | audit UI: /savings loads at 390px | PASS |  |
| 160 | audit UI: /reports loads at 390px | PASS |  |
| 161 | audit UI: /suggestions loads at 390px | PASS |  |
| 162 | audit UI: /export loads at 390px | PASS |  |
| 163 | audit UI: /import loads at 390px | PASS |  |
| 164 | audit UI: /bills loads at 390px | PASS |  |
| 165 | audit UI: /reconciliation loads at 390px | PASS |  |
| 166 | audit UI: /household loads at 390px | PASS |  |
| 167 | audit UI: /alerts loads at 390px | PASS |  |
| 168 | audit UI: /settings loads at 390px | PASS |  |
| 169 | audit UI: /profile loads at 390px | PASS |  |
| 170 | audit UI: /audit loads at 390px | PASS |  |
| 171 | audit UI: /subscription loads at 390px | PASS |  |
| 172 | audit UI: / loads at 360px | PASS |  |
| 173 | audit UI: /transactions loads at 360px | PASS |  |
| 174 | audit UI: /income loads at 360px | PASS |  |
| 175 | audit UI: /expenses loads at 360px | PASS |  |
| 176 | audit UI: /categories loads at 360px | PASS |  |
| 177 | audit UI: /budgets loads at 360px | PASS |  |
| 178 | audit UI: /goals loads at 360px | PASS |  |
| 179 | audit UI: /accounts loads at 360px | PASS |  |
| 180 | audit UI: /cards loads at 360px | PASS |  |
| 181 | audit UI: /loans loads at 360px | PASS |  |
| 182 | audit UI: /udhari loads at 360px | PASS |  |
| 183 | audit UI: /savings loads at 360px | PASS |  |
| 184 | audit UI: /reports loads at 360px | PASS |  |
| 185 | audit UI: /suggestions loads at 360px | PASS |  |
| 186 | audit UI: /export loads at 360px | PASS |  |
| 187 | audit UI: /import loads at 360px | PASS |  |
| 188 | audit UI: /bills loads at 360px | PASS |  |
| 189 | audit UI: /reconciliation loads at 360px | PASS |  |
| 190 | audit UI: /household loads at 360px | PASS |  |
| 191 | audit UI: /alerts loads at 360px | PASS |  |
| 192 | audit UI: /settings loads at 360px | PASS |  |
| 193 | audit UI: /profile loads at 360px | PASS |  |
| 194 | audit UI: /audit loads at 360px | PASS |  |
| 195 | audit UI: /subscription loads at 360px | PASS |  |
| 196 | audit accessibility: account fields have programmatic names and Escape restores focus | NONPASSING | [{"tag":"INPUT","type":"text","placeholder":"HDFC Savings"},{"tag":"SELECT","type":"select-one","placeholder":null},{"tag":"INPUT","type":"text","placeholder":"HDFC Bank"},{"tag":"INPUT","type":"number","placeholder":null},{"tag":"INPUT","type":"color","placeholder":null}]  5 !== 0  |
| 197 | audit UI workflow: create account, persist reload and edit | PASS |  |
| 198 | audit reports: independent numeric and accounting export probes | NONPASSING | XLSX master Amount is a formatted string, not a numeric cell + actual - expected  + 'string' - 'number' |
| 199 | audit CA workbook: two active loans from same lender export without sheet collision | NONPASSING | Worksheet with name \|Amort_Same_Bank\| already exists! + actual - expected  + 'Worksheet with name \|Amort_Same_Bank\| already exists!' - null |
| 200 | audit reconciliation: missing external closing balance cannot be marked matched | NONPASSING | [{"accountId":"audit-bank","accountName":"Audit bank","openingBalancePaise":1000000,"inflowsPaise":0,"outflowsPaise":0,"calculatedClosingBalancePaise":1000000,"reportedClosingBalancePaise":1000000,"mismatchPaise":0,"status":"matched","possibleCauses":["legacy_rows_without_events"],"missingAccountTransactionIds":[],"deletedOrReversedTransactionIds":[],"legacyFallbackTransactionIds":["audit-dinner"]}] |
| 201 | audit profile backup: full snapshot contains all synced collections | NONPASSING | Full backup omits: alerts, assetValuations, attachments, auditLogs, cardEmiInstallments, cardEmiPlans, cardPaymentAllocations, cardStatements, creditLimitGroups, exportHistory, fixedIncomeAssets, householdMembers, householdPermissions, households, importSources, insurancePolicies, obligations, reconciliationMatches, sinkingFunds, snapshots, transferLinks  21 !== 0  |
| 202 | audit CSV: formula-like narration is neutralized in exported file | NONPASSING | Unescaped spreadsheet formula prefix: Description,Note =1+1,+1+1 |
| 203 | audit workbook download: generated file opens with expected master row | PASS |  |
| 204 | audit backup restore: linked account/category/transaction restored atomically | NONPASSING | Restore left 2/3 records; missing child means partial restore  2 !== 3  |
| 205 | audit profile wipe: deletes own profile data without reference-order failure | NONPASSING | page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response" |
| 206 | audit mobile navigation: Categories and Audit remain reachable through visible navigation | NONPASSING | expect(locator).toBeVisible() failed  Locator: getByRole('button', { name: 'Categories', exact: true }) Expected: visible Timeout: 5000ms Error: element(s) not found  Call log:   - Expect "to.be.visible" with timeout 5000ms   - waiting for getByRole('button', { name: 'Categories', exact: true })  |
| 207 | audit admin UI: /admin loads at 1440px | PASS |  |
| 208 | audit admin UI: /admin/users loads at 1440px | PASS |  |
| 209 | audit admin UI: /admin/plans loads at 1440px | PASS |  |
| 210 | audit admin UI: /admin/flags loads at 1440px | PASS |  |
| 211 | audit admin UI: /admin/branding loads at 1440px | PASS |  |
| 212 | audit admin UI: /admin/subscriptions loads at 1440px | PASS |  |
| 213 | audit admin UI: /admin loads at 390px | PASS |  |
| 214 | audit admin UI: /admin/users loads at 390px | PASS |  |
| 215 | audit admin UI: /admin/plans loads at 390px | PASS |  |
| 216 | audit admin UI: /admin/flags loads at 390px | PASS |  |
| 217 | audit admin UI: /admin/branding loads at 390px | PASS |  |
| 218 | audit admin UI: /admin/subscriptions loads at 390px | PASS |  |

## Module workflows

Source: [modules-final-verified/atomic-writes.json](modules-final-verified/atomic-writes.json)

| # | Assertion | Outcome | Failure detail |
|---|---|---|---|
| 1 | 24 identical concurrent retries produce one immutable receipt and record | PASS |  |
| 2 | 24 different payloads cannot share one mutation key | PASS |  |
| 3 | stale PATCH is rejected and retry returns the original committed result | PASS |  |
| 4 | invalid sync batch rolls back source, ledger and audit | PASS |  |
| 5 | malformed sync rows are rejected rather than silently skipped | PASS |  |
| 6 | stale sync cannot resurrect a soft-deleted record | PASS |  |
| 7 | nonexistent and foreign transaction references are rejected | PASS |  |
| 8 | same transaction ID in two tenants has isolated ledger effects | PASS |  |
| 9 | referenced account cannot be deleted | PASS |  |
| 10 | ledger failure rolls back entity, receipt and audit | PASS |  |
| 11 | batch PATCH rolls back its first row when a later row is missing | PASS |  |
| 12 | bulk hard-delete voids posted ledger and retains server audit | PASS |  |
| 13 | hard-delete tombstones prevent stale snapshot resurrection | PASS |  |
| 14 | mutation keys are isolated by user and bound to collection | PASS |  |
| 15 | sync validates a final parent graph independent of collection order | PASS |  |
| 16 | household viewer restrictions hold on batch, sync and bulk hard-delete | PASS |  |
| 17 | bulk import uses reference validation and retry-safe row writes | PASS |  |
| 18 | owner-bound reads and queued patches reject a changed authenticated user | PASS |  |
| 19 | browser: real account form creates a durable server record | PASS |  |
| 20 | browser: a 503 create survives cloud refresh with a replayable payload | PASS |  |
| 21 | browser: sync review renders without overflow at desktop and mobile sizes | PASS |  |
| 22 | browser: actual browser process restart preserves IndexedDB payload | PASS |  |
| 23 | browser: two-tab reconnect drains queue and persists exactly one server row | PASS |  |
| 24 | browser: validation rejection opens actionable sync review | PASS |  |
| 25 | browser: pending-change download contains the recoverable rejected payload | PASS |  |
| 26 | browser: confirmed server-version resolution clears a rejected queue item | PASS |  |
| 27 | browser: no uncaught application errors during durability workflows | PASS |  |
| 28 | module workflow: category creation survives reload | PASS |  |
| 29 | module workflow: monthly budget persists amount and category | PASS |  |
| 30 | module workflow: goal creation and a contribution persist together | PASS |  |
| 31 | module workflow: credit card creation retains limit and statement/due days | PASS |  |
| 32 | module workflow: new loan creates durable principal and twelve EMI rows | NONPASSING | expect(locator).toHaveCount(expected) failed  Locator:  getByRole('dialog') Expected: 0 Received: 1 Timeout:  5000ms  Call log:   - Expect "to.have.count" with timeout 5000ms   - waiting for getByRole('dialog')     9 × locator resolved to 1 element       - unexpected value "1"  |
| 33 | module workflow: Udhari receivable creation and partial settlement persist | PASS |  |
| 34 | module workflow: FD creation persists principal and dates | PASS |  |
| 35 | module workflow: insurance policy creation persists premium and coverage | PASS |  |
| 36 | module workflow: asset valuation persists as a valuation rather than income | PASS |  |
| 37 | module workflow: household and named partner survive reload | PASS |  |
| 38 | module workflow: settings save persists without page error | PASS |  |
| 39 | module workflow: populated mobile /cards renders at 390px | PASS |  |
| 40 | module workflow: populated mobile /loans renders at 390px | PASS |  |
| 41 | module workflow: populated mobile /udhari renders at 390px | PASS |  |
| 42 | module workflow: populated mobile /goals renders at 390px | PASS |  |
| 43 | module workflow: populated mobile /savings renders at 390px | PASS |  |
| 44 | module workflow: populated mobile /household renders at 390px | PASS |  |
| 45 | module workflow: clean profile wipe handles existing transaction references | NONPASSING | Profile wipe fails while deleting accounts before referenced transactions  409 !== 200  |

## Independent finance contracts

Source: [calculations/results.json](calculations/results.json)

| # | Assertion | Outcome | Failure detail |
|---|---|---|---|
| 1 | 10,000 integer-paise round trips remain exact | PASS |  |
| 2 | 10,000 mixed splits preserve total and nonnegative allocations | PASS |  |
| 3 | Contribution agrees across income, expense, account balance and category | PASS |  |
| 4 | Deleted original and return have no income/expense effect | PASS |  |
| 5 | Own-account transfer is neutral for consolidated cash and income/expense | PASS |  |
| 6 | CA net worth includes opening bank balance with no transactions | NONPASSING | {"assetsPaise":0,"liabilitiesPaise":0,"netWorthPaise":0}  0 !== 1000000  |
| 7 | CA net worth respects canonical receivable and payable fields | NONPASSING | {"assetsPaise":0,"liabilitiesPaise":0,"netWorthPaise":0}  0 !== 80000  |
| 8 | CA reconciliation does not invent an independent closing balance | NONPASSING | [{"accountId":"bank","accountName":"Audit bank","openingBalancePaise":1000000,"inflowsPaise":0,"outflowsPaise":0,"calculatedClosingBalancePaise":1000000,"reportedClosingBalancePaise":1000000,"mismatchPaise":0,"status":"matched","possibleCauses":["legacy_rows_without_events"],"missingAccountTransactionIds":[],"deletedOrReversedTransactionIds":[],"legacyFallbackTransactionIds":["expense"]}] |
| 9 | CA Udhari ageing uses canonical outstanding amount and given date | NONPASSING | [{"udhariId":"debt","counterparty":"Audit friend","direction":"given","outstandingPaise":0,"ageDays":0,"bucket":"0-7"}]  0 !== 80000  |
| 10 | CA income summary excludes a 200 contribution credit | NONPASSING | [{"Month":"2026-09","Income":200}]  200 !== 0  |
| 11 | CA income summary excludes an own-account transfer credit | NONPASSING | [{"Month":"2026-09","Income":400}]  400 !== 0  |
| 12 | CA expense summary includes card purchases even before a bank bill payment | NONPASSING | []  0 !== 400  |
| 13 | CA monthly cashflow excludes effects of a reversed source event | NONPASSING | [{"yyyymm":"2026-08","inflowsPaise":0,"outflowsPaise":40000,"netPaise":-40000}]  40000 !== 0  |
| 14 | September-filtered workbook cannot include August cashflow | NONPASSING | [{"Month":"2026-08","Expense":400,"Net":-400}] |
| 15 | Workbook allocates a 70/30 mixed expense into business and personal totals | NONPASSING | [{"Month":"2026-09","Business":0,"Personal":0,"Mixed":400}]  0 !== 280  |
| 16 | 50,000 real-engine transactions match an independent integer oracle | PASS |  |

## Unit Test Cases

Source: [Vitest JSON](commands/unit-details.json). These checks share application functions with higher-level suites; they are not additional user workflows.

| # | Assertion | Outcome | Source |
|---|---|---|---|
| 1 | aiGuardrails AI rephrase preserves exact numbers from deterministic inputs | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/aiGuardrails.test.ts |
| 2 | aiGuardrails AI rephrase rejects changed or invented numbers | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/aiGuardrails.test.ts |
| 3 | aiGuardrails AI guardrail blocks specific stock or mutual fund buy/sell advice | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/aiGuardrails.test.ts |
| 4 | aiGuardrails AI rewrite request includes only deterministic payload and guardrail instructions | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/aiGuardrails.test.ts |
| 5 | Phase 14 SaaS billing and Razorpay hardening migration enforces payment uniqueness and numeric quotas | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/billingPhase14Static.test.ts |
| 6 | Phase 14 SaaS billing and Razorpay hardening webhook validates signature, idempotency, order, owner, amount, and currency before activation | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/billingPhase14Static.test.ts |
| 7 | Phase 14 SaaS billing and Razorpay hardening subscription flow preserves early-renewal paid days and schedules downgrades | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/billingPhase14Static.test.ts |
| 8 | Phase 14 SaaS billing and Razorpay hardening quota helper returns all numeric quotas for the active plan, not just one joined row | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/billingPhase14Static.test.ts |
| 9 | Phase 12 CA reports and micro-business mode contribution returns reduce personal report and exported cost summaries without income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 10 | Phase 12 CA reports and micro-business mode builds transaction master rows with CA audit, tax/GST, split, and ledger references | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 11 | Phase 12 CA reports and micro-business mode reports GST/tax rows missing bills | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 12 | Phase 12 CA reports and micro-business mode keeps business, personal, and mixed expense reports separated | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 13 | Phase 12 CA reports and micro-business mode keeps credit-card purchase in expense/card ledger and card payment out of expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 14 | Phase 12 CA reports and micro-business mode reports EMI interest separately and principal as loan reduction, not expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 15 | Phase 12 CA reports and micro-business mode puts udhari given into receivable summary | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 16 | Phase 12 CA reports and micro-business mode reconciles account opening plus ledger inflows/outflows to closing balance | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 17 | Phase 12 CA reports and micro-business mode summarizes cards, loans, and udhari debt plus receivable/payable | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 18 | Phase 12 CA reports and micro-business mode builds the full CA report bundle with all required report sections and footer | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 19 | Phase 12 CA reports and micro-business mode exports CA workbook with reconciliation and export footer sheets | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts |
| 20 | categoryColorEngine assigns distinct chart colors including Others bucket | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/categoryColorEngine.test.ts |
| 21 | categoryColorEngine detects duplicate colors among active categories | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/categoryColorEngine.test.ts |
| 22 | categoryColorEngine suggestNextCategoryColor avoids used swatches | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/categoryColorEngine.test.ts |
| 23 | categoryColorEngine keeps income and expense palettes separate | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/categoryColorEngine.test.ts |
| 24 | categoryColorEngine exposes separate module colors | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/categoryColorEngine.test.ts |
| 25 | categoryColorEngine hides deleted and archived categories from chart slices | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/categoryColorEngine.test.ts |
| 26 | durable financial outbox stores the full payload atomically and survives an empty server refresh | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 27 | durable financial outbox replays after database close/reopen with the same mutation key | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 28 | durable financial outbox does not misreport HTTP 401 as synchronized | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 29 | durable financial outbox does not misreport HTTP 403 as synchronized | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 30 | durable financial outbox does not misreport HTTP 422 as synchronized | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 31 | durable financial outbox preserves a conflict for explicit review without overwriting its local intent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 32 | durable financial outbox replays edit and delete in order with their original expected versions | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 33 | durable financial outbox does not erase a newly acknowledged create when an older GET completes | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 34 | durable financial outbox does not overwrite a newer acknowledged edit with an older GET | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 35 | durable financial outbox never drains a different user's queue | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 36 | durable financial outbox rolls back the queue if the local entity cannot be stored | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 37 | durable financial outbox keeps an acknowledged request retryable if the local acknowledgement transaction fails | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 38 | durable financial outbox protects legacy pending records and does not guess how to replay them | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 39 | durable financial outbox explicit conflict resolution restores server state and removes the entity's queued chain | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 40 | durable financial outbox blocks permanent deletion while recoverable mutations exist | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 41 | durable financial outbox restores a pending projection if another user's cache used the same entity ID | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 42 | durable financial outbox does not return another user's pending local record after an account switch | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/durableOutbox.test.ts |
| 43 | shared expense contribution returns 400 paid and 200 returned gives zero income and 200 net expense in helpers and ledger | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 44 | shared expense contribution returns counts refunds together with contributions but omits deleted and foreign records | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 45 | shared expense contribution returns blocks invalid contribution {"amountPaise":40001} | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 46 | shared expense contribution returns blocks invalid contribution {"date":"2026-08-31"} | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 47 | shared expense contribution returns blocks invalid contribution {"linkedOriginalTransactionId":"missing"} | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 48 | shared expense contribution returns blocks invalid contribution {"categoryId":"salary"} | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 49 | shared expense contribution returns blocks invalid contribution {"businessOrPersonal":"business"} | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 50 | shared expense contribution returns blocks invalid contribution {"paymentMode":"credit_card"} | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 51 | shared expense contribution returns blocks invalid contribution {"type":"income"} | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 52 | shared expense contribution returns does not count reimbursement settlement as income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 53 | shared expense contribution returns category and fallback budget summaries use the same 200 net expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 54 | shared expense contribution returns recovery reports inherit cost dimensions while retaining actual credit date and amount | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 55 | shared expense contribution returns deleting a return restores the full expense and edit omits itself | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 56 | shared expense contribution returns never derives a negative business allocation from oversized personal split | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/expenseContributions.test.ts |
| 57 | financeCrossView CC purchase + bill payment: expense once; payment is cash only | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/financeCrossView.test.ts |
| 58 | financeCrossView self-transfer: zero P&L and zero net cash | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/financeCrossView.test.ts |
| 59 | Phase 13 import/export repair builds import preview with counts, duplicates, missing refs, and estimated effects | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/importExportRepair.test.ts |
| 60 | Phase 13 import/export repair creates import batch records and rollback plans | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/importExportRepair.test.ts |
| 61 | Phase 13 import/export repair builds repair queues for ledger gaps and legacy data | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/importExportRepair.test.ts |
| 62 | Phase 13 import/export repair builds full export payload with current user-owned rows only | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/importExportRepair.test.ts |
| 63 | Local combination matrix QA 'UPI expense': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 64 | Local combination matrix QA 'cash expense': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 65 | Local combination matrix QA 'debit card expense': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 66 | Local combination matrix QA 'auto debit expense': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 67 | Local combination matrix QA 'credit-card purchase': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 68 | Local combination matrix QA 'card bill payment': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 69 | Local combination matrix QA 'card refund': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 70 | Local combination matrix QA 'bank refund': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 71 | Local combination matrix QA 'salary income': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 72 | Local combination matrix QA 'EMI payment': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 73 | Local combination matrix QA 'loan prepayment': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 74 | Local combination matrix QA 'loan disbursement': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 75 | Local combination matrix QA 'udhari given': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 76 | Local combination matrix QA 'udhari received': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 77 | Local combination matrix QA 'udhari collect': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 78 | Local combination matrix QA 'udhari repay': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 79 | Local combination matrix QA 'udhari write-off': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 80 | Local combination matrix QA 'goal contribution': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 81 | Local combination matrix QA 'goal withdrawal': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 82 | Local combination matrix QA 'investment buy': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 83 | Local combination matrix QA 'investment sell': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 84 | Local combination matrix QA 'transfer': required fields, preview, and ledger effects are consistent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 85 | Local combination matrix QA blocks same-account transfer before ledger posting | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 86 | Local combination matrix QA deleted transactions produce no ledger event in every covered type | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts |
| 87 | Phase 1 - secrets sanitisation packages the committed placeholder template into an isolated artifact | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 88 | Phase 1 - secrets sanitisation refuses to package a populated secret: DB_PASS="fixture-secret" | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 89 | Phase 1 - secrets sanitisation refuses to package a populated secret: CLOUD_JWT_SECRET='fixture-secret' | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 90 | Phase 1 - secrets sanitisation refuses to package a populated secret: RAZORPAY_KEY_SECRET=fixture-secret | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 91 | Phase 1 - secrets sanitisation refuses to package a populated secret: RAZORPAY_WEBHOOK_SECRET=fixture-secret | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 92 | Phase 1 - secrets sanitisation refuses to package a populated secret: DATABASE_URL=mysql://user:fixture-secret@localhost/db | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 93 | Phase 1 - secrets sanitisation .env.host.example exists and is placeholder-only | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 94 | Phase 1 - secrets sanitisation production boot guard uses known-bad hashes, not raw secret literals | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 95 | Phase 1 - .htaccess hardening forces HTTPS and sets required security headers | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 96 | Phase 1 - .htaccess hardening denies env files, protected folders, source maps, and raw dumps | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 97 | Phase 1 - JWT and browser token storage frontend no longer writes JWTs to localStorage | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 98 | Phase 1 - JWT and browser token storage JWT verifier pins HS256 and validates standard claims | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 99 | Phase 1 - PIN policy blocks common and date-like PINs, and requires 6 digits in production | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 100 | Phase 1 - webhook controller enforces ownership and amount locks and validates Razorpay payments before subscription updates | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 101 | Phase 1 - webhook controller enforces ownership and amount update clauses include user_id guard and conflict audit paths | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 102 | Phase 1 - data export and account delete endpoints are method-restricted | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 103 | Phase 1 - data export and account delete controller requires PIN, filters by user, audits, and clears auth cookie on delete | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 104 | Phase 1 - migration and seed safety reset_admin_pin is production guarded and uses random salt | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 105 | Phase 1 - migration and seed safety forward and rollback migrations exist | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts |
| 106 | Phase 2 sync contract registry keeps generated JSON in sync with the TypeScript contract source | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 107 | Phase 2 sync contract registry covers every required domain collection with explicit Dexie and server names | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 108 | Phase 2 sync contract registry makes frontend cloud keys and PHP allowlist derive from the same generated contract | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 109 | Phase 2 sync contract registry keeps Dexie store names mapped for every synced collection | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 110 | Phase 2 sync contract registry declares and extracts the required transaction hot fields | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 111 | Phase 2 database/schema drift has every Phase 2 required table in SPAROWVAULT_FULL_DATABASE.sql | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 112 | Phase 2 database/schema drift has every PHP-referenced table in the full database schema | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 113 | Phase 2 database/schema drift has required report/sync indexes in the full database schema | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 114 | Phase 2 database/schema drift keeps phase migrations statically idempotent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts |
| 115 | Phase 3 PHP money parser rounds legacy rupee float-dust explicitly to paise | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-03-money-contract.test.ts |
| 116 | Phase 3 PHP money parser rejects import money with too many decimals unless rounding is enabled | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-03-money-contract.test.ts |
| 117 | Phase 3 PHP money parser keeps amountPaise as source of truth for hot-field extraction | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-03-money-contract.test.ts |
| 118 | Phase 3 PHP money parser extracts amount_paise for a new sync transaction row | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-03-money-contract.test.ts |
| 119 | Phase 3 PHP money parser keeps transaction form writes on amountPaise | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-03-money-contract.test.ts |
| 120 | Phase 3 PHP money parser converts Razorpay plan amount 799 INR to 79900 paise | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-03-money-contract.test.ts |
| 121 | Phase 15 privacy, audit, retention, support access requires Terms and Privacy acceptance at registration and stores versions | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/privacyPhase15Static.test.ts |
| 122 | Phase 15 privacy, audit, retention, support access login returns outstanding policy versions and audits login outcomes | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/privacyPhase15Static.test.ts |
| 123 | Phase 15 privacy, audit, retention, support access account export and deletion require PIN, audit, and expose retention schedule | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/privacyPhase15Static.test.ts |
| 124 | Phase 15 privacy, audit, retention, support access schema includes the audit_logs table used by audit_log_action | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/privacyPhase15Static.test.ts |
| 125 | Phase 15 privacy, audit, retention, support access retention sweeper covers required privacy schedules | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/privacyPhase15Static.test.ts |
| 126 | Phase 15 privacy, audit, retention, support access support access and PII policy document exists with consent, masking, and encryption plan | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/privacyPhase15Static.test.ts |
| 127 | vitest harness smoke runs | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/smoke.test.ts |
| 128 | vitest harness smoke can import @/ alias | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/smoke.test.ts |
| 129 | strict statement normalization parses integer money 1,23,456.78 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 130 | strict statement normalization parses integer money 123,456.78 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 131 | strict statement normalization parses integer money 0.01 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 132 | strict statement normalization parses integer money Rs. 1,000.5 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 133 | strict statement normalization parses integer money 1.00 CR | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 134 | strict statement normalization rejects ambiguous money 1,2,3.45 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 135 | strict statement normalization rejects ambiguous money 1O0.00 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 136 | strict statement normalization rejects ambiguous money 1.234 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 137 | strict statement normalization rejects ambiguous money 1e3 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 138 | strict statement normalization rejects ambiguous money NaN | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 139 | strict statement normalization rejects ambiguous money Infinity | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 140 | strict statement normalization rejects ambiguous money -10.00 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 141 | strict statement normalization rejects ambiguous money 10.00 DR | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 142 | strict statement normalization rejects ambiguous money 10000000001.00 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 143 | strict statement normalization rejects ambiguous money 1 000.00 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 144 | strict statement normalization rejects ambiguous money 1,000,00 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 145 | strict statement normalization handles negative running balances only in signed fields | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 146 | strict statement normalization checks actual calendar date 29/02/2024 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 147 | strict statement normalization checks actual calendar date 01-08-26 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 148 | strict statement normalization checks actual calendar date 02 Aug 2026 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 149 | strict statement normalization checks actual calendar date 2026-08-01 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 150 | strict statement normalization checks actual calendar date 31/02/2026 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 151 | strict statement normalization checks actual calendar date 2026-02-29 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 152 | strict statement normalization checks actual calendar date 08/31/2026 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 153 | statement layout extraction distinguishes overlapping bank names: State Bank of India | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 154 | statement layout extraction distinguishes overlapping bank names: Central Bank of India | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 155 | statement layout extraction distinguishes overlapping bank names: Union Bank of India | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 156 | statement layout extraction distinguishes overlapping bank names: Bank of India | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 157 | statement layout extraction distinguishes overlapping bank names: South Indian Bank | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 158 | statement layout extraction distinguishes overlapping bank names: Indian Bank | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 159 | statement layout extraction does not suppress a separate bank heading when names overlap | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 160 | statement layout extraction extracts synthetic HDFC Bank headings without collapsing debit/credit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 161 | statement layout extraction extracts synthetic Kotak Mahindra Bank headings without collapsing debit/credit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 162 | statement layout extraction extracts synthetic State Bank of India headings without collapsing debit/credit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 163 | statement layout extraction extracts synthetic IndusInd Bank headings without collapsing debit/credit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 164 | statement layout extraction extracts synthetic Axis Bank headings without collapsing debit/credit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 165 | statement layout extraction does not detect another bank from a transaction narration | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 166 | statement layout extraction does not treat balance words in a transaction narration as statement metadata | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 167 | statement layout extraction blocks bank mismatch and non-INR/credit-card headings | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 168 | statement layout extraction blocks empty/scanned pages instead of accepting the other pages | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 169 | statement layout extraction retains wrapped narration and flags unassigned monetary lines | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 170 | statement layout extraction retains invalid dates/ambiguous amounts as blocking row issues | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 171 | statement layout extraction does not claim first-row opening balance is independently verified | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 172 | statement layout extraction validates every running balance, not only final net totals | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 173 | statement layout extraction detects reverse chronological order | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 174 | statement layout extraction supports amount plus explicit Dr/Cr without guessing from narration | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 175 | review-first categorization suggests salary and food but never confirms purpose or personal/business scope | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 176 | review-first categorization unknown transfers are not guessed as income or expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 177 | review-first categorization rejects contradictory purpose, missing category and unreviewed rows | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 178 | review-first categorization flags possible existing transfers from either account without silently merging | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 179 | review-first categorization monthly credits and debits are distinct from reviewed income and expenses | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 180 | Kotak numbered account statement regression separates a reader-joined date/narration item using the known date column | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 181 | Kotak numbered account statement regression extracts Dr/Cr columns, table opening, separate summary and headerless continuation | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 182 | Kotak numbered account statement regression does not mistake continuation-page payee bank names for the issuer | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 183 | Kotak numbered account statement regression blocks missing page markers even with balanced rows | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 184 | Kotak numbered account statement regression blocks repeated page markers even with balanced rows | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 185 | Kotak numbered account statement regression blocks count page markers even with balanced rows | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 186 | Kotak numbered account statement regression blocks missing source transaction numbers even when monetary amounts offset | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 187 | Kotak numbered account statement regression validates opening independent summary evidence | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 188 | Kotak numbered account statement regression validates closing independent summary evidence | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 189 | Kotak numbered account statement regression validates invalid independent summary evidence | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 190 | Kotak numbered account statement regression validates multiple independent summary evidence | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 191 | Kotak numbered account statement regression validates missing independent summary evidence | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 192 | Kotak numbered account statement regression does not carry column positions onto a differently sized continuation page | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/statementParser.test.ts |
| 193 | suggestion AI explain guardrails sends only safe deterministic context to the rewrite endpoint | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionAiExplain.test.ts |
| 194 | suggestion AI explain guardrails rejects rewrites that invent new numbers | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionAiExplain.test.ts |
| 195 | suggestion AI explain guardrails rejects regulated product advice | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionAiExplain.test.ts |
| 196 | suggestion AI explain guardrails rejects loan and credit-card product recommendations | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionAiExplain.test.ts |
| 197 | suggestionEngine stableCalculationJson is order-insensitive | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 198 | suggestionEngine emits budget draft with reason and calculation_inputs_json | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 199 | suggestionEngine every generated draft satisfies the explainable source-of-truth contract | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 200 | suggestionEngine emits deterministic EMI overdue and partial pending suggestions | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 201 | suggestionEngine tracks suggestion history events without replacing prior audit trail | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 202 | suggestionEngine card utilization suggestion uses exact outstanding and limit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 203 | suggestionEngine loan suggestion uses exact principal, interest estimate, and prepayment values | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 204 | suggestionEngine cashflow suggestion uses safe daily spend from the survival engine | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 205 | suggestionEngine udhari suggestion uses person ledger amount and ageing | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 206 | suggestionEngine dismissed suggestions do not duplicate immediately, while expired suggestions can regenerate | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 207 | suggestionEngine AI suggestions cannot access another user's data | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts |
| 208 | syncOutbox durable badge state enqueues pending and counts for UI badge | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/syncOutbox.test.ts |
| 209 | syncOutbox durable badge state clears on synced | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/syncOutbox.test.ts |
| 210 | syncOutbox durable badge state keeps failed items for offline badge | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/syncOutbox.test.ts |
| 211 | vnextFinanceMigrationGolden light user: rebuild ledger twice → identical checksum | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/vnextFinanceMigrationGolden.test.ts |
| 212 | vnextFinanceMigrationGolden four-card user: card purchase checksum stable across rebuild | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/vnextFinanceMigrationGolden.test.ts |
| 213 | Acceptance T-134/135/139/140 T-134 self-transfer preserves assets and creates no P&L | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 214 | Acceptance T-134/135/139/140 T-135 cash withdrawal is transfer not expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 215 | Acceptance T-134/135/139/140 T-139 bank→FD is asset transfer not expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 216 | Acceptance T-134/135/139/140 T-140 household family transfer: consolidated income/expense zero | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 217 | T-156 received-money intent matrix 'salary_income' maps to distinct economics | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 218 | T-156 received-money intent matrix 'interest_dividend_income' maps to distinct economics | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 219 | T-156 received-money intent matrix 'transfer_from_own' maps to distinct economics | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 220 | T-156 received-money intent matrix 'purchase_refund' maps to distinct economics | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 221 | T-156 received-money intent matrix 'loan_received' maps to distinct economics | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 222 | T-156 received-money intent matrix 'udhari_repayment' maps to distinct economics | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 223 | T-156 received-money intent matrix 'investment_redemption' maps to distinct economics | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 224 | T-156 received-money intent matrix 'reimbursement' maps to distinct economics | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts |
| 225 | accountBalanceEngine matches deriveAccountBalance for mixed flows | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/accountBalanceEngine.test.ts |
| 226 | accountBalanceEngine does not reduce cash for credit-card expense on that account | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/accountBalanceEngine.test.ts |
| 227 | accountBalanceEngine classifies transfer in/out separately | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/accountBalanceEngine.test.ts |
| 228 | adaptiveModeEngine recommends essential for cash-heavy simple profiles | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/adaptiveModeEngine.test.ts |
| 229 | adaptiveModeEngine recommends family for multi-card households | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/adaptiveModeEngine.test.ts |
| 230 | adaptiveModeEngine computes safe daily spend from free cash | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/adaptiveModeEngine.test.ts |
| 231 | Phase 15 — business/personal split personal: 100% personal | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/businessPersonalSplit.test.ts |
| 232 | Phase 15 — business/personal split business: 100% business | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/businessPersonalSplit.test.ts |
| 233 | Phase 15 — business/personal split mixed default 50/50, exact integer total | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/businessPersonalSplit.test.ts |
| 234 | Phase 15 — business/personal split mixed honours custom splitBusinessPct | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/businessPersonalSplit.test.ts |
| 235 | Phase 15 — business/personal split mixed explicit paise split wins over percentage | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/businessPersonalSplit.test.ts |
| 236 | Phase 15 — business/personal split clamps splitBusinessPct out of range | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/businessPersonalSplit.test.ts |
| 237 | Phase 15 — business/personal split sumSplit aggregates correctly and ignores soft-deleted rows | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/businessPersonalSplit.test.ts |
| 238 | calculateEMI — characterization (principal in paise, result paise) returns 0 when principal is 0 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 239 | calculateEMI — characterization (principal in paise, result paise) returns 0 when tenure is 0 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 240 | calculateEMI — characterization (principal in paise, result paise) zero interest collapses to simple division | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 241 | calculateEMI — characterization (principal in paise, result paise) matches the textbook EMI formula for P=₹100000, r=12%, n=24 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 242 | calculateEMI — characterization (principal in paise, result paise) matches current engine EMI for P=₹500000, r=9%, n=60 (integer paise) | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 243 | savingsRate — characterization returns clamped 0 when income is 0 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 244 | savingsRate — characterization 50% income saved → 50% | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 245 | savingsRate — characterization over-saving clamps below 999% | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 246 | savingsRate — characterization over-spending clamps above -100% | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 247 | netMonthlySavings — characterization income minus expense minus emi minus cc_payment minus udhari_given | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 248 | netMonthlySavings — characterization savings_contribution and investment_contribution are NOT subtracted in netMonthlySavings (Phase 0 lock-in — see Phase-1 review) | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 249 | projectMonthEndSpend — characterization linear extrapolation: half a month in, half spent → projects ~2x | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 250 | projectMonthEndSpend — characterization day 1: spent equals projection × 1/days_in_month | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 251 | transaction classifiers — characterization income type is income; refund is not classified as income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 252 | transaction classifiers — characterization only 'expense' is isExpenseTx (NOT emi_payment / cc_payment) | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 253 | transaction classifiers — characterization cash inflow vs outflow | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 254 | sum helpers — characterization sumIncome sums only income types | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 255 | sum helpers — characterization sumExpense sums only pure 'expense' rows | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 256 | sum helpers — characterization sumByType(['emi_payment']) returns EMI total | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts |
| 257 | cardEmiEngine T-127 golden EMI schedule | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEmiEngine.test.ts |
| 258 | cardEmiEngine T-130 no-cost EMI splits principal evenly with zero interest | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEmiEngine.test.ts |
| 259 | cardEmiEngine createCardEmiPlanFromPurchase sets calculationVersion | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEmiEngine.test.ts |
| 260 | T-126 mobile purchase → EMI lifecycle counts purchase once; conversion restructures liability; payment is not expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEmiLifecycle.t126.test.ts |
| 261 | Card EMI edge cases T-128/T-130/T-131 T-130 no-cost EMI: net financing cost can still be non-zero after fees | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEmiLifecycle.t126.test.ts |
| 262 | Card EMI edge cases T-128/T-130/T-131 T-131 refund during EMI does not create income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEmiLifecycle.t126.test.ts |
| 263 | cardEngine calculateCardOutstanding sums liability effects | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 264 | cardEngine findOrphanCreditCardExpenses detects missing linkedCardId | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 265 | cardEngine calculateCardRisk flags over limit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 266 | cardEngine buildCreditCardIntel prefers effects over txn math when effects present | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 267 | cardEngine T-132 overpayment shows credit balance and zero outstanding | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 268 | cardEngine subtracts credit-card refunds from legacy outstanding and statement buckets | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 269 | cardEngine uses shadow outstanding only when effects are absent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 270 | cardEngine calculates pay-down amounts for utilization targets | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 271 | cardEngine buildCardRepairQueue detects missing links and setup gaps, skipping reviewed legacy rows | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts |
| 272 | cardRefundLifecycle.fullMatrix A: purchase → full refund before statement — no income, expense nets to 0 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts |
| 273 | cardRefundLifecycle.fullMatrix B: purchase → partial refund before statement | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts |
| 274 | cardRefundLifecycle.fullMatrix E: purchase → EMI conversion → full refund still does not create income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts |
| 275 | cardRefundLifecycle.fullMatrix C: purchase → statement date → refund before payment — no income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts |
| 276 | cardRefundLifecycle.fullMatrix D: purchase → payment → refund — expense nets; no income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts |
| 277 | cardRefundLifecycle.fullMatrix G: purchase → EMI → one installment paid → refund still not income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts |
| 278 | cardRefundLifecycle.fullMatrix I: soft-delete purchase removes economic event (cancel path) | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts |
| 279 | cashflowSurvivalEngine calculates safe daily spend after a card bill before salary | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cashflowSurvivalEngine.test.ts |
| 280 | local phase 6 debt QA contract requires limit, statement day, and due day for credit cards | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/debtQa.test.ts |
| 281 | local phase 6 debt QA contract keeps deleted cards out of active debt while allowing historical rows to remain in data | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/debtQa.test.ts |
| 282 | local phase 6 debt QA contract reports total debt, card debt, loan debt, udhari payable, EMI burden, and debt-to-income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/debtQa.test.ts |
| 283 | emergencyFundEngine recognizes essential categories | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/emergencyFundEngine.test.ts |
| 284 | emergencyFundEngine calculates emergency coverage and shortfall | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/emergencyFundEngine.test.ts |
| 285 | emiPrecisionPairwise every pairwise sample: sum principal = exact; final balance 0; no NaN | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/emiPrecisionPairwise.test.ts |
| 286 | eventReversal.golden expense soft-delete removes expense effect | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/eventReversal.golden.test.ts |
| 287 | eventReversal.golden transfer create then soft-delete → income/expense stay 0 both sides | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/eventReversal.golden.test.ts |
| 288 | eventReversal.golden card purchase soft-delete clears effects | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/eventReversal.golden.test.ts |
| 289 | eventReversal.golden refund of expense nets toward zero consumption | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/eventReversal.golden.test.ts |
| 290 | eventReversal.golden buildLedgerForTransaction returns empty for deleted | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/eventReversal.golden.test.ts |
| 291 | finance invariants self-transfer preserves net cash across accounts | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeInvariants.test.ts |
| 292 | finance invariants credit-card purchase never decreases bank cash | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeInvariants.test.ts |
| 293 | finance invariants cc_payment never creates expense effect | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeInvariants.test.ts |
| 294 | finance invariants loan disbursement never creates income effect | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeInvariants.test.ts |
| 295 | financeKpiEngine computes operating surplus from ledger income and consumption expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeKpiEngine.test.ts |
| 296 | financeKpiEngine bank refund reduces consumption expense, not true income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeKpiEngine.test.ts |
| 297 | financeSequenceFuzz seeded sequences length 50 keep finite paise and transfer Δincome/expense = 0 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeSequenceFuzz.test.ts |
| 298 | FCR-005 four-card isolation attributes spend only to the charged card; aggregates without contamination | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/fourCardIsolation.fcr005.test.ts |
| 299 | goalEngine calculates required savings pace for a target goal | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/goalEngine.test.ts |
| 300 | goalEngine uses only the requested MVP priority tiers | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/goalEngine.test.ts |
| 301 | goalEngine flags a critical goal behind schedule | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/goalEngine.test.ts |
| 302 | issuerSchedulePrecedence ranks issuer_actual above estimated and projected | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/issuerSchedulePrecedence.test.ts |
| 303 | issuerSchedulePrecedence FCR-010 / P0-H: actual billed EMI wins over SparowVault projection | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/issuerSchedulePrecedence.test.ts |
| 304 | issuerSchedulePrecedence user_confirmed beats estimate when no issuer actual | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/issuerSchedulePrecedence.test.ts |
| 305 | Phase 5 — ledger scenarios 1. Cash expense: account cash decreases, expense category increases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 306 | Phase 5 — ledger scenarios 2. Credit-card purchase: expense increases, card liability increases, bank unchanged | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 307 | Phase 5 — ledger scenarios 3. Credit-card bill payment: bank decreases, card liability decreases, no expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 308 | Phase 5 — ledger scenarios 3b. Credit-card refund: card liability decreases and expense category is reversed, no income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 309 | Phase 5 — ledger scenarios 3c. Bank/cash refund: account increases, expense category decreases, no income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 310 | Phase 5 — ledger scenarios 4. EMI payment: bank decreases full EMI, loan principal decreases principal-only, interest expense increases interest-only | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 311 | Phase 5 — ledger scenarios 4b. EMI payment: penalty and fee post as expense-category effects | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 312 | Phase 5 — ledger scenarios 4c. Loan disbursement: account cash increases and loan principal liability increases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 313 | Phase 5 — ledger scenarios 4d. Loan prepayment: account cash decreases and loan principal decreases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 314 | Phase 5 — ledger scenarios 5. Udhari given: account decreases, receivable increases, NO expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 315 | Phase 5 — ledger scenarios 6. Udhari received: account increases, payable increases, NO income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 316 | Phase 5 — ledger scenarios 7. Transfer: from-account decreases, to-account increases, no expense/income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 317 | Phase 5 — ledger scenarios 7b. Udhari settlement received: account increases, receivable decreases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 318 | Phase 5 — ledger scenarios 7c. Udhari settlement paid: account decreases, payable decreases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 319 | Phase 5 — ledger scenarios 7c-2. Udhari write-off: receivable decreases and bad-debt expense increases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 320 | Phase 5 — ledger scenarios 7d. Goal contribution: account decreases and goal asset increases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 321 | Phase 5 — ledger scenarios 7e. Goal withdrawal: goal asset decreases and account increases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 322 | Phase 5 — ledger scenarios 7f. Investment buy: account decreases and investment asset increases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 323 | Phase 5 — ledger scenarios 7g. Investment sell: investment asset decreases and account increases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 324 | Phase 5 — ledger scenarios 8. Income/refund: account increases, income category increases | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 325 | Phase 5 — ledger scenarios isDeleted=1 transactions produce no event | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts |
| 326 | loanEngine calculateEMIPaise returns integer paise | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 327 | loanEngine buildAmortizationSchedule ends with zero balance | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 328 | loanEngine splitPaymentPrincipalInterest allocates interest before principal | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 329 | loanEngine calculateOutstandingPrincipal subtracts paid principal components | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 330 | loanEngine partial EMI remains partial and reports pending risk | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 331 | loanEngine prepayment simulator returns reduce-tenure and reduce-EMI options | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 332 | loanEngine foreclosure breakdown includes principal, accrued interest, charges, and reminder | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 333 | loanEngine labels reducing balance and imported loan confidence | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 334 | loanEngine debt summary combines loans, cards, and udhari payable | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts |
| 335 | obligationEngine occurrenceKey is idempotent for same rule+date | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/obligationEngine.test.ts |
| 336 | obligationEngine mergeObligationsUnique never duplicates occurrenceKey | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/obligationEngine.test.ts |
| 337 | Phase 16 buildPersonaSignals computes monthly income and expense from the last 3 months | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 338 | Phase 16 inferPersona honors explicit user-selected persona | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 339 | Phase 16 inferPersona detects debt-heavy, cash-heavy, freelancer, small business, high net worth, student, and salaried | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 340 | Phase 16 ranking ranks topics by persona | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 341 | Phase 16 ranking reorders generic topic objects by persona priority | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 342 | Phase 16 ranking ranks persisted AiSuggestion rows directly | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 343 | Phase 16 ranking changes suggestion order when user persona changes | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 344 | Phase 16 AI guardrails blocks regulated or unsafe advice | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 345 | Phase 16 AI guardrails allows deterministic educational coaching language | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 346 | Phase 16 AI guardrails blocks invented numbers when a deterministic number allowlist is supplied | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 347 | Phase 16 coach surfaces builds explainable top actions and plan surfaces from deterministic suggestions | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts |
| 348 | goalEngine maps priority to tier | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/phase10Engines.test.ts |
| 349 | goalEngine buildGoalIntel exposes weekly and daily required | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/phase10Engines.test.ts |
| 350 | emergencyFundEngine detects essential-ish category names | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/phase10Engines.test.ts |
| 351 | emergencyFundEngine buildEmergencyFundIntel returns non-negative months when no data | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/phase10Engines.test.ts |
| 352 | smartBudgetEngine extends budget status with burn fields | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/phase10Engines.test.ts |
| 353 | cashflowSurvivalEngine exposes core vs full disposable when udhari payable exists | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/phase10Engines.test.ts |
| 354 | Phase 14 — plan feature gate isFeatureUnlocked returns true only when feature is enabled | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/planFeatureGate.test.ts |
| 355 | Phase 14 — plan feature gate remainingQuota returns Infinity when no limit is set | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/planFeatureGate.test.ts |
| 356 | Phase 14 — plan feature gate remainingQuota counts down correctly | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/planFeatureGate.test.ts |
| 357 | Phase 14 — plan feature gate remainingQuota is 0 when feature is locked | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/planFeatureGate.test.ts |
| 358 | Phase 14 — plan feature gate lockReason is plan-status aware | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/planFeatureGate.test.ts |
| 359 | sharedLimitMatrix primary + add-on share one ₹2,00,000 facility | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/sharedLimitMatrix.test.ts |
| 360 | sharedLimitMatrix never sums individual shared limits as separate facilities | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/sharedLimitMatrix.test.ts |
| 361 | sharedLimitMatrix three cards sharing one limit group | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/sharedLimitMatrix.test.ts |
| 362 | sharedLimitMatrix closed/historical card still counted when included in members | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/sharedLimitMatrix.test.ts |
| 363 | sharedLimitMatrix credit balances (negative outstanding) do not inflate used limit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/sharedLimitMatrix.test.ts |
| 364 | smartBudgetEngine does not project day-1 rent as 30x monthly rent | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/smartBudgetEngine.test.ts |
| 365 | smartBudgetEngine separates planned and unplanned spend for budget explanations | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/smartBudgetEngine.test.ts |
| 366 | transactionFormRules requires account for expense + UPI | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 367 | transactionFormRules requires linked card for expense + credit_card, not account | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 368 | transactionFormRules requires linked card for credit-card refund, not receiving account | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 369 | transactionFormRules rejects transfer to same account | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 370 | transactionFormRules requires credit-card payment card and bank account | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 371 | transactionFormRules requires loan and account for EMI payment | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 372 | transactionFormRules requires loan and receiving account for loan disbursement | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 373 | transactionFormRules requires goal and source account for goal contribution | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 374 | transactionFormRules requires udhari settlement person and account | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 375 | transactionFormRules requires udhari person label | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts |
| 376 | transactionPreview previews UPI expense with account decrease and expense effect | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionPreview.test.ts |
| 377 | transactionPreview previews credit-card expense without bank movement | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionPreview.test.ts |
| 378 | transactionPreview previews card bill payment as liability reduction, not expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionPreview.test.ts |
| 379 | transactionPreview previews EMI principal/interest split and remaining principal | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionPreview.test.ts |
| 380 | transactionPreview previews udhari given and received without income/expense misunderstanding | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionPreview.test.ts |
| 381 | transactionPreview previews transfer with both balances and no income/expense | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionPreview.test.ts |
| 382 | transactionPreview previews loan disbursement and goal contribution | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionPreview.test.ts |
| 383 | vNext transfer & received-money (Phase C) T-134 self-transfer: zero net cash and no P&L | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transferReceivedMoney.test.ts |
| 384 | vNext transfer & received-money (Phase C) T-138 reimbursement settlement reduces receivable, not income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transferReceivedMoney.test.ts |
| 385 | vNext transfer & received-money (Phase C) investment sell with cost basis splits gain to income | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transferReceivedMoney.test.ts |
| 386 | udhariEngine calculates remaining amount in paise | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/udhariEngine.test.ts |
| 387 | udhariEngine groups person ledger with receivable, payable, net, phone hash, overdue, and risk | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/udhariEngine.test.ts |
| 388 | udhariEngine uses required ageing buckets: 0-7, 8-30, 31-90, 90+ | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/udhariEngine.test.ts |
| 389 | udhariEngine generates polite, firm, business, and Hinglish reminder templates | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/udhariEngine.test.ts |
| 390 | udhariEngine requires a write-off reason | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/udhariEngine.test.ts |
| 391 | Phase 3 — rupeesToPaise / paiseToRupees 403.99 → 40399 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 392 | Phase 3 — rupeesToPaise / paiseToRupees 0.01 rupees becomes 1 paise | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 393 | Phase 3 — rupeesToPaise / paiseToRupees 438.63 → 43863 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 394 | Phase 3 — rupeesToPaise / paiseToRupees normalizes the canonical 0.1 + 0.2 float bug | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 395 | Phase 3 — rupeesToPaise / paiseToRupees round-trips integer paise back to clean rupees | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 396 | Phase 3 — rupeesToPaise / paiseToRupees absorbs string input | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 397 | Phase 3 — assertValidPaise accepts non-negative integers within range | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 398 | Phase 3 — assertValidPaise rejects decimals, negatives, NaN, infinity | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 399 | Phase 3 — assertValidPaise rejects absurdly large values (>1e15) | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 400 | Phase 3 — formatMoney formats 40399 paise as ₹403.99 (no float trail) | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 401 | Phase 3 — formatMoney formats 43863 paise as ₹438.63 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 402 | Phase 3 — addMoney / subtractMoney are integer-only sums only valid integer paise | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 403 | Phase 3 — addMoney / subtractMoney are integer-only silently drops non-integer parts | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 404 | Phase 3 — addMoney / subtractMoney are integer-only subtractMoney works | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 405 | Phase 3 — safeParseMoneyInput tolerates user input strips ₹, Rs, INR, commas, and whitespace | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 406 | Phase 3 — safeParseMoneyInput tolerates user input normalizes legacy float-dust rupee payloads when rounding is explicit | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 407 | Phase 3 — safeParseMoneyInput tolerates user input rejects invalid import money when strict mode is requested | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 408 | Phase 3 — calculateEMI in paise textbook P=100000 r=12% n=24 → ~₹4707.35 in paise | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 409 | Phase 3 — calculateEMI in paise 0% interest → simple division | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
| 410 | Phase 3 — calculateEMI in paise 0 principal or 0 tenure → 0 | passed | /Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts |
