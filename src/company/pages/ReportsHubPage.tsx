import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyNavigate, companyPath } from "@/company/routes";
import { companyApi } from "@/company/api/client";
import {
  beginReportLoadAt,
  initialReportLoadState,
  rejectReportLoad,
  reportScreenStatus,
  settleReportLoad,
} from "@/company/lib/reportLoad";
import { useCompanyStore } from "@/company/store/companyStore";
import { ApiError } from "@/lib/apiClient";
import { formatMoney } from "@/utils/money";
import reportRegistry from "../../../config/company-report-registry.json";
import { PageHeader } from "@/company/components/PageChrome";
import { SkeletonTable } from "@/company/components/CompanySkeleton";
import { ScrollTable } from "@/company/components/responsive";
import { parseReportQuery } from "@/company/lib/reportQuerySchema";
import { ChevronRight, FileBarChart2 } from "lucide-react";
import { useI18n } from "@/company/i18n/react";

type RegistryReport = {
  key: string;
  label: string;
  enabled?: boolean;
  requires?: string[];
  note?: string;
};

const REPORTS: Array<{ key: string; name: string; note?: string }> = (
  reportRegistry.reports as RegistryReport[]
)
  .filter((r) => r.enabled === true)
  .map((r) => ({
    key: r.key,
    name: r.label,
    note: undefined,
  }));

const REPORT_GROUPS: Array<{ title: string; keys: string[] }> = [
  {
    title: "Accounting",
    keys: ["trial-balance", "profit-loss", "balance-sheet", "day-book", "cash-bank-book"],
  },
  {
    title: "Parties",
    keys: ["party-statement", "receivables", "payables", "ageing"],
  },
  {
    title: "Management",
    keys: ["receipts-payments", "project-report", "business-report", "area-report", "category-report", "user-activity"],
  },
];

