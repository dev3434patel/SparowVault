/**
 * Specialized company gates — real evidence runners.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const gate = process.argv[2] || "accounting";

function run(cmd, args, label) {
  console.log(`  • [${gate}] ${label} …`);
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: true });
  const out = (r.stdout || "") + (r.stderr || "");
  if (r.status !== 0) {
    console.error(out);
    console.error(`❌ FAIL ${label}`);
    process.exit(1);
  }
  console.log(`✅ ${label}`);
  return out;
}

function assertFile(rel, label) {
  console.log(`  • [${gate}] ${label} …`);
  if (!existsSync(join(root, rel))) {
    console.error(`❌ FAIL ${label}: missing ${rel}`);
    process.exit(1);
  }
  console.log(`✅ ${label}`);
  return `ok ${rel}\n`;
}

const evidenceDir = join(root, "docs/company/evidence");
mkdirSync(evidenceDir, { recursive: true });
let log = `GATE ${gate} ${new Date().toISOString()}\n`;

switch (gate) {
  case "accounting":
    log += run("npm", ["run", "company:test"], "TS accounting unit");
    log += run("php", ["scripts/company/php-tests/run-accounting.php"], "PHP purpose/property/on-account");
    log += run("php", ["scripts/company/demo-certify.php"], "demo-certify");
    break;
  case "parties":
  case "vouchers":
  case "bills":
  case "outstanding":
    log += run("php", ["scripts/company/demo-certify.php"], "demo");
    log += run("php", ["scripts/company/php-tests/run-accounting.php"], "PHP domain");
    break;
  case "reports":
    log += run("npx", ["vitest", "run", "src/company/services/__tests__/reportEngine.test.ts"], "reportEngine");
    log += run("php", ["scripts/company/demo-certify.php"], "TB/BS");
    break;
  case "rbac":
  case "permissions":
    log += assertFile("php/helpers/company/authz.php", "authz");
    log += run("php", ["scripts/company/idor-http.php"], "IDOR matrix");
    break;
  case "security":
    log += run("php", ["scripts/company/idor-http.php"], "IDOR");
    log += assertFile("php/helpers/company/authz.php", "sensitive pin helper present");
    break;
  case "exports":
    log += assertFile("php/helpers/company/exports.php", "exports helper");
    log += run("php", ["scripts/company/export-smoke.php"], "branded PDF/DOCX smoke");
    break;
  case "browser":
    log += run("node", ["scripts/company/browser-smoke.mjs"], "browser smoke A-N");
    break;
  case "migration":
    log += run("php", ["scripts/company/probe-db.php"], "probe");
    log += run("php", ["scripts/company/restore-drill.php"], "restore drill checksum");
    break;
  case "performance":
    log += assertFile("sql/migrations/20260923_company_indexes.sql", "indexes SQL");
    {
      const env = { ...process.env, COMPANY_PERF_PARTIES: process.env.COMPANY_PERF_PARTIES || "50", COMPANY_PERF_VOUCHERS: process.env.COMPANY_PERF_VOUCHERS || "80" };
      console.log(`  • [${gate}] perf generator smoke …`);
      const r = spawnSync("php", ["scripts/company/perf-generator.php"], { cwd: root, encoding: "utf8", shell: true, env });
      const out = (r.stdout || "") + (r.stderr || "");
      if (r.status !== 0) {
        console.error(out);
        process.exit(1);
      }
      console.log(`✅ perf generator smoke`);
      log += out;
    }
    break;
  case "api":
    log += run("php", ["scripts/company/http-e2e.php"], "HTTP/domain E2E");
    break;
  default:
    console.error("Unknown gate", gate);
    process.exit(1);
}

writeFileSync(join(evidenceDir, `GATE_${gate.toUpperCase()}.txt`), log);
console.log(`\n✅ company:gate:${gate} passed`);
