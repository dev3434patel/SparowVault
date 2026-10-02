import { apiRequest } from "@/lib/apiClient";
import type { AccountGroup, CompanyMembership, CompanyPermission, CompanyLedger } from "@/company/types";
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

  listAccountGroups: (companyId: string) =>
    apiRequest<{ groups?: Array<Record<string, unknown>> }>(
      `${BASE}/ledgers.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ).then((d) => d.groups ?? []),

  companyOperation: (op: string, body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`${BASE}/operations.php?op=${encodeURIComponent(op)}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

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

  createDimension: (companyId: string, type: DimensionKind, body: { name: string; code?: string; url?: string }) =>
    apiRequest(`${BASE}/dimensions.php?companyId=${encodeURIComponent(companyId)}&type=${encodeURIComponent(type)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }),

  updateDimension: (companyId: string, type: DimensionKind, body: { id: string; name: string; url?: string }) =>
    apiRequest(`${BASE}/dimensions.php?companyId=${encodeURIComponent(companyId)}&type=${encodeURIComponent(type)}`, {
      method: "PATCH",
      body: JSON.stringify({ companyId, ...body }),
    }),

  archiveDimension: (companyId: string, type: DimensionKind, id: string) =>
    apiRequest(`${BASE}/dimensions.php?companyId=${encodeURIComponent(companyId)}&type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: JSON.stringify({ companyId, id }),
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

  updateWorkspaceProfile: (
    companyId: string,
    body: {
      displayName: string;
      gstin?: string | null;
      financialYearStartMonth?: number;
      booksStartDate?: string | null;
      acknowledgeImpact?: boolean;
    },
  ) =>
    apiRequest(`${BASE}/workspace.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "PATCH",
      body: JSON.stringify({ companyId, ...body }),
    }),

  listLedgerCatalog: async (companyId: string): Promise<{ ledgers: CompanyLedger[]; groups: AccountGroup[] }> => {
    const data = await apiRequest<{
      ledgers?: Array<Record<string, unknown>>;
      groups?: Array<Record<string, unknown>>;
    }>(`${BASE}/ledgers.php?companyId=${encodeURIComponent(companyId)}`, { method: "GET" });
    return {
      ledgers: (data.ledgers ?? []).map((row) => mapLedger(row, companyId)),
      groups: (data.groups ?? []).map((row) => ({
        id: String(row.id),
        companyId,
        parentId: (row.parent_id as string | null) ?? null,
        name: String(row.name ?? ""),
        code: String(row.code ?? ""),
        nature: (row.nature as AccountGroup["nature"]) ?? "ASSET",
        isSystem: Boolean(Number(row.is_system ?? 0)),
      })),
    };
  },

  mutateLedger: (
    companyId: string,
    body: { action: "create" | "rename" | "archive"; name?: string; code?: string; groupId?: string; ledgerId?: string },
  ) =>
    apiRequest(`${BASE}/ledgers.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }),

  setMemberRole: (companyId: string, body: { membershipId: string; roleCode: string }) =>
    apiRequest(`${BASE}/memberships.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "PATCH",
      body: JSON.stringify({ companyId, ...body }),
    }),

  redeemInviteToken: (token: string) =>
    apiRequest<{ membershipId: string; companyId: string }>(`${BASE}/invite-token.php`, {
      method: "POST",
      body: JSON.stringify({ action: "redeem", token }),
    }),

  issueInviteToken: (companyId: string, roleCode: string) =>
    apiRequest<{ inviteId: string; token: string; roleCode: string }>(`${BASE}/invite-token.php`, {
      method: "POST",
      body: JSON.stringify({ companyId, action: "issue", roleCode }),
    }),

  saveCompanyDocument: (companyId: string, body: { fileName: string; contentBase64?: string; mimeType?: string }) =>
    apiRequest<{ id?: string }>(`${BASE}/documents.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }),

  downloadCompanyDocument: async (companyId: string, id: string) => {
    const response = await fetch(
      `${BASE}/documents.php?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(id)}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      throw new Error("Document download failed");
    }
    return response.blob();
  },

  draftInvoice: (companyId: string, body: Record<string, unknown>) =>
    apiRequest(`${BASE}/invoice-draft.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, action: "draft", ...body }),
    }),

  saveCompanyRecurring: (companyId: string, body: Record<string, unknown>) =>
    apiRequest(`${BASE}/recurring.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, action: "create", ...body }),
    }),

  runCompanyRecurring: (companyId: string, today: string) =>
    apiRequest(`${BASE}/recurring.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, action: "run", today }),
    }),

  advanceGst: (companyId: string, state: string, action: string) =>
    apiRequest(`${BASE}/gst.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, state, action }),
    }),

  listCompanyItems: (companyId: string) =>
    apiRequest<{ items?: Array<{ id?: string; kind?: string; qty?: number; value?: number; cogs?: number }> }>(
      `${BASE}/items.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ),

  saveCompanyItem: (companyId: string, body: Record<string, unknown>) =>
    apiRequest(`${BASE}/items.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }),

  payrollPreview: (companyId: string, action: "preview" | "approve" | "accrue" | "pay" = "preview") =>
    apiRequest(`${BASE}/payroll-preview.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, gross: 30000, action }),
    }),

  listCompanyGroups: (companyId: string) =>
    apiRequest<{ groups?: unknown[]; statutoryConsolidation?: boolean }>(
      `${BASE}/groups.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ),

  matchCheque: (companyId: string, body: { voucherId?: string; postedCashPaise: number; feePaise: number }) =>
    apiRequest(`${BASE}/cheque-match.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }),

  saveBridge: (companyId: string, body: Record<string, unknown>) =>
    apiRequest(`${BASE}/bridge.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }),

  saveOrgSubscriptionFixture: (companyId: string) =>
    apiRequest(`${BASE}/org-subscription.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({
        companyId,
        fixture: { source: "local-fixture", subject: "company_org_subscriptions", planCode: "local", status: "TRIAL" },
      }),
    }),
};
