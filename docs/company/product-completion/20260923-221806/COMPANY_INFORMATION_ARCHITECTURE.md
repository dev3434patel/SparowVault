# Company Information Architecture

## Sidebar hierarchy (implemented)

### Overview
- Dashboard
- Activity / Day Book

### Money
- Money Received
- Money Paid
- Transfer
- Journal
- Cash & Bank

### Parties
- All Parties
- Receivables
- Payables

### Books
- Vouchers
- Chart of Accounts

### Business
- Business Units / Projects / Areas / Cost Centres / Categories

### Insights
- Reports
- Search

### Control
- Approvals
- Users & Roles
- Audit
- Export / Backup
- Settings

## Header context
Always shows company display name + FY label + signed-in user. Switch company bumps `contextEpoch` so dashboard/filters reset.

## Global + New
Permission-filtered menu: Received, Paid, Transfer, Journal, Party, Receivables, Vouchers.

## Mobile
Home · Parties · Add sheet · Bills · More sheet.
