import assert from "node:assert/strict";

export async function testExpansionApi({ req, user, create, db, check, base }) {
  const auth = await user("expand");
  const original = { id: "shared-meal", type: "expense", date: "2026-09-01", amount: 400, amountPaise: 40000, accountId: "shared-bank", categoryId: "dining", paymentMode: "upi", businessOrPersonal: "personal", description: "Shared dinner" };
  const contribution = (id, amountPaise = 20000) => ({ ...original, id, type: "refund", transactionIntent: "expense_contribution", linkedOriginalTransactionId: original.id, date: "2026-09-02", amount: amountPaise / 100, amountPaise, description: "Friend contribution" });
  const path = id => `/api/data/entity-item.php?collection=transactions&id=${id}`;
  assert.equal((await create(auth, "accounts", { id: "shared-bank", name: "Shared Bank", type: "bank", openingBalance: 0, icon: "wallet", color: "#22c55e" })).status, 201);
  assert.equal((await create(auth, "categories", { id: "dining", name: "Dining", appliesTo: "expense", icon: "tag", color: "#ef4444" })).status, 201);
  assert.equal((await create(auth, "transactions", original)).status, 201);
  await check("contribution: 400 meal + 200 return = 200 expense, -200 cash, zero income", async () => {
    const result = await create(auth, "transactions", contribution("friend-return"), "friend-return-request");
    assert.equal(result.status, 201, JSON.stringify(result));
    assert.deepEqual((await create(auth, "transactions", contribution("friend-return"), "friend-return-request")).data, result.data);
    const [effects] = await db.query("SELECT target_type, SUM(IF(effect_direction='increase',amount_paise,-amount_paise)) n FROM financial_effects WHERE user_id=? GROUP BY target_type", [auth.user.id]);
    assert.equal(Number(effects.find(e => e.target_type === "account").n), -20000);
    assert.equal(Number(effects.find(e => e.target_type === "expense_category").n), 20000);
    assert.ok(!effects.some(e => e.target_type === "income_category"));
  });
  await check("contribution: concurrent returns cannot exceed remaining expense", async () => {
    const results = await Promise.all([create(auth, "transactions", contribution("return-a", 15000)), create(auth, "transactions", contribution("return-b", 15000))]);
    assert.equal(results.filter(r => r.status === 201).length, 1, JSON.stringify(results));
    assert.equal(results.filter(r => r.status === 422).length, 1);
  });
  await check("contribution: category, scope, date, income type and missing original are rejected", async () => {
    for (const patch of [{ categoryId: "foreign-category" }, { businessOrPersonal: "business" }, { date: "2026-08-01" }, { type: "income" }, { linkedOriginalTransactionId: "missing" }, { paymentMode: "credit_card" }]) {
      const response = await create(auth, "transactions", { ...contribution("invalid-return", 100), ...patch });
      assert.equal(response.status, 422, JSON.stringify(response));
    }
    for (const patch of [{ amountPaise: 10000, amount: 100 }, { type: "income" }]) {
      assert.equal((await req(path(original.id), "PATCH", { patch, expectedVersion: 1 }, auth)).status, 422);
    }
    assert.ok([409, 422].includes((await req(path(original.id), "DELETE", { expectedVersion: 1 }, auth)).status));
  });
  await check("statement: OCR confirmation is required server-side and contribution preserves provenance", async () => {
    const body = { userId: auth.user.id, accountId: "shared-bank", bank: "kotak", documentHash: "9".repeat(64), parserVersion: "statement-ocr-v1", openingPaise: 0, closingPaise: 5000, order: "ascending", mutationId: "ocr-contribution", rows: [{ id: "1", page: 1, y: 100, date: "2026-09-03", description: "Remaining shared expense", reference: "CONTRIB-1", debitPaise: 0, creditPaise: 5000, balancePaise: 5000, issues: [], decision: { include: true, reviewed: true, kind: "contribution", categoryId: "dining", scope: "personal", counterpartId: original.id } }] };
    assert.equal((await req("/api/import/statement.php", "POST", body, auth)).status, 422);
    const result = await req("/api/import/statement.php", "POST", { ...body, ocrSourceConfirmed: true }, auth);
    assert.equal(result.status, 200, JSON.stringify(result));
    const [records] = await db.query("SELECT payload FROM cloud_collection_rows WHERE user_id=? AND entity_id=?", [auth.user.id, result.data.transactionIds[0]]);
    const posted = JSON.parse(records[0].payload);
    assert.equal(posted.type, "refund"); assert.equal(posted.transactionIntent, "expense_contribution"); assert.equal(posted.statementSource.ocrSourceConfirmed, true);
  });
  const login = async pin => {
    const result = await req("/api/auth/login.php", "POST", { username: auth.user.username, pin });
    assert.equal(result.status, 200, JSON.stringify(result)); return result.data;
  };
  await check("security: logout revokes captured bearer token but not another session", async () => {
    const first = await login("583921"), second = await login("583921");
    assert.equal((await req("/api/auth/logout.php", "POST", {}, first)).status, 200);
    assert.equal((await req("/api/auth/me.php", "GET", undefined, first)).status, 401);
    assert.equal((await req("/api/auth/me.php", "GET", undefined, second)).status, 200);
  });
  await check("security: recovery requires PIN and survives PIN changes; old sessions are revoked", async () => {
    const body = { securityQuestion: "Synthetic recovery question", securityAnswer: "fixture answer" };
    assert.equal((await req("/api/auth/security-recovery.php", "POST", body, auth)).status, 401);
    assert.equal((await req("/api/auth/security-recovery.php", "POST", { ...body, currentPin: "583921" }, auth)).status, 200);
    const second = await login("583921");
    assert.equal((await req("/api/auth/change-pin.php", "POST", { currentPin: "583921", newPin: "796428" }, auth)).status, 200);
    for (const session of [auth, second]) assert.equal((await req("/api/auth/me.php", "GET", undefined, session)).status, 401);
    const next = await login("796428");
    assert.equal((await req("/api/auth/reset-pin.php", "POST", { securityAnswer: "fixture answer", newPin: "583921" }, next)).status, 200);
    assert.equal((await req("/api/auth/me.php", "GET", undefined, next)).status, 401);
  });
  await check("security: cookie mutations require CSRF, GET me does not rotate a valid token", async () => {
    const session = await login("583921");
    const response = await fetch(base + "/api/auth/profile.php", { method: "PATCH", headers: { "Content-Type": "application/json", Cookie: `sv_auth=${session.token}; sv_csrf=${session.csrfToken}` }, body: JSON.stringify({ displayName: "Should not update" }) });
    assert.equal(response.status, 403);
    assert.equal((await req("/api/auth/me.php", "GET", undefined, session)).data.csrfToken, session.csrfToken);
  });
  await check("security: concurrent PIN changes cannot both overwrite the same credential", async () => {
    const session = await login("583921");
    const pins = ["624895", "748296"];
    const responses = await Promise.all(pins.map(newPin => req("/api/auth/change-pin.php", "POST", { currentPin: "583921", newPin }, session)));
    assert.equal(responses.filter(r => r.status === 200).length, 1, JSON.stringify(responses));
    assert.ok(responses.filter(r => r.status !== 200).every(r => [401, 409].includes(r.status)));
    const winnerPin = pins[responses.findIndex(r => r.status === 200)];
    const winner = await login(winnerPin);
    assert.equal((await req("/api/auth/change-pin.php", "POST", { currentPin: winnerPin, newPin: "583921" }, winner)).status, 200);
  });
  await check("security: forced PIN change blocks financial access until credential replacement", async () => {
    const session = await login("583921");
    await db.query("UPDATE users SET must_change_pin=1 WHERE id=?", [auth.user.id]);
    assert.equal((await req("/api/auth/me.php", "GET", undefined, session)).data.mustChangePin, true);
    assert.equal((await req("/api/data/entity.php?collection=accounts", "GET", undefined, session)).status, 401);
    assert.equal((await req("/api/auth/change-pin.php", "POST", { currentPin: "583921", newPin: "796428" }, session)).status, 200);
    const next = await login("796428");
    assert.equal((await req("/api/auth/me.php", "GET", undefined, next)).data.mustChangePin, false);
  });
  await check("security: dev server refuses source, configuration, backup and dependency paths", async () => {
    for (const path of ["/.env", "/php/config/db.php", "/sql/HOSTING_READY_CLEAN_IMPORT.sql", "/package.json", "/node_modules/vite/package.json", "/tmp/integrity-preview/runtime.json"]) assert.equal((await fetch(base + path)).status, 403, path);
  });
  await check("security: untrusted and opaque origins never receive credentialed CORS", async () => {
    for (const origin of ["https://attacker.invalid", "null"]) {
      const response = await fetch(base + "/api/health.php", { headers: { Origin: origin } });
      assert.equal(response.headers.get("access-control-allow-origin"), null);
    }
  });
  await check("security: spoofed forwarded IP headers cannot evade the login limit", async () => {
    await db.query("DELETE FROM api_rate_limits WHERE bucket_key LIKE 'auth_login|%'");
    try {
      for (let i = 0; i <= 30; i++) {
        const response = await fetch(base + "/api/auth/login.php", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": `198.51.100.${i + 1}`, "CF-Connecting-IP": `198.51.100.${i + 1}` }, body: JSON.stringify({ username: `nonexistent_${i}`, pin: "583921" }) });
        assert.equal(response.status, i < 30 ? 401 : 429);
      }
    } finally { await db.query("DELETE FROM api_rate_limits WHERE bucket_key LIKE 'auth_login|%'"); }
  });
}
