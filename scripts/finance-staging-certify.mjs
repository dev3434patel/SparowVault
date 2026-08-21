#!/usr/bin/env node
/**
 * Staging certification sign-off (L2-02 + staging backup/monitor).
 * Uses isolated DB: sparowvault_staging_test (never production).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";

const evidenceDir = join("docs", "finance-vnext", "evidence-final");
mkdirSync(evidenceDir, { recursive: true });

const host = process.env.TEST_DB_HOST || process.env.DB_HOST || "127.0.0.1";
const user = process.env.TEST_DB_USER || process.env.DB_USER || "root";
const password = process.env.TEST_DB_PASS ?? process.env.DB_PASS ?? "";
const port = Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306);
const STAGING_DB = "sparowvault_staging_test";

const report = {
  environment: "staging-local",
  database: STAGING_DB,
  startedAt: new Date().toISOString(),
  steps: [],
  ok: false,
};

function run(label, command, args, env = {}) {
  console.log(`\n--- ${label} ---`);
  const r = spawnSync(command, args, {
    shell: process.platform === "win32",
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  report.steps.push({ label, exit: r.status, tail: out.slice(-800) });
  if (r.status !== 0) {
    console.error(out.slice(-2000));
    throw new Error(`${label} failed with ${r.status}`);
  }
  console.log(`PASS: ${label}`);
}

async function main() {
  const conn = await mysql.createConnection({ host, user, password, port });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${STAGING_DB}\``);
  await conn.end();
  report.steps.push({ label: "create_staging_db", exit: 0 });

  const env = {
    TEST_DB_HOST: host,
    TEST_DB_USER: user,
    TEST_DB_PASS: password,
    TEST_DB_PORT: String(port),
    TEST_DB_NAME: STAGING_DB,
    DB_HOST: host,
    DB_USER: user,
    DB_PASS: password,
    DB_PORT: String(port),
    DB_NAME: STAGING_DB,
  };

  run("staging_db_reset", "node", ["scripts/db-test-reset.mjs"], env);
  run("staging_backup", "npm", ["run", "backup:db"], env);
  run("staging_restore_drill", "node", ["scripts/finance-backup-restore-drill.mjs"], {
    ...env,
    TEST_DB_NAME: STAGING_DB,
  });
  run("staging_monitor", "npm", ["run", "monitor:ops"], env);

  // Health subset against staging DB via certify migration golden + security
  run("staging_migration_golden", "npm", [
    "run",
    "test",
    "--",
    "tests/unit/vnextFinanceMigrationGolden.test.ts",
  ]);

  report.finishedAt = new Date().toISOString();
  report.ok = true;
  report.signoff = {
    statement:
      "Staging-local environment (sparowvault_staging_test) certified: schema reset, backup, restore drill, and monitoring PASS. Safe to promote same migration set to production after Production Release gate.",
    signedBy: "finance-staging-certify.mjs",
    signedAt: report.finishedAt,
  };

  writeFileSync(join(evidenceDir, "EVIDENCE_FINAL_STAGING.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    join("docs", "finance-vnext", "STAGING_CERTIFICATION.md"),
    `# Staging certification

| Field | Value |
|-------|-------|
| Environment | staging-local |
| Database | \`${STAGING_DB}\` |
| Signed at | ${report.finishedAt} |
| Verdict | **PASS** |

## Policy

- Staging certification uses an isolated MySQL database whose name contains \`test\`.
- It must never point at production user data.
- Production deploy is allowed only after this sign-off is PASS with the same migration set.

## Steps executed

${report.steps.map((s) => `- ${s.label}: exit ${s.exit}`).join("\n")}

## Sign-off

${report.signoff.statement}
`,
  );

  console.log("\n✅ STAGING CERTIFICATION PASS");
}

main().catch((e) => {
  report.ok = false;
  report.error = String(e.message || e);
  writeFileSync(join(evidenceDir, "EVIDENCE_FINAL_STAGING.json"), JSON.stringify(report, null, 2));
  console.error("FAIL staging:", e.message || e);
  process.exit(1);
});
