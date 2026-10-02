import fs from "node:fs";
import mysql from "mysql2/promise";

const files = [
  "sql/migrations/20260923_company_core.sql",
  "sql/migrations/20260923_company_indexes.sql",
  "sql/migrations/20260923_company_reversal_fk.sql",
  "sql/migrations/20260923_company_bill_on_account.sql",
  "sql/migrations/20260924_company_perf_indexes.sql",
  "sql/migrations/20260930_company_phase_sv.sql",
  "sql/migrations/20260930_company_branch_url.sql",
];

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  database: "sparowvault_verify_test",
  multipleStatements: true,
});

for (const file of files) {
  const sql = fs.readFileSync(file, "utf8");
  try {
    await conn.query(sql);
    console.log("applied " + file);
  } catch (error) {
    console.log("FAIL " + file + " " + error.message);
    process.exitCode = 1;
  }
}
const [rows] = await conn.query("SHOW TABLES LIKE 'company\\_%'");
console.log("companyTables=" + rows.length);
await conn.end();
