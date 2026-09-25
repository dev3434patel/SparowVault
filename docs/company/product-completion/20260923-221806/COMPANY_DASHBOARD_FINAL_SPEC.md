# Company Dashboard Final Spec

## Purpose
Answer position, change, attention, and next actions without decorative noise.

## Period controls
Today / Week / Month / Quarter / This FY — drive Money In/Out and P&L widgets. Cash/AR/AP are as-of today.

## Liquid position
Cash & Bank (with cash/bank subline), Receivable (+ overdue/due 7d), Payable (+ overdue/due 7d), Net party position (tooltip: not profit).

## Period performance
Money Received ≠ Income; Money Paid ≠ Expense; Net Profit/Loss labeled explicitly.

## Needs Attention
Overdue AR/AP, pending approvals, on-account allocation — each with action button.

## Charts
Money In vs Out (recharts bars) and receivable ageing — click opens Day Book / Receivables.

## Recent activity
Clickable voucher rows.

## Empty state
Start Your Books onboarding when books are empty.

## Partial failure
Widgets use Promise.allSettled; failed widgets show Retry without blanking the page.

## Data sources (existing APIs only)
TB, day-book, P&L, bills, ageing, approvals, vouchers — no new posting semantics.
