// Browser finance vNext workflow smoke (P1-B) — reuses proven auth pattern from browser-e2e.
import { chromium } from "@playwright/test";

const BASE = process.env.FRONTEND_URL ?? process.env.BASE_URL ?? "http://localhost:5173";
let failed = 0;
function ok(n, e = "") {
  console.log(`  PASS  ${n}${e ? `  -- ${e}` : ""}`);
}
function fail(n, e = "") {
  console.log(`  FAIL  ${n}${e ? `  -- ${e}` : ""}`);
  failed++;
}

async function run() {
  console.log("\n--- BROWSER FINANCE vNEXT ---");
  const stamp = Date.now().toString(36);
  const e2eUsername = `fv_${stamp}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE, { waitUntil: "networkidle" });

  const createAccountTab = page.getByRole("button", { name: /^create account$/i }).first();
  if (await createAccountTab.isVisible().catch(() => false)) {
    await createAccountTab.click();
    await page.waitForTimeout(300);
  }
  await page.getByPlaceholder("User Name").fill("Finance VNext");
  await page.getByPlaceholder("amit", { exact: true }).fill(e2eUsername);
  const pins = page.locator('input[type="password"]');
  await pins.nth(0).fill("583921");
  await pins.nth(1).fill("583921");
  const policyCheckbox = page.locator('input[type="checkbox"]').first();
  if (await policyCheckbox.isVisible().catch(() => false)) await policyCheckbox.check();
  await page.locator("form button[type='submit']").first().click();
  await page.waitForTimeout(700);

  const hasSidebar = await page.waitForSelector("aside", { timeout: 45000 }).then(() => true).catch(() => false);
  if (!hasSidebar) {
    fail("Auth flow did not reach app shell");
    await browser.close();
    process.exit(1);
  }
  ok("app shell visible");

  for (const label of ["Cards", "Savings & Investments"]) {
    const btn = page.locator("aside button").filter({ hasText: new RegExp(`^\\s*${label}\\s*$`) }).first();
    await btn.click();
    await page.waitForTimeout(400);
    ok(`opened ${label}`);
  }
  for (const label of ["Bills", "Household", "Reconciliation", "Bill"]) {
    const btn = page.locator("aside button").filter({ hasText: new RegExp(label, "i") }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(300);
      ok(`opened optional ${label}`);
    }
  }

  await browser.close();
  console.log(`\n=================================================\n  BROWSER vNEXT failed=${failed}\n=================================================`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
