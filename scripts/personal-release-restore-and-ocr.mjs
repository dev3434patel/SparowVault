/**
 * Copy sparowvault_test into a second disposable database and run the packaged
 * OCR language data. Writes evidence only under the release-run directory.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createWorker } from "tesseract.js";
import mysql from "mysql2/promise";

const source = "sparowvault_test";
const drill = "sparowvault_test_restore_0048c3";
const evidence = "docs/release-runs/20261003-personal-os-0048c3/LOCAL_CLOSE_EVIDENCE.json";

function refuse(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (normalized === "sparowvault" || !normalized.includes("test")) {
    throw new Error(`refusing database ${name || ""}`);
  }
}
refuse(source);
refuse(drill);

function envFile(name) {
  const text = readFileSync(".env.local", "utf8");
  const line = text.split(/\r?\n/).find((row) => row.startsWith(`${name}=`));
  if (!line) return "";
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
}

const report = {
  source,
  drill,
  restoreOk: false,
  ocrOk: false,
  zipSha256: createHash("sha256").update(readFileSync("release/hosting-bundle.zip")).digest("hex").toUpperCase(),
};

function clean(value) {
  return String(value ?? "").trim().replace(/^["']|["']$/g, "");
}
const root = await mysql.createConnection({
  host: clean(process.env.DB_HOST || envFile("DB_HOST") || "127.0.0.1"),
  user: clean(process.env.DB_USER || envFile("DB_USER") || "root"),
  password: clean(process.env.DB_PASS ?? envFile("DB_PASS")),
  port: Number(clean(process.env.DB_PORT || envFile("DB_PORT") || "3306")),
  multipleStatements: true,
});
const [identity] = await root.query("SELECT DATABASE() AS current_db");
report.connectedWithoutSelectingOwner = identity[0]?.current_db == null || String(identity[0].current_db).includes("test");

async function counts(db) {
  const [tables] = await root.query(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?",
    [db],
  );
  const out = {};
  for (const row of tables) {
    const name = row.t || row.TABLE_NAME || row.table_name;
    const [found] = await root.query(`SELECT COUNT(*) AS c FROM \`${db}\`.\`${name}\``);
    out[name] = Number(found[0].c);
  }
  return out;
}

const before = await counts(source);
await root.query(`DROP DATABASE IF EXISTS \`${drill}\``);
await root.query(`CREATE DATABASE \`${drill}\``);
for (const table of Object.keys(before)) {
  await root.query(`CREATE TABLE \`${drill}\`.\`${table}\` LIKE \`${source}\`.\`${table}\``);
  await root.query(`INSERT INTO \`${drill}\`.\`${table}\` SELECT * FROM \`${source}\`.\`${table}\``);
}
const after = await counts(drill);
const mismatched = Object.keys(before).filter((table) => before[table] !== after[table]);
report.tableCount = Object.keys(before).length;
report.mismatched = mismatched;
report.restoreOk = mismatched.length === 0 && report.tableCount > 0;
await root.end();

const worker = await createWorker("eng", 1, {
  langPath: "release/hosting-bundle/ocr/7.0.0",
  corePath: "release/hosting-bundle/ocr/7.0.0",
  cachePath: ".local/ocr-close-cache",
  gzip: false,
});
try {
  const image = readFileSync("docs/statement-evidence/2026-09-10/screenshots/ocr-clean.pdf.png");
  const result = await worker.recognize(image);
  const text = String(result.data.text || "");
  report.ocrCharacters = text.length;
  report.ocrSawAmount = /\d/.test(text);
  report.ocrOk = text.length > 20 && report.ocrSawAmount;
} finally {
  await worker.terminate();
}

writeFileSync(evidence, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ restoreOk: report.restoreOk, tableCount: report.tableCount, ocrOk: report.ocrOk, ocrCharacters: report.ocrCharacters, zipSha256: report.zipSha256 }));
if (!report.restoreOk || !report.ocrOk) process.exit(1);
