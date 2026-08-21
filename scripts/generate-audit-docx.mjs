/**
 * SparowVault — MVP Audit Report DOCX generator
 * -------------------------------------------------------------------
 * Usage:
 *   1. npm install docx        # one-time install
 *   2. node scripts/generate-audit-docx.mjs
 *      -> writes AUDIT_REPORT_MVP.docx in the repo root
 *
 * The generated file mirrors AUDIT_REPORT_MVP.html section-for-section.
 * Edit the FINDINGS / SECTIONS arrays below to keep the two in sync.
 */

import fs from "node:fs";
import path from "node:path";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Header, Footer, PageNumber, PageBreak, LevelFormat,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  TableOfContents, TabStopType, TabStopPosition, ExternalHyperlink,
} from "docx";

// ─── Severity colours ────────────────────────────────────────────────
const SEV = {
  crit: { label: "CRITICAL",     fill: "FEE2E2", color: "7F1D1D" },
  high: { label: "HIGH",         fill: "FFEDD5", color: "9A3412" },
  med:  { label: "MEDIUM",       fill: "FEF3C7", color: "92400E" },
  low:  { label: "LOW",          fill: "DBEAFE", color: "1E40AF" },
  info: { label: "INFORMATIONAL",fill: "CCFBF1", color: "0F766E" },
  ok:   { label: "CONFIRMED GOOD",fill:"D1FAE5", color: "065F46" },
};

// ─── Helpers ─────────────────────────────────────────────────────────
const P  = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, ...opts })], spacing:{ after:120 }, ...opts.para });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children:[new TextRun({ text })], spacing:{ before:300, after:200 } });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children:[new TextRun({ text })], spacing:{ before:240, after:140 } });
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children:[new TextRun({ text })], spacing:{ before:200, after:120 } });
const PB = () => new Paragraph({ children:[new PageBreak()] });
const MUTED = (text) => new Paragraph({ children:[new TextRun({ text, italics:true, color:"6B7280", size:20 })], spacing:{ after:120 } });
const CODE = (text) => new TextRun({ text, font:"Consolas", size:20, color:"0F172A" });

const sevCell = (sev) => new TableCell({
  width:{ size:1400, type:WidthType.DXA },
  shading:{ fill: SEV[sev].fill, type: ShadingType.CLEAR },
  margins:{ top:60, bottom:60, left:120, right:120 },
  children:[new Paragraph({ alignment: AlignmentType.CENTER,
    children:[new TextRun({ text: SEV[sev].label, bold:true, color: SEV[sev].color, size:16 })] })]
});

