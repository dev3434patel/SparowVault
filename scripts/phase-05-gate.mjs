#!/usr/bin/env node
/**
 * PHASE 5 GATE - Smart transaction form and finance-aware preview.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/components/forms/TransactionForm.tsx", "TransactionForm present"),
  fileExists("src/components/forms/QuickAddDialog.tsx", "QuickAddDialog present"),
  fileExists("src/services/transactionFormRules.ts", "conditional validation rules present"),
  fileExists("src/services/transactionPreview.ts", "transaction preview service present"),
  fileExists("src/services/__tests__/transactionFormRules.test.ts", "validation tests present"),
  fileExists("src/services/__tests__/transactionPreview.test.ts", "preview tests present"),

  fileContains("src/components/forms/TransactionForm.tsx", /buildTransactionPreview/, "TransactionForm renders preview"),
  fileContains("src/components/forms/TransactionForm.tsx", /disabled=\{!canSave\}/, "save disabled until valid"),
  fileContains("src/components/forms/QuickAddDialog.tsx", /validates required finance links/, "QuickAdd explains smart validation"),

  fileContains("src/services/transactionFormRules.ts", /Select the credit card used for this expense/, "credit-card expense validation message"),
  fileContains("src/services/transactionFormRules.ts", /Select the loan for this EMI payment/, "EMI validation message"),
  fileContains("src/services/transactionFormRules.ts", /You cannot transfer to the same account/, "same-account transfer blocked"),
  fileContains("src/services/transactionPreview.ts", /Bank balance will not change today/, "credit-card purchase bank warning"),
  fileContains("src/services/transactionPreview.ts", /Credit card bill payment is not a new expense/, "card bill payment warning"),
  fileContains("src/services/transactionPreview.ts", /Remaining loan principal after this payment/, "EMI remaining principal preview"),
  fileContains("src/services/transactionPreview.ts", /Receivable increases/, "udhari given preview"),
  fileContains("src/services/transactionPreview.ts", /Payable increases/, "udhari received preview"),
  fileContains("src/services/transactionPreview.ts", /Goal progress after contribution/, "goal progress preview"),

  vitestFile("src/services/__tests__/transactionFormRules.test.ts", "vitest: transaction form validation"),
  vitestFile("src/services/__tests__/transactionPreview.test.ts", "vitest: transaction preview"),
];

const manual = [
  "Open Quick Add Expense and confirm the preview appears before save.",
  "Expense + UPI requires account/category and shows account balance preview.",
  "Expense + credit card requires card/category, not bank account, and shows outstanding/limit/utilization.",
  "Credit-card bill payment requires card/account and says it is not a new expense.",
  "EMI payment requires loan/account and shows principal, interest, and remaining principal.",
  "Loan disbursement requires loan/account and shows cash increase plus loan liability increase.",
  "Udhari given/received/settlement require person/account and explain receivable/payable treatment.",
  "Goal contribution requires goal/account and shows progress after contribution.",
  "Transfer requires two different accounts and blocks same-account transfers.",
];

await runGate({
  phase: 5,
  title: "Smart transaction form and preview",
  outPath: "PHASE_05_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
