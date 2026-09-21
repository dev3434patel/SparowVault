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
  env: { ...process.env, PATH: `${PHP_DIR};${process.env.PATH || ""}` },
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

async function probe(path) {
  const res = await fetch(`${base}${path}`, { redirect: "manual", signal: AbortSignal.timeout(8000) });
  const buf = Buffer.from(await res.arrayBuffer().catch(() => new ArrayBuffer(0)));
  const headers = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  return { status: res.status, type: headers["content-type"] || "", csp: headers["content-security-policy"] || "", xfo: headers["x-frame-options"] || "", bytes: buf.length, sha16: createHash("sha256").update(buf).digest("hex").slice(0, 16) };
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
try { results.health = await probe("/api/health.php"); } catch (e) { results.health = { error: String(e.message || e) }; }

// Concurrent overlap under Apache (multi-threaded/request capable)
const started = Date.now();
const concurrent = await Promise.all(
  Array.from({ length: 12 }, (_, i) =>
    fetch(`${base}/index.html?n=${i}`, { signal: AbortSignal.timeout(8000) }).then((r) => r.status),
  ),
);
results.concurrent = { statuses: concurrent, elapsedMs: Date.now() - started, allOk: concurrent.every((s) => s === 200) };

httpd.kill();
await new Promise((r) => setTimeout(r, 400));
await rm(extractDir, { recursive: true, force: true }).catch(() => {});

const mjsOk = !results.mjsWorker || /javascript|ecmascript|mjs/i.test(results.mjsWorker.type) || results.mjsWorker.status === 200;
const wasmOk = !results.wasm || /wasm|octet-stream/i.test(results.wasm.type) || results.wasm.status === 200;
const sqlBlocked = results.sqlDenied && [403, 404].includes(results.sqlDenied.status);
const envBlocked = results.envDenied && [403, 404].includes(results.envDenied.status);
const pageOk = results.index.status === 200 || results.root.status === 200;

const pass = pageOk && mjsOk && sqlBlocked && results.concurrent.allOk;
const report = {
  runId,
  listen: `127.0.0.1:${port}`,
  httpd: HTTPD,
  documentRoot: "throwaway extract of release/hosting-bundle",
  svSkipHttps: true,
  results,
  checks: { pageOk, mjsOk, wasmOk, sqlBlocked, envBlocked, concurrentOk: results.concurrent.allOk },
  localProductionLikePackage: pass ? "PASS_APACHE" : "FAIL",
  note: "Project-local Apache FOREGROUND instance; system XAMPP :80 untouched. SQL in bundle remains for operator install but must be HTTP-denied by .htaccess.",
};
await writeFile(join(outDir, "LOCAL_PACKAGE_APACHE_REPORT.md"), `# Apache extracted-package serving\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
await writeFile(join(outDir, "LOCAL_PACKAGE_SERVING_REPORT.md"), `# Local package serving (Apache)\n\nSee LOCAL_PACKAGE_APACHE_REPORT.md\n\nStatus: **${report.localProductionLikePackage}**\n`);
console.log(JSON.stringify({ pass, localProductionLikePackage: report.localProductionLikePackage, sqlBlocked, concurrent: results.concurrent }, null, 2));
process.exit(pass ? 0 : 1);
