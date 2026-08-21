# SparowVault

Personal finance OS for India — **React 19 + Vite + TypeScript** frontend, **PHP + MySQL** cloud API, ledger-correct money in **paise**.

## Repository layout

```text
api/                 Public PHP HTTP endpoints
php/                 Backend helpers, controllers, config
src/                 React app (UI + finance engines)
sql/                 Schema + migrations + HOSTING_READY_CLEAN_IMPORT.sql
scripts/             Gates, hosting packager, cert runners
tests/               Unit + API + browser E2E
docs/                Deploy guides, finance-vNext docs, certification
public/              Static assets (favicon, etc.)
```

Root stays lean: app configs + `README` only. Historical phase reports live under `docs/archive/`.

## Quick start (local)

```bash
npm install
cp .env.example .env
cp .env.host.example .env.local   # then fill DB_* for local MySQL
npm run dev
```

- Frontend: http://localhost:5173  
- API (auto via `npm run dev`): http://localhost:5000  

## Hosting

1. Build package: `npm run host:package` → `release/hosting-bundle.zip`
2. Import SQL: `sql/HOSTING_READY_CLEAN_IMPORT.sql` into an empty MySQL DB
3. Upload bundle; place **`.env.host`** on the server (never commit real secrets)

See `docs/HOSTING_DEPLOY.md`.

## Quality gates

```bash
npm run health                 # typecheck + lint + unit + php + sql + build
npm run finance:gate:all       # finance engine gates
npm run finance:certify:all    # full certification (needs local TEST_DB_*)
```

## Certification docs

- `docs/certification/PRODUCTION_RELEASE_CERTIFIED.md`
- `docs/certification/FINAL_OPEN_GAPS.md`
- `docs/finance-vnext/` — domain specs + evidence

## GitHub safety

**Never commit:**

- `.env`, `.env.host`, `.env.local`, `.env.production`, `.env.staging`
- `/release/`, `/dist/`, `/node_modules/`, `/backups/`, `/data/`
- Real DB passwords or JWT secrets

**Do commit:**

- `.env.example`, `.env.host.example`, `.env.test.example`
- Source, SQL, scripts, tests, docs

```bash
git init
git add .
git status   # confirm no .env* secrets
git commit -m "Initial SparowVault import"
```

## License / product

Private / proprietary unless you add a license file.
