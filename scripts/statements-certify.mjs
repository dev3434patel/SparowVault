#!/usr/bin/env node
/**
 * Statement intelligence certification runner (local).
 * Asserts synthetic oracle + layout registry honesty. Does not claim real-bank accuracy.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const reportDir = path.join(root, "docs", "statements-v2", "phase-reports");
fs.mkdirSync(reportDir, { recursive: true });

const vitest = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vitest", "run", "tests/unit/statementIntelligence.v2.test.ts", "tests/unit/statementParser.test.ts"],
  { cwd: root, encoding: "utf8", shell: true },
);

const layouts = JSON.parse(fs.readFileSync(path.join(root, "php", "config", "statement_layouts.json"), "utf8"));
const byStatus = {};
for (const layout of layouts.layouts) {
  byStatus[layout.status] = (byStatus[layout.status] ?? 0) + 1;
}

const scorecard = {
  generatedAt: new Date().toISOString(),
  vitestExitCode: vitest.status,
  targetBanks: layouts.targetBankIds.length,
  layoutCount: layouts.layouts.length,
  byStatus,
  verifiedForScope: layouts.layouts.filter((l) => l.status === "verified-for-scope").map((l) => l.layoutId),
  blockedRealCorpus: layouts.layouts.filter((l) => l.status === "registered" || l.status === "synthetic-tested").map((l) => ({
    layoutId: l.layoutId,
    status: l.status,
    limitations: l.limitations,
  })),
  labels: {
    LOCAL_PIPELINE_VERIFIED: vitest.status === 0,
    LAYOUT_VERIFIED: [],
    BLOCKED_FOR_20_BANK_CLAIM: true,
    HOSTED_RELEASE: "NOT_TESTED",
  },
};

fs.writeFileSync(path.join(root, "docs", "statements-v2", "BANK_LAYOUT_SCORECARD.json"), JSON.stringify(scorecard, null, 2));
fs.writeFileSync(
  path.join(reportDir, "ST-18_LOCAL_CERTIFICATION.md"),
  `# ST-18 Local statement certification

| Field | Value |
|-------|--------|
| Date | ${scorecard.generatedAt} |
| Vitest exit | ${vitest.status} |
| Target banks | ${scorecard.targetBanks} |
| verified-for-scope layouts | ${scorecard.verifiedForScope.length} |
| BLOCKED_FOR_20_BANK_CLAIM | true |
| HOSTED_RELEASE | NOT_TESTED |

## Labels

- LOCAL_PIPELINE_VERIFIED: ${scorecard.labels.LOCAL_PIPELINE_VERIFIED}
- LAYOUT_VERIFIED: none (no real holdout corpus in this run)
- LOCAL_STATEMENT_RELEASE_CANDIDATE: false until real corpora land

## Notes

Synthetic acceptance and unit gates ${vitest.status === 0 ? "passed" : "failed"}.
Real-bank layout claims remain BLOCKED without authorized PDFs and independent goldens.
`,
);

console.log(vitest.stdout || "");
console.error(vitest.stderr || "");
console.log(JSON.stringify({ exit: vitest.status, byStatus, blocked: scorecard.labels.BLOCKED_FOR_20_BANK_CLAIM }, null, 2));
process.exit(vitest.status === 0 ? 0 : 1);
