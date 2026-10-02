import { describe, expect, it, vi } from "vitest";
import { AA_LOCAL_BASE_URL, AA_LOCAL_PROVIDER_LABEL, aaLocalProviderEnabled, readAaOperatorConfig } from "@/services/aa/config";
import { approveLocalAaConsent, discoverAccounts, linkAccounts, readAaConsentStatus, requestAaConsent } from "@/services/aa/flow";
import type { AaHttp } from "@/services/aa/http";
import { createLocalAaProvider } from "@/services/aa/localProvider";
import { AA_PATHS } from "@/services/aa/paths";
import { confirmAaReview, fetchAaTransactions, mapFiToReview, type AaExistingTransaction } from "@/services/aa/review";

const SECRET = "test-secret";

const gate = readAaOperatorConfig({
  AA_BASE_URL: "https://aa.test.example/gateway",
  AA_CLIENT_ID: "test-client",
  AA_CLIENT_SECRET: SECRET,
});

const discoverBody = {
  ver: "2.0.0",
  txnid: "disc-1",
  DiscoveredAccounts: [{
    FIType: "DEPOSIT",
    accType: "SAVINGS",
    accRefNumber: "acc-ref-1",
    maskedAccNumber: "XXXX4321",
    fipId: "FIP-TEST",
  }],
};

const linkBody = {
  ver: "2.0.0",
  txnid: "link-1",
  AccLinkDetails: [{ linkRefNumber: "link-1", accRefNumber: "acc-ref-1", status: "LINKED" }],
};

const consentBody = { ConsentHandle: "consent-handle-1" };
const statusBody = { ConsentStatus: { id: "consent-1", status: "ACTIVE" } };
const fiRequestBody = { sessionId: "fi-session-1" };

const fiFetchBody = {
  ver: "2.0.0",
  txnid: "txn-fi",
  FI: [{
    fipID: "FIP-TEST",
    data: {
      account: {
        maskedAccNumber: "XXXX4321",
        Summary: { currentBalance: "99999.00" },
        Transactions: {
          Transaction: [
            {
              txnId: "D1",
              type: "DEBIT",
              mode: "UPI",
              amount: "150.50",
              narration: "UPI GROCERY",
              transactionTimestamp: "2026-03-02T10:15:00+05:30",
              valueDate: "2026-03-02",
              reference: "UTR1",
            },
            {
              txnId: "C1",
              type: "CREDIT",
              mode: "NEFT",
              amount: "5000.00",
              narration: "NEFT CREDIT",
              transactionTimestamp: "2026-03-03T11:00:00+05:30",
              valueDate: "2026-03-03",
              reference: "NEFT1",
            },
          ],
        },
      },
    },
  }],
};

function scripted(overrides: Record<string, { status: number; body: unknown } | Error> = {}) {
  const calls: string[] = [];
  const bodies: unknown[] = [];
  const steps: Record<string, { status: number; body: unknown } | Error> = {
    [AA_PATHS.discover]: { status: 200, body: discoverBody },
    [AA_PATHS.link]: { status: 200, body: linkBody },
    [AA_PATHS.consent]: { status: 200, body: consentBody },
    "/Consent/handle": { status: 200, body: statusBody },
    [AA_PATHS.fiRequest]: { status: 200, body: fiRequestBody },
    "/FI/fetch": { status: 200, body: fiFetchBody },
    ...overrides,
  };
  const http: AaHttp = async (request) => {
    calls.push(request.path);
    bodies.push(request.body);
    const key = request.path.startsWith("/Consent/handle/")
      ? "/Consent/handle"
      : request.path.startsWith("/FI/fetch/")
        ? "/FI/fetch"
        : request.path;
    const step = steps[key];
    if (!step) throw new Error(`unexpected ${request.path}`);
    if (step instanceof Error) throw step;
    return step;
  };
  return { http, calls, bodies };
}

function books() {
  const transactions: Array<AaExistingTransaction & { id: string; notes: string; amountPaise: number; type: string }> = [];
  const sources: Array<{ id: string; userId: string; kind: string; notes: string; name: string; lastImportAt?: string }> = [];
  return {
    transactions,
    sources,
    saveSource: async (input: { userId: string; data: { name: string; kind: "aa_ready"; notes: string } }) => {
      const row = { id: `src-${sources.length + 1}`, userId: input.userId, ...input.data };
      sources.push(row);
      return row;
    },
    createTransaction: vi.fn(async (input: { userId: string; data: { amountPaise: number; type: string; notes: string; date: string; amount: number } }) => {
      const row = { id: `txn-${transactions.length + 1}`, userId: input.userId, ...input.data };
      transactions.push(row);
      return row;
    }),
  };
}

