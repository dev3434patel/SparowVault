import { apiRequest } from "@/lib/apiClient";
import type { HouseholdResourceRef } from "@/services/householdGrantRules";

export interface IssuedHouseholdInvite {
  inviteId: string;
  token: string;
  role: string;
  resourceCount: number;
  copiedBooks: boolean;
}

export interface AcceptedHouseholdInvite {
  householdId: string;
  role: string;
  copiedBooks: boolean;
}

export async function issueServerHouseholdInvite(input: {
  householdId: string;
  role: "viewer" | "partner" | "editor";
  resourceScope: HouseholdResourceRef[];
  expiresInDays?: number;
}): Promise<IssuedHouseholdInvite> {
  return apiRequest<IssuedHouseholdInvite>("/api/personal/household.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ action: "issue", ...input }),
  });
}

export async function acceptServerHouseholdInvite(token: string): Promise<AcceptedHouseholdInvite> {
  return apiRequest<AcceptedHouseholdInvite>("/api/personal/household.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ action: "accept", token }),
  });
}

export async function revokeServerHouseholdGrant(grantId: string): Promise<{ grantId: string; revoked: boolean; offlineCache: string }> {
  return apiRequest("/api/personal/household.php", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ action: "revoke", grantId }),
  });
}
