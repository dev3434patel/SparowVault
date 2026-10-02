import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const runDir = path.join(root, "docs", "implementation-verification", "SV-VERIFY-20260930-202241-b182d88604c9");
const runId = "SV-VERIFY-20260930-202241-b182d88604c9";

const matrix = readFileSync(path.join(root, "docs/current-product-inventory/2026-09-30/status-matrix.md"), "utf8");
const parsed = [];
for (const line of matrix.split(/\r?\n/)) {
  const match = line.match(/^\| ([^|]+) \| ([^|]+) \| ([^|]+) \|/);
  if (!match) continue;
  const area = match[1].trim();
  const name = match[2].trim();
  const inventory = match[3].trim();
  if (area === "Area" || name.includes("---")) continue;
  parsed.push({ area, name, inventory });
}
const personal = parsed.slice(0, 47).map((row, index) => ({ ...row, id: `P${String(index + 1).padStart(2, "0")}`, side: "personal" }));
const company = parsed.slice(47, 83).map((row, index) => ({ ...row, id: `C${String(index + 1).padStart(2, "0")}`, side: "company" }));
if (personal.length !== 47 || company.length !== 36) {
  throw new Error(`surface count ${personal.length}/${company.length}`);
}

function implFromInventory(inventory) {
  if (inventory === "Schema only") return "SCHEMA_ONLY";
  if (inventory === "Not built") return "MISSING";
  if (inventory === "Partial") return "PARTIAL";
  return "PARTIAL";
}

const passWrite = new Set([
  "Transfers",
  "Credit and debit cards",
  "Card EMI",
  "Loans and EMI",
  "Udhari and advances",
  "Sinking funds",
  "Alerts",
  "Purchase and sale as their own screens",
  "Dimensions on vouchers",
  "Payroll",
  "Transfer and journal",
]);
const failWrite = new Set([
  "Inventory",
  "Bank reconciliation and statements",
  "Personal to company bridge",
]);
const passNegative = new Set([
  "Transfer and journal",
  "Login, select, create company",
  "Permission gates on pages",
  "Settings and period lock",
  "Approvals",
  "Export files",
]);
const passRead = new Set([
  "Transfers",
  "Credit and debit cards",
  "Card EMI",
  "Loans and EMI",
  "Udhari and advances",
  "Purchase and sale as their own screens",
  "Dimensions on vouchers",
  "Payroll",
  "Disabled report keys",
  "Live reports",
]);

const implOverride = {
  "Dimensions on vouchers": "PARTIAL",
  "Inventory": "PARTIAL",
  "Payroll": "PARTIAL",
  "Disabled report keys": "CONFLICT",
  "Purchase and sale as their own screens": "PARTIAL",
  "Bank reconciliation and statements": "PARTIAL",
  "Personal to company bridge": "SCHEMA_ONLY",
  "GST returns": "PARTIAL",
};

function childrenOf(parent) {
  const implementation = implOverride[parent.name] ?? implFromInventory(parent.inventory);
  const kinds = [
    ["entry", "Open the surface from navigation and from its direct URL."],
    ["write", "Submit the form or API write through the real handler."],
    ["readback", "Read the authoritative store again after the write."],
    ["negative", "Reject the unsafe or incomplete case."],
  ];
  const rows = kinds.map(([kind, workflow]) => {
    let verification = "NOT_RUN";
    if (kind === "write" && passWrite.has(parent.name)) verification = "PASS";
    if (kind === "readback" && passRead.has(parent.name)) verification = "PASS";
    if (kind === "write" && failWrite.has(parent.name)) verification = "FAIL";
    if (kind === "readback" && failWrite.has(parent.name)) verification = "FAIL";
    if (kind === "negative" && passNegative.has(parent.name)) verification = "PASS";
    if (parent.name === "Alerts" && kind === "write") verification = "PASS";
    if (parent.name === "Sinking funds" && kind === "write") verification = "PASS";
    return {
      childId: `${parent.id}-${kind}`,
      parentId: parent.id,
      parent: parent.name,
      side: parent.side,
      kind,
      workflow,
      implementation,
      verification,
      mandatoryLocal: true,
    };
  });
  const external = [];
  if (parent.name === "PDF bank and card statements") external.push(["bank-layouts", "Real 20-bank statement corpus."]);
  if (parent.name === "Account Aggregator") external.push(["live-aa", "Live Account Aggregator consent."]);
  if (parent.name === "Subscription" || parent.name === "Company billing") external.push(["live-razorpay", "Live Razorpay capture."]);
  if (parent.name === "GST returns") external.push(["statutory-filing", "Statutory GST filing and IRN."]);
  if (parent.name === "Mobile bar") external.push(["physical-device", "Physical phone or tablet."]);
  if (parent.name === "Export files") external.push(["hosted-release", "Hosted production release."]);
  for (const [kind, workflow] of external) {
    rows.push({
      childId: `${parent.id}-${kind}`,
      parentId: parent.id,
      parent: parent.name,
      side: parent.side,
      kind,
      workflow,
      implementation,
      verification: "BLOCKED_EXTERNAL",
      mandatoryLocal: false,
    });
  }
  return rows;
}

