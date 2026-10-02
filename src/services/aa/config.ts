/** Server env names. Values are never stored in source and must not be logged. */
export const AA_BASE_URL = "AA_BASE_URL";
export const AA_CLIENT_ID = "AA_CLIENT_ID";
export const AA_CLIENT_SECRET = "AA_CLIENT_SECRET";
/** Optional registry id. When unset, the server uses AA_CLIENT_ID as the data consumer id. */
export const AA_FIU_ID = "AA_FIU_ID";
/** Opt-in switch. The local development provider stays off unless this is true. */
export const AA_LOCAL_PROVIDER = "AA_LOCAL_PROVIDER";
/** Only URL the local development provider accepts. A licensed provider is still required for production. */
export const AA_LOCAL_BASE_URL = "http://127.0.0.1:8791";
export const AA_LOCAL_PROVIDER_LABEL =
  "Local development provider. This is not a licensed Account Aggregator. A licensed provider is still required for production.";

export const AA_CONFIGURATION_MESSAGE =
  "Account Aggregator is not configured. Set AA_BASE_URL, AA_CLIENT_ID, and AA_CLIENT_SECRET on the server. No accounts were linked and no ledger rows were created.";

export function aaLocalProviderEnabled(value: string | undefined): boolean {
  const flag = typeof value === "string" ? value.trim().toLowerCase() : "";
  return flag === "true" || flag === "1";
}

export interface AaOperatorConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  fiuId: string;
}

export type AaGate =
  | { ready: false; message: string }
  | { ready: true; mode: "operator"; operator: AaOperatorConfig }
  | { ready: true; mode: "server" };

function trimmed(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Operator gate for tests and any in-process provider.
 * A missing base URL or credential returns not-ready and must not call the provider.
 */
export function readAaOperatorConfig(env: Record<string, string | undefined>): AaGate {
  const baseUrl = trimmed(env, AA_BASE_URL);
  const clientId = trimmed(env, AA_CLIENT_ID);
  const clientSecret = trimmed(env, AA_CLIENT_SECRET);
  if (!baseUrl || !clientId || !clientSecret) {
    return { ready: false, message: AA_CONFIGURATION_MESSAGE };
  }
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    return { ready: false, message: "AA_BASE_URL is not a usable https URL. Nothing was imported." };
  }
  if (parsed.username || parsed.password || !parsed.hostname) {
    return { ready: false, message: "AA_BASE_URL must be an https URL without embedded credentials. Nothing was imported." };
  }
  const fiuId = trimmed(env, AA_FIU_ID) || clientId;
  const path = parsed.pathname.replace(/\/+$/, "");
  const localUrl = aaLocalProviderEnabled(env[AA_LOCAL_PROVIDER])
    && parsed.protocol === "http:"
    && parsed.hostname === "127.0.0.1"
    && parsed.port === "8791"
    && (path === "" || path === "/")
    && parsed.search === ""
    && parsed.hash === "";
  if (localUrl) {
    return {
      ready: true,
      mode: "operator",
      operator: {
        baseUrl: AA_LOCAL_BASE_URL,
        clientId,
        clientSecret,
        fiuId,
      },
    };
  }
  if (parsed.protocol !== "https:") {
    return { ready: false, message: "AA_BASE_URL must be an https URL without embedded credentials. Nothing was imported." };
  }
  return {
    ready: true,
    mode: "operator",
    operator: {
      baseUrl: `${parsed.origin}${path === "/" ? "" : path}`,
      clientId,
      clientSecret,
      fiuId,
    },
  };
}

/** Browser gate. Credentials stay on the server; this only means status said they are present. */
export function serverAaGate(): AaGate {
  return { ready: true, mode: "server" };
}

export function dataConsumerId(gate: AaGate): string {
  if (gate.ready && gate.mode === "operator") return gate.operator.fiuId;
  return "";
}