async function pullReview(
  http: AaHttp,
  store: ReturnType<typeof books>,
  existingTransactions: AaExistingTransaction[] = store.transactions,
) {
  if (!gate.ready) throw new Error("fixture gate should be ready");
  const accounts = await discoverAccounts(gate, http, { customerId: "user@aa" });
  const linked = await linkAccounts(gate, http, { customerId: "user@aa", account: accounts[0] });
  const consent = await requestAaConsent(gate, http, {
    customerId: "user@aa",
    account: accounts[0],
    linkRefNumber: linked.linkRefNumber,
    from: "2026-03-01",
    to: "2026-03-31",
  });
  const status = await readAaConsentStatus(gate, http, consent.consentHandle);
  return fetchAaTransactions(gate, http, {
    userId: "u1",
    consentId: status.consentId,
    from: "2026-03-01",
    to: "2026-03-31",
    maskedAccount: accounts[0].maskedAccNumber,
    existingTransactions,
    existingSources: store.sources,
    saveSource: store.saveSource,
  });
}

describe("account aggregator consent and FI review", () => {
  it("creates nothing when operator config is missing", async () => {
    const closed = readAaOperatorConfig({});
    const insecure = readAaOperatorConfig({
      AA_BASE_URL: "http://aa.test.example",
      AA_CLIENT_ID: "test-client",
      AA_CLIENT_SECRET: SECRET,
    });
    const { http, calls } = scripted();
    const store = books();
    expect(closed.ready).toBe(false);
    expect(insecure.ready).toBe(false);
    if (closed.ready || insecure.ready) throw new Error("config should be closed");
    expect(closed.message).not.toContain(SECRET);
    expect(insecure.message).not.toContain(SECRET);
    await expect(discoverAccounts(closed, http, { customerId: "user@aa" })).rejects.toThrow(/not configured/i);
    await expect(discoverAccounts(insecure, http, { customerId: "user@aa" })).rejects.toThrow(/https/i);
    expect(calls).toEqual([]);
    expect(store.transactions).toEqual([]);
    expect(store.sources).toEqual([]);
    expect(store.createTransaction).not.toHaveBeenCalled();
  });

  it("turns a fixture FI payload into a review list and does not post it", async () => {
    const { http, bodies } = scripted();
    const store = books();
    const existing: AaExistingTransaction = {
      id: "old-debit",
      date: "2026-03-02",
      type: "expense",
      amount: 150.5,
      amountPaise: 15050,
      notes: "",
    };
    const fetched = await pullReview(http, store, [existing]);
    const credit = fetched.review.rows.find((row) => row.direction === "credit");
    const debit = fetched.review.rows.find((row) => row.direction === "debit");
    expect(fetched.review.rows).toHaveLength(2);
    expect(fetched.review.fiSessionId).toBe("fi-session-1");
    expect(fetched.review.providerBalancePaise).toBe(9_999_900);
    expect(credit?.purpose).toBe("");
    expect(credit?.include).toBe(false);
    expect(credit?.amountPaise).toBe(500_000);
    expect(debit?.duplicateOfTransactionId).toBe("old-debit");
    expect(debit?.include).toBe(false);
    expect(store.sources).toHaveLength(1);
    expect(store.sources[0].kind).toBe("aa_ready");
    expect(store.sources[0].notes).toContain("pending_review");
    expect(store.sources[0].notes).toContain("providerBalanceIgnored");
    expect(store.createTransaction).not.toHaveBeenCalled();
    expect(JSON.stringify(bodies)).not.toContain(SECRET);
    expect(() => mapFiToReview({
      body: { KeyMaterial: { cryptoAlg: "ECDH" } },
      fiSessionId: "fi-session-1",
      consentId: "consent-1",
      maskedAccount: "XXXX4321",
      existingTransactions: [],
    })).toThrow(/licensed FIU key/i);
  });

  it("posts the confirmed paise once and leaves the credit unposted", async () => {
    const { http } = scripted();
    const store = books();
    const fetched = await pullReview(http, store);
    const debit = fetched.review.rows.find((row) => row.providerTxnId === "D1");
    const credit = fetched.review.rows.find((row) => row.providerTxnId === "C1");
    if (!debit || !credit) throw new Error("fixture rows missing");
    await expect(confirmAaReview({
      userId: "u1",
      accountId: "acc-personal",
      review: fetched.review,
      sourceId: fetched.sourceId,
      decisions: {
        [debit.id]: { include: true, purpose: "expense" },
        [credit.id]: { include: true, purpose: "" },
      },
      existingTransactions: store.transactions,
      createTransaction: store.createTransaction,
    })).rejects.toThrow(/not income/i);
    expect(store.createTransaction).not.toHaveBeenCalled();

    const posted = await confirmAaReview({
      userId: "u1",
      accountId: "acc-personal",
      review: fetched.review,
      sourceId: fetched.sourceId,
      decisions: {
        [debit.id]: { include: true, purpose: "expense" },
        [credit.id]: { include: false, purpose: "" },
      },
      existingTransactions: store.transactions,
      createTransaction: store.createTransaction,
      updateSource: async (id, patch) => {
        const source = store.sources.find((row) => row.id === id);
        if (source && patch.notes) source.notes = patch.notes;
        if (source && patch.lastImportAt) source.lastImportAt = patch.lastImportAt;
      },
    });
    expect(posted.postedIds).toEqual(["txn-1"]);
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0].amountPaise).toBe(15_050);
    expect(store.transactions[0].type).toBe("expense");
    expect(store.transactions[0].amountPaise).not.toBe(fetched.review.providerBalancePaise);
    expect(store.transactions.some((row) => row.type === "income")).toBe(false);

    const again = await confirmAaReview({
      userId: "u1",
      accountId: "acc-personal",
      review: fetched.review,
      decisions: {
        [debit.id]: { include: true, purpose: "expense" },
        [credit.id]: { include: false, purpose: "" },
      },
      existingTransactions: store.transactions,
      createTransaction: store.createTransaction,
    });
    expect(again.postedIds).toEqual([]);
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0].amountPaise).toBe(15_050);
    expect(store.transactions.some((row) => row.type === "income")).toBe(false);
  });

  it("does not duplicate a second fetch of the same FI session", async () => {
    const first = scripted();
    const store = books();
    const fetched = await pullReview(first.http, store);
    const debit = fetched.review.rows.find((row) => row.providerTxnId === "D1");
    const credit = fetched.review.rows.find((row) => row.providerTxnId === "C1");
    if (!debit || !credit) throw new Error("fixture rows missing");
    await confirmAaReview({
      userId: "u1",
      accountId: "acc-personal",
      review: fetched.review,
      sourceId: fetched.sourceId,
      decisions: {
        [debit.id]: { include: true, purpose: "expense" },
        [credit.id]: { include: false, purpose: "" },
      },
      existingTransactions: [],
      createTransaction: store.createTransaction,
      updateSource: async (id, patch) => {
        const source = store.sources.find((row) => row.id === id);
        if (source && patch.notes) source.notes = patch.notes;
      },
    });

    const second = scripted();
    const again = await fetchAaTransactions(gate, second.http, {
      userId: "u1",
      consentId: "consent-1",
      from: "2026-03-01",
      to: "2026-03-31",
      maskedAccount: "XXXX4321",
      existingTransactions: store.transactions,
      existingSources: store.sources,
      saveSource: async () => {
        throw new Error("second fetch must not create another import source");
      },
    });
    expect(again.staged).toBe(false);
    expect(again.review.fiSessionId).toBe("fi-session-1");
    expect(again.review.rows.find((row) => row.providerTxnId === "D1")?.alreadyPosted).toBe(true);
    const debitAgain = again.review.rows.find((row) => row.providerTxnId === "D1");
    const creditAgain = again.review.rows.find((row) => row.providerTxnId === "C1");
    if (!debitAgain || !creditAgain) throw new Error("second review missing rows");
    const repost = await confirmAaReview({
      userId: "u1",
      accountId: "acc-personal",
      review: again.review,
      sourceId: again.sourceId,
      decisions: {
        [debitAgain.id]: { include: true, purpose: "expense" },
        [creditAgain.id]: { include: false, purpose: "" },
      },
      existingTransactions: store.transactions,
      createTransaction: store.createTransaction,
    });
    expect(repost.postedIds).toEqual([]);
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0].amountPaise).toBe(15_050);
    expect(store.sources).toHaveLength(1);
  });

  it("stops on a provider 4xx or a timeout and writes nothing", async () => {
    const rejected = scripted({ [AA_PATHS.consent]: { status: 400, body: { message: "Invalid consent" } } });
    const store = books();
    await expect(pullReview(rejected.http, store)).rejects.toThrow(/rejected the request \(400\)/i);
    expect(rejected.calls).not.toContain(AA_PATHS.fiRequest);
    expect(store.sources).toEqual([]);
    expect(store.transactions).toEqual([]);

    const timedOut = scripted({
      [AA_PATHS.consent]: Object.assign(new Error("socket timed out"), { code: "AA_TIMEOUT" }),
    });
    await expect(pullReview(timedOut.http, store)).rejects.toThrow(/timed out/i);
    expect(timedOut.calls).not.toContain(AA_PATHS.fiRequest);
    expect(store.sources).toEqual([]);
    expect(store.createTransaction).not.toHaveBeenCalled();
  });
});

