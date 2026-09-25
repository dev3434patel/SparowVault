# Secrets rotation — Company production (PHASE_10)

## Rule

No secret may live in Git. Tracked files may only contain **placeholders** (`.env.example`, `.env.host.example`, `.env.test.example`).

## Bootstrap

`php/config/env.php` loads:

1. `.env` (usually only `APP_ENV_FILE=…`)
2. The selected file (`.env.local` / `.env.host` / …) **override**
3. Or `.env.host` if present and no selector

Production (`APP_ENV=production`) refuses to boot with empty/default `CLOUD_JWT_SECRET` or empty `DB_PASS` (`php/helpers/app.php`).

## If a credential was ever committed

Treat it as **compromised** even if later removed from the tree (history retains it).

1. **Rotate immediately**
   - `CLOUD_JWT_SECRET` → `openssl rand -hex 64` (all sessions invalid)
   - `DB_PASS` → change MySQL user password; update host env
   - Razorpay secrets → dashboard regenerate (if ever live keys leaked)
2. Add the old JWT’s SHA-256 to `known_bad_jwt_secret_hashes()` in `php/helpers/app.php` so old values cannot boot production.
3. Purge from git history only with an explicit ops decision (`git filter-repo` / BFG) **and** force-rotate anyway — history rewrite does not un-leak public forks.
4. Record rotation time in the private ops log (not in this repo).

## Seed / demo PINs

SQL seeds and docs may mention default admin PIN patterns for **local/dev only**. Change on first login; production must never keep seed PINs.

## Checklist before go-live

- [ ] Hosting panel env vars set; disk `.env.host` mode 600 if used
- [ ] `curl -I https://HOST/.env` → 403
- [ ] `CLOUD_JWT_SECRET` length ≥ 32 and not in denylist
- [ ] No real secrets in `git grep` of working tree
- [ ] Backup encryption / offsite access credentials stored in password manager
