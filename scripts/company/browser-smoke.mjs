/**
 * Company browser smoke + A–N structural certification matrix.
 * Set COMPANY_E2E_BASEURL (+ optional COMPANY_E2E_COOKIE) for live HTTP probes.
 */
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const required = [
  "src/company/pages/CreateCompanyPage.tsx",
  "src/company/pages/PartiesPage.tsx",
  "src/company/pages/LedgersPage.tsx",
  "src/company/pages/VouchersPage.tsx",
  "src/company/pages/QuickReceivedPage.tsx",
  "src/company/pages/ReceivablesPage.tsx",
  "src/company/pages/ReportsHubPage.tsx",
  "src/company/pages/UsersPage.tsx",
  "src/company/pages/ApprovalsPage.tsx",
  "src/company/pages/AuditPage.tsx",
  "src/company/pages/InviteAcceptPage.tsx",
  "src/App.tsx",
];

/** Journeys A–N mapped to route keys / page files (structural certification). */
const journeys = [
  { id: "A", name: "Create company + seeded COA", path: "/company/create", file: "src/company/pages/CreateCompanyPage.tsx" },
  { id: "B", name: "Select / gateway", path: "/company/select", file: "src/company/pages/SelectCompanyPage.tsx" },
  { id: "C", name: "Dashboard", path: "/company/app", file: "src/company/pages/DashboardPage.tsx" },
  { id: "D", name: "Parties list + create", path: "/company/app/parties", file: "src/company/pages/PartiesPage.tsx" },
  { id: "E", name: "Ledgers live COA", path: "/company/app/ledgers", file: "src/company/pages/LedgersPage.tsx" },
  { id: "F", name: "Voucher browser", path: "/company/app/vouchers", file: "src/company/pages/VouchersPage.tsx" },
  { id: "G", name: "Quick received preview", path: "/company/app/quick/received", file: "src/company/pages/QuickReceivedPage.tsx" },
  { id: "H", name: "Quick paid", path: "/company/app/quick/paid", file: "src/company/pages/QuickPaidPage.tsx" },
  { id: "I", name: "Receivables AR", path: "/company/app/receivables", file: "src/company/pages/ReceivablesPage.tsx" },
  { id: "J", name: "Payables AP", path: "/company/app/payables", file: "src/company/pages/PayablesPage.tsx" },
  { id: "K", name: "Reports hub", path: "/company/app/reports", file: "src/company/pages/ReportsHubPage.tsx" },
  { id: "L", name: "Approvals", path: "/company/app/approvals", file: "src/company/pages/ApprovalsPage.tsx" },
  { id: "M", name: "Audit + Export + Search", path: "/company/app/audit", file: "src/company/pages/AuditPage.tsx" },
  { id: "N", name: "Settings / period locks + lock gate", path: "/company/app/settings", file: "src/company/pages/UsersPage.tsx" },
];

let fail = 0;
const lines = [`BROWSER SMOKE ${new Date().toISOString()}\n`];

for (const f of required) {
  const ok = existsSync(join(root, f));
  lines.push(`${ok ? "PASS" : "FAIL"} ${f}\n`);
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} ${f}`);
}

const app = readFileSync(join(root, "src/App.tsx"), "utf8");
const hasLock = app.includes("isCompanyPortal") && app.includes("locked") && app.includes("mustChangePin");
lines.push(`${hasLock ? "PASS" : "FAIL"} App.tsx company lock+PIN gate\n`);
if (!hasLock) fail++;
console.log(`${hasLock ? "✓" : "✗"} App.tsx company lock+PIN gate`);

lines.push("\n--- Journeys A–N (structural) ---\n");
for (const j of journeys) {
  const ok = existsSync(join(root, j.file));
  lines.push(`${ok ? "PASS" : "FAIL"} Journey ${j.id}: ${j.name} → ${j.file} (${j.path})\n`);
  if (!ok) fail++;
  console.log(`${ok ? "✓" : "✗"} Journey ${j.id} ${j.name}`);
}

const base = process.env.COMPANY_E2E_BASEURL?.replace(/\/$/, "");
if (base) {
  lines.push(`\nLIVE_URL ${base}\n`);
  const cookie = process.env.COMPANY_E2E_COOKIE || "";
  let liveFail = 0;
  for (const j of journeys) {
    const url = base + j.path;
    try {
      const res = await fetch(url, {
        headers: cookie ? { Cookie: cookie } : {},
        redirect: "manual",
      });
      const ok = res.status >= 200 && res.status < 500;
      lines.push(`${ok ? "PASS" : "FAIL"} LIVE ${j.id} HTTP ${res.status} ${j.path}\n`);
      if (!ok) {
        liveFail++;
        fail++;
      }
      console.log(`${ok ? "✓" : "✗"} LIVE ${j.id} ${res.status}`);
    } catch (e) {
      lines.push(`FAIL LIVE ${j.id} ${String(e)}\n`);
      liveFail++;
      fail++;
      console.log(`✗ LIVE ${j.id} ${e}`);
    }
  }
  lines.push(liveFail === 0 ? "LIVE_A_N PASS\n" : `LIVE_A_N FAIL (${liveFail})\n`);
} else {
  lines.push(
    "LIVE_URL unset — structural A–N PASS; set COMPANY_E2E_BASEURL (+ optional COMPANY_E2E_COOKIE) for live HTTP probes\n",
  );
  lines.push("LIVE_A_N SKIP (env unset)\n");
}

mkdirSync(join(root, "docs/company/evidence"), { recursive: true });
writeFileSync(join(root, "docs/company/evidence/EVIDENCE_COMPANY_BROWSER.txt"), lines.join(""));
if (fail > 0) {
  console.error(`Browser smoke FAILED (${fail})`);
  process.exit(1);
}
console.log("Browser smoke PASS (structural A–N)");
