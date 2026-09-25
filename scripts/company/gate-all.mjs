/**
 * Aggregate company gate — runs specialized gates; fails on skip of critical.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const gates = [
  "accounting",
  "parties",
  "vouchers",
  "bills",
  "reports",
  "rbac",
  "security",
  "exports",
  "migration",
  "api",
  "browser",
  "performance",
];

let pass = 0;
let fail = 0;
const lines = [`# COMPANY GATE ALL\n`, `Generated: ${new Date().toISOString()}\n\n`];

for (const g of gates) {
  console.log(`\n===== company:gate:${g} =====`);
  const r = spawnSync("node", ["scripts/company/gate-specialized.mjs", g], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status === 0) {
    pass++;
    lines.push(`- ${g}: PASS\n`);
  } else {
    fail++;
    lines.push(`- ${g}: FAIL\n`);
  }
}

mkdirSync(join(root, "docs/company/evidence"), { recursive: true });
writeFileSync(join(root, "docs/company/evidence/GATE_ALL.md"), lines.join("") + `\n${pass} pass · ${fail} fail\n`);

if (fail > 0) {
  console.error(`\n❌ company:gate:all FAILED (${fail})`);
  process.exit(1);
}
console.log(`\n✅ company:gate:all (${pass} pass)`);
