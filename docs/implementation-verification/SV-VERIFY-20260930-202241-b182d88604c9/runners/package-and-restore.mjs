import { spawn } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const root = process.cwd();
const runDir = path.join(root, "docs", "implementation-verification", "SV-VERIFY-20260930-202241-b182d88604c9");
const unpacked = path.join(runDir, "package-extract", "unpacked");
const SOURCE = "sparowvault_test_svverify_b182d886";
const RESTORE = "sparowvault_test_svverify_b182d886_restore";

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const secretHits = [];
const patterns = [
  { name: "private-key", re: /BEGIN (RSA |OPENSSH )?PRIVATE KEY/ },
  { name: "aws-key", re: /AKIA[0-9A-Z]{16}/ },
  { name: "razorpay-live", re: /rzp_live_[A-Za-z0-9]+/ },
  { name: "jwt-like", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\./ },
];
for (const file of walk(unpacked)) {
  const rel = path.relative(unpacked, file).replaceAll("\\", "/");
  if (rel.endsWith(".wasm") || rel.endsWith(".traineddata") || statSync(file).size > 2_000_000) continue;
  let text = "";
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  if (text.includes("\u0000")) continue;
  for (const pattern of patterns) {
    if (pattern.re.test(text)) secretHits.push({ file: rel, kind: pattern.name });
  }
}
const envHost = readFileSync(path.join(unpacked, ".env.host"), "utf8");
const envKeys = {};
for (const line of envHost.split(/\r?\n/)) {
  const trim = line.trim();
  if (!trim || trim.startsWith("#") || !trim.includes("=")) continue;
  const i = trim.indexOf("=");
  const key = trim.slice(0, i).trim();
  const value = trim.slice(i + 1).trim();
  envKeys[key] = { empty: value === "" || value === "CHANGEME" || value.includes("change-me") || value.includes("xxxxxxxx"), length: value.length };
}

const asset = walk(path.join(unpacked, "assets")).find((file) => file.endsWith(".js"));
const mjs = walk(unpacked).find((file) => file.endsWith(".mjs"));
const server = spawn("php", ["-S", "127.0.0.1:8097", "-t", unpacked], {
  cwd: unpacked,
  env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP },
  windowsHide: true,
});
await new Promise((resolve) => setTimeout(resolve, 800));

async function probe(urlPath) {
  try {
    const response = await fetch("http://127.0.0.1:8097" + urlPath);
    const type = response.headers.get("content-type");
    const body = await response.text();
    return { path: urlPath, status: response.status, contentType: type, bodyStart: body.slice(0, 180).replace(/\s+/g, " ") };
  } catch (error) {
    return { path: urlPath, error: String(error.message || error) };
  }
}

const probes = [];
probes.push(await probe("/"));
probes.push(await probe("/index.html"));
probes.push(await probe("/company/app/invoices"));
probes.push(await probe("/api/healthz.php"));
if (asset) probes.push(await probe("/" + path.relative(unpacked, asset).replaceAll("\\", "/")));
if (mjs) probes.push(await probe("/" + path.relative(unpacked, mjs).replaceAll("\\", "/")));
server.kill();

function envFile(file) {
  const text = readFileSync(path.join(root, file), "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trim = line.trim();
    if (!trim || trim.startsWith("#") || !trim.includes("=")) continue;
    const i = trim.indexOf("=");
    let val = trim.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[trim.slice(0, i).trim()] = val;
  }
  return out;
}
const local = envFile(".env.local");
const admin = await mysql.createConnection({
  host: local.DB_HOST || "127.0.0.1",
  port: Number(local.DB_PORT || 3306),
  user: local.DB_USER,
  password: local.DB_PASS || "",
  multipleStatements: true,
});
const [srcDb] = await admin.query("SELECT DATABASE() AS db");
void srcDb;
await admin.query(`CREATE DATABASE IF NOT EXISTS \`${RESTORE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
const source = await mysql.createConnection({
  host: local.DB_HOST || "127.0.0.1",
  port: Number(local.DB_PORT || 3306),
  user: local.DB_USER,
  password: local.DB_PASS || "",
  database: SOURCE,
});
const target = await mysql.createConnection({
  host: local.DB_HOST || "127.0.0.1",
  port: Number(local.DB_PORT || 3306),
  user: local.DB_USER,
  password: local.DB_PASS || "",
  database: RESTORE,
  multipleStatements: true,
});
const [tables] = await source.query("SHOW TABLES");
const names = tables.map((row) => Object.values(row)[0]);
await target.query("SET FOREIGN_KEY_CHECKS=0");
for (const name of names) {
  const [createRows] = await source.query(`SHOW CREATE TABLE \`${name}\``);
  const createSql = Object.values(createRows[0])[1];
  await target.query(`DROP TABLE IF EXISTS \`${name}\``);
  await target.query(createSql);
  const [rows] = await source.query(`SELECT * FROM \`${name}\``);
  if (rows.length === 0) continue;
  const columns = Object.keys(rows[0]);
  const placeholders = rows.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
  const flat = [];
  for (const row of rows) for (const column of columns) flat.push(row[column]);
  await target.query(
    `INSERT INTO \`${name}\` (${columns.map((column) => `\`${column}\``).join(",")}) VALUES ${placeholders}`,
    flat,
  );
}
await target.query("SET FOREIGN_KEY_CHECKS=1");
const [sourceCount] = await source.query("SELECT COUNT(*) AS c FROM company_vouchers");
const [restoreCount] = await target.query("SELECT COUNT(*) AS c FROM company_vouchers");
const [restoreName] = await target.query("SELECT DATABASE() AS db");
await source.end();
await target.end();
const [owner] = await admin.query(
  "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ?",
  [local.DB_NAME],
);
await admin.end();

const report = {
  secretHitCount: secretHits.length,
  secretHits,
  envHostKeys: envKeys,
  probes,
  restore: {
    source: SOURCE,
    target: restoreName[0].db,
    targetContainsTest: /test/i.test(restoreName[0].db),
    sourceVouchers: Number(sourceCount[0].c),
    restoredVouchers: Number(restoreCount[0].c),
    match: Number(sourceCount[0].c) === Number(restoreCount[0].c),
    ownerSchemaStillPresent: Number(owner[0].c) > 0,
  },
};
writeFileSync(path.join(runDir, "package-restore.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  secretHitCount: report.secretHitCount,
  probes: probes.map((row) => ({ path: row.path, status: row.status, contentType: row.contentType })),
  restoreMatch: report.restore.match,
  vouchers: report.restore.restoredVouchers,
}, null, 2));
