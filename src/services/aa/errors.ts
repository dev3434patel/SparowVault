export type AaClosedCode =
  | "not_configured"
  | "provider_rejected"
  | "timeout"
  | "consent_not_active"
  | "encrypted_fi"
  | "invalid_payload";

export class AaClosedError extends Error {
  readonly code: AaClosedCode;
  readonly status: number;

  constructor(code: AaClosedCode, message: string, status = 0) {
    super(message);
    this.name = "AaClosedError";
    this.code = code;
    this.status = status;
  }
}

export function isAaTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; name?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  if (code === "AA_TIMEOUT" || code === "ETIMEDOUT") return true;
  const name = typeof record.name === "string" ? record.name : "";
  if (name === "TimeoutError" || name === "AbortError") return true;
  const message = typeof record.message === "string" ? record.message : "";
  return /timed out|timeout/i.test(message);
}
