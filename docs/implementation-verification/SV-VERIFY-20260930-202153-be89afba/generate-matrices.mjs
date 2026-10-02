import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const runDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const personal = JSON.parse(fs.readFileSync(path.join(runDir, "oracle-personal.json"), "utf8"));
const company = JSON.parse(fs.readFileSync(path.join(runDir, "oracle-company.json"), "utf8"));
const byId = Object.fromEntries([...personal.results, ...company.results].map((row) => [row.id, row]));

const parents = [
  ["P01", "Personal", "Shell", "App shell and history routing", "FULL", "NOT_RUN"],
  ["P02", "Personal", "Shell", "Desktop sidebar", "FULL", "NOT_RUN"],
  ["P03", "Personal", "Shell", "Mobile bar", "PARTIAL", "NOT_RUN"],
  ["P04", "Personal", "Shell", "Command palette and quick add", "PARTIAL", "NOT_RUN"],
  ["P05", "Personal", "Shell", "Personal language pack", "SCHEMA_ONLY", "NOT_RUN"],
  ["P06", "Personal", "Dashboard", "Month snapshot, charts, recent activity", "FULL", "NOT_RUN"],
  ["P07", "Personal", "Dashboard", "Modes basic, normal, premium", "FULL", "NOT_RUN"],
  ["P08", "Personal", "Dashboard", "Modes essential, family, wealth", "PARTIAL", "NOT_RUN"],
  ["P09", "Personal", "Dashboard", "Payday cashflow panel", "FULL", "NOT_RUN"],
  ["P10", "Personal", "Ledger", "Transactions", "FULL", "NOT_RUN"],
  ["P11", "Personal", "Ledger", "Income and expense pages", "FULL", "NOT_RUN"],
  ["P12", "Personal", "Ledger", "Tags on a transaction", "FULL", "NOT_RUN"],
  ["P13", "Personal", "Ledger", "Categories", "PARTIAL", "NOT_RUN"],
  ["P14", "Personal", "Ledger", "Transfers", "PARTIAL", "PASS"],
  ["P15", "Personal", "Planning", "Budgets", "FULL", "NOT_RUN"],
  ["P16", "Personal", "Planning", "Goals", "FULL", "NOT_RUN"],
  ["P17", "Personal", "Planning", "Envelope budgeting", "PARTIAL", "PASS"],
  ["P18", "Personal", "Planning", "Sinking funds", "PARTIAL", "PASS"],
  ["P19", "Personal", "Planning", "Recurring rules", "PARTIAL", "NOT_RUN"],
  ["P20", "Personal", "Planning", "Bill calendar", "PARTIAL", "NOT_RUN"],
  ["P21", "Personal", "Planning", "Reminders", "SCHEMA_ONLY", "NOT_RUN"],
  ["P22", "Personal", "Accounts", "Accounts", "FULL", "NOT_RUN"],
  ["P23", "Personal", "Accounts", "Credit and debit cards", "FULL", "PASS"],
  ["P24", "Personal", "Accounts", "Card EMI", "PARTIAL", "PASS"],
  ["P25", "Personal", "Accounts", "Card statements and payment allocations", "PARTIAL", "PASS"],
  ["P26", "Personal", "Accounts", "Loans and EMI", "FULL", "PASS"],
  ["P27", "Personal", "Accounts", "Udhari and advances", "FULL", "PASS"],
  ["P28", "Personal", "Wealth", "Investments", "FULL", "NOT_RUN"],
  ["P29", "Personal", "Wealth", "FD, RD, insurance, valuations", "FULL", "NOT_RUN"],
  ["P30", "Personal", "Household", "Household page", "PARTIAL", "PASS"],
  ["P31", "Personal", "Household", "Household permissions", "PARTIAL", "NOT_RUN"],
  ["P32", "Personal", "Insights", "Reports", "FULL", "NOT_RUN"],
  ["P33", "Personal", "Insights", "Suggestions and persona", "FULL", "NOT_RUN"],
  ["P34", "Personal", "Insights", "Alerts", "PARTIAL", "PASS"],
  ["P35", "Personal", "Insights", "Reconciliation", "PARTIAL", "NOT_RUN"],
  ["P36", "Personal", "Data", "CSV and spreadsheet import", "FULL", "NOT_RUN"],
  ["P37", "Personal", "Data", "PDF bank and card statements", "PARTIAL", "BLOCKED_EXTERNAL"],
  ["P38", "Personal", "Data", "JSON backup and repair", "FULL", "NOT_RUN"],
  ["P39", "Personal", "Data", "Account Aggregator", "SCHEMA_ONLY", "BLOCKED_EXTERNAL"],
  ["P40", "Personal", "Data", "Attachments and snapshots", "SCHEMA_ONLY", "NOT_RUN"],
  ["P41", "Personal", "System", "Settings", "FULL", "PASS"],
  ["P42", "Personal", "System", "Profile, PIN, lock", "FULL", "NOT_RUN"],
  ["P43", "Personal", "System", "Cloud sync", "PARTIAL", "NOT_RUN"],
  ["P44", "Personal", "System", "Audit log", "FULL", "NOT_RUN"],
  ["P45", "Personal", "System", "Subscription", "PARTIAL", "BLOCKED_EXTERNAL"],
  ["P46", "Personal", "System", "Plan feature gates", "PARTIAL", "NOT_RUN"],
  ["P47", "Personal", "System", "Admin portal", "FULL", "NOT_RUN"],
  ["C01", "Company", "Access", "Login, select, create company", "FULL", "PASS"],
  ["C02", "Company", "Access", "Invite by user id", "FULL", "NOT_RUN"],
  ["C03", "Company", "Access", "Invite-token accept", "PARTIAL", "NOT_RUN"],
  ["C04", "Company", "Access", "Roles", "PARTIAL", "PASS"],
  ["C05", "Company", "Access", "English and Gujarati", "FULL", "NOT_RUN"],
  ["C06", "Company", "Dashboard", "Company dashboard", "FULL", "NOT_RUN"],
  ["C07", "Company", "Money", "Money received and money paid", "FULL", "NOT_RUN"],
  ["C08", "Company", "Money", "Transfer and journal", "FULL", "PASS"],
  ["C09", "Company", "Money", "Purpose catalogue", "FULL", "PASS"],
  ["C10", "Company", "Money", "Voucher list and detail", "FULL", "NOT_RUN"],
  ["C11", "Company", "Money", "Purchase and sale screens", "PARTIAL", "PASS"],
  ["C12", "Company", "Money", "Dimensions on vouchers", "PARTIAL", "PASS"],
  ["C13", "Company", "Parties", "Parties", "FULL", "NOT_RUN"],
  ["C14", "Company", "Parties", "Party detail", "PARTIAL", "NOT_RUN"],
  ["C15", "Company", "Parties", "Receivables and payables", "FULL", "PASS"],
  ["C16", "Company", "Parties", "Party categories", "FULL", "NOT_RUN"],
  ["C17", "Company", "Books", "Ledgers and opening balance", "PARTIAL", "PASS"],
  ["C18", "Company", "Books", "Cash and bank", "FULL", "NOT_RUN"],
  ["C19", "Company", "Books", "Bank reconciliation and statements", "MISSING", "NOT_RUN"],
  ["C20", "Company", "Masters", "Business units, areas, projects, cost centres", "PARTIAL", "PASS"],
  ["C21", "Company", "Reports", "Live reports", "FULL", "PASS"],
  ["C22", "Company", "Reports", "Formerly disabled report keys", "FULL", "PASS"],
  ["C23", "Company", "Reports", "Export files", "PARTIAL", "PASS"],
  ["C24", "Company", "Reports", "Search", "PARTIAL", "NOT_RUN"],
  ["C25", "Company", "Control", "Approvals", "FULL", "PASS"],
  ["C26", "Company", "Control", "Audit", "FULL", "NOT_RUN"],
  ["C27", "Company", "Control", "Settings and period lock", "PARTIAL", "PASS"],
  ["C28", "Company", "Control", "Permission gates on pages", "PARTIAL", "PASS"],
  ["C29", "Company", "Deferred", "GST returns", "PARTIAL", "BLOCKED_EXTERNAL"],
  ["C30", "Company", "Deferred", "Inventory", "PARTIAL", "FAIL"],
  ["C31", "Company", "Deferred", "Payroll", "PARTIAL", "PASS"],
  ["C32", "Company", "Deferred", "Documents", "PARTIAL", "NOT_RUN"],
  ["C33", "Company", "Deferred", "Recurring company rules", "PARTIAL", "NOT_RUN"],
  ["C34", "Company", "Deferred", "Personal to company bridge", "PARTIAL", "FAIL"],
  ["C35", "Company", "Deferred", "Company billing", "PARTIAL", "BLOCKED_EXTERNAL"],
  ["C36", "Company", "Deferred", "Company groups", "PARTIAL", "PASS"],
];

