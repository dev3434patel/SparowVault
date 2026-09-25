import { apiRequest } from "@/lib/apiClient";
import { BASE } from "./core";

export const reportsApi = {
  report: (
    companyId: string,
    report: string,
    from?: string,
    to?: string,
    extra?: Record<string, string>,
  ) => {
    const q = new URLSearchParams({ companyId, report });
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v) q.set(k, v);
      }
    }
    return apiRequest<{ report: string; data: unknown }>(`${BASE}/reports.php?${q}`, { method: "GET" });
  },

  exportReport: (
    companyId: string,
    opts: {
      report?: string;
      format?: string;
      from?: string;
      to?: string;
      download?: boolean;
      pin?: string;
    },
  ) => {
    return apiRequest(`${BASE}/exports.php?companyId=${encodeURIComponent(companyId)}`, {
      method: "POST",
      body: JSON.stringify({
        companyId,
        report: opts.report,
        format: opts.format,
        from: opts.from,
        to: opts.to,
        download: opts.download === false ? 0 : 1,
        pin: opts.pin,
      }),
    });
  },

  listAudit: (companyId: string) =>
    apiRequest<{ events?: Array<Record<string, unknown>>; audit?: Array<Record<string, unknown>> }>(
      `${BASE}/audit.php?companyId=${encodeURIComponent(companyId)}`,
      { method: "GET" },
    ).then((d) => d.events ?? d.audit ?? []),

  search: (companyId: string, q: string) =>
    apiRequest<{ results?: Array<Record<string, unknown>> }>(
      `${BASE}/search.php?companyId=${encodeURIComponent(companyId)}&q=${encodeURIComponent(q)}`,
      { method: "GET" },
    ).then((d) => d.results ?? []),
};
