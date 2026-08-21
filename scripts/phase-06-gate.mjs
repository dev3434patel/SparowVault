#!/usr/bin/env node
/**
 * PHASE 6 GATE - Credit-card premium engine.
 */
import { runGate, fileContains, fileExists, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/cardEngine.ts", "card engine present"),
  fileContains("src/services/cardEngine.ts", /resolveCardOutstandingPaise/, "outstanding source resolver"),
  fileContains("src/services/cardEngine.ts", /outstandingSource/, "outstanding source exposed"),
  fileContains("src/services/cardEngine.ts", /Calculated from legacy transactions\. Please repair missing card links\./, "legacy fallback warning"),
  fileContains("src/services/cardEngine.ts", /calculatePaymentToReachUtilization/, "utilization paydown suggestions"),
  fileContains("src/services/cardEngine.ts", /minimumDueWarning/, "minimum due warning"),
  fileContains("src/services/cardEngine.ts", /buildCardRepairQueue/, "card repair queue"),
  fileContains("src/services/cardEngine.ts", /card_payment_missing_card/, "card payment repair issue"),
  fileContains("src/services/cardEngine.ts", /card_invalid_limit/, "invalid card limit repair issue"),
  fileContains("src/services/cardEngine.ts", /legacy_manual_card_reviewed/, "legacy/manual repair escape hatch"),

  fileContains("src/services/financeEventBuilder.ts", /paymentMode === "credit_card"[\s\S]*"credit_card"[\s\S]*"decrease"[\s\S]*"liability"/, "frontend credit-card refund reduces liability"),
  fileContains("php/helpers/finance_events.php", /credit_card[\s\S]*decrease[\s\S]*expense_category/s, "backend credit-card refund reduces liability and reverses expense"),
  fileContains("php/helpers/cloud_payload.php", /refund[\s\S]*credit_card[\s\S]*linkedCardId/s, "backend validation requires card for card refunds"),

  fileContains("src/components/forms/TransactionForm.tsx", /activeCreditCards/, "inactive/deleted cards hidden from transaction form"),
  fileContains("src/components/forms/TransactionForm.tsx", /state\.type !== "cc_payment"[\s\S]*state\.paymentMode !== "credit_card"/, "card payment does not clear linked card"),
  fileContains("src/components/pages/CardsPage.tsx", /Credit-card repair queue/, "repair queue UI"),
  fileContains("src/components/pages/CardsPage.tsx", /Pay below 80%/, "risk paydown UI"),
  fileContains("src/components/pages/CardsPage.tsx", /Mark legacy \/ manual/, "legacy/manual repair action"),

  fileExists("src/services/__tests__/cardEngine.test.ts", "card engine tests"),
  fileExists("src/services/__tests__/ledger.scenarios.test.ts", "ledger scenario tests"),
  fileExists("src/services/__tests__/transactionFormRules.test.ts", "form rules tests"),
  vitestFile("src/services/__tests__/cardEngine.test.ts", "vitest: card engine"),
  vitestFile("src/services/__tests__/ledger.scenarios.test.ts", "vitest: ledger scenarios"),
  vitestFile("src/services/__tests__/transactionFormRules.test.ts", "vitest: form rules"),
];

const manual = [
  "Cards page opens and shows credit cards without a fatal console error.",
  "Deleted/inactive credit cards are not selectable for a new credit-card transaction.",
  "Credit-card purchase increases expense and card liability; bank balance does not move.",
  "Credit-card bill payment decreases bank and card liability; no new expense is created.",
  "Credit-card refund decreases card liability and reverses the linked expense category; it is not income unless explicitly cashback/reward.",
  "Cards page displays statement balance, unbilled amount, current outstanding, due date, minimum due, full due, risk level, and pay-below 80/50/30 suggestions.",
  "Minimum-due warning appears when minimum due is less than full due.",
  "Repair tab lists missing card links, missing card payment links, invalid limits, and missing due days.",
  "Repair action can assign a card, convert a misclassified card expense to UPI, or mark a row legacy/manual.",
  "Referenced card deletion archives the card so historical transactions retain the card name.",
];

await runGate({
  phase: 6,
  title: "Credit-card premium engine",
  outPath: "PHASE_06_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
