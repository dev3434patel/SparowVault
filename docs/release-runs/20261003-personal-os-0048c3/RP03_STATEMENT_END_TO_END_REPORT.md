# RP03 — Statement command, receipt, and repair

Release run `20261003-personal-os-0048c3`. Card `null` / `not_observed` and printed `0` / `source_observed` were not rebuilt.

## What changed

- `rememberStatementCommand` writes the reviewed JSON to the local outbox before `POST`. If that write is not readable, the dialog does not send.
- State `DELIVERY_UNKNOWN` retries the same body. Repair still uses the stored receipt and does not create a second import.
- A command stored for one user is refused for another user.
- After the server responds, the receipt is remembered even if the active user has changed. Local apply still refuses to write into the new user's books.
- Receipt links with more than 40 transaction ids use `statementSource=<importSourceId>` instead of a comma-separated id list. Imported rows now carry `statementSource.importSourceId`.

## Evidence

`src/services/__tests__/statementLocalBooks.test.ts` passed in the 31-test run, including the new command-before-response case and the long receipt link.

## Not run

The first pass of this run did not post the synthetic oracles. The close run then executed `npm run test:statements` (exit 0), including omit-pair HTTP 422 with no partial postings and identical-import idempotency. Response-loss remains the client command stored before POST. OCR page alignment inside the served page was not clicked; the packaged OCR assets did read a fixture image in the close run.