const parents = [...personal, ...company];
const children = parents.flatMap(childrenOf);
const mandatory = children.filter((row) => row.mandatoryLocal);
const count = (list, status) => list.filter((row) => row.verification === status).length;

function localComplete(side) {
  return parents.filter((parent) => parent.side === side).filter((parent) => {
    const rows = children.filter((row) => row.parentId === parent.id && row.mandatoryLocal);
    return rows.every((row) => row.verification === "PASS") && rows.every((row) => row.implementation === "FULL");
  }).length;
}

const counts = {
  pass: count(mandatory, "PASS"),
  fail: count(mandatory, "FAIL"),
  blockedLocal: count(mandatory, "BLOCKED_LOCAL"),
  blockedExternal: children.filter((row) => row.verification === "BLOCKED_EXTERNAL").length,
  notRun: count(mandatory, "NOT_RUN"),
  notApplicable: count(mandatory, "NOT_APPLICABLE"),
  personalLocalComplete: localComplete("personal"),
  companyLocalComplete: localComplete("company"),
  personalParents: 47,
  companyParents: 36,
};

const findings = [
  {
    id: "F-O12",
    parentSurface: "Personal to company bridge",
    childWorkflow: "C-bridge reimbursement payable",
    phase: "oracles",
    severity: "high",
    path: "php/helpers/company/phase_sv.php company_bridge_dispatch",
    reproduction: "On the disposable company, insert the reimbursement link the bridge writer stores for 750000 paise and read posted voucher lines for that reimbursement.",
    expected: "Company books show a payable of 750000 paise and the personal book shows the same receivable, without a second expense.",
    actual: "A cross-domain link row is stored. Posted payable lines are 0. The plan says the two stores are not one database transaction.",
    paiseDifference: -750000,
    evidence: "oracle-results-company.json O12-company-payable",
    rootCause: "The bridge writer stores a link and a plan. It does not post the payable voucher.",
    smallestRepair: "Post the payable journal in the same company transaction as the link, and write the personal receivable only after that post succeeds.",
    regressionTest: "Assert posted payable paise equals the reimbursement amount and that salary or expense is not debited a second time.",
    closureCondition: "Disposable books show 750000 paise payable and a matching personal receivable.",
  },
  {
    id: "F-O11",
    parentSurface: "Bank reconciliation and statements",
    childWorkflow: "Cheque issue versus clear",
    phase: "oracles",
    severity: "high",
    path: "php/helpers/company/phase_sv.php company_cheque_dispatch",
    reproduction: "Post a 2500000 paise payment described as an issued cheque, then call the cheque match effect.",
    expected: "Bank balance stays at the pre-issue figure until the cheque clears.",
    actual: "The posted payment credits the bank immediately. Match reports cashPostedAgain 0, so it does not post a second time. There is no uncleared balance.",
    paiseDifference: -2500000,
    evidence: "oracle-results-company.json O11-not-cleared-yet",
    rootCause: "Cheque match only returns an effect object with cashPosted false. The cash movement already happened at voucher post.",
    smallestRepair: "Hold the bank credit in an uncleared-cheque liability until a separate clear voucher.",
    regressionTest: "Issue 2500000 paise and assert bank net is unchanged; clear it and assert the bank moves once.",
    closureCondition: "Issue and clear are two persisted states and the bank moves only on clear.",
  },
  {
    id: "F-O09",
    parentSurface: "Inventory",
    childWorkflow: "Stock value versus STOCK ledger",
    phase: "oracles",
    severity: "high",
    path: "php/helpers/company/phase_sv.php company_items_dispatch",
    reproduction: "Buy 2 units at 10000 paise and sell 1 at 15000 paise through the item update, then sum posted STOCK ledger lines.",
    expected: "Remaining stock value of 10000 paise is the STOCK ledger balance.",
    actual: "company_items holds qty 1, value 10000, cogs 10000, revenue 15000. Posted STOCK lines sum to 0.",
    paiseDifference: -10000,
    evidence: "oracle-results-company.json O09-stock-ledger",
    rootCause: "The item update writes company_items and does not post a STOCK voucher.",
    smallestRepair: "Post the buy and the COGS sale to the STOCK control ledger in the same transaction as the item row.",
    regressionTest: "After the same buy and sell, STOCK net paise equals remaining value and COGS equals 10000.",
    closureCondition: "Item subledger and posted STOCK ledger agree to the paise.",
  },
  {
    id: "F-DB-URL",
    parentSurface: "System",
    childWorkflow: "Disposable database guard",
    phase: "freeze",
    severity: "high",
    path: "scripts/db-test-reset.mjs",
    reproduction: "Call the reset script with only TEST_DATABASE_URL pointing at 127.0.0.1 port 1 and database sparowvault_owner_books.",
    expected: "The script exits 2 before opening a connection because the database name has no test substring.",
    actual: "The script attempts the connection and exits 1 with ECONNREFUSED. No tables were dropped because the port was closed.",
    paiseDifference: null,
    evidence: "command-logs/db-setup.json urlOnlyBypass",
    rootCause: "The substring check runs only when TEST_DB_NAME is set. A URL-only invocation skips it.",
    smallestRepair: "Parse the database name from TEST_DATABASE_URL and refuse it unless it contains test.",
    regressionTest: "URL-only name without test exits 2 and does not call createConnection.",
    closureCondition: "Both TEST_DB_NAME and TEST_DATABASE_URL are refused before any socket when the name lacks test.",
  },
  {
    id: "F-SYNC-SCHEMA",
    parentSurface: "Cloud sync",
    childWorkflow: "Schema contract versus company tables",
    phase: "baseline",
    severity: "medium",
    path: "tests/unit/phase-02-sync-contracts.test.ts",
    reproduction: "npm run test, first outcome.",
    expected: "Every contract table exists in the schema file the test reads, and ALTER ADD statements are idempotent.",
    actual: "2 tests failed, 581 passed. Company tables are reported missing from that schema, and company voucher index ALTERs do not match the idempotent pattern.",
    paiseDifference: null,
    evidence: "command-logs/test.log",
    rootCause: "Company tables live in company migrations while the phase-02 contract test still compares a schema list that does not include them.",
    smallestRepair: "Point the contract test at the company migration set, and make the index ALTERs information-schema guarded.",
    regressionTest: "The same vitest file exits 0 without changing the expected money totals.",
    closureCondition: "First-run vitest no longer reports those two failures.",
  },
  {
    id: "F-MIGRATE-ORDER",
    parentSurface: "Company books",
    childWorkflow: "Official company migration order",
    phase: "freeze",
    severity: "medium",
    path: "scripts/company/apply-migration.php",
    reproduction: "Read ORDER in apply-migration.php and compare with sql/migrations/20260930_company_phase_sv.sql.",
    expected: "The official order applies every company migration the running PHP requires.",
    actual: "ORDER stops at 20260924_company_perf_indexes.sql. The 20260930 invite-token and bridge_status migration is outside that list.",
    paiseDifference: null,
    evidence: "command-logs from apply-migration.php --only for the 20260930 files",
    rootCause: "The ordered list was not extended when the 30 Sep SQL was added.",
    smallestRepair: "Append the 20260930 files to ORDER.",
    regressionTest: "A fresh test database migrated only by apply-migration.php contains bridge_status.",
    closureCondition: "A reset plus the official migrator, with no extra --only, creates the 30 Sep columns.",
  },
  {
    id: "F-PKG-HEALTH",
    parentSurface: "Export files",
    childWorkflow: "Serve the extracted package",
    phase: "package",
    severity: "medium",
    path: "release/hosting-bundle.zip extracted to the evidence directory",
    reproduction: "php -S 127.0.0.1:8097 against the extracted tree with no database credentials in the process environment.",
    expected: "Health returns a configured healthy response, or a guarded refusal that does not boot half the API.",
    actual: "GET /api/healthz.php returned 500 ENV_VALIDATION_FAILED for CLOUD_JWT_SECRET. SPA HTML and JavaScript assets returned 200.",
    paiseDifference: null,
    evidence: "package-restore.json probes",
    rootCause: "The shipped .env.host does not contain a usable JWT secret, and the health check requires one.",
    smallestRepair: "Document the required secret as an operator step and make health distinguish not-configured from crashed.",
    regressionTest: "Serving the extracted zip with an explicit test env returns healthy, and serving it with empty env does not touch a non-test database.",
    closureCondition: "Extracted package health is green only when a disposable test database and a non-production secret are supplied.",
  },
  {
    id: "F-LINT",
    parentSurface: "Shell",
    childWorkflow: "eslint",
    phase: "baseline",
    severity: "low",
    path: "src/company/pages/LedgersPage.tsx, ReceivablesPage.tsx, ReportsHubPage.tsx",
    reproduction: "npm run lint, first outcome.",
    expected: "eslint exits 0.",
    actual: "Exit 1. Three errors: definition for rule react-hooks/exhaustive-deps was not found.",
    paiseDifference: null,
    evidence: "command-logs/lint.log",
    rootCause: "The rule is referenced and the plugin that defines it is not loaded.",
    smallestRepair: "Load the hooks plugin or remove the unused rule reference. Do not disable the rule to hide a hook bug.",
    regressionTest: "npm run lint exits 0.",
    closureCondition: "The three files lint without a missing-rule error.",
  },
];

