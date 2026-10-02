# Bank layout scorecard

`statements:gate:strict` first outcome, exit 1:

```json
{
  "ok": false,
  "failures": ["verified-for-scope layouts: 0 (20-bank claim blocked)"],
  "verifiedForScopeCount": 0,
  "blockedFor20BankClaim": true
}
```

No real bank PDF corpus was supplied. This run does not score any of 20 banks as accurate. A missing PDF does not excuse a missing local save. Personal card statement save was checked separately as O03 on disposable IndexedDB (closing balance 250000 paise persisted). Company books have no bank-statement upload. Cheque match on a posted voucher added 0 cash vouchers (O11).

Account Aggregator remains schema-level locally and BLOCKED_EXTERNAL for a live consent.
