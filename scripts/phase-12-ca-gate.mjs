#!/usr/bin/env node
/**
 * PHASE 12 GATE — CA reports and micro-business mode.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/caReports.ts", "CA report service"),
  fileExists("src/services/businessPersonalSplit.ts", "business/personal split service"),
  fileExists("tests/unit/caReports.test.ts", "CA report tests"),
  fileExists("src/services/__tests__/businessPersonalSplit.test.ts", "business/personal split tests"),
  vitestFile("tests/unit/caReports.test.ts", "caReports tests"),
  vitestFile("src/services/__tests__/businessPersonalSplit.test.ts", "businessPersonalSplit tests"),

  fileContains("src/services/caReports.ts", /reportTransactionMaster/, "transaction master report"),
  fileContains("src/services/caReports.ts", /reportMonthlyCashflow/, "monthly cashflow report"),
  fileContains("src/services/caReports.ts", /reportCategoryLedger/, "category ledger report"),
  fileContains("src/services/caReports.ts", /reportAccountLedger/, "account ledger report"),
  fileContains("src/services/caReports.ts", /reportCardLedger/, "credit card ledger report"),
  fileContains("src/services/caReports.ts", /reportLoanAmortization/, "loan amortization report"),
  fileContains("src/services/caReports.ts", /reportInterestPaid/, "interest paid summary"),
  fileContains("src/services/caReports.ts", /reportUdhariAgeing/, "udhari ageing report"),
  fileContains("src/services/caReports.ts", /reportBusinessExpense/, "business expense report"),
  fileContains("src/services/caReports.ts", /reportPersonalExpense/, "personal expense report"),
  fileContains("src/services/caReports.ts", /reportGstMissingBill/, "GST missing bill report"),
  fileContains("src/services/caReports.ts", /reportTaxFlag/, "tax flag report"),
  fileContains("src/services/caReports.ts", /reportNetWorth/, "net worth report"),
  fileContains("src/services/caReports.ts", /reportDebtSummary/, "debt summary report"),
  fileContains("src/services/caReports.ts", /reportReceivablePayableSummary/, "receivable/payable summary"),
  fileContains("src/services/caReports.ts", /reportAccountReconciliation/, "account reconciliation"),
  fileContains("src/services/caReports.ts", /buildReportFooter/, "export footer contract"),
  fileContains("src/exports/xlsxExporter.ts", /Export_Footer/, "workbook export footer sheet"),
  fileContains("src/exports/xlsxExporter.ts", /Account_Reconciliation/, "workbook reconciliation sheet"),
];

const manual = [
  "Open Export Center and generate a CA workbook for a fresh user.",
  "Confirm workbook includes Transactions_Master, Account_Reconciliation, Export_Footer, and CA_Notes.",
  "Confirm transaction master rows include date, local date, transaction ID, event ID, voucher reference, type, category, account/card/loan/goal/person, merchant/person, amount, business/personal, tax/GST, bill, attachment, deleted/reversed status.",
  "Create a mixed business/personal expense and confirm business/personal paise split sums exactly to the transaction amount.",
  "Create a GST/tax transaction without bill and confirm it appears in GST Missing Bill.",
  "Create an account mismatch scenario and confirm reconciliation reports mismatch and possible causes.",
  "Confirm footer includes generated at, report period, masked user ID, ledger/effects data source, app version, export version, and reconciliation status.",
];

await runGate({
  phase: "12-CA",
  title: "CA reports and micro-business mode",
  outPath: "PHASE_12_CA_REPORTS_MICRO_BUSINESS_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
