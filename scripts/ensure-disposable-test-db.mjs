import mysql from "mysql2/promise";
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const TEST_NAME = "sparowvault_test";
const FORBIDDEN = new Set(["sparowvault", "sparowvault_current_schema", "sparowvault_final_merge", "sparowvault_final_sql_validate"]);

if (FORBIDDEN.has(TEST_NAME) || !/test/i.test(TEST_NAME)) {
  console.error("Refusing unsafe database name");
  process.exit(2);
}

const password = process.env.TEST_DB_PASS ?? process.env.DB_PASS ?? "";
const user = process.env.TEST_DB_USER || process.env.DB_USER || "root";
const host = process.env.TEST_DB_HOST || "127.0.0.1";
const port = Number(process.env.TEST_DB_PORT || 3306);

const c = await mysql.createConnection({ host, user, password, port, multipleStatements: true });
await c.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
const [identity] = await c.query("SELECT DATABASE() AS currentDb, @@hostname AS host, USER() AS dbUser");
console.log(JSON.stringify({ created: TEST_NAME, identity }));
await c.end();

const envContent = `# Auto-created for local disposable statement repair tests. NEVER point at production.
APP_ENV=test
APP_BASE_URL=http://localhost:5000
TEST_DB_HOST=${host}
TEST_DB_PORT=${port}
TEST_DB_USER=${user}
TEST_DB_PASS=${password}
TEST_DB_NAME=${TEST_NAME}
DB_HOST=${host}
DB_PORT=${port}
DB_USER=${user}
DB_PASS=${password}
DB_NAME=${TEST_NAME}
CLOUD_JWT_SECRET=test-only-please-rotate
CLOUD_JWT_EXPIRES_IN=2h
VITE_API_BASE_URL=http://localhost:5000
AUDIT_RUN_SENTINEL=sv-repair-r0-2026-09-22
`;
fs.writeFileSync(".env.test", envContent);
console.log("Wrote .env.test (gitignored)");
