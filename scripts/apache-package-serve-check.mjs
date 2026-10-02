#!/usr/bin/env node
/**
 * Serve extracted hosting-bundle under project-local Apache (loopback only).
 * Verifies .htaccess MIME (.mjs/.wasm), SQL denial, CSP/security headers, PHP API health.
 * Does not modify the system-wide XAMPP Listen:80 DocumentRoot.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile, cp, rm, access, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

const HTTPD = process.env.SV_HTTPD || "C:/xampp/apache/bin/httpd.exe";
const APACHE_ROOT = process.env.SV_APACHE_ROOT || "C:/xampp/apache";
const PHP_DIR = process.env.SV_PHP_DIR || "C:/xampp/php";
const isWin = process.platform === "win32";
const CLEARED_CONFIG_KEYS = [
  "CLOUD_JWT_SECRET", "DATABASE_URL", "DB_HOST", "DB_NAME", "DB_USER", "DB_PASS", "DB_PORT",
  "TEST_DB_NAME", "TEST_DATABASE_URL", "TEST_DB_HOST", "TEST_DB_USER", "TEST_DB_PASS", "TEST_DB_PORT",
  "APP_ENV_FILE",
];
const FORBIDDEN_HEALTH_DB = new Set([
  "sparowvault",
  "sparowvault_current_schema",
  "sparowvault_final_merge",
  "sparowvault_final_sql_validate",
]);

function strippedRuntimeEnv() {
  const env = { ...process.env, PATH: `${PHP_DIR};${process.env.PATH || ""}` };
  for (const key of CLEARED_CONFIG_KEYS) delete env[key];
  return env;
}

function disposableDbAllowed(name) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized || FORBIDDEN_HEALTH_DB.has(normalized)) return false;
  return normalized === "sparowvault_test" || /test/i.test(normalized);
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
    s.on("error", reject);
  });
}

try {
  await access(HTTPD);
} catch {
  const report = { status: "BLOCKED_LOCAL_ENVIRONMENT", reason: `httpd not found at ${HTTPD}` };
  await writeFile(join(outDir, "LOCAL_PACKAGE_APACHE_REPORT.md"), `# Apache package serve\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

const bundle = join(process.cwd(), "release", "hosting-bundle");
try {
  await access(bundle);
} catch {
  const npm = isWin ? "npm.cmd" : "npm";
  const r = spawnSync(npm, ["run", "host:package"], { cwd: process.cwd(), encoding: "utf8", shell: isWin, timeout: 600_000 });
  if (r.status !== 0) throw new Error(`host:package failed: ${r.stderr || r.stdout}`);
}

const extractDir = await mkdtemp(join(tmpdir(), "sv-apache-pkg-"));
await cp(bundle, extractDir, { recursive: true });
for (const name of [".env", ".env.local", ".env.host", ".env.test"]) {
  await rm(join(extractDir, name), { force: true }).catch(() => {});
}
for (const rel of ["php/bootstrap_api.php", "php/helpers/app.php", "php/controllers/public_config.php", "api/health.php", "api/healthz.php"]) {
  await cp(join(process.cwd(), rel), join(extractDir, rel));
}
// Normalize path for Apache on Windows
const docRoot = extractDir.replace(/\\/g, "/");
const confDir = join(process.cwd(), ".local", "apache-runtime");
await mkdir(confDir, { recursive: true });
const port = await freePort();
const confPath = join(confDir, `httpd-package-${port}.conf`);
const conf = `
Define SRVROOT "${APACHE_ROOT.replace(/\\/g, "/")}"
ServerRoot "\${SRVROOT}"
Listen 127.0.0.1:${port}
ServerName 127.0.0.1
PidFile "${confDir.replace(/\\/g, "/")}/httpd-${port}.pid"
ErrorLog "${confDir.replace(/\\/g, "/")}/error-${port}.log"
LogLevel warn
LoadModule authz_core_module modules/mod_authz_core.so
LoadModule authz_host_module modules/mod_authz_host.so
LoadModule mime_module modules/mod_mime.so
LoadModule dir_module modules/mod_dir.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
LoadModule setenvif_module modules/mod_setenvif.so
LoadModule alias_module modules/mod_alias.so
LoadModule access_compat_module modules/mod_access_compat.so
LoadModule env_module modules/mod_env.so
LoadFile "${PHP_DIR.replace(/\\/g, "/")}/php8ts.dll"
LoadModule php_module "${PHP_DIR.replace(/\\/g, "/")}/php8apache2_4.dll"
PHPINIDir "${PHP_DIR.replace(/\\/g, "/")}"
TypesConfig conf/mime.types
AddType application/x-httpd-php .php
AddType text/javascript .mjs
AddType application/wasm .wasm
DirectoryIndex index.html index.php
DocumentRoot "${docRoot}"
# mod_rewrite reads SetEnvIf vars; plain SetEnv alone is unreliable for HTTPS skip on WinNT mpm.
SetEnvIf Request_URI "^" SV_SKIP_HTTPS=1
SetEnv SV_SKIP_HTTPS 1
<Directory "${docRoot}">
  Options FollowSymLinks
  AllowOverride All
  Require all granted
</Directory>
`;
await writeFile(confPath, conf);

const httpd = spawn(HTTPD, ["-f", confPath.replace(/\\/g, "/"), "-D", "FOREGROUND"], {
  cwd: APACHE_ROOT,
  stdio: ["ignore", "pipe", "pipe"],
  env: strippedRuntimeEnv(),
});
let bootLog = "";
httpd.stderr?.on("data", (c) => { bootLog += c.toString(); });
httpd.stdout?.on("data", (c) => { bootLog += c.toString(); });

async function waitReady(url, ms = 20000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(1200) });
      last = `status=${r.status}`;
      if (r.status > 0 && r.status < 500) return;
    } catch (e) {
      last = String(e.message || e);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Apache not ready (${last}): ${bootLog.slice(-1500)}`);
}

const base = `http://127.0.0.1:${port}`;
try {
  await waitReady(`${base}/index.html`);
} catch (e) {
  httpd.kill();
  await writeFile(join(outDir, "LOCAL_PACKAGE_APACHE_REPORT.md"), `# Apache package serve FAILED\n\n${String(e)}\n\n\`\`\`\n${bootLog.slice(-3000)}\n\`\`\`\n`);
  await rm(extractDir, { recursive: true, force: true }).catch(() => {});
  process.exit(1);
}

async function probe(path, keepBody = false) {
  const res = await fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(8000) });
  const buf = Buffer.from(await res.arrayBuffer().catch(() => new ArrayBuffer(0)));
  const headers = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  const body = keepBody
    ? buf.toString("utf8").slice(0, 500).replace(/password|secret|token|pin/gi, "[redacted]")
    : undefined;
  return { status: res.status, type: headers["content-type"] || "", csp: headers["content-security-policy"] || "", xfo: headers["x-frame-options"] || "", bytes: buf.length, sha16: createHash("sha256").update(buf).digest("hex").slice(0, 16), body };
}

function healthFacts(result) {
  if (!result || result.error) return { http: 0, dataStatus: null };
  let parsed = null;
  try { parsed = JSON.parse(result.body || ""); } catch { parsed = null; }
  return { http: result.status || 0, dataStatus: parsed?.data?.status ?? null };
}

const results = {
  index: await probe("/index.html"),
  root: await probe("/"),
  mjsWorker: null,
  wasm: null,
  sqlDenied: null,
  envDenied: null,
  health: null,
  concurrent: null,
};

// Find worker/wasm under extract
import { readdir } from "node:fs/promises";
async function walk(dir, pred, acc = []) {
  for (const name of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const p = join(dir, name.name);
    if (name.isDirectory()) await walk(p, pred, acc);
    else if (pred(name.name)) acc.push(p.slice(extractDir.length).replaceAll("\\", "/"));
  }
  return acc;
}
const workers = await walk(extractDir, (n) => /worker/i.test(n) && /\.mjs$/.test(n));
const wasms = await walk(extractDir, (n) => n.endsWith(".wasm"));
if (workers[0]) results.mjsWorker = await probe(workers[0].startsWith("/") ? workers[0] : `/${workers[0]}`);
if (wasms[0]) results.wasm = await probe(wasms[0].startsWith("/") ? wasms[0] : `/${wasms[0]}`);
results.sqlDenied = await probe("/HOSTING_READY_CLEAN_IMPORT.sql");
results.envDenied = await probe("/.env.host");
try { results.health = await probe("/api/health.php", true); } catch (e) { results.health = { error: String(e.message || e) }; }

// Concurrent overlap under Apache (multi-threaded/request capable)
const started = Date.now();
const concurrent = await Promise.all(
  Array.from({ length: 12 }, (_, i) =>
    fetch(`${base}/index.html?n=${i}`, { signal: AbortSignal.timeout(8000) }).then((r) => r.status),
  ),
);
results.concurrent = { statuses: concurrent, elapsedMs: Date.now() - started, allOk: concurrent.every((s) => s === 200) };

async function headerProbe(path, method = "GET") {
  const res = await fetch(`${base}${path}`, { method, redirect: "manual", signal: AbortSignal.timeout(8000) });
  await res.arrayBuffer().catch(() => {});
  const xfo = res.headers.get("x-frame-options") || "";
  const csp = res.headers.get("content-security-policy") || "";
  return {
    path,
    method,
    status: res.status,
    xfo,
    xfoCount: xfo ? xfo.split(",").map((part) => part.trim()).filter(Boolean).length : 0,
    cspCount: csp ? 1 : 0,
    cspHasUnsafeEval: csp.includes("unsafe-eval") && !csp.includes("wasm-unsafe-eval"),
    cspHasStar: /(^|;)\s*\*\s*($|;)/.test(csp) || /default-src[^;]*\*/.test(csp),
  };
}
results.headerMatrix = {
  page: await headerProbe("/index.html"),
  health: await headerProbe("/api/health.php"),
  healthWrongMethod: await headerProbe("/api/health.php", "POST"),
  missingApi: await headerProbe("/api/personal/household.php"),
};

