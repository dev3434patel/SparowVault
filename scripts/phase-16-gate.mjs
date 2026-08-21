#!/usr/bin/env node
/**
 * PHASE 16 GATE — Persona-aware AI coach.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/personaEngine.ts", "persona engine"),
  fileExists("src/services/__tests__/personaEngine.test.ts", "persona test"),
  vitestFile("src/services/__tests__/personaEngine.test.ts", "vitest: personaEngine"),

  fileContains("src/services/personaEngine.ts", /buildPersonaSignals/,         "buildPersonaSignals exported"),
  fileContains("src/services/personaEngine.ts", /inferPersona/,                "inferPersona exported"),
  fileContains("src/services/personaEngine.ts", /rankTopicsForPersona/,        "rankTopicsForPersona exported"),
  fileContains("src/services/personaEngine.ts", /rankSuggestionsForPersona/,   "rankSuggestionsForPersona exported"),
  fileContains("src/services/personaEngine.ts", /aiGuardrails/,                "aiGuardrails exported"),

  fileExists("src/services/suggestionEngine.ts", "existing suggestion engine present"),
];

const manual = [
  "Seed a low-income fixture (< ₹15k/month). Confirm persona engine returns 'student' and Suggestions page surfaces safe_daily_spend / budget / emergency_fund at the top.",
  "Seed a debt-heavy fixture (card outstanding + loan principal > 6× monthly income). Persona returns 'debt_heavy'; credit_card + loan suggestions rank first.",
  "Seed a business-heavy fixture (>30% businessOrPersonal=business). Persona returns 'freelancer' or 'small_business'; tax + missing_bill rank first.",
  "Run a suggestion through any LLM rewrite — if the rewritten text recommends buying/selling a specific stock, the AI guard must reject it.",
  "Confirm dismissed suggestions do not re-appear immediately (Phase 11 regression).",
  "Confirm calculation_inputs_json on every persona-ranked suggestion still ties back to deterministic engine outputs — AI never invents numbers.",
];

await runGate({
  phase: 16,
  title: "Persona-aware AI coach",
  outPath: "PHASE_16_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
