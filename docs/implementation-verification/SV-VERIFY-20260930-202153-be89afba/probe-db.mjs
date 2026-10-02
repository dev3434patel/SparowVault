import fs from "node:fs";
import mysql from "mysql2/promise";

const text = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of text.split(/\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

const name = env.DB_NAME || "";
const url = env.DATABASE_URL || "";
let urlDb = "";
if (url.startsWith("mysql://")) {
  try {
    urlDb = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    urlDb = "";
  }
}
const target = urlDb || name;
const safe = /test/i.test(target);
const summary = {
  hasDatabaseUrl: Boolean(url),
  hasDbName: Boolean(name),
  configuredTargetContainsTest: safe,
  configuredTargetLength: target.length,
};
console.log(JSON.stringify(summary));

const host = env.DB_HOST || "127.0.0.1";
const user = env.DB_USER || "root";
const password = env.DB_PASS || "";
const port = Number(env.DB_PORT || 3306);

try {
  const conn = await mysql.createConnection({ host, port, user, password });
  console.log("MYSQL_CONNECT=ok");
  const [rows] = await conn.query("SHOW DATABASES");
  const names = rows.map((r) => String(Object.values(r)[0]));
  const testDbs = names.filter((n) => /test/i.test(n) && !/information_schema|performance_schema/i.test(n));
  console.log("TEST_DB_COUNT=" + testDbs.length);
  console.log("TEST_DB_NAMES=" + testDbs.join(","));
  await conn.end();
} catch (e) {
  console.log("MYSQL_CONNECT=fail");
  console.log("MYSQL_ERR=" + String(e.message).replace(/using password: \w+/i, "using password: [hidden]"));
}