const border = { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" };
const borders = { top:border, bottom:border, left:border, right:border };

const bullet = (text) => new Paragraph({ numbering:{ reference:"bullets", level:0 }, children:[new TextRun({ text })], spacing:{ after:80 } });
const numbered = (text) => new Paragraph({ numbering:{ reference:"numbers", level:0 }, children:[new TextRun({ text })], spacing:{ after:80 } });

// Render a single finding row as a 2-col table (severity | content)
function findingTable({ id, sev, title, path: filepath, body, rec }) {
  const contentChildren = [
    new Paragraph({ children: [
      new TextRun({ text: `${id}  `, bold:true, font:"Consolas", color:"0F172A" }),
      new TextRun({ text: title, bold:true })
    ]}),
  ];
  if (filepath) contentChildren.push(new Paragraph({ children:[ CODE(filepath) ], spacing:{ after:60 } }));
  if (body)     contentChildren.push(new Paragraph({ children:[new TextRun({ text: body })], spacing:{ after:80 } }));
  if (rec)      contentChildren.push(new Paragraph({ children:[
    new TextRun({ text: "Fix: ", bold:true, color:"065F46" }),
    new TextRun({ text: rec })
  ]}));

  return new Table({
    width:{ size:9360, type:WidthType.DXA },
    columnWidths:[1400, 7960],
    rows:[ new TableRow({ children:[
      sevCell(sev),
      new TableCell({
        width:{ size:7960, type:WidthType.DXA },
        borders, margins:{ top:80, bottom:80, left:160, right:160 },
        children: contentChildren
      })
    ]})]
  });
}

// ─── Content (mirrors AUDIT_REPORT_MVP.html) ────────────────────────
const FINDINGS = [
  // A — Security
  ["A","Security",[
    ["A1","crit","Production DB password shipped inside release bundle",
      "D:\\Claude\\SparowVault\\release\\hosting-bundle\\.env.host",
      "The .env.host file previously shipped with concrete production credentials. If the bundle is uploaded to a public folder, the password leaks.",
      "Replace all sensitive values with empty placeholders; deliver real credentials via a secret store. Add an Apache deny rule for .env*."],
    ["A2","crit","Example JWT secret embedded in release bundle",
      "release/hosting-bundle/.env.host CLOUD_JWT_SECRET",
      "Any deployment that fails to overwrite it inherits a publicly-known signing key — every issued token is forgeable.",
      "Blank the secret in the template; refuse to boot in APP_ENV=production when secret is empty or matches a known-bad list. Generate via openssl rand -hex 64."],
    ["A3","high","JWT stored in localStorage on the client",
      "src/store/authStore.ts, src/lib/cloud/http.ts",
      "Any XSS in the app origin can read the token and exfiltrate. Razorpay's CDN is loaded on Subscription page — supply-chain risk.",
      "Move token to httpOnly; Secure; SameSite=Strict cookie. Add double-submit CSRF token for non-GET requests."],
    ["A4","high","Custom HS256 JWT with no key rotation and no explicit alg allow-list",
      "php/helpers/auth.php",
      "Implementation otherwise correct (base64url, hash_equals). No kid claim; secret rotation forces global logout. No defence-in-depth check that alg === 'HS256'.",
      "Explicitly assert alg before verifying. Introduce kid + key map for rotation. Long-term: firebase/php-jwt or RS256."],
    ["A5","high","No JWT refresh; 7-day expiry stored client-side",
      "php/helpers/auth.php (CLOUD_JWT_EXPIRES_IN default 7d)",
      "Long-lived bearer token in localStorage compounds A3 — stolen token good for a week.",
      "Pair short access tokens (15–30 min) with refresh token in httpOnly cookie; rotate on use; revoke on logout."],
    ["A6","ok","PIN hashed with bcrypt cost=12 over pin:salt",
      "php/helpers/auth.php (hash_secret/verify_secret)",
      "random_bytes(16) salt; password_hash with cost=12; password_verify on read. Correct pattern.",
      "Keep — revisit cost annually."],
    ["A7","med","4-digit minimum PIN is weak in isolation",
      "php/controllers/cloud.php (^\\d{4,8}$)",
      "10,000 keys; brute-force defence sits wholly on throttling. Acceptable trade-off if documented.",
      "Bump minimum to 6 digits for new signups; reject weak PINs (1234, 0000, 1111, sequences)."],
    ["A8","ok","Login throttling via DB with row-level UNIQUE constraint",
      "php/helpers/auth.php",
      "Atomic INSERT … ON DUPLICATE KEY UPDATE on login_attempts; lockout after threshold; cleared on success.",
      "Keep. Add a sweeper (see A9)."],
    ["A9","med","No cleanup job for login_attempts or api_rate_limits",
      "",
      "Both tables grow unbounded.",
      "Daily cron: DELETE FROM login_attempts WHERE updated_at < NOW()-INTERVAL 7 DAY; same idea for api_rate_limits with 1 day."],
    ["A10","med","Rate-limit identity trusts X-Forwarded-For without validating proxy chain",
      "php/helpers/security.php (client_ip)",
      "Behind an untrusted proxy this is spoofable.",
      "Accept XFF/CF-Connecting-IP only when REMOTE_ADDR is in a TRUSTED_PROXIES env list."],
    ["A11","high","No HTTPS enforcement in .htaccess",
      ".htaccess",
      "On shared hosting allowing both, sessions can start over plain TCP.",
      "RewriteCond %{HTTPS} off / RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]"],
    ["A12","high","Missing security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy",
      ".htaccess",
      "No 'Header set' directives at all. A CSP would meaningfully shrink the blast radius of A3.",
      "Add HSTS/X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy + a CSP allowing self + checkout.razorpay.com only."],
    ["A13","high","No deny rules for sql/, data/, php/, .env*",
      ".htaccess",
      "If hosting layout serves the project root, sql/*.sql and data/*.json are publicly fetchable.",
      "<FilesMatch \"(^\\.env|\\.env\\..*|\\.jwt-secret)$\">Require all denied</FilesMatch> + DirectoryMatch \"(sql|data)\" deny."],
    ["A14","high","Source-map files shipped in the hosting bundle",
      "release/hosting-bundle/assets/*.js.map",
      "Source maps leak the full TS source. Anyone fetching /assets/index-*.js.map can reconstruct the codebase.",
      "build.sourcemap:false in vite.config.ts for prod; or strip *.map in scripts/package-hosting.mjs."],
    ["A15","ok","CORS uses exact-string allow-list in production",
      "php/helpers/security.php",
      "in_array($origin, $allowed, true) on parsed CORS_ALLOWED_ORIGINS env var.",
      "Keep. Add startup assertion that aborts in prod when CORS_ALLOWED_ORIGINS is empty."],
    ["A16","high","No CSRF protection beyond CORS",
      "",
      "Currently the Authorization header carries auth so CSRF is implicitly blocked. Migrating to cookie auth (A3) without CSRF re-opens the door.",
      "Issue per-session CSRF token; require as header on POST/PATCH/DELETE; double-submit cookie pattern."],
    ["A17","med","No server-side validation of cloud_collection_rows.payload shape",
      "api/cloud/sync/push.php, api/cloud/entity.php",
      "Sync stores client JSON verbatim. Malicious client can stuff arbitrary fields / very large payloads.",
      "Validate payload per collection with a JSON schema; reject unknown collection_name; cap row size."],
    ["A18","low","JWT secret file fallback at data/.jwt-secret",
      "data/.jwt-secret",
      "If env unset, code falls back to a file. On loose shared-hosting perms this can be exposed.",
      "Require CLOUD_JWT_SECRET via env in production; keep file fallback for local dev only."],
    ["A19","ok","Razorpay webhook signature verified with hash_equals on raw body",
      "php/helpers/payments.php",
      "Constant-time HMAC compare against raw (un-parsed) body — correct.",
      "Keep."],
    ["A20","ok","Webhook idempotency via webhook_events.event_id UNIQUE",
      "sql/schema.sql",
      "DB-level deduplication of retries.",
      "Keep; pair with the existing transactional update."],
    ["A21","crit","Webhook updates subscription by order_id alone — missing ownership check",
      "api/payments/razorpay/webhook.php",
      "Match is WHERE provider_order_id=?. Does not verify the row's user_id. A confused-deputy across envs or a stolen order_id from logs could flip the wrong subscription.",
      "Record (user_id, order_id) at order creation; in webhook UPDATE … WHERE provider_order_id=? AND user_id=?; reject zero-row updates."],
    ["A22","low","No IP allow-list for Razorpay webhook",
      "",
      "Defence in depth. Signature is primary control; IP allow-list adds a cheap second barrier.",
      "Optional: gate the webhook endpoint by Razorpay's documented egress IPs."],
    ["A23","med","Webhook does not validate captured amount against stored order amount",
      "",
      "A small-payment event with a valid signature could in theory activate a larger subscription.",
      "Re-verify amount against local payments.amount_inr (or fetch order via Razorpay API) before activating."],
    ["A24","ok","Admin role re-read from DB, not just JWT claim",
      "php/helpers/auth.php (auth_require_admin)",
      "Resists privilege-elevation via stale claims.",
      "Keep."],
    ["A25","med","No IP/UA logging on user-side state changes",
      "",
      "admin_audit_logs captures these. User actions do not.",
      "Mirror admin audit for high-value user actions (sub cancel, account delete, PIN change)."],
    ["A26","low","PIN never logged today — but no defence-in-depth scrub",
      "php/helpers/observability.php (request_log)",
      "Today nobody logs request bodies. If a future engineer adds error_log(json_encode($_POST)) the PIN ends up in logs.",
      "Centralize logging through one helper that strips pin/password/token/authorization keys."],
    ["A27","med","External script (Razorpay Checkout) loaded without SRI",
      "",
      "SRI not feasible (script rotates) but CSP must pin to checkout.razorpay.com only.",
      "Lock it down in CSP (A12)."],
    ["A28","low","No clickjacking protection beyond X-Frame-Options",
      "",
      "Closed once A12 ships (X-Frame-Options + CSP frame-ancestors 'none').",
      ""],
    ["A29","low","Service-worker / offline cache not signed",
      "",
      "No SW today. If a PWA is added, treat its cache as a privileged origin.",
      "Defer."],
    ["A30","med","Client-side PIN re-hashing in src/lib/crypto.ts is not a device-compromise defence",
      "src/lib/crypto.ts",
      "Fine for the local-only profile case; should not be described as 'encryption' in UI copy.",
      "Document threat model in code; audit user-facing copy."],
  ]],

  // B — Business logic
  ["B","Business Logic & Calculations",[
    ["B1","ok","EMI handles 0% interest and tenure=0 edge cases",
      "src/services/calculations.ts (calculateEMI)",
      "if (!principal || !tenureMonths) return 0; if (monthlyRate===0) return principal/tenureMonths. Correct.",
      ""],
    ["B2","med","Amortization final-payment rounding can leave a residual balance",
      "src/services/calculations.ts (amortizationSchedule)",
      "Float math can leave ₹0.04 on the last row. Reports look wrong.",
      "Force last month's principal = remaining balance; adjust display EMI for that row. Best fix: do all money math in paise integers."],
    ["B3","high","All money stored in rupees as floats — rounding risk",
      "schema + JSON payloads",
      "JS floats lose precision at 0.1+0.2. For a finance product, this is a slow bleed of trust.",
      "Refactor to paise BIGINT / number internally; format to rupees at the view edge. Multi-day refactor — budget for it."],
    ["B4","ok","Projected month-end spend uses correct day denominator",
      "src/services/calculations.ts (projectMonthEndSpend)",
      "avgPerDay = spentSoFar/daysElapsed; projected = avgPerDay × daysInMonth. date-fns handles the first-of-month edge.",
      "Keep."],
    ["B5","low","Linear projection ignores recurring debits and weekday seasonality",
      "",
      "OK for MVP. Causes early-month false 'projected overrun' alerts.",
      "v2: subtract scheduled recurring debits; or use 7-day rolling average."],
    ["B6","med","Savings rate clamps to ±999% — silently masks data bugs",
      "",
      "A category-misclassification bug surfacing as 'Savings rate -100%' looks like a feature, not a bug.",
      "Emit a debug alert when clamping happens; surface a 'Check your data' hint."],
    ["B7","med","Health-score weights are undocumented magic numbers",
      "src/services/calculations.ts",
      "Weights 22/14/14/14/12/14/10 sum to 100 by design but the rationale is invisible.",
      "Pull weights into a typed constants object with doc-comments. Unit-test the sum."],
    ["B8","ok","Goal monthly-required handles past-due target dates",
      "",
      "monthlyRequired = monthsLeft>0 ? remaining/monthsLeft : remaining. Collapses cleanly.",
      "Keep."],
    ["B9","med","Recurring-rule materialization can duplicate when client time skews",
      "",
      "If rule says 'every 1st of month' and the user opens the app at 23:59 IST in two different time zones, two transactions can be created.",
      "Give each occurrence a deterministic key (ruleId + 'YYYY-MM'); make insert idempotent."],
    ["B10","high","Subscription period starts from NOW() when user renews before expiry",
      "api/payments/razorpay/webhook.php",
      "A user renewing on day 25 of a 30-day plan loses 5 paid days.",
      "new_period_start = MAX(NOW(), current_period_end). Extend from end-of-current."],
    ["B11","med","No proration on plan upgrade/downgrade",
      "",
      "Mid-cycle plan changes rewrite the row, no credit applied.",
      "For MVP allow upgrade only at period boundary; document. Add proration in v1."],
    ["B12","low","All calculations assume INR + IST without explicit setting",
      "src/constants/index.ts",
      "Fine for India-only MVP.",
      "Document the assumption."],
    ["B13","med","Cross-account transfer has no fromAccount != toAccount guard",
      "",
      "Self-transfer nets zero but pollutes the ledger.",
      "Validate in form + push.php."],
    ["B14","low","Negative amount inputs not rejected server-side",
      "",
      "Frontend usually prevents; server should also.",
      "Add amount>0 validation in push.php for transaction payloads."],
  ]],

  // C — Code quality
  ["C","Code Quality",[
    ["C1","med","no-explicit-any disabled in ESLint",
      "eslint.config.mjs",
      "Hides the worst offenders. Critical paths (lib/cloud/http.ts, calculations, alerts) should be strictly typed.",
      "Enable as warning; tighten hot files; promote to error."],
    ["C2","low","no-unused-vars disabled",
      "eslint.config.mjs",
      "Hides dead imports / locals.",
      "Enable as warn with argsIgnorePattern:'^_'."],
    ["C3","high","No unit tests for src/services/calculations.ts or alertsEngine.ts",
      "tests/",
      "Only Node end-to-end scripts. Highest-leverage missing tests — every user-visible number flows through these files.",
      "Add Vitest. Fixtures: EMI(100000,10%,60)≈2124.70; amortization sums to 0; mid-month projection; healthScore on synthetic edge users."],
    ["C4","med","No CI configured",
      "",
      "typecheck/lint/test scripts exist; nothing runs them automatically.",
      "GitHub Action / GitLab CI on every PR. Block merge on failure."],
    ["C5","med","Generic catch (Throwable $e) in PHP — risks leaking internals",
      "php/index.php",
      "Translation to JSON is good; ensure no internal message in production.",
      "Branch on APP_ENV: prod returns {error,reference}, full detail logged keyed by reference."],
    ["C6","low","Logging is unstructured error_log",
      "php/helpers/observability.php",
      "Hard to aggregate. OK for MVP.",
      "v1: JSON lines to dedicated file; ship to log aggregator."],
    ["C7","med","tsconfig strictness likely loose",
      "tsconfig.json",
      "ESLint relaxations imply strict:true may not be on.",
      "Set strict:true, noUncheckedIndexedAccess:true, exactOptionalPropertyTypes:true."],
    ["C8","low","No pre-commit hooks",
      "",
      "Developers can commit lint failures.",
      "Add husky + lint-staged running prettier+eslint on staged files."],
  ]],

  // D — Database
  ["D","Database",[
    ["D1","ok","Foreign keys with ON DELETE CASCADE",
      "sql/schema.sql",
      "User deletion is mechanically clean.",
      "Keep."],
    ["D2","ok","utf8mb4 + utf8mb4_unicode_ci across all tables",
      "",
      "Emoji-safe; correct for Indian audience.",
      "Keep."],
    ["D3","med","cloud_collection_rows.payload is unindexed LONGTEXT",
      "",
      "Any report filtering by JSON content must scan in app memory.",
      "v1: promote hot fields (amount, date, categoryId, txnType) to top-level indexed columns; keep JSON for the rest."],
    ["D4","med","No application-level MAX_PAYLOAD_SIZE",
      "",
      "LONGTEXT accepts 4GB; hostile client can DoS.",
      "Reject payloads >64KB at PHP layer (also covered in A17)."],
    ["D5","med","Confirm sync/pull.php excludes soft-deleted rows",
      "api/cloud/sync/pull.php",
      "Schema has the column/index; audit didn't verify every code path.",
      "Greppable rule: every SELECT on cloud_collection_rows includes AND deleted_at IS NULL unless explicitly a tombstone query."],
    ["D6","low","plans table has no historical pricing",
      "",
      "Editing price is destructive; finance audit can't answer 'what did plan X cost on 2026-04-01?'",
      "Append-only: never UPDATE price_inr; new row + active_at flag."],
    ["D7","med","Unused payments.provider_signature column",
      "",
      "Declared VARCHAR(512), never populated. Confusing dead schema.",
      "Either populate with captured webhook signature for audit, or drop in a migration."],
    ["D8","low","No composite index on admin_audit_logs(actor_user_id, created_at)",
      "",
      "Per-admin time-range queries scan.",
      "ADD KEY idx_aal_actor_time."],
    ["D9","med","Migrations not provably idempotent",
      "sql/*",
      "Re-runs can fail.",
      "Use IF NOT EXISTS / IF EXISTS; track applied versions in schema_version."],
    ["D10","low","No DB-level RLS; relies on app filtering",
      "",
      "MySQL lacks Postgres-style RLS. App must always filter by user_id.",
      "Wrap user-owned queries in a helper that injects WHERE user_id=?; biannual audit."],
  ]],

  // E — DevOps
  ["E","DevOps & Deployment",[
    ["E1","crit","Hosting bundle contains real-looking credentials and example JWT secret",
      "release/hosting-bundle/.env.host",
      "See A1, A2.",
      "Sanitize in scripts/package-hosting.mjs; ship a POST_DEPLOY_README.txt describing what to set."],
    ["E2","crit","Source maps and possibly node_modules shipped",
      "release/hosting-bundle/",
      "Confirm bundle size; >30MB means over-shipped.",
      "Tighten package-hosting.mjs to an explicit allow-list of files."],
    ["E3","high","No HTTPS enforcement (see A11)",
      ".htaccess",
      "",""],
    ["E4","high","No security headers (see A12)",
      ".htaccess",
      "",""],
    ["E5","med","Backups are scripts but not scheduled",
      "package.json (backup:db / backup:json)",
      "Nothing automates them.",
      "cPanel cron nightly + push to S3/Drive; document restore drill."],
    ["E6","med","No staging environment",
      "",
      "Razorpay test keys, migrations, admin actions all converge on prod.",
      "Stand up staging subdomain with own DB and Razorpay test keys; prod deploy requires 'staging green for 24h'."],
    ["E7","low","No Docker/containerization",
      "",
      "Manual file-copy + PHP+MySQL setup. Fine for MVP.",
      "v1: docker-compose.yml for self-hosters."],
    ["E8","med","No request-id tracing",
      "",
      "Errors can't be matched to logs.",
      "In php/index.php mint $_SERVER['REQUEST_ID'] = bin2hex(random_bytes(8)); attach to every log line + error responses."],
    ["E9","med","No monitoring or alerting",
      "",
      "No uptime check, no error-rate alert.",
      "Free-tier UptimeRobot/Better Uptime on /api/health.php; alert on Slack/email. Daily summary of failed webhook_events."],
    ["E10","low","README + setup guide cross-reference correctly",
      "README.md, docs/setup-and-launch-guide.md",
      "Env-var docs (e.g., CORS_ALLOWED_ORIGINS) appear in README but not setup guide.",
      "Single source of truth — env vars in README only."],
    ["E11","med","No log rotation / size cap",
      "",
      "PHP error_log grows forever on shared hosting.",
      "logrotate (if root) or daily PHP cron truncating >50MB."],
    ["E12","med","No .well-known/security.txt",
      "",
      "Researchers won't know how to report.",
      "Drop file with Contact:, Expires:, Preferred-Languages:."],
    ["E13","low","No automated dependency scanning",
      "",
      "npm audit not in CI (no CI — see C4).",
      "Once CI lands, npm audit --production per PR."],
  ]],

  // F — Compliance
  ["F","Compliance & Privacy",[
    ["F1","high","No self-service data-export endpoint (DPDP / GDPR)",
      "api/auth/",
      "DPDP Act 2023 and GDPR Article 20 require machine-readable data export.",
      "GET /api/auth/data-export.php returning JSON archive of cloud_collection_rows + user profile; PIN re-entry gate."],
    ["F2","high","No self-service account deletion (DPDP / GDPR)",
      "api/auth/",
      "Right to erasure. Cascade FKs are in place; expose the action.",
      "DELETE /api/auth/account.php (PIN-confirmed); write admin_audit_logs entry; cancel subscriptions; refund per policy."],
    ["F3","med","No cookie/consent banner",
      "src/",
      "localStorage triggers EU/UK consent rules; DPDP expects clear notice.",
      "Lightweight first-load consent bar; persist preference; gate any future analytics."],
    ["F4","med","No privacy policy / ToS surfaced in product",
      "app_settings.privacy_url, terms_url",
      "Fields exist; no UI references them.",
      "Render footer links from settings; require acceptance at registration; store version + timestamp."],
    ["F5","high","User PII (display name, mobile, email, transaction memos) plaintext at rest",
      "users + cloud_collection_rows",
      "Only the PIN is hashed.",
      "Use MySQL TDE if provider supports it; otherwise app-layer AES-256 on mobile/email columns."],
    ["F6","ok","No card data stored — minimal PCI scope",
      "",
      "Card capture inside Razorpay hosted checkout. We store only Razorpay IDs.",
      "Keep architecture."],
    ["F7","med","No user-action audit log",
      "",
      "admin_audit_logs exists; user-side state changes don't have an equivalent.",
      "Mirror admin log for high-value user actions (sub cancel, account delete, PIN change)."],
    ["F8","med","No ToS / privacy-policy versioning",
      "",
      "No record of which version each user accepted.",
      "user_policy_acceptances(user_id, policy_key, version, accepted_at); block sign-in until current version accepted."],
    ["F9","low","No data-retention policy",
      "",
      "Soft-deleted rows linger indefinitely.",
      "Define retention (e.g., 30d from soft-delete then hard-delete); daily sweeper."],
    ["F10","low","No incident-disclosure templates",
      "docs/incident-playbook.md",
      "DPDP requires breach notice ASAP. The playbook should have comms templates pre-written.",
      "Add a Breach Communication section with 72h SLA, template email, checklist."],
  ]],
];

// ─── Build the document ──────────────────────────────────────────────
function buildDoc() {
  const titlePara = (text, size=80) => new Paragraph({ alignment: AlignmentType.CENTER,
    children:[new TextRun({ text, bold:true, size, color:"0B1220" })], spacing:{ after:200 } });

  const sections = [];

  // COVER
  sections.push(
    new Paragraph({ spacing:{ before:1000 } }),
    titlePara("SparowVault", 96),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children:[new TextRun({ text:"MVP-Stage Audit Report", size:36, color:"475569" })], spacing:{ after:480 } }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children:[new TextRun({ text:"Independent technical review covering architecture, security, business-logic correctness, code quality, database design, DevOps posture, and compliance readiness.", italics:true, color:"4B5563", size:22 })], spacing:{ after:600 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children:[new TextRun({ text:`Date: 2026-05-12   ·   Version: 0.1.0   ·   Audience: Internal engineering`, size:20, color:"6B7280" })] }),
    PB()
  );

  // TOC
  sections.push(
    H1("Table of Contents"),
    new TableOfContents("Contents", { hyperlink:true, headingStyleRange:"1-3" }),
    PB()
  );

  // 1. Exec summary
  sections.push(
    H1("1. Executive Summary"),
    P("SparowVault is a thoughtfully architected, full-stack personal-finance platform. The frontend (React 19 + Vite + TypeScript with a Dexie/IndexedDB offline mirror) is well organized; the backend (PHP + MySQL with a custom router, custom JWT, bcrypt PIN hashing, and Razorpay billing) shows discipline around the basics — prepared statements, constant-time HMAC compares, transactional payment updates, immutable admin audit logs, and a generic JSON entity store that lets the client ship new features without schema migrations."),
    P("This audit is delivered with an explicitly critical lens. The platform has several launch-blocking issues — credentials and an example JWT secret shipped inside release/hosting-bundle/.env.host, no HTTPS enforcement, no baseline security headers (HSTS/CSP/X-Frame-Options), JWT tokens in localStorage (XSS-exfiltratable), and a Razorpay webhook handler that updates subscription state by provider_order_id alone without re-validating the owning user. There is also no self-service data-export or account-delete endpoint — a compliance gap under India's DPDP Act 2023 and GDPR."),
    P("None of these are architectural rewrites — they are hardening tasks measurable in days. Once cleared, the platform is in a defensible posture for a paid MVP."),

    H2("Headline numbers"),
    summaryTable(),

    H2("Top 10 issues to fix before public launch"),
    numbered("Strip secrets from release/hosting-bundle/.env.host — DB password and example JWT secret are shipped verbatim. [Critical]"),
    numbered("Re-validate subscription ownership in the Razorpay webhook — match on (provider_order_id, user_id). [Critical]"),
    numbered("Generate a fresh, environment-specific CLOUD_JWT_SECRET per deployment. [Critical]"),
    numbered("Force HTTPS at the edge (.htaccess + HSTS). [High]"),
    numbered("Add security headers — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. [High]"),
    numbered("Move JWT out of localStorage to an httpOnly Secure SameSite=Strict cookie + CSRF token. [High]"),
    numbered("Deny direct web access to sql/, data/, .env* via .htaccess matchers. [High]"),
    numbered("Strip source-map files from the hosting bundle. [High]"),
    numbered("Ship self-service data export & account delete endpoints. [High]"),
    numbered("Add unit tests for src/services/calculations.ts. [High]"),
    PB()
  );

  // 2. Scope
  sections.push(
    H1("2. Scope, Methodology & Severity Legend"),
    H2("Scope"),
    P("Whole repository under D:\\Claude\\SparowVault excluding node_modules and prior build artefacts. Both runtime tiers (React/TS client, PHP/MySQL API) and the deployable release/hosting-bundle were inspected. Razorpay integration, JWT auth, rate-limiting, schema migrations and the calculation engine were reviewed in depth."),
    H2("Methodology"),
    numbered("Mapped the codebase top-down (entry points, routers, stores, services, schema)."),
    numbered("Read security-critical files line-by-line (auth helpers, webhook, JWT signer, rate-limit guard, .htaccess, env templates)."),
    numbered("Read the calculation engine (src/services/calculations.ts) function-by-function; re-derived formulas."),
    numbered("Surveyed SQL schema for FK integrity, indexes, charsets, idempotency keys, audit coverage."),
    numbered("Audited the shipped artefact (release/hosting-bundle) for secret leakage, source maps, and over-broad file inclusion."),
    numbered("Cross-checked README + setup guide claims against actual configuration values."),
    H2("Severity Legend"),
    legendTable(),
    PB()
  );

  // 3. Architecture
  sections.push(
    H1("3. Architecture & Module Design"),
    H2("3.1 High-level topology"),
    P("Single-page React app served by Vite-built static assets, plus a stateless PHP API talking to MySQL. Each user has a server-side account (username + 4–8 digit PIN, bcrypt-hashed with a per-user salt) and a mirrored copy of all data in browser IndexedDB via Dexie. The two stores sync via POST /api/cloud/sync/push.php and GET /api/cloud/sync/pull.php."),
    H2("3.2 Frontend (React 19 + Vite + TS)"),
    P("Entry at src/main.tsx mounts ThemeProvider + AppProviders. State splits across three Zustand stores (auth, data, navigation). The local DB schema in src/db/database.ts defines 21 Dexie stores: users, sessions, settings, accounts, cards, categories, transactions, budgets, loans, emiPayments, udhari, udhariSettlements, investments, savingsContributions, goals, goalContributions, reminders, alerts, recurringRules, attachments, auditLogs, snapshots, exportHistory — each carrying userId and isDeleted with indexes tuned for common queries."),
    P("Pages: Dashboard, Expenses, Income, Transactions, Accounts, Cards, Budgets, Goals, Loans, EMI, Investments, Udhari, Categories, Alerts, Audit, Reports, Subscription, Export/Import, Settings, Profile + admin pages. Calculations are isolated as pure functions in src/services/calculations.ts; alert rules in src/services/alertsEngine.ts; cloud client in src/lib/cloud/{auth,http}.ts."),
    H2("3.3 Backend (PHP + MySQL)"),
    P("Router at php/index.php; route table in php/routes.php; controllers in php/controllers/* and helpers in php/helpers/*. Database access centralized in php/config/db.php using PDO with prepared statements throughout."),
    P("Endpoints split into Auth (register/login/me/change-pin/reset-pin/profile/admin-login), Sync & data (push/pull/entity CRUD over the generic JSON store), SaaS (plans/create-order/confirm-payment/my/cancel/webhook), and Admin (plan/feature-flag/setting/user/subscription/audit administration, role-gated)."),
    H2("3.4 Data model"),
    P("Cleverest design decision: cloud_collection_rows(user_id, collection_name, entity_id, payload LONGTEXT JSON, deleted_at, updated_at, …) with UNIQUE(user_id, collection_name, entity_id). All user-owned entities live here as JSON — no per-entity table, no migrations when the client adds fields. On top sit SaaS tables: plans, plan_features, subscriptions, payments, webhook_events (idempotent via UNIQUE event_id), admin_audit_logs (immutable), login_attempts (brute-force tracking), api_rate_limits, app_settings, feature_flags_global."),
    H2("3.5 Trust boundaries"),
    bullet("Browser → API: JWT (HS256) in Authorization: Bearer."),
    bullet("API → MySQL: PDO with prepared statements; credentials from environment."),
    bullet("Razorpay → API: webhook signed with HMAC-SHA256 (RAZORPAY_WEBHOOK_SECRET); idempotent via webhook_events.event_id."),
    bullet("Admin → API: same JWT but role-gated. Role re-read from DB."),
    PB()
  );

  // 4. Flow walkthroughs
  sections.push(
    H1("4. End-to-End Flow Walkthroughs"),
    H2("4.1 New user sign-up & first sync"),
    numbered("User opens app → src/main.tsx mounts shell → useAuthStore.hydrate() finds no token → Create-Account screen."),
    numbered("POST /api/cloud/register.php with {username, displayName, pin}."),
    numbered("Server: validate regex (username 3–24; PIN ^\\d{4,8}$) → random_bytes(16) salt → password_hash(pin.\":\".salt, BCRYPT, cost=12) → INSERT users → sign_cloud_token({userId,username,role}) HS256 7d expiry."),
    numbered("Response {token,user}. Client stores token in localStorage (Finding A3) and Zustand."),
    numbered("Client seeds local Dexie (defaultsService.ts) and pushes seed to cloud via sync/push.php."),
    H2("4.2 Adding an expense"),
    numbered("QuickAdd writes transaction to Dexie + updates Zustand."),
    numbered("Dashboard re-derives KPIs via calculations.ts — monthly total, budget %, savings, healthScore."),
    numbered("alertsEngine.ts runs idempotently — budget thresholds, projected overrun, etc."),
    numbered("http.ts queues a push → sync/push.php upserts into cloud_collection_rows with collection_name='transactions'."),
    H2("4.3 Razorpay subscription"),
    numbered("Frontend GETs plans."),
    numbered("create-order.php: convert INR→paise, call Razorpay Orders API with Basic auth, store pending subscription, return {order_id, amount, currency, key_id}."),
    numbered("Frontend opens Razorpay Checkout."),
    numbered("Razorpay POSTs to /api/payments/razorpay/webhook.php with X-Razorpay-Signature."),
    numbered("Webhook: read raw body → hash_hmac sha256 → hash_equals → check webhook_events.event_id uniqueness → BEGIN TX → update payments + subscriptions → COMMIT."),
    P("Critical issue (A21): step 5 matches on provider_order_id alone — must also match user_id."),
    H2("4.4 Admin actions"),
    numbered("POST /api/auth/admin-login.php — same login flow + role='admin' check."),
    numbered("auth_require_admin() re-reads role from users table."),
    numbered("Each state-changing action writes admin_audit_logs(actor, action, entityType, entityId, before, after)."),
    PB()
  );

  // 5-10. Findings sections
  for (const [letter, name, items] of FINDINGS) {
    sections.push(H1(`Findings ${letter} — ${name}`));
    items.forEach((f) => {
      const [id, sev, title, filepath, body, rec] = f;
      sections.push(findingTable({ id, sev, title, path: filepath, body, rec }));
      sections.push(new Paragraph({ spacing:{ after:120 } }));
    });
    sections.push(PB());
  }

  // 11. Roadmap
  sections.push(
    H1("11. Remediation Roadmap"),
    H2("Sprint 0 — Pre-launch blockers (3–5 days)"),
    numbered("A1, A2, E1 — strip .env.host values; new JWT secret per deploy; refuse to boot with empty secret."),
    numbered("A21 — add user_id guard to subscription webhook update."),
    numbered("A11, A12, A13 — HTTPS redirect + security headers + deny rules in .htaccess."),
    numbered("A14, E2 — strip source maps from hosting bundle."),
    numbered("B10 — fix renew-before-expiry period math."),
    numbered("F1, F2 — ship data export & account delete endpoints."),
    H2("Sprint 1 — Hardening (1–2 weeks)"),
    numbered("A3, A5, A16 — JWT → httpOnly cookie + CSRF."),
    numbered("A4 — explicit alg allow-list; kid-based rotation."),
    numbered("A17, D4 — server-side payload validation + max size."),
    numbered("C3, C4 — Vitest for calculations + CI on PR."),
    numbered("E5, E8, E9 — backups + request IDs + uptime alerting."),
    numbered("F3, F4, F8 — consent banner + policy links + acceptance versioning."),
    H2("Sprint 2 — Maturity (2–4 weeks)"),
    numbered("B3 — money as paise integers project-wide."),
    numbered("D3 — promote hot transaction columns out of JSON."),
    numbered("F5 — encrypt PII columns at rest."),
    numbered("D9 — idempotent migrations + schema_version in CI."),
    numbered("E6 — staging environment + Razorpay test webhooks."),
    numbered("F7, F9 — user audit log + retention sweeper."),
    H2("Sprint 3+ — Scale"),
    numbered("RS256 JWT + key rotation (A4 deeper)."),
    numbered("PWA / service worker (mobile parity)."),
    numbered("Multi-currency & timezone (B12)."),
    numbered("Docker + IaC."),
    numbered("Proration on plan changes (B11)."),
    PB()
  );

  // 12. Appendix
  sections.push(
    H1("12. Appendix"),
    H2("12.1 Files of interest"),
    filesTable(),
    H2("12.2 Core formulas"),
    new Paragraph({ children:[ CODE(
`EMI = P * r * (1+r)^n / ((1+r)^n - 1)
       r = annualRate / 12 / 100, n = tenureMonths
       0% fallback: EMI = P / n

Amortization, per month k:
       interest_k  = balance_{k-1} * r
       principal_k = min(balance_{k-1}, EMI - interest_k)
       balance_k   = balance_{k-1} - principal_k

Net monthly savings = income - expense - EMI - CC pmts - udhari given
Savings rate (%)    = clamp(netSavings/income * 100, -100, 999)
Projected spend     = (spentSoFar/daysElapsed) * daysInMonth
Budget % used       = spent/budgeted * 100
Goal monthly req.   = remaining / max(1, monthsLeft)
On-track if pacePerMonth >= monthlyRequired * 0.9`) ]}),
    H2("12.3 Threat model"),
    threatTable(),
  );

  const doc = new Document({
    creator:"SparowVault Audit",
    title:"SparowVault MVP Audit Report",
    description:"Comprehensive technical audit",
    styles:{
      default:{ document:{ run:{ font:"Calibri", size:22 } } },
      paragraphStyles:[
        { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
          run:{ size:36, bold:true, font:"Calibri", color:"0B1220" },
          paragraph:{ spacing:{ before:360, after:240 }, outlineLevel:0 } },
        { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
          run:{ size:28, bold:true, font:"Calibri", color:"1F2937" },
          paragraph:{ spacing:{ before:280, after:160 }, outlineLevel:1 } },
        { id:"Heading3", name:"Heading 3", basedOn:"Normal", next:"Normal", quickFormat:true,
          run:{ size:24, bold:true, font:"Calibri", color:"374151" },
          paragraph:{ spacing:{ before:200, after:120 }, outlineLevel:2 } },
      ]
    },
    numbering:{
      config:[
        { reference:"bullets", levels:[{ level:0, format: LevelFormat.BULLET, text:"•", alignment: AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:720, hanging:360 } } } }] },
        { reference:"numbers", levels:[{ level:0, format: LevelFormat.DECIMAL, text:"%1.", alignment: AlignmentType.LEFT,
          style:{ paragraph:{ indent:{ left:720, hanging:360 } } } }] },
      ]
    },
    sections:[{
      properties:{
        page:{
          size:{ width: 11906, height: 16838 }, // A4
          margin:{ top: 1080, right: 1080, bottom: 1280, left: 1080 }
        }
      },
      headers:{
        default: new Header({ children:[ new Paragraph({
          alignment: AlignmentType.RIGHT,
          children:[ new TextRun({ text:"SparowVault — MVP Audit Report", color:"6B7280", size:18 }) ]
        }) ] })
      },
      footers:{
        default: new Footer({ children:[ new Paragraph({
          alignment: AlignmentType.CENTER,
          children:[
            new TextRun({ text:"Page ", color:"6B7280", size:18 }),
            new TextRun({ children:[ PageNumber.CURRENT ], color:"6B7280", size:18 }),
            new TextRun({ text:" of ", color:"6B7280", size:18 }),
            new TextRun({ children:[ PageNumber.TOTAL_PAGES ], color:"6B7280", size:18 }),
            new TextRun({ text:"   ·   2026-05-12   ·   Internal use", color:"9CA3AF", size:16 }),
          ]
        }) ] })
      },
      children: sections
    }]
  });

  return doc;
}

