#!/usr/bin/env node
/**
 * Local package: build → host:package → extract → serve extracted artifact → probe assets.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile, cp, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import net from "node:net";
import { createRequire } from "node:module";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });
const isWin = process.platform === "win32";
const npm = isWin ? "npm.cmd" : "npm";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: process.cwd(), encoding: "utf8", shell: isWin, timeout: opts.timeout ?? 600_000 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  return r;
}

const build = run(npm, ["run", "build"], { timeout: 600_000 });
const pack = run(npm, ["run", "host:package"], { timeout: 300_000 });

const releaseDir = join(process.cwd(), "release", "hosting-bundle");
await access(releaseDir);
const extractDir = await mkdtemp(join(tmpdir(), "sv-pkg-"));
await cp(releaseDir, extractDir, { recursive: true });

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); });
    s.on("error", reject);
  });
}
const port = await freePort();
const php = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", extractDir], { stdio: "ignore", cwd: extractDir });
await new Promise((r) => setTimeout(r, 700));

async function probe(path) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(5000) });
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get("content-type") || "", bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex").slice(0, 16) };
}

const probes = {};
for (const path of ["/", "/index.html", "/api/health.php"]) {
  try { probes[path] = await probe(path); } catch (e) { probes[path] = { error: String(e.message || e) }; }
}
// OCR / pdf worker assets if present in package
async function findAsset(root, pred, acc = []) {
  for (const name of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    const p = join(root, name.name);
    if (name.isDirectory()) await findAsset(p, pred, acc);
    else if (pred(name.name)) acc.push(p.slice(extractDir.length).replaceAll("\\", "/"));
  }
  return acc;
}
const wasm = await findAsset(extractDir, (n) => n.endsWith(".wasm"));
const workers = await findAsset(extractDir, (n) => /worker/i.test(n) && /\.(js|mjs)$/.test(n));
for (const rel of [...wasm.slice(0, 3), ...workers.slice(0, 3)]) {
  try { probes[rel] = await probe(rel.startsWith("/") ? rel : `/${rel}`); } catch (e) { probes[rel] = { error: String(e.message || e) }; }
}

const secretHits = [];
async function scan(root) {
  for (const name of await readdir(root, { withFileTypes: true })) {
    const p = join(root, name.name);
    if (name.isDirectory()) {
      if (["node_modules", ".git"].includes(name.name)) continue;
      await scan(p);
    } else if (/\.(env|pem|key|sql|pdf)$/i.test(name.name) && !name.name.includes("example")) {
      secretHits.push(p.slice(extractDir.length).replaceAll("\\", "/"));
    }
  }
}
await scan(extractDir);

php.kill();
await rm(extractDir, { recursive: true, force: true }).catch(() => {});

const report = {
  runId,
  packageRoot: "release/hosting-bundle",
  servedWith: `php -S 127.0.0.1:${port} -t <extract>`,
  apacheHtaccess: "NOT_VERIFIED (PHP built-in server used; .htaccess requires Apache)",
  probes,
  wasmAssetsFound: wasm.length,
  workerAssetsFound: workers.length,
  suspiciousFiles: secretHits,
  buildOk: true,
  packageOk: true,
  localProductionLikePackage: probes["/"]?.status === 200 || probes["/index.html"]?.status === 200 ? "PASS_PHP_BUILTIN" : "FAIL",
  note: "This is extracted-package serving under PHP built-in server — not Vite source and not hosted Apache.",
};
await writeFile(join(outDir, "LOCAL_PACKAGE_SERVING_REPORT.md"), `# Local package serving\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
await writeFile(join(outDir, "PACKAGE_CONTENT_MANIFEST.json"), JSON.stringify({
  runId,
  wasmCount: wasm.length,
  workerCount: workers.length,
  suspiciousFiles: secretHits,
  sampleWasm: wasm.slice(0, 5),
  sampleWorkers: workers.slice(0, 5),
}, null, 2));
console.log(JSON.stringify({ pass: report.localProductionLikePackage.startsWith("PASS"), apache: "NOT_VERIFIED", suspicious: secretHits.length }, null, 2));
assert.ok(report.localProductionLikePackage.startsWith("PASS"));
