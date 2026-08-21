#!/usr/bin/env node
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const needsVite = args.some((arg) => /browser(-[\w-]+)?-e2e\.mjs$|browser-e2e\.mjs$/.test(arg));
const phpUrl = process.env.BASE_URL || "http://localhost:5000";
const viteUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const env = {
  ...process.env,
  BASE_URL: phpUrl,
  DB_HOST: process.env.DB_HOST || "127.0.0.1",
  DB_PORT: process.env.DB_PORT || "3306",
  DB_NAME: process.env.DB_NAME || "sparowvault_local_cert",
  DB_USER: process.env.DB_USER || "root",
  DB_PASS: process.env.DB_PASS ?? "",
  TEST_DB_HOST: process.env.TEST_DB_HOST || process.env.DB_HOST || "127.0.0.1",
  TEST_DB_PORT: process.env.TEST_DB_PORT || process.env.DB_PORT || "3306",
  TEST_DB_NAME: process.env.TEST_DB_NAME || process.env.DB_NAME || "sparowvault_local_cert",
  TEST_DB_USER: process.env.TEST_DB_USER || process.env.DB_USER || "root",
  TEST_DB_PASS: process.env.TEST_DB_PASS ?? process.env.DB_PASS ?? "",
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "XXXXXXXXXXXXXXXXXXXXXXXX",
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
