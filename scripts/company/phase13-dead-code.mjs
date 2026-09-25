/**
 * Company page modules vs the route tree. A file is kept only when CompanyApp
 * reaches it (directly or through an import) and the evidence line cites that path.
 */
import fs from "node:fs";
import path from "node:path";

const appPath = "src/company/CompanyApp.tsx";
const app = fs.readFileSync(appPath, "utf8");
const routeSrc = fs.readFileSync("src/company/routes.ts", "utf8");

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".tsx")) acc.push(p.replace(/\\/g, "/"));
  }
  return acc;
}

const pages = walk("src/company/pages");
const byBase = new Map();
for (const file of pages) {
  byBase.set(path.basename(file, ".tsx"), file);
  byBase.set(file, file);
}

function importsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  const out = [];
  for (const m of text.matchAll(/["']@\/company\/pages\/([^"']+)["']/g)) {
    const spec = m[1].replace(/\.tsx$/, "");
    const hit = pages.find((p) => p.endsWith(`/${spec}.tsx`) || p.endsWith(`/${spec}/index.tsx`));
    if (hit) out.push(hit);
  }
  for (const m of text.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
    const hit = pages.find((p) => p === resolved || p === `${resolved}.tsx`);
    if (hit) out.push(hit);
  }
  return out;
}

const reachable = new Map();
const queue = [];
for (const m of app.matchAll(/["']@\/company\/pages\/([^"']+)["']/g)) {
  const spec = m[1].replace(/\.tsx$/, "");
  const hit = pages.find((p) => p === `src/company/pages/${spec}.tsx`);
  if (hit) queue.push([hit, `CompanyApp.tsx import @/company/pages/${spec}`]);
}
const seen = new Set();
while (queue.length) {
  const [file, via] = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  reachable.set(file, via);
  for (const child of importsOf(file)) {
    if (!seen.has(child)) queue.push([child, `${via} -> ${path.basename(file)}`]);
  }
}

const routeKeys = [...routeSrc.matchAll(/case "([^"]+)"/g)].map((m) => m[1]);
let fail = 0;
console.log("command=node scripts/company/phase13-dead-code.mjs");
console.log("page_files=" + pages.length);
console.log("route_keys=" + [...new Set([...routeSrc.matchAll(/\| "([a-z0-9-]+)"/g)].map((m) => m[1]))].join(","));
for (const file of pages.sort()) {
  const via = reachable.get(file);
  if (!via) {
    fail += 1;
    console.log(`FAIL ${file} — UNREACHABLE no import from CompanyApp`);
  } else {
    console.log(`PASS ${file} — KEEP ${via}`);
  }
}
console.log(`DEAD_CODE unreachable=${fail} route_case_sample=${routeKeys.slice(0, 8).join(",") || "see routes.ts companyPath"}`);
if (fail) process.exit(1);