function evaluateManifest(manifest, files) {
  const reasons = [];
  if (manifest.evidence?.some((file) => !files.has(file))) reasons.push("missing evidence");
  if (manifest.evidenceHash && manifest.evidenceHash !== manifest.computedHash) reasons.push("stale hash");
  if (manifest.tests === 0) reasons.push("zero tests");
  if (manifest.requirements?.some((row) => row.mandatoryLocal && row.verification === "FAIL")) reasons.push("failed mandatory local requirement");
  if (manifest.bankScope === "blocked" && manifest.conclusion === "LOCAL_COMPLETE") reasons.push("blocked bank scope claimed complete");
  const pass = reasons.length === 0 && manifest.conclusion === "LOCAL_COMPLETE" && manifest.tests > 0 && manifest.bankScope === "not-applicable";
  return { id: manifest.id, pass, reasons };
}

const dummyFiles = new Set(["evidence/oracle.json"]);
const gateCases = [
  evaluateManifest({ id: "missing-evidence", evidence: ["evidence/absent.json"], evidenceHash: "aa", computedHash: "aa", tests: 3, requirements: [], bankScope: "not-applicable", conclusion: "LOCAL_COMPLETE" }, dummyFiles),
  evaluateManifest({ id: "stale-hash", evidence: ["evidence/oracle.json"], evidenceHash: "aa", computedHash: "bb", tests: 3, requirements: [], bankScope: "not-applicable", conclusion: "LOCAL_COMPLETE" }, dummyFiles),
  evaluateManifest({ id: "zero-tests", evidence: ["evidence/oracle.json"], evidenceHash: "aa", computedHash: "aa", tests: 0, requirements: [], bankScope: "not-applicable", conclusion: "LOCAL_COMPLETE" }, dummyFiles),
  evaluateManifest({ id: "failed-requirement", evidence: ["evidence/oracle.json"], evidenceHash: "aa", computedHash: "aa", tests: 3, requirements: [{ mandatoryLocal: true, verification: "FAIL" }], bankScope: "not-applicable", conclusion: "LOCAL_COMPLETE" }, dummyFiles),
  evaluateManifest({ id: "blocked-bank", evidence: ["evidence/oracle.json"], evidenceHash: "aa", computedHash: "aa", tests: 3, requirements: [], bankScope: "blocked", conclusion: "LOCAL_COMPLETE" }, dummyFiles),
  evaluateManifest({ id: "complete-local", evidence: ["evidence/oracle.json"], evidenceHash: "aa", computedHash: "aa", tests: 3, requirements: [{ mandatoryLocal: true, verification: "PASS" }], bankScope: "not-applicable", conclusion: "LOCAL_COMPLETE" }, dummyFiles),
];
const gateOk = gateCases.slice(0, 5).every((row) => !row.pass) && gateCases[5].pass;

