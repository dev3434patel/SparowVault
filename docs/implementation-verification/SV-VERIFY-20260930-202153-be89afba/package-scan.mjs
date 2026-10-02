import fs from "node:fs";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({ host: "127.0.0.1", user: "root", password: "" });
await conn.query("CREATE DATABASE IF NOT EXISTS sparowvault_verify_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
const [rows] = await conn.query("SHOW TABLES FROM sparowvault_verify_test LIKE 'company\\_%'");
console.log("verifyCompanyTables=" + rows.length);
await conn.end();

const root = "docs/implementation-verification/SV-VERIFY-20260930-202153-be89afba/package/dist";
const hits = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = dir + "/" + entry.name;
    if (entry.isDirectory()) walk(full);
    else {
      const lower = entry.name.toLowerCase();
      if (lower.includes(".env") || lower.endsWith(".sql") || lower.endsWith(".map")) hits.push("name:" + full);
      if (entry.size < 2_000_000 && /\.(js|html|css|json|mjs)$/.test(lower)) {
        const text = fs.readFileSync(full, "utf8");
        if (/sk_live_|BEGIN (RSA |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}/.test(text)) hits.push("secret-pattern:" + full);
      }
    }
  }
}
walk(root);
console.log("secretHits=" + hits.length);
console.log(hits.slice(0, 20).join("\n") || "none");
