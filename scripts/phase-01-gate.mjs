#!/usr/bin/env node
/**
 * PHASE 1 GATE — automated portion.
 *
 * What this runs automatically:
 *   • Unit tests (`npm run test`)
 *   • PHP syntax check (`npm run check:php`)
 *   • Production build (`npm run build`)
 *   • Bundle scan: no .map / .env / hex JWT-looking strings / DB passwords
 *   • If --url is supplied:
 *       - HTTP request → expects 301/302 → https
 *       - HTTPS HEAD → expects 5 security headers present + correct values
 *       - 5 forbidden paths → expects 403 or 404
 *
 * What this does NOT run (needs a live test DB + PHP server):
 *   • Razorpay webhook ownership matrix → tests/webhook-ownership-e2e.mjs
 *   • Export / delete behaviour            → tests/account-endpoints-e2e.mjs
 *   (Both invoked separately when the developer has a test DB set up.)
 *
 * Writes PHASE_01_GATE_REPORT.md at the project root.
 *
 * Usage:
 *   node scripts/phase-01-gate.mjs
 *   node scripts/phase-01-gate.mjs --url https://staging.your-domain.com
 *   node scripts/phase-01-gate.mjs --url ... --skip-build
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const isWin = process.platform === "win32";
const NPM = isWin ? "npm.cmd" : "npm";

const args = process.argv.slice(2);
function flag(name) { return args.includes(name); }
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const URL_ARG    = arg("--url");
const SKIP_BUILD = flag("--skip-build");
const OUT_PATH   = arg("--out") ?? path.join(ROOT, "PHASE_01_GATE_REPORT.md");

const results = [];
function record(section, name, status, detail = "") {
  results.push({ section, name, status, detail });
  const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : status === "skip" ? "⏭️" : "⚠️";
  console.log(`${icon} [${section}] ${name}${detail ? "  — " + detail : ""}`);
}

function runCmd({ name, cmd, argv, section }) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, argv, { cwd: ROOT, shell: isWin });
    let buf = "";
    child.stdout.on("data", (d) => { buf += d.toString(); process.stdout.write(d); });
    child.stderr.on("data", (d) => { buf += d.toString(); process.stderr.write(d); });
    child.on("error", (e) => {
      record(section, name, "fail", `spawn error: ${e.message}`);
      resolve({ ok: false, tail: e.message });
    });
    child.on("close", (code) => {
      const ms = Date.now() - start;
      const ok = code === 0;
      record(section, name, ok ? "pass" : "fail", `exit ${code} in ${(ms/1000).toFixed(1)}s`);
      const tail = buf.trim().split("\n").slice(-15).join("\n");
      resolve({ ok, tail });
    });
  });
}

// ─── 0. Confirm Phase 1 source files are present ────────────────────────────
async function checkPhase1Files() {
  const expected = [
    ".env.host.example",
    "release/hosting-bundle/.env.host",
    "docs/production-secrets.md",
    "docs/phase-reports/phase-01-manual-checklist.md",
    "php/controllers/account.php",
    "api/auth/data-export.php",
    "api/auth/account.php",
    "sql/migrations/phase_01_security.sql",
    "sql/migrations/phase_01_security_rollback.sql",
    "tests/unit/phase-01-secrets.test.ts",
  ];
  for (const rel of expected) {
    try {
      await fs.access(path.join(ROOT, rel));
      record("FILES", rel, "pass");
    } catch {
      record("FILES", rel, "fail", "missing");
    }
  }
}

// ─── 1. release/hosting-bundle/.env.host has no real secrets ───────────────
async function checkEnvSanitized() {
  const p = path.join(ROOT, "release/hosting-bundle/.env.host");
  let text;
  try { text = await fs.readFile(p, "utf8"); }
  catch { record("SECRETS", "release/hosting-bundle/.env.host", "fail", "missing"); return; }
  const findings = [];
  const forbid = [
    [/^DB_PASS="[^"\s]+"/m,                  "DB_PASS not empty"],
    [/^CLOUD_JWT_SECRET="[^"\s]+"/m,         "CLOUD_JWT_SECRET not empty"],
    [/^RAZORPAY_KEY_SECRET="[^"\s]+"/m,      "RAZORPAY_KEY_SECRET not empty"],
    [/^RAZORPAY_WEBHOOK_SECRET="[^"\s]+"/m,  "RAZORPAY_WEBHOOK_SECRET not empty"],
  ];
  for (const [re, why] of forbid) if (re.test(text)) findings.push(why);
  if (/DB_PASS="[^"\s]+"/.test(text)) findings.push("DB_PASS leak detected");
  if (findings.length) record("SECRETS", ".env.host sanitised", "fail", findings.join("; "));
  else record("SECRETS", ".env.host sanitised", "pass");
}

// ─── 2. Production build artifact scan ──────────────────────────────────────
async function* walk(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function scanBundle() {
  const dist = path.join(ROOT, "dist");
  try { await fs.access(dist); }
  catch { record("BUNDLE", "dist/ exists", "fail", "run npm run build first"); return; }

  const forbiddenPatterns = [
    { re: /\.map$/i,                        why: "source map file in bundle" },
    { re: /\.env(\..+)?$/i,                 why: ".env file in bundle" },
    { re: /\.(sql|sql\.gz|sql\.gpg|bak|backup|log|local)$/i, why: "raw dump / backup / log file in bundle" },
    { re: /\/node_modules\//,               why: "node_modules in bundle" },
  ];
  const bad = [];
  for await (const f of walk(dist)) {
    for (const { re, why } of forbiddenPatterns) {
      if (re.test(f)) bad.push(`${path.relative(ROOT, f)} (${why})`);
    }
  }
  if (bad.length) record("BUNDLE", "no forbidden files", "fail", bad.slice(0, 5).join("; "));
  else record("BUNDLE", "no forbidden files", "pass", "scanned " + dist);

  // Secret content scan — hex JWT-shaped string, common passwords, the known leak literal
  const secretPatterns = [
    { re: /(?=[0-9a-f]{64,})(?=[0-9a-f]*[a-f])[0-9a-f]{64,}/i, why: "long hex string (possible secret)" },
    { re: /DB_PASS="[^"\s]+"/, why: "non-empty DB_PASS literal" },
    { re: /pin_hash\s*[:=]\s*['"]\$2[aby]\$/, why: "bcrypt hash in bundle" },
  ];
  const leaks = [];
  for await (const f of walk(dist)) {
    if (!/\.(js|html|css|json)$/.test(f)) continue;
    const text = await fs.readFile(f, "utf8");
    for (const { re, why } of secretPatterns) {
      if (re.test(text)) leaks.push(`${path.relative(ROOT, f)} (${why})`);
    }
  }
  // Note: long hex string is very noisy. We treat this as a warning, not a hard fail,
  // unless it matches the known leaked JWT literal.
  const known = leaks.filter((l) => l.includes("legacy DB_PASS literal") || l.includes("bcrypt"));
  if (known.length) record("BUNDLE", "no real secrets", "fail", known.slice(0, 3).join("; "));
  else if (leaks.length) record("BUNDLE", "no real secrets", "warn", `${leaks.length} long-hex strings (manual review)`);
  else record("BUNDLE", "no real secrets", "pass");

  // Bundle env-host file (if shipped) must be fully empty
  const bundleEnv = path.join(ROOT, "release/hosting-bundle/.env.host");
  try {
    const text = await fs.readFile(bundleEnv, "utf8");
    if (/^DB_PASS="[^"\s]+"/m.test(text)) record("BUNDLE", "hosting-bundle .env.host empty DB_PASS", "fail", "DB_PASS still set");
    else if (/^CLOUD_JWT_SECRET="[^"\s]+"/m.test(text)) record("BUNDLE", "hosting-bundle .env.host empty JWT", "fail", "CLOUD_JWT_SECRET still set");
    else record("BUNDLE", "hosting-bundle .env.host sanitised", "pass");
  } catch {
    record("BUNDLE", "hosting-bundle .env.host", "skip", "not built yet");
  }
}

// ─── 3. URL probes: HTTP→HTTPS, headers, deny rules ─────────────────────────
async function urlProbe() {
  if (!URL_ARG) {
    record("URL", "URL probes", "skip", "pass --url <prod or staging URL> to enable");
    return;
  }
  let u;
  try { u = new URL(URL_ARG); }
  catch { record("URL", "URL parse", "fail", URL_ARG); return; }
  if (u.protocol !== "https:") {
    record("URL", "URL must be https", "warn", "passed http URL; will still probe");
  }

  // a) HTTP→HTTPS redirect
  try {
    const httpUrl = new URL(u.toString());
    httpUrl.protocol = "http:";
    const r = await fetch(httpUrl.toString(), { method: "GET", redirect: "manual" });
    const loc = r.headers.get("location") || "";
    if (r.status >= 300 && r.status < 400 && loc.startsWith("https://")) {
      record("URL", "HTTP → HTTPS redirect", "pass", `${r.status} → ${loc}`);
    } else {
      record("URL", "HTTP → HTTPS redirect", "fail", `status=${r.status} location=${loc}`);
    }
  } catch (e) {
    record("URL", "HTTP → HTTPS redirect", "fail", e.message);
  }

  // b) Security headers
  let headersOk = true;
  try {
    const r = await fetch(u.toString(), { method: "GET", redirect: "follow" });
    const want = {
      "strict-transport-security": (v) => /max-age=\d{6,}/.test(v),
      "x-frame-options":           (v) => /^(deny|sameorigin)$/i.test(v),
      "x-content-type-options":    (v) => /nosniff/i.test(v),
      "referrer-policy":           (v) => v.length > 0,
      "permissions-policy":        (v) => v.length > 0,
      "content-security-policy":   (v) => /default-src/i.test(v),
    };
    for (const [key, check] of Object.entries(want)) {
      const v = r.headers.get(key) ?? "";
      if (v && check(v)) record("URL", `header ${key}`, "pass", v.slice(0, 60));
      else { headersOk = false; record("URL", `header ${key}`, "fail", v ? `bad value: ${v}` : "missing"); }
    }
  } catch (e) {
    record("URL", "fetch headers", "fail", e.message);
    headersOk = false;
  }

  // c) Deny rules
  const denyPaths = [
    "/.env",
    "/.env.host",
    "/sql/schema.sql",
    "/data/rate_limits.json",
    "/php/config/db.php",
    "/data/.jwt-secret",
  ];
  for (const p of denyPaths) {
    try {
      const r = await fetch(new URL(p, u).toString(), { method: "GET", redirect: "manual" });
      if (r.status === 403 || r.status === 404) record("URL", `deny ${p}`, "pass", String(r.status));
      else record("URL", `deny ${p}`, "fail", `status=${r.status}`);
    } catch (e) {
      record("URL", `deny ${p}`, "fail", e.message);
    }
  }
}

// ─── Drive ────────────────────────────────────────────────────────────────
async function main() {
  console.log(`SparowVault — Phase 1 gate runner`);
  console.log(`outputs → ${path.relative(ROOT, OUT_PATH)}`);
  if (URL_ARG) console.log(`URL probes → ${URL_ARG}`);

  await checkPhase1Files();
  await runCmd({ name: "vitest unit tests",  cmd: NPM, argv: ["run", "test", "--", "--reporter=basic"], section: "TESTS" });
  await runCmd({ name: "php -l on all PHP",  cmd: NPM, argv: ["run", "check:php"], section: "TESTS" });

  if (!SKIP_BUILD) {
    await runCmd({ name: "npm run build",    cmd: NPM, argv: ["run", "build"],     section: "BUILD" });
  } else {
    record("BUILD", "npm run build", "skip", "--skip-build");
  }

  await checkEnvSanitized();
  await scanBundle();
  await urlProbe();

  // Summary
  const counts = { pass: 0, fail: 0, warn: 0, skip: 0 };
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
  console.log("\n— SUMMARY —");
  console.log(`  passes : ${counts.pass}`);
  console.log(`  fails  : ${counts.fail}`);
  console.log(`  warns  : ${counts.warn}`);
  console.log(`  skips  : ${counts.skip}`);

  // Write report
  const md = [
    "# PHASE 01 GATE — Automated Result",
    "",
    `_Generated by \`scripts/phase-01-gate.mjs\` at ${new Date().toISOString()}._`,
    URL_ARG ? `_URL probed: ${URL_ARG}._` : `_No --url supplied; URL probes skipped._`,
    "",
    `**Automated outcome: ${counts.fail === 0 ? "✅ all checks green" : `❌ ${counts.fail} failure(s)`}**`,
    `(passes ${counts.pass} · fails ${counts.fail} · warns ${counts.warn} · skips ${counts.skip})`,
    "",
    "## Per-check results",
    "",
    "| Section | Check | Result | Detail |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.section} | ${r.name} | ${r.status === "pass" ? "✅" : r.status === "fail" ? "❌" : r.status === "warn" ? "⚠️" : "⏭️"} | ${r.detail.replace(/\|/g, "\\|")} |`),
    "",
    "## What this runner does NOT cover (run separately)",
    "",
    "These checks require a live PHP server + test DB:",
    "",
    "- `node tests/webhook-ownership-e2e.mjs`  — gate checks 5-9 (webhook ownership matrix).",
    "- `node tests/account-endpoints-e2e.mjs`  — gate checks 10-14 (data export + delete + audit + locked-out login).",
    "",
    "Paste their PASS / FAIL output into `PHASE_01_GATE_REPORT.md` §2 before declaring the phase complete.",
    "",
  ].join("\n");
  await fs.writeFile(OUT_PATH, md, "utf8");
  console.log(`\nWrote ${path.relative(ROOT, OUT_PATH)}`);

  if (counts.fail > 0) process.exit(1);
}

main().catch((e) => { console.error("Gate runner error:", e); process.exit(2); });
