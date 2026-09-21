import { useEffect, useMemo, useRef, useState } from "react";
import { AnnotationMode } from "pdfjs-dist";
import { Upload, FileText, LockKeyhole, Loader2, Check, AlertTriangle, Download, ChevronLeft, ChevronRight, RotateCcw, Eye, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import { useNavStore } from "@/store/navStore";
import { apiRequest, isRetryableApiError } from "@/lib/apiClient";
import { getDB } from "@/db/database";
import { requireEmptyOutbox } from "@/services/durableOutbox";
import { BANKS, type BankId, type StatementAnalysis, type StatementDecision, type StatementImportRequest, type StatementImportResult, type StatementKind } from "@/services/statements/types";
import { analyzeStatement, reconcileStatement, statementPaise } from "@/services/statements/parser";
import { decisionProblems, monthlyStatementTotals, statementDuplicate, suggestStatementDecision } from "@/services/statements/classification";
import { openStatementPdf, sha256, type LoadedStatement } from "@/services/statements/pdf";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
const selectClass = "h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm text-foreground";
const purposeLabels: Record<StatementKind, string> = { income: "Income", expense: "Expense", transfer: "Own-account transfer", refund: "Expense refund", contribution: "Contribution return", cc_payment: "Credit-card payment" };
const bankAccountTypes = ["bank", "savings", "current", "debit_linked"];

function SourcePage({ loaded, page }: { loaded: LoadedStatement; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(200, entries[0].contentRect.width)));
    observer.observe(container.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void } | undefined;
    setError("");
    void loaded.document.getPage(page).then(async pdfPage => {
      if (cancelled || !canvas.current) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: Math.min(2, width / base.width * zoom) });
      const context = canvas.current.getContext("2d");
      if (!context) throw new Error("PDF preview is unavailable");
      canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
      const render = pdfPage.render({ canvas: canvas.current, canvasContext: context, viewport, annotationMode: AnnotationMode.DISABLE });
      task = render; await render.promise;
    }).catch(error => { if (!cancelled && error?.name !== "RenderingCancelledException") setError("Source page preview is unavailable."); });
    return () => { cancelled = true; task?.cancel(); };
  }, [loaded, page, width, zoom]);
  return <><div className="mb-2 flex items-center justify-end gap-2"><Button variant="outline" size="icon-sm" aria-label="Zoom out PDF" title="Zoom out PDF" disabled={zoom <= 1} onClick={() => setZoom(z => z - 0.5)}><ZoomOut className="h-4 w-4" /></Button><span className="w-10 text-center text-xs tabular-nums">{zoom * 100}%</span><Button variant="outline" size="icon-sm" aria-label="Zoom in PDF" title="Zoom in PDF" disabled={zoom >= 3} onClick={() => setZoom(z => z + 0.5)}><ZoomIn className="h-4 w-4" /></Button></div><div ref={container} className="min-h-40 w-full overflow-auto bg-white">{error && <p role="alert" className="p-3 text-sm text-red-700">{error}</p>}<canvas ref={canvas} aria-label={`Original statement page ${page}`} className="block max-w-none" /></div></>;
}