function summaryTable() {
  const cell = (text, color="0B1220", bold=true) => new TableCell({
    width:{ size: 1560, type: WidthType.DXA }, borders, margins:{ top:80, bottom:80, left:80, right:80 },
    children:[ new Paragraph({ alignment: AlignmentType.CENTER,
      children:[ new TextRun({ text, bold, color, size:28 }) ] }) ]
  });
  const labelCell = (text) => new TableCell({
    width:{ size: 1560, type: WidthType.DXA }, borders, margins:{ top:60, bottom:60, left:80, right:80 },
    children:[ new Paragraph({ alignment: AlignmentType.CENTER,
      children:[ new TextRun({ text, color:"6B7280", size:16 }) ] }) ]
  });
  return new Table({
    width:{ size: 9360, type: WidthType.DXA },
    columnWidths:[1560,1560,1560,1560,1560,1560],
    rows:[
      new TableRow({ children:[ cell("90"), cell("7","7F1D1D"), cell("15","9A3412"), cell("52","92400E"), cell("16","1E40AF"), cell("B-") ] }),
      new TableRow({ children:[ labelCell("TOTAL"), labelCell("CRITICAL"), labelCell("HIGH"), labelCell("MEDIUM"), labelCell("LOW"), labelCell("GRADE") ] }),
    ]
  });
}

