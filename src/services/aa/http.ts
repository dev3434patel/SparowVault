import { AaClosedError, isAaTimeout } from "@/services/aa/errors";
import type { AaGate } from "@/services/aa/config";

export const AA_TIMEOUT_MS = 20_000;

export interface AaHttpRequest {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  timeoutMs: number;
}

export interface AaHttpResponse {
  status: number;
  body: unknown;
}

export type AaHttp = (request: AaHttpRequest) => Promise<AaHttpResponse>;

function providerMessage(body: unknown, status: number): string {
  const raw = body && typeof body === "object" && "message" in body && typeof body.message === "string"
    ? body.message.trim()
    : "";
  const safe = raw.slice(0, 180);
  if (!safe || /secret|client_secret|api[_-]?key|authorization/i.test(safe)) {
    return `Account Aggregator rejected the request (${status}). Nothing was imported.`;
  }
  return `Account Aggregator rejected the request (${status}): ${safe} Nothing was imported.`;
}

/** One provider call. Non-2xx, timeout, and a closed gate throw before any ledger write. */
export async function aaCall(
  gate: AaGate,
  http: AaHttp,
  request: Omit<AaHttpRequest, "timeoutMs">,
): Promise<unknown> {
  if (!gate.ready) {
    throw new AaClosedError("not_configured", gate.message, 424);
  }
  let response: AaHttpResponse;
  try {
    response = await http({ ...request, timeoutMs: AA_TIMEOUT_MS });
  } catch (error) {
    if (error instanceof AaClosedError) throw error;
    if (isAaTimeout(error)) {
      throw new AaClosedError("timeout", "Account Aggregator request timed out. Nothing was imported.", 408);
    }
    throw new AaClosedError("provider_rejected", "Account Aggregator request failed. Nothing was imported.");
  }
  if (response.status === 408 || response.status === 504) {
    throw new AaClosedError("timeout", "Account Aggregator request timed out. Nothing was imported.", response.status);
  }
  if (response.status < 200 || response.status >= 300) {
    throw new AaClosedError("provider_rejected", providerMessage(response.body, response.status), response.status);
  }
  return response.body;
}
