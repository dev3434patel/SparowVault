/**
 * Two isolated HTTP clients against sparowvault_test only.
 * Refuses any other database before PHP starts.
 */
import { spawn } from "node:child_process";
import net from "node:net";

const dbName = process.env.DB_NAME || process.env.TEST_DB_NAME || "";
if (dbName !== "sparowvault_test") {
  console.error(JSON.stringify({ pass: false, reason: "database is not sparowvault_test", dbName }));
  process.exit(2);
}
if (!String(process.env.AUDIT_RUN_SENTINEL || "").trim()) {
  console.error(JSON.stringify({ pass: false, reason: "sentinel missing" }));
  process.exit(2);
}

const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.listen(0, "127.0.0.1", () => {
    const chosen = server.address().port;
    server.close(() => resolve(chosen));
  });
  server.on("error", reject);
});

const php = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", ".", "php/dev-router.php"], {
  env: {
    ...process.env,
    APP_ENV: "test",
    DB_NAME: "sparowvault_test",
    ENABLE_RAZORPAY: "false",
  },
  stdio: "ignore",
});
const base = `http://127.0.0.1:${port}`;

function stop() {
  php.kill();
}

async function call(path, { method = "GET", body, cookie, csrf, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  if (csrf) headers["X-CSRF-Token"] = csrf;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { parsed = null; }
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  return { status: res.status, parsed, cookie: setCookie.map((line) => line.split(";")[0]).join("; ") };
}

try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const health = await call("/api/health.php");
      if (health.status === 200 && health.parsed?.data?.status === "healthy") { ready = true; break; }
    } catch { /* booting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) throw new Error("disposable server did not become healthy");

  const policies = await call("/api/policies/current.php");
  const versions = policies.parsed?.data?.versions;
  if (!versions?.terms || !versions?.privacy) throw new Error("policies missing");

  async function register(username) {
    const result = await call("/api/auth/register.php", {
      method: "POST",
      body: {
        username,
        displayName: username,
        pin: "583921",
        policyAcceptances: [
          { key: "terms", version: versions.terms },
          { key: "privacy", version: versions.privacy },
        ],
      },
    });
    if (!result.parsed?.ok) throw new Error(`register ${username} failed ${result.status}`);
    return {
      userId: result.parsed.data.user.id,
      token: result.parsed.data.token,
      csrf: result.parsed.data.csrfToken,
      cookie: result.cookie,
    };
  }

  const stamp = Date.now().toString(36);
  const alice = await register(`svclosea${stamp}`.slice(0, 24));
  const bob = await register(`svcloseb${stamp}`.slice(0, 24));
  const aliceAgain = await call("/api/auth/login.php", {
    method: "POST",
    body: { username: `svclosea${stamp}`.slice(0, 24), pin: "583921" },
  });
  if (!aliceAgain.parsed?.ok) throw new Error("second alice login failed");

  const accountId = `svclose-acct-${stamp}`;
  const privateId = `svclose-priv-${stamp}`;
  const householdId = `svclose-house-${stamp}`;
  const now = new Date().toISOString();
  function row(id, extra) {
    return { id, userId: alice.userId, createdAt: now, updatedAt: now, version: 1, isDeleted: 0, tags: [], notes: "", ...extra };
  }
  const push = await call("/api/cloud/sync/push.php", {
    method: "POST",
    cookie: alice.cookie,
    csrf: alice.csrf,
    token: alice.token,
    body: {
      mutationId: `svclose-push-${stamp}`,
      collections: {
        accounts: [
          row(accountId, { name: "Shared cash", type: "cash", openingBalance: 0, openingBalancePaise: 0, icon: "wallet", color: "#22c55e", isInactive: 0 }),
          row(privateId, { name: "Private cash", type: "cash", openingBalance: 0, openingBalancePaise: 0, icon: "wallet", color: "#111111", isInactive: 0 }),
        ],
        households: [row(householdId, { name: "Close household", defaultCurrency: "INR" })],
      },
    },
  });
  if (push.status !== 200 || !push.parsed?.ok) throw new Error(`alice push failed ${push.status} ${push.parsed?.error || ""}`);

  const bobPull = await call("/api/cloud/sync/pull.php", { cookie: bob.cookie, csrf: bob.csrf, token: bob.token });
  const bobAccounts = bobPull.parsed?.data?.collections?.accounts ?? [];
  if (bobAccounts.some((item) => item.id === accountId || item.id === privateId)) throw new Error("bob sync pull saw alice accounts");

  const aliceSecond = {
    userId: aliceAgain.parsed.data.user.id,
    token: aliceAgain.parsed.data.token,
    csrf: aliceAgain.parsed.data.csrfToken,
    cookie: aliceAgain.cookie,
  };
  const alicePull = await call("/api/cloud/sync/pull.php", { cookie: aliceSecond.cookie, csrf: aliceSecond.csrf, token: aliceSecond.token });
  const aliceAccounts = alicePull.parsed?.data?.collections?.accounts ?? [];
  if (!aliceAccounts.some((item) => item.id === accountId)) throw new Error("second alice client did not receive the pushed account");

  const issued = await call("/api/personal/household.php", {
    method: "POST",
    cookie: alice.cookie,
    csrf: alice.csrf,
    token: alice.token,
    body: {
      action: "issue",
      householdId,
      role: "viewer",
      resourceScope: [{ collection: "accounts", entityId: accountId }],
    },
  });
  const tokenCode = issued.parsed?.data?.token;
  if (!tokenCode || issued.parsed?.data?.copiedBooks !== false) throw new Error(`invite issue failed ${issued.status}`);

  const accepted = await call("/api/personal/household.php", {
    method: "POST",
    cookie: bob.cookie,
    csrf: bob.csrf,
    token: bob.token,
    body: { action: "accept", token: tokenCode, userId: alice.userId },
  });
  if (accepted.parsed?.data?.role !== "viewer" || accepted.parsed?.data?.copiedBooks !== false) throw new Error(`accept failed ${accepted.status} ${accepted.parsed?.error || ""}`);

  const listed = await call("/api/personal/household.php", { cookie: bob.cookie, csrf: bob.csrf, token: bob.token });
  const resources = listed.parsed?.data?.asGrantee?.[0]?.resources ?? [];
  const ids = resources.map((item) => item.entityId);
  if (!ids.includes(accountId) || ids.includes(privateId)) throw new Error("grant projection leaked or missed a record");

  const grant = listed.parsed?.data?.asGrantee?.[0];
  const denied = await call("/api/personal/household.php", {
    method: "POST",
    cookie: bob.cookie,
    csrf: bob.csrf,
    token: bob.token,
    body: {
      action: "write",
      grantId: grant.grantId,
      collection: "accounts",
      entityId: accountId,
      expectedRevision: grant.revision,
      mutationId: `svclose-view-${stamp}`,
      patch: { name: "Viewer must not rename this" },
    },
  });
  if (denied.parsed?.code !== "VIEWER_DENIED") throw new Error(`viewer write code ${denied.parsed?.code || denied.status}`);

  const revoked = await call("/api/personal/household.php", {
    method: "POST",
    cookie: alice.cookie,
    csrf: alice.csrf,
    token: alice.token,
    body: { action: "revoke", grantId: grant.grantId },
  });
  if (revoked.parsed?.data?.revoked !== true) throw new Error(`revoke failed ${revoked.status}`);
  const afterRevoke = await call("/api/personal/household.php", { cookie: bob.cookie, csrf: bob.csrf, token: bob.token });
  if ((afterRevoke.parsed?.data?.asGrantee ?? []).some((item) => item.grantId === grant.grantId)) {
    throw new Error("revoked grant still projected");
  }

  const replay = await call("/api/personal/household.php", {
    method: "POST",
    cookie: bob.cookie,
    csrf: bob.csrf,
    token: bob.token,
    body: { action: "accept", token: tokenCode },
  });
  if (replay.parsed?.code !== "TOKEN_USED") throw new Error(`replay code ${replay.parsed?.code || replay.status}`);

  console.log(JSON.stringify({
    pass: true,
    database: "sparowvault_test",
    secondClientSawAccount: true,
    otherUserSyncDenied: true,
    grantProjection: "shared-only",
    viewerWrite: "VIEWER_DENIED",
    revokeHidesProjection: true,
    inviteReplay: "TOKEN_USED",
  }));
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: String(error.message || error) }));
  stop();
  process.exit(1);
}
stop();
