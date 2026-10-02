import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const root = process.cwd();
const runDir = path.join(root, "docs", "implementation-verification", "SV-REPAIR-20261001-013500");
const TARGET = "sparowvault_test_svrepair_20261001";
if (!/test/i.test(TARGET) || !TARGET.includes("svrepair_20261001")) {
  console.error("refusing target");
  process.exit(2);
}

function envFile(file) {
  const text = readFileSync(path.join(root, file), "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trim = line.trim();
    if (!trim || trim.startsWith("#")) continue;
    const i = trim.indexOf("=");
    if (i < 0) continue;
    let val = trim.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[trim.slice(0, i).trim()] = val;
  }
  return out;
}

const local = envFile(".env.local");
const host = local.DB_HOST || "127.0.0.1";
const port = Number(local.DB_PORT || 3306);
const user = local.DB_USER || "root";
const password = local.DB_PASS || "";
const secret = "sv-repair-local-only-20261001-not-production";

const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${TARGET}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.end();

const phpEnv = {
  ...process.env,
  APP_ENV: "test",
  CLOUD_JWT_SECRET: secret,
  CLOUD_JWT_EXPIRES_IN: "1h",
  DATABASE_URL: "",
  DB_HOST: host,
  DB_PORT: String(port),
  DB_USER: user,
  DB_PASS: password,
  DB_NAME: TARGET,
};

const reset = spawnSync(process.execPath, ["scripts/db-test-reset.mjs"], {
  cwd: root,
  env: {
    ...process.env,
    TEST_DATABASE_URL: "",
    TEST_DB_HOST: host,
    TEST_DB_PORT: String(port),
    TEST_DB_USER: user,
    TEST_DB_PASS: password,
    TEST_DB_NAME: TARGET,
  },
  encoding: "utf8",
});
if (reset.status !== 0) {
  console.error(reset.stdout);
  console.error(reset.stderr);
  process.exit(reset.status ?? 1);
}

const migrate = spawnSync("php", ["scripts/company/apply-migration.php"], {
  cwd: root,
  env: phpEnv,
  encoding: "utf8",
});
if (migrate.status !== 0) {
  console.error(migrate.stdout);
  console.error(migrate.stderr);
  process.exit(migrate.status ?? 1);
}

const setup = spawnSync("php", [path.join(runDir, "oracle-company.php"), "setup"], {
  cwd: root,
  env: phpEnv,
  encoding: "utf8",
});
if (setup.status !== 0) {
  console.error(setup.stdout);
  console.error(setup.stderr);
  process.exit(setup.status ?? 1);
}
const sessionLine = setup.stdout.trim().split(/\r?\n/).filter((line) => line.startsWith("{")).at(-1);
const session = JSON.parse(sessionLine);
writeFileSync(path.join(runDir, "session.json"), JSON.stringify({ companyId: session.companyId, database: session.database }));

const server = spawn("php", ["-S", "127.0.0.1:8098", "-t", root], {
  cwd: root,
  env: phpEnv,
  stdio: "ignore",
});
const pid = server.pid;

async function postJson(pathname, body) {
  const response = await fetch("http://127.0.0.1:8098" + pathname, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + session.token,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text.slice(0, 500) }; }
  return { status: response.status, body: parsed };
}

let serverUp = false;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const probe = await fetch("http://127.0.0.1:8098/api/health.php");
    await probe.text();
    serverUp = true;
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
if (!serverUp) {
  try { server.kill(); } catch { /* already gone */ }
  console.error("php server did not start");
  process.exit(1);
}

