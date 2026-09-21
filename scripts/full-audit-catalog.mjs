import { readFile, writeFile } from "node:fs/promises";
import { SYNC_CONTRACTS } from "../src/config/syncContracts.ts";

const root = "docs/audit-evidence/2026-09-11-full/inventory";
const actions = JSON.parse(await readFile(`${root}/actions.json`, "utf8"));
const fields = JSON.parse(await readFile(`${root}/fields.json`, "utf8"));
const functions = JSON.parse(await readFile(`${root}/functions.json`, "utf8"));
const esc = value => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ").replaceAll("`", "'");
const source = row => `[${row.file}:${row.line}](../${row.file}#L${row.line})`;
const lines = [
  "# SparowVault Static Audit Catalog - 2026-09-11", "",
  "Companion to FULL-PROJECT-AUDIT-2026-09-11.md. Generated from the current source, not inferred from earlier reports.", "",
  "These inventories are source-level evidence, NOT a claim that every listed function, field, button or conditional state was executed. See the main report and machine-readable check results for actual runtime coverage. Repeated render definitions are counted once; a definition can produce many controls. Field and input entries can refer to the same visible form field.", "",
  "## Collection Contracts", "",
  "All 37 server allowlist names received owner/other-owner/anonymous list probes in the isolated extended audit. Declared validation below is intended metadata: runtime tests demonstrate that non-transaction collection schemas and relationships are not fully enforced. API aliases use the same controller. Canonical values should be integer paise; rupee mirrors remain in some components.", "",
];
for (const contract of SYNC_CONTRACTS) {
  lines.push(`### ${contract.serverAllowlistName}`, "",
    `- Contract name: \`${contract.collectionName}\`; IndexedDB store: \`${contract.dexieStoreName}\`; schema version: ${contract.schemaVersion}.`,
    `- Required (declared): ${contract.requiredFields.map(v => `\`${v}\``).join(", ")}.`,
    `- Optional (declared): ${contract.optionalFields.map(v => `\`${v}\``).join(", ")}.`,
    `- Indexed/hot fields: ${contract.hotFields.map(v => `\`${v}\``).join(", ")}.`,
    `- Declared rules: ${contract.validationRules.join("; ")}.`,
    `- Migration intent: ${contract.migrationBehavior.join(", ")}.`, "");
}
lines.push("## Action Definitions", "", "Handler expressions are preserved so the developer can trace API/store effects. PIN, role visibility and nested confirmation requirements must be read in the enclosing component; a handler inventory cannot certify them.", "");
for (const file of [...new Set(actions.map(row => row.file))]) {
  lines.push(`### ${file}`, "", "| Source | Element | Handler | Disabled condition / title |", "|---|---|---|---|");
  for (const row of actions.filter(row => row.file === file)) lines.push(`| ${source(row)} | ${esc(row.tag)} | ${esc(row.onClick || row.onSubmit)} | ${esc([row.disabled, row.title, row["aria-label"]].filter(Boolean).join("; "))} |`);
  lines.push("");
}
lines.push("## Field and Control Definitions", "", "| Source | Element | Label / name / placeholder | Type / required / range |", "|---|---|---|---|");
for (const row of fields) lines.push(`| ${source(row)} | ${esc(row.tag)} | ${esc([row.label, row["aria-label"], row.name, row.placeholder].filter(Boolean).join("; "))} | ${esc([row.type, row.required === undefined ? "" : "required", row.min && `min=${row.min}`, row.max && `max=${row.max}`].filter(Boolean).join("; "))} |`);
lines.push("", "## Named TypeScript Function Definitions", "", "This is not call-graph or branch coverage. Anonymous callbacks are not counted as named functions.", "", "| Source | Function |", "|---|---|");
for (const row of functions) lines.push(`| ${source(row)} | ${esc(row.name)} |`);
await writeFile("docs/FULL-AUDIT-CATALOG-2026-09-11.md", lines.join("\n") + "\n");
console.log(JSON.stringify({ collections: SYNC_CONTRACTS.length, actions: actions.length, fields: fields.length, functions: functions.length, lines: lines.length }));

const evidenceRoot = "docs/audit-evidence/2026-09-11-full";
const suites = [
  ["Development integrity/statement/browser", "verification/atomic-writes.json"],
  ["Production artifact", "verification/production-artifact.json"],
  ["Extended audit", "extended-final-verified/atomic-writes.json"],
  ["Module workflows", "modules-final-verified/atomic-writes.json"],
  ["Independent finance contracts", "calculations/results.json"],
];
const matrix = ["# Executed Test Matrix - 11 September 2026", "", "Counts overlap across suites. Rows record actual assertions, not independently covered features. Repeated administrative denial status failures share one root cause. The extended audit's wipe-after-failed-restore probe is blocked by a rejected outbox item; the clean wipe defect is independently confirmed in Module workflows. Unexecuted combinations are in the full report, not silently marked pass.", ""];
const stats = [];
for (const [name, file] of suites) {
  const result = JSON.parse(await readFile(`${evidenceRoot}/${file}`, "utf8"));
  const checks = result.checks || result.results || result;
  stats.push({ suite: name, file, total: checks.length, pass: checks.filter(row => row.pass).length, nonpassing: checks.filter(row => !row.pass).length });
  matrix.push(`## ${name}`, "", `Source: [${file}](${file})`, "", "| # | Assertion | Outcome | Failure detail |", "|---|---|---|---|");
  for (const [index, row] of checks.entries()) matrix.push(`| ${index + 1} | ${esc(row.title || row.name)} | ${row.pass ? "PASS" : "NONPASSING"} | ${esc(row.error || "")} |`);
  matrix.push("");
}
const unit = JSON.parse(await readFile(`${evidenceRoot}/commands/unit-details.json`, "utf8"));
stats.push({ suite: "Unit tests", total: unit.numTotalTests, pass: unit.numPassedTests, nonpassing: unit.numFailedTests, pending: unit.numPendingTests });
matrix.push("## Unit Test Cases", "", "Source: [Vitest JSON](commands/unit-details.json). These checks share application functions with higher-level suites; they are not additional user workflows.", "", "| # | Assertion | Outcome | Source |", "|---|---|---|---|");
let index = 0;
for (const result of unit.testResults) for (const test of result.assertionResults) matrix.push(`| ${++index} | ${esc(test.fullName || test.title)} | ${esc(test.status)} | ${esc(result.name)} |`);
await writeFile(`${evidenceRoot}/TEST-MATRIX.md`, matrix.join("\n") + "\n");
await writeFile(`${evidenceRoot}/suite-summary.json`, JSON.stringify({ date: new Date().toISOString(), overlappingSuites: true, suites: stats }, null, 2));
console.log(JSON.stringify(stats, null, 2));