export function ReportsHubPage() {
  const { t } = useI18n();
  const byKey = new Map(REPORTS.map((r) => [r.key, r]));
  return (
    <div className="space-y-5">
      <PageHeader
        title={t("reports.title")}
        subtitle={t("reports.subtitle")}
        actions={
          <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("export"))}>
            {t("nav.export")}
          </Button>
        }
      />
      {REPORT_GROUPS.map((g) => {
        const items = g.keys.map((k) => byKey.get(k)).filter(Boolean) as typeof REPORTS;
        if (items.length === 0) return null;
        return (
          <div key={g.title} className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{g.title}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-elevated)]"
                  onClick={() => companyNavigate(companyPath("report-view", { reportKey: r.key }))}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]">
                    <FileBarChart2 className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold tracking-tight">{r.name}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {r.key === "party-statement"
                        ? t("reports.chooseParty")
                        : r.key === "cash-bank-book"
                          ? t("reports.chooseLedger")
                          : r.note || t("reports.open")}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number" && Math.abs(v) >= 100 && Number.isInteger(v)) {
    return formatMoney(v);
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function SimpleTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No rows.</p>;
  }
  const cols = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  return (
    <ScrollTable className="rounded-lg border border-border">
      <table className="w-full min-w-[28rem] text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col" className="px-3 py-2">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {cols.map((c) => (
                <td key={c} className="px-3 py-1.5 tabular-nums">
                  {renderValue(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}

export function ReportViewPage({ reportKey }: { reportKey: string }) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const meta = REPORTS.find((r) => r.key === reportKey);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [partyId, setPartyId] = useState("");
  const [ledgerId, setLedgerId] = useState("");
  const [parties, setParties] = useState<Array<{ id: string; name: string }>>([]);
  const [ledgers, setLedgers] = useState<Array<{ id: string; name: string }>>([]);
  const [side, setSide] = useState("receivable");
  const [loadState, setLoadState] = useState(initialReportLoadState);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("partyId")) setPartyId(params.get("partyId")!);
    if (params.get("ledgerId")) setLedgerId(params.get("ledgerId")!);
    if (params.get("side")) setSide(params.get("side")!);
  }, [reportKey]);

  const registryEntry = (reportRegistry.reports as RegistryReport[]).find((r) => r.key === reportKey);
  const needsParty = Boolean(registryEntry?.requires?.includes("partyId"));
  const needsLedger = Boolean(registryEntry?.requires?.includes("ledgerId"));
  const autoRun = !needsParty && !needsLedger;
  const screen = reportScreenStatus(loadState, reportKey, autoRun);
  const data = screen === "ready" ? loadState.data : null;
  const err = screen === "error" ? loadState.error : null;
  const loading = screen === "loading";

  useEffect(() => {
    if (!companyId || !needsParty) return;
    void companyApi.listParties(companyId).then((rows) => {
      setParties(rows.map((p) => ({ id: p.id, name: p.displayName })));
    });
  }, [companyId, needsParty]);

  useEffect(() => {
    if (!companyId || !needsLedger) return;
    void companyApi.listLedgers(companyId).then((rows) => {
      setLedgers(rows.filter((l) => l.isCashBank).map((l) => ({ id: l.id, name: l.name })));
    });
  }, [companyId, needsLedger]);

  async function load() {
    if (!companyId) return;
    if (needsParty && !partyId.trim()) {
      requestSeq.current += 1;
      const seq = requestSeq.current;
      setLoadState((current) => ({ ...rejectReportLoad(current, reportKey, t("reports.partyRequired")), seq }));
      return;
    }
    if (needsLedger && !ledgerId.trim()) {
      requestSeq.current += 1;
      const seq = requestSeq.current;
      setLoadState((current) => ({ ...rejectReportLoad(current, reportKey, t("reports.ledgerRequired")), seq }));
      return;
    }
    const sideValue =
      reportKey === "payables" ? "payable" : reportKey === "receivables" ? "receivable" : side;
    const parsed = parseReportQuery({
      report: reportKey,
      from,
      to,
      asOf: reportKey === "trial-balance" || reportKey === "balance-sheet" ? to : undefined,
      partyId: needsParty ? partyId.trim() : undefined,
      ledgerId: needsLedger ? ledgerId.trim() : undefined,
      side:
        reportKey === "ageing" || reportKey === "receivables" || reportKey === "payables"
          ? sideValue
          : undefined,
    });
    if (!parsed.ok) {
      requestSeq.current += 1;
      const seq = requestSeq.current;
      setLoadState((current) => ({ ...rejectReportLoad(current, reportKey, parsed.message), seq }));
      return;
    }
    requestSeq.current += 1;
    const seq = requestSeq.current;
    setLoadState((current) => beginReportLoadAt(current, seq));
    try {
      const extra: Record<string, string> = {};
      if (parsed.data.partyId) extra.partyId = parsed.data.partyId;
      if (parsed.data.ledgerId) extra.ledgerId = parsed.data.ledgerId;
      if (parsed.data.side) extra.side = parsed.data.side;
      if (parsed.data.asOf) extra.asOf = parsed.data.asOf;
      const reportApiKey =
        reportKey === "receivables" || reportKey === "payables" ? "ageing" : reportKey;
      const res = await companyApi.report(companyId, reportApiKey, from, to, extra);
      setLoadState((current) => settleReportLoad(current, seq, reportKey, { ok: true, data: res.data }));
    } catch (e) {
      const message = e instanceof ApiError || e instanceof Error ? e.message : "Report failed";
      setLoadState((current) => settleReportLoad(current, seq, reportKey, { ok: false, error: message }));
    }
  }

  useEffect(() => {
    if (autoRun) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, reportKey, from, to, side, autoRun]);

  const tables = useMemo(() => {
    if (data == null) return [];
    if (Array.isArray(data)) return [{ title: "Rows", rows: data as Array<Record<string, unknown>> }];
    if (typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const out: Array<{ title: string; rows: Array<Record<string, unknown>> }> = [];
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v) && v.length && typeof v[0] === "object") {
          out.push({ title: k, rows: v as Array<Record<string, unknown>> });
        }
      }
      if (out.length === 0) {
        out.push({ title: "Summary", rows: [obj] });
      }
      return out;
    }
    return [{ title: "Value", rows: [{ value: data }] }];
  }, [data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={meta?.name ?? reportKey}
        subtitle={meta?.note || "Filtered report view"}
        actions={
          <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("reports"))}>
            ← All reports
          </Button>
        }
      />
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="border-b border-border/80 bg-[hsl(var(--surface))]/60 pb-3">
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 pt-4">
          <Field label={t("reports.from")}>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t("reports.to")}>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          {reportKey === "ageing" ? (
            <Field label="Side">
              <select
                className="flex h-9 rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
                value={side}
                onChange={(e) => setSide(e.target.value)}
              >
                <option value="receivable">Receivable</option>
                <option value="payable">Payable</option>
              </select>
            </Field>
          ) : null}
          {needsParty ? (
            <Field label={t("bills.party")}>
              <select
                className="flex h-9 min-w-[12rem] rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
              >
                <option value="">{t("reports.chooseParty")}</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {needsLedger ? (
            <Field label={t("reports.chooseLedger")}>
              <select
                className="flex h-9 min-w-[12rem] rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
                value={ledgerId}
                onChange={(e) => setLedgerId(e.target.value)}
              >
                <option value="">{t("reports.chooseLedger")}</option>
                {ledgers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="flex items-end">
            <Button size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? t("common.loading") : t("reports.run")}
            </Button>
          </div>
        </CardContent>
      </Card>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {loading ? <SkeletonTable rows={8} cols={4} /> : null}
      {!loading
        ? tables.map((t) => (
            <Card key={t.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleTable rows={t.rows} />
              </CardContent>
            </Card>
          ))
        : null}
    </div>
  );
}
