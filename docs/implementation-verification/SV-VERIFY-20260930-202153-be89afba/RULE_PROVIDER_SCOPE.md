# Rule and provider scope

| Scope | Local result | External |
|---|---|---|
| Purpose registry | PHP accounting test posted non-deprecated purposes and rejected OTHER, PROPERTY_PAYMENT, and REFUND | n/a |
| Payroll rates | Preview accepts gross 30000 only and labels rates unverified. Posted paise matched 3180000 expense | PF filing not tested |
| GST | Pure golden: export is not filed and IRN is null | Portal filing BLOCKED_EXTERNAL |
| Razorpay | Live fixture throws. Company billing insert is a local fixture path | Live delivery BLOCKED_EXTERNAL |
| Account Aggregator | No live consent screen | BLOCKED_EXTERNAL |
| Cheque | Match does not post cash again | Real bank feed BLOCKED_EXTERNAL |
| 20-bank parsers | 0 layouts verified-for-scope | BLOCKED_EXTERNAL |
| Alert preferences | 64 boolean combinations matched the six families | n/a |
| Permissions | Empty and loading states deny in `companyAllows`. Opening balance requires `manage_opening_balances` after `create_journal` | n/a |

Provider webhooks and government portals were not called.
