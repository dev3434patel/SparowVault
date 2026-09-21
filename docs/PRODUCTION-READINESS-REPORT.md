# Production Readiness Report

## Update - 11 September 2026

Current verdict remains **NO-GO** for production and unreviewed CA sharing. Read [the fresh report and release gates](FULL-PROJECT-AUDIT-2026-09-11.md#14-remaining-test-matrix-and-release-gates). Core integrity and session fixes now pass; backup/restore, reports, new loan creation and webhook retry remain blockers. Earlier findings below are historical.

11 September 2026 addendum: [latest implementation and fresh verification](EXPANSION-IMPLEMENTATION-STATUS.md) repairs a bounded subset of the historical findings below. Production remains NO-GO; the following original audit table is not a new post-repair test result.

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## Decision: NO-GO

Do not certify this version for production financial recordkeeping or as the requested SparowFinanceOS agency platform. The current build runs locally and has meaningful implemented personal-finance functionality, but confirmed loss/duplication/recovery/report/security failures block release. A passing build or historical certification document cannot override current reproducible evidence.

| Gate | Status | Reason |
| --- | --- | --- |
| Repository identity | Verified | origin is the supplied GitHub repository; live master ref equals local HEAD. Existing local modifications remain. |
| Build/type/syntax | Partial pass | Typecheck/build/PHP syntax pass; normal lint/unit gates fail. |
| Core API happy/negative cases | Partial pass | 65/65 core API assertions passed; custom durability/security probes fail. |
| Financial data integrity | BLOCKED | Lost offline data, duplicate mutations, stale resurrection, partial batches, orphan references/effects. |
| Backup / restore / wipe | BLOCKED | Incomplete full backup, broken restored links and incomplete wipe. |
| Authentication and authorization | BLOCKED | Recovery, revocation, forced rotation, throttle and household endpoint parity failures. |
| Reports / CA exports | BLOCKED | Period/field/reversal/allocation/reconciliation and workbook defects. |
| Agency feature scope | NOT IMPLEMENTED IN FULL | Core client/project/invoice/quotation/approval/GST/partner/close/document workflows absent. |
| Mobile / accessibility | PARTIAL | 300 route/width observations; missing mobile routes and label defects; real-device/paid/populated states untested. |
| Dependencies | BLOCKED UNTIL TRIAGED | Reachable vulnerable spreadsheet parser plus development dependency advisories. |
| Live database migrations | PARTIAL | Isolated schema reset succeeds; historical migration/rollback/backup restore matrix not run. |
| Deployment security | UNVERIFIED | Source guards and .htaccess exist; actual public TLS/CSP/proxy/deny rules not validated. |
| Payments and notifications | UNVERIFIED | Synthetic webhook ownership tests pass; real provider lifecycle and message delivery untested. |
| Monitoring / recovery | UNVERIFIED | Scripts/docs exist; no production alert delivery, recovery-time or recovery-point drill. |
| Performance | UNVERIFIED FOR PRODUCTION | Build size and pure-function timings measured; not end-to-end load or memory certification. |

## Deployment observations

The current scripts use PHP localhost:8080 with Vite localhost:5173 and MariaDB from XAMPP. XAMPP status reported Apache and ProFTPD running. Its MySQL PID status could not be read because of permissions and printed not running; the actual application health check returned database status ok. Treat the direct connection result as proof of availability, not the unreliable PID-file message. No privilege escalation or service restart was performed for the audit.

No production deployment URL was verified. README documents localhost endpoints. Existing hosting packaging allowlists dist/api/php/contracts/.htaccess and deployment templates; source maps and many secrets/artifacts are filtered. The packager was reviewed but not rerun against the existing release directory, and no artifact was uploaded. The `.env.host.example` copy branch returns before the fallback secret regex checks, so template hygiene still needs an artifact-level secret test. This is a review risk, not proof of a leaked secret.

Account deletion soft-disables the user, clears credential material and cancels active subscriptions while retaining financial/billing records. That is distinct from a hard data wipe. A hard_delete_after audit field does not prove a scheduled purge job runs. Verify documented retention and deletion jobs before making privacy guarantees.

## Release sequence

1. Freeze real-data onboarding and take independently verified database backups before remediation. Do not rely only on the current full-profile JSON backup.
2. Fix shared write durability and financial relationship validation with deterministic failing regressions first.
3. Fix recovery/session/authorization and all-contract backup/restore/wipe behavior.
4. Consolidate report definitions and make all exported files self-consistent and parse-verified.
5. Repair portable quality gates and dependency exposure; repeat all affected tests and document residual risks.
6. Stage the exact allowlisted artifact; verify migration/rollback, TLS/headers/proxy trust, source/secret denial, provider sandbox flows and monitoring.
7. Implement agency features only after an agreed organization/role/ledger specification; obtain accountant review of tax/close/payout golden cases.
8. Approve production only with evidence for every required gate, not a promise of perfection.

## Improvement Roadmap

Effort is a relative engineering size, not a delivery-time promise. P0 blocks safe foundations; P1 completes core agency/product/operations capability; P2 adds assistance after reliable records.

| ID | Feature | Priority | Effort | Impact |
| --- | --- | --- | --- | --- |
| R01 | Reliable financial writes | P0 | Large | Protects all financial data |
| R02 | Account security and session devices | P0 | Medium-large | Reduces account takeover and access-control risk |
| R03 | Verified backup, restore and wipe | P0 | Large | Prevents misleading recovery and privacy guarantees |
| R04 | Canonical reports and CA pack validation | P0 | Medium-large | Makes numbers and exports explainable |
| R05 | Portable release gates and dependency maintenance | P0 | Medium | Makes later changes measurable |
| R06 | Agency organization and role foundation | P1 | Large | Prerequisite for agency workflows |
| R07 | Clients, vendors and receivable recovery | P1 | Large | Improves cash collection and vendor payment control |
| R08 | Quotation packages and controlled conversion | P1 | Large | Reduces scope and pricing disputes |
| R09 | Invoices, milestones, retainers and renewals | P1 | Very large | Enables agency revenue operations |
| R10 | Cash versus accrual and GST reserve | P1 | Large | Avoids distributing cash needed for obligations |
| R11 | Expense approvals, project margins and budget burn | P1 | Large | Improves expense control and project profitability |
| R12 | Partner snapshots and payout eligibility | P1 | Large | Prevents over-distribution and retroactive share drift |
| R13 | Monthly close and immutable audit | P1 | Large | Creates accountable accounting periods |
| R14 | CA filing readiness and document bundle | P1 | Large | Reduces accountant cleanup and missing evidence |
| R15 | Complete mobile navigation and accessible operations | P1 | Medium | Broad usability and accessibility improvement |
| R16 | Read-only finance AI with evidence | P2 | Medium-large | Useful assistance after the ledger is trustworthy |
| R17 | Production operations and large-data performance | P1 | Medium-large | Reduces outage and incident recovery risk |

### R01: Reliable financial writes

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Prevent lost or duplicate records before adding any agency feature. |
| User flow | Queue a write with stable ID; persist; reconcile/retry; resolve conflicts explicitly. |
| Required modules | Repositories, sync, ledger, audit |
| Required APIs | Versioned mutation API, atomic batch and replay endpoints |
| UI changes | Visible pending/rejected/conflict states |
| Security requirement | Tenant-scoped payload outbox; authorization on every replay |
| Testing requirement | B01-B05/B37 and cross-device concurrency suites |
| Priority | P0 |
| Effort | Large |
| Impact | Protects all financial data |

### R02: Account security and session devices

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Make PIN changes/recovery/logout mean what users expect. |
| User flow | Reauthenticate; change credential; rotate/revoke sessions; show device list and alerts. |
| Required modules | Auth, profile, admin |
| Required APIs | Session/revoke/recovery APIs and centralized CSRF |
| UI changes | Forced rotation screen, device list, optional 2FA flow |
| Security requirement | Account-based lockout, trusted proxies, strong recovery, recent-auth grants |
| Testing requirement | B06-B12, X01-X02, old-token/CSRF/throttle matrices |
| Priority | P0 |
| Effort | Medium-large |
| Impact | Reduces account takeover and access-control risk |

### R03: Verified backup, restore and wipe

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Make recovery and deletion trustworthy. |
| User flow | Preview manifest; validate graph; restore into isolated target; compare; approve wipe with clear retention scope. |
| Required modules | All contracts, import/export, files, audit |
| Required APIs | Full snapshot/restore job, encrypted download, complete wipe |
| UI changes | Counts per collection, omissions, checksums and restore/wipe status |
| Security requirement | Encrypted artifacts, reauthentication, retention and private downloads |
| Testing requirement | B15/B38/B39, all-collection round-trip and failure injection |
| Priority | P0 |
| Effort | Large |
| Impact | Prevents misleading recovery and privacy guarantees |

### R04: Canonical reports and CA pack validation

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Stop contradictory financial outputs. |
| User flow | Select period; build one immutable report context; preview totals/warnings; export verified workbook. |
| Required modules | Ledger, reports, export |
| Required APIs | Report snapshot/validation/export APIs if moved server-side |
| UI changes | Numeric cells, reliable download states, drilldowns and warning summaries |
| Security requirement | Read-only report scope, masked identifiers, optional watermark and export audit |
| Testing requirement | B16-B24; both export entry points; file integrity and date/property cases |
| Priority | P0 |
| Effort | Medium-large |
| Impact | Makes numbers and exports explainable |

### R05: Portable release gates and dependency maintenance

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Trust CI results and reduce exposed parser/tooling risk. |
| User flow | Fresh checkout; deterministic fixtures; run all layers; triage runtime/dev advisories. |
| Required modules | Testing, package/build/import |
| Required APIs | No new business API; isolated test runtime |
| UI changes | Clear failure diagnostics in developer tooling |
| Security requirement | No private-env fixture dependency; locked versions; input parse limits |
| Testing requirement | B25-B28; known-defect regression sensitivity; macOS/Linux/Windows |
| Priority | P0 |
| Effort | Medium |
| Impact | Makes later changes measurable |

### R06: Agency organization and role foundation

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Separate company data, employee scope and privileged duties. |
| User flow | Create organization; invite users; assign permission sets; restrict own/project/company scope. |
| Required modules | Organizations, users, projects, approvals |
| Required APIs | Membership/invitation/permission APIs |
| UI changes | Role-specific dashboards, permission-aware actions |
| Security requirement | Server-enforced nine-role capability matrix and maker-checker boundaries |
| Testing requirement | Cross-org IDOR and every method/role matrix |
| Priority | P1 |
| Effort | Large |
| Impact | Prerequisite for agency workflows |

### R07: Clients, vendors and receivable recovery

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Replace free-text parties with linked ledgers and collections workflows. |
| User flow | Maintain verified party records; track ageing; record follow-up; link proof and payment. |
| Required modules | Clients, vendors, projects, receivables, documents |
| Required APIs | Party CRUD, ledger, ageing, reminder and follow-up APIs |
| UI changes | Party drawers, saved filters, timeline, overdue queues |
| Security requirement | PII scope, contact consent, proof authorization |
| Testing requirement | Balance/ageing golden cases, duplicate parties and reminder idempotency |
| Priority | P1 |
| Effort | Large |
| Impact | Improves cash collection and vendor payment control |

### R08: Quotation packages and controlled conversion

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Preserve agreed scope/pricing before delivery. |
| User flow | Build Basic/Standard/Premium/Custom options; approve version; accept; convert to project/invoice. |
| Required modules | Clients, quotations, projects, documents |
| Required APIs | Versioned quotation, acceptance, conversion and document APIs |
| UI changes | Wizard, package comparison, scope/out-of-scope, milestones and validity |
| Security requirement | Immutable accepted snapshots and authorized acceptance |
| Testing requirement | All quotation fields, conversions, pricing and rendered PDF/DOCX |
| Priority | P1 |
| Effort | Large |
| Impact | Reduces scope and pricing disputes |

### R09: Invoices, milestones, retainers and renewals

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Support actual agency billing, not platform membership. |
| User flow | Configure contract; generate recurring/milestone/add-on invoice; track receipt; remind; renew AMC/support. |
| Required modules | Projects, invoices, receipts, contracts, subscriptions |
| Required APIs | Invoice numbering/posting, receipt allocation, recurring job and reminder APIs |
| UI changes | Invoice editor, client statement, renewal queue and scope-change workflow |
| Security requirement | Unique FY numbering, idempotent jobs, approved revisions/cancellations |
| Testing requirement | No/partial/overpayment, recurring duplicates, PDF/DOCX and lifecycle matrices |
| Priority | P1 |
| Effort | Very large |
| Impact | Enables agency revenue operations |

### R10: Cash versus accrual and GST reserve

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Separate revenue/profit from spendable company cash. |
| User flow | Post approved events; view accrual and cash panels; reserve tax; drill into each component. |
| Required modules | Ledger, invoices, expenses, tax, company accounts |
| Required APIs | Canonical journal/report/tax-reserve APIs |
| UI changes | Cash/accrual mode, GST pending and free-cash detail |
| Security requirement | Approved accounting policy, period scope, no arbitrary client totals |
| Testing requirement | Accountant-approved golden GST/rounding/cash versus accrual fixtures |
| Priority | P1 |
| Effort | Large |
| Impact | Avoids distributing cash needed for obligations |

### R11: Expense approvals, project margins and budget burn

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Connect agency cost controls to delivery performance. |
| User flow | Submit expense/proof; approve; pay; allocate cost center/project; alert on budget/margin risk. |
| Required modules | Expenses, vendors, projects, budgets, approvals |
| Required APIs | Expense transition/payment/allocation and anomaly APIs |
| UI changes | Approval queue, drilldowns, budget burn and margin warnings |
| Security requirement | No self-approval; amount thresholds; immutable posted revisions |
| Testing requirement | Draft/approve/reject/pay/reverse and closed-month cases |
| Priority | P1 |
| Effort | Large |
| Impact | Improves expense control and project profitability |

### R12: Partner snapshots and payout eligibility

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Make distributions traceable and cash-safe. |
| User flow | Approve period/project profit; snapshot shares/reserve; compute cash eligibility; approve/pay/reverse payout. |
| Required modules | Partners, profit, company cash, approvals, month close |
| Required APIs | Allocation snapshot and payout validation/posting APIs |
| UI changes | Partner payable/paid/pending and blocked-reason views |
| Security requirement | Dual control, immutable approved shares, proof and payout limits |
| Testing requirement | 50/50,60/40,3 partners, invalid shares, inactive partner, overpay and cash shortage |
| Priority | P1 |
| Effort | Large |
| Impact | Prevents over-distribution and retroactive share drift |

### R13: Monthly close and immutable audit

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Freeze reviewed books and explain every later change. |
| User flow | Resolve checklist exceptions; reconcile; approve close; reopen with reason and authorization. |
| Required modules | Ledger, approvals, audit, reports |
| Required APIs | Period close/reopen, snapshot and read-only audit APIs |
| UI changes | Close checklist, timeline, exception queue and hash/provenance indicators |
| Security requirement | Append-only server logs; independent retention; no client-forged audit |
| Testing requirement | Closed-month rejection, concurrent close/write, reopen audit and tamper detection |
| Priority | P1 |
| Effort | Large |
| Impact | Creates accountable accounting periods |

### R14: CA filing readiness and document bundle

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Produce an inspectable pack instead of a best-effort download. |
| User flow | Check invoice gaps, GSTIN/HSN-SAC/proofs; resolve warnings; approve pack; download sections/documents. |
| Required modules | GST, invoices, expenses, documents, CA exports |
| Required APIs | Validation/job/history/private download APIs |
| UI changes | Section selector, warnings, preview totals, ZIP manifest and filing-readiness score |
| Security requirement | Score reflects actual validated rules; authorized time-limited artifact access |
| Testing requirement | Missing-data checks, selected/all sections, manifest hashes and GST proof workflow |
| Priority | P1 |
| Effort | Large |
| Impact | Reduces accountant cleanup and missing evidence |

### R15: Complete mobile navigation and accessible operations

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Make repeated work possible on a small screen. |
| User flow | Use More/search; open exact record; edit by keyboard/touch; get clear error/focus feedback. |
| Required modules | Navigation, shared fields, dialogs, tables |
| Required APIs | Search API when data volume requires server indexing |
| UI changes | Mobile More menu, named icons, labels, saved filters and smart quick actions |
| Security requirement | Search returns only authorized data; export/action gates retained |
| Testing requirement | B29-B30; all viewports, VoiceOver, keyboard, zoom and long forms |
| Priority | P1 |
| Effort | Medium |
| Impact | Broad usability and accessibility improvement |

### R16: Read-only finance AI with evidence

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Explain verified numbers without letting generated text post money. |
| User flow | Ask a question; retrieve authorized report snapshot; return citations/calculation inputs; review suggested categorization. |
| Required modules | Reports, suggestions, expenses, projects, subscriptions, CA |
| Required APIs | Read-only scoped explanation and feedback API |
| UI changes | Monthly summary, category suggestions, payment-risk and subscription explanations |
| Security requirement | No autonomous postings; redact PII; prompt-injection resistance and model output validation |
| Testing requirement | Number preservation, unsupported claims, cross-tenant leakage, malicious documents and unavailable provider |
| Priority | P2 |
| Effort | Medium-large |
| Impact | Useful assistance after the ledger is trustworthy |

### R17: Production operations and large-data performance

| Required recommendation field | Plan |
| --- | --- |
| Why it helps SparowTech | Prove deployment, restore and supportability on real infrastructure. |
| User flow | Build allowlisted artifact; stage; run migration/restore and headers; measure; deploy with rollback. |
| Required modules | Hosting, database, monitoring, backups, UI |
| Required APIs | Health/readiness/metrics and bounded report jobs |
| UI changes | Paginated/virtualized large tables and deferred heavy routes |
| Security requirement | Least-privilege DB, TLS, secret rotation, private backups, alert routing |
| Testing requirement | B31-B32; migration/rollback, RPO/RTO, p95/p99, malicious file and provider outage |
| Priority | P1 |
| Effort | Medium-large |
| Impact | Reduces outage and incident recovery risk |

## Recommended next implementation prompt

> Implement only the P0 reliability fixes from docs/CURRENT-FULL-A-TO-Z-AUDIT-REPORT.md, beginning with B01-B05 and B37. Preserve existing local changes and real user data. Add failing regression tests first, use an isolated test database, make entity/effect/audit writes atomic and idempotent, implement a payload-bearing user-scoped outbox with conflict handling, and prove retry/offline/concurrency behavior. Do not build new agency modules, reset the real database, deploy or push until the fixes and test evidence are reviewed. Then proceed separately through authentication, backup/restore/wipe and report correctness findings.