const childJobs = [
  ["route", "Open the surface from navigation and by direct URL"],
  ["write", "Submit the form or call the API and read the authoritative store"],
  ["effect", "Confirm the financial effect, or confirm that no money moved"],
  ["negative", "Reject the unauthorized, stale, unbalanced, or out-of-scope case"],
];

const children = [];
const negativePass = new Set(["C04", "C12", "C17", "C25", "C27", "C28"]);
for (const [id, side, area, name, impl, verify] of parents) {
  childJobs.forEach(([job, title], index) => {
    let childVerify = "NOT_RUN";
    if (job === "route" && id === "C11") childVerify = "NOT_RUN";
    if (job === "write" || job === "effect") childVerify = verify;
    if (job === "negative") childVerify = negativePass.has(id) ? "PASS" : (verify === "FAIL" ? "FAIL" : "NOT_RUN");
    if (job === "route") childVerify = "NOT_RUN";
    children.push({
      childId: `${id}.${index + 1}`,
      parentId: id,
      side,
      area,
      parent: name,
      job,
      title,
      implementation: impl,
      verification: childVerify,
      closesParent: false,
      evidence: "Code trace plus the oracle file when this parent is named in ORACLE_RESULTS.md. A helper golden is not this row's pass.",
    });
  });
}

const locallyComplete = parents.filter((row) => row[5] === "PASS" && row[4] === "FULL").map((row) => row[0]);
fs.writeFileSync(path.join(runDir, "parent-matrix.json"), JSON.stringify({
  note: "Implementation is not verification. No parent is locally complete from one child. locallyCompleteParentIds stays empty unless every mandatory child is FULL and its checks passed.",
  locallyCompleteParentIds: [],
  parentsPassingTheirExecutedCheck: locallyComplete,
  parents: parents.map(([id, side, area, name, impl, verify]) => ({ id, side, area, name, implementation: impl, verification: verify })),
}, null, 2));
fs.writeFileSync(path.join(runDir, "child-traceability.json"), JSON.stringify({ count: children.length, children }, null, 2));

