#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trim = line.trim();
    if (!trim || trim.startsWith("#")) continue;
    const i = trim.indexOf("=");
    if (i < 0) continue;
    const key = trim.slice(0, i).trim();
    let val = trim.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (/^[A-Z_][A-Z0-9_]*$/.test(key)) out[key] = val;
  }
  return out;
}

const root = process.cwd();
const fileEnv = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.test")),
};

const args = process.argv.slice(2);
const needsVite = args.some((arg) => /browser(-[\w-]+)?-e2e\.mjs$|browser-e2e\.mjs$|browser-card-statement-dialog\.mjs$|browser-independent-client-sync\.mjs$/.test(arg));
const phpUrl = process.env.BASE_URL || fileEnv.BASE_URL || "http://localhost:5000";
const viteUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const merged = { ...fileEnv, ...process.env };
const testDbName = merged.TEST_DB_NAME || merged.DB_NAME || "sparowvault_test";
const forbiddenExact = new Set([
  "sparowvault",
  "sparowvault_current_schema",
  "sparowvault_final_merge",
  "sparowvault_final_sql_validate",
]);

if (forbiddenExact.has(testDbName) || !/(test|cert)/i.test(testDbName)) {
  console.error(
    `Refusing local test runtime: database '${testDbName}' is not an allowlisted disposable test/cert database.`,
  );
  process.exit(2);
}

const env = {
  ...merged,
  APP_ENV: "test",
  BASE_URL: phpUrl,
  VITE_API_TARGET: merged.VITE_API_TARGET || phpUrl,
  VITE_API_BASE_URL: merged.VITE_API_BASE_URL ?? "",
  DB_HOST: merged.TEST_DB_HOST || merged.DB_HOST || "127.0.0.1",
  DB_PORT: merged.TEST_DB_PORT || merged.DB_PORT || "3306",
  DB_NAME: testDbName,
  DB_USER: merged.TEST_DB_USER || merged.DB_USER || "root",
  DB_PASS: merged.TEST_DB_PASS ?? merged.DB_PASS ?? "",
  TEST_DB_HOST: merged.TEST_DB_HOST || merged.DB_HOST || "127.0.0.1",
  TEST_DB_PORT: merged.TEST_DB_PORT || merged.DB_PORT || "3306",
  TEST_DB_NAME: testDbName,
  TEST_DB_USER: merged.TEST_DB_USER || merged.DB_USER || "root",
  TEST_DB_PASS: merged.TEST_DB_PASS ?? merged.DB_PASS ?? "",
  RAZORPAY_WEBHOOK_SECRET: merged.RAZORPAY_WEBHOOK_SECRET || "XXXXXXXXXXXXXXXXXXXXXXXX",
  AUDIT_RUN_SENTINEL: merged.AUDIT_RUN_SENTINEL || "sv-local-test-runtime",
};

const children = [];

function run(command, commandArgs, options = {}) {
  const child = spawn(command, commandArgs, {
    shell: process.platform === "win32",
    stdio: options.stdio || "inherit",
    env,
  });
  children.push(child);
  return child;
}

async function canFetch(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function waitFor(url, label) {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    if (await canFetch(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become ready at ${url}`);
}

async function ensurePhp() {
  if (await canFetch(`${phpUrl}/api/health.php`)) return;
  run("php", ["-S", "localhost:5000", "-t", ".", "php/dev-router.php"], { stdio: "ignore" });
  await waitFor(`${phpUrl}/api/health.php`, "PHP backend");
}

async function ensureVite() {
  if (!needsVite) return;
  if (await canFetch(viteUrl)) return;
  run("npm", ["run", "dev:client"], { stdio: "ignore" });
  await waitFor(viteUrl, "Vite frontend");
}

function cleanup() {
  for (const child of children.reverse()) {
    if (!child.killed) child.kill();
  }
}

async function main() {
  if (args.length === 0) {
    throw new Error("Usage: node scripts/with-local-test-runtime.mjs <command> [args...]");
  }
  console.log(
    JSON.stringify({
      runtimeDb: env.DB_NAME,
      testDb: env.TEST_DB_NAME,
      sentinel: env.AUDIT_RUN_SENTINEL,
      appEnv: env.APP_ENV,
    }),
  );
  await ensurePhp();
  await ensureVite();

  const [command, ...commandArgs] = args;
  const child = spawn(command, commandArgs, {
    shell: process.platform === "win32",
    stdio: "inherit",
    env,
  });
  child.on("exit", (code) => {
    cleanup();
    process.exit(code ?? 1);
  });
  child.on("error", (error) => {
    cleanup();
    console.error(error);
    process.exit(1);
  });
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

main().catch((error) => {
  cleanup();
  console.error(error);
  process.exit(1);
});
