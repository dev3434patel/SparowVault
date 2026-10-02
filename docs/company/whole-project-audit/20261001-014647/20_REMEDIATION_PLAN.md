# 20 — Remediation Plan

## P0
None.

## P1
None remaining from this re-proof. The default voucher list and the receipt date use the local calendar day, so a voucher posted today is inside the list window. Journey G reversed that voucher.

## P2
1. Search should require view permissions, not membership alone.
2. Re-run `perf-100k-matrix.php` on an isolated database.
3. Re-run backup destroy/restore on an isolated database.
4. Re-open project, area, and user-activity reports when the database is not under the 100k/backup worker. Business, category, and Modules already rendered.

## P3
Role-specific dashboards, pixel-diff CI.

## FUTURE
Do not treat GST filing, payroll runs, inventory valuation, or SaaS billing as core-complete work unless those Modules flows are certified separately.

## Done in this re-proof
Voucher list date filter and receipt default date. Sheet Escape closes the navigation dialog. Keyboard suite selects an owner company and reaches Create party and Lock period. Security matrix reads `posting_guards.php`.

## Phases
A Dashboard — keep.  
B Navigation — voucher list includes today's posted voucher.  
C Party/Bill — keep.  
D Reports — business and category opened; project, area, and user-activity did not finish loading.  
E States — keyboard names pass.  
F Responsive — viewport already green; keep.  
G Export — keep.  
H Workspace — hydrate already green.  
I Performance — isolated 100k, not this stamp.  
J Certification — `company:certify:final` and `company:certify:product` still need a single-process run after the database worker finishes.
