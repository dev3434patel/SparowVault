/**
 * Fail-closed company product completeness orchestrator.
 * Does not replace company:certify:final (accounting).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const stamp =
  process.env.COMPANY_PRODUCT_RUN ||
  (existsSync(join(root, "docs/company/product-completion/.current-run"))
    ? readFileSync(join(root, "docs/company/product-completion/.current-run"), "utf8").trim()
    : new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 15));
const outDir = join(root, "docs/company/product-completion", stamp);
const rawDir = join(outDir, "raw");
mkdirSync(rawDir, { recursive: true });
mkdirSync(join(outDir, "screens/company-product-audit"), { recursive: true });
mkdirSync(join(outDir, "exports"), { recursive: true });
writeFileSync(join(root, "docs/company/product-completion/.current-run"), stamp);

process.env.COMPANY_PRODUCT_RUN = stamp;
process.env.COMPANY_PRODUCT_EVIDENCE_DIR = rawDir;
process.env.COMPANY_E2E_BASEURL = process.env.COMPANY_E2E_BASEURL || "http://localhost:5173";

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
  writeFileSync(evidence, out.slice(-500000));
  const pass = r.status === 0;
  log.push({ label, pass, status: r.status });
  console.log(pass ? `PASS ${label}` : `FAIL ${label} (exit ${r.status})`);
  if (!pass) console.error(out.slice(-1500));
  return pass;
}

const results = {
  accountingGates: run("accounting-gates", "npm", ["run", "company:gate:all"], {
    evidence: "EVIDENCE_ACCOUNTING_GATES.txt",
  }),
  hydrate: run("hydrate-race", "php", ["scripts/company/workspace-hydrate-race.php"], {
    evidence: "EVIDENCE_WORKSPACE_HYDRATE_RACE.txt",
  }),
  exportFidelity: run("export-fidelity", "php", ["scripts/company/export-fidelity-gallery.php"], {
    evidence: "EVIDENCE_EXPORT_FIDELITY.txt",
  }),
  latency: run("interactive-latency", "node", ["scripts/company/interactive-latency.mjs"], {
    evidence: "EVIDENCE_INTERACTIVE_LATENCY.txt",
  }),
  deepBrowser: run("deep-browser", "node", ["scripts/company/certify-product-browser.mjs"], {
    evidence: "EVIDENCE_COMPANY_DEEP_BROWSER.txt",
  }),
  viewportMatrix: run("viewport-matrix", "node", ["scripts/company/viewport-matrix.mjs"], {
    evidence: "EVIDENCE_VIEWPORT_MATRIX.txt",
    timeout: 900000,
  }),
  category: run("category-policy", "npx", ["vitest", "run", "src/company/services/__tests__/categoryAggregation.test.ts"], {
    evidence: "EVIDENCE_CATEGORY_AGGREGATION.txt",
  }),
  personal: run("personal-regression", "npm", ["run", "finance:gate:all"], {
    evidence: "EVIDENCE_PERSONAL_REGRESSION.txt",
  }),
};

const mandatoryPass = Object.values(results).every(Boolean);
const label = mandatoryPass ? "COMPANY PRODUCT COMPLETE" : "CONDITIONAL PRODUCT PASS";

const summary = [
  `# SparowVault Company — Product Certification`,
  ``,
  `**Run:** ${stamp}`,
  `**Label:** **${label}**`,
  ``,
  `| Check | Verdict |`,
  `|-------|---------|`,
  ...log.map((l) => `| ${l.label} | ${l.pass ? "PASS" : "FAIL"} |`),
  ``,
  mandatoryPass
    ? `Accounting core remains certified separately. Product completeness mandatory matrix is green for this run.`
    : `Product certification withheld. Do not issue COMPANY PRODUCT COMPLETE.`,
  ``,
  `**COMPANY PRODUCTION READY** is not issued by this command.`,
  ``,
];

writeFileSync(join(outDir, "SPAROWVAULT_COMPANY_PRODUCT_CERTIFICATION.md"), summary.join("\n"));
writeFileSync(join(root, "docs/company/SPAROWVAULT_COMPANY_PRODUCT_CERTIFICATION.md"), summary.join("\n"));
writeFileSync(join(rawDir, "EVIDENCE_PRODUCT_CERT_SUMMARY.txt"), JSON.stringify({ stamp, label, log }, null, 2));

console.log(`\n=== ${label} ===`);
process.exit(mandatoryPass ? 0 : 1);
