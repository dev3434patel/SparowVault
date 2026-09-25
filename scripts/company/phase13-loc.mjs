import fs from "node:fs";
import path from "node:path";

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|php)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const rows = [];
for (const root of ["src/company", "php/helpers/company"]) {
  for (const file of walk(root)) {
    const n = fs.readFileSync(file, "utf8").split(/\n/).length;
    rows.push({ n, file: file.replace(/\\/g, "/") });
  }
}
rows.sort((a, b) => b.n - a.n);
const over = rows.filter((r) => r.n > 400);
console.log("command=node scripts/company/phase13-loc.mjs");
console.log("files_scanned=" + rows.length);
console.log("files_over_400=" + over.length);
for (const r of over) console.log("OVER " + r.n + " " + r.file);
console.log("top:");
for (const r of rows.slice(0, 12)) console.log(String(r.n).padStart(4) + " " + r.file);
if (over.length) process.exit(1);