function legendTable() {
  const row = (sev, meaning, by) => new TableRow({ children:[
    sevCell(sev),
    new TableCell({ width:{ size:5800, type:WidthType.DXA }, borders, margins:{ top:60, bottom:60, left:120, right:120 },
      children:[ new Paragraph({ children:[ new TextRun({ text: meaning }) ]}) ] }),
    new TableCell({ width:{ size:2160, type:WidthType.DXA }, borders, margins:{ top:60, bottom:60, left:120, right:120 },
      children:[ new Paragraph({ children:[ new TextRun({ text: by, italics:true, color:"6B7280" }) ]}) ] }),
  ]});
  return new Table({
    width:{ size:9360, type:WidthType.DXA },
    columnWidths:[1400, 5800, 2160],
    rows:[
      row("crit","Direct path to data exposure, secret compromise, financial loss, or regulatory breach.","Immediately"),
      row("high","Significant security or correctness defect; realistic exploit or business-logic bug.","Before public launch"),
      row("med","Hygiene gap or moderate risk; not actively exploitable.","Within 30 days of launch"),
      row("low","Minor defect or improvement opportunity.","Backlog / v0.2"),
      row("info","Observation worth noting; no action required.","—"),
      row("ok","Verified positive control or correct implementation.","Keep"),
    ]
  });
}

