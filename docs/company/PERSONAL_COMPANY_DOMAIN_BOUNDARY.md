# Personal ↔ Company Domain Boundary

**Status:** Architecture (pre-implementation)  
**Absolute rule:** Do not mix personal finance data with company accounting data as one source of truth.

---

## 1. Same platform, separate domains

Allowed to share:

| Shared | Examples in SparowVault today |
|--------|-------------------------------|
| Global users | `users` |
| Auth primitives | JWT, `auth_sessions`, CSRF, PIN verify |
| Security helpers | rate limits, request IDs |
| Platform audit | `audit_logs` / admin audits (plus company-owned audit table) |
| Attachments framework | patterns only; company docs in `company_documents` |
| Notifications framework | when built — scoped payloads |
| Subscription framework | via **adapter** (org plans) |
| UI primitives | `src/components/ui/*` |
| Logging / DB connection | `db_conn()`, observability |
| Money utilities | paise helpers |

**Not shared as accounting SoT:**

| Personal | Company |
|----------|---------|
| Dexie/collections: `transactions`, `accounts`, `cards`, `loans`, `udhari`, … | `company_vouchers`, `company_voucher_lines`, … |
| `financial_events` / `financial_effects` | Company GL from voucher lines |
| `cloud_collection_rows` finance entities | Normalized `company_*` tables |
| Household model | Membership + RBAC |
| `businessOrPersonal` tag | Real COA + dimensions |

---

## 2. Forbidden patterns

```text
❌ transactions table with flag personal|company
❌ Reusing personal account balances as company cash
❌ Posting company vouchers into financial_events
❌ Reading company reports from personal KPI engines
❌ Treating udhari people as company parties without explicit migration import
❌ Auto-dual-write personal ↔ company on every txn
```

---

## 3. Mental model

```text
SparowVault Platform
├── Personal Finance Domain (existing)
│     user_id scoped
│     transaction → effects ledger
└── Company Accounting Domain (new)
      company_id scoped
      voucher → balanced lines → GL
```

A human may use both. Data planes remain independent.

---

## 4. Optional bridge (future, explicit)

### Personal → Company (“paid personally on behalf of company”)

1. User selects personal transaction and chooses **Charge to Company**.
2. System creates company JOURNAL/PAYMENT-equivalent:

```text
Expense/Asset Dr
   Owner/Employee Reimbursement Payable Cr
```

3. Stores `company_cross_domain_links` with personal collection + entity id.
4. Does **not** delete or rewrite the personal transaction unless user confirms a separate personal classification change.

### Company → Personal (owner drawing)

1. Company posts:

```text
Drawings Dr
   Bank Cr
```

2. Optional prompt: import as personal inflow.
3. Creates personal transaction only after confirmation + bridge link.

### Rules

- Always user-confirmed.
- Always auditable both sides.
- Never implicit sync jobs that mutate both domains.
- Bridge failures must not leave unbalanced company voucher (company commit first or single distributed saga with clear compensation — prefer company-first then personal optional).

---

## 5. Code boundary rules (engineering)

| Layer | Rule |
|-------|------|
| Frontend folders | `src/company/**` must not import personal repos/engines except `src/company/bridge/**` |
| Personal code | Must not import company posting services |
| PHP | `php/controllers/company/**` separate; no writing personal collections |
| SQL | Company migrations never alter personal finance table meanings |
| Stores | Separate Zustand stores; no shared `transactions[]` |
| Sync contracts | Do not add company vouchers to personal `syncContracts` collections |

Shared allowed imports: `money.ts`, UI kits, auth client, types that are truly generic.

---

## 6. UX boundary

- `/` personal shell vs `/company` company shell (see route map).
- Distinct branding emphasis: “Company Books” vs personal dashboard.
- Feature flag may hide company entry until enabled.

---

## 7. Data export / delete

| Action | Behaviour |
|--------|-----------|
| Personal account export | Personal collections only |
| Company backup | That `company_id` only |
| User account delete | Define policy: block if sole owner of ACTIVE company; or transfer ownership first |
| Company close | Soft-close workspace; retain audit per retention policy |

---

## 8. Mapping from existing “business” features

| Existing | Interpretation |
|----------|----------------|
| `businessOrPersonal` / `businessPersonalSplit.ts` | Personal tagging / CA-ish personal reports — **not** company books |
| Household | Family consolidation — **not** legal entity tenancy |
| Udhari | Informal personal credit — may **inspire** UX copy only |
| Loans / cards | Personal — not company GL |

Migration tooling may offer “import udhari person as company party” as a one-shot wizard copying **names/contacts**, not live-linking balances.

---

## 9. Review checklist before any PR merges

- [ ] New table has `company_id` (if company-owned)
- [ ] No personal collection write in company service
- [ ] Isolation tests added/updated
- [ ] Permissions server-enforced
- [ ] Docs updated if boundary exception introduced (bridge only)
