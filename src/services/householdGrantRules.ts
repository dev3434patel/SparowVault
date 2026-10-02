/** Decision table for cross-login household grants. The server enforces the same codes. */

export type HouseholdGrantRole = "viewer" | "partner";

export interface HouseholdResourceRef {
  collection: string;
  entityId: string;
}

export interface HouseholdInviteDecisionInput {
  inviterUserId: string;
  role: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
}

export interface HouseholdGrantDecisionInput {
  revokedAt: string | null;
  role: string;
  revision: number;
  resourceScope: HouseholdResourceRef[];
}

export type HouseholdDecision = { ok: true; code: "" } | { ok: false; code: string };

export function decideHouseholdAccept(
  invite: HouseholdInviteDecisionInput | null,
  accepterUserId: string,
  nowIso: string,
): HouseholdDecision {
  if (!invite) return { ok: false, code: "NOT_FOUND" };
  if (invite.revokedAt) return { ok: false, code: "REVOKED" };
  if (invite.usedAt) return { ok: false, code: "TOKEN_USED" };
  if (invite.expiresAt <= nowIso) return { ok: false, code: "EXPIRED" };
  if (accepterUserId === "" || accepterUserId === invite.inviterUserId) return { ok: false, code: "SELF_ACCEPT" };
  if (invite.role !== "viewer" && invite.role !== "partner") return { ok: false, code: "ROLE" };
  return { ok: true, code: "" };
}

export function decideHouseholdWrite(
  grant: HouseholdGrantDecisionInput | null,
  collection: string,
  entityId: string,
  queuedRevision: number | null,
): HouseholdDecision {
  if (!grant || grant.revokedAt) return { ok: false, code: "REVOKED" };
  if (queuedRevision !== null && queuedRevision !== grant.revision) return { ok: false, code: "STALE_GRANT" };
  if (grant.role === "viewer") return { ok: false, code: "VIEWER_DENIED" };
  if (grant.role !== "partner") return { ok: false, code: "ROLE" };
  const allowed = grant.resourceScope.some((item) => item.collection === collection && item.entityId === entityId);
  if (!allowed) return { ok: false, code: "OUT_OF_SCOPE" };
  return { ok: true, code: "" };
}

/** A household must keep one owner. Demoting the last owner is refused. */
export function decideLastOwner(ownerCount: number, nextRole: string): HouseholdDecision {
  if (ownerCount <= 1 && nextRole !== "owner") return { ok: false, code: "LAST_OWNER" };
  return { ok: true, code: "" };
}