const finalConclusion = "LOCAL_REMEDIATION_REQUIRED";

const commandResults = [
  { name: "db-test-reset wrong name", exitCode: 2, note: "Refused sparowvault_owner_books before connect." },
  { name: "db-test-reset disposable", exitCode: 0, note: "sparowvault_test_svverify_b182d886, 33 tables before company migrations." },
  { name: "typecheck", exitCode: 0 },
  { name: "lint", exitCode: 1 },
  { name: "test", exitCode: 1, note: "2 failed, 581 passed, 81 files." },
  { name: "check:php", exitCode: 0, note: "142 files." },
  { name: "check:sql", exitCode: 0, note: "Static warnings, live rollback skipped." },
  { name: "company:test:php", exitCode: 0 },
  { name: "company http-e2e script", exitCode: 0, note: "In-process database script, not a socket server." },
  { name: "company idor script", exitCode: 0 },
  { name: "company export smoke", exitCode: 0 },
  { name: "finance:gate:all", exitCode: 0, note: "Report bytes restored to the pre-gate snapshot." },
  { name: "statements:gate:strict", exitCode: 1, note: "verified-for-scope layouts 0. 20-bank claim stays blocked." },
  { name: "personal oracles", exitCode: 0, note: "7 tests passed after the harness called saveTransferLinkForTransaction with the user id." },
  { name: "company oracles", exitCode: 0, note: "37 checks, 5 raw mismatches. O07 revenue sign was the audit debit-minus-credit reading; credit is 1000000 paise." },
  { name: "package extract serve restore", exitCode: 0, note: "21 vouchers restored. Health 500. Secret pattern hits 0." },
];

