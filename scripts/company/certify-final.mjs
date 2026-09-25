/**
 * Fail-closed final company certification orchestrator.
 * Exit non-zero if any mandatory blocker is skipped/failed.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const stamp = process.env.COMPANY_CERT_RUN || new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 15);
const outDir = join(root, "docs/company/final-certification", stamp);
const rawDir = join(outDir, "raw");
mkdirSync(rawDir, { recursive: true });
mkdirSync(join(outDir, "screens/browser-a-n"), { recursive: true });

process.env.COMPANY_CERT_RUN = stamp;
process.env.COMPANY_CERT_EVIDENCE_DIR = rawDir;

const log = [];
function run(label, cmd, args, opts = {}) {
  console.log(`\n===== ${label} =====`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: { ...process.env, ...(opts.env || {}) },
    timeout: opts.timeout || 0,
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const evidence = join(rawDir, opts.evidence || `EVIDENCE_${label.replace(/\W+/g, "_").toUpperCase()}.txt`);
  writeFileSync(evidence, out);
  const pass = r.status === 0;
  log.push({ label, pass, status: r.status, evidence: evidence.replace(root + "\\", "").replace(root + "/", "") });
  console.log(pass ? `PASS ${label}` : `FAIL ${label} (exit ${r.status})`);
  if (!pass && opts.mandatory) {
    console.error(out.slice(-2000));
  }
  return pass;
}

const results = {
  unit: run("company-unit", "npm", ["run", "company:test"], { evidence: "EVIDENCE_COMPANY_UNIT.txt", mandatory: true }),
  php: run("company-php", "npm", ["run", "company:test:php"], { evidence: "EVIDENCE_COMPANY_PHP_DOMAIN.txt", mandatory: true }),
  http: run("company-http", "npm", ["run", "company:test:http"], { evidence: "EVIDENCE_COMPANY_API_E2E.txt", mandatory: true }),
  idor: run("company-idor", "npm", ["run", "company:test:idor"], { evidence: "EVIDENCE_COMPANY_IDOR.txt", mandatory: true }),
  category: run("category-agg", "npx", ["vitest", "run", "src/company/services/__tests__/categoryAggregation.test.ts"], {
    evidence: "EVIDENCE_CATEGORY_AGGREGATION.txt",
    mandatory: true,
  }),
  security: run("security-matrix", "php", ["scripts/company/security-matrix.php"], {
    evidence: "EVIDENCE_COMPANY_SECURITY_FULL.txt",
    mandatory: true,
  }),
  restore: run("backup-restore", "php", ["scripts/company/backup-restore-drill.php"], {
    evidence: "EVIDENCE_COMPANY_BACKUP_RESTORE.txt",
    mandatory: true,
  }),
  browserAuth: run("browser-auth-a-n", "node", ["scripts/company/certify-browser-auth.mjs"], {
    evidence: "EVIDENCE_COMPANY_BROWSER_AUTH_A_N.txt",
    mandatory: true,
    env: {
      COMPANY_E2E_BASEURL: process.env.COMPANY_E2E_BASEURL || "http://localhost:5173",
      COMPANY_CERT_RUN: stamp,
    },
  }),
  gates: run("company-gate-all", "npm", ["run", "company:gate:all"], {
    evidence: "EVIDENCE_COMPANY_FINAL_GATES.txt",
    mandatory: true,
  }),
  personal: run("personal-regression", "npm", ["run", "finance:gate:all"], {
    evidence: "EVIDENCE_PERSONAL_REGRESSION.txt",
    mandatory: true,
  }),
};

// 100k is long — allow COMPANY_CERT_SKIP_100K=1 only for local debug; still FAIL-CLOSED for certification
let perf100k = false;
if (process.env.COMPANY_CERT_SKIP_100K === "1") {
  writeFileSync(join(rawDir, "EVIDENCE_COMPANY_100K_PERFORMANCE.txt"), "SKIPPED COMPANY_CERT_SKIP_100K=1\n");
  log.push({ label: "100k-matrix", pass: false, status: 2, evidence: "raw/EVIDENCE_COMPANY_100K_PERFORMANCE.txt" });
  console.log("FAIL 100k-matrix (skipped — not allowed for certification)");
} else {
  perf100k = run("100k-matrix", "php", ["scripts/company/perf-100k-matrix.php"], {
    evidence: "EVIDENCE_COMPANY_100K_PERFORMANCE.txt",
    mandatory: true,
    env: {
      COMPANY_PERF_COMPANIES: process.env.COMPANY_PERF_COMPANIES || "10",
      COMPANY_PERF_VOUCHERS_PER_COMPANY: process.env.COMPANY_PERF_VOUCHERS_PER_COMPANY || "10000",
      COMPANY_PERF_PARTIES_PER_COMPANY: process.env.COMPANY_PERF_PARTIES_PER_COMPANY || "5000",
      COMPANY_PERF_BILLS_PER_COMPANY: process.env.COMPANY_PERF_BILLS_PER_COMPANY || "5000",
    },
  });
}

const mandatoryPass =
  results.unit &&
  results.php &&
  results.http &&
  results.idor &&
  results.category &&
  results.security &&
  results.restore &&
  results.browserAuth &&
  results.gates &&
  results.personal &&
  perf100k;

const label = mandatoryPass ? "ACCOUNTING CORE CERTIFIED" : "CONDITIONAL ACCOUNTING CORE PASS";

const summary = [
  `# SparowVault Company — Final Certification`,
  ``,
  `**Run:** ${stamp}`,
  `**Label:** **${label}**`,
  ``,
  `| Check | Verdict |`,
  `|-------|---------|`,
  ...log.map((l) => `| ${l.label} | ${l.pass ? "PASS" : "FAIL"} |`),
  ``,
  mandatoryPass
    ? `> No known P0/P1 accounting, tenant-isolation, workflow or product defects remain within the completed mandatory certification matrix for this run.`
    : `> Certification withheld. See FAIL rows. Do not treat structural smoke or incomplete 100k as PASS.`,
  ``,
];

writeFileSync(join(outDir, "SPAROWVAULT_COMPANY_FINAL_CERTIFICATION.md"), summary.join("\n"));
writeFileSync(join(root, "docs/company/SPAROWVAULT_COMPANY_FINAL_CERTIFICATION.md"), summary.join("\n"));
writeFileSync(join(rawDir, "EVIDENCE_CERTIFY_FINAL_SUMMARY.txt"), JSON.stringify({ stamp, label, log }, null, 2));

console.log(`\n=== ${label} ===`);
process.exit(mandatoryPass ? 0 : 1);
