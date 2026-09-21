# Privacy and regression notes

- Statement commit still rejects files/passwords in JSON body.
- Review digest is a revision binder, not authenticity proof.
- CORS credentials require SparowVault PHP on :8080 (port guard added).
- Private corpus under `.local/` remains gitignored.
- Package allowlist via `npm run host:package` — run separately for extract checks; hosted MIME NOT_TESTED.
