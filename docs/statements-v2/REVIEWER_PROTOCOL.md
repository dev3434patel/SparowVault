# Reviewer protocol for statement goldens

1. Two independent reviewers (or one human + independent CSV export) must agree on every critical field.
2. Critical fields: booking date, debit paise, credit paise, direction, running balance (when printed), account identity.
3. Disagreements are resolved before the golden is committed.
4. Parser output is never the source of truth for the golden.
5. Private PDFs stay in `.local/statement-corpus/`; only hashes and sanitized manifests enter git.