function localHttp(
  provider: ReturnType<typeof createLocalAaProvider>,
  credentials: { clientId: string; clientSecret: string } = { clientId: "test-client", clientSecret: SECRET },
) {
  const calls: string[] = [];
  const bodies: unknown[] = [];
  const responses: unknown[] = [];
  const http: AaHttp = async (request) => {
    calls.push(request.path);
    bodies.push(request.body);
    const response = provider.handle({
      method: request.method,
      path: request.path,
      body: request.body,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        client_id: credentials.clientId,
        client_api_key: credentials.clientSecret,
      },
    });
    responses.push(response.body);
    return { status: response.status, body: response.body };
  };
  return { http, calls, bodies, responses };
}

describe("local development provider", () => {
  it("stays fail-closed unless AA_LOCAL_PROVIDER is on", async () => {
    expect(aaLocalProviderEnabled(undefined)).toBe(false);
    expect(aaLocalProviderEnabled("false")).toBe(false);
    expect(aaLocalProviderEnabled("true")).toBe(true);
    const closed = readAaOperatorConfig({
      AA_BASE_URL: AA_LOCAL_BASE_URL,
      AA_CLIENT_ID: "test-client",
      AA_CLIENT_SECRET: SECRET,
    });
    const wrongHost = readAaOperatorConfig({
      AA_LOCAL_PROVIDER: "true",
      AA_BASE_URL: "http://aa.test.example",
      AA_CLIENT_ID: "test-client",
      AA_CLIENT_SECRET: SECRET,
    });
    const wrongPort = readAaOperatorConfig({
      AA_LOCAL_PROVIDER: "true",
      AA_BASE_URL: "http://127.0.0.1:8792",
      AA_CLIENT_ID: "test-client",
      AA_CLIENT_SECRET: SECRET,
    });
    expect(closed.ready).toBe(false);
    expect(wrongHost.ready).toBe(false);
    expect(wrongPort.ready).toBe(false);
    if (!closed.ready) expect(closed.message).not.toContain(SECRET);
    const off = createLocalAaProvider({ enabled: false, clientId: "test-client", clientSecret: SECRET });
    const { http, calls } = localHttp(off);
    const store = books();
    await expect(discoverAccounts(closed, http, { customerId: "user@aa" })).rejects.toThrow(/https/i);
    expect(calls).toEqual([]);
    const denied = off.handle({
      method: "POST",
      path: AA_PATHS.discover,
      body: { Customer: { id: SECRET } },
      headers: { client_id: "test-client", client_api_key: SECRET },
    });
    expect(denied.status).toBe(424);
    expect(JSON.stringify(denied.body)).not.toContain(SECRET);
    expect(store.transactions).toEqual([]);
    expect(store.createTransaction).not.toHaveBeenCalled();
  });

  it("reviews fixture rows only after approved consent and posts them once", async () => {
    const localGate = readAaOperatorConfig({
      AA_LOCAL_PROVIDER: "true",
      AA_BASE_URL: AA_LOCAL_BASE_URL,
      AA_CLIENT_ID: "test-client",
      AA_CLIENT_SECRET: SECRET,
    });
    expect(localGate.ready).toBe(true);
    if (!localGate.ready || localGate.mode !== "operator") throw new Error("local gate should be ready");
    expect(localGate.operator.baseUrl).toBe(AA_LOCAL_BASE_URL);
    expect(localGate.operator.clientSecret).not.toBe("");
    expect(AA_LOCAL_PROVIDER_LABEL).toContain("A licensed provider is still required for production.");

    const provider = createLocalAaProvider({ enabled: true, clientId: "test-client", clientSecret: SECRET });
    const wire = localHttp(provider);
    const store = books();
    const personalAccount = { openingBalancePaise: 250_000, openingBalance: 2500 };

    const badWire = localHttp(provider, { clientId: "test-client", clientSecret: "other-secret" });
    await expect(discoverAccounts(localGate, badWire.http, { customerId: "user@aa" })).rejects.toThrow(/401/);
    expect(JSON.stringify(badWire.responses)).not.toContain(SECRET);
    expect(JSON.stringify(badWire.responses)).not.toContain("other-secret");

    const accounts = await discoverAccounts(localGate, wire.http, { customerId: "user@aa" });
    expect(accounts).toHaveLength(1);
    expect(accounts[0].fiType).toBe("DEPOSIT");
    expect(accounts[0].maskedAccNumber).toBe("XXXX9042");
    const linked = await linkAccounts(localGate, wire.http, { customerId: "user@aa", account: accounts[0] });
    expect(linked.linked).toBe(true);
    const consent = await requestAaConsent(localGate, wire.http, {
      customerId: "user@aa",
      account: accounts[0],
      linkRefNumber: linked.linkRefNumber,
      from: "2026-03-01",
      to: "2026-03-31",
    });
    await expect(readAaConsentStatus(localGate, wire.http, consent.consentHandle)).rejects.toThrow(/PENDING/);
    const earlyFetch = provider.handle({
      method: "POST",
      path: AA_PATHS.fiRequest,
      body: { Consent: { id: "local-cid-1" } },
      headers: { client_id: "test-client", client_api_key: SECRET },
    });
    expect(earlyFetch.status).toBe(400);
    const stillPending = provider.handle({
      method: "POST",
      path: AA_PATHS.localConsentStatus,
      body: { consentHandle: consent.consentHandle, status: "active" },
      headers: { client_id: "test-client", client_api_key: SECRET },
    });
    expect(stillPending.status).toBe(400);
    expect(store.sources).toEqual([]);
    expect(store.createTransaction).not.toHaveBeenCalled();

    await approveLocalAaConsent(localGate, wire.http, consent.consentHandle);
    const status = await readAaConsentStatus(localGate, wire.http, consent.consentHandle);
    expect(status.status).toBe("ACTIVE");
    const fetched = await fetchAaTransactions(localGate, wire.http, {
      userId: "u1",
      consentId: status.consentId,
      from: "2026-03-01",
      to: "2026-03-31",
      maskedAccount: accounts[0].maskedAccNumber,
      existingTransactions: store.transactions,
      existingSources: store.sources,
      saveSource: store.saveSource,
    });
    expect(fetched.staged).toBe(true);
    expect(fetched.review.rows.map((row) => row.amountPaise)).toEqual([12_500, 25_000, 7_550]);
    expect(fetched.review.providerBalancePaise).toBe(432_100);
    expect(fetched.review.providerBalancePaise).not.toBe(personalAccount.openingBalancePaise);
    const credit = fetched.review.rows.find((row) => row.direction === "credit");
    const debits = fetched.review.rows.filter((row) => row.direction === "debit");
    if (!credit || debits.length !== 2) throw new Error("fixture rows missing");
    expect(credit.purpose).toBe("");
    expect(credit.include).toBe(false);
    expect(store.sources[0].notes).toContain("providerBalanceIgnored");
    expect(store.createTransaction).not.toHaveBeenCalled();
    expect(JSON.stringify(wire.bodies)).not.toContain(SECRET);
    expect(JSON.stringify(wire.responses)).not.toMatch(/KeyMaterial|encryptedFI/);
    expect(personalAccount.openingBalancePaise).toBe(250_000);

    await expect(confirmAaReview({
      userId: "u1",
      accountId: "acc-personal",
      review: fetched.review,
      sourceId: fetched.sourceId,
      decisions: {
        [debits[0].id]: { include: true, purpose: "expense" },
        [credit.id]: { include: true, purpose: "" },
        [debits[1].id]: { include: true, purpose: "expense" },
      },
      existingTransactions: store.transactions,
      createTransaction: store.createTransaction,
    })).rejects.toThrow(/not income/i);
    expect(store.transactions).toEqual([]);
    expect(personalAccount.openingBalancePaise).toBe(250_000);

    const posted = await confirmAaReview({
      userId: "u1",
      accountId: "acc-personal",
      review: fetched.review,
      sourceId: fetched.sourceId,
      decisions: {
        [debits[0].id]: { include: true, purpose: "expense" },
        [credit.id]: { include: false, purpose: "" },
        [debits[1].id]: { include: true, purpose: "expense" },
      },
      existingTransactions: store.transactions,
      createTransaction: store.createTransaction,
      updateSource: async (id, patch) => {
        const source = store.sources.find((row) => row.id === id);
        if (source && patch.notes) source.notes = patch.notes;
      },
    });
    expect(posted.postedIds).toEqual(["txn-1", "txn-2"]);
    expect(store.transactions.map((row) => row.amountPaise)).toEqual([12_500, 7_550]);
    expect(store.transactions.every((row) => row.type === "expense")).toBe(true);
    expect(store.transactions.some((row) => row.type === "income")).toBe(false);
    expect(store.transactions.some((row) => row.amountPaise === fetched.review.providerBalancePaise)).toBe(false);
    expect(personalAccount.openingBalancePaise).toBe(250_000);

    const again = await fetchAaTransactions(localGate, wire.http, {
      userId: "u1",
      consentId: status.consentId,
      from: "2026-03-01",
      to: "2026-03-31",
      maskedAccount: accounts[0].maskedAccNumber,
      existingTransactions: store.transactions,
      existingSources: store.sources,
      saveSource: async () => {
        throw new Error("second fetch must not create another import source");
      },
    });
    expect(again.staged).toBe(false);
    expect(again.review.fiSessionId).toBe(fetched.review.fiSessionId);
    expect(again.review.rows.find((row) => row.providerTxnId === "LOC-D1")?.alreadyPosted).toBe(true);
    expect(again.review.rows.find((row) => row.providerTxnId === "LOC-D2")?.alreadyPosted).toBe(true);
    const creditAgain = again.review.rows.find((row) => row.providerTxnId === "LOC-C1");
    const debitAgain = again.review.rows.filter((row) => row.direction === "debit");
    if (!creditAgain || debitAgain.length !== 2) throw new Error("second review missing rows");
    const repost = await confirmAaReview({
      userId: "u1",
      accountId: "acc-personal",
      review: again.review,
      decisions: {
        [debitAgain[0].id]: { include: true, purpose: "expense" },
        [creditAgain.id]: { include: false, purpose: "" },
        [debitAgain[1].id]: { include: true, purpose: "expense" },
      },
      existingTransactions: store.transactions,
      createTransaction: store.createTransaction,
    });
    expect(repost.postedIds).toEqual([]);
    expect(store.transactions).toHaveLength(2);
    expect(store.sources).toHaveLength(1);
    expect(store.transactions.some((row) => row.type === "income")).toBe(false);
    expect(personalAccount.openingBalancePaise).toBe(250_000);
    expect(personalAccount.openingBalance).toBe(2500);
  });

  it("rejects encrypted payloads and writes nothing", async () => {
    const provider = createLocalAaProvider({ enabled: true, clientId: "test-client", clientSecret: SECRET });
    const encrypted = provider.handle({
      method: "POST",
      path: AA_PATHS.fiRequest,
      body: { Consent: { id: "local-cid-1" }, KeyMaterial: { cryptoAlg: "ECDH" } },
      headers: { client_id: "test-client", client_api_key: SECRET },
    });
    expect(encrypted.status).toBe(400);
    expect(JSON.stringify(encrypted.body)).toMatch(/licensed FIU key/i);
    expect(JSON.stringify(encrypted.body)).not.toContain(SECRET);
    const fetched = provider.handle({
      method: "GET",
      path: "/FI/fetch/local-fi-1",
      headers: { client_id: "test-client", client_api_key: SECRET },
    });
    expect(fetched.status).toBe(404);
    expect(() => mapFiToReview({
      body: { KeyMaterial: { cryptoAlg: "ECDH" }, encryptedFI: "ciphertext" },
      fiSessionId: "local-fi-1",
      consentId: "local-cid-1",
      maskedAccount: "XXXX9042",
      existingTransactions: [],
    })).toThrow(/licensed FIU key/i);
  });
});
