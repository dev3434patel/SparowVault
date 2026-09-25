/**
 * Analyze Vite build — company route chunks + vendor splits.
 * Fail if: any company page chunk > ~250KB gzip, or recharts lives in index.
 */
import { execSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import {
  readdirSync,
  readFileSync,
  mkdirSync,
  appendFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const logPath = join(root, "docs/company/audit/raw/PHASE_08.log");
mkdirSync(dirname(logPath), { recursive: true });

const BUDGET_GZIP = Number(process.env.COMPANY_CHUNK_BUDGET_GZ || 250 * 1024);

console.log("Building…");
execSync("npm run build", { cwd: root, stdio: "inherit" });

const assets = join(root, "dist/assets");
const files = readdirSync(assets).filter((f) => f.endsWith(".js"));
const rows = [];
let fail = 0;
let rechartsChunk = null;
let rechartsInIndex = false;

const companyNameRe =
  /^(DashboardPage|CashFlowChart|PartiesPage|VouchersPage|Quick|Reports|Masters|Receivables|Payables|Ledgers|Approvals|Settings|Audit|Export|Search|Users|CreateCompany|CompanyApp|Invite)/i;

for (const f of files) {
  const raw = readFileSync(join(assets, f));
  const gz = gzipSync(raw).length;
  const isCompanyish = companyNameRe.test(f) || f.startsWith("Company");
  const hasRecharts =
    raw.includes("ResponsiveContainer") && (raw.includes("recharts") || raw.includes("cartesianGrid"));
  if (hasRecharts && /recharts/i.test(f)) rechartsChunk = f;
  if (hasRecharts && /^index-/i.test(f)) {
    rechartsInIndex = true;
    fail++;
  }
  const over = isCompanyish && gz > BUDGET_GZIP;
  // Also enforce budget on dedicated vendor chunks we care about
  const vendorOver = /^(recharts|xlsx|pdfjs|tesseract)-/i.test(f) && gz > BUDGET_GZIP;
  if (over || vendorOver) fail++;
  rows.push({ f, gz, raw: raw.length, over: over || vendorOver, isCompanyish, hasRecharts });
  const tag = over || vendorOver ? "FAIL" : "PASS";
  console.log(`${tag} ${f} gz=${gz}${isCompanyish ? " [company]" : ""}${hasRecharts ? " [recharts]" : ""}`);
}

if (!rechartsChunk && !rows.some((r) => r.hasRecharts && !/^index-/i.test(r.f))) {
  console.log("WARN: no dedicated recharts chunk found");
}

const lines = [
  `BUNDLE ANALYSIS ${new Date().toISOString()}`,
  `budget_gz=${BUDGET_GZIP} company_over=${rows.filter((r) => r.over).length} rechartsInIndex=${rechartsInIndex} rechartsChunk=${rechartsChunk || "n/a"}`,
  ...rows
    .filter((r) => r.isCompanyish || r.hasRecharts || r.gz > 100 * 1024)
    .sort((a, b) => b.gz - a.gz)
    .map((r) => `${r.over ? "OVER" : "ok"} ${r.f} gz=${r.gz}`),
  fail === 0 && !rechartsInIndex
    ? "PASS company chunks ≤250KB gzip; recharts not in index"
    : "FAIL company chunk budget or recharts placement",
];
console.log(lines.join("\n"));
if (!existsSync(logPath)) writeFileSync(logPath, "", "utf8");
appendFileSync(logPath, "\n" + lines.join("\n") + "\n", "utf8");
process.exit(fail === 0 && !rechartsInIndex ? 0 : 1);
