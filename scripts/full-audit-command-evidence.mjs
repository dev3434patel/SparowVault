import { spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const directory = "docs/audit-evidence/2026-09-11-full/commands";
await mkdir(directory, { recursive: true });
const commands = [
  ["dependency-audit", "npm", ["audit", "--json"]],
  ["ci-reporter", "npm", ["test", "--", "--reporter=basic"]],
  ["final-typecheck", "npm", ["run", "typecheck"]],
  ["final-lint", "npm", ["run", "lint"]],
];
const outcomes = [];
for (const [name, command, args] of commands) {
  const started = Date.now();
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
  await writeFile(`${directory}/${name}.log`, `${result.stdout || ""}${result.stderr || ""}`);
  outcomes.push({ name, command: [command, ...args].join(" "), exitCode: result.status, durationMs: Date.now() - started, error: result.error?.message });
  if (name === "dependency-audit" && result.stdout) await writeFile(`${directory}/dependency-audit.json`, JSON.stringify(JSON.parse(result.stdout), null, 2));
}
await writeFile(`${directory}/results.json`, JSON.stringify({ date: new Date().toISOString(), outcomes }, null, 2));
console.log(JSON.stringify(outcomes, null, 2));

const baseline = JSON.parse(await readFile("docs/audit-evidence/2026-09-11-full/verification/source-hashes.json", "utf8"));
const changes = [], compared = [];
for (const [file, expected] of Object.entries(baseline)) {
  if (!/^(src|php|api)\//.test(file) && !["package.json", "package-lock.json", "vite.config.ts", ".htaccess", "vitest.config.mts"].includes(file)) continue;
  compared.push(file);
  if (createHash("sha256").update(await readFile(file)).digest("hex") !== expected) changes.push(file);
}
assert.deepEqual(changes, [], "Application source changed after core verification; rerun affected tests");
const report = await readFile("docs/FULL-PROJECT-AUDIT-2026-09-11.md", "utf8");
const ids = [...report.matchAll(/\*\*(F\d{2}) -/g)].map(match => match[1]);
assert.equal(ids.length, 27); assert.equal(new Set(ids).size, 27);
const sections = report.split(/### (High \/ P1|Medium \/ P2|Low \/ P3)\n/);
const severityCounts = {};
for (let index = 1; index < sections.length; index += 2) severityCounts[sections[index]] = [...sections[index + 1].matchAll(/\*\*F\d{2} -/g)].length;
assert.deepEqual(severityCounts, { "High / P1": 15, "Medium / P2": 10, "Low / P3": 2 });
await writeFile(`${directory}/report-qa.json`, JSON.stringify({ date: new Date().toISOString(), applicationFilesCompared: compared.length, applicationFilesChangedAfterCoreVerification: changes, uniqueFindings: ids.length, severityCounts }, null, 2));
