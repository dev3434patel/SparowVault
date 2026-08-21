/**
 * Phase 4 — payload validation + indexed sync e2e.
 *
 * Verifies:
 *   - unknown collection_name rejected
 *   - userId mismatch rejected
 *   - amountPaise <= 0 rejected
 *   - non-integer amountPaise rejected
 *   - credit_card paymentMode with empty linkedCardId rejected
 *   - transfer with same from/to rejected
 *   - payload > 64KB rejected
 *   - valid transaction accepted
 *   - after a valid push, hot fields populated on cloud_collection_rows
 *   - user A cannot push payload using user B userId
 *   - user A cannot read user B rows
 *   - normal pull excludes soft-deleted rows
 *
 * Requirements:
 *   BASE_URL (default http://localhost:4000)
 *   TEST_DB_* with name containing "test" or "cert"
 */
const BASE = process.env.BASE_URL ?? "http://localhost:4000";
if (!/(test|cert)/i.test(process.env.TEST_DB_NAME ?? "")) {
  console.error("TEST_DB_NAME must contain 'test' or 'cert'.");
  process.exit(2);
}

let failed = 0;
const ok = (n, e = "") => console.log(`  PASS  ${n}${e ? ` -- ${e}` : ""}`);
const fail = (n, e = "") => { console.log(`  FAIL  ${n}${e ? ` -- ${e}` : ""}`); failed++; };

