import mysql from "mysql2/promise";

const password = process.env.TEST_DB_PASS ?? process.env.DB_PASS ?? "";
const user = process.env.TEST_DB_USER || process.env.DB_USER || "root";
try {
  const c = await mysql.createConnection({ host: "127.0.0.1", user, password, port: 3306 });
  const [rows] = await c.query("SHOW DATABASES LIKE 'sparowvault%'");
  console.log(JSON.stringify({ ok: true, user, databases: rows }));
  await c.end();
} catch (e) {
  console.log(JSON.stringify({ ok: false, code: e.code || null, message: String(e.message || e) }));
  process.exit(1);
}
