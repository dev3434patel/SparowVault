/**
 * Local development provider. This is not a licensed Account Aggregator.
 * A licensed provider is still required for production.
 *
 * Off unless AA_LOCAL_PROVIDER=true.
 * URL: http://127.0.0.1:8791
 * Names: AA_BASE_URL, AA_CLIENT_ID, AA_CLIENT_SECRET
 */
import { AA_CONFIGURATION_MESSAGE } from "./config";
import { AA_PATHS } from "./paths";

export interface LocalAaRequest {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  headers: Record<string, string>;
}

export interface LocalAaResponse {
  status: number;
  body: unknown;
}

const FIXTURE_ACCOUNT = {
  FIType: "DEPOSIT",
  accType: "SAVINGS",
  accRefNumber: "local-acc-1",
  maskedAccNumber: "XXXX9042",
  fipId: "FIP-LOCAL",
};

/** Fixed rupee strings. Paise: 12500, 25000, 7550. Provider balance 432100 paise is not an opening balance. */
const FIXTURE_TRANSACTIONS = [
  {
    txnId: "LOC-D1",
    type: "DEBIT",
    mode: "UPI",
    amount: "125.00",
    narration: "LOCAL UPI STORE",
    transactionTimestamp: "2026-03-04T09:30:00+05:30",
    valueDate: "2026-03-04",
    reference: "LOCAL-UTR-1",
  },
  {
    txnId: "LOC-C1",
    type: "CREDIT",
    mode: "NEFT",
    amount: "250.00",
    narration: "LOCAL NEFT CREDIT",
    transactionTimestamp: "2026-03-05T14:00:00+05:30",
    valueDate: "2026-03-05",
    reference: "LOCAL-NEFT-1",
  },
  {
    txnId: "LOC-D2",
    type: "DEBIT",
    mode: "UPI",
    amount: "75.50",
    narration: "LOCAL UPI TEA",
    transactionTimestamp: "2026-03-06T08:10:00+05:30",
    valueDate: "2026-03-06",
    reference: "LOCAL-UTR-2",
  },
];

interface ConsentRecord {
  handle: string;
  consentId: string;
  approved: boolean;
  sessionId: string;
  index: number;
}

function sameText(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length === right.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    mismatch |= leftCode ^ rightCode;
  }
  return mismatch === 0;
}

function header(headers: Record<string, string>, name: string): string {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value.trim();
  }
  return "";
}

function stamp(txnid: string): { ver: string; timestamp: string; txnid: string } {
  return { ver: "2.0.0", timestamp: "2026-03-04T00:00:00.000Z", txnid };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function containsEncryptedMarker(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== "object" || depth > 6) return false;
  if (Array.isArray(value)) return value.some((item) => containsEncryptedMarker(item, depth + 1));
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (key === "KeyMaterial" || key === "keyMaterial" || key === "encryptedFI" || key === "EncryptedFI") return true;
    if (containsEncryptedMarker(item, depth + 1)) return true;
  }
  return false;
}

function redactText(value: string, clientId: string, clientSecret: string): string {
  let next = value;
  if (clientSecret) next = next.split(clientSecret).join("[redacted]");
  if (clientId) next = next.split(clientId).join("[redacted]");
  return next;
}

function redact(value: unknown, clientId: string, clientSecret: string): unknown {
  if (typeof value === "string") return redactText(value, clientId, clientSecret);
  if (Array.isArray(value)) return value.map((item) => redact(item, clientId, clientSecret));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[redactText(key, clientId, clientSecret)] = redact(item, clientId, clientSecret);
  }
  return out;
}

function rejected(status: number, message: string): LocalAaResponse {
  return { status, body: { message } };
}