function filesTable() {
  const data = [
    ["src/main.tsx","SPA entry, providers"],
    ["src/db/database.ts","Dexie schema — 21 stores"],
    ["src/services/calculations.ts","EMI / amortization / budget / health-score math"],
    ["src/services/alertsEngine.ts","Idempotent alert generator"],
    ["src/lib/cloud/{auth,http}.ts","Cloud client + JWT attach"],
    ["php/index.php · php/routes.php","Router"],
    ["php/helpers/auth.php","JWT sign/verify, login throttling"],
    ["php/helpers/payments.php","Razorpay HMAC verify"],
    ["php/helpers/security.php","CORS, rate limits, client_ip"],
    ["api/payments/razorpay/webhook.php","Webhook handler"],
    ["api/cloud/sync/{push,pull}.php","Bulk sync"],
    ["sql/schema.sql · sql/20260427_p0_saas_mvp.sql","Core + SaaS schema"],
    [".htaccess","Web-server config (SPA fallback today, security headers TBD)"],
    ["release/hosting-bundle/","Deployable artefact (needs sanitization)"],
  ];
  const tc = (text, w, opts={}) => new TableCell({ width:{ size:w, type:WidthType.DXA }, borders,
    margins:{ top:60, bottom:60, left:120, right:120 },
    children:[ new Paragraph({ children:[ new TextRun({ text, ...opts }) ]}) ] });
  return new Table({
    width:{ size:9360, type:WidthType.DXA },
    columnWidths:[3500, 5860],
    rows:[
      new TableRow({ tableHeader:true, children:[
        new TableCell({ width:{ size:3500, type:WidthType.DXA }, borders, shading:{ fill:"F3F4F6", type: ShadingType.CLEAR },
          margins:{ top:60, bottom:60, left:120, right:120 },
          children:[ new Paragraph({ children:[ new TextRun({ text:"File", bold:true }) ]}) ] }),
        new TableCell({ width:{ size:5860, type:WidthType.DXA }, borders, shading:{ fill:"F3F4F6", type: ShadingType.CLEAR },
          margins:{ top:60, bottom:60, left:120, right:120 },
          children:[ new Paragraph({ children:[ new TextRun({ text:"Purpose", bold:true }) ]}) ] }),
      ]}),
      ...data.map(([f,p]) => new TableRow({ children:[ tc(f, 3500, { font:"Consolas", size:18 }), tc(p, 5860) ] }))
    ]
  });
}