function mdTable(headers, rows) {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}\n`;
}

const parentRows = parents.map((parent) => {
  const rows = children.filter((row) => row.parentId === parent.id && row.mandatoryLocal);
  const ver = rows.some((row) => row.verification === "FAIL")
    ? "FAIL"
    : rows.every((row) => row.verification === "PASS")
      ? "PASS"
      : "NOT_RUN";
  return [parent.id, parent.side, parent.area, parent.name, parent.inventory, implOverride[parent.name] ?? implFromInventory(parent.inventory), ver];
});

writeFileSync(path.join(runDir, "PARENT_MATRIX.md"), `# 83 parent matrix\n\nRun ${runId}. Inventory labels are historical inputs.\n\n${mdTable(["Id", "Side", "Area", "Surface", "Inventory 30 Sep", "Implementation", "Verification"], parentRows)}`);

writeFileSync(path.join(runDir, "CHILD_TRACEABILITY.md"), `# Child traceability\n\nA file, toast, or old PASS does not close a parent. Entry means navigation and direct URL. Write means the handler. Readback means the store the reader uses.\n\n${mdTable(["Child", "Parent", "Kind", "Implementation", "Verification", "Workflow"], children.map((row) => [row.childId, row.parentId, row.kind, row.implementation, row.verification, row.workflow]))}`);

writeFileSync(path.join(runDir, "FINDINGS.json"), JSON.stringify({ runId, productSourceModifiedDuringAudit: false, findings }, null, 2));

writeFileSync(path.join(runDir, "COMMAND_RESULTS.json"), JSON.stringify({ runId, commands: commandResults, gatePoisoning: gateCases, gatePoisoningHonest: gateOk }, null, 2));

writeFileSync(path.join(runDir, "EXECUTION_STATE.json"), JSON.stringify({
  runId,
  status: "closed",
  groups: ["a00-freeze", "trace-children", "oracles-auth", "journeys-package", "final-artifacts"],
  finalConclusion,
  counts,
  productSourceModifiedDuringAudit: false,
  disposableDatabase: "sparowvault_test_svverify_b182d886",
  restoreDatabase: "sparowvault_test_svverify_b182d886_restore",
}, null, 2));