export function createLocalAaProvider(options: {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}): { handle(request: LocalAaRequest): LocalAaResponse } {
  const clientId = options.clientId.trim();
  const clientSecret = options.clientSecret.trim();
  const enabled = options.enabled && clientId !== "" && clientSecret !== "";
  const consents = new Map<string, ConsentRecord>();
  const consentsById = new Map<string, ConsentRecord>();
  const sessions = new Set<string>();
  let consentSeq = 0;

  function route(request: LocalAaRequest): LocalAaResponse {
    const path = request.path;
    if (request.method === "POST" && path === AA_PATHS.discover) {
      if (!asRecord(request.body)) {
        return rejected(400, "Account Aggregator request body was not JSON. Nothing was imported.");
      }
      return {
        status: 200,
        body: {
          ...stamp("local-discover-1"),
          DiscoveredAccounts: [FIXTURE_ACCOUNT],
        },
      };
    }
    if (request.method === "POST" && path === AA_PATHS.link) {
      return {
        status: 200,
        body: {
          ...stamp("local-link-txn"),
          AccLinkDetails: [{
            linkRefNumber: "local-link-1",
            accRefNumber: FIXTURE_ACCOUNT.accRefNumber,
            status: "LINKED",
          }],
        },
      };
    }
    if (request.method === "POST" && path === AA_PATHS.linkVerify) {
      const record = asRecord(request.body);
      const token = record && typeof record.token === "string" ? record.token.trim() : "";
      if (!token) return rejected(400, "Enter the link code. Nothing was imported.");
      return {
        status: 200,
        body: {
          ...stamp("local-verify-txn"),
          AccLinkDetails: [{
            linkRefNumber: "local-link-1",
            accRefNumber: FIXTURE_ACCOUNT.accRefNumber,
            status: "LINKED",
          }],
        },
      };
    }
    if (request.method === "POST" && path === AA_PATHS.consent) {
      if (!asRecord(request.body)) {
        return rejected(400, "Account Aggregator request body was not JSON. Nothing was imported.");
      }
      consentSeq += 1;
      const record: ConsentRecord = {
        handle: `local-consent-${consentSeq}`,
        consentId: `local-cid-${consentSeq}`,
        approved: false,
        sessionId: "",
        index: consentSeq,
      };
      consents.set(record.handle, record);
      consentsById.set(record.consentId, record);
      return { status: 200, body: { ...stamp("local-consent-txn"), ConsentHandle: record.handle } };
    }
    if (request.method === "POST" && path === AA_PATHS.localConsentStatus) {
      const record = asRecord(request.body);
      const handle = record && typeof record.consentHandle === "string" ? record.consentHandle.trim() : "";
      const status = record && typeof record.status === "string" ? record.status.trim().toLowerCase() : "";
      const consent = consents.get(handle);
      if (!consent) return rejected(404, "Consent handle was not found. Nothing was imported.");
      if (status !== "approved") {
        return rejected(400, "Consent stays pending until status is approved. Nothing was imported.");
      }
      consent.approved = true;
      return { status: 200, body: { consentHandle: consent.handle, status: "approved" } };
    }
    const consentMatch = /^\/Consent\/handle\/([A-Za-z0-9_-]{1,80})$/.exec(path);
    if (request.method === "GET" && consentMatch) {
      const consent = consents.get(consentMatch[1]);
      if (!consent) return rejected(404, "Consent handle was not found. Nothing was imported.");
      return {
        status: 200,
        body: {
          ...stamp("local-status-txn"),
          ConsentStatus: {
            id: consent.approved ? consent.consentId : "",
            status: consent.approved ? "ACTIVE" : "PENDING",
          },
        },
      };
    }
    if (request.method === "POST" && path === AA_PATHS.fiRequest) {
      if (containsEncryptedMarker(request.body)) {
        return rejected(400, "The provider returned encrypted financial information. SparowVault does not decrypt Account Aggregator payloads. A licensed FIU key is required, and nothing was imported.");
      }
      const record = asRecord(request.body);
      const consentNode = asRecord(record?.Consent);
      const consentId = consentNode && typeof consentNode.id === "string" ? consentNode.id.trim() : "";
      const consent = consentsById.get(consentId);
      if (!consent || !consent.approved) {
        return rejected(400, "Consent status is not approved. Nothing was imported.");
      }
      if (!consent.sessionId) {
        consent.sessionId = `local-fi-${consent.index}`;
        sessions.add(consent.sessionId);
      }
      return { status: 200, body: { ...stamp("local-fi-request"), sessionId: consent.sessionId } };
    }
    const fetchMatch = /^\/FI\/fetch\/([A-Za-z0-9_-]{1,80})$/.exec(path);
    if (request.method === "GET" && fetchMatch) {
      if (!sessions.has(fetchMatch[1])) {
        return rejected(404, "Financial-information session was not found. Nothing was imported.");
      }
      return {
        status: 200,
        body: {
          ...stamp("local-fi-fetch"),
          FI: [{
            fipID: FIXTURE_ACCOUNT.fipId,
            data: {
              account: {
                maskedAccNumber: FIXTURE_ACCOUNT.maskedAccNumber,
                Summary: { currentBalance: "4321.00" },
                Transactions: { Transaction: FIXTURE_TRANSACTIONS },
              },
            },
          }],
        },
      };
    }
    return rejected(404, "That Account Aggregator path is not available. Nothing was imported.");
  }

  return {
    handle(request) {
      if (!enabled) {
        return { status: 424, body: { message: AA_CONFIGURATION_MESSAGE } };
      }
      const presentedId = header(request.headers, "client_id");
      const presentedSecret = header(request.headers, "client_api_key");
      const idOk = sameText(presentedId, clientId);
      const secretOk = sameText(presentedSecret, clientSecret);
      if (!idOk || !secretOk) {
        return rejected(401, "Account Aggregator rejected the request (401). Nothing was imported.");
      }
      const response = route(request);
      return { status: response.status, body: redact(response.body, clientId, clientSecret) };
    },
  };
}
