import crypto from "node:crypto";
import mysql from "mysql2/promise";

const BASE = process.env.BASE_URL ?? "http://localhost:4000";
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
const ORDER_ID = `order_replay_test_${Date.now()}`;
const PAYMENT_ID = `pay_replay_test_${Date.now()}`;

if (!SECRET) {
  console.error("RAZORPAY_WEBHOOK_SECRET is required for webhook replay test.");
  process.exit(2);
}

const payload = {
  event: "payment.captured",
  payload: {
    payment: {
      entity: {
        id: PAYMENT_ID,
        order_id: ORDER_ID,
        amount: 19900,
        currency: "INR",
      },
    },
  },
};

const raw = JSON.stringify(payload);
const signature = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");

async function callWebhook(eventId) {
  const res = await fetch(`${BASE}/api/payments/razorpay/webhook.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Razorpay-Signature": signature,
      "X-Razorpay-Event-Id": eventId,
    },
    body: raw,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function seedOrder() {
  const database = process.env.TEST_DB_NAME || process.env.DB_NAME;
  if (!database || !/(test|cert)/i.test(database)) {
    throw new Error("TEST_DB_NAME/DB_NAME must point to a test or certification database for webhook replay seeding.");
  }
  const db = await mysql.createConnection({
    host: process.env.TEST_DB_HOST || process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306),
    user: process.env.TEST_DB_USER || process.env.DB_USER || "root",
    password: process.env.TEST_DB_PASS || process.env.DB_PASS || "",
    database,
  });
  try {
    const userId = `replay_user_${Date.now()}`;
    const inertHash = "$2y$12$INERT_NOT_A_REAL_HASH______________________________________";
    await db.query(
      `INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
       VALUES (?, ?, 'Replay User', ?, 'inert', 'user', 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [userId, userId, inertHash],
    );
    await db.query(
      `INSERT IGNORE INTO plans (id, code, name, price_inr, billing_interval, is_active)
       VALUES (9992, 'TEST_REPLAY', 'Webhook Replay Test', 199.00, 'monthly', 1)`,
    );
    const [sub] = await db.query(
      `INSERT INTO subscriptions
         (user_id, plan_id, status, provider, provider_order_id, current_period_start, created_at, updated_at)
       VALUES (?, 9992, 'pending', 'razorpay', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [userId, ORDER_ID],
    );
    await db.query(
      `INSERT INTO payments
         (user_id, subscription_id, amount_inr, currency, expected_amount_paise, status, provider, provider_order_id, created_at, updated_at)
       VALUES (?, ?, '199.00', 'INR', 19900, 'created', 'razorpay', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [userId, sub.insertId, ORDER_ID],
    );
  } finally {
    await db.end();
  }
}

async function run() {
  await seedOrder();
  const eventId = `evt_replay_${Date.now()}`;
  const first = await callWebhook(eventId);
  const second = await callWebhook(eventId);

  if (first.status !== 200) {
    console.error("First webhook call failed", first);
    process.exit(1);
  }
  if (second.status !== 200 || second.body?.data?.idempotent !== true) {
    console.error("Replay webhook did not return idempotent response", second);
    process.exit(1);
  }

  console.log("PASS webhook replay idempotency");
}

run().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});

