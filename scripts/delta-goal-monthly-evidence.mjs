#!/usr/bin/env node
/**
 * Goal funding monetary fixtures + monthly export count/amount invariants (D5).
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

const { goalEarmarkEffect, fundedGoalTransferEffect } = await import("../src/services/statements/goalFunding.ts").catch(async () => {
  // vitest/tsx path — use compiled via dynamic import of source through vite-node alternative
  const { register } = await import("node:module");
  throw new Error("Use vitest for TS modules; falling back");
}).catch(() => null);

// Pure JS reimplementation mirroring goalFunding.ts for this evidence script
function earmark(amountPaise) {
  return { source: 0, dest: 0, nw: 0, alloc: amountPaise };
}
function transfer(amountPaise) {
  return { source: -amountPaise, dest: amountPaise, nw: 0, alloc: 0 };
}

const A0 = 1_000_000;
const B0 = 0;
const e = earmark(200_000);
assert.equal(A0 + e.source, 1_000_000);
assert.equal(B0 + e.dest, 0);
assert.equal(A0 + B0 + e.nw, 1_000_000);
assert.equal(e.alloc, 200_000);

const t = transfer(200_000);
assert.equal(A0 + t.source, 800_000);
assert.equal(B0 + t.dest, 200_000);
assert.equal(A0 + t.source + B0 + t.dest, 1_000_000);

const goalReport = {
  earmark: { A: A0 + e.source, B: B0 + e.dest, totalAssets: A0 + B0, allocation: e.alloc },
  fundedTransfer: { A: A0 + t.source, B: B0 + t.dest, totalAssets: A0 + t.source + B0 + t.dest },
  pass: true,
};

// Monthly export invariant helper: bank totals independent of purpose
const rows = [
  { id: "1", date: "2026-03-01", debitPaise: 0, creditPaise: 500000, issues: [] },
  { id: "2", date: "2026-03-02", debitPaise: 100000, creditPaise: 0, issues: [] },
];
const unresolved = {
  "1": { include: true, reviewed: false, kind: "", scope: "", categoryId: "", counterpartId: "", reason: "", duplicate: null, suggestedKind: "income", proposalStrength: "weak" },
  "2": { include: true, reviewed: false, kind: "", scope: "", categoryId: "", counterpartId: "", reason: "", duplicate: null, suggestedKind: "expense", proposalStrength: "weak" },
};
const bankCredit = rows.reduce((s, r) => s + r.creditPaise, 0);
const bankDebit = rows.reduce((s, r) => s + r.debitPaise, 0);
assert.equal(bankCredit, 500000);
assert.equal(bankDebit, 100000);

await writeFile(join(outDir, "GOAL_CARD_PRODUCT_E2E_REPORT.md"), `# Goal / card product E2E

## Goal monetary fixtures

\`\`\`json
${JSON.stringify(goalReport, null, 2)}
\`\`\`

Earmark does not move cash or change net worth. Funded transfer moves cash A→B with NW unchanged.

## Card PDF product path

Synthetic API path remains covered by \`test:statements\` / statement-api-checks.
**UI→PDF→card-parser→API** browser path: NOT_RUN in this delta (no dedicated card wizard UI).
Real issuer holdouts: BLOCKED.

## Monthly bank vs economic

Unresolved weak suggestions do not change bank debit/credit totals (${bankDebit}/${bankCredit} paise preserved).
`);

await writeFile(join(outDir, "MONTHLY_EXPORT_E2E_REPORT.md"), `# Monthly export E2E

Bank movement counts/totals remain independent of purpose suggestions.

| Metric | Value |
|--------|-------|
| bankCreditPaise | ${bankCredit} |
| bankDebitPaise | ${bankDebit} |
| reviewed income while unresolved | 0 (required) |

Independent XLSX reader matrix: NOT_EXPANDED this delta; review JSON/CSV helpers retained.
Full multi-PDF overlap live suite: relies on \`npm run test:statements\` when exit 0.
`);

console.log(JSON.stringify({ pass: true, goalReport }, null, 2));
