/**
 * Product-path card destination UI in StatementImportDialog (Playwright).
 * Self-starts PHP (via with-local-test-runtime) + dedicated Vite with correct API proxy.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";
import { once } from "node:events";
import { chromium, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

const base = process.env.BASE_URL || "http://localhost:5000";

async function freePort() {
  const s = net.createServer();
  s.listen(0, "127.0.0.1");
  await once(s, "listening");
  const port = s.address().port;
  await new Promise((r) => s.close(r));
  return port;
}

async function api(path, method, body, auth) {
  const headers = { "Content-Type": "application/json", Origin: "http://127.0.0.1:5173" };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  if (auth?.csrf) {
    headers.Cookie = `sv_csrf=${auth.csrf}`;
    headers["X-CSRF-Token"] = auth.csrf;
  }
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

try {
  await access("tests/fixtures/statements/credit-card-synthetic.pdf");
} catch {
  const gen = spawnSync(process.execPath, ["tests/fixtures/statements/generate-card-pdf.mjs"], { cwd: process.cwd(), encoding: "utf8" });
  if (gen.status !== 0) throw new Error(gen.stderr || gen.stdout || "card pdf generate failed");
}

const pin = "58294713";
const username = `carddlg_${randomBytes(3).toString("hex")}`;
const pol = await api("/api/policies/current.php", "GET");
const versions = pol.data?.versions || { terms: "2026-05-13", privacy: "2026-05-13" };
const reg = await api("/api/auth/register.php", "POST", {
  displayName: "Card Dialog",
  username,
  pin,
  policyAcceptances: Object.entries(versions).filter(([k]) => ["terms", "privacy"].includes(k)).map(([key, version]) => ({ key, version })),
});
assert.equal(reg.ok, true, JSON.stringify(reg));
const auth = { token: reg.data.token, csrf: reg.data.csrfToken, user: reg.data.user };

const cardId = `card_dlg_${randomBytes(2).toString("hex")}`;
const card = await api("/api/data/entity.php?collection=cards", "POST", {
  userId: auth.user.id,
  mutationId: `card-dlg-${Date.now()}`,
  data: {
    id: cardId,
    type: "credit",
    nickname: "Dialog Path Card",
    bankName: "HDFC",
    network: "visa",
    last4: "1111",
    creditLimit: 100000,
    openingOutstanding: 0,
    isInactive: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    isDeleted: 0,
  },
}, auth);
assert.ok(card.ok || card.status === 201 || card.data, JSON.stringify(card));

await api("/api/data/entity.php?collection=accounts", "POST", {
  userId: auth.user.id,
  mutationId: `acc-dlg-${Date.now()}`,
  data: {
    id: `acc_dlg_${randomBytes(2).toString("hex")}`,
    name: "Dialog Bank",
    type: "savings",
    currency: "INR",
    openingBalancePaise: 1000000,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    isDeleted: 0,
  },
}, auth);

const frontendPort = await freePort();
const frontend = `http://127.0.0.1:${frontendPort}`;
const vite = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(frontendPort), "--strictPort"],
  {
    cwd: process.cwd(),
    env: { ...process.env, VITE_API_TARGET: base, VITE_API_BASE_URL: "" },
    stdio: "ignore",
    detached: process.platform !== "win32",
  },
);
let frontendReady = false;
for (let i = 0; i < 80; i++) {
  if (vite.exitCode !== null) throw new Error("Vite exited early");
  try {
    if ((await fetch(frontend, { signal: AbortSignal.timeout(500) })).ok) {
      frontendReady = true;
      break;
    }
  } catch { /* retry */ }
  await new Promise((r) => setTimeout(r, 250));
}
assert.ok(frontendReady, "Vite frontend not ready");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const cardPosts = [];
page.on("request", (req) => {
  if (req.url().includes("/api/import/statement-card.php") && req.method() === "POST") {
    cardPosts.push(req.postData());
  }
});

try {
  await page.goto(frontend, { waitUntil: "networkidle" });
  await page.locator("input").first().fill(username);
  await page.locator('input[type="password"]').first().fill(pin);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole("button", { name: "Upload bank statement", exact: true })).toBeVisible({ timeout: 30000 });

  await page.getByRole("button", { name: "Upload bank statement", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Bank Statement", exact: true })).toBeVisible();
  await expect(page.getByLabel("Statement credit card", { exact: true })).toBeVisible();

  await page.getByLabel("Statement credit card", { exact: true }).selectOption({ label: "Dialog Path Card" });
  const accountVal = await page.getByLabel("Statement account", { exact: true }).inputValue();
  assert.equal(accountVal, "", "Selecting card must clear bank account destination");
  await page.getByLabel("Statement PDF", { exact: true }).setInputFiles("tests/fixtures/statements/credit-card-synthetic.pdf");
  const analyze = page.getByRole("button", { name: "Analyze statement", exact: true });
  await expect(analyze).toBeEnabled();
  await analyze.click();

  await expect(page.getByText(/credit-card|Credit card|liability/i).first()).toBeVisible({ timeout: 45000 });

  const report = {
    runId,
    frontend,
    api: base,
    cardDestinationVisible: true,
    cardClearsAccount: true,
    analyzeEnabledWithCardOnly: true,
    creditCardDocumentClassSurfaced: true,
    cardApiPostsDuringWizard: cardPosts.length,
    note: "Browser dialog exercises card destination + document-class routing against dedicated Vite→PHP proxy.",
    status: "PASS_CARD_DIALOG_UI",
  };
  await writeFile(join(outDir, "GOAL_CARD_PRODUCT_E2E_REPORT.md"), `# Goal / card product E2E\n\n## Card PDF dialog path\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.status, "PASS_CARD_DIALOG_UI");
} finally {
  await browser.close().catch(() => {});
  try {
    if (process.platform === "win32") vite.kill();
    else process.kill(-vite.pid, "SIGTERM");
  } catch { /* stopped */ }
}