const calls = [];
calls.push(["bridge", await postJson("/api/company/bridge.php", {
  companyId: session.companyId,
  amountPaise: 750000,
  personalEntityId: session.personalEntityId,
  voucherDate: "2026-09-30",
})]);
calls.push(["bridge-again", await postJson("/api/company/bridge.php", {
  companyId: session.companyId,
  amountPaise: 750000,
  personalEntityId: session.personalEntityId,
  voucherDate: "2026-09-30",
})]);
calls.push(["cheque-issue", await postJson("/api/company/cheque-match.php", {
  companyId: session.companyId,
  action: "issue",
  amountPaise: 2500000,
  voucherDate: "2026-09-30",
})]);
const chequeId = calls[2][1].body?.data?.chequeId ?? "";
calls.push(["cheque-clear", await postJson("/api/company/cheque-match.php", {
  companyId: session.companyId,
  action: "clear",
  chequeId,
  voucherDate: "2026-09-30",
})]);
calls.push(["cheque-clear-again", await postJson("/api/company/cheque-match.php", {
  companyId: session.companyId,
  action: "clear",
  chequeId,
  voucherDate: "2026-09-30",
})]);
const created = await postJson("/api/company/items.php", {
  companyId: session.companyId,
  action: "create",
  name: "Repair widget",
  kind: "STOCK",
});
calls.push(["item-create", created]);
const itemId = created.body?.data?.item?.id ?? "";
calls.push(["item-buy", await postJson("/api/company/items.php", {
  companyId: session.companyId,
  action: "buy",
  itemId,
  qty: 2,
  unit: 10000,
  voucherDate: "2026-09-30",
})]);
calls.push(["item-sell", await postJson("/api/company/items.php", {
  companyId: session.companyId,
  action: "sell",
  itemId,
  qty: 1,
  unit: 15000,
  voucherDate: "2026-09-30",
})]);
const beforeFee = spawnSync("php", [path.join(runDir, "oracle-company.php"), "measure", session.companyId], {
  cwd: root,
  env: phpEnv,
  encoding: "utf8",
});

const feeIssue = await postJson("/api/company/cheque-match.php", {
  companyId: session.companyId,
  action: "issue",
  amountPaise: 1000,
  feePaise: 250,
  voucherDate: "2026-09-30",
});
calls.push(["fee-issue", feeIssue]);
const feeClear = await postJson("/api/company/cheque-match.php", {
  companyId: session.companyId,
  action: "clear",
  chequeId: feeIssue.body?.data?.chequeId ?? "",
  voucherDate: "2026-09-30",
});
calls.push(["fee-clear", feeClear]);

const health = await fetch("http://127.0.0.1:8098/api/health.php");
const healthz = await fetch("http://127.0.0.1:8098/api/healthz.php");
const healthBody = await health.json();
const healthzBody = await healthz.json();

const measure = spawnSync("php", [path.join(runDir, "oracle-company.php"), "measure", session.companyId], {
  cwd: root,
  env: phpEnv,
  encoding: "utf8",
});

try { process.kill(pid); } catch { /* server already gone */ }

const summary = {
  database: TARGET,
  calls: calls.map(([name, result]) => ({
    name,
    status: result.status,
    ok: result.body?.ok ?? false,
    error: result.body?.error ?? null,
    code: result.body?.code ?? null,
    posted: result.body?.data?.posted ?? null,
    state: result.body?.data?.state ?? result.body?.data?.item?.qty ?? null,
    bankDelta: result.body?.data?.bankDelta ?? null,
  })),
  health: { status: health.status, body: healthBody },
  healthz: { status: healthz.status, body: healthzBody },
  measureBeforeFee: beforeFee.stdout,
  measure: measure.stdout,
  measureErr: measure.stderr,
  measureExit: measure.status,
};
const migrateAgain = spawnSync("php", ["scripts/company/apply-migration.php"], {
  cwd: root,
  env: phpEnv,
  encoding: "utf8",
});
summary.reapply = {
  exitCode: migrateAgain.status,
  tail: (migrateAgain.stdout || "").split(/\r?\n/).slice(-8),
};
writeFileSync(path.join(runDir, "oracle-results.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(measure.status === 0 ? 0 : 1);
