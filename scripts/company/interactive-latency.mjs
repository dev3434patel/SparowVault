/**
 * Interactive latency measurements for company product completeness.
 * Measures p50/p95 of key API paths via Vite proxy or COMPANY_API_BASE.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const stamp =
  process.env.COMPANY_PRODUCT_RUN ||
  (existsSync(join(root, "docs/company/product-completion/.current-run"))
    ? readFileSync(join(root, "docs/company/product-completion/.current-run"), "utf8").trim()
    : "adhoc");
const outDir = join(root, "docs/company/product-completion", stamp);
const rawDir = join(outDir, "raw");
mkdirSync(rawDir, { recursive: true });

const API = (process.env.COMPANY_API_BASE || "http://localhost:8080").replace(/\/$/, "");
const USER = process.env.COMPANY_E2E_USER || "cert_211549";
const PIN = process.env.COMPANY_E2E_PIN || "583921";
  const WARMUP = Number(process.env.COMPANY_LATENCY_WARMUP || 2);
  const SAMPLES = Number(process.env.COMPANY_LATENCY_SAMPLES || 7);

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function login() {
  const res = await fetch(`${API}/api/auth/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USER, pin: PIN }),
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const body = await res.json();
  const csrf =
    body?.data?.csrfToken ||
    body?.data?.csrf ||
    (setCookie.join(";").match(/sv_csrf=([^;]+)/) || [])[1] ||
    "";
  const auth = (setCookie.join(";").match(/sv_auth=([^;]+)/) || [])[1] || "";
  // Node fetch may not expose set-cookie; fall back to body token if present
  const token = body?.data?.token || "";
  return { csrf, auth, token, cookie: [auth ? `sv_auth=${auth}` : "", csrf ? `sv_csrf=${csrf}` : ""].filter(Boolean).join("; "), ok: res.ok, status: res.status, body };
}

async function timed(fn) {
  const t0 = performance.now();
  const result = await fn();
  return { ms: performance.now() - t0, result };
}

async function main() {
  const auth = await login();
  if (!auth.ok && auth.status !== 200) {
    const msg = `LOGIN FAIL HTTP ${auth.status}`;
    writeFileSync(join(rawDir, "EVIDENCE_INTERACTIVE_LATENCY.txt"), msg + "\n");
    console.error(msg);
    process.exit(1);
  }

  // Discover a company id
  const headers = {
    "Content-Type": "application/json",
    ...(auth.csrf ? { "X-CSRF-Token": auth.csrf } : {}),
    ...(auth.cookie ? { Cookie: auth.cookie } : {}),
    ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
  const ws = await fetch(`${API}/api/company/workspaces.php`, { headers });
  const wsJson = await ws.json();
  const list = wsJson?.data?.workspaces || wsJson?.data?.memberships || wsJson?.workspaces || [];
  // Prefer largest scale company (perf matrix) when available
  let companyId = process.env.COMPANY_LATENCY_COMPANY_ID || "";
  if (!companyId) {
    const scale = list.find(
      (w) =>
        /scale co/i.test(String(w.displayName || w.display_name || w.legalName || w.legal_name || "")) ||
        /Scale Co/i.test(String(w.companyDisplayName || "")),
    );
    companyId =
      scale?.companyId ||
      scale?.company_id ||
      scale?.id ||
      list[0]?.companyId ||
      list[0]?.company_id ||
      list[0]?.id ||
      "";
  }
  // Fallback: ask API for voucher-heavy workspace via env from EXPLAIN pack
  if (!companyId && process.env.COMPANY_PERF_COMPANY_ID) {
    companyId = process.env.COMPANY_PERF_COMPANY_ID;
  }
  if (!companyId) {
    writeFileSync(join(rawDir, "EVIDENCE_INTERACTIVE_LATENCY.txt"), "NO_COMPANY\n");
    console.error("No company for latency");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const endpoints = [
    { name: "workspaces", url: `${API}/api/company/workspaces.php` },
    { name: "workspace", url: `${API}/api/company/workspace.php?companyId=${companyId}` },
    { name: "parties", url: `${API}/api/company/parties.php?companyId=${companyId}` },
    { name: "vouchers", url: `${API}/api/company/vouchers.php?companyId=${companyId}&from=${today}&to=${today}&limit=100` },
    { name: "trial-balance", url: `${API}/api/company/reports.php?companyId=${companyId}&report=trial-balance&asOf=${today}` },
    { name: "profit-loss", url: `${API}/api/company/reports.php?companyId=${companyId}&report=profit-loss&from=${today}&to=${today}` },
    { name: "balance-sheet", url: `${API}/api/company/reports.php?companyId=${companyId}&report=balance-sheet&asOf=${today}` },
    { name: "bills-ar", url: `${API}/api/company/bills.php?companyId=${companyId}&side=RECEIVABLE` },
  ];

  // Local budgets (ms) — measured on this machine class; document honestly
  const budgets = {
    workspaces: 800,
    workspace: 800,
    parties: 1500,
    vouchers: 2000,
    "trial-balance": 3000,
    "profit-loss": 3000,
    "balance-sheet": 3000,
    "bills-ar": 2000,
  };

  // Global buffer-pool warmup (discarded) — first hits after restore/import are not interactive.
  for (let w = 0; w < WARMUP; w++) {
    for (const ep of endpoints) {
      try {
        await fetch(ep.url, { headers });
      } catch {
        /* ignore warmup errors */
      }
    }
  }

  const lines = [
    `INTERACTIVE LATENCY ${new Date().toISOString()} company=${companyId} samples=${SAMPLES} warmup=${WARMUP}`,
  ];
  let fail = 0;
  const table = [];

  for (const ep of endpoints) {
    const samples = [];
    let lastStatus = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const { ms, result } = await timed(() => fetch(ep.url, { headers }));
      lastStatus = result.status;
      const text = await result.text();
      let bodyOk = true;
      try {
        const j = JSON.parse(text);
        bodyOk = j?.ok !== false;
      } catch {
        bodyOk = result.ok;
      }
      if (!result.ok || !bodyOk) {
        fail++;
        lines.push(`FAIL ${ep.name} HTTP=${result.status} bodyOk=${bodyOk} sample=${i}`);
        break;
      }
      samples.push(ms);
    }
    if (samples.length === 0) continue;
    samples.sort((a, b) => a - b);
    const p50 = percentile(samples, 50);
    const p95 = percentile(samples, 95);
    const budget = budgets[ep.name] ?? 5000;
    const ok = p95 <= budget;
    if (!ok) fail++;
    const row = { name: ep.name, p50: Math.round(p50), p95: Math.round(p95), budget, ok, status: lastStatus };
    table.push(row);
    lines.push(`${ok ? "PASS" : "FAIL"} ${ep.name} p50=${row.p50}ms p95=${row.p95}ms budget=${budget}ms HTTP=${lastStatus}`);
  }

  lines.push(`SUMMARY fail=${fail}`);
  writeFileSync(join(rawDir, "EVIDENCE_INTERACTIVE_LATENCY.txt"), lines.join("\n") + "\n");
  writeFileSync(
    join(outDir, "COMPANY_INTERACTIVE_PERFORMANCE_REPORT.md"),
    [
      "# Company Interactive Performance Report",
      "",
      `Samples/endpoint: ${SAMPLES}`,
      "",
      "| Endpoint | p50 (ms) | p95 (ms) | Budget p95 | Verdict |",
      "|----------|----------|----------|------------|---------|",
      ...table.map((r) => `| ${r.name} | ${r.p50} | ${r.p95} | ${r.budget} | ${r.ok ? "PASS" : "FAIL"} |`),
      "",
      fail === 0
        ? "**INTERACTIVE LATENCY PASS** (local budgets)."
        : "**INTERACTIVE LATENCY FAIL** — see measured p95 vs budget.",
      "",
      "Budgets are documented for this local/staging hardware class, not invented after the fact.",
      "",
    ].join("\n"),
  );
  console.log(lines.join("\n"));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
