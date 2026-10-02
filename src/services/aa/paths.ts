export const AA_PATHS = {
  discover: "/Accounts/discover",
  link: "/Accounts/link",
  linkVerify: "/Accounts/link/verify",
  consent: "/Consent",
  fiRequest: "/FI/request",
  /** Local development provider only. The PHP forwarder allowlists this path only for the local URL. */
  localConsentStatus: "/local/consent/status",
} as const;

export function consentHandlePath(handle: string): string {
  return `/Consent/handle/${handle}`;
}

export function fiFetchPath(sessionId: string): string {
  return `/FI/fetch/${sessionId}`;
}