export default function StatementImportDialog({ onClose }: { onClose: () => void }) {
  const user = useAuthStore(s => s.currentUser);
  const accounts = useDataStore(s => s.accounts);
  const categories = useDataStore(s => s.categories);
  const cards = useDataStore(s => s.cards);
  const transactions = useDataStore(s => s.transactions);
  const requestConfirm = useUIStore(s => s.requestConfirm);
  const toast = useUIStore(s => s.toast);
  const [bank, setBank] = useState<BankId | "auto">("auto");
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loaded, setLoaded] = useState<LoadedStatement | null>(null);
  const [analysis, setAnalysis] = useState<StatementAnalysis | null>(null);
  const [decisions, setDecisions] = useState<Record<string, StatementDecision>>({});
  const [openingText, setOpeningText] = useState("");
  const [closingText, setClosingText] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [progress, setProgress] = useState("");
  const [passwordState, setPasswordState] = useState<"needed" | "incorrect" | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<StatementImportResult | null>(null);
  const [currencyConfirmed, setCurrencyConfirmed] = useState(false);
  const [ocrMode, setOcrMode] = useState<"auto" | "force" | "off">("auto");
  const [ocrSourceConfirmed, setOcrSourceConfirmed] = useState(false);
  const [page, setPage] = useState(1);
  const [sourcePage, setSourcePage] = useState(1);
  const [showSource, setShowSource] = useState(false);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [filter, setFilter] = useState("all");
  const controller = useRef<AbortController | null>(null);
  const currentPdf = useRef<LoadedStatement | null>(null);
  const passwordResolve = useRef<((value: string | null) => void) | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void useDataStore.getState().ensureCollections(["accounts", "categories", "transactions", "cards"], user).then(() => { if (active) setDataReady(true); }).catch(() => { if (active) setError("Account data could not be loaded. Reopen the statement importer after reconnecting."); });
    return () => { active = false; };
  }, [user?.id]);
  useEffect(() => () => { controller.current?.abort(); passwordResolve.current?.(null); void currentPdf.current?.destroy(); }, []);

  const availableAccounts = accounts.filter(a => !a.isDeleted && !a.isInactive && bankAccountTypes.includes(a.type));
  const opening = statementPaise(openingText, true), closing = statementPaise(closingText, true);
  const reconciliation = useMemo(() => analysis ? reconcileStatement(analysis.rows, opening, closing, analysis.order) : null, [analysis, opening, closing]);
  const rows = analysis?.rows ?? [];
  const included = rows.filter(row => decisions[row.id]?.include);
  const remaining = included.filter(row => decisionProblems(row, decisions[row.id], accountId).length > 0);
  const extractionProblems = [...(analysis?.issues ?? []), ...rows.flatMap(row => row.issues.map(issue => `Row ${row.id}: ${issue}`))];
  const months = [...new Set(rows.map(row => row.date.slice(0, 7)))].sort();
  const monthlyTotals = monthlyStatementTotals(rows, decisions);
  const visible = rows.filter(row => (!month || row.date.startsWith(month)) && (!query || `${row.description} ${row.reference}`.toLowerCase().includes(query.toLowerCase())) &&
    (filter === "all" || filter === "duplicates" && decisions[row.id]?.duplicate || filter === "review" && decisions[row.id]?.include && decisionProblems(row, decisions[row.id], accountId).length > 0));
  const pageCount = Math.max(1, Math.ceil(visible.length / 25));
  const pageRows = visible.slice((Math.min(page, pageCount) - 1) * 25, Math.min(page, pageCount) * 25);
  const ready = dataReady && !busy && !saving && !result && !!accountId && !!analysis?.bank && !!loaded && reconciliation?.matched && !extractionProblems.length && !remaining.length && included.length > 0 && currencyConfirmed && (!analysis.ocrPages?.length || ocrSourceConfirmed);

  async function close() {
    if (saving) return;
    if (analysis && !result && !await requestConfirm({ title: "Close statement review?", description: "Unimported review changes will be discarded. The original PDF is not stored by the app.", confirmLabel: "Close review" })) return;
    onClose();
  }
  async function reset() {
    if (analysis && !result && !await requestConfirm({ title: "Replace statement?", description: "Unimported review changes will be discarded.", confirmLabel: "Replace" })) return;
    controller.current?.abort(); passwordResolve.current?.(null); passwordResolve.current = null;
    await currentPdf.current?.destroy(); currentPdf.current = null;
    setLoaded(null); setAnalysis(null); setDecisions({}); setResult(null); setError(""); setFile(null); setPassword(""); setPasswordState(null); setCurrencyConfirmed(false); setPage(1); setQuery(""); setMonth(""); setFilter("all"); setShowSource(false);
  }
  function changeDecision(id: string, patch: Partial<StatementDecision>) {
    setDecisions(current => ({ ...current, [id]: { ...current[id], ...patch, reviewed: patch.reviewed ?? false } }));
  }
  async function analyze() {
    if (!file || !accountId || !user || !dataReady) return;
    setBusy(true); setError(""); setProgress("Opening PDF");
    setOcrSourceConfirmed(false);
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    try {
      const pdf = await openStatementPdf(file, { signal: abort.signal, ocr: ocrMode, ocrProgress: (page, total) => setProgress(`OCR: page ${page} of ${total}`), password: incorrect => new Promise(resolve => { passwordResolve.current = resolve; setPassword(""); setPasswordState(incorrect ? "incorrect" : "needed"); }), progress: (page, total) => setProgress(`Reading page ${page} of ${total}`) });
      if (abort.signal.aborted || useAuthStore.getState().currentUser?.id !== user.id) { await pdf.destroy(); return; }
      currentPdf.current = pdf;
      const parsed = analyzeStatement(pdf.pages, bank);
      const review = Object.fromEntries(parsed.rows.map(row => {
        const decision = suggestStatementDecision(row, categories);
        decision.duplicate = statementDuplicate(row, accountId, transactions);
        if (decision.duplicate) decision.include = false;
        return [row.id, decision];
      }));
      setLoaded(pdf); setAnalysis(parsed); setDecisions(review); setOpeningText(parsed.openingPaise === null ? "" : (parsed.openingPaise / 100).toFixed(2)); setClosingText(parsed.closingPaise === null ? "" : (parsed.closingPaise / 100).toFixed(2)); setSourcePage(1);
    } catch (error) { if (!abort.signal.aborted) setError(error instanceof Error ? error.message : "Statement analysis failed"); }
    finally { setBusy(false); setPasswordState(null); setPassword(""); passwordResolve.current = null; }
  }
  function downloadReview() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ analysis, decisions, openingPaise: opening, closingPaise: closing, ocrSourceConfirmed, importResult: result }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "statement-review.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function save() {
    if (!ready || !user || !analysis?.bank || !loaded || opening === null || closing === null) return;
    if (!await requestConfirm({ title: `Import ${included.length} reviewed transactions?`, description: `${rows.length - included.length} rows are excluded. Categories and personal/business choices are your confirmed decisions, not bank-verified facts.`, confirmLabel: "Import reviewed" })) return;
    setSaving(true); setError("");
    try {
      if (useAuthStore.getState().currentUser?.id !== user.id || useAuthStore.getState().locked) throw new Error("Sign in to the original account before importing.");
      await requireEmptyOutbox(getDB(), user.id);
      const content = { userId: user.id, bank: analysis.bank, accountId, documentHash: loaded.hash, parserVersion: analysis.parserVersion, openingPaise: opening, closingPaise: closing, order: analysis.order,
        rows: rows.map(row => { const { reason: _reason, duplicate: _duplicate, ...decision } = decisions[row.id]; return { ...row, decision }; }) };
      const sourceReview = analysis.ocrPages?.length ? { ocrSourceConfirmed } : {};
      const request: StatementImportRequest = { ...content, ...sourceReview, mutationId: `statement:${await sha256(JSON.stringify({ ...content, ...sourceReview }))}` };
      if (useAuthStore.getState().currentUser?.id !== user.id || useAuthStore.getState().locked) throw new Error("Account changed or locked before import");
      const body = JSON.stringify(request);
      if (new TextEncoder().encode(body).byteLength > 1048576) throw new Error("Statement exceeds the 1 MB reviewed-data limit. Export a shorter statement period.");
      const saved = await apiRequest<StatementImportResult>("/api/import/statement.php", { method: "POST", auth: true, body });
      setResult(saved);
      try { if (useAuthStore.getState().currentUser?.id === user.id) await useDataStore.getState().refreshOne("transactions", user); }
      catch { toast({ title: "Import saved", description: "Refresh the transaction list after reconnecting.", kind: "warning" }); }
    } catch (error) { setError(`${error instanceof Error ? error.message : "Import response unavailable"}${isRetryableApiError(error) ? ". Keep this review and retry unchanged to verify the result." : ""}`); }
    finally { setSaving(false); }
  }

  return <Dialog open onOpenChange={value => { if (!value) void close(); }}>
    <DialogContent size="xl" showClose={!saving} className="w-[calc(100vw-1rem)] max-w-[1280px] max-h-[calc(100dvh-1rem)] rounded-lg p-4 sm:p-6">
      <DialogHeader className="pr-8"><DialogTitle className="flex items-center gap-2 tracking-normal"><FileText className="h-5 w-5 shrink-0" />Bank Statement</DialogTitle></DialogHeader>
      {error && <p role="alert" className="mb-4 break-words border-l-2 border-danger pl-3 text-sm text-danger">{error}</p>}
      {!analysis ? <>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">Bank<select aria-label="Statement bank" className={selectClass} disabled={busy} value={bank} onChange={e => setBank(e.target.value as BankId | "auto")}><option value="auto">Detect from statement</option>{BANKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium">Destination account<select aria-label="Statement account" className={selectClass} disabled={busy || !dataReady} value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">Select a bank account</option>{availableAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        </div>
        {dataReady && !availableAccounts.length && <div className="mt-4 flex items-center justify-between gap-3 border-y border-border py-3"><span className="text-sm">No bank accounts</span><Button variant="outline" onClick={() => { onClose(); useNavStore.getState().setActive("accounts"); }}>Add account</Button></div>}
        <div className="mt-5 flex min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/30 p-4" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy && event.dataTransfer.files.length === 1) { setFile(event.dataTransfer.files[0]); setError(""); } }}>
          <Upload className="h-7 w-7 text-muted-foreground" />
          <input ref={fileInput} type="file" accept="application/pdf,.pdf" aria-label="Statement PDF" className="sr-only" disabled={busy} onChange={event => { setFile(event.target.files?.[0] ?? null); setError(""); }} />
          <Button variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}><Upload className="mr-2 h-4 w-4" />Select PDF</Button>
          <p className="max-w-full break-all text-sm text-muted-foreground">{file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : "PDF / 20 MB / 60 pages"}</p>
        </div>
        <label className="mt-4 grid max-w-sm gap-2 text-sm">Extraction<select aria-label="PDF extraction mode" className={selectClass} value={ocrMode} disabled={busy} onChange={e => setOcrMode(e.target.value as typeof ocrMode)}><option value="auto">Text + scanned-page OCR</option><option value="force">OCR every page (12-page limit)</option><option value="off">Text only</option></select></label>
        {passwordState && <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); if (!password) return; const resolve = passwordResolve.current; passwordResolve.current = null; setPasswordState(null); const value = password; setPassword(""); resolve?.(value); }}>
          <label className="grid min-w-0 flex-1 basis-48 gap-2 text-sm"><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4" />PDF password</span><Input type="password" aria-label="PDF password" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)} autoFocus /></label>
          <Button type="submit" disabled={!password}>Unlock PDF</Button>
          {passwordState === "incorrect" && <p role="alert" className="w-full text-sm text-danger">Incorrect PDF password. Use the password supplied with the bank statement.</p>}
        </form>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span role="status" className="text-sm text-muted-foreground">{busy ? progress : "PDF and password: this device only"}</span><div className="flex gap-2">{busy && <Button variant="outline" onClick={() => { controller.current?.abort(); passwordResolve.current?.(null); }}>Cancel</Button>}<Button disabled={busy || !file || !accountId || !dataReady} onClick={() => void analyze()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Analyze statement</Button></div></div>
      </> : <>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0"><h2 className="text-base font-semibold">{BANKS.find(b => b.id === analysis.bank)?.name ?? "Unidentified bank"}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{analysis.periodFrom ?? "Unknown date"} to {analysis.periodTo ?? "Unknown date"} / {rows.length} transactions / {analysis.pageCount} pages</p><p className="mt-1 break-all text-xs text-muted-foreground">{file?.name}</p></div>
          <div className="flex shrink-0 gap-2"><Button size="icon" variant="outline" aria-label="View source PDF" title="View source PDF" onClick={() => setShowSource(value => !value)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label="Download statement review" title="Download statement review" onClick={downloadReview}><Download className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label="Replace statement" title="Replace statement" disabled={saving} onClick={() => void reset()}><RotateCcw className="h-4 w-4" /></Button></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border pb-4 sm:grid-cols-4">
          <div><div className="text-xs text-muted-foreground">Total debits</div><div className="mt-1 break-all text-base font-semibold tabular-nums text-danger">{rows.length ? money(reconciliation?.debitPaise ?? 0) : "Unavailable"}</div></div>
          <div><div className="text-xs text-muted-foreground">Total credits</div><div className="mt-1 break-all text-base font-semibold tabular-nums text-emerald-600">{rows.length ? money(reconciliation?.creditPaise ?? 0) : "Unavailable"}</div></div>
          <div><div className="text-xs text-muted-foreground">Balance checks</div><div className="mt-1 text-sm font-semibold">{reconciliation?.matched && !extractionProblems.length ? "Arithmetic matched" : "Needs attention"}</div></div>
          <div><div className="text-xs text-muted-foreground">Review queue</div><div className="mt-1 text-sm font-semibold">{remaining.length} pending / {included.length} selected</div></div>
        </div>
        {(extractionProblems.length > 0 || reconciliation?.errors.length || analysis.warnings.length > 0) && <details open={extractionProblems.length > 0} className="my-3 border-l-2 border-amber-500 pl-3 text-sm"><summary className="cursor-pointer font-medium">{extractionProblems.length + (reconciliation?.errors.length ?? 0)} blocking checks / {analysis.warnings.length} notices</summary><ul className="mt-2 grid max-h-40 gap-1 overflow-y-auto text-xs">{[...extractionProblems, ...(reconciliation?.errors ?? []), ...analysis.warnings].slice(0, 100).map((issue, index) => <li key={index} className="break-words">{issue}</li>)}</ul></details>}
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Monthly analysis / {accounts.find(a => a.id === accountId)?.name}</summary><div className="mt-3 overflow-auto"><table className="w-full min-w-[600px] text-xs"><thead><tr>{["Month", "Debits", "Credits", "Reviewed income", "Reviewed expenses", "Refunds / contributions"].map(label => <th key={label} scope="col" className="border-b border-border p-2 text-left font-medium">{label}</th>)}</tr></thead><tbody>{monthlyTotals.map(total => <tr key={total.month}><th scope="row" className="p-2 text-left font-medium">{total.month}</th>{[total.debitPaise, total.creditPaise, total.reviewedIncomePaise, total.reviewedExpensePaise, total.reviewedRefundPaise].map((value, index) => <td key={index} className="whitespace-nowrap p-2 text-right tabular-nums">{money(value)}</td>)}</tr>)}</tbody></table></div></details>
        {!!analysis.ocrPages?.length && <label className="my-3 flex items-start gap-2 border-l-2 border-amber-500 pl-3 text-sm"><input type="checkbox" checked={ocrSourceConfirmed} disabled={saving || !!result} onChange={e => setOcrSourceConfirmed(e.target.checked)} />OCR dates, amounts and row completeness verified against the original PDF</label>}
        <div className="my-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs">Opening balance (INR)<Input aria-label="Statement opening balance" inputMode="decimal" value={openingText} disabled={saving || !!result} onChange={e => setOpeningText(e.target.value)} /></label>
          <label className="grid gap-1 text-xs">Closing balance (INR)<Input aria-label="Statement closing balance" inputMode="decimal" value={closingText} disabled={saving || !!result} onChange={e => setClosingText(e.target.value)} /></label>
          <label className="flex items-center gap-2 self-end py-2 text-xs"><input type="checkbox" checked={currencyConfirmed} disabled={saving || !!result} onChange={e => setCurrencyConfirmed(e.target.checked)} />INR account and source balances confirmed</label>
        </div>
        <div className={showSource ? "grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]" : "min-w-0"}>
          <div className="min-w-0">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Input aria-label="Search statement narration" placeholder="Search narration" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /><select aria-label="Statement month" className={selectClass} value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}><option value="">All months</option>{months.map(month => <option key={month}>{month}</option>)}</select><select aria-label="Statement row filter" className={selectClass} value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}><option value="all">All rows</option><option value="review">Needs review</option><option value="duplicates">Possible duplicates</option></select><select aria-label="Scope for selected rows" className={selectClass} value="" disabled={saving || !!result} onChange={e => { const scope = e.target.value as "personal" | "business"; setDecisions(current => Object.fromEntries(Object.entries(current).map(([id, d]) => [id, d.include ? { ...d, scope, reviewed: false } : d]))); }}><option value="">Selected scope</option><option value="personal">Personal</option><option value="business">Business</option></select></div>
            <div className="max-h-[48dvh] overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead className="sticky top-0 z-10 bg-surface"><tr>{["Include", "Date / narration", "Debit", "Credit", "Purpose / category", "Review"].map(label => <th key={label} scope="col" className="border-b border-border px-3 py-2 font-semibold">{label}</th>)}</tr></thead><tbody>
                {pageRows.map(row => {
                  const decision = decisions[row.id];
                  const categoryType = decision.kind === "income" ? "income" : "expense";
                  const rowCategories = categories.filter(category => !category.isDeleted && !category.archived && (category.appliesTo === categoryType || category.appliesTo === "mixed"));
                  const counterparts = decision.kind === "cc_payment" ? cards.filter(c => !c.isDeleted && c.type === "credit").map(c => ({ id: c.id, label: c.nickname })) : ["refund", "contribution"].includes(decision.kind) ? transactions.filter(t => !t.isDeleted && t.type === "expense" && t.categoryId === decision.categoryId).map(t => ({ id: t.id, label: `${t.date.slice(0, 10)} ${t.description || t.merchantOrPerson} ${money(t.amountPaise ?? Math.round(t.amount * 100))}` })) : accounts.filter(a => !a.isDeleted && !a.isInactive && a.id !== accountId).map(a => ({ id: a.id, label: a.name }));
                  return <tr key={row.id} data-statement-row={row.id} className="border-b border-border align-top last:border-b-0"><td className="px-3 py-3"><input type="checkbox" aria-label={`Include row ${row.id}`} checked={decision.include} disabled={saving || !!result || row.issues.length > 0} onChange={e => changeDecision(row.id, { include: e.target.checked })} /></td>
                    <td className="max-w-64 px-3 py-3"><div className="font-medium">{row.date}</div><div className="mt-1 whitespace-normal break-words">{row.description}</div>{row.valueDate && <div className="mt-1 text-muted-foreground">Value date: {row.valueDate}</div>}<button className="mt-1 underline text-muted-foreground" onClick={() => { setSourcePage(row.page); setShowSource(true); }}>Page {row.page} / balance {row.balancePaise === null ? "unknown" : money(row.balancePaise)}</button>{decision.duplicate && <p className="mt-2 break-words text-amber-700">{decision.duplicate}</p>}{row.issues.map(issue => <p key={issue} className="mt-1 text-danger">{issue}</p>)}</td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums">{row.debitPaise ? money(row.debitPaise) : "-"}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{row.creditPaise ? money(row.creditPaise) : "-"}</td>
                    <td className="min-w-48 max-w-56 px-3 py-3"><div className="grid gap-2"><select aria-label={`Purpose row ${row.id}`} className={selectClass} value={decision.kind} disabled={saving || !!result || !decision.include} onChange={e => changeDecision(row.id, { kind: e.target.value as StatementKind | "", categoryId: "", counterpartId: "" })}><option value="">Choose purpose</option>{Object.entries(purposeLabels).filter(([kind]) => kind === "transfer" || row.creditPaise ? ["income", "refund", "contribution", "transfer"].includes(kind) : ["expense", "transfer", "cc_payment"].includes(kind)).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select>
                      {["income", "expense", "refund", "contribution"].includes(decision.kind) && <select aria-label={`Category row ${row.id}`} className={selectClass} value={decision.categoryId} disabled={saving || !!result || !decision.include} onChange={e => changeDecision(row.id, { categoryId: e.target.value, ...(["refund", "contribution"].includes(decision.kind) ? { counterpartId: "" } : {}) })}><option value="">{rowCategories.length ? "Choose category" : "No matching categories"}</option>{rowCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
                      {["transfer", "cc_payment", "refund", "contribution"].includes(decision.kind) && <select aria-label={`Linked record row ${row.id}`} className={selectClass} value={decision.counterpartId} disabled={saving || !!result || !decision.include} onChange={e => changeDecision(row.id, { counterpartId: e.target.value })}><option value="">{["refund", "contribution"].includes(decision.kind) ? "Original expense" : decision.kind === "transfer" ? "Other account" : "Credit card"}</option>{counterparts.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>}
                      <select aria-label={`Scope row ${row.id}`} className={selectClass} value={decision.scope} disabled={saving || !!result || !decision.include} onChange={e => changeDecision(row.id, { scope: e.target.value as "personal" | "business" | "" })}><option value="">Choose scope</option><option value="personal">Personal</option><option value="business">Business</option></select><p className="max-w-52 whitespace-normal break-words text-muted-foreground">{decision.reason}</p></div></td>
                    <td className="px-3 py-3"><label className="flex items-center gap-2"><input type="checkbox" aria-label={`Reviewed row ${row.id}`} checked={decision.reviewed} disabled={saving || !!result || !decision.include} onChange={e => changeDecision(row.id, { reviewed: e.target.checked })} />Reviewed</label></td></tr>;
                })}
                {!pageRows.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No matching transactions</td></tr>}
              </tbody></table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{visible.length} matching rows / page {Math.min(page, pageCount)} of {pageCount}</span><div className="flex items-center gap-2"><Button size="icon-sm" variant="outline" aria-label="Previous transaction page" title="Previous page" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon-sm" variant="outline" aria-label="Next transaction page" title="Next page" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
          </div>
          {showSource && loaded && <aside className="min-w-0 border-l-0 border-border lg:border-l lg:pl-4"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-medium">Original PDF / page {sourcePage}</h3><div className="flex gap-2"><Button size="icon-sm" variant="outline" aria-label="Previous PDF page" title="Previous PDF page" disabled={sourcePage <= 1} onClick={() => setSourcePage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon-sm" variant="outline" aria-label="Next PDF page" title="Next PDF page" disabled={sourcePage >= analysis.pageCount} onClick={() => setSourcePage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div><div className="max-h-[55dvh] overflow-auto"><SourcePage loaded={loaded} page={sourcePage} /></div></aside>}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {result ? <p role="status" className="text-sm font-medium text-emerald-600">{result.imported} imported / {result.duplicates} already imported / {result.skipped} excluded</p> : <p className="text-xs text-muted-foreground">{!rows.length ? "No transactions extracted" : remaining.length ? `${remaining.length} selected rows still need review` : included.length ? "Selected rows reviewed" : "No rows selected"}{!reconciliation?.matched || extractionProblems.length ? " / balance or extraction checks unresolved" : ""}</p>}
          <div className="flex flex-wrap gap-2">{!result && <Button variant="outline" disabled={saving || !included.length} onClick={() => setDecisions(current => Object.fromEntries(Object.entries(current).map(([id, d]) => { const row = rows.find(r => r.id === id)!; return [id, d.include && !decisionProblems(row, { ...d, reviewed: true }, accountId).length ? { ...d, reviewed: true } : d]; })))}><Check className="mr-2 h-4 w-4" />Confirm selected</Button>}{result ? <Button onClick={onClose}>Done</Button> : <Button disabled={!ready} onClick={() => void save()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import reviewed</Button>}</div>
        </div>
      </>}
      {!analysis && !busy && <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Categories are suggestions. Bank format certification is pending.</div>}
    </DialogContent>
  </Dialog>;
}
