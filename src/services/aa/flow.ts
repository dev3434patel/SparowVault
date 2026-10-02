import { dataConsumerId, type AaGate } from "@/services/aa/config";
import { AaClosedError } from "@/services/aa/errors";
import { aaCall, type AaHttp } from "@/services/aa/http";
import { AA_PATHS, consentHandlePath } from "@/services/aa/paths";

export interface AaDiscoveredAccount {
  accRefNumber: string;
  maskedAccNumber: string;
  fipId: string;
  fiType: string;
  accType: string;
}

export interface AaLinkResult {
  linked: boolean;
  linkRefNumber: string;
  refNumber: string;
}

export interface AaConsentRequestResult {
  consentHandle: string;
}

export interface AaConsentStatus {
  status: string;
  consentId: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stamp(): { ver: string; timestamp: string; txnid: string } {
  return { ver: "2.0.0", timestamp: new Date().toISOString(), txnid: crypto.randomUUID() };
}

function requireCustomer(customerId: string): string {
  const id = customerId.trim();
  if (!id || id.length > 80) {
    throw new AaClosedError("invalid_payload", "Enter the Account Aggregator customer id. Nothing was imported.");
  }
  return id;
}

function requireId(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value.trim())) {
    throw new AaClosedError("invalid_payload", `The provider returned an unusable ${label}. Nothing was imported.`);
  }
  return value.trim();
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export async function discoverAccounts(
  gate: AaGate,
  http: AaHttp,
  input: { customerId: string; fiTypes?: string[] },
): Promise<AaDiscoveredAccount[]> {
  const customerId = requireCustomer(input.customerId);
  const body = await aaCall(gate, http, {
    method: "POST",
    path: AA_PATHS.discover,
    body: {
      ...stamp(),
      Customer: { id: customerId },
      FITypes: input.fiTypes?.length ? input.fiTypes : ["DEPOSIT"],
    },
  });
  const record = asRecord(body);
  const raw = record?.DiscoveredAccounts ?? record?.discoveredAccounts;
  if (!Array.isArray(raw)) {
    throw new AaClosedError("invalid_payload", "The provider did not return discovered accounts. Nothing was imported.");
  }
  return raw.map((item) => {
    const row = asRecord(item);
    if (!row) {
      throw new AaClosedError("invalid_payload", "The provider returned an unusable discovered account. Nothing was imported.");
    }
    const account: AaDiscoveredAccount = {
      accRefNumber: readString(row, ["accRefNumber", "accRef"]),
      maskedAccNumber: readString(row, ["maskedAccNumber", "maskedAccountNumber"]),
      fipId: readString(row, ["fipId", "fipID", "FIPId"]),
      fiType: readString(row, ["FIType", "fiType"]) || "DEPOSIT",
      accType: readString(row, ["accType", "accountType"]) || "SAVINGS",
    };
    if (!account.accRefNumber || !account.maskedAccNumber || !account.fipId) {
      throw new AaClosedError("invalid_payload", "A discovered account was missing its masked reference. Nothing was imported.");
    }
    return account;
  });
}

export async function linkAccounts(
  gate: AaGate,
  http: AaHttp,
  input: { customerId: string; account: AaDiscoveredAccount },
): Promise<AaLinkResult> {
  const customerId = requireCustomer(input.customerId);
  const body = await aaCall(gate, http, {
    method: "POST",
    path: AA_PATHS.link,
    body: {
      ...stamp(),
      Customer: { id: customerId },
      FIPDetails: [{
        fipId: input.account.fipId,
        Accounts: [{
          accRefNumber: input.account.accRefNumber,
          maskedAccNumber: input.account.maskedAccNumber,
          FIType: input.account.fiType,
          accType: input.account.accType,
        }],
      }],
    },
  });
  return readLinkResult(body);
}

export async function verifyAccountLink(
  gate: AaGate,
  http: AaHttp,
  input: { refNumber: string; token: string },
): Promise<AaLinkResult> {
  const refNumber = requireId(input.refNumber, "link reference");
  const token = input.token.trim();
  if (!token || token.length > 12) {
    throw new AaClosedError("invalid_payload", "Enter the link code from your Account Aggregator app. Nothing was imported.");
  }
  const body = await aaCall(gate, http, {
    method: "POST",
    path: AA_PATHS.linkVerify,
    body: { ...stamp(), RefNumber: refNumber, token },
  });
  const result = readLinkResult(body);
  if (!result.linked) {
    throw new AaClosedError("invalid_payload", "The provider did not confirm the account link. Nothing was imported.");
  }
  return result;
}

