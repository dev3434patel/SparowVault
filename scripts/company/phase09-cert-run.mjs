/**
 * PHASE_09 certification runner — sequential, stop on first red.
 * Usage: node scripts/company/phase09-cert-run.mjs [startFrom]
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rawDir = join(root, "docs/company/audit/raw");
mkdirSync(rawDir, { recursive: true });

const stampFile = join(rawDir, "PHASE_09_stamp.txt");
if (!existsSync(stampFile)) {
  writeFileSync(stampFile, new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 15), "utf8");
}
const stamp = readFileSync(stampFile, "utf8").trim();
const logPath = join(rawDir, "PHASE_09_certification_run.log");
const startFrom = Math.max(1, Number(process.argv[2] || 1));

process.env.COMPANY_CERT_RUN = stamp;
process.env.COMPANY_E2E_USER = process.env.COMPANY_E2E_USER || "cert_211549";
process.env.COMPANY_E2E_PIN = process.env.COMPANY_E2E_PIN || "583921";
process.env.COMPANY_E2E_BASEURL = process.env.COMPANY_E2E_BASEURL || "http://localhost:5173";

function log(line) {
  appendFileSync(logPath, line + "\n", "utf8");
  console.log(line);
}

if (startFrom === 1) {
  writeFileSync(
    logPath,
    `PHASE_09 CERTIFICATION RUN stamp=${stamp} ${new Date().toISOString()}\nUSER=${process.env.COMPANY_E2E_USER} BASEURL=${process.env.COMPANY_E2E_BASEURL}\n`,
    "utf8",
  );
} else {
  log(`\nRESUME from step ${startFrom} ${new Date().toISOString()}`);
}

const steps = [
  { n: 1, name: "company:test", out: "PHASE_09_01_vitest.txt", cmd: "npm", args: ["run", "company:test"] },
  { n: 2, name: "company:test:php", out: "PHASE_09_02_php.txt", cmd: "npm", args: ["run", "company:test:php"] },
  { n: 3, name: "company:test:http", out: "PHASE_09_03_http.txt", cmd: "npm", args: ["run", "company:test:http"] },
  { n: 4, name: "company:test:idor", out: "PHASE_09_04_idor.txt", cmd: "npm", args: ["run", "company:test:idor"] },
  { n: 5, name: "security-matrix", out: "PHASE_09_05_security.txt", cmd: "php", args: ["scripts/company/security-matrix.php"] },
  { n: 6, name: "company:test:hydrate", out: "PHASE_09_06_hydrate.txt", cmd: "npm", args: ["run", "company:test:hydrate"] },
  { n: 7, name: "company:gate:all", out: "PHASE_09_07_gate_all.txt", cmd: "npm", args: ["run", "company:gate:all"] },
  { n: 8, name: "company:test:backup", out: "PHASE_09_08_backup.txt", cmd: "npm", args: ["run", "company:test:backup"] },
  { n: 9, name: "company:test:export:fidelity", out: "PHASE_09_09_export_fidelity.txt", cmd: "npm", args: ["run", "company:test:export:fidelity"] },
  {
    n: 10,
    name: "company:test:latency",
    out: "PHASE_09_10_latency.txt",
    cmd: "node",
    args: ["scripts/company/phase09-latency-wrap.mjs"],
  },
  { n: 11, name: "company:test:browser:auth", out: "PHASE_09_11_browser_auth.txt", cmd: "npm", args: ["run", "company:test:browser:auth"] },
  { n: 12, name: "company:test:product:browser", out: "PHASE_09_12_product_browser.txt", cmd: "npm", args: ["run", "company:test:product:browser"] },
  { n: 13, name: "viewport-matrix", out: "PHASE_09_13_viewport.txt", cmd: "node", args: ["scripts/company/viewport-matrix.mjs"] },
  { n: 14, name: "a11y-keyboard", out: "PHASE_09_14_a11y_keyboard.txt", cmd: "node", args: ["scripts/company/a11y-keyboard.mjs"] },
  { n: 15, name: "i18n-audit", out: "PHASE_09_15_i18n_audit.txt", cmd: "node", args: ["scripts/company/i18n-audit.mjs"] },
  {
    n: 16,
    name: "perf-100k-matrix",
    out: "PHASE_09_16_perf_100k.txt",
    cmd: "php",
    args: ["scripts/company/perf-100k-matrix.php"],
    env: {
      COMPANY_PERF_COMPANIES: "10",
      COMPANY_PERF_VOUCHERS_PER_COMPANY: "10000",
      COMPANY_PERF_PARTIES_PER_COMPANY: "500",
      COMPANY_PERF_BILLS_PER_COMPANY: "500",
    },
  },
  { n: 17, name: "finance:gate:all", out: "PHASE_09_17_finance_gate.txt", cmd: "npm", args: ["run", "finance:gate:all"] },
  { n: 18, name: "company:certify:product", out: "PHASE_09_18_certify_product.txt", cmd: "npm", args: ["run", "company:certify:product"] },
  { n: 19, name: "company:certify:final", out: "PHASE_09_19_certify_final.txt", cmd: "npm", args: ["run", "company:certify:final"] },
];

for (const s of steps) {
  if (s.n < startFrom) {
    console.log(`SKIP step ${s.n} (${s.name})`);
    continue;
  }
  const outPath = join(rawDir, s.out);
  log(`\n===== STEP ${s.n}: ${s.name} =====`);
  log(`START ${new Date().toISOString()}`);
  log(`CMD ${s.cmd} ${s.args.join(" ")}`);
  const t0 = Date.now();
  const r = spawnSync(s.cmd, s.args, {
    cwd: root,
    env: { ...process.env, ...(s.env || {}) },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  const elapsed = Date.now() - t0;
  const body = `${r.stdout || ""}${r.stderr || ""}`;
  writeFileSync(outPath, body, "utf8");
  const code = r.status ?? 1;
  log(`END ${new Date().toISOString()} EXIT=${code} elapsedMs=${elapsed} raw=${s.out}`);
  if (code !== 0) {
    log(`STEP ${s.n} FAIL`);
    log(`HALT at step ${s.n} — fix red before continuing`);
    console.error(body.slice(-4000));
    process.exit(s.n);
  }
  log(`STEP ${s.n} PASS (${(elapsed / 1000).toFixed(1)} sec)`);
}

log(`\nPHASE_09 OVERALL: PASS ${new Date().toISOString()}`);
process.exit(0);
