# UI matrix

Direct URL checks used the audit package at `http://127.0.0.1:8099`. A signed-in session was not created in the browser.

| URL | Observed |
|---|---|
| `/` | 200 `text/html`, CSP `default-src 'self'` |
| `/company/app/invoices` | Server returns the SPA shell. The client then shows company login: Username, PIN, Sign in, Back to Personal Finance |
| `/assets/index-DAoT_YBV.js` | 200 `text/javascript` |
| `/assets/pdf.worker.min-wgc6bjNh.mjs` | 200 `text/javascript` |
| `/.env` and `*.sql` | 403 |

Personal routes in `src/lib/navRoutes.ts` include `/envelopes`. `EnvelopesPage` is mounted from `AppShell`. `CardBooksPanel` is mounted from `CardsPage`. Company routes include `/company/app/invoices` and `/company/app/modules` in `src/company/routes.ts`. Those mounts were read from source. They were not clicked through while signed in.

Empty, loading, and error permission states deny in `companyAllows`. An empty permission list does not allow an action. That function was executed by the existing unit test during `npm test` and by reading the source. Page-by-page banners were not re-clicked.
