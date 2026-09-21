# Package dry-run checklist (ST-17 local)

Before packaging:

- [ ] No `.local/statement-corpus/` contents
- [ ] No statement passwords / PINs / `.env` secrets
- [ ] No private golden PDFs
- [ ] OCR assets are self-hosted runtime files only
- [ ] `docs/statements-v2/evidence/private/` empty or gitignored

Hosted upload/deployment is **out of scope** for this playbook.
