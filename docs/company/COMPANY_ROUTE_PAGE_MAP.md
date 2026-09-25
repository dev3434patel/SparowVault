# Company Route & Page Map

**Status:** Architecture (pre-implementation)  
**Base path:** `/company`  
**Shell:** Dedicated `src/company/AppShell.tsx` (separate from personal `AppShell`)  
**Routing style:** Match SparowVault path→page map (extend pattern; React Router optional later)

---

## 1. Auth & entry

| Path | Page | Notes |
|------|------|-------|
| `/company` | Gateway | If session missing → login; else resolve membership |
| `/company/login` | Company Login | Reuses SparowVault auth APIs; branded company entry |
| `/company/select` | Company Selector | List memberships; skip if exactly one ACTIVE |
| `/company/create` | Create Company | Owner creates workspace + seeds COA/roles |
| `/company/invite/accept` | Accept invite | Tokenized membership |

After selection, set `activeCompanyId` in company store; all subsequent routes require it.

Optional PIN gates (settings): Company PIN / Sensitive Action PIN for reopen, reverse, permission change, large adjustment, export.

---

## 2. Primary navigation (sidebar)

| Path | Nav label | Purpose |
|------|-----------|---------|
| `/company/app` | Dashboard | KPIs + quick actions + recent flow |
| `/company/app/parties` | Parties | Party list |
| `/company/app/parties/:id` | Party detail | Ledger, balances, bills, vouchers |
| `/company/app/ledgers` | Chart of Accounts | Groups + ledgers |
| `/company/app/vouchers` | Vouchers | Day book style list |
| `/company/app/vouchers/new` | New voucher | Accounting mode entry |
| `/company/app/vouchers/:id` | Voucher detail | View / reverse / attach |
| `/company/app/quick/received` | Money Received | Quick RECEIPT |
| `/company/app/quick/paid` | Money Paid | Quick PAYMENT |
| `/company/app/quick/transfer` | Transfer | CONTRA |
| `/company/app/quick/journal` | Journal | JOURNAL |
| `/company/app/receivables` | Receivables | AR + ageing |
| `/company/app/payables` | Payables | AP + ageing |
| `/company/app/reports` | Reports | Report hub |
| `/company/app/reports/:reportKey` | Report view | Filtered report + export |
| `/company/app/masters/business-units` | Business Units | Dimension |
| `/company/app/masters/areas` | Areas | Dimension |
| `/company/app/masters/projects` | Projects | Dimension |
| `/company/app/masters/cost-centres` | Cost Centres | Dimension |
| `/company/app/masters/categories` | Party Categories | Categories |
| `/company/app/search` | Search | Global search |
| `/company/app/users` | Users & Roles | Membership admin |
| `/company/app/settings` | Company Settings | Profile, FY, PIN, approvals |
| `/company/app/audit` | Audit Trail | Company audit |
| `/company/app/export` | Export / Backup | Packs & backups |

Deep links must preserve `company` context; never fall through to personal `/transactions`.

---

## 3. Dashboard composition

**Top KPIs**

- Cash & Bank
- Money Received Today / Money Paid Today
- Receivable / Payable
- Net Party Position
- Overdue Receivable / Overdue Payable

**Period toggles:** Today | This Month | This FY

**Quick buttons (large)**

- + Credit / Received — helper: “Money received into company”
- − Debit / Paid — helper: “Money paid by company”
- ↔ Transfer
- + Party
- + Voucher

**Recent flow**

Sections: Today | Yesterday | Last 7 Days  

Columns: Date | Party | Reason | Business | Category | Money In | Money Out | Running context

---

## 4. Quick entry screens

### Money Received (`/company/app/quick/received`)

Fields: Amount, Date, Received From, Received Into, Purpose, Business, Category, Project, Area, Reference, Note, Attachment → Effect Preview → Save.

### Money Paid (`/company/app/quick/paid`)

Same pattern; purpose list differs; **must ask “Why was this money paid?”** before save.

### Transfer

From ledger → To ledger; amount; note. No income/expense.

### Journal

Multi-line advanced editor with live Debit/Credit totals.

---

## 5. Party pages

List filters: category, role, tag, area, active, balance side, search.

Detail tabs:

1. Overview (plain-language balance + relationship breakdown)
2. Ledger / Statement
3. Bills / Outstanding
4. Vouchers
5. Dimensions split (business / project / area)
6. Documents / Notes

Statement period presets: Today, Yesterday, This Week, This Month, Previous Month, This Quarter, This FY, Previous FY, Custom.

---

## 6. Report hub routes

See `COMPANY_REPORT_MATRIX.md` for keys. Pattern:

```text
/company/app/reports/day-book
/company/app/reports/trial-balance
/company/app/reports/profit-loss
/company/app/reports/balance-sheet
...
```

Each report page: filter bar (combinable) + result + Export menu (PDF / DOCX / XLSX / CSV).

---

## 7. Personal app linkage (navigation only)

Personal sidebar may show a single entry **“Company Books”** → `/company` (feature-flagged).  
Company shell may show **“Personal Finance”** → `/` without sharing state stores.

No shared `dataStore` finance arrays.

---

## 8. Future host

`company.sparowvault.com` serves the same SPA with base path `/` remapped to company shell, or path-prefixed `/company` behind the host. Auth cookies must be carefully domain-scoped (`Domain=.sparowvault.com`) when enabling cross-subdomain SSO — separate security design note at SaaS launch.

---

## 9. Implementation note for SparowVault router

Today `pathToNav` defaults unknown paths to personal dashboard. Company paths **must** be intercepted in `App.tsx` / root before personal shell:

```text
if (pathname.startsWith("/company")) → CompanyApp
else if (pathname.startsWith("/admin")) → AdminApp
else → Personal AppShell
```

This is a hard UX isolation requirement.
