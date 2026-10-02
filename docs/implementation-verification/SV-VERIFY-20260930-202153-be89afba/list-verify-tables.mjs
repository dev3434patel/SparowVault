import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "sparowvault_verify_test",
});
const [rows] = await conn.query("SHOW TABLES");
const names = rows.map((r) => String(Object.values(r)[0]));
const company = names.filter((n) => n.startsWith("company_"));
console.log("tableCount=" + names.length);
console.log("companyCount=" + company.length);
console.log(company.slice(0, 40).join("\n"));
await conn.end();