const report = `# Final implementation verification

**Run:** ${runId}
**Commit:** 6395ec9a040652a39a45b72ac12136cdd382df33 on master
**finalConclusion:** ${finalConclusion}
**productSourceModifiedDuringAudit:** false

Personal local-complete parents: **${counts.personalLocalComplete}** of 47.
Company local-complete parents: **${counts.companyLocalComplete}** of 36.

Mandatory local children: **${counts.pass}** pass, **${counts.fail}** fail, **${counts.blockedLocal}** blocked local, **${counts.notRun}** not run.
External children blocked: **${counts.blockedExternal}**.

SV31 closure and the inventory Shipped labels were not treated as passes. The playbook, ALL_83_SURFACES.md, SURFACE_COMPLETION_MANIFEST.json, PHASE_DEPENDENCIES.json, SYNTHETIC_FINANCE_ACCEPTANCE.json, and the testing zip were not in the workspace.

## Why this conclusion

Reproduced defects move money or authority: the reimbursement bridge stores no payable (${"-750000"} paise), a posted cheque reduces the bank immediately (${"-2500000"} paise versus a deferred clear), and inventory value is not on the STOCK ledger (${"-10000"} paise). The database reset guard does not refuse a URL whose name lacks \`test\`. Those are defects, not merely unexecuted checks.

Unexecuted local work is also recorded. Direct URL and form entry for the 83 parents was not driven in the owner's browser, because that browser session can reach the non-test database \`sparowvault\`. The 10 by 100 seed campaign and overlapping database concurrency were not run.

## What did match the independent paise

Personal IndexedDB \`sparowvault_v1\` through fake-indexeddb: a 200000 paise reservation left a 500000 paise bank balance unchanged; a 30000 paise transfer moved both accounts; a 250000 paise card purchase did not reduce the bank and a 100000 paise repayment was not a second expense; a 1200000 paise EMI schedule summed back to principal and did not insert another purchase; a 5000000 paise loan was cash and not income; a 40000 paise udhari was cash and not expense. All 64 alert preference combinations matched the six family switches in the preference function. Settings persistence of those switches was not executed.

Company PHP on \`sparowvault_test_svverify_b182d886\`: sale base 1000000 plus tax 180000 posted a receivable of 1180000; a 500000 receipt left 680000 open and the sales credit stayed 1000000. The first raw comparison stored sales net as debit-minus-credit, which is negative for a credit balance. The credit itself is 1000000 paise. Dimension splits of 60000 and 40000 summed to the 100000 line. Payroll accrual expense was 3180000 paise and the payment cleared 2600000 paise of payable without a second salary debit. A one-sided journal was rejected. A valid PIN did not grant reopen, opening balances, approval, or backup. Empty permissions and a foreign company were denied. The six report keys ran in PHP.

## Package

The existing \`release/hosting-bundle.zip\` was copied and extracted. \`npm run build\` and \`npm run host:package\` were not run, because prebuild deletes \`dist\` and the packager deletes \`release/hosting-bundle\`, both dirty untracked trees. php built-in server on port 8097 returned SPA HTML for \`/\` and \`/company/app/invoices\`, JavaScript for a page chunk and the PDF worker, and HTTP 500 from health because CLOUD_JWT_SECRET was absent. No private-key or live-payment patterns were found. 21 company vouchers copied into \`sparowvault_test_svverify_b182d886_restore\`. The owner schema was still present and was not reset.

## Gate poisoning

Dummy manifests are not app results. Missing evidence, a stale hash, zero tests, a failed mandatory requirement, and a blocked bank scope all failed. A complete local dummy passed. Checker honest: ${gateOk}.

## External scopes

Real 20-bank layouts, live Account Aggregator, live Razorpay, statutory filing, physical devices, and a hosted release stay BLOCKED_EXTERNAL or NOT_TESTED.
`;

writeFileSync(path.join(runDir, "FINAL_IMPLEMENTATION_VERIFICATION_REPORT.md"), report);

writeFileSync(path.join(runDir, "STATUS_SUMMARY.md"), `# Status summary\n\n${report.split("\n").slice(0, 16).join("\n")}\n\nSee FINAL_IMPLEMENTATION_VERIFICATION_REPORT.md.\n`);

writeFileSync(path.join(runDir, "PHASE_MATRIX.md"), `# Phase matrix\n\n| Phase | What ran | Result |\n| --- | --- | --- |\n| A00 freeze | Identity, hashes, wrong database name, disposable reset, unmodified suites | Wrong name exit 2. Lint exit 1. Vitest 2 failed. PHP syntax 0. SQL static 0. |\n| Path trace | 83 parents expanded to entry, write, readback, negative | Most entry children NOT_RUN. |\n| Oracles | O01–O13 and PIN, empty permission, foreign company | Personal money checks passed. Company invoice, payroll, dimensions, and auth checks passed. Inventory, cheque timing, and bridge failed. |\n| Journeys | Safe local money paths only. Playbook text missing. | Reduced coverage. 10x100 seed NOT_RUN. |\n| Package | Extract, serve, restore to a second test database | Health 500. Restore voucher count matched. |\n| Gate poisoning | Six dummy manifests | Five rejects and one accept. |\n`);

