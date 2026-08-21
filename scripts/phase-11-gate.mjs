#!/usr/bin/env node
/**
 * PHASE 11 GATE — Explainable AI suggestion engine.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("sql/migrations/phase_11_ai_suggestions.sql", "migration: ai_suggestions"),
  fileContains("sql/migrations/phase_11_ai_suggestions.sql", /calculation_inputs_json/, "calculation_inputs_json column"),
  fileContains("sql/migrations/phase_11_ai_suggestions.sql", /recommended_action|expected_impact_json/, "recommended_action / expected_impact_json"),
  fileContains("sql/migrations/phase_11_ai_suggestions.sql", /history_json/, "suggestion history column"),

  fileExists("src/services/suggestionEngine.ts", "suggestionEngine"),
  fileContains("src/services/suggestionEngine.ts", /validateSuggestionDraft/, "suggestion source-of-truth validator"),
  fileContains("src/types/index.ts", /missing_bill/, "missing_bill suggestion type"),
  fileContains("src/types/index.ts", /emergency_fund/, "emergency_fund suggestion type"),
  fileContains("src/types/index.ts", /net_worth/, "net_worth suggestion type"),
  fileContains("src/types/index.ts", /investment_tracking_only/, "investment_tracking_only suggestion type"),
  fileExists("tests/unit/suggestionEngine.test.ts", "suggestion engine test"),
  fileExists("tests/unit/suggestionAiExplain.test.ts", "AI rewrite guardrail test"),
  vitestFile("tests/unit/suggestionEngine.test.ts", "vitest: suggestionEngine"),
  vitestFile("tests/unit/suggestionAiExplain.test.ts", "vitest: suggestion AI guardrails"),

  fileExists("src/components/pages/SuggestionsPage.tsx", "Suggestions page"),
  fileContains("src/components/pages/SuggestionsPage.tsx", /Not useful/, "mark not useful action"),
  fileContains("src/components/pages/SuggestionsPage.tsx", /Calculation inputs/, "view calculation action"),
];

const manual = [
  "Apply sql/migrations/phase_11_ai_suggestions.sql to the test DB.",
  "Trigger budget risk: spend ₹6,900 of ₹8,000 food budget by mid-month — suggestion is generated with calculation_inputs_json populated.",
  "Trigger card utilization 84% — suggestion severity = danger, recommended_action mentions a paydown amount.",
  "Set an EMI past its due date — danger suggestion appears.",
  "Mark an udhari overdue — warning suggestion appears.",
  "Dismiss a suggestion — it must NOT immediately reappear (expires_at honoured).",
  "Update source data so the trigger no longer holds — suggestion is invalidated / removed.",
  "If LLM explanation is wired: confirm the exact numbers in calculation_inputs_json are preserved in the human text — no hallucinated rupees.",
  "NEGATIVE: no suggestion recommends buying/selling a specific stock or mutual fund.",
];

await runGate({
  phase: 11,
  title: "Explainable AI suggestion engine",
  outPath: "PHASE_11_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
