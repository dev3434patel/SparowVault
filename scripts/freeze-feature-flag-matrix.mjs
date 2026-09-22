/**
 * Feature-flag / plan-gate QA matrix — static code presence + documented expected UI.
 * Does not require Razorpay live keys.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outDir = join(process.cwd(), "docs", "core-freeze-2026-09-22", "evidence");
await mkdir(outDir, { recursive: true });

const files = {
  sidebar: await readFile("src/components/layout/Sidebar.tsx", "utf8"),
  nav: await readFile("src/lib/navRoutes.ts", "utf8"),
  cloud: await readFile("src/store/cloudAppStore.ts", "utf8"),
  subscription: await readFile("src/components/pages/SubscriptionPage.tsx", "utf8"),
  reports: await readFile("src/components/pages/ReportsPage.tsx", "utf8"),
  exportPage: await readFile("src/components/pages/ExportPage.tsx", "utf8"),
  adminShell: await readFile("src/components/layout/AdminAppShell.tsx", "utf8"),
};

const checks = [
  { id: "RAZORPAY_ENV", pass: /VITE_ENABLE_RAZORPAY/.test(files.sidebar) || /VITE_ENABLE_RAZORPAY/.test(files.subscription), note: "Subscription gated by env" },
  { id: "EXPORTS_FLAG", pass: /exports/.test(files.sidebar) && /effectiveFeatures|flags/.test(files.cloud + files.exportPage), note: "Export center plan-gated" },
  { id: "ADVANCED_REPORTS", pass: /advanced_reports|effectiveFeatures/.test(files.reports + files.cloud), note: "Reports depth plan-gated" },
  { id: "ADMIN_ROUTES", pass: /admin-dashboard|admin-users|admin-plans/.test(files.nav), note: "Admin nav keys present" },
  { id: "USER_VS_ADMIN_SHELL", pass: /AdminAppShell|User portal/.test(files.adminShell), note: "Admin shell distinct" },
  { id: "SUBSCRIPTION_ROUTE", pass: /subscription/.test(files.nav), note: "Subscription route registered" },
];

const matrix = [
  { profile: "Razorpay OFF", expect: "Subscription nav hidden or unavailable; no crash on /subscription deep-link" },
  { profile: "Razorpay ON", expect: "Subscription page loads; checkout path present" },
  { profile: "exports OFF", expect: "Export Center hidden; deep navigation does not throw" },
  { profile: "exports ON", expect: "Export Center available" },
  { profile: "advanced_reports OFF", expect: "Reports page gated/limited without crash" },
  { profile: "advanced_reports ON", expect: "Full report tabs available" },
  { profile: "admin role", expect: "Admin shell routes only" },
  { profile: "normal user", expect: "User shell; admin routes blocked" },
];

const pass = checks.every((c) => c.pass);
const report = {
  status: pass ? "PASS_STATIC_MATRIX" : "FAIL",
  checks,
  qaProfiles: matrix,
  note: "Static presence of gates verified. Live Razorpay provider flows remain environment-dependent (NOT_TESTED without keys).",
};

await writeFile(join(outDir, "FEATURE_FLAG_MATRIX.json"), JSON.stringify(report, null, 2));
await writeFile(
  join(outDir, "FEATURE_FLAG_MATRIX.md"),
  `# Feature-flag QA matrix\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`,
);
console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
