#!/usr/bin/env node
/**
 * PHASE 12 GATE — Dashboard, colors, reports, UX polish.
 */
import { runGate, fileExists, fileContains, vitestFile } from "./lib/gate-runner.mjs";

const checks = [
  fileExists("src/services/categoryColorEngine.ts",       "categoryColorEngine"),
  fileContains("src/services/categoryColorEngine.ts", /moduleColor/, "module color API"),
  fileContains("src/services/categoryColorEngine.ts", /hideDeletedCategorySlices/, "deleted category chart filtering"),
  fileExists("tests/unit/categoryColorEngine.test.ts",    "categoryColorEngine test"),
  vitestFile("tests/unit/categoryColorEngine.test.ts",    "vitest: categoryColorEngine"),

  fileExists("src/components/pages/DashboardPage.tsx",    "Dashboard page"),
  fileContains("src/components/pages/DashboardPage.tsx", /Start with three basics/, "new user empty state"),
  fileContains("src/components/pages/DashboardPage.tsx", /Card used/, "simple card used language"),
  fileContains("src/components/pages/DashboardPage.tsx", /drillCategorySpend/, "chart drilldown"),
  fileContains("src/components/explain/ExplainMetricDrawer.tsx", /Source engine/, "explain source engine"),
  fileContains("src/components/explain/ExplainMetricDrawer.tsx", /Excluded records and reasons/, "explain exclusions with reasons"),
  fileExists("src/components/pages/ReportsPage.tsx",      "Reports page"),
  fileExists("src/components/pages/CategoriesPage.tsx",   "Categories page"),
  fileContains("src/components/pages/CategoriesPage.tsx", /Another active category already uses this color/, "category duplicate color editor warning"),
  fileExists("src/exports/xlsxExporter.ts",               "xlsxExporter"),
];

const manual = [
  "Create 10 categories. Open dashboard. The top categories assigned by `categoryColorEngine` must all be visibly distinct in the donut/pie chart.",
  "Soft-delete one category — it must no longer appear in chart slices or category dropdowns.",
  "Click a chart slice — it must filter the transaction list to that category only.",
  "Toggle Dashboard mode: Basic / Normal / Premium — each surfaces the right widgets per the Phase 12 brief.",
  "Open the 'Explain this number' drawer on any KPI — it must list included + excluded record types in plain English.",
  "Reports:",
  "  • Expense report INCLUDES credit-card purchases; EXCLUDES credit-card bill payments.",
  "  • Cashflow report INCLUDES credit-card bill payments (cash outflow); EXCLUDES the original CC purchase (no cash moved).",
  "  • EMI interest appears as expense; EMI principal appears as liability reduction.",
  "  • Udhari given appears as receivable, NOT as expense.",
  "Excel export totals MUST match the on-screen UI totals exactly.",
];

await runGate({
  phase: 12,
  title: "Dashboard, colors, reports, UX polish",
  outPath: "PHASE_12_COMPLETION_REPORT.md",
  manualCheckboxes: manual,
  checks,
});