async function req(method, path, { token, body } = {}) {
  const url = new URL(path, BASE);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const mysql = await import("mysql2/promise");
const db = await mysql.createConnection({
  host:     process.env.TEST_DB_HOST,
  port:     Number(process.env.TEST_DB_PORT || 3306),
  user:     process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASS || "",
  database: process.env.TEST_DB_NAME,
});

const stamp = Date.now().toString(36);
const A = { username: `p4a_${stamp}`, displayName: "P4 A", pin: "583921" };
const B = { username: `p4b_${stamp}`, displayName: "P4 B", pin: "674532" };
let policyAcceptances = null;

async function cleanup() {
  await db.query("SET FOREIGN_KEY_CHECKS=0");
  for (const u of [A.username, B.username]) {
    await db.query(`DELETE FROM users WHERE username = ?`, [u]);
  }
  await db.query("SET FOREIGN_KEY_CHECKS=1");
}

async function register(u) {
  if (!policyAcceptances) {
    const policies = await req("GET", "/api/policies/current.php");
    const versions = policies.json?.data?.versions ?? {};
    policyAcceptances = ["terms", "privacy"].map((key) => ({ key, version: versions[key] }));
  }
  const r = await req("POST", "/api/cloud/register.php", { body: { ...u, policyAcceptances } });
  if (r.status !== 201) throw new Error("register failed: " + JSON.stringify(r));
  return { token: r.json.data.token, id: r.json.data.user.id };
}

function txn(userId, override = {}) {
  return {
    id: override.id ?? `tx_${stamp}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type: "expense",
    amountPaise: 12345,
    amount: 123.45,
    date: "2026-05-13",
    paymentMode: "upi",
    accountId: "acc_test",
    categoryId: "cat_food",
    businessOrPersonal: "personal",
    needWant: "need",
    fixedVariable: "variable",
    plannedUnplanned: "unassigned",
    ...override,
  };
}

async function push(token, collection, entity) {
  const payload = {
    collections: {
      [collection]: [{ ...entity, updatedAt: new Date().toISOString() }],
    },
  };
  return req("POST", "/api/cloud/sync/push.php", { token, body: payload });
}

(async () => {
  try {
    await cleanup();
    const a = await register(A);
    const b = await register(B);

    // 1. Unknown collection_name rejected
    {
      const r = await push(a.token, "definitely_not_a_collection", txn(a.id));
      if (r.status >= 400) ok("1 unknown collection_name rejected", `status=${r.status}`);
      else fail("1 unknown collection_name rejected", `status=${r.status}`);
    }

    // 2. userId mismatch rejected (A pushes B's id)
    {
      const r = await push(a.token, "transactions", txn(b.id));
      if (r.status >= 400) ok("2 userId mismatch rejected", `status=${r.status}`);
      else fail("2 userId mismatch rejected", `status=${r.status}`);
    }

    // 3. amountPaise <= 0 rejected
    {
      const r = await push(a.token, "transactions", txn(a.id, { amountPaise: 0, amount: 0 }));
      if (r.status >= 400) ok("3 amountPaise = 0 rejected", `status=${r.status}`);
      else fail("3 amountPaise = 0 rejected", `status=${r.status}`);
      const r2 = await push(a.token, "transactions", txn(a.id, { amountPaise: -10, amount: -0.1 }));
      if (r2.status >= 400) ok("3b amountPaise < 0 rejected", `status=${r2.status}`);
      else fail("3b amountPaise < 0 rejected", `status=${r2.status}`);
    }

    // 4. Decimal amountPaise rejected
    {
      const r = await push(a.token, "transactions", txn(a.id, { amountPaise: 12.5, amount: 0.125 }));
      if (r.status >= 400) ok("4 decimal amountPaise rejected", `status=${r.status}`);
      else fail("4 decimal amountPaise rejected", `status=${r.status}`);
    }

    // 5. paymentMode=credit_card with empty linkedCardId rejected
    {
      const r = await push(a.token, "transactions", txn(a.id, { paymentMode: "credit_card", linkedCardId: "" }));
      if (r.status >= 400) ok("5 credit_card without linkedCardId rejected", `status=${r.status}`);
      else fail("5 credit_card without linkedCardId rejected", `status=${r.status}`);
    }

    // 6. Transfer with same from/to rejected
    {
      const r = await push(a.token, "transactions", txn(a.id, {
        type: "transfer", paymentMode: "bank_transfer",
        accountId: "acc_x", toAccountId: "acc_x",
      }));
      if (r.status >= 400) ok("6 same from/to transfer rejected", `status=${r.status}`);
      else fail("6 same from/to transfer rejected", `status=${r.status}`);
    }

    // 7. Payload > 64KB rejected
    {
      const big = "x".repeat(70_000);
      const r = await push(a.token, "transactions", txn(a.id, { description: big }));
      if (r.status >= 400) ok("7 oversized payload rejected", `status=${r.status}`);
      else fail("7 oversized payload rejected", `status=${r.status}`);
    }

    // 8. Valid transaction accepted
    let validId;
    {
      const entity = txn(a.id, { amountPaise: 40399, amount: 403.99 });
      validId = entity.id;
      const r = await push(a.token, "transactions", entity);
      if (r.status === 200 || r.status === 201) ok("8 valid transaction accepted", `status=${r.status}`);
      else fail("8 valid transaction accepted", `status=${r.status} json=${JSON.stringify(r.json)}`);
    }

    // 9. Hot fields populated on cloud_collection_rows
    if (validId) {
      const [rows] = await db.query(
        `SELECT amount_paise, txn_local_date, txn_month, txn_type, category_id, account_id
           FROM cloud_collection_rows
          WHERE user_id = ? AND entity_id = ?`,
        [a.id, validId]
      );
      const row = rows[0];
      const localDate = row?.txn_local_date instanceof Date
        ? `${row.txn_local_date.getFullYear()}-${String(row.txn_local_date.getMonth() + 1).padStart(2, "0")}-${String(row.txn_local_date.getDate()).padStart(2, "0")}`
        : String(row?.txn_local_date ?? "").slice(0, 10);
      const sane = row
        && Number(row.amount_paise) === 40399
        && localDate === "2026-05-13"
        && row.txn_month === "2026-05"
        && row.txn_type === "expense"
        && row.category_id === "cat_food"
        && row.account_id === "acc_test";
      if (sane) ok("9 hot fields populated", JSON.stringify(row));
      else fail("9 hot fields populated", JSON.stringify(row));
    }

    // 10. Cross-user pull denied — user A pulling user B's rows must not return them.
    {
      const r = await req("GET", "/api/cloud/sync/pull.php", { token: a.token });
      if (r.status === 200) {
        const txns = r.json?.data?.collections?.transactions ?? [];
        const seenB = txns.some((row) => {
          const payload = typeof row.payload === "string" ? safeParse(row.payload) : row.payload;
          return payload && payload.userId === b.id;
        });
        if (!seenB) ok("10 cross-user pull denied (A sees no B rows)");
        else fail("10 cross-user pull denied", "A's pull contains B's row");
      } else {
        fail("10 cross-user pull denied", `status=${r.status}`);
      }
    }

    // 11. Soft-deleted rows excluded from normal pull.
    if (validId) {
      await db.query(
        `UPDATE cloud_collection_rows SET deleted_at = NOW() WHERE user_id = ? AND entity_id = ?`,
        [a.id, validId]
      );
      const r = await req("GET", "/api/cloud/sync/pull.php", { token: a.token });
      const txns = r.json?.data?.collections?.transactions ?? [];
      const stillThere = txns.some((row) => row.entityId === validId || row.id === validId);
      if (!stillThere) ok("11 soft-deleted rows excluded from normal pull");
      else fail("11 soft-deleted rows excluded from normal pull", "soft-deleted row was returned");
    }
  } catch (e) {
    fail("driver", e.message);
  } finally {
    await cleanup().catch(() => {});
    await db.end();
  }

  console.log(`\n${failed === 0 ? "ALL PASS" : `${failed} FAIL(S)`}`);
  process.exit(failed === 0 ? 0 : 1);
})();

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