function readLinkResult(body: unknown): AaLinkResult {
  const record = asRecord(body);
  if (!record) {
    throw new AaClosedError("invalid_payload", "The provider returned an unusable link response. Nothing was imported.");
  }
  const details = record.AccLinkDetails ?? record.accLinkDetails;
  const first = Array.isArray(details) ? asRecord(details[0]) : null;
  const linkRefNumber = first ? readString(first, ["linkRefNumber", "linkRef"]) : readString(record, ["linkRefNumber"]);
  const refNumber = readString(record, ["RefNumber", "refNumber"]);
  if (linkRefNumber) {
    return { linked: true, linkRefNumber: requireId(linkRefNumber, "link reference"), refNumber };
  }
  if (refNumber) {
    return { linked: false, linkRefNumber: "", refNumber: requireId(refNumber, "link reference") };
  }
  throw new AaClosedError("invalid_payload", "The provider did not return a link reference. Nothing was imported.");
}

export async function requestAaConsent(
  gate: AaGate,
  http: AaHttp,
  input: {
    customerId: string;
    account: AaDiscoveredAccount;
    linkRefNumber: string;
    from: string;
    to: string;
  },
): Promise<AaConsentRequestResult> {
  const customerId = requireCustomer(input.customerId);
  const linkRefNumber = requireId(input.linkRefNumber, "link reference");
  const range = dateRange(input.from, input.to);
  const body = await aaCall(gate, http, {
    method: "POST",
    path: AA_PATHS.consent,
    body: {
      ...stamp(),
      ConsentDetail: {
        consentStart: new Date().toISOString(),
        consentExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        consentMode: "VIEW",
        fetchType: "ONETIME",
        consentTypes: ["TRANSACTIONS"],
        fiTypes: [input.account.fiType || "DEPOSIT"],
        DataConsumer: { id: dataConsumerId(gate), type: "FIU" },
        Customer: { id: customerId },
        Purpose: {
          code: "102",
          refUri: "https://api.rebit.org.in/aa/purpose/102.xml",
          text: "Personal spending review",
          Category: { type: "Personal Finance" },
        },
        FIDataRange: range,
        DataLife: { unit: "DAY", value: 1 },
        Frequency: { unit: "MONTH", value: 1 },
        Accounts: [{
          fiType: input.account.fiType,
          fipId: input.account.fipId,
          accType: input.account.accType,
          accRefNumber: input.account.accRefNumber,
          maskedAccNumber: input.account.maskedAccNumber,
          linkRefNumber,
        }],
      },
    },
  });
  const record = asRecord(body);
  const handle = record ? readString(record, ["ConsentHandle", "consentHandle"]) : "";
  return { consentHandle: requireId(handle, "consent handle") };
}

export async function readAaConsentStatus(
  gate: AaGate,
  http: AaHttp,
  consentHandle: string,
): Promise<AaConsentStatus> {
  const handle = requireId(consentHandle, "consent handle");
  const body = await aaCall(gate, http, { method: "GET", path: consentHandlePath(handle) });
  const record = asRecord(body);
  const nested = asRecord(record?.ConsentStatus ?? record?.consentStatus) ?? record;
  if (!nested) {
    throw new AaClosedError("invalid_payload", "The provider did not return a consent status. Nothing was imported.");
  }
  const status = readString(nested, ["status", "Status"]).toUpperCase();
  const consentId = readString(nested, ["id", "consentId", "ConsentId"]);
  if (!status) {
    throw new AaClosedError("invalid_payload", "The provider did not return a consent status. Nothing was imported.");
  }
  if (status !== "ACTIVE") {
    throw new AaClosedError(
      "consent_not_active",
      `Consent status is ${status}. Nothing was imported.`,
    );
  }
  if (!consentId) {
    throw new AaClosedError("invalid_payload", "Active consent did not include a consent id. Nothing was imported.");
  }
  return { status, consentId: requireId(consentId, "consent id") };
}

/** Sets the local development provider consent to approved. A licensed provider does not use this path. */
export async function approveLocalAaConsent(
  gate: AaGate,
  http: AaHttp,
  consentHandle: string,
): Promise<void> {
  const handle = requireId(consentHandle, "consent handle");
  await aaCall(gate, http, {
    method: "POST",
    path: AA_PATHS.localConsentStatus,
    body: { consentHandle: handle, status: "approved" },
  });
}

export function dateRange(from: string, to: string): { from: string; to: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    throw new AaClosedError("invalid_payload", "Choose a valid date range. Nothing was imported.");
  }
  return { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.000Z` };
}
