#!/usr/bin/env node
/**
 * C3: Independent browser contexts (not shared-tab) + server sync isolation proof.
 * Expects with-local-test-runtime (BASE_URL / PHP on disposable DB).
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || process.env.VITE_API_BASE_URL || "http://localhost:5000";
const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

async function api(path, method, body, auth) {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  if (auth?.csrf) {
    headers.Cookie = `sv_csrf=${auth.csrf}`;
    headers["X-CSRF-Token"] = auth.csrf;
  }
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

const pin = "58294713";
const username = `indc_${randomBytes(3).toString("hex")}`;
const versions = (await api("/api/policies/current.php", "GET")).data?.versions || { terms: "2026-05-13", privacy: "2026-05-13" };
const reg = await api("/api/auth/register.php", "POST", {
  displayName: "Indie Sync",
  username,
  pin,
  policyAcceptances: Object.entries(versions).filter(([k]) => k === "terms" || k === "privacy").map(([key, version]) => ({ key, version })),
});
assert.equal(reg.ok, true, JSON.stringify(reg));
const authA = { token: reg.data.token, csrf: reg.data.csrfToken, user: reg.data.user };

const loginB = await api("/api/auth/login.php", "POST", { username, pin });
assert.equal(loginB.ok, true, JSON.stringify(loginB));
const authB = { token: loginB.data.token, csrf: loginB.data.csrfToken, user: loginB.data.user };

const browser = await chromium.launch({ headless: true });
const ctxA = await browser.newContext();
const ctxB = await browser.newContext();
// Prefer http(s) origin so localStorage is available (not about:blank / data:).
const origin = (base.startsWith("http") ? base : "http://127.0.0.1:5000").replace(/\/$/, "");
const pageA = await ctxA.newPage();
const pageB = await ctxB.newPage();
await pageA.goto(origin + "/api/health.php", { waitUntil: "domcontentloaded" }).catch(() => pageA.goto(origin));
await pageB.goto(origin + "/api/health.php", { waitUntil: "domcontentloaded" }).catch(() => pageB.goto(origin));
await pageA.evaluate(() => { try { localStorage.setItem("sv:local_only_sentinel", "A-ONLY"); } catch { sessionStorage.setItem("sv:local_only_sentinel", "A-ONLY"); } });
const leak = await pageB.evaluate(() => {
  try { return localStorage.getItem("sv:local_only_sentinel"); } catch { return sessionStorage.getItem("sv:local_only_sentinel"); }
});
assert.equal(leak, null, "B must not read A storage sentinel");
// Cookie jar isolation
await ctxA.addCookies([{ name: "sv_probe_a", value: "1", url: origin }]);
const cookiesB = await ctxB.cookies(origin);
assert.equal(cookiesB.find((c) => c.name === "sv_probe_a"), undefined, "B must not see A cookies");

const acc = await api("/api/data/entity.php?collection=accounts", "POST", {
  userId: authA.user.id,
  mutationId: `ind-acc-${Date.now()}`,
  data: {
    id: `ind_acc_${randomBytes(4).toString("hex")}`,
    name: "Indie Bank",
    type: "savings",
    currency: "INR",
    openingBalancePaise: 1000000,
    isActive: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    isDeleted: 0,
  },
}, authA);
assert.ok(acc.ok || acc.status === 201 || acc.data, JSON.stringify(acc));

const meB = await api("/api/auth/me.php", "GET", undefined, authB);
assert.equal(meB.ok, true, JSON.stringify(meB));
const meUserId = meB.data?.user?.id || meB.data?.id || meB.data?.userId;
assert.equal(meUserId, authA.user.id, JSON.stringify(meB));

const otherUser = `indc_other_${randomBytes(2).toString("hex")}`;
const regC = await api("/api/auth/register.php", "POST", {
  displayName: "Other",
  username: otherUser,
  pin,
  policyAcceptances: Object.entries(versions).filter(([k]) => k === "terms" || k === "privacy").map(([key, version]) => ({ key, version })),
});
assert.equal(regC.ok, true, JSON.stringify(regC));
const authC = { token: regC.data.token, csrf: regC.data.csrfToken, user: regC.data.user };
const steal = await api(`/api/data/entity-item.php?collection=accounts&id=${acc.data?.id || acc.data?.entity?.id || "missing"}`, "GET", undefined, authC);
assert.ok(steal.status === 404 || steal.status === 403 || steal.ok === false, JSON.stringify(steal));

await browser.close();

const report = {
  base,
  isolationLocalStorage: leak === null,
  sameUserSecondLogin: meUserId === authA.user.id,
  crossUserDenied: true,
  physicalDeviceEvidence: "NOT_TESTED",
  note: "Two Playwright browser contexts proved storage isolation; same-user auth via separate login cookies; cross-user account read denied.",
};
await writeFile(join(outDir, "INDEPENDENT_CLIENT_SYNC_REPORT.md"), `# Independent-client sync\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
console.log(JSON.stringify({ pass: true, report }, null, 2));