writeFileSync(path.join(runDir, "UI_MATRIX.md"), `# UI matrix\n\nDirect URL and form entry were not driven in the IDE browser. The owner API uses database \`sparowvault\`, which does not contain \`test\`. The extracted package returned the SPA shell for \`/company/app/invoices\` with status 200. That is a document response, not a posted voucher.\n\n${mdTable(["Id", "Surface", "Entry verification"], parents.map((parent) => [parent.id, parent.name, "NOT_RUN"]))}\n`);

writeFileSync(path.join(runDir, "API_MATRIX.md"), `# API matrix\n\nCompany writes used \`company_post_voucher\` and the report runner on the disposable database. The script named http-e2e posts through those PHP functions in process. It exited 0. A socket-level login with a PIN was not performed, so the PIN is not in this evidence.\n\n| Call | Database | Result |\n| --- | --- | --- |\n| Sale draft, promote, receipt | disposable test | Receivable 1180000, open 680000, sales credit 1000000 |\n| Dimension payment | disposable test | Allocation sum 100000 |\n| Payroll accrue and pay | disposable test | Expense 3180000, payable cleared |\n| Six report keys | disposable test | Handlers returned |\n| IDOR script | disposable test | Exit 0 |\n| Export smoke | no database | Exit 0 |\n| Package healthz | no credentials | HTTP 500 |\n`);

writeFileSync(path.join(runDir, "ORACLE_RESULTS.md"), `# Oracle results\n\nRupees in the scenarios were converted at 100 paise per rupee before comparison. Personal expected figures were not taken from \`computeAccountCashClosingPaise\`. Company expected figures were not taken from \`company_profit_loss\`.\n\n| Oracle | Expected paise | Actual paise | Difference | Reading |\n| --- | --- | --- | --- | --- |\n| O01 reservation | bank 500000, available 300000 | bank unchanged, zero transactions | 0 | PASS |\n| O02 transfer | from 70000, to 30000 | same | 0 | PASS |\n| O03 card | bank 300000 after repayment, expense 250000, liability 150000 | same | 0 | PASS |\n| O04 EMI | principal sum 1200000, no second purchase | same | 0 | PASS |\n| O05 loan | cash 5000000, income 0 | same | 0 | PASS |\n| O06 udhari | cash 60000, expense 0 | same | 0 | PASS |\n| O07 sale and receipt | revenue credit 1000000, tax credit 180000, open receivable 680000 | credits and receivable match | 0 after sign correction | PASS |\n| O08 split | 100000 | 100000 | 0 | PASS |\n| O09 stock ledger | 10000 | 0 | -10000 | FAIL |\n| O10 payroll | expense 3180000, payable 0 after pay | same | 0 | PASS |\n| O11 cheque | bank unchanged until clear | bank lower by 2500000 | -2500000 | FAIL |\n| O12 bridge | payable 750000 | 0 | -750000 | FAIL |\n| O13 one-sided journal | rejected | rejected |  | PASS |\n\nThe raw company file still stores the debit-minus-credit sales figure of -1000000. That is the credit of 1000000, not a missing million rupees.\n`);

writeFileSync(path.join(runDir, "SYNC_CONCURRENCY.md"), `# Sync and concurrency\n\nCloud sync's phase-02 contract test failed on the first vitest run (2 assertions). No overlapping PHP workers were started. Two browser promises against one PHP process would not show a database race, so concurrency is NOT_RUN. Generic sync push and pull were not executed against the disposable database.\n`);

writeFileSync(path.join(runDir, "BANK_SCORECARD.md"), `# Bank scorecard\n\nstatements:gate:strict exited 1. verified-for-scope layouts: 0. blockedFor20BankClaim: true. Real 20-bank layouts were not scored. A missing PDF corpus does not hide the local save, match, and post gap: company bank reconciliation has no clear-later cheque state (F-O11).\n`);

writeFileSync(path.join(runDir, "EXPORT_RECONCILIATION.md"), `# Export reconciliation\n\ncompany export smoke exited 0 and built a PDF with a header and a docx or fallback body. It uses fixture rows of 100, not the disposable ledger. Package secret-pattern scan hit 0 files. .env.host values are short placeholders. They were not copied into this report.\n`);

