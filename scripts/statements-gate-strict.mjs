#!/usr/bin/env node
/**
 * Strict readiness gate for statement intelligence.
 * Scorecard generation may exit 0 with blocked:true — this gate must fail
 * until mandatory live evidence and layout verification are present.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadStatementEvidence } from "./statement-evidence-inventory.mjs";

const root = process.cwd();
const failures = [];

function run(label, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: true });
  if (result.status !== 0) {
    failures.push(`${label}: exit ${result.status}`);
  }
  return result;
}

run("typecheck", process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "--noEmit", "-p", "tsconfig.json"]);
run("statement-units", process.platform === "win32" ? "npx.cmd" : "npx", [
  "vitest",
  "run",
  "tests/unit/statementIntelligence.v2.test.ts",
  "tests/unit/statementParser.test.ts",
  "tests/unit/statementLayoutMoney.test.ts",
]);

const evidence = loadStatementEvidence(root);
const layouts = { layouts: evidence.layouts };
const verified = layouts.layouts.filter((l) => l.status === "verified-for-scope");
if (verified.length === 0) {
  failures.push("verified-for-scope layouts: 0 (20-bank claim blocked)");
}
for (const gap of evidence.gaps) failures.push(gap);
if (evidence.recognized !== evidence.banks.length) {
  failures.push(`recognized bank count ${evidence.recognized} does not match statement_banks.json`);
}
if (evidence.fixtureTested + evidence.registeredOnly + evidence.noLayoutSpec + evidence.verifiedForScope !== evidence.recognized) {
  failures.push("evidence classes do not add up to recognized banks");
}

const scorecardPath = path.join(root, "docs", "statements-v2", "BANK_LAYOUT_SCORECARD.json");
if (fs.existsSync(scorecardPath)) {
  const scorecard = JSON.parse(fs.readFileSync(scorecardPath, "utf8"));
  if (scorecard.labels?.BLOCKED_FOR_20_BANK_CLAIM !== true) {
    failures.push("scorecard must keep BLOCKED_FOR_20_BANK_CLAIM=true until real holdouts exist");
  }
  if ((scorecard.verifiedForScope ?? []).length > 0 && verified.length === 0) {
    failures.push("scorecard claims verified layouts that registry does not");
  }
  if (scorecard.recognized !== evidence.recognized) {
    failures.push(`scorecard recognized ${scorecard.recognized} != ${evidence.recognized}`);
  }
  if (scorecard.fixtureTested !== evidence.fixtureTested) {
    failures.push(`scorecard fixture-tested ${scorecard.fixtureTested} != ${evidence.fixtureTested}`);
  }
  if ((scorecard.verifiedForScope ?? []).length !== evidence.verifiedForScope) {
    failures.push(`scorecard verified-for-scope ${(scorecard.verifiedForScope ?? []).length} != ${evidence.verifiedForScope}`);
  }
  if (scorecard.registeredOnly !== evidence.registeredOnly || scorecard.noLayoutSpec !== evidence.noLayoutSpec) {
    failures.push("scorecard registered-only or no-layout-spec count does not match the registry");
  }
}

const gap = fs.readFileSync(path.join(root, "docs", "statements-v2", "GAP_REGISTER.md"), "utf8");
if (/ST-06.*\|\s*FIXED\s*\(completeness checks \+ synthetic oracle\)/.test(gap)) {
  failures.push("GAP_REGISTER still overclaims ST-06 as FIXED from helper-only evidence");
}

const report = {
  generatedAt: new Date().toISOString(),
  ok: failures.length === 0,
  failures,
  recognized: evidence.recognized,
  fixtureTested: evidence.fixtureTested,
  verifiedForScopeCount: verified.length,
  registeredOnly: evidence.registeredOnly,
  noLayoutSpec: evidence.noLayoutSpec,
  blockedFor20BankClaim: true,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
