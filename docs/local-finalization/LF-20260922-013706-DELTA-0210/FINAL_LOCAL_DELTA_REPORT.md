# Final local delta report

**Parent:** LF-20260922-013706 (preserved, not overwritten)  
**Child:** LF-20260922-013706-DELTA-0210  
**Prior child:** LF-20260922-013706-DELTA-020111  
**Conclusion:** `LOCAL_SOFTWARE_COMPLETE_WITH_EXTERNAL_EVIDENCE_GAPS`

## Orthogonal status

```
localSoftwareStatus: COMPLETE_LOCAL_MANDATORY
mandatoryLocalRequirementsComplete: true
classificationGuardrails: PASS (unchanged from DELTA-020111)
renderedReviewGeometry: PASS (Chromium DOM overlay + PDF.js viewport/zoom/page-switch/scroll)
browserEngineCoverage: chromium PASS; firefox/webkit NOT_RUN this delta
independentClientSync: PASS (prior delta)
syncFaultRecovery: PASS (6 overlapped imports → imported=1, duplicates=5, uniqueTx=1)
monthlyGoalCardProductPaths: goal monetary PASS (prior); card PDF UI→API PASS_UI_WIRED_AND_API
localProductionLikePackage: PASS_APACHE (.htaccess MIME/SQL deny/CSP path; concurrent 12×200)
packageSqlAllowlist: PASS_POLICY_DOCUMENTED (intentional operator SQL + HTTP deny)
localRestore: PASS (prior)
referenceStatus: PARTIAL_RECONCILED (unchanged)
bankLayoutsVerifiedForScope: 0
registeredOnlyLayouts: 15
blockedFor20BankClaim: true
physicalDeviceEvidence: NOT_TESTED
hostedRelease: NOT_TESTED
allRequestedEvidenceComplete: false
```

## Closed this delta (mandatory local)

1. **Card PDF product path:** `StatementImportDialog` destination selector + POST `/api/import/statement-card.php` with liability arithmetic; live API import verified.
2. **Apache extracted package:** project-local httpd FOREGROUND on loopback; `.mjs`/`.wasm` MIME; `*.sql` HTTP denied; concurrent package fetches OK.
3. **PDF.js rendered review:** Chromium + pdfjs-dist viewport overlay matrix (zoom × pages) + page-switch + nested scroll — 0 FAIL.
4. **Concurrency:** overlapping statement imports economically once (fingerprint/id).
5. **Package SQL allowlist:** documented intentional SQL in bundle; `.htaccess` deny verified under Apache.

## Still open (external / out of local scope)

| Item | Status |
|------|--------|
| F-BANK-20 / real issuer holdouts | BLOCKED — no invented banks |
| Physical multi-device soak | NOT_TESTED |
| Hosted Cloudflare/production deploy | NOT_TESTED |
| Firefox/WebKit browser engines | NOT_RUN this delta |

## Preserved

Parent LF-20260922-013706 and DELTA-020111 evidence directories untouched. Strict bank gate remains exit 1 with 0 verified layouts.
