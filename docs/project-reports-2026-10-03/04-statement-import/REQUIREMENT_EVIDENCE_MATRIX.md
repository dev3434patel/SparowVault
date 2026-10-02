# Requirement evidence matrix (local)

| Requirement | Evidence | Status |
|-------------|----------|--------|
| Dexie store count 41 | SCHEMA_AND_SYNC_INVENTORY.json | PASS |
| Privacy on-device PDF | PRIVACY_ARCHITECTURE_DECISION.md + API tests | PASS |
| Layout registry 20 targets | statement_layouts.json + layoutRegistry tests | PASS |
| Completeness ≠ net balance | statementIntelligence.v2.test.ts | PASS |
| March/April monthly counts | synthetic-acceptance + verifier tests | PASS |
| Bank credit ≠ income | reportEconomicMonth test | PASS |
| EMI narration ≠ P/I split | cardDocument tests | PASS |
| Draft without password | draft.ts + dialog Save draft | PASS |
| Goal earmark vs funded transfer | goalFunding.ts + unit tests | PASS |
| Page coverage map | buildPageCoverage + StatementAnalysis.pageCoverage | PASS |
| Match suggestions (no silent merge) | matching.ts + UI notice | PASS |
| BF/CF non-transaction rows | isNonTransactionNarration in parser | PASS |
| Real 20-bank layouts | CORPUS_MANIFEST realCorpusStatus | BLOCKED |
| Hosted release | — | NOT_TESTED |
