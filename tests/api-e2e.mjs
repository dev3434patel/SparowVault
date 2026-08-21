// Comprehensive end-to-end tests for the cloud API.
// Run after starting the server on http://localhost:4000
//
// Usage:
//   node tests/api-e2e.mjs
//
// Exit code 0 = all checks passed, 1 = any failure.

const BASE = process.env.BASE_URL ?? "http://localhost:4000";
const results = [];
let failed = 0;
/** CSRF cookie issued by login/register — required for mutating cloud sync routes. */
let csrfToken = "";

function ok(name, extra = "") {
  results.push({ name, pass: true, extra });
  console.log(`  PASS  ${name}${extra ? `  -- ${extra}` : ""}`);
}
function fail(name, extra = "") {
  failed += 1;
  results.push({ name, pass: false, extra });
  console.log(`  FAIL  ${name}${extra ? `  -- ${extra}` : ""}`);
}

function captureCsrfFromResponse(res) {
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [];
  const joined = raw.length ? raw.join("\n") : String(res.headers.get("set-cookie") ?? "");
  const m = joined.match(/(?:^|,\s*)?sv_csrf=([^;,\s]+)/);
  if (m?.[1]) csrfToken = decodeURIComponent(m[1]);
}

async function req(method, path, { token, body, query } = {}) {
  const url = new URL(path, BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    headers["X-CSRF-Token"] = csrfToken;
    headers.Cookie = `sv_csrf=${csrfToken}`;
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  captureCsrfFromResponse(res);
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    ok(label, `(${JSON.stringify(actual)})`);
  } else {
    fail(label, `expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
  }
}

async function section(title) {
  console.log(`\n--- ${title} ---`);
}

async function run() {
  const stamp = Date.now().toString(36);
  const userA = { username: `alice_${stamp}`, displayName: "Alice", pin: "583921" };
  const userB = { username: `bob_${stamp}`, displayName: "Bob", pin: "674532" };

  // 1. Registration happy path
  await section("REGISTER");
  const policies = await req("GET", "/api/policies/current.php");
  const versions = policies.json?.data?.versions ?? {};
  const policyAcceptances = ["terms", "privacy"].map((key) => ({ key, version: versions[key] }));
  userA.policyAcceptances = policyAcceptances;
  userB.policyAcceptances = policyAcceptances;
  const regA = await req("POST", "/api/cloud/register", { body: userA });
  assertEqual(regA.status, 201, "register Alice -> 201");
  const regB = await req("POST", "/api/cloud/register", { body: userB });
  assertEqual(regB.status, 201, "register Bob -> 201");

  const tokenA = regA.json?.data?.token;
  const tokenB = regB.json?.data?.token;
  const idA = regA.json?.data?.user?.id;
  const idB = regB.json?.data?.user?.id;
  if (tokenA && idA) ok("Alice got token + id", idA); else fail("Alice token/id missing", JSON.stringify(regA.json));
  if (tokenB && idB) ok("Bob got token + id", idB); else fail("Bob token/id missing", JSON.stringify(regB.json));

  // 2. Registration errors
  const regDup = await req("POST", "/api/cloud/register", { body: userA });
  assertEqual(regDup.status, 409, "duplicate username -> 409");
  const regBad = await req("POST", "/api/cloud/register", {
    body: { username: "x", displayName: "", pin: "1" },
  });
  assertEqual(regBad.status, 400, "invalid register payload -> 400");
  const regRegex = await req("POST", "/api/cloud/register", {
    body: { username: "has space", displayName: "Bad", pin: "583921" },
  });
  assertEqual(regRegex.status, 400, "username regex violation -> 400");

  // 3. Login happy + bad
  await section("LOGIN");
  const loginGood = await req("POST", "/api/cloud/login", {
    body: { username: userA.username, pin: userA.pin },
  });
  assertEqual(loginGood.status, 200, "login Alice -> 200");
  const loginBadPin = await req("POST", "/api/cloud/login", {
    body: { username: userA.username, pin: "583922" },
  });
  assertEqual(loginBadPin.status, 401, "wrong pin -> 401");
  const loginNoUser = await req("POST", "/api/cloud/login", {
    body: { username: `ghost_${stamp}`, pin: "583921" },
  });
  assertEqual(loginNoUser.status, 401, "unknown user -> 401");
  const loginBadBody = await req("POST", "/api/cloud/login", { body: { username: "a" } });
  assertEqual(loginBadBody.status, 422, "invalid login payload -> 422");

  // 4. /me
  await section("ME");
  const meNoAuth = await req("GET", "/api/cloud/me");
  assertEqual(meNoAuth.status, 401, "me w/o token -> 401");
  const meBadToken = await req("GET", "/api/cloud/me", { token: "not-a-jwt" });
  assertEqual(meBadToken.status, 401, "me bad token -> 401");
  const meA = await req("GET", "/api/cloud/me", { token: tokenA });
  assertEqual(meA.status, 200, "me Alice -> 200");
  assertEqual(meA.json?.data?.username, userA.username, "me returns Alice username");

  // 5. Sync pull (initially empty)
  await section("SYNC PULL (initial empty)");
  const pullNoAuth = await req("GET", "/api/cloud/sync/pull");
  assertEqual(pullNoAuth.status, 401, "pull w/o token -> 401");
  const pullEmpty = await req("GET", "/api/cloud/sync/pull", { token: tokenA });
  assertEqual(pullEmpty.status, 200, "pull Alice empty -> 200");
  const colls = pullEmpty.json?.data?.collections ?? {};
  const totalRows = Object.values(colls).reduce((a, b) => a + b.length, 0);
  if (totalRows === 0) ok("empty collections have 0 rows"); else fail("empty collections non-zero", String(totalRows));

  // Has all SQL-backed collection keys.
  const expectedKeys = [
    "settings", "accounts", "cards", "categories", "transactions", "budgets",
    "goals", "goalContribs", "loans", "emis", "udhari", "udhariSettlements",
    "investments", "savingsContribs", "reminders", "alerts", "recurringRules",
    "attachments", "exportHistory", "auditLogs", "snapshots",
  ];
  const missingKeys = expectedKeys.filter((k) => !(k in colls));
  if (missingKeys.length === 0) ok("pull returns all 21 SQL collection keys"); else fail("missing collection keys", missingKeys.join(","));

  // 6. Sync push
  await section("SYNC PUSH");
  const pushPayload = {
    collections: {
      accounts: [
        {
          id: "acc_a1",
          userId: idA,
          name: "Checking",
          type: "bank",
          balance: 10000,
          openingBalance: 10000,
          isDefault: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: 0,
          version: 1,
        },
      ],
      transactions: [
        {
          id: "txn_a1",
          userId: idA,
          type: "expense",
          amount: 250,
          amountPaise: 25000,
          accountId: "acc_a1",
          categoryId: "cat_food",
          date: new Date().toISOString(),
          paymentMode: "upi",
          merchantOrPerson: "Cafe",
          description: "Lunch",
          billAvailable: 0,
          gstApplicable: 0,
          taxFlag: 0,
          businessOrPersonal: "personal",
          needWant: "unassigned",
          fixedVariable: "unassigned",
          plannedUnplanned: "unassigned",
          notes: "Lunch",
          tags: ["food"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: 0,
          version: 1,
        },
      ],
      attachments: [
        {
          id: "att_a1",
          userId: idA,
          fileName: "bill.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          linkedType: "transaction",
          linkedId: "txn_a1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: 0,
          version: 1,
        },
      ],
      snapshots: [
        {
          id: "snp_a1",
          userId: idA,
          periodKey: "2026-05",
          totalIncome: 0,
          totalExpense: 250,
          netSavings: -250,
          savingsRate: 0,
          budgetUsage: 0,
          creditUtilization: 0,
          healthScore: 80,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: 0,
          version: 1,
        },
      ],
    },
  };
  const pushNoAuth = await req("POST", "/api/cloud/sync/push", { body: pushPayload });
  assertEqual(pushNoAuth.status, 401, "push w/o token -> 401");
  const pushGood = await req("POST", "/api/cloud/sync/push", { token: tokenA, body: pushPayload });
  assertEqual(pushGood.status, 200, "push Alice -> 200");
  assertEqual(pushGood.json?.data?.upserted, 4, "upserted count = 4");
  const pushBad = await req("POST", "/api/cloud/sync/push", { token: tokenA, body: { nope: 1 } });
  assertEqual(pushBad.status, 400, "push bad payload -> 400");

  // 7. Pull after push
  await section("SYNC PULL (after push)");
  const pullAfter = await req("GET", "/api/cloud/sync/pull", { token: tokenA });
  const accs = pullAfter.json?.data?.collections?.accounts ?? [];
  const txns = pullAfter.json?.data?.collections?.transactions ?? [];
  const attachments = pullAfter.json?.data?.collections?.attachments ?? [];
  const snapshots = pullAfter.json?.data?.collections?.snapshots ?? [];
  if (accs.length === 1 && accs[0].name === "Checking") ok("pulled account Checking"); else fail("account not pulled", JSON.stringify(accs));
  if (txns.length === 1 && txns[0].amount === 250) ok("pulled txn 250"); else fail("txn not pulled", JSON.stringify(txns));
  if (attachments.length === 1 && attachments[0].fileName === "bill.pdf") ok("pulled SQL attachment"); else fail("attachment not pulled", JSON.stringify(attachments));
  if (snapshots.length === 1 && snapshots[0].periodKey === "2026-05") ok("pulled SQL snapshot"); else fail("snapshot not pulled", JSON.stringify(snapshots));

  // 8. Multi-user isolation — Bob pulls, sees nothing of Alice's
  const patchTxnFull = await req("PATCH", "/api/cloud/entity/transactions/txn_a1", {
    token: tokenA,
    body: {
      patch: {
        type: "expense",
        amount: 275,
        accountId: "acc_a1",
        categoryId: "cat_food",
        paymentMode: "upi",
        merchantOrPerson: "Cafe",
        description: "Updated lunch",
        notes: "Edited from API regression",
        date: new Date().toISOString(),
        tags: ["food", "edited"],
      },
    },
  });
  assertEqual(patchTxnFull.status, 200, "patch transaction full form fields -> 200");
  assertEqual(patchTxnFull.json?.data?.amount, 275, "transaction amount updated");

  const patchTxnSystemField = await req("PATCH", "/api/cloud/entity/transactions/txn_a1", {
    token: tokenA,
    body: { patch: { id: "txn_hijack" } },
  });
  assertEqual(patchTxnSystemField.status, 422, "patch transaction system id rejected -> 422");

  await section("ISOLATION");
  const bobPull = await req("GET", "/api/cloud/sync/pull", { token: tokenB });
  const bobAccs = bobPull.json?.data?.collections?.accounts ?? [];
  if (bobAccs.length === 0) ok("Bob sees no Alice accounts"); else fail("Bob sees Alice data!", JSON.stringify(bobAccs));

  // 9. Entity CRUD — POST
  await section("ENTITY CRUD");
  const createRes = await req("POST", "/api/cloud/entity/categories", {
    token: tokenA,
    body: {
      userId: idA,
      idPrefix: "cat",
      data: { name: "Groceries", kind: "expense", color: "#ff0000" },
    },
  });
  assertEqual(createRes.status, 201, "create category -> 201");
  const newCatId = createRes.json?.data?.id;
  if (newCatId?.startsWith("cat_")) ok("auto-id has cat_ prefix", newCatId); else fail("bad cat id", newCatId);

  // GET by id
  const getByIdRes = await req("GET", `/api/cloud/entity/categories/${newCatId}`, { token: tokenA });
  assertEqual(getByIdRes.status, 200, "get category by id -> 200");
  assertEqual(getByIdRes.json?.data?.name, "Groceries", "category name");

  // LIST
  const listRes = await req("GET", "/api/cloud/entity/categories", { token: tokenA, query: { userId: idA } });
  assertEqual(listRes.status, 200, "list categories -> 200");
  const items = Array.isArray(listRes.json?.data) ? listRes.json.data : [];
  if (items.length === 1 && items[0].name === "Groceries") ok("list returns 1 category"); else fail("bad list result", JSON.stringify(items));
  // List without userId
  const listNoUser = await req("GET", "/api/cloud/entity/categories", { token: tokenA });
  assertEqual(listNoUser.status, 400, "list missing userId -> 400");
  // List invalid collection
  const listBadColl = await req("GET", "/api/cloud/entity/notReal", { token: tokenA, query: { userId: idA } });
  assertEqual(listBadColl.status, 400, "invalid collection -> 400");

  // PATCH
  const patchRes = await req("PATCH", `/api/cloud/entity/categories/${newCatId}`, {
    token: tokenA,
    body: { patch: { name: "Groceries & Home" } },
  });
  assertEqual(patchRes.status, 200, "patch category -> 200");
  assertEqual(patchRes.json?.data?.name, "Groceries & Home", "name updated");
  if ((patchRes.json?.data?.version ?? 0) >= 2) ok("version bumped"); else fail("version not bumped");

  // PATCH w/o body
  const patchEmpty = await req("PATCH", `/api/cloud/entity/categories/${newCatId}`, { token: tokenA, body: {} });
  assertEqual(patchEmpty.status, 400, "patch w/o patch field -> 400");

  // PATCH not found
  const patch404 = await req("PATCH", "/api/cloud/entity/categories/ghost", { token: tokenA, body: { patch: { x: 1 } } });
  assertEqual(patch404.status, 404, "patch missing entity -> 404");

  // Soft DELETE
  const softDel = await req("DELETE", `/api/cloud/entity/categories/${newCatId}`, { token: tokenA });
  assertEqual(softDel.status, 200, "soft delete -> 200");
  assertEqual(softDel.json?.data?.isDeleted, 1, "isDeleted=1");

  // GET after soft delete still returns row (list filters it out though)
  const afterSoft = await req("GET", "/api/cloud/entity/categories", { token: tokenA, query: { userId: idA } });
  const afterSoftItems = Array.isArray(afterSoft.json?.data) ? afterSoft.json.data : [];
  if (afterSoftItems.length === 0) ok("list excludes soft-deleted"); else fail("soft-deleted still in list", JSON.stringify(afterSoftItems));

  // Hard delete
  const hardDel = await req("DELETE", `/api/cloud/entity/categories/${newCatId}`, { token: tokenA, query: { hard: 1 } });
  assertEqual(hardDel.status, 200, "hard delete -> 200");
  const afterHard = await req("GET", `/api/cloud/entity/categories/${newCatId}`, { token: tokenA });
  assertEqual(afterHard.status, 404, "get after hard delete -> 404");

  // Bulk DELETE by collection
  const bulkDel = await req("DELETE", "/api/cloud/entity/transactions", { token: tokenA, query: { userId: idA } });
  assertEqual(bulkDel.status, 200, "bulk delete txns -> 200");
  const bulkDelRes = await req("GET", "/api/cloud/entity/transactions", { token: tokenA, query: { userId: idA } });
  const bulkDelItems = Array.isArray(bulkDelRes.json?.data) ? bulkDelRes.json.data : [];
  if (bulkDelItems.length === 0) ok("bulk delete cleared txns"); else fail("bulk delete left items", JSON.stringify(bulkDelItems));

  // Cross-user isolation on entity CRUD
  await section("CROSS-USER ENTITY ISOLATION");
  const aliceCat = await req("POST", "/api/cloud/entity/categories", {
    token: tokenA,
    body: { userId: idA, idPrefix: "cat", data: { name: "Alice-Only" } },
  });
  const aliceCatId = aliceCat.json?.data?.id;
  const bobTriesGet = await req("GET", `/api/cloud/entity/categories/${aliceCatId}`, { token: tokenB });
  assertEqual(bobTriesGet.status, 404, "Bob 404s on Alice entity");
  const bobTriesPatch = await req("PATCH", `/api/cloud/entity/categories/${aliceCatId}`, {
    token: tokenB,
    body: { patch: { name: "evil" } },
  });
  assertEqual(bobTriesPatch.status, 404, "Bob cannot patch Alice entity");
  const bobTriesDelete = await req("DELETE", `/api/cloud/entity/categories/${aliceCatId}`, { token: tokenB });
  assertEqual(bobTriesDelete.status, 404, "Bob cannot delete Alice entity");

  // 10. Sync push idempotency (same id again)
  await section("SYNC PUSH IDEMPOTENCY");
  const pushAgain = await req("POST", "/api/cloud/sync/push", { token: tokenA, body: pushPayload });
  assertEqual(pushAgain.status, 200, "re-push -> 200");
  const pullAgain = await req("GET", "/api/cloud/sync/pull", { token: tokenA });
  const accsAgain = pullAgain.json?.data?.collections?.accounts ?? [];
  if (accsAgain.length === 1) ok("re-push kept 1 account (upsert)"); else fail("re-push created dupes", String(accsAgain.length));

  // 11. Unknown collection in push is rejected (strict allowlist)
  const pushUnknown = await req("POST", "/api/cloud/sync/push", {
    token: tokenA,
    body: { collections: { unknownCollection: [{ id: "x1", foo: "bar" }] } },
  });
  assertEqual(pushUnknown.status, 400, "unknown coll push returns 400");
  assertEqual(pushUnknown.json?.code, "INVALID_COLLECTION", "unknown coll error code");

  // 12. SPA fallback in prod mode — skip (only meaningful under NODE_ENV=production)
  // 13. API 404 for unknown path
  await section("ROUTING");
  const unknown = await req("GET", "/api/cloud/does-not-exist", { token: tokenA });
  if (unknown.status === 404) ok("unknown API -> 404"); else fail("unknown API returned " + unknown.status);

  // 14. SaaS subscription/public config smoke tests
  await section("SAAS ENDPOINTS");
  const publicConfig = await req("GET", "/api/public/config.php");
  assertEqual(publicConfig.status, 200, "public config -> 200");
  const plansRes = await req("GET", "/api/subscriptions/plans.php");
  assertEqual(plansRes.status, 200, "plans list -> 200");
  const createOrderNoAuth = await req("POST", "/api/subscriptions/create-order.php", { body: { planId: 1 } });
  assertEqual(createOrderNoAuth.status, 401, "create order without auth -> 401");

  const mySub = await req("GET", "/api/subscriptions/my.php", { token: tokenA });
  assertEqual(mySub.status, 200, "my subscription -> 200");
  if (mySub.json?.data?.effectiveFeatures) ok("effective features available");
  else fail("effective features missing", JSON.stringify(mySub.json));

  const invalidWebhook = await req("POST", "/api/payments/razorpay/webhook.php", {
    body: {
      event: "payment.captured",
      payload: { payment: { entity: { id: `pay_invalid_${stamp}`, order_id: `order_invalid_${stamp}` } } },
    },
  });
  assertEqual(invalidWebhook.status, 401, "invalid webhook signature rejected -> 401");

  // Summary
  console.log("\n=================================================");
  console.log(`  RESULTS: ${results.length - failed}/${results.length} passed, ${failed} failed`);
  console.log("=================================================");
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error("FATAL", err);
  process.exit(2);
});
