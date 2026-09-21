# Holdout policy

1. Split by account and source-document family into development / validation / holdout.
2. Re-exports, scans, and overlapping copies of one statement stay in the same split.
3. Never generate expected JSON from the parser under test.
4. Synthetic fixtures are labelled `synthetic` and cannot certify real-bank rendering.
5. Missing real corpus for a layout => status remains `registered` or `BLOCKED`, never `verified-for-scope`.