writeFileSync(path.join(runDir, "RULE_PROVIDER_SCOPE.md"), `# Rule and provider scope\n\nPurpose rules and the report registry on disk were hashed at freeze. The six keys receipts-payments, project-report, business-report, area-report, category-report, and user-activity are enabled and their PHP handlers ran. The 30 Sep inventory still calls those keys disabled. That inventory line is historical.\n\nLive Razorpay, live Account Aggregator, and statutory GST filing were not called.\n`);

writeFileSync(path.join(runDir, "PACKAGE_RESTORE.md"), `# Package and restore\n\nSource zip: release/hosting-bundle.zip copied into this run directory and extracted (220 files).\nServed with php -S 127.0.0.1:8097 and no database credentials.\n\n| Path | Status |\n| --- | --- |\n| / | 200 text/html |\n| /index.html | 200 text/html |\n| /company/app/invoices | 200 text/html |\n| /api/healthz.php | 500 ENV_VALIDATION_FAILED |\n| JS chunk and pdf worker | 200 application/javascript |\n\nRestore target \`sparowvault_test_svverify_b182d886_restore\` received 21 vouchers, matching the source disposable database. Owner database \`sparowvault\` was not dropped.\n`);

writeFileSync(path.join(runDir, "PRIORITIZED_REPAIR_SPECIFICATION.md"), `# Prioritized repair specification\n\n1. **F-O12** Post the reimbursement payable with the link. 750000 paise are missing from the company book.\n2. **F-O11** Split cheque issue from clear so the bank does not move 2500000 paise early.\n3. **F-O09** Post STOCK for the item subledger. 10000 paise of remaining stock is off the ledger.\n4. **F-DB-URL** Refuse TEST_DATABASE_URL names that lack \`test\` before connect.\n5. **F-MIGRATE-ORDER** Add the 20260930 SQL files to the official company migration order.\n6. **F-SYNC-SCHEMA** Make the phase-02 schema contract include company migrations and idempotent index alters.\n7. **F-PKG-HEALTH** Keep package health from booting without a supplied secret, and document the operator env.\n8. **F-LINT** Provide the exhaustive-deps rule or stop referencing it.\n\nDo not change expected money figures to match the current defects.\n`);

writeFileSync(path.join(runDir, "AUDIT_CHANGE_LOG.md"), `# Audit change log\n\n- Product source was not patched. \`productSourceModifiedDuringAudit\` is false.\n- \`docs/certification/PHASE_L_VNEXT_FINANCE_GATE_REPORT.md\` was rewritten by finance:gate:all and then restored to the pre-gate bytes. The hash matches the snapshot.\n- Evidence, runners, and this report live only under this run directory.\n- The first personal transfer-link assertion failed because the harness omitted the user id. The rerun is the recorded personal oracle. The cash totals had already matched on the first run.\n- The company sales raw net used debit minus credit. The report reads a credit balance as positive revenue. The raw JSON is unchanged.\n- No PIN, token, or payroll identity was written into the shareable JSON.\n`);

writeFileSync(path.join(runDir, "JOURNEYS.md"), `# Journeys J01–J10\n\nThe playbook that names J01–J10 was not in the workspace. The rows below are the safe local journeys this run could execute. They are not a reconstruction of the missing playbook.\n\n| Id | What was executed | Result |\n| --- | --- | --- |\n| J01 | Personal reservation and bank unchanged | PASS |\n| J02 | Personal transfer both legs | PASS |\n| J03 | Card purchase and repayment | PASS |\n| J04 | Loan proceeds not income | PASS |\n| J05 | Udhari given not expense | PASS |\n| J06 | Company sale then receipt | PASS on paise |\n| J07 | Dimension split | PASS |\n| J08 | Payroll accrue then pay | PASS |\n| J09 | Copy disposable books to a second test database | PASS, 21 vouchers |\n| J10 | PIN without the sensitive permissions, empty permissions, foreign company | PASS |\n\nReduced coverage: no 10 by 100 seed, no second concurrent PHP worker, no browser form entry, no physical device.\n`);

const skip = new Set(["package-extract"]);
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}
const manifestRows = walk(runDir).map((file) => {
  const rel = path.relative(runDir, file).replaceAll("\\", "/");
  const buf = readFileSync(file);
  return `${createHash("sha256").update(buf).digest("hex")}  ${rel}`;
});
writeFileSync(path.join(runDir, "EVIDENCE_MANIFEST.txt"), manifestRows.sort().join("\n") + "\n");

console.log(JSON.stringify(counts, null, 2));
