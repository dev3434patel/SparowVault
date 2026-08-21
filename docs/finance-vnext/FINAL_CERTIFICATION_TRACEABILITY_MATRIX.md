# Final certification traceability matrix

| ID | Requirement | Engine | UI | API | Storage | Unit | Property | API E2E | Browser E2E | Migration | Security | Status |
|----|-------------|--------|----|-----|---------|------|----------|---------|-------------|-----------|----------|--------|
| FCR-001 | Ledger event/effect | financeEventBuilder | — | finance_events.php | SQL ledger | ledger.scenarios | — | — | — | — | — | PASS |
| FCR-002 | Paise money | money.ts | forms | money_paise.php | amountPaise | money + phase-03 | — | — | — | — | — | PASS |
| FCR-003/004 | CC purchase/payment | financeEventBuilder | Cards | sync | transactions | T-126, invariants | — | — | Cards | — | — | PASS |
| FCR-005 | Four-card isolation | cardEngine | Cards | — | cards | fourCardIsolation | — | — | finance vNext | — | — | PASS |
| FCR-006–009 | Card EMI lifecycle | cardEmiEngine | EMI dialog | cardEmi* sync | Dexie+CCR | T-126/127 | — | api-vnext plans | — | — | — | PASS |
| FCR-010 | Issuer > estimate | issuerSchedulePrecedence | DataConfidenceBadge | — | installment.source | issuerSchedulePrecedence.test | — | — | — | — | — | PASS |
| FCR-011/012 | Partial / credit bal | cardEngine/allocator | Cards | — | — | cardEngine.test | — | — | — | — | — | PASS |
| FCR-013/P0-F | Refund/EMI cancel | financeEventBuilder | — | — | — | cardRefundLifecycle.fullMatrix | — | — | — | — | — | PASS (core matrix) |
| FCR-014/015 | Transfer / cash | intent + ledger | QuickAdd | — | — | T-134/135 | — | — | — | — | — | PASS |
| FCR-016 | Received money | transactionIntent | QuickAdd | — | — | T-156 | — | — | — | — | — | PASS |
| FCR-017/018 | Loan | loanEngine | Loans | — | — | loanEngine.test | — | — | — | — | — | PASS |
| FCR-019 | Udhari | udhariEngine | Udhari | — | — | udhariEngine.test | — | — | — | — | — | PASS |
| FCR-020 | Bank→FD | ledger | WealthHub | fixedIncomeAssets | — | T-139 | — | api-vnext | finance vNext | — | — | PASS |
| FCR-021 | Obligations | obligationEngine | Bills | obligations | occurrenceKey | obligationEngine.test | — | api-vnext | finance vNext | — | — | PASS |
| FCR-024 | Household | household + PHP auth | HouseholdDashboard | households* | — | T-140 | — | api-vnext | finance vNext | — | household_auth | PASS |
| FCR-028/P0-D | Offline outbox | syncOutbox + baseRepo | SyncOutboxBadge | — | localStorage | syncOutbox.test | — | — | browser-offline-finance-e2e | — | — | PASS (harness) |
| FCR-P0-E | Mutation idempotency | — | — | mutation_idempotency.php | financial_mutation_keys | — | — | api-vnext mutationId | — | phase_vnext_02 | — | PASS |
| FCR-P0-A | Migration golden | financialChecksum | — | — | — | vnextFinanceMigrationGolden | — | — | — | finance:certify:migration LIVE | — | PASS |
| FCR-P0-G | Reversal matrix | soft-delete ledger | — | — | — | eventReversal.golden | — | — | — | — | — | PASS |
| FCR-SHARED | Shared credit limit | calculateSharedLimitAvailablePaise | — | creditLimitGroups | — | sharedLimitMatrix | — | — | — | — | — | PASS |
| FCR-EMI-P | EMI precision pairwise | cardEmiEngine | — | — | — | emiPrecisionPairwise | sequence fuzz | — | — | — | — | PASS |
| FCR-031 | KPI semantics | financeKpiEngine | Dashboard | — | — | financeKpiEngine.test | — | — | — | — | — | PASS |
| P1-C | 50k load | finance-load-test | — | — | — | — | synthetic loop | — | — | — | — | PASS (engine probe) |
| P1-D | Staging/backup/monitor | backup + restore drill | — | — | — | — | — | — | — | EVIDENCE_FINAL_BACKUP_RESTORE | — | PARTIAL (local PASS; staging OPEN) |
| P1-E | Manual a11y/responsive | — | — | — | — | — | — | — | — | MANUAL_QA.md | — | OPEN (template) |
| P2 | AI cloud sync | — | — | — | local Dexie | — | — | — | — | AI_SUGGESTIONS_MULTI_DEVICE_DECISION.md | — | N/A (device-local) |

Critical rule: every **PASS** row above has automated evidence path. Rows marked **OPEN/PARTIAL** block Level-2 production certification only.
