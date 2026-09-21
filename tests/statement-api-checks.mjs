import assert from "node:assert/strict";

export async function testStatementApi({ req, user, create, db, check: recordCheck }) {
  const clearTestThrottle = () => db.query("DELETE FROM api_rate_limits WHERE bucket_key LIKE 'statement_import|%'");
  const check = async (title, run) => { await clearTestThrottle(); await recordCheck(title, run); };
  const auth = await user("stmta");
  const other = await user("stmtb");
  const account = { id: "statement-bank", name: "Statement Bank", type: "bank", openingBalance: 10000, openingBalancePaise: 1000000, icon: "wallet", color: "#22c55e", isInactive: 0 };
  for (const a of [auth, other]) {
    assert.equal((await create(a, "accounts", account)).status, 201);
    for (const [id, name, appliesTo] of [["statement-salary", "Salary", "income"], ["statement-food", "Food & Dining", "expense"], ["statement-other", "Other expenses", "expense"]]) assert.equal((await create(a, "categories", { id, name, appliesTo, icon: "tag", color: "#ef4444" })).status, 201);
  }
  assert.equal((await create(other, "categories", { id: "foreign-statement-category", name: "Foreign", appliesTo: "expense", icon: "tag", color: "#000000" })).status, 201);
  const rows = [
    { id: "1", page: 1, y: 195, date: "2026-08-01", description: "SALARY ACME", reference: "R01", debitPaise: 0, creditPaise: 5000000, balancePaise: 6000000, issues: [], decision: { include: true, reviewed: true, kind: "income", categoryId: "statement-salary", scope: "personal", counterpartId: "" } },
    { id: "2", page: 1, y: 230, date: "2026-08-02", description: "UPI ZOMATO", reference: "R02", debitPaise: 50050, creditPaise: 0, balancePaise: 5949950, issues: [], decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-food", scope: "personal", counterpartId: "" } },
    { id: "3", page: 1, y: 265, date: "2026-08-03", description: "UPI UNKNOWN PERSON", reference: "R03", debitPaise: 100000, creditPaise: 0, balancePaise: 5849950, issues: [], decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-other", scope: "personal", counterpartId: "" } },
  ];
  const body = { userId: auth.user.id, accountId: account.id, bank: "hdfc", documentHash: "a".repeat(64), parserVersion: "statement-text-v1", openingPaise: 1000000, closingPaise: 5849950, order: "ascending", rows, mutationId: "statement-test-batch" };
  const send = input => req("/api/import/statement.php", "POST", input, auth);
  const count = async table => Number((await db.query(`SELECT COUNT(*) n FROM ${table} WHERE user_id=?`, [auth.user.id]))[0][0].n);
  await check("statement: method, authentication and CSRF are enforced", async () => {
    assert.equal((await req("/api/import/statement.php", "GET", undefined, auth)).status, 405);
    assert.equal((await req("/api/import/statement.php", "POST", body)).status, 401);
    // No double-submit cookie/token is accepted, even for an authenticated bearer.
    const bad = await req("/api/import/statement.php", "POST", body, { ...auth, csrfToken: "" });
    assert.equal(bad.status, 403);
  });
  await check("statement: mismatched balance cannot partially post source, effects or audit", async () => {
    const before = await count("user_audit_logs");
    const invalid = structuredClone(body); invalid.rows[1].balancePaise += 1;
    assert.equal((await send(invalid)).status, 422);
    assert.equal(await count("financial_events"), 0); assert.equal(await count("financial_effects"), 0); assert.equal(await count("user_audit_logs"), before);
  });
  await check("statement: foreign categories, account switch and invalid calendar dates are rejected", async () => {
    const invalid = structuredClone(body); invalid.rows[2].decision.categoryId = "foreign-statement-category";
    assert.equal((await send(invalid)).status, 422);
    assert.equal((await send({ ...body, userId: other.user.id })).status, 403);
    invalid.rows[2].date = "2026-02-31";
    assert.equal((await send(invalid)).status, 422);
    assert.equal(await count("financial_events"), 0);
  });
  await check("statement: explicit review, matching direction, scope and category are mandatory", async () => {
    for (const change of [{ reviewed: false }, { kind: "income" }, { categoryId: "statement-salary" }, { scope: "" }]) {
      const invalid = structuredClone(body); Object.assign(invalid.rows[1].decision, change);
      assert.equal((await send(invalid)).status, 422);
    }
    assert.equal((await send({ ...body, pdfPassword: "must-not-be-accepted" })).status, 422);
  });
  await check("statement: concurrent identical reviewed imports produce exactly three transactions", async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => send(body)));
    for (const response of responses) assert.equal(response.status, 200, JSON.stringify(response));
    assert.ok(responses.every(response => JSON.stringify(response.data) === JSON.stringify(responses[0].data)));
    assert.deepEqual([responses[0].data.imported, responses[0].data.duplicates], [3, 0]);
    assert.equal(await count("financial_events"), 3);
    const [effects] = await db.query("SELECT effect_direction, SUM(amount_paise) n FROM financial_effects WHERE user_id=? AND target_type='account' AND target_id=? GROUP BY effect_direction", [auth.user.id, account.id]);
    assert.equal(Number(effects.find(row => row.effect_direction === "increase").n), 5000000);
    assert.equal(Number(effects.find(row => row.effect_direction === "decrease").n), 150050);
  });
  await check("statement: re-exported PDF and new request key do not duplicate imported rows", async () => {
    const response = await send({ ...body, documentHash: "b".repeat(64), mutationId: "statement-new-document" });
    assert.equal(response.status, 200); assert.equal(response.data.imported, 0); assert.equal(response.data.duplicates, 3);
    assert.equal(await count("financial_events"), 3);
    assert.equal((await send({ ...body, closingPaise: 1 })).code, "IDEMPOTENCY_CONFLICT");
  });
  await check("statement: approved transaction provenance excludes PDF bytes and passwords", async () => {
    const [records] = await db.query("SELECT payload FROM cloud_collection_rows WHERE user_id=? AND collection_name='transactions'", [auth.user.id]);
    assert.equal(records.length, 3);
    const payload = JSON.parse(records[0].payload); assert.equal(payload.statementSource.bank, "hdfc"); assert.equal(payload.statementSource.documentHash, body.documentHash);
    assert.ok(!JSON.stringify(records).includes("must-not-be-accepted")); assert.ok(!JSON.stringify(records).includes("%PDF-"));
  });
  await check("statement: the same PDF cannot be posted into a second bank account", async () => {
    assert.equal((await create(auth, "accounts", { ...account, id: "statement-bank-two" })).status, 201);
    assert.equal((await send({ ...body, accountId: "statement-bank-two", mutationId: "statement-wrong-account" })).code, "DOCUMENT_ACCOUNT_CONFLICT");
  });
  await check("statement: excluded rows still participate in complete balance validation", async () => {
    const selected = structuredClone(body); selected.mutationId = "statement-partial-selection";
    selected.rows[1].decision.include = false;
    const result = await send(selected); assert.equal(result.status, 200); assert.equal(result.data.skipped, 1); assert.equal(result.data.duplicates, 2);
    selected.mutationId = "statement-bad-excluded"; selected.rows[1].balancePaise += 1;
    assert.equal((await send(selected)).status, 422);
  });
  await check("statement: own-account transfer posts both account legs without income/expense categories", async () => {
    assert.equal((await create(auth, "accounts", { ...account, id: "statement-cash", type: "cash" })).status, 201);
    const transfer = { ...body, documentHash: "c".repeat(64), openingPaise: 100000, closingPaise: 0, mutationId: "statement-transfer", rows: [{ ...rows[2], date: "2026-09-01", description: "ATM SELF CASH", debitPaise: 100000, creditPaise: 0, balancePaise: 0, decision: { include: true, reviewed: true, kind: "transfer", categoryId: "", counterpartId: "statement-cash", scope: "personal" } }] };
    const result = await send(transfer); assert.equal(result.status, 200); assert.equal(result.data.imported, 1);
    const [effects] = await db.query("SELECT f.* FROM financial_effects f JOIN financial_events e ON e.id=f.event_id WHERE e.user_id=? AND e.source_transaction_id=?", [auth.user.id, result.data.transactionIds[0]]);
    assert.equal(effects.length, 2); assert.ok(effects.every(effect => effect.target_type === "account"));
    assert.ok(effects.some(effect => effect.target_id === "statement-cash" && effect.effect_direction === "increase"));
  });
  await check("statement: excessive linked refunds roll back the entire batch", async () => {
    const [records] = await db.query("SELECT entity_id FROM cloud_collection_rows WHERE user_id=? AND collection_name='transactions' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.description'))='UPI ZOMATO'", [auth.user.id]);
    const before = await count("financial_events");
    const refund = { ...body, documentHash: "d".repeat(64), openingPaise: 0, closingPaise: 60000, mutationId: "statement-over-refund", rows: [1, 2].map((i) => ({ ...rows[0], id: String(i), date: `2026-09-0${i}`, description: `ZOMATO REFUND ${i}`, reference: `RF${i}`, creditPaise: 30000, debitPaise: 0, balancePaise: i * 30000, decision: { include: true, reviewed: true, kind: "refund", categoryId: "statement-food", counterpartId: records[0].entity_id, scope: "personal" } })) };
    const result = await send(refund); assert.equal(result.status, 422); assert.match(result.error, /Refund exceeds/);
    assert.equal(await count("financial_events"), before);
  });
  await check("statement: reviewed refund reduces expense and increases bank balance without income", async () => {
    const [records] = await db.query("SELECT entity_id FROM cloud_collection_rows WHERE user_id=? AND collection_name='transactions' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.description'))='UPI ZOMATO'", [auth.user.id]);
    const refund = { ...body, documentHash: "e".repeat(64), openingPaise: 0, closingPaise: 50050, mutationId: "statement-valid-refund", rows: [{ ...rows[0], date: "2026-09-02", description: "ZOMATO FULL REFUND", reference: "RF-FULL", creditPaise: 50050, debitPaise: 0, balancePaise: 50050, decision: { include: true, reviewed: true, kind: "refund", categoryId: "statement-food", counterpartId: records[0].entity_id, scope: "personal" } }] };
    const premature = structuredClone(refund); premature.mutationId = "statement-premature-refund"; premature.rows[0].date = "2026-07-01";
    assert.equal((await send(premature)).status, 422);
    const result = await send(refund); assert.equal(result.status, 200, JSON.stringify(result)); assert.equal(result.data.imported, 1);
    const [effects] = await db.query("SELECT f.* FROM financial_effects f JOIN financial_events e ON e.id=f.event_id WHERE e.user_id=? AND e.source_transaction_id=?", [auth.user.id, result.data.transactionIds[0]]);
    assert.equal(effects.length, 2);
    assert.ok(effects.some(effect => effect.target_type === "account" && effect.target_id === account.id && effect.effect_direction === "increase" && Number(effect.amount_paise) === 50050));
    assert.ok(effects.some(effect => effect.target_type === "expense_category" && effect.target_id === "statement-food" && effect.effect_direction === "decrease" && Number(effect.amount_paise) === 50050));
  });
  await check("statement: card payment reduces cash and card liability without recording another expense", async () => {
    assert.equal((await create(auth, "cards", { id: "statement-credit-card", type: "credit", nickname: "Statement Test Card", bankName: "HDFC", network: "visa", last4: "1234", creditLimit: 100000, openingOutstanding: 5000, isInactive: 0 })).status, 201);
    const payment = { ...body, documentHash: "f".repeat(64), openingPaise: 500000, closingPaise: 0, mutationId: "statement-card-payment", rows: [{ ...rows[2], date: "2026-09-03", description: "CREDIT CARD BILL PAYMENT", reference: "CARD-01", debitPaise: 500000, creditPaise: 0, balancePaise: 0, decision: { include: true, reviewed: true, kind: "cc_payment", categoryId: "", counterpartId: "statement-credit-card", scope: "personal" } }] };
    const invalid = structuredClone(payment); invalid.rows[0].decision.counterpartId = "statement-bank";
    assert.equal((await send(invalid)).status, 422);
    const result = await send(payment); assert.equal(result.status, 200, JSON.stringify(result)); assert.equal(result.data.imported, 1);
    const [effects] = await db.query("SELECT f.* FROM financial_effects f JOIN financial_events e ON e.id=f.event_id WHERE e.user_id=? AND e.source_transaction_id=?", [auth.user.id, result.data.transactionIds[0]]);
    assert.equal(effects.length, 2); assert.ok(effects.every(effect => effect.effect_direction === "decrease" && Number(effect.amount_paise) === 500000));
    assert.ok(effects.some(effect => effect.target_type === "account" && effect.target_id === account.id));
    assert.ok(effects.some(effect => effect.target_type === "credit_card" && effect.target_id === "statement-credit-card"));
  });
  await check("statement: import throttling rejects requests beyond its configured limit", async () => {
    const invalid = structuredClone(body); invalid.mutationId = "throttle-fixture"; invalid.rows[0].decision.reviewed = false;
    for (let i = 0; i < 20; i++) assert.equal((await send(invalid)).status, 422);
    assert.equal((await send(invalid)).status, 429);
  });
  await clearTestThrottle();
  await check("statement: stale reviewDigest is rejected with no financial writes", async () => {
    const beforeEvents = await count("financial_events");
    const beforeTx = await count("cloud_collection_rows");
    const { createHash } = await import("node:crypto");
    const rowsDigest = [{
      id: "rd1", page: 1, y: 100, date: "2026-05-01", description: "UPI TEST", reference: "RD1",
      debitPaise: 10000, creditPaise: 0, balancePaise: 990000, issues: [],
      decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-food", scope: "personal", counterpartId: "" },
    }];
    const payload = {
      userId: auth.user.id,
      accountId: account.id,
      bank: "hdfc",
      documentHash: "9".repeat(64),
      parserVersion: "statement-text-v2",
      openingPaise: 1000000,
      closingPaise: 990000,
      order: "ascending",
      mutationId: "statement-stale-digest",
      reviewRevision: 1,
      rows: rowsDigest,
    };
    const material = JSON.stringify({
      accountId: payload.accountId,
      bank: payload.bank,
      documentHash: payload.documentHash,
      parserVersion: payload.parserVersion,
      openingPaise: payload.openingPaise,
      closingPaise: payload.closingPaise,
      order: payload.order,
      rows: rowsDigest.map((r) => ({
        id: r.id, date: r.date, debitPaise: r.debitPaise, creditPaise: r.creditPaise, balancePaise: r.balancePaise,
        description: r.description, reference: r.reference,
        decision: { include: r.decision.include, reviewed: r.decision.reviewed, kind: r.decision.kind, categoryId: r.decision.categoryId, scope: r.decision.scope, counterpartId: r.decision.counterpartId, matchTransactionId: null },
      })),
      sourceEvidence: {},
      reviewRevision: 1,
    });
    const goodDigest = createHash("sha256").update(material).digest("hex");
    const stale = await send({ ...payload, reviewDigest: "a".repeat(64), mutationId: "statement-stale-digest-bad" });
    assert.equal(stale.status, 409, JSON.stringify(stale));
    assert.equal(stale.code, "STALE_REVIEW_DIGEST");
    assert.equal(await count("financial_events"), beforeEvents);
    assert.equal(await count("cloud_collection_rows"), beforeTx);
    const okish = await send({ ...payload, reviewDigest: goodDigest, mutationId: "statement-good-digest" });
    assert.notEqual(okish.code, "STALE_REVIEW_DIGEST", JSON.stringify(okish));
    assert.ok([201, 200, 422].includes(okish.status), JSON.stringify(okish));
  });
  await check("statement: digest rejects direction flip and month-crossing date edits relative to stale hash", async () => {
    const { createHash } = await import("node:crypto");
    const baseRow = {
      id: "flip1", page: 1, y: 100, date: "2026-05-01", description: "UPI TEST", reference: "FL1",
      debitPaise: 10000, creditPaise: 0, balancePaise: 990000, issues: [],
      decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-food", scope: "personal", counterpartId: "" },
    };
    const materialFor = (rows, revision) => JSON.stringify({
      accountId: account.id, bank: "hdfc", documentHash: "8".repeat(64), parserVersion: "statement-text-v2",
      openingPaise: 1000000, closingPaise: 990000, order: "ascending",
      rows: rows.map((r) => ({
        id: r.id, date: r.date, debitPaise: r.debitPaise, creditPaise: r.creditPaise, balancePaise: r.balancePaise,
        description: r.description, reference: r.reference,
        decision: { include: r.decision.include, reviewed: r.decision.reviewed, kind: r.decision.kind, categoryId: r.decision.categoryId, scope: r.decision.scope, counterpartId: r.decision.counterpartId, matchTransactionId: null },
      })),
      sourceEvidence: {}, reviewRevision: revision,
    });
    const flipped = { ...baseRow, debitPaise: 0, creditPaise: 10000, balancePaise: 1010000, decision: { ...baseRow.decision, kind: "income", categoryId: "statement-salary" } };
    const staleHash = createHash("sha256").update(materialFor([baseRow], 1)).digest("hex");
    const beforeEvents = await count("financial_events");
    const flipAttempt = await send({
      userId: auth.user.id, accountId: account.id, bank: "hdfc", documentHash: "8".repeat(64),
      parserVersion: "statement-text-v2", openingPaise: 1000000, closingPaise: 1010000, order: "ascending",
      mutationId: "statement-digest-flip", reviewRevision: 1, reviewDigest: staleHash, rows: [flipped],
    });
    assert.equal(flipAttempt.code, "STALE_REVIEW_DIGEST", JSON.stringify(flipAttempt));
    const monthShift = { ...baseRow, date: "2026-06-01" };
    const monthAttempt = await send({
      userId: auth.user.id, accountId: account.id, bank: "hdfc", documentHash: "7".repeat(64),
      parserVersion: "statement-text-v2", openingPaise: 1000000, closingPaise: 990000, order: "ascending",
      mutationId: "statement-digest-month", reviewRevision: 1, reviewDigest: staleHash, rows: [monthShift],
    });
    assert.equal(monthAttempt.code, "STALE_REVIEW_DIGEST", JSON.stringify(monthAttempt));
    assert.equal(await count("financial_events"), beforeEvents);
  });
  await check("statement: omitted offsetting pair is rejected when independent evidence mismatches", async () => {
    const beforeEvents = await count("financial_events");
    const beforeTx = await count("cloud_collection_rows");
    // Opening 10000; omit equal debit+credit 100 pair; remaining rows still balance to closing 10950.
    const omitPair = {
      userId: auth.user.id,
      accountId: account.id,
      bank: "hdfc",
      documentHash: "1".repeat(64),
      parserVersion: "statement-text-v1",
      openingPaise: 1000000,
      closingPaise: 1095000,
      order: "ascending",
      mutationId: "statement-omit-pair",
      sourceEvidence: {
        printedDebitCount: 2,
        printedCreditCount: 2,
        printedGrossDebitPaise: 15000,
        printedGrossCreditPaise: 110000,
        expectedTransactionCount: 4,
        evidenceOrigin: "printed_summary",
      },
      rows: [
        { id: "r3", page: 1, y: 100, date: "2026-04-01", description: "UPI MERCHANT", reference: "R3", debitPaise: 5000, creditPaise: 0, balancePaise: 995000, issues: [], decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-food", scope: "personal", counterpartId: "" } },
        { id: "r4", page: 1, y: 140, date: "2026-04-02", description: "NEFT CREDIT", reference: "R4", debitPaise: 0, creditPaise: 100000, balancePaise: 1095000, issues: [], decision: { include: true, reviewed: true, kind: "income", categoryId: "statement-salary", scope: "personal", counterpartId: "" } },
      ],
    };
    const response = await send(omitPair);
    assert.equal(response.status, 422, JSON.stringify(response));
    assert.equal(response.code, "STATEMENT_COMPLETENESS_MISMATCH");
    assert.equal(await count("financial_events"), beforeEvents);
    assert.equal(await count("cloud_collection_rows"), beforeTx);
  });
  await check("statement: complete fixture with matching evidence posts and writes importSources", async () => {
    const complete = {
      userId: auth.user.id,
      accountId: account.id,
      bank: "hdfc",
      documentHash: "2".repeat(64),
      parserVersion: "statement-text-v1",
      openingPaise: 1000000,
      closingPaise: 1095000,
      order: "ascending",
      mutationId: "statement-complete-evidence",
      sourceEvidence: {
        printedDebitCount: 2,
        printedCreditCount: 2,
        printedGrossDebitPaise: 15000,
        printedGrossCreditPaise: 110000,
        expectedTransactionCount: 4,
        evidenceOrigin: "printed_summary",
      },
      rows: [
        { id: "r1", page: 1, y: 40, date: "2026-03-31", description: "UPI OUT", reference: "R1", debitPaise: 10000, creditPaise: 0, balancePaise: 990000, issues: [], decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-food", scope: "personal", counterpartId: "" } },
        { id: "r2", page: 1, y: 70, date: "2026-03-31", description: "UPI IN", reference: "R2", debitPaise: 0, creditPaise: 10000, balancePaise: 1000000, issues: [], decision: { include: true, reviewed: true, kind: "income", categoryId: "statement-salary", scope: "personal", counterpartId: "" } },
        { id: "r3", page: 1, y: 100, date: "2026-04-01", description: "UPI MERCHANT", reference: "R3", debitPaise: 5000, creditPaise: 0, balancePaise: 995000, issues: [], decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-food", scope: "personal", counterpartId: "" } },
        { id: "r4", page: 1, y: 140, date: "2026-04-02", description: "NEFT CREDIT", reference: "R4", debitPaise: 0, creditPaise: 100000, balancePaise: 1095000, issues: [], decision: { include: true, reviewed: true, kind: "income", categoryId: "statement-salary", scope: "personal", counterpartId: "" } },
      ],
    };
    const response = await send(complete);
    assert.equal(response.status, 200, JSON.stringify(response));
    assert.equal(response.data.imported, 4);
    assert.ok(response.data.importSourceId);
    const [sources] = await db.query("SELECT payload FROM cloud_collection_rows WHERE user_id=? AND collection_name='importSources'", [auth.user.id]);
    assert.ok(sources.length >= 1);
  });
  await check("statement: confirmed match persists reconciliationMatches without duplicating money", async () => {
    const [existing] = await db.query("SELECT entity_id FROM cloud_collection_rows WHERE user_id=? AND collection_name='transactions' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.description'))='UPI ZOMATO'", [auth.user.id]);
    assert.ok(existing[0]?.entity_id);
    const beforeEvents = await count("financial_events");
    const matchOnly = {
      userId: auth.user.id,
      accountId: account.id,
      bank: "hdfc",
      documentHash: "3".repeat(64),
      parserVersion: "statement-text-v1",
      openingPaise: 50050,
      closingPaise: 0,
      order: "ascending",
      mutationId: "statement-match-only",
      rows: [{
        id: "dup1", page: 1, y: 10, date: "2026-08-02", description: "UPI ZOMATO", reference: "R02",
        debitPaise: 50050, creditPaise: 0, balancePaise: 0, issues: [],
        decision: { include: false, reviewed: true, kind: "", categoryId: "", scope: "personal", counterpartId: "", matchTransactionId: existing[0].entity_id },
      }],
    };
    const response = await send(matchOnly);
    assert.equal(response.status, 200, JSON.stringify(response));
    assert.equal(response.data.imported, 0);
    assert.equal(response.data.skipped, 1);
    assert.ok(response.data.matchIds?.length >= 1);
    assert.equal(await count("financial_events"), beforeEvents);
    const [matches] = await db.query("SELECT payload FROM cloud_collection_rows WHERE user_id=? AND collection_name='reconciliationMatches'", [auth.user.id]);
    assert.ok(matches.length >= 1);
    assert.equal(JSON.parse(matches[0].payload).status, "confirmed");
  });
  await check("card statement: liability arithmetic posts purchases and matches bank repayment once", async () => {
    assert.equal((await create(auth, "cards", { id: "card-stmt-1", type: "credit", nickname: "Card Import", bankName: "HDFC", network: "visa", last4: "9999", creditLimit: 200000, openingOutstanding: 1000, isInactive: 0 })).status, 201);
    const bankPay = { ...body, documentHash: "4".repeat(64), openingPaise: 80000, closingPaise: 0, mutationId: "card-bank-repay", rows: [{ ...rows[2], date: "2026-04-03", description: "CREDIT CARD BILL PAYMENT HDFC", reference: "CARDPAY", debitPaise: 80000, creditPaise: 0, balancePaise: 0, decision: { include: true, reviewed: true, kind: "cc_payment", categoryId: "", counterpartId: "card-stmt-1", scope: "personal" } }] };
    const bankResult = await send(bankPay);
    assert.equal(bankResult.status, 200, JSON.stringify(bankResult));
    const bankTxId = bankResult.data.transactionIds[0];
    const beforeEvents = await count("financial_events");
    const cardBody = {
      userId: auth.user.id,
      cardId: "card-stmt-1",
      issuer: "hdfc",
      documentHash: "5".repeat(64),
      parserVersion: "statement-card-v1",
      previousBalancePaise: 100000,
      closingLiabilityPaise: 62000,
      mutationId: "card-statement-synthetic",
      rows: [
        { id: "c1", page: 1, date: "2026-04-01", description: "PURCHASE STORE", reference: "P1", amountPaise: 50000, direction: "debit", kindHint: "purchase", issues: [], decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-food", scope: "personal" } },
        { id: "c2", page: 1, date: "2026-04-02", description: "INTEREST", reference: "I1", amountPaise: 2000, direction: "debit", kindHint: "interest", issues: [], decision: { include: true, reviewed: true, kind: "expense", categoryId: "statement-other", scope: "personal" } },
        { id: "c3", page: 1, date: "2026-04-03", description: "PAYMENT THANK YOU", reference: "PAY", amountPaise: 80000, direction: "credit", kindHint: "payment", issues: [], decision: { include: false, reviewed: true, kind: "", categoryId: "", scope: "personal", matchTransactionId: bankTxId } },
        { id: "c4", page: 1, date: "2026-04-04", description: "MERCHANT REFUND", reference: "RF", amountPaise: 10000, direction: "credit", kindHint: "refund", issues: [], decision: { include: false, reviewed: true, kind: "", categoryId: "", scope: "personal" } },
      ],
    };
    const cardSend = (input) => req("/api/import/statement-card.php", "POST", input, auth);
    const bad = structuredClone(cardBody); bad.closingLiabilityPaise = 1; bad.mutationId = "card-bad-arith";
    assert.equal((await cardSend(bad)).code, "CARD_LIABILITY_MISMATCH");
    const result = await cardSend(cardBody);
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.equal(result.data.imported, 2);
    assert.equal(result.data.matchedPayments, 1);
    assert.ok(result.data.importSourceId);
    assert.equal(await count("financial_events"), beforeEvents + 2);
    // Deposit path still rejects card headings via client parser; server card route is separate.
  });
  await check("goal contrib: earmark notes accepted; funded_transfer without transaction rejected", async () => {
    assert.equal((await create(auth, "goals", { id: "goal-stmt-1", title: "Phone", goalType: "gadget", targetAmount: 10000, targetAmountPaise: 1000000, targetDate: "2026-12-01", startedAt: "2026-01-01", currentSaved: 0, savedAmountPaise: 0, priority: 3, icon: "target", color: "#22c55e", status: "active" })).status, 201);
    const earmark = await create(auth, "goalContribs", { id: "gc-earmark", goalId: "goal-stmt-1", date: "2026-09-01", amount: 20, amountPaise: 2000, sourceAccountId: account.id, notes: "fundingMode:earmark", fundingMode: "earmark" });
    assert.equal(earmark.status, 201, JSON.stringify(earmark));
    const badFunded = await create(auth, "goalContribs", { id: "gc-bad", goalId: "goal-stmt-1", date: "2026-09-01", amount: 20, amountPaise: 2000, sourceAccountId: account.id, notes: "fundingMode:funded_transfer", fundingMode: "funded_transfer" });
    assert.equal(badFunded.status, 422);
  });
  await clearTestThrottle();
  // A separate owner gives the UI its own clean fixture and genuine cookie login.
  assert.equal((await create(other, "transactions", { id: "ui-shared-meal", type: "expense", date: "2026-08-10", amount: 400, amountPaise: 40000, accountId: account.id, categoryId: "statement-food", paymentMode: "upi", businessOrPersonal: "personal", description: "Shared dinner UI fixture" })).status, 201);
  return { auth: other, accountId: account.id };
}
