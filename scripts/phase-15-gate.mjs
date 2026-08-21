#!/usr/bin/env node
/**
 * PHASE 15 GATE — CA reports + business/personal split.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/businessPersonalSplit.ts", "split engine"),
  fileExists("src/services/caReports.ts",             "CA reports module"),
  fileExists("src/services/__tests__/businessPersonalSplit.test.ts", "split test"),
  fileExists("tests/unit/caReports.test.ts", "CA reports test"),
  vitestFile("src/services/__tests__/businessPersonalSplit.test.ts", "vitest: split"),
  vitestFile("tests/unit/caReports.test.ts", "vitest: CA reports"),

  fileContains("src/services/caReports.ts", /reportTransactionMaster/, "Transaction Master"),
  fileContains("src/services/caReports.ts", /reportMonthlyCashflow/,   "Monthly Cashflow"),
  fileContains("src/services/caReports.ts", /reportCategoryLedger/,    "Category Ledger"),
  fileContains("src/services/caReports.ts", /reportAccountLedger/,     "Account Ledger"),
  fileContains("src/services/caReports.ts", /reportCardLedger/,        "Credit Card Ledger"),
  fileContains("src/services/caReports.ts", /reportInterestPaid/,      "Interest Paid"),
  fileContains("src/services/caReports.ts", /reportUdhariAgeing/,      "Udhari Ageing"),
  fileContains("src/services/caReports.ts", /reportBusinessExpense/,   "Business Expense"),
  fileContains("src/services/caReports.ts", /reportPersonalExpense/,   "Personal Expense"),
  fileContains("src/services/caReports.ts", /reportTaxFlag/,           "Tax Flag"),
  fileContains("src/services/caReports.ts", /reportGstMissingBill/,    "GST / Missing Bill"),
  fileContains("src/services/caReports.ts", /reportNetWorth/,          "Net Worth"),
];

const manual = [
  "Open the local app with the fixture data set. For each report below, confirm values match the on-screen Dashboard / drilldowns:",
  "  • Transaction Master — every line includes voucherRefId, businessOrPersonal, splitBusinessPaise, splitPersonalPaise.",
  "  • Monthly Cashflow — inflows + outflows for each YYYY-MM; net = in − out.",
  "  • Category Ledger — EXCLUDES credit-card bill payments (use Phase 5 effects, not raw txs).",
  "  • Account Ledger — net per account.",
  "  • Credit Card Ledger — purchases + payments + net liability change.",
  "  • Interest Paid — separates principal vs interest per loan.",
  "  • Udhari Ageing — buckets 0-7, 8-30, 31-90, 90+.",
  "  • Business Expense Report — only the business portion of mixed transactions.",
  "  • Personal Expense Report — only the personal portion of mixed transactions.",
  "  • Tax Flag Report — taxFlag = 1 rows.",
  "  • GST / Missing Bill Report — gstApplicable=1 AND billAvailable=0.",
  "  • Net Worth — accounts + receivables − card outstanding − loan principal − payable.",
  "Excel export totals MUST match the on-screen UI totals to the paise.",
  "Mark one transaction as deleted — every report excludes it; admin 'audit mode' (later) is the only place it shows.",
];

await runGate({
  phase: 15,
  title: "Premium CA reports + business/personal",
  outPath: "PHASE_15_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
