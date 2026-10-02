import { ApiError, apiRequest } from "@/lib/apiClient";
import { AA_CONFIGURATION_MESSAGE, AA_LOCAL_PROVIDER_LABEL, serverAaGate, type AaGate } from "@/services/aa/config";
import { AaClosedError } from "@/services/aa/errors";
import type { AaHttp, AaHttpResponse } from "@/services/aa/http";

export interface AaStatus {
  configured: boolean;
  localProvider: boolean;
  message: string;
}

export async function fetchAaStatus(): Promise<AaStatus> {
  try {
    const data = await apiRequest<AaStatus>("/api/aa/status.php", { method: "GET", auth: true });
    if (!data || typeof data.configured !== "boolean") {
      return { configured: false, localProvider: false, message: AA_CONFIGURATION_MESSAGE };
    }
    const localProvider = data.localProvider === true && data.configured;
    let message: string;
    if (!data.configured) {
      message = data.message || AA_CONFIGURATION_MESSAGE;
    } else if (localProvider) {
      message = typeof data.message === "string" && data.message.includes("Local development provider")
        ? data.message
        : `${AA_LOCAL_PROVIDER_LABEL} Nothing is imported until you confirm a review.`;
    } else {
      message = "Operator settings are present. Consent still has to be approved with a licensed Account Aggregator. Nothing is imported until you confirm a review.";
    }
    return { configured: data.configured, localProvider, message };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 424 || error.code === "AA_NOT_CONFIGURED")) {
      return { configured: false, localProvider: false, message: error.message || AA_CONFIGURATION_MESSAGE };
    }
    return {
      configured: false,
      localProvider: false,
      message: "Account Aggregator status could not be checked. Nothing was imported.",
    };
  }
}

export function browserAaGate(status: Pick<AaStatus, "configured" | "message">): AaGate {
  return status.configured ? serverAaGate() : { ready: false, message: status.message || AA_CONFIGURATION_MESSAGE };
}

/** Forwards an allowlisted ReBIT path through the server so credentials never reach the browser. */
export function serverAaHttp(): AaHttp {
  return async (request) => {
    try {
      const data = await apiRequest<AaHttpResponse>("/api/aa/forward.php", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ method: request.method, path: request.path, body: request.body ?? null }),
      });
      if (!data || typeof data.status !== "number") {
        throw new AaClosedError("provider_rejected", "Account Aggregator request failed. Nothing was imported.");
      }
      return { status: data.status, body: data.body };
    } catch (error) {
      if (error instanceof AaClosedError) throw error;
      if (error instanceof ApiError) {
        if (error.status === 504 || error.code === "AA_TIMEOUT") {
          const timeout = new Error("Account Aggregator request timed out");
          (timeout as { code?: string }).code = "AA_TIMEOUT";
          throw timeout;
        }
        if (error.status === 424 || error.code === "AA_NOT_CONFIGURED") {
          throw new AaClosedError("not_configured", error.message || AA_CONFIGURATION_MESSAGE, 424);
        }
        return { status: error.status, body: { message: error.message } };
      }
      throw error;
    }
  };
}
