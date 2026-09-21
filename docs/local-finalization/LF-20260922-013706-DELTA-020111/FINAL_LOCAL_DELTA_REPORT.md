# Final local delta report

**Parent:** LF-20260922-013706 (preserved, not overwritten)  
**Child:** LF-20260922-013706-DELTA-020111  
**Conclusion:** `LOCAL_REMEDIATION_REQUIRED`  
*(Parent’s `LOCAL_SOFTWARE_COMPLETE_WITH_EXTERNAL_EVIDENCE_GAPS` is **withdrawn** as premature relative to mandatory local evidence.)*

## Orthogonal status

```
localSoftwareStatus: INCOMPLETE
mandatoryLocalRequirementsComplete: false
classificationGuardrails: PASS
renderedReviewGeometry: PASS (Chromium DOM overlay oracle); firefox/webkit BLOCKED_CONFIG; StatementImportDialog PDF.js NOT_RUN
browserEngineCoverage: chromium PASS; firefox/webkit blocked
independentClientSync: PASS (isolation)
syncFaultRecovery: PARTIAL (true multi-worker race NOT_RUN)
monthlyGoalCardProductPaths: goal monetary PASS; monthly bank-vs-economic PASS; card PDF UI NOT_RUN
localProductionLikePackage: PASS_PHP_BUILTIN; Apache NOT_VERIFIED
localRestore: PASS (statement suite backup restore)
referenceStatus: PARTIAL_RECONCILED (unchanged)
bankLayoutsVerifiedForScope: 0
registeredOnlyLayouts: 15
blockedFor20BankClaim: true
physicalDeviceEvidence: NOT_TESTED
hostedRelease: NOT_TESTED
allRequestedEvidenceComplete: false
```

## Actual changes

1. **Classification safety (D1):** Direction-only cues no longer bind `kind`. Weak `suggestedKind` only; bulk confirm blocked; P&L ignores until reviewed.
2. **Digest (D3):** Live API cases for flip + month-shift with stale hash → `STALE_REVIEW_DIGEST`.
3. **Rendered overlay (D2):** Chromium DOM overlay vs independent oracle (0 FAIL); engines without browsers blocked.
4. **Package (D6):** Build + extract + PHP built-in serve of `release/hosting-bundle`; OCR WASM/workers present; Apache/.htaccess **not** verified; 3 SQL files flagged in package scan.
5. **Goal fixtures (D5):** Earmark/transfer paise outcomes asserted.

## Preserved passing behavior

Omit-pair 422, importSources, matches, card synthetic API, goal fundingMode validation, reviewDigest base case, disposable TEST_DB, `test:statements` exit 0, strict bank gate exit 1 with 0 verified layouts.

## Confirmed defects vs unverified requirements

| Confirmed / fixed | Unverified / remaining local |
|-------------------|------------------------------|
| Weak suggestion could bulk-approve (fixed) | Full PDF.js dialog rotation/scroll matrix |
| | Apache extracted-package CSP/MIME |
| | True overlapping PHP workers races |
| | Card wizard PDF UI path |

## Bank / device / host

Unchanged and honest: **0 verified-for-scope**, physical **NOT_TESTED**, hosted **NOT_TESTED**.
