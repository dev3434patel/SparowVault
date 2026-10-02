# Final implementation verification

**Run:** SV-VERIFY-20260930-202241-b182d88604c9
**Commit:** 6395ec9a040652a39a45b72ac12136cdd382df33 on master
**finalConclusion:** LOCAL_REMEDIATION_REQUIRED
**productSourceModifiedDuringAudit:** false

Personal local-complete parents: **0** of 47.
Company local-complete parents: **0** of 36.

Mandatory local children: **27** pass, **6** fail, **0** blocked local, **299** not run.
External children blocked: **7**.

SV31 closure and the inventory Shipped labels were not treated as passes. The playbook, ALL_83_SURFACES.md, SURFACE_COMPLETION_MANIFEST.json, PHASE_DEPENDENCIES.json, SYNTHETIC_FINANCE_ACCEPTANCE.json, and the testing zip were not in the workspace.

## Why this conclusion

Reproduced defects move money or authority: the reimbursement bridge stores no payable (-750000 paise), a posted cheque reduces the bank immediately (-2500000 paise versus a deferred clear), and inventory value is not on the STOCK ledger (-10000 paise). The database reset guard does not refuse a URL whose name lacks `test`. Those are defects, not merely unexecuted checks.

Unexecuted local work is also recorded. Direct URL and form entry for the 83 parents was not driven in the owner's browser, because that browser session can reach the non-test database `sparowvault`. The 10 by 100 seed campaign and overlapping database concurrency were not run.

## What did match the independent paise

Personal IndexedDB `sparowvault_v1` through fake-indexeddb: a 200000 paise reservation left a 500000 paise bank balance unchanged; a 30000 paise transfer moved both accounts; a 250000 paise card purchase did not reduce the bank and a 100000 paise repayment was not a second expense; a 1200000 paise EMI schedule summed back to principal and did not insert another purchase; a 5000000 paise loan was cash and not income; a 40000 paise udhari was cash and not expense. All 64 alert preference combinations matched the six family switches in the preference function. Settings persistence of those switches was not executed.

Company PHP on `sparowvault_test_svverify_b182d886`: sale base 1000000 plus tax 180000 posted a receivable of 1180000; a 500000 receipt left 680000 open and the sales credit stayed 1000000. The first raw comparison stored sales net as debit-minus-credit, which is negative for a credit balance. The credit itself is 1000000 paise. Dimension splits of 60000 and 40000 summed to the 100000 line. Payroll accrual expense was 3180000 paise and the payment cleared 2600000 paise of payable without a second salary debit. A one-sided journal was rejected. A valid PIN did not grant reopen, opening balances, approval, or backup. Empty permissions and a foreign company were denied. The six report keys ran in PHP.

## Package

The existing `release/hosting-bundle.zip` was copied and extracted. `npm run build` and `npm run host:package` were not run, because prebuild deletes `dist` and the packager deletes `release/hosting-bundle`, both dirty untracked trees. php built-in server on port 8097 returned SPA HTML for `/` and `/company/app/invoices`, JavaScript for a page chunk and the PDF worker, and HTTP 500 from health because CLOUD_JWT_SECRET was absent. No private-key or live-payment patterns were found. 21 company vouchers copied into `sparowvault_test_svverify_b182d886_restore`. The owner schema was still present and was not reset.

## Gate poisoning

Dummy manifests are not app results. Missing evidence, a stale hash, zero tests, a failed mandatory requirement, and a blocked bank scope all failed. A complete local dummy passed. Checker honest: true.

## External scopes

Real 20-bank layouts, live Account Aggregator, live Razorpay, statutory filing, physical devices, and a hosted release stay BLOCKED_EXTERNAL or NOT_TESTED.