function threatTable() {
  const data = [
    ["JWT secret","Token forgery","HS256 + env var","Shipped example in bundle (A2)"],
    ["User PIN","Brute force","bcrypt cost 12 + throttling","4-digit minimum (A7)"],
    ["Session token","XSS exfiltration","HTTPS-only (when enforced)","localStorage + no CSP (A3, A12)"],
    ["Razorpay webhook","Forgery / replay","HMAC + event_id UNIQUE","No user-id guard (A21)"],
    ["Admin actions","Privilege escalation","DB-backed role + audit log","None"],
    ["User data at rest","DB compromise","App-level access controls","No PII encryption (F5)"],
    ["Backups","Loss / corruption","Scripts exist","Not scheduled (E5)"],
  ];
  const tc = (text, w, opts={}) => new TableCell({ width:{ size:w, type:WidthType.DXA }, borders,
    margins:{ top:60, bottom:60, left:120, right:120 },
    children:[ new Paragraph({ children:[ new TextRun({ text, ...opts }) ]}) ] });
  return new Table({
    width:{ size:9360, type:WidthType.DXA },
    columnWidths:[1800, 2200, 2680, 2680],
    rows:[
      new TableRow({ tableHeader:true, children:["Asset","Threat","Current control","Gap"].map((h,i) =>
        new TableCell({ width:{ size:[1800,2200,2680,2680][i], type:WidthType.DXA }, borders,
          shading:{ fill:"F3F4F6", type: ShadingType.CLEAR }, margins:{ top:60, bottom:60, left:120, right:120 },
          children:[ new Paragraph({ children:[ new TextRun({ text:h, bold:true }) ]}) ] })) }),
      ...data.map(row => new TableRow({ children: row.map((c,i) => tc(c, [1800,2200,2680,2680][i])) }))
    ]
  });
}

// ─── Write file ──────────────────────────────────────────────────────
const outPath = path.resolve(process.cwd(), "AUDIT_REPORT_MVP.docx");
Packer.toBuffer(buildDoc()).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log(`✓ Wrote ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
}).catch((err) => {
  console.error("✗ Failed to build DOCX:", err);
  process.exit(1);
});
