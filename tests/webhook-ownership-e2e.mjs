/**
 * Phase 1 — Razorpay webhook ownership e2e.
 *
 * Covers gate checks 5-9:
 *   5. Valid webhook with correct user/order/amount activates the right sub.
 *   6. Duplicate event_id is idempotent — no double activation.
 *   7. Wrong signature returns 401.
 *   8. Correct order_id but wrong amount does not activate.
 *   9. Correct order_id but wrong user payload — webhook still attributes to
 *      the OWNING user_id stored on the payments row (cross-user spoof safe).
 *
 * This script seeds its own payments + subscriptions row directly via MySQL
 * (rather than going through Razorpay's Orders API) so it works fully
 * offline. The only Razorpay machinery exercised is the HMAC signature path.
 *
 * Requirements:
 *   - PHP API server reachable at $BASE_URL (default http://localhost:4000)
 *   - $TEST_DB_NAME contains the substring "test" or "cert"
 *   - $RAZORPAY_WEBHOOK_SECRET set (use any value; both sides need it)
 *
 * Usage:
 *   BASE_URL=http://localhost:4000 \
 *   TEST_DB_HOST=localhost TEST_DB_USER=root TEST_DB_PASS=… TEST_DB_NAME=sparowvault_test \
 *   RAZORPAY_WEBHOOK_SECRET=test_secret \
 *   node tests/webhook-ownership-e2e.mjs
 */
import crypto from "node:crypto";

const BASE   = process.env.BASE_URL ?? "http://localhost:4000";
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

if (!SECRET) {
  console.error("RAZORPAY_WEBHOOK_SECRET is required.");
  process.exit(2);
}
if (!/(test|cert)/i.test(process.env.TEST_DB_NAME ?? "")) {
  console.error("TEST_DB_NAME must contain 'test' or 'cert' to seed fixture rows.");
  process.exit(2);
}

let failed = 0;
function ok(name, extra = "") { console.log(`  PASS  ${name}${extra ? ` -- ${extra}` : ""}`); }
function fail(name, extra = "") { console.log(`  FAIL  ${name}${extra ? ` -- ${extra}` : ""}`); failed++; }

const mysql = await import("mysql2/promise");
const db = await mysql.createConnection({
  host:     process.env.TEST_DB_HOST,
  port:     Number(process.env.TEST_DB_PORT || 3306),
  user:     process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASS || "",
  database: process.env.TEST_DB_NAME,
});

