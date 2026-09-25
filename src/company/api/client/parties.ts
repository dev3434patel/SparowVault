import { apiRequest } from "@/lib/apiClient";
import type { CompanyParty, BillRef } from "@/company/types";
import { BASE, mapParty, mapVoucher, type PartyCategoryMember, type PartyCategoryRow } from "./core";

export const partiesApi = {
  listParties: (companyId: string) =>
    apiRequest<{ parties?: Array<Record<string, unknown>> } | CompanyParty[]>(
      `${BASE}/parties.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ).then((d) => {
      const rows = Array.isArray(d) ? d : d.parties ?? [];
      return rows.map((r) =>
        typeof r === "object" && r && "displayName" in r && !("display_name" in r)
          ? (r as CompanyParty)
          : mapParty(r as Record<string, unknown>, companyId),
      );
    }),

  getParty: (companyId: string, partyId: string) =>
    apiRequest<CompanyParty | { party: Record<string, unknown> | CompanyParty }>(
      `${BASE}/party-item.php?companyId=${encodeURIComponent(companyId)}&partyId=${encodeURIComponent(partyId)}`,
      { method: "GET" },
    ).then((d) => {
      if (d && typeof d === "object" && "party" in d) {
        const p = (d as { party: Record<string, unknown> }).party;
        return mapParty(p, companyId);
      }
      return d as CompanyParty;
    }),

  createParty: (companyId: string, body: Record<string, unknown>) =>
    apiRequest<{ party?: Record<string, unknown> }>(`${BASE}/parties.php`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }).then((d) => (d.party ? mapParty(d.party, companyId) : d)),

  updateParty: (companyId: string, partyId: string, body: Record<string, unknown>) =>
    apiRequest<{ party?: Record<string, unknown> }>(
      `${BASE}/party-item.php?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(partyId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ companyId, id: partyId, ...body }),
      },
    ).then((d) => (d.party ? mapParty(d.party, companyId) : d)),

  listBills: (companyId: string, side?: "RECEIVABLE" | "PAYABLE") =>
    apiRequest<BillRef[] | { bills: Array<Record<string, unknown>> }>(
      `${BASE}/bills.php?companyId=${encodeURIComponent(companyId)}${side ? `&side=${side}` : ""}`,
      { method: "GET" },
    ).then((d) => {
      const rows = Array.isArray(d) ? d : (d as { bills: Array<Record<string, unknown>> }).bills ?? [];
      return rows.map((r) => {
        const row = r as Record<string, unknown>;
        if ("outstandingPaise" in row && !("outstanding_paise" in row)) return row as unknown as BillRef;
        return {
          id: String(row.id),
          companyId: String(row.company_id ?? companyId),
          partyId: String(row.party_id ?? row.partyId ?? ""),
          refType: String(row.ref_type ?? row.refType ?? ""),
          refNumber: String(row.ref_number ?? row.refNumber ?? ""),
          billDate: String(row.bill_date ?? row.billDate ?? ""),
          dueDate: (row.due_date ?? row.dueDate) as string | null | undefined,
          originalAmountPaise: Number(row.original_amount_paise ?? row.originalAmountPaise ?? 0),
          outstandingPaise: Number(row.outstanding_paise ?? row.outstandingPaise ?? 0),
          side: (row.side as BillRef["side"]) ?? "RECEIVABLE",
          status: (row.status as BillRef["status"]) ?? "OPEN",
          projectId: (row.project_id ?? row.projectId) as string | null | undefined,
          businessUnitId: (row.business_unit_id ?? row.businessUnitId) as string | null | undefined,
          partyName: (row.party_name ?? row.partyName) as string | undefined,
        } as BillRef & { partyName?: string };
      });
    }),

  listPartyCategories: (companyId: string) =>
    apiRequest<{ categories?: PartyCategoryRow[] }>(
      `${BASE}/categories.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ).then((d) => d.categories ?? []),

  getPartyCategory: (companyId: string, categoryId: string) =>
    apiRequest<{ category?: PartyCategoryRow; members?: PartyCategoryMember[] }>(
      `${BASE}/categories.php?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(categoryId)}`,
      { method: "GET" },
    ).then((d) => ({
      category: d.category ?? null,
      members: d.members ?? [],
    })),

  createPartyCategory: (companyId: string, body: { name: string; partyId?: string }) =>
    apiRequest<{ categoryId?: string; category?: PartyCategoryRow }>(
      `${BASE}/categories.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "POST", body: JSON.stringify({ companyId, action: "create", ...body }) },
    ),

  renamePartyCategory: (companyId: string, categoryId: string, name: string) =>
    apiRequest<{ category?: PartyCategoryRow }>(
      `${BASE}/categories.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "PATCH", body: JSON.stringify({ companyId, id: categoryId, name }) },
    ),

  deletePartyCategory: (companyId: string, categoryId: string) =>
    apiRequest<{ deleted?: boolean }>(
      `${BASE}/categories.php?companyId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(categoryId)}`,
      { method: "DELETE" },
    ),

  assignPartyToCategory: (companyId: string, categoryId: string, partyId: string) =>
    apiRequest(
      `${BASE}/categories.php?companyId=${encodeURIComponent(companyId)}&action=assign`,
      { method: "POST", body: JSON.stringify({ companyId, categoryId, partyId }) },
    ),

  unassignPartyFromCategory: (companyId: string, categoryId: string, partyId: string) =>
    apiRequest(
      `${BASE}/categories.php?companyId=${encodeURIComponent(companyId)}&action=unassign`,
      { method: "POST", body: JSON.stringify({ companyId, categoryId, partyId }) },
    ),

  allocateOnAccount: (
    companyId: string,
    body: { partyId: string; billRefId: string; amountPaise: number; mutationId: string },
  ) =>
    apiRequest<{ voucher?: Record<string, unknown> }>(`${BASE}/bill-allocate.php`, {
      method: "POST",
      body: JSON.stringify({ companyId, ...body }),
    }).then((d) => (d.voucher ? mapVoucher(d.voucher) : d)),
};
