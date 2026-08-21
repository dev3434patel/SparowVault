#!/usr/bin/env node
/** Safety: drop only databases whose names look like test/cert/drill. */
import mysql from "mysql2/promise";

const host = process.env.DB_HOST || "127.0.0.1";
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASS ?? "";
const port = Number(process.env.DB_PORT || 3306);

const c = await mysql.createConnection({ host, user, password, port });
const [rows] = await c.query("SHOW DATABASES");
const names = rows.map((r) => Object.values(r)[0]);
const kill = names.filter(
  (n) =>
    /^sparowvault_.*(test|drill|cert)/i.test(String(n)) ||
    /^sparowvault_(test|staging_test|restore_drill|local_cert)$/i.test(String(n)),
);
console.log("Dropping:", kill);
for (const db of kill) {
  await c.query(`DROP DATABASE IF EXISTS \`${db}\``);
  console.log("  dropped", db);
}
await c.end();
console.log("Test databases cleared.");
