import mysql from "mysql2/promise";

const conn = await mysql.createConnection({ host: "127.0.0.1", user: "root", password: "" });
await conn.query(
  "CREATE DATABASE IF NOT EXISTS sparowvault_verify_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
);
const [rows] = await conn.query("SHOW DATABASES LIKE 'sparowvault_verify_test'");
console.log("created=" + (rows.length === 1 ? "yes" : "no"));
await conn.end();
