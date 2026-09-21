/**
 * Card PDF product-path wiring: UI posts to statement-card.php (not deposit statement.php),
 * document-class router separates credit-card headings, and live API accepts liability arithmetic.
 */
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

const dialog = await readFile("src/components/statements/StatementImportDialog.tsx", "utf8");
const cardDoc = await readFile("src/services/statements/cardDocument.ts", "utf8");

const wiring = {
  postsToCardApi: dialog.includes('/api/import/statement-card.php'),
  doesNotUseDepositOnly: dialog.includes('documentClass === "credit_card"'),
  hasCardDestinationSelect: dialog.includes('aria-label="Statement credit card"'),
  routesDocumentClass: cardDoc.includes("routeStatementDocumentClass") && cardDoc.includes("credit_card"),
  liabilityFixture: cardDoc.includes("parseSyntheticCardFixture"),
};

assert.ok(wiring.postsToCardApi, "StatementImportDialog must POST card imports to statement-card.php");
assert.ok(wiring.doesNotUseDepositOnly, "Card path must gate on credit_card document class");
assert.ok(wiring.hasCardDestinationSelect, "UI must expose credit card destination");
assert.ok(wiring.routesDocumentClass, "cardDocument must route credit-card headings");

const base = process.env.BASE_URL || "http://localhost:5000";
async function api(path, method, body, auth) {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  if (auth?.csrf) {
    headers.Cookie = `sv_csrf=${auth.csrf}`;
    headers["X-CSRF-Token"] = auth.csrf;
  }
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

let liveApi = { status: "SKIPPED", reason: "API unreachable" };
try {
  const pin = "58294713";
  const username = `cardui_${randomBytes(3).toString("hex")}`;
  const pol = await api("/api/policies/current.php", "GET");
  const versions = pol.data?.versions || { terms: "2026-05-13", privacy: "2026-05-13" };
  const reg = await api("/api/auth/register.php", "POST", {
    displayName: "Card UI",
    username,
    pin,
    policyAcceptances: Object.entries(versions)
      .filter(([k]) => ["terms", "privacy"].includes(k))
      .map(([key, version]) => ({ key, version })),
  });
  if (!reg.ok) throw new Error(`register failed: ${JSON.stringify(reg)}`);
  const auth = { token: reg.data.token, csrf: reg.data.csrfToken, user: reg.data.user };
  const cardId = `card_ui_${randomBytes(2).toString("hex")}`;
  const card = await api(
    "/api/data/entity.php?collection=cards",
    "POST",
    {
      userId: auth.user.id,
      mutationId: `card-ui-${Date.now()}`,
      data: {
        id: cardId,
        type: "credit",
        nickname: "UI Path Card",
        bankName: "HDFC",
        network: "visa",
        last4: "4242",
        creditLimit: 100000,
        openingOutstanding: 0,
        isInactive: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        isDeleted: 0,
      },
    },
    auth,
  );
  assert.ok(card.ok || card.status === 201 || card.data, JSON.stringify(card));

  const food = await api(
    "/api/data/entity.php?collection=categories",
    "POST",
    {
      userId: auth.user.id,
      mutationId: `card-ui-cat-${Date.now()}`,
      data: {
        id: `food_${randomBytes(2).toString("hex")}`,
        name: "Food",
        appliesTo: "expense",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        isDeleted: 0,
        tags: [],
        notes: "",
        icon: "tag",
        color: "#000",
        archived: 0,
        sortOrder: 0,
        budgetable: 1,
        taxRelevant: 0,
        gstRelevant: 0,
      },
    },
    auth,
  );
  const foodId = food.data?.id || food.data?.entity?.id || food.data?.entity_id;

  // Mimic StatementImportDialog card payload for a single purchase (refunds need linked original expense).
  const previous = 100000;
  const purchase = 50000;
  const closing = previous + purchase;
  const documentHash = createHash("sha256").update(`card-ui-${Date.now()}`).digest("hex");
  const payload = {
    userId: auth.user.id,
    cardId,
    issuer: "hdfc",
    documentHash,
    parserVersion: "statement-card-v1",
    previousBalancePaise: previous,
    closingLiabilityPaise: closing,
    mutationId: `statement-card:ui-${Date.now()}`,
    rows: [
      {
        id: "c1",
        page: 1,
        date: "2026-05-01",
        description: "PURCHASE STORE",
        reference: "P1",
        amountPaise: purchase,
        direction: "debit",
        kindHint: "purchase",
        issues: [],
        decision: { include: true, reviewed: true, kind: "expense", categoryId: foodId, scope: "personal", counterpartId: "" },
      },
    ],
  };
  const result = await api("/api/import/statement-card.php", "POST", payload, auth);
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.ok((result.data?.imported ?? 0) >= 1, JSON.stringify(result));
  liveApi = { status: "PASS", imported: result.data.imported, cardId, endpoint: "/api/import/statement-card.php" };
} catch (e) {
  liveApi = { status: "FAIL", error: String(e.message || e) };
}

const pass = wiring.postsToCardApi && wiring.hasCardDestinationSelect && liveApi.status === "PASS";
const report = {
  runId,
  wiring,
  liveApi,
  cardPdfProductPath: pass ? "PASS_UI_WIRED_AND_API" : liveApi.status === "FAIL" ? "FAIL" : "PARTIAL",
  note: "Browser PDF→wizard click-path still covered by deposit statement browser suite; card destination + separate API is the product separation under test here.",
};
await writeFile(join(outDir, "GOAL_CARD_PRODUCT_E2E_REPORT.md"), `# Goal / card product E2E (delta)\n\n## Card PDF product path\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
