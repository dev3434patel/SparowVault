import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { companyApi } from "@/company/api/client";
import { PermissionGate, useHasPermission } from "@/company/components/PermissionGate";
import { companyNavigate, companyPath } from "@/company/routes";
import { useCompanyStore } from "@/company/store/companyStore";
import { ApiError } from "@/lib/apiClient";
import { Download } from "lucide-react";
import { useI18n } from "@/company/i18n/react";
import { PinConfirmDialog } from "@/company/components/PinConfirmDialog";

type ExportSuccess = {
  filename: string;
  format: string;
  rowCount: number;
  generatedAt: string;
  bodyBase64?: string;
  contentType?: string;
};

function typedExportError(e: unknown): string {
  if (e instanceof ApiError) {
    const code = String(e.code ?? "").toUpperCase();
    const msg = e.message;
    if (code.includes("PIN") || /pin|sensitive/i.test(msg)) {
      return "PIN is wrong or missing. Ask your company admin if you forgot it.";
    }
    if (/too large|payload|size/i.test(msg) || code.includes("TOO_LARGE")) {
      return "This report is too large to export in one go. Narrow the date range and try again.";
    }
    if (/period.?lock|locked/i.test(msg) || code.includes("PERIOD_LOCK")) {
      return "Books are locked for this period. Ask an authorised user to reopen before exporting.";
    }
    if (e.status === 403 || /permission|forbidden/i.test(msg)) {
      return "You don't have permission to export this report.";
    }
    return msg;
  }
  return e instanceof Error ? e.message : "Export failed";
}

function downloadAgain(success: ExportSuccess) {
  if (!success.bodyBase64) return;
  const bin = atob(success.bodyBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: success.contentType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = success.filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportPage() {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<ExportSuccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pending, setPending] = useState<{ format: string; report: string } | null>(null);
  const canBackup = useHasPermission("export_backup");

  function ask(format: string, report = "day-book") {
    setPending({ format, report });
    setPinOpen(true);
  }

  async function run(pin: string) {
    if (!companyId || !pending) return;
    setBusy(true);
    setErr(null);
    setSuccess(null);
    try {
      const res = (await companyApi.exportReport(companyId, {
        format: pending.format,
        report: pending.report,
        download: false,
        pin,
      })) as Record<string, unknown>;
      const preview = String(res.csvPreview ?? "");
      const rowCount =
        Number(res.rowCount ?? res.row_count ?? 0) ||
        (preview ? preview.split("\n").filter(Boolean).length - 1 : 0);
      setSuccess({
        filename: String(res.filename ?? `${pending.report}.${pending.format}`),
        format: String(res.format ?? pending.format).toUpperCase(),
        rowCount: Math.max(0, rowCount),
        generatedAt: new Date().toLocaleString(),
        bodyBase64: typeof res.bodyBase64 === "string" ? res.bodyBase64 : undefined,
        contentType: typeof res.contentType === "string" ? res.contentType : undefined,
      });
    } catch (e) {
      const msg = typedExportError(e);
      setErr(msg === "Export failed" ? t("export.failed") : msg);
    } finally {
      setBusy(false);
      setPinOpen(false);
    }
  }

  return (
    <PermissionGate permission="export_reports">
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold">{t("export.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("export.subtitle")}</p>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
            <h2 className="text-sm font-semibold">Report exports</h2>
          </div>
          <div className="grid gap-2 p-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { format: "pdf", label: "Export PDF", desc: "Printable branded report" },
              { format: "docx", label: "Export DOCX", desc: "Editable Word table" },
              { format: "xlsx", label: "Export XLSX", desc: "Spreadsheet with filters" },
              { format: "csv", label: "Export CSV", desc: "Raw rows for analysis" },
            ].map((f) => (
              <button
                key={f.format}
                type="button"
                disabled={busy}
                onClick={() => ask(f.format)}
                className="rounded-xl border border-border p-3 text-left hover:bg-surface-2 disabled:opacity-50"
              >
                <div className="font-semibold">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
            <h2 className="text-sm font-semibold">Quick packs</h2>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => ask("csv", "trial-balance")}>
              Export trial balance CSV
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => ask("pdf", "profit-loss")}>
              Export P&L PDF
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => ask("xlsx", "day-book")}>
              Export Day Book XLSX
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
            <h2 className="text-sm font-semibold">Full data backup</h2>
          </div>
          <div className="space-y-2 p-4 text-sm text-muted-foreground">
            <p>
              Download this company's books as JSON. The file stays on this company and leaves out PINs, passwords, and
              tokens. It is not a server-wide database dump.
            </p>
            {canBackup ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => ask("json", "backup")}>
                Download company backup
              </Button>
            ) : (
              <p>Company backup needs the export backup permission.</p>
            )}
          </div>
        </section>

        {busy ? (
          <p className="text-sm text-muted-foreground" role="status">
            {t("export.running")}
          </p>
        ) : null}

        {success ? (
          <div
            role="status"
            className="rounded-xl border border-[hsl(var(--income))]/35 bg-[hsl(var(--income-soft))]/50 px-4 py-3 text-sm"
          >
            <p className="font-semibold text-foreground">{t("export.done")}</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                File: <span className="font-medium text-foreground">{success.filename}</span>
              </li>
              <li>
                Format: <span className="font-medium text-foreground">{success.format}</span>
              </li>
              <li>
                Rows: <span className="font-medium text-foreground">{success.rowCount}</span>
              </li>
              <li>
                Generated: <span className="font-medium text-foreground">{success.generatedAt}</span>
              </li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!success.bodyBase64}
                onClick={() => downloadAgain(success)}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                {t("export.download")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => companyNavigate(companyPath("export"))}>
                Open Export center
              </Button>
            </div>
          </div>
        ) : null}

        {err ? <p className="text-sm text-destructive">{err.startsWith("export.") ? t(err) : err}</p> : null}
        <PinConfirmDialog
          open={pinOpen}
          title={t("pin.title")}
          confirmLabel={t("export.download")}
          busy={busy}
          onCancel={() => setPinOpen(false)}
          onConfirm={(pin) => void run(pin)}
        />
      </div>
    </PermissionGate>
  );
}
