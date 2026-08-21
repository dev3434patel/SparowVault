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
];

// Phase 1 — placeholder lines that the SANITIZED .env.host must contain.
// If the file ever contains a NON-empty real secret, the packager aborts.
const ENV_FORBIDDEN_VALUE_REGEXES = [
  /^DB_PASS=("?)([^"\s]{1,})\1\s*$/m,
  /^CLOUD_JWT_SECRET=("?)([^"\s]{1,})\1\s*$/m,
  /^RAZORPAY_KEY_SECRET=("?)([^"\s]{1,})\1\s*$/m,
  /^RAZORPAY_WEBHOOK_SECRET=("?)([^"\s]{1,})\1\s*$/m,
];

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

async function sanitizeBundleEnvFile() {
  const envPath = join(ROOT, "release", "hosting-bundle", ".env.host");
  const templatePath = join(ROOT, ".env.host.example");
  // Prefer a .env.host.example template if present (Phase 1 convention).
  if (await exists(templatePath)) {
    const tpl = await readFile(templatePath, "utf8");
    await writeFile(envPath, tpl, "utf8");
    return { sanitized: true, source: ".env.host.example" };
  }
  // Otherwise read the in-bundle file and assert it is already sanitized.
  if (!(await exists(envPath))) return { sanitized: false, source: "missing" };
  const body = await readFile(envPath, "utf8");
  for (const re of ENV_FORBIDDEN_VALUE_REGEXES) {
    const m = re.exec(body);
    if (m && m[2] && m[2].length > 0) {
      throw new Error(
        `REFUSING to ship release/hosting-bundle/.env.host — it contains a non-empty secret matching ${re}. ` +
        `Phase 1 requires placeholders only. Run: npm run host:package after replacing values with empty strings.`
      );
    }
  }
  return { sanitized: true, source: "in-place (already empty)" };
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

async function main() {
  console.log("Building frontend...");
  await run("npm", ["run", "build"]);

  console.log("Preparing hosting bundle...");
  await rm(BUNDLE_DIR, { recursive: true, force: true });
  await mkdir(BUNDLE_DIR, { recursive: true });

  await copyAllowed();
  const purgeResult = await purge(BUNDLE_DIR);
  const sanitize = await sanitizeBundleEnvFile();
  console.log(`.env.host       : sanitized via ${sanitize.source}`);

  await rm(ZIP_PATH, { force: true });

  if (process.platform === "win32") {
    console.log("Creating zip archive...");
    await run("powershell", [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path "${BUNDLE_DIR}\\*" -DestinationPath "${ZIP_PATH}" -Force`,
    ]);
  } else {
    console.log("Zip auto-creation is only enabled on Windows. Upload folder directly:");
    console.log(BUNDLE_DIR);
  }

  await summarize(purgeResult.removed);

  if (await exists(ZIP_PATH)) {
    console.log(`\nHosting package ready: ${ZIP_PATH}`);
  }
  console.log("Reminder: set DB_PASS, CLOUD_JWT_SECRET, RAZORPAY_* on the host before going live.");
}

main().catch((error) => {
  console.error("Hosting package failed:", error.message);
  process.exit(1);
});