// ─── seed helpers ──────────────────────────────────────────────────────────
async function ensureUser(id, username) {
  // Inert PIN — never matches password_verify.
  const inertHash = "$2y$12$INERT_NOT_A_REAL_HASH______________________________________";
  await db.query(
    `INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'inert', 'user', 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [id, username, username, inertHash]
  );
}

async function ensurePlan() {
  await db.query(
    `INSERT IGNORE INTO plans (id, code, name, price_inr, billing_interval, is_active)
     VALUES (9991, 'TEST_PHASE1', 'Phase 1 Webhook Test', 199.00, 'monthly', 1)`
  );
}

async function seedOrder(userId, orderId, amountPaise) {
  const [subRes] = await db.query(
    `INSERT INTO subscriptions
       (user_id, plan_id, status, provider, provider_order_id, current_period_start, created_at, updated_at)
     VALUES (?, 9991, 'pending', 'razorpay', ?, NOW(), NOW(), NOW())`,
    [userId, orderId]
  );
  const subId = subRes.insertId;
  await db.query(
    `INSERT INTO payments
       (user_id, subscription_id, amount_inr, currency, expected_amount_paise,
        status, provider, provider_order_id, created_at, updated_at)
     VALUES (?, ?, ?, 'INR', ?, 'created', 'razorpay', ?, NOW(), NOW())`,
    [userId, subId, (amountPaise / 100).toFixed(2), amountPaise, orderId]
  );
  return { subId };
}

async function cleanup(orderIds) {
  if (orderIds.length === 0) return;
  await db.query("SET FOREIGN_KEY_CHECKS=0");
  for (const oid of orderIds) {
    await db.query(`DELETE FROM webhook_events WHERE payload_json LIKE ?`, [`%${oid}%`]);
    await db.query(`DELETE FROM payments WHERE provider_order_id = ?`, [oid]);
    await db.query(`DELETE FROM subscriptions WHERE provider_order_id = ?`, [oid]);
  }
  await db.query("SET FOREIGN_KEY_CHECKS=1");
}

// ─── webhook caller ─────────────────────────────────────────────────────────
function buildPayload({ orderId, paymentId, amount, currency = "INR", event = "payment.captured" }) {
  const resolvedPaymentId = paymentId ?? `pay_${orderId}`;
  const body = {
    event,
    payload: {
      payment: {
        entity: { id: resolvedPaymentId, order_id: orderId, amount, currency },
      },
    },
  };
  return JSON.stringify(body);
}

async function postWebhook({ raw, signature, eventId }) {
  const r = await fetch(`${BASE}/api/payments/razorpay/webhook.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Razorpay-Signature": signature,
      "X-Razorpay-Event-Id": eventId,
    },
    body: raw,
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

// ─── per-test ──────────────────────────────────────────────────────────────
const SEEDED_ORDERS = [];
const USER_A = `wha_${Date.now()}`;
const USER_B = `whb_${Date.now()}`;

async function setUp() {
  await ensurePlan();
  await ensureUser(USER_A, USER_A);
  await ensureUser(USER_B, USER_B);
}

// 5 — valid webhook activates correct subscription
async function test5_happy() {
  const orderId = `order_phase1_happy_${Date.now()}`;
  SEEDED_ORDERS.push(orderId);
  await seedOrder(USER_A, orderId, 19900);

  const raw = buildPayload({ orderId, amount: 19900 });
  const sig = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  const r = await postWebhook({ raw, signature: sig, eventId: `evt_happy_${Date.now()}` });

  if (r.status !== 200 || !r.json?.data?.processed) {
    fail("5 valid webhook activates subscription", `status=${r.status} json=${JSON.stringify(r.json)}`);
    return;
  }
  const [rows] = await db.query(`SELECT status, user_id FROM subscriptions WHERE provider_order_id = ?`, [orderId]);
  if (rows[0]?.status === "active" && rows[0]?.user_id === USER_A) {
    ok("5 valid webhook activates subscription");
  } else {
    fail("5 valid webhook activates subscription", `sub row=${JSON.stringify(rows[0])}`);
  }
}

// 6 — duplicate event_id is idempotent
async function test6_idempotent() {
  const orderId = `order_phase1_idem_${Date.now()}`;
  SEEDED_ORDERS.push(orderId);
  await seedOrder(USER_A, orderId, 19900);

  const raw = buildPayload({ orderId, amount: 19900 });
  const sig = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  const eventId = `evt_idem_${Date.now()}`;

  const first  = await postWebhook({ raw, signature: sig, eventId });
  const second = await postWebhook({ raw, signature: sig, eventId });

  if (first.status === 200 && second.status === 200 && second.json?.data?.idempotent === true) {
    ok("6 duplicate event_id is idempotent");
  } else {
    fail("6 duplicate event_id is idempotent", `first=${first.status} second=${second.status}/${JSON.stringify(second.json)}`);
  }

  const [evt] = await db.query(`SELECT COUNT(*) c FROM webhook_events WHERE event_id = ?`, [eventId]);
  if (evt[0]?.c === 1) ok("   webhook_events has exactly one row for the event_id");
  else fail("   webhook_events row count", `c=${evt[0]?.c}`);
}

// 7 — wrong signature returns 401
async function test7_bad_signature() {
  const orderId = `order_phase1_sig_${Date.now()}`;
  SEEDED_ORDERS.push(orderId);
  await seedOrder(USER_A, orderId, 19900);

  const raw = buildPayload({ orderId, amount: 19900 });
  const r = await postWebhook({ raw, signature: "DEADBEEF", eventId: `evt_sig_${Date.now()}` });
  if (r.status === 401 && r.json?.code === "INVALID_SIGNATURE") {
    ok("7 wrong signature returns 401");
  } else {
    fail("7 wrong signature returns 401", `status=${r.status} json=${JSON.stringify(r.json)}`);
  }
  const [rows] = await db.query(`SELECT status FROM subscriptions WHERE provider_order_id = ?`, [orderId]);
  if (rows[0]?.status === "pending") ok("   subscription remains pending after bad signature");
  else fail("   subscription remained pending", `status=${rows[0]?.status}`);
}

// 8 — correct order_id, wrong amount → AMOUNT_MISMATCH
async function test8_amount_mismatch() {
  const orderId = `order_phase1_amount_${Date.now()}`;
  SEEDED_ORDERS.push(orderId);
  await seedOrder(USER_A, orderId, 19900);

  const raw = buildPayload({ orderId, amount: 9900 });  // off by ₹100
  const sig = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  const r = await postWebhook({ raw, signature: sig, eventId: `evt_amount_${Date.now()}` });

  if (r.status === 400 && r.json?.code === "AMOUNT_MISMATCH") {
    ok("8 amount mismatch returns 400 AMOUNT_MISMATCH");
  } else {
    fail("8 amount mismatch returns 400 AMOUNT_MISMATCH", `status=${r.status} json=${JSON.stringify(r.json)}`);
  }
  const [rows] = await db.query(`SELECT status FROM subscriptions WHERE provider_order_id = ?`, [orderId]);
  if (rows[0]?.status === "pending") ok("   subscription remains pending after amount mismatch");
  else fail("   subscription remained pending", `status=${rows[0]?.status}`);

  // Audit log must record the mismatch
  try {
    const [aud] = await db.query(
      `SELECT COUNT(*) c FROM audit_logs WHERE action_key = 'PAYMENT_WEBHOOK_AMOUNT_MISMATCH' AND entity_id IN (SELECT id FROM payments WHERE provider_order_id = ?)`,
      [orderId]
    );
    if (aud[0]?.c >= 1) ok("   audit_logs has PAYMENT_WEBHOOK_AMOUNT_MISMATCH");
    else fail("   audit_logs has PAYMENT_WEBHOOK_AMOUNT_MISMATCH", `c=${aud[0]?.c}`);
  } catch (e) {
    fail("   audit_logs query", e.message + " (audit_logs table may be missing — see Phase 1 known issue 2)");
  }
}

// 9 — webhook payload claims wrong user, but row attribution stays with the OWNING user_id
async function test9_cross_user_safe() {
  const orderId = `order_phase1_xuser_${Date.now()}`;
  SEEDED_ORDERS.push(orderId);
  // Seed the order against USER_A. Even if a webhook arrives claiming USER_B
  // in notes, the row attribution must remain USER_A.
  await seedOrder(USER_A, orderId, 19900);

  const body = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_phase1_xuser",
          order_id: orderId,
          amount: 19900,
          currency: "INR",
          notes: { userId: USER_B }, // spoof
        },
      },
    },
  };
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
  const r = await postWebhook({ raw, signature: sig, eventId: `evt_xuser_${Date.now()}` });

  if (r.status !== 200) {
    fail("9 cross-user webhook processed cleanly", `status=${r.status} json=${JSON.stringify(r.json)}`);
    return;
  }
  const [sub] = await db.query(`SELECT user_id, status FROM subscriptions WHERE provider_order_id = ?`, [orderId]);
  const [pay] = await db.query(`SELECT user_id FROM payments WHERE provider_order_id = ?`, [orderId]);
  if (sub[0]?.user_id === USER_A && pay[0]?.user_id === USER_A) {
    ok("9 cross-user spoof: subscription + payment remain attributed to owner");
  } else {
    fail("9 cross-user spoof: ownership preserved", `sub=${sub[0]?.user_id} pay=${pay[0]?.user_id}`);
  }
}

// ─── driver ────────────────────────────────────────────────────────────────
(async () => {
  try {
    await setUp();
    await test5_happy();
    await test6_idempotent();
    await test7_bad_signature();
    await test8_amount_mismatch();
    await test9_cross_user_safe();
  } catch (e) {
    fail("driver", e.message);
  } finally {
    await cleanup(SEEDED_ORDERS).catch(() => {});
    await db.end();
  }

  console.log(`\n${failed === 0 ? "ALL PASS" : `${failed} FAIL(S)`}`);
  process.exit(failed === 0 ? 0 : 1);
})();
