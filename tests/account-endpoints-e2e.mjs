/**
 * Phase 1 — Data export + account delete e2e.
 *
 * Covers gate checks 10-14:
 *   10. Authenticated user can export their own data only.
 *   11. User cannot export another user's data (no endpoint accepts a foreign userId).
 *   12. Account deletion requires PIN re-entry.
 *   13. Account deletion writes an audit log row.
 *   14. Deleted user cannot login afterwards.
 *
 * Approach: register two real users via /api/cloud/register, push a row each
 * into cloud_collection_rows, then exercise the new endpoints. All cleanup
 * happens at the end against the test DB.
 *
 * Requirements:
 *   - PHP API server reachable at $BASE_URL (default http://localhost:4000)
 *   - $TEST_DB_NAME contains the substring "test" or "cert"
 *
 * Usage:
 *   BASE_URL=http://localhost:4000 \
 *   TEST_DB_HOST=localhost TEST_DB_USER=root TEST_DB_PASS=… TEST_DB_NAME=sparowvault_test \
 *   node tests/account-endpoints-e2e.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:4000";
if (!/(test|cert)/i.test(process.env.TEST_DB_NAME ?? "")) {
  console.error("TEST_DB_NAME must contain 'test' or 'cert'.");
  process.exit(2);
}

let failed = 0;
function ok(name, extra = "") { console.log(`  PASS  ${name}${extra ? ` -- ${extra}` : ""}`); }
function fail(name, extra = "") { console.log(`  FAIL  ${name}${extra ? ` -- ${extra}` : ""}`); failed++; }

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
const A = { username: `phase1a_${stamp}`, displayName: "Phase1 A", pin: "583921" };
const B = { username: `phase1b_${stamp}`, displayName: "Phase1 B", pin: "674532" };

async function cleanup() {
  await db.query("SET FOREIGN_KEY_CHECKS=0");
  for (const u of [A.username, B.username]) {
    await db.query(`DELETE FROM users WHERE username = ?`, [u]);
  }
  await db.query(`DELETE FROM api_rate_limits WHERE bucket_key LIKE 'account_delete|%' OR bucket_key LIKE 'auth_%|%'`);
  await db.query("SET FOREIGN_KEY_CHECKS=1");
}

async function register(u) {
  const policies = await req("GET", "/api/policies/current.php");
  const versions = policies.json?.data?.versions ?? {};
  const policyAcceptances = ["terms", "privacy"].map((key) => ({ key, version: versions[key] }));
  const r = await req("POST", "/api/cloud/register.php", { body: { ...u, policyAcceptances } });
  if (r.status !== 201) throw new Error("register failed: " + JSON.stringify(r));
  return { token: r.json.data.token, id: r.json.data.user.id };
}

async function login(u) {
  return req("POST", "/api/cloud/login.php", { body: { username: u.username, pin: u.pin } });
}

async function pushOne(token, payload) {
  return req("POST", "/api/cloud/sync/push.php", {
    token,
    body: { collections: { categories: [payload] } },
  });
}

(async () => {
  try {
    await cleanup();
    const a = await register(A);
    const b = await register(B);

    // Seed one row owned by each user
    await pushOne(a.token, {
      id: `cat_a_${stamp}`,
      userId: a.id,
      name: "Phase1 A",
      type: "expense",
      color: "#ef4444",
      icon: "shield",
    });
    await pushOne(b.token, {
      id: `cat_b_${stamp}`,
      userId: b.id,
      name: "Phase1 B",
      type: "expense",
      color: "#22c55e",
      icon: "shield",
    });

    // 10 — export own data only
    const exportA = await req("POST", "/api/auth/data-export.php", {
      token: a.token,
      body: { pin: A.pin },
    });
    if (exportA.status === 200 && exportA.json?.data?.user?.username === A.username) {
      ok("10 own-data export returns 200 + own profile");
      const txs = exportA.json?.data?.collections?.categories ?? [];
      const seesOwn   = txs.some((t) => t.entityId === `cat_a_${stamp}`);
      const leaksB    = txs.some((t) => t.entityId === `cat_b_${stamp}`);
      if (seesOwn && !leaksB) ok("   export contains user A's row only");
      else fail("   export isolation", `seesOwn=${seesOwn} leaksB=${leaksB}`);
    } else {
      fail("10 own-data export", `status=${exportA.status} json=${JSON.stringify(exportA.json)}`);
    }

    // 11 — there is NO endpoint that takes a foreign userId. Confirm the
    // export endpoint ignores any client-supplied user identifier and always
    // returns the JWT subject's data.
    const tryWithFakeId = await req("POST", "/api/auth/data-export.php", {
      token: a.token,
      body: { pin: A.pin, userId: b.id },
    });
    if (tryWithFakeId.status === 200 && tryWithFakeId.json?.data?.user?.username === A.username) {
      ok("11 user cannot export another user's data");
    } else if (tryWithFakeId.status >= 400) {
      ok("11 user cannot export another user's data (endpoint rejected the foreign id)");
    } else {
      fail("11 cross-user export", `unexpected response: ${JSON.stringify(tryWithFakeId.json)}`);
    }

    // 12 — delete without PIN → 401
    const delNoPin = await req("DELETE", "/api/auth/account.php", { token: a.token, body: {} });
    if (delNoPin.status === 401 && delNoPin.json?.code === "PIN_REQUIRED") {
      ok("12 delete without PIN returns 401 PIN_REQUIRED");
    } else {
      fail("12 delete without PIN", `status=${delNoPin.status} json=${JSON.stringify(delNoPin.json)}`);
    }
    const delWrongPin = await req("DELETE", "/api/auth/account.php", { token: a.token, body: { pin: "583922" } });
    if (delWrongPin.status === 401 && delWrongPin.json?.code === "PIN_REQUIRED") {
      ok("   delete with wrong PIN returns 401 PIN_REQUIRED");
    } else {
      fail("   delete with wrong PIN", `status=${delWrongPin.status} json=${JSON.stringify(delWrongPin.json)}`);
    }

    // 13 — delete with correct PIN succeeds and writes audit log
    const delGood = await req("DELETE", "/api/auth/account.php", { token: a.token, body: { pin: A.pin } });
    if (delGood.status === 200 && delGood.json?.data?.deleted === true) {
      ok("13 delete with correct PIN returns 200 deleted:true");
    } else {
      fail("13 delete with correct PIN", `status=${delGood.status} json=${JSON.stringify(delGood.json)}`);
    }

    try {
      const [aud] = await db.query(
        `SELECT COUNT(*) c FROM audit_logs WHERE action_key = 'ACCOUNT_DELETED' AND actor_user_id = ?`,
        [a.id]
      );
      if (aud[0]?.c >= 1) ok("   audit_logs has ACCOUNT_DELETED row");
      else fail("   audit_logs has ACCOUNT_DELETED row", `c=${aud[0]?.c}`);
    } catch (e) {
      fail("   audit_logs query", e.message + " (table may be missing — Phase 1 known issue 2)");
    }

    // 14 — deleted user cannot log in
    const loginAgain = await login(A);
    if (loginAgain.status === 401 || loginAgain.status === 403) {
      ok(`14 deleted user cannot login (${loginAgain.status})`);
    } else {
      fail("14 deleted user cannot login", `status=${loginAgain.status} json=${JSON.stringify(loginAgain.json)}`);
    }

    // bonus — me with the deleted user's old token must also be denied
    const meAfter = await req("GET", "/api/auth/me.php", { token: a.token });
    if (meAfter.status === 401 || meAfter.status === 403) {
      ok("   /me with old JWT denied after delete");
    } else {
      fail("   /me with old JWT denied after delete", `status=${meAfter.status}`);
    }

    // User B should still work
    const meB = await req("GET", "/api/auth/me.php", { token: b.token });
    if (meB.status === 200) ok("   sibling user B unaffected");
    else fail("   sibling user B unaffected", `status=${meB.status}`);
  } catch (e) {
    fail("driver", e.message);
  } finally {
    await cleanup().catch(() => {});
    await db.end();
  }

  console.log(`\n${failed === 0 ? "ALL PASS" : `${failed} FAIL(S)`}`);
  process.exit(failed === 0 ? 0 : 1);
})();
