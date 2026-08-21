#!/usr/bin/env node
/**
 * PHASE 0 — PHP syntax linter.
 * Walks php/ and api/ (excluding vendor / hosting-bundle), runs `php -l` on
 * each .php file, and exits 1 if any file fails.
 *
 * Usage:
 *   npm run check:php
 *
 * Requirements:
 *   - php on PATH
 */
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = ["php", "api"];
const SKIP = new Set(["node_modules", "vendor", "release", "dist", "dist-server"]);

async function walk(dir) {
  let out = [];
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch { return out; }

  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(full));
    else if (e.name.endsWith(".php")) out.push(full);
  }
  return out;
}

function lintOne(file) {
  const r = spawnSync("php", ["-l", file], { encoding: "utf8" });
  if (r.error) {
    return { file, ok: false, err: `Could not spawn php: ${r.error.message}` };
  }
  const ok = r.status === 0 && /No syntax errors detected/i.test(r.stdout);
  return { file, ok, err: ok ? "" : (r.stdout + r.stderr).trim() };
}

async function main() {
  const files = [];
  for (const t of TARGETS) files.push(...await walk(path.join(ROOT, t)));
  if (files.length === 0) {
    console.log("No PHP files found under", TARGETS.join(", "));
    return;
  }
  console.log(`Linting ${files.length} PHP files…`);
  let bad = 0;
  for (const f of files) {
    const r = lintOne(f);
    if (!r.ok) {
      bad++;
      console.error(`✗ ${path.relative(ROOT, f)}`);
      console.error(`  ${r.err.split("\n").slice(0, 6).join("\n  ")}`);
    }
  }
  if (bad === 0) {
    console.log(`✓ All ${files.length} PHP files parse cleanly.`);
    process.exit(0);
  } else {
    console.error(`\n✗ ${bad} file(s) failed php -l. See output above.`);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
