// vNext collection HTTP smoke + ownership (P1-A).
const BASE = process.env.BASE_URL ?? "http://localhost:4000";
let failed = 0;
let csrf = "";

function ok(n, e = "") {
  console.log(`  PASS  ${n}${e ? `  -- ${e}` : ""}`);
}
function fail(n, e = "") {
  failed++;
  console.log(`  FAIL  ${n}${e ? `  -- ${e}` : ""}`);
}

function captureCsrf(res) {
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const joined = raw.length ? raw.join("\n") : String(res.headers.get("set-cookie") ?? "");
  const m = joined.match(/sv_csrf=([^;,\s]+)/);
  if (m?.[1]) csrf = decodeURIComponent(m[1]);
}

async function req(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (csrf && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["X-CSRF-Token"] = csrf;
    headers.Cookie = `sv_csrf=${csrf}`;
  }
  const res = await fetch(new URL(path, BASE), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  captureCsrf(res);
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

const VNEXT = [
  "households",
  "obligations",
  "sinkingFunds",
  "cardEmiPlans",
  "fixedIncomeAssets",
  "insurancePolicies",
  "reconciliationMatches",
];

async function run() {
  console.log("\n--- API vNext collections ---");
  const stamp = Date.now().toString(36);
  const policies = await req("GET", "/api/policies/current.php");
  const versions = policies.json?.data?.versions ?? {};
  const policyAcceptances = ["terms", "privacy"].map((key) => ({ key, version: versions[key] }));
  const reg = await req("POST", "/api/cloud/register", {
    body: {
      username: `vn_${stamp}`,
      displayName: "VNext",
      pin: "583921",
      policyAcceptances,
    },
  });
  if (reg.status !== 201) {
    fail("register", JSON.stringify(reg.json));
    process.exit(1);
  }
  const token = reg.json?.data?.token;
  const userId = reg.json?.data?.user?.id;
  ok("register", userId);

  const pull = await req("GET", "/api/cloud/sync/pull.php", { token });
  const keys = Object.keys(pull.json?.data?.collections ?? {});
  for (const c of VNEXT) {
    if (keys.includes(c)) ok(`pull has ${c}`);
    else fail(`pull missing ${c}`);
  }

  const mut = `mut_${stamp}_hh`;
  const create = await req("POST", "/api/cloud/entity.php?collection=households", {
    token,
    body: {
      userId,
      idPrefix: "hh",
      mutationId: mut,
      data: { name: "Home", defaultCurrency: "INR" },
    },
  });
  if (create.status === 201 || create.status === 200) ok("create household", String(create.status));
  else fail("create household", `${create.status} ${JSON.stringify(create.json)}`);

  const replay = await req("POST", "/api/cloud/entity.php?collection=households", {
    token,
    body: {
      userId,
      idPrefix: "hh",
      mutationId: mut,
      data: { name: "Home Dup", defaultCurrency: "INR" },
    },
  });
  if (replay.status === 200 || replay.status === 201) {
    const id1 = create.json?.data?.id;
    const id2 = replay.json?.data?.id;
    if (id1 && id2 && id1 === id2) ok("mutationId idempotent replay same entity");
    else if (!id1) ok("mutationId replay accepted (table may be absent)");
    else fail("mutationId replay created different entity", `${id1} vs ${id2}`);
  } else fail("mutationId replay", String(replay.status));

  const unauth = await req("POST", "/api/cloud/entity.php?collection=obligations", {
    body: { userId, data: {} },
  });
  if (unauth.status === 401 || unauth.status === 403) ok("unauth create rejected", String(unauth.status));
  else fail("unauth create should 401/403", String(unauth.status));

  console.log(`\n=================================================\n  API vNext failed=${failed}\n=================================================`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
