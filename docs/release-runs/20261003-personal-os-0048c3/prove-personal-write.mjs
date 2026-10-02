/**
 * Login plus one synthetic Personal account write/read.
 * Refuses any database other than sparowvault_test before it calls the API.
 */
const base = process.env.BASE_URL || "http://127.0.0.1:5000";
const dbName = process.env.DB_NAME || process.env.TEST_DB_NAME || "";
if (dbName !== "sparowvault_test") {
  console.error(JSON.stringify({ pass: false, reason: "database is not sparowvault_test", dbName }));
  process.exit(2);
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
  const cookieHeader = setCookie.map((line) => line.split(";")[0]).join("; ");
  return { status: res.status, parsed, cookieHeader, bytes: Buffer.byteLength(text) };
}

const health = await call("/api/health.php");
const healthz = await call("/api/healthz.php");
const policies = await call("/api/policies/current.php");
const versions = policies.parsed?.data?.versions;
if (!versions?.terms || !versions?.privacy) {
  console.error(JSON.stringify({ pass: false, step: "policies", status: policies.status }));
  process.exit(1);
}

const username = "rp01synth";
const pin = "583921";
let auth = await call("/api/auth/login.php", { method: "POST", body: { username, pin } });
if (!auth.parsed?.ok) {
  auth = await call("/api/auth/register.php", {
    method: "POST",
    body: {
      username,
      displayName: "RP01 Synthetic",
      pin,
      policyAcceptances: [
        { key: "terms", version: versions.terms },
        { key: "privacy", version: versions.privacy },
      ],
    },
  });
}
if (!auth.parsed?.ok) {
  console.error(JSON.stringify({
    pass: false,
    step: "login",
    status: auth.status,
    error: auth.parsed?.error ?? null,
  }));
  process.exit(1);
}

const userId = auth.parsed.data?.user?.id;
const token = auth.parsed.data?.token;
const csrf = auth.parsed.data?.csrfToken;
const cookie = auth.cookieHeader;
const entityId = `rp01-cash-${Date.now()}`;
const write = await call("/api/data/entity.php?collection=accounts", {
  method: "POST",
  cookie,
  csrf,
  token,
  body: {
    userId,
    mutationId: `rp01:${entityId}`,
    data: {
      id: entityId,
      name: "RP01 Synthetic Cash",
      type: "cash",
      openingBalance: 0,
      openingBalancePaise: 0,
      icon: "wallet",
      color: "#22c55e",
      isInactive: 0,
    },
  },
});
const read = await call(`/api/data/entity-item.php?collection=accounts&id=${encodeURIComponent(entityId)}`, {
  cookie,
  csrf,
  token,
});
const readName = read.parsed?.data?.name ?? read.parsed?.data?.item?.name ?? null;
const pass = health.status === 200
  && health.parsed?.data?.status === "healthy"
  && !("companyTables" in (health.parsed?.data ?? {}))
  && write.status === 201
  && read.status === 200
  && readName === "RP01 Synthetic Cash";

console.log(JSON.stringify({
  pass,
  database: dbName,
  appEnv: process.env.APP_ENV || null,
  health: { status: health.status, dataStatus: health.parsed?.data?.status ?? null, checks: health.parsed?.data?.checks ?? null },
  healthz: { status: healthz.status, dataStatus: healthz.parsed?.data?.status ?? null, service: healthz.parsed?.data?.service ?? null },
  login: { status: auth.status, userIdPresent: Boolean(userId), bearerPresent: Boolean(token) },
  write: { status: write.status, error: write.parsed?.error ?? null },
  read: { status: read.status, name: readName },
}, null, 2));
process.exit(pass ? 0 : 1);
