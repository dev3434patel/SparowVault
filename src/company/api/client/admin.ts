import { apiRequest } from "@/lib/apiClient";
import type { CompanyMembership, CompanyPermission, CompanyLedger } from "@/company/types";
import { BASE, mapWorkspace, mapLedger, type DimensionKind } from "./core";

export const adminApi = {
  /** List companies the current user can access (memberships). */
  listMemberships: async (): Promise<CompanyMembership[]> => {
    const data = await apiRequest<{ workspaces: Array<Record<string, unknown>> }>(
      `${BASE}/workspaces.php`,
      { method: "GET" },
    );
    return (data.workspaces ?? []).map((w) => ({
      id: String(w.membership_id ?? w.id),
      companyId: String(w.id),
      userId: "",
      status: "ACTIVE",
      companyDisplayName: String(w.display_name ?? w.displayName ?? ""),
      roles: [],
    }));
  },

  /** Company-scoped membership list (manage_users). */
  listMembers: async (companyId: string): Promise<Array<Record<string, unknown>>> => {
    const data = await apiRequest<{ memberships?: Array<Record<string, unknown>> }>(
      `${BASE}/memberships.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    );
    return data.memberships ?? [];
  },

  inviteMember: async (
    companyId: string,
    body: { userId: string; roleCode?: string },
  ): Promise<{ membershipId: string }> => {
    return apiRequest(`${BASE}/memberships.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    });
  },

  getWorkspace: async (companyId: string) => {
    const data = await apiRequest<{
      workspace: Record<string, unknown>;
      permissions: CompanyPermission[];
    }>(`${BASE}/workspace.php?companyId=${encodeURIComponent(companyId)}`, { method: "GET" });
    return {
      workspace: mapWorkspace(data.workspace),
      permissions: data.permissions ?? [],
    };
  },

  createWorkspace: async (body: {
    displayName: string;
    legalName: string;
    financialYearStartMonth?: number;
    booksStartDate?: string;
    businessType?: string;
  }) => {
    const data = await apiRequest<{ workspace: Record<string, unknown> }>(
      `${BASE}/workspaces.php`,
      { method: "POST", body: JSON.stringify(body) },
    );
    const workspace = mapWorkspace(data.workspace);
    return {
      workspace,
      membership: {
        id: "owner",
        companyId: workspace.id,
        userId: workspace.ownerUserId,
        status: "ACTIVE" as const,
        roles: [],
        companyDisplayName: workspace.displayName,
      },
    };
  },

  listLedgers: (companyId: string) =>
    apiRequest<{ ledgers?: Array<Record<string, unknown>> } | CompanyLedger[]>(
      `${BASE}/ledgers.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ).then((d) => {
      const rows = Array.isArray(d) ? d : (d as { ledgers?: Array<Record<string, unknown>> }).ledgers ?? [];
      return rows.map((r) =>
        typeof r === "object" && r && "isCashBank" in r && !("is_cash_bank" in r)
          ? (r as CompanyLedger)
          : mapLedger(r as Record<string, unknown>, companyId),
      );
    }),

  listDimensions: (companyId: string, type: DimensionKind) =>
    apiRequest<{ items?: Array<Record<string, unknown>>; kind?: string }>(
      `${BASE}/dimensions.php?companyId=${encodeURIComponent(companyId)}&type=${encodeURIComponent(type)}`,
      { method: "GET" },
    ).then((d) => d.items ?? []),

  createDimension: (companyId: string, type: DimensionKind, body: { name: string; code?: string }) =>
    apiRequest(`${BASE}/dimensions.php?companyId=${encodeURIComponent(companyId)}&type=${encodeURIComponent(type)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }),

  listPeriodLocks: (companyId: string) =>
    apiRequest<{ locks?: Array<Record<string, unknown>> }>(
      `${BASE}/period-locks.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ).then((d) => d.locks ?? []),

  createPeriodLock: (companyId: string, body: { lockBeforeDate: string; reason?: string }) =>
    apiRequest(`${BASE}/period-locks.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, action: "lock", ...body }),
    }),

  reopenPeriodLock: (companyId: string, body: { lockId: string; reason?: string; pin?: string }) =>
    apiRequest(`${BASE}/period-locks.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, action: "reopen", ...body }),
    }),
};