httpd.kill();
await new Promise((r) => setTimeout(r, 400));

const negativeHealth = healthFacts(results.health);
const emptyConfigIsNegative = negativeHealth.http !== 200 && negativeHealth.dataStatus !== "healthy";
let positiveHealth = { requested: false };
if (process.env.SV_PACKAGE_HEALTH_POSITIVE === "1") {
  const dbName = String(process.env.SV_HEALTH_DB_NAME || process.env.TEST_DB_NAME || "").trim();
  if (!disposableDbAllowed(dbName)) {
    positiveHealth = { requested: true, refusedBeforeConnect: true, http: 0, dataStatus: null };
  } else {
    const port2 = await freePort();
    const conf2 = join(confDir, `httpd-package-${port2}.conf`);
    const confPositive = conf.replace(`Listen 127.0.0.1:${port}`, `Listen 127.0.0.1:${port2}`).replaceAll(`httpd-${port}`, `httpd-${port2}`).replaceAll(`error-${port}`, `error-${port2}`);
    await writeFile(conf2, confPositive);
    const positiveEnv = strippedRuntimeEnv();
    positiveEnv.APP_ENV = process.env.SV_HEALTH_APP_ENV || "production";
    positiveEnv.CLOUD_JWT_SECRET = process.env.SV_HEALTH_SECRET || "package-health-positive-probe-not-production";
    positiveEnv.CLOUD_JWT_EXPIRES_IN = "2h";
    positiveEnv.DB_HOST = process.env.SV_HEALTH_DB_HOST || process.env.TEST_DB_HOST || "127.0.0.1";
    positiveEnv.DB_PORT = String(process.env.SV_HEALTH_DB_PORT || process.env.TEST_DB_PORT || "3306");
    positiveEnv.DB_USER = process.env.SV_HEALTH_DB_USER || process.env.TEST_DB_USER || "root";
    positiveEnv.DB_PASS = process.env.SV_HEALTH_DB_PASS ?? process.env.TEST_DB_PASS ?? "";
    positiveEnv.DB_NAME = dbName;
    const httpd2 = spawn(HTTPD, ["-f", conf2.replace(/\\/g, "/"), "-D", "FOREGROUND"], {
      cwd: APACHE_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: positiveEnv,
    });
    const base2 = `http://127.0.0.1:${port2}`;
    try {
      const start = Date.now();
      let ready = false;
      while (Date.now() - start < 20000) {
        try {
          const ping = await fetch(`${base2}/index.html`, { redirect: "manual", signal: AbortSignal.timeout(1200) });
          if (ping.status > 0 && ping.status < 500) { ready = true; break; }
        } catch { /* booting */ }
        await new Promise((r) => setTimeout(r, 400));
      }
      if (!ready) throw new Error("positive health Apache did not boot");
      const res = await fetch(`${base2}/api/health.php`, { redirect: "manual", signal: AbortSignal.timeout(8000) });
      const text = Buffer.from(await res.arrayBuffer()).toString("utf8").slice(0, 500).replace(/password|secret|token|pin/gi, "[redacted]");
      let parsed = null;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      positiveHealth = { requested: true, refusedBeforeConnect: false, http: res.status, dataStatus: parsed?.data?.status ?? null, bytes: Buffer.byteLength(text) };
    } catch (error) {
      positiveHealth = { requested: true, refusedBeforeConnect: false, http: 0, dataStatus: null, error: String(error.message || error) };
    } finally {
      httpd2.kill();
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}

await rm(extractDir, { recursive: true, force: true }).catch(() => {});

const mjsOk = !results.mjsWorker || /javascript|ecmascript|mjs/i.test(results.mjsWorker.type) || results.mjsWorker.status === 200;
const wasmOk = !results.wasm || /wasm|octet-stream/i.test(results.wasm.type) || results.wasm.status === 200;
const sqlBlocked = results.sqlDenied && [403, 404].includes(results.sqlDenied.status);
const envBlocked = results.envDenied && [403, 404].includes(results.envDenied.status);
const pageOk = results.index.status === 200 || results.root.status === 200;

const positiveFailed = positiveHealth.requested === true && !(positiveHealth.http === 200 && positiveHealth.dataStatus === "healthy");
const staticOk = pageOk && mjsOk && sqlBlocked && results.concurrent.allOk && emptyConfigIsNegative && !positiveFailed;
const configuredHealthy = positiveHealth.requested === true && positiveHealth.http === 200 && positiveHealth.dataStatus === "healthy";
const releaseGate = process.env.SV_PACKAGE_RELEASE_GATE === "1";
const pass = releaseGate ? staticOk && configuredHealthy : staticOk;
const report = {
  runId,
  listen: `127.0.0.1:${port}`,
  httpd: HTTPD,
  documentRoot: "throwaway extract of release/hosting-bundle",
  svSkipHttps: true,
  results,
  checks: {
    pageOk,
    mjsOk,
    wasmOk,
    sqlBlocked,
    envBlocked,
    concurrentOk: results.concurrent.allOk,
    emptyConfigHealth: {
      expectedNegative: true,
      http: negativeHealth.http,
      dataStatus: negativeHealth.dataStatus,
      passed: emptyConfigIsNegative,
      releasePass: false,
    },
    positiveHealth,
    positiveHealthFailed: positiveFailed,
  },
  localProductionLikePackage: !staticOk || positiveFailed ? "FAIL" : configuredHealthy ? "PASS_CONFIGURED_HEALTH" : "PASS_STATIC_NEGATIVE_CONFIG",
  note: "Project-local Apache FOREGROUND instance; system XAMPP :80 untouched. Throwaway extract gets the current health sources so this gate checks the readiness contract. The immutable archive is not rebuilt here. Empty-config health is an expected negative test and is not a release pass. A configured positive health check that is not HTTP 200 healthy makes this gate nonzero. SQL in the bundle remains for operator install but must be HTTP-denied by .htaccess.",
};
await writeFile(join(outDir, "LOCAL_PACKAGE_APACHE_REPORT.md"), `# Apache extracted-package serving\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
await writeFile(join(outDir, "LOCAL_PACKAGE_SERVING_REPORT.md"), `# Local package serving (Apache)\n\nSee LOCAL_PACKAGE_APACHE_REPORT.md\n\nStatus: **${report.localProductionLikePackage}**\n`);
console.log(JSON.stringify({ pass, localProductionLikePackage: report.localProductionLikePackage, sqlBlocked, concurrent: results.concurrent }, null, 2));
process.exit(pass ? 0 : 1);
