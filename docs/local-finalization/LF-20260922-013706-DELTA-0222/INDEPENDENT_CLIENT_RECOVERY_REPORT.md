# Concurrent import race evidence

```json
{
  "base": "http://localhost:5000",
  "phpCliWorkersEnv": "4",
  "platform": "win32",
  "note": "Parallel client starts overlapped in time; Windows PHP -S may still serialize. Economic uniqueness is fingerprint/id based, not HTTP 409 on same account.",
  "sameDocumentParallel": {
    "launched": 6,
    "elapsedMs": 136,
    "successCount": 6,
    "importedTotal": 1,
    "duplicateTotal": 5,
    "uniqueTransactionIds": 1,
    "codes": [
      "200:ok",
      "200:ok",
      "200:ok",
      "200:ok",
      "200:ok",
      "200:ok"
    ],
    "economicOnce": true
  },
  "backendOverlapProven": "OVERLAPPED_CLIENT_STARTS"
}
```