const matrix = ["# 83-parent matrix", "", "Implementation and verification are separate. No parent is closed by a helper, an old PASS, or an SV31 note.", "", "| ID | Side | Surface | Implementation | Verification |", "|---|---|---|---|---|", ...parents.map(([id, side, , name, impl, verify]) => `| ${id} | ${side} | ${name} | ${impl} | ${verify} |`), ""].join("\n");
fs.writeFileSync(path.join(runDir, "PARENT_MATRIX.md"), matrix);

const oracleMd = ["# Oracle results", "", "Rupees are converted at 100 paise per rupee. Disposable stores: IndexedDB name `sparowvault_verify_idb` (fake-indexeddb, deleted after the run) and MySQL `sparowvault_verify_test`. The configured application database was not reset.", "", "| ID | Result | Paise / count |", "|---|---|---|"];
for (const row of [...personal.results, ...company.results]) {
  const diff = row.differencePaise ?? row.valueDifferencePaise ?? "";
  oracleMd.push(`| ${row.id} | ${row.status} | ${diff === "" ? "see JSON" : "difference " + diff} |`);
}
oracleMd.push("", "O09 stored stock value 600 and COGS 400. The paise expectation for a buy of 10 at Rs 100 and a sale of 4 at Rs 150 is value 60000 and COGS 40000. No voucher was added.", "O12 wrote a link plan of 100000 and added 0 vouchers and 0 personal rows.", "AUTH in the first JSON flags openingDenied false because the viewer was rejected for create_journal before the opening-balance sentence. A later manager probe, with create_journal and without manage_opening_balances, was rejected with that permission name. Bob created 0 vouchers. Foreign-company sale rows were 0. A stale preview hash was rejected. A valid synthetic PIN was accepted only as a PIN check, not as a permission.", "");
fs.writeFileSync(path.join(runDir, "ORACLE_RESULTS.md"), oracleMd.join("\n"));

function sha(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash("sha256").update(buf).digest("hex");
}
const evidence = [];
for (const name of fs.readdirSync(runDir)) {
  const full = path.join(runDir, name);
  if (fs.statSync(full).isFile() && name !== "EVIDENCE_MANIFEST.json") {
    evidence.push({ name, sha256: sha(full), bytes: fs.statSync(full).size });
  }
}
fs.writeFileSync(path.join(runDir, "EVIDENCE_MANIFEST.json"), JSON.stringify({
  runId: "SV-VERIFY-20260930-202153-be89afba",
  productSourceModifiedDuringAudit: false,
  files: evidence,
}, null, 2));
console.log("parents", parents.length, "children", children.length);
