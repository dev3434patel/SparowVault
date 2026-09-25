import { apiRequest } from "@/lib/apiClient";
import type { CompanyVoucher } from "@/company/types";
import { BASE, mapVoucher, type VoucherPreviewLine, type VoucherPreviewPayload } from "./core";

export const vouchersApi = {
  listVouchers: (
    companyId: string,
    opts?: { from?: string; to?: string; partyId?: string; voucherType?: string; search?: string },
  ) => {
    const q = new URLSearchParams({ companyId });
    if (opts?.from) q.set("from", opts.from);
    if (opts?.to) q.set("to", opts.to);
    if (opts?.partyId) q.set("partyId", opts.partyId);
    if (opts?.voucherType) q.set("voucherType", opts.voucherType);
    if (opts?.search) q.set("search", opts.search);
    return apiRequest<{ vouchers?: Array<Record<string, unknown>> } | CompanyVoucher[]>(
      `${BASE}/vouchers.php?${q}`,
      { method: "GET" },
    ).then((d) => {
      const rows = Array.isArray(d) ? d : (d as { vouchers?: Array<Record<string, unknown>> }).vouchers ?? [];
      return rows.map((r) => mapVoucher(r as Record<string, unknown>));
    });
  },

  getVoucher: (companyId: string, voucherId: string) =>
    apiRequest<{ voucher?: Record<string, unknown> } | Record<string, unknown>>(
      `${BASE}/voucher-item.php?companyId=${encodeURIComponent(companyId)}&voucherId=${encodeURIComponent(voucherId)}`,
      { method: "GET" },
    ).then((d) => {
      const row =
        d && typeof d === "object" && "voucher" in d
          ? (d as { voucher: Record<string, unknown> }).voucher
          : (d as Record<string, unknown>);
      return mapVoucher(row);
    }),

  postVoucher: async (companyId: string, body: unknown) => {
    const data = await apiRequest<{ voucher?: Record<string, unknown> } & Record<string, unknown>>(
      `${BASE}/voucher-post.php`,
      {
        method: "POST",
        body: JSON.stringify({ companyId, ...((body as object) ?? {}) }),
      },
    );
    const row = (data.voucher ?? data) as Record<string, unknown>;
    return mapVoucher(row);
  },

  previewVoucher: async (companyId: string, body: unknown): Promise<VoucherPreviewPayload> => {
    const data = await apiRequest<VoucherPreviewPayload & { lines?: VoucherPreviewLine[] }>(
      `${BASE}/voucher-preview.php`,
      {
        method: "POST",
        body: JSON.stringify({ companyId, ...((body as object) ?? {}) }),
      },
    );
    return {
      ...data,
      lines: (data.lines ?? []).map((l) => ({
        ledgerId: String(l.ledgerId ?? (l as { ledger_id?: string }).ledger_id ?? ""),
        side: (l.side as "DEBIT" | "CREDIT") ?? "DEBIT",
        amountPaise: Number(l.amountPaise ?? (l as { amount_paise?: number }).amount_paise ?? 0),
        partyRelationshipId: l.partyRelationshipId ?? null,
        ledgerName: l.ledgerName ?? (l as { ledger_name?: string }).ledger_name,
        ledgerCode: l.ledgerCode ?? (l as { ledger_code?: string }).ledger_code,
      })),
    };
  },

  reverseVoucher: async (
    companyId: string,
    voucherId: string,
    body: { mutationId: string; reason: string; pin?: string },
  ) => {
    const data = await apiRequest<{ voucher?: Record<string, unknown> }>(`${BASE}/voucher-reverse.php`, {
      method: "POST",
      body: JSON.stringify({ companyId, voucherId, ...body }),
    });
    return data.voucher ? mapVoucher(data.voucher) : data;
  },

  listApprovals: (companyId: string) =>
    apiRequest<{ approvals?: Array<Record<string, unknown>> }>(
      `${BASE}/approvals.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ).then((d) => d.approvals ?? []),

  approveVoucher: (companyId: string, approvalId: string, comment?: string) =>
    apiRequest(`${BASE}/approvals.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, approvalId, decision: "APPROVE", comment }),
    }),

  rejectVoucher: (companyId: string, approvalId: string, comment?: string) =>
    apiRequest(`${BASE}/approvals.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({ companyId, approvalId, decision: "REJECT", comment }),
    }),
};
