/**
 * SparowVault — production hosting bundle packager.
 *
 * Phase 1 hardening:
 *  - explicit ALLOW-list of files copied into release/hosting-bundle/
 *  - source maps (*.map) are stripped from dist/
 *  - .env.host is sanitized — refuses to ship if real secrets are present
 *  - SQL dumps, node_modules, local backups, test artifacts are never copied
 *  - audit summary printed so the operator can eyeball what shipped
 */
import { cp, mkdir, rm, stat, readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "dotenv";

const ROOT = process.cwd();
const RELEASE_DIR = join(ROOT, "release");
const BUNDLE_DIR = join(RELEASE_DIR, "hosting-bundle");
const ZIP_PATH = join(RELEASE_DIR, "hosting-bundle.zip");

// Phase 1 — file patterns that MUST NOT be in the bundle.
const FORBIDDEN_PATTERNS = [
  /\.map$/i,
  /\/\.env(\..+)?$/i, // absolute-ish path segments; .env.host kept by exception
  /\.jwt-secret$/i,
  /\/node_modules\//,
  /\/\.git(\/|$)/,
  /\.bak$/i,
  /\.backup$/i,
  /\.log$/i,
  /\.local$/i,
  /\/backups\//,
  /\.sql\.gz$/i,
  /\.sql\.gpg$/i,
  /\/tests\//,
  /\/tmp[-_]/i,
  /\/\._/,
  /^\._/,
  /\.DS_Store$/i,
];

// Phase 1 — placeholder lines that the SANITIZED .env.host must contain.
// If the file ever contains a NON-empty real secret, the packager aborts.
const SECRET_KEYS = ["DB_PASS", "DATABASE_URL", "CLOUD_JWT_SECRET", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? -1}`));
    });
    child.on("error", reject);
  });
}

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

/** Recursively delete files matching FORBIDDEN_PATTERNS inside dir. */
async function purge(dir, ctx = { removed: [] }) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return ctx; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      await purge(full, ctx);
    } else {
      // Keep hosting env template + SQL + deploy guide
      if (/\.env\.host$/i.test(e.name) || /\.sql$/i.test(e.name) || /HOSTING_DEPLOY\.md$/i.test(e.name)) {
        continue;
      }
      if (FORBIDDEN_PATTERNS.some((p) => p.test(full.replace(/\\/g, "/")))) {
        await unlink(full);
        ctx.removed.push(relative(ROOT, full));
      }
    }
  }
  return ctx;
}

export async function sanitizeBundleEnvFile(root = ROOT, bundleDir = BUNDLE_DIR) {
  const envPath = join(bundleDir, ".env.host");
  const templatePath = join(root, ".env.host.example");
  // Prefer a .env.host.example template if present (Phase 1 convention).
  const hasTemplate = await exists(templatePath);
  if (!hasTemplate && !(await exists(envPath))) throw new Error("Missing hosting environment template");
  const body = await readFile(hasTemplate ? templatePath : envPath, "utf8");
  const values = parse(body);
  for (const key of SECRET_KEYS) {
    if (values[key]?.trim()) throw new Error(`REFUSING to ship a non-empty ${key} in the hosting environment template`);
  }
  if (hasTemplate) await writeFile(envPath, body, "utf8");
  return { sanitized: true, source: hasTemplate ? ".env.host.example" : "in-place (already empty)" };
}

async function copyAllowed() {
  // ALLOW-list — anything not enumerated here will not be in the bundle.
  await cp(join(ROOT, "dist"), BUNDLE_DIR, { recursive: true });
  await cp(join(ROOT, "api"), join(BUNDLE_DIR, "api"), { recursive: true });
  await cp(join(ROOT, "php"), join(BUNDLE_DIR, "php"), { recursive: true });
  await cp(
    join(ROOT, "src", "config", "syncContracts.generated.json"),
    join(BUNDLE_DIR, "php", "config", "syncContracts.generated.json"),
  );
  await cp(join(ROOT, ".htaccess"), join(BUNDLE_DIR, ".htaccess"));
  // Clean hosting SQL (fresh install — no test data)
  const hostingSql = join(ROOT, "sql", "HOSTING_READY_CLEAN_IMPORT.sql");
  if (await exists(hostingSql)) {
    await cp(hostingSql, join(BUNDLE_DIR, "HOSTING_READY_CLEAN_IMPORT.sql"));
  }
  await cp(join(ROOT, "sql", "migrations", "20260910_atomic_writes.sql"), join(BUNDLE_DIR, "20260910_atomic_writes.sql"));
  await cp(join(ROOT, "sql", "migrations", "20260911_security_sessions.sql"), join(BUNDLE_DIR, "20260911_security_sessions.sql"));
  const hostingReadme = join(ROOT, "docs", "HOSTING_DEPLOY.md");
  if (await exists(hostingReadme)) {
    await cp(hostingReadme, join(BUNDLE_DIR, "HOSTING_DEPLOY.md"));
  }
  // .env.host is intentionally shipped as a placeholder template only.
  if (await exists(join(ROOT, ".env.host"))) {
    await cp(join(ROOT, ".env.host"), join(BUNDLE_DIR, ".env.host"));
  }
}

async function summarize(removed) {
  console.log("\n— Bundle sanity report —");
  console.log(`bundle root : ${relative(ROOT, BUNDLE_DIR)}`);
  console.log(`forbidden files stripped: ${removed.length}`);
  for (const r of removed.slice(0, 10)) console.log(`  • ${r}`);
  if (removed.length > 10) console.log(`  • …and ${removed.length - 10} more`);
}

async function zipBundle() {
  await rm(ZIP_PATH, { force: true });
  if (process.platform === "win32") {
    await run("powershell", [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path "${BUNDLE_DIR}\\*" -DestinationPath "${ZIP_PATH}" -Force`,
    ]);
    return;
  }
  await run("zip", [
    "-r",
    "-X",
    ZIP_PATH,
    ".",
    "-x",
    "*.DS_Store",
    "*._*",
  ], { cwd: BUNDLE_DIR });
}

async function main() {
  console.log("Building frontend...");
  await run("npm", ["run", "build"], {
    env: {
      ...process.env,
      VITE_API_BASE_URL: "",
      VITE_CLOUD_ONLY_MODE: "true",
      VITE_ENABLE_RAZORPAY: "false",
    },
  });

  console.log("Preparing hosting bundle...");
  await rm(BUNDLE_DIR, { recursive: true, force: true });
  await mkdir(BUNDLE_DIR, { recursive: true });

  await copyAllowed();
  const purgeResult = await purge(BUNDLE_DIR);
  const sanitize = await sanitizeBundleEnvFile();
  console.log(`.env.host       : sanitized via ${sanitize.source}`);

  console.log("Creating zip archive...");
  await zipBundle();

  await summarize(purgeResult.removed);

  if (await exists(ZIP_PATH)) {
    console.log(`\nHosting package ready: ${ZIP_PATH}`);
  }
  console.log("Reminder: set DB_PASS, CLOUD_JWT_SECRET, RAZORPAY_* on the host before going live.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Hosting package failed:", error.message);
    process.exit(1);
  });
}
