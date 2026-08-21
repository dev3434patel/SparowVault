#!/usr/bin/env node
/**
 * PHASE 8 GATE - Udhari and informal finance engine.
 */
import { runGate, fileContains, fileExists, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/udhariEngine.ts", "udhari engine present"),
  fileContains("src/services/udhariEngine.ts", /buildUdhariPeopleIntel/, "person ledger builder"),
  fileContains("src/services/udhariEngine.ts", /opaquePhoneHash/, "phone hash support"),
  fileContains("src/services/udhariEngine.ts", /normal_0_7/, "0-7 ageing bucket"),
  fileContains("src/services/udhariEngine.ts", /watch_8_30/, "8-30 ageing bucket"),
  fileContains("src/services/udhariEngine.ts", /risky_31_90/, "31-90 ageing bucket"),
  fileContains("src/services/udhariEngine.ts", /doubtful_90_plus/, "90+ ageing bucket"),
  fileContains("src/services/udhariEngine.ts", /UdhariReminderTone/, "reminder tone support"),
  fileContains("src/services/udhariEngine.ts", /validateWriteOffReason/, "write-off reason validation"),
  fileContains("src/services/financeEventBuilder.ts", /case "udhari_given"[\s\S]*"account"[\s\S]*"decrease"[\s\S]*"receivable"/, "udhari given ledger mapping"),
  fileContains("src/services/financeEventBuilder.ts", /case "udhari_received"[\s\S]*"account"[\s\S]*"increase"[\s\S]*"payable"/, "udhari received ledger mapping"),
  fileContains("src/services/financeEventBuilder.ts", /case "udhari_collect"[\s\S]*"account"[\s\S]*"increase"[\s\S]*"receivable"/, "settlement received mapping"),
  fileContains("src/services/financeEventBuilder.ts", /case "udhari_repay"[\s\S]*"account"[\s\S]*"decrease"[\s\S]*"payable"/, "settlement paid mapping"),
  fileContains("src/services/financeEventBuilder.ts", /case "udhari_write_off"[\s\S]*"receivable"[\s\S]*"expense_category"/, "write-off mapping"),
  fileContains("src/components/pages/UdhariPage.tsx", /People/, "people tab UI"),
  fileContains("src/components/pages/UdhariPage.tsx", /Receivable/, "receivable tab UI"),
  fileContains("src/components/pages/UdhariPage.tsx", /Payable/, "payable tab UI"),
  fileContains("src/components/pages/UdhariPage.tsx", /Settlement &amp; write-off log/, "settlement history UI"),
  fileContains("src/components/pages/UdhariPage.tsx", /Reason/, "write-off reason UI"),
  fileContains("src/components/pages/UdhariPage.tsx", /Reminder copied|WhatsApp/, "reminder UI"),
  fileExists("src/services/__tests__/udhariEngine.test.ts", "udhari engine tests"),
  vitestFile("src/services/__tests__/udhariEngine.test.ts", "vitest: udhari engine"),
  vitestFile("src/services/__tests__/ledger.scenarios.test.ts", "vitest: ledger scenarios"),
];

const manual = [
  "Add udhari given: account cash decreases, receivable increases, no expense.",
  "Add udhari received: account cash increases, payable increases, no income.",
  "Record repayment received: account cash increases, receivable decreases.",
  "Record repayment paid: account cash decreases, payable decreases.",
  "Write off receivable: reason is required, receivable decreases, bad-debt expense increases, no cash movement.",
  "People tab shows display name, relationship/context, phone hash intent, receivable, payable, net, overdue, ageing, and risk.",
  "Reminder button copies polite WhatsApp text; firm/business/Hinglish generator paths are covered by tests.",
];

await runGate({
  phase: 8,
  title: "Udhari and informal finance engine",
  outPath: "PHASE_08_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
