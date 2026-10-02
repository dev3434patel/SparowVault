import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const root = process.cwd();
const runDir = path.join(root, "docs", "implementation-verification", "SV-VERIFY-20260930-202241-b182d88604c9");
mkdirSync(path.join(runDir, "command-logs"), { recursive: true });
const TARGET = "sparowvault_test_svverify_b182d886";
const SENTINEL = "svverify_b182d886";
if (!/test/i.test(TARGET) || !TARGET.includes(SENTINEL)) {
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
const ownerName = local.DB_NAME || "";
if (!/test/i.test(ownerName) && ownerName) {
  // owner name recorded only as a non-test flag, never used as the mutation target
}

const evidence = {
  ownerDbContainsTest: /test/i.test(ownerName),
  target: TARGET,
  targetContainsTest: true,
  sentinel: SENTINEL,
  host,
  port,
};

const urlEnv = { ...process.env, TEST_DATABASE_URL: "mysql://audit@127.0.0.1:1/sparowvault_owner_books" };
for (const key of ["TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASS", "TEST_DB_NAME"]) delete urlEnv[key];
const urlProbe = spawnSync(process.execPath, ["scripts/db-test-reset.mjs"], {
  cwd: root,
  env: urlEnv,
  encoding: "utf8",
});
evidence.urlOnlyBypass = {
  name: "sparowvault_owner_books",
  containsTest: false,
  exitCode: urlProbe.status,
  stderrTail: (urlProbe.stderr || "").slice(0, 500),
  stdoutTail: (urlProbe.stdout || "").slice(0, 500),
  refusedBeforeConnect: /must contain 'test'|Refusing/.test((urlProbe.stderr || "") + (urlProbe.stdout || "")),
};

let conn;
try {
  conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
} catch (error) {
  evidence.mysql = { ok: false, message: String(error.message || error).slice(0, 300) };
  writeFileSync(path.join(runDir, "command-logs", "db-setup.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  process.exit(0);
}

const [before] = await conn.query("SHOW DATABASES");
const names = before.map((row) => Object.values(row)[0]);
evidence.ownerDbPresent = names.includes(ownerName);
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${TARGET}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.end();

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
evidence.reset = {
  exitCode: reset.status,
  stdoutTail: (reset.stdout || "").split(/\r?\n/).slice(-20),
  stderrTail: (reset.stderr || "").slice(0, 800),
};

const verify = await mysql.createConnection({ host, port, user, password, database: TARGET });
const [dbRow] = await verify.query("SELECT DATABASE() AS db");
evidence.connectedDatabase = dbRow[0].db;
const [tables] = await verify.query("SHOW TABLES");
evidence.tableCount = tables.length;
await verify.end();

const ownerConn = await mysql.createConnection({ host, port, user, password, database: ownerName });
const [ownerTables] = await ownerConn.query("SHOW TABLES");
evidence.ownerTableCountAfter = ownerTables.length;
await ownerConn.end();

writeFileSync(path.join(runDir, "command-logs", "db-setup.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({
  target: evidence.connectedDatabase,
  resetExit: evidence.reset.exitCode,
  tableCount: evidence.tableCount,
  urlRefused: evidence.urlOnlyBypass.refusedBeforeConnect,
  urlExit: evidence.urlOnlyBypass.exitCode,
  ownerUntouchedTables: evidence.ownerTableCountAfter,
}, null, 2));
