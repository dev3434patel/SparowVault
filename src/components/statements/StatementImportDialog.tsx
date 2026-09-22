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
import { validateStatementCompleteness, toVerifierRows, type PrintedEvidence } from "@/services/statements/verifier";
import { detectOcrFieldUncertainty } from "@/services/statements/ocrUncertainty";
import { decisionProblems, monthlyStatementTotals, statementDuplicate, suggestStatementDecision, canBulkConfirmDecision } from "@/services/statements/classification";
import { openStatementPdf, sha256, type LoadedStatement } from "@/services/statements/pdf";
import { supportLabelForBank } from "@/services/statements/layoutRegistry";
import { clearStatementDraft, draftMatchesFile, loadStatementDraft, saveStatementDraft } from "@/services/statements/draft";
import { reportBankMonthsFromRows, reportEconomicMonth } from "@/services/statements/reports";
import { proposeStatementMatches } from "@/services/statements/matching";
import { buildObservationsFromAnalysis } from "@/services/statements/observations";
import { applyFieldCorrection } from "@/services/statements/reviewState";
import { buildServerAlignedDigestMaterial, sha256Hex } from "@/services/statements/reviewDigest";
import { pageTopDownToViewportCss, viewerRenderScale } from "@/services/statements/geometry";
import { accountMonthUnionToCsv, buildStatementExportBundle } from "@/services/statements/exportBundle";
import { accountMonthUnionFromDocuments, sourceDocumentStats } from "@/services/statements/reports";
import { routeStatementDocumentClass, parseSyntheticCardFixture } from "@/services/statements/cardDocument";

const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise / 100);
const selectClass = "h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm text-foreground";
const purposeLabels: Record<StatementKind, string> = { income: "Income", expense: "Expense", transfer: "Own-account transfer", refund: "Expense refund", contribution: "Contribution return", cc_payment: "Credit-card payment" };
const bankAccountTypes = ["bank", "savings", "current", "debit_linked"];

function SourcePage({ loaded, page, highlight }: { loaded: LoadedStatement; page: number; highlight?: { page: number; x: number; y: number; width: number; height: number } | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
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
      const rotation = ((pdfPage.rotate % 360) + 360) % 360 as 0 | 90 | 180 | 270;
      const base = pdfPage.getViewport({ scale: 1, rotation });
      const scale = viewerRenderScale({ containerWidth: width, pageWidth: base.width, zoom });
      const viewport = pdfPage.getViewport({ scale, rotation });
      const context = canvas.current.getContext("2d");
      if (!context) throw new Error("PDF preview is unavailable");
      canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
      if (overlay.current) {
        overlay.current.width = canvas.current.width;
        overlay.current.height = canvas.current.height;
        const octx = overlay.current.getContext("2d");
        if (octx) {
          octx.clearRect(0, 0, overlay.current.width, overlay.current.height);
          if (highlight && highlight.page === page) {
            const view = pdfPage.view ?? [0, 0, 612, 792];
            const pageWidth = Math.abs(view[2] - view[0]) || 612;
            const pageHeight = Math.abs(view[3] - view[1]) || 792;
            const css = pageTopDownToViewportCss(
              { x: highlight.x, y: highlight.y, width: highlight.width, height: highlight.height },
              { width: pageWidth, height: pageHeight, rotation },
              scale,
            );
            octx.strokeStyle = "rgba(220, 38, 38, 0.95)";
            octx.lineWidth = 2;
            octx.strokeRect(css.x, css.y, css.width, css.height);
            octx.fillStyle = "rgba(220, 38, 38, 0.12)";
            octx.fillRect(css.x, css.y, css.width, css.height);
          }
        }
      }
      const render = pdfPage.render({ canvas: canvas.current, canvasContext: context, viewport, annotationMode: AnnotationMode.DISABLE });
      task = render; await render.promise;
    }).catch(error => { if (!cancelled && error?.name !== "RenderingCancelledException") setError("Source page preview is unavailable."); });
    return () => { cancelled = true; task?.cancel(); };
  }, [loaded, page, width, zoom, highlight]);
  return <><div className="mb-2 flex items-center justify-end gap-2"><Button variant="outline" size="icon-sm" aria-label="Zoom out PDF" title="Zoom out PDF" disabled={zoom <= 0.75} onClick={() => setZoom(z => Math.max(0.75, z - 0.25))}><ZoomOut className="h-4 w-4" /></Button><span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span><Button variant="outline" size="icon-sm" aria-label="Zoom in PDF" title="Zoom in PDF" disabled={zoom >= 2} onClick={() => setZoom(z => Math.min(2, z + 0.25))}><ZoomIn className="h-4 w-4" /></Button></div><div ref={container} className="relative min-h-40 w-full overflow-auto bg-white">{error && <p role="alert" className="p-3 text-sm text-red-700">{error}</p>}<canvas ref={canvas} aria-label={`Original statement page ${page}`} className="block max-w-none" /><canvas ref={overlay} aria-hidden className="pointer-events-none absolute left-0 top-0 max-w-none" /></div></>;
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
  const [cardId, setCardId] = useState("");
  const [documentClass, setDocumentClass] = useState<"deposit_account" | "credit_card" | "unknown">("unknown");
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
  const [reviewRevision, setReviewRevision] = useState(0);
  const [sourceEvidence, setSourceEvidence] = useState<PrintedEvidence>({});
  const [fieldEdits, setFieldEdits] = useState<Record<string, { amountPaise?: number; date?: string; reason?: string }>>({});
  const [highlightBox, setHighlightBox] = useState<{ page: number; x: number; y: number; width: number; height: number } | null>(null);
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
  const availableCards = cards.filter(c => !c.isDeleted && !c.isInactive && c.type === "credit");
  const opening = statementPaise(openingText, true), closing = statementPaise(closingText, true);
  const reconciliation = useMemo(() => {
    if (!analysis || documentClass === "credit_card") return documentClass === "credit_card" ? { matched: true, errors: [] as string[], debitPaise: 0, creditPaise: 0, netPaise: 0 } : null;
    return reconcileStatement(analysis.rows, opening, closing, analysis.order);
  }, [analysis, opening, closing, documentClass]);
  const completeness = useMemo(
    () => (analysis ? validateStatementCompleteness(toVerifierRows(analysis.rows), sourceEvidence) : null),
    [analysis, sourceEvidence],
  );
  const observations = useMemo(() => (analysis ? buildObservationsFromAnalysis(analysis) : null), [analysis]);
  const ocrFieldBlocks = useMemo(() => {
    if (!analysis?.ocrPages?.length) return [] as string[];
    const blocks: string[] = [];
    for (const row of analysis.rows) {
      for (const field of ["amount", "date", "direction", "balance"] as const) {
        const text = field === "amount"
          ? String((row.debitPaise || row.creditPaise) / 100)
          : field === "date"
            ? row.date
            : field === "direction"
              ? (row.debitPaise > 0 ? "DR" : "CR")
              : String(row.balancePaise ?? "");
        const issue = detectOcrFieldUncertainty({ sourceText: text, field, pageConfidence: 85 });
        if (issue) blocks.push(`Row ${row.id} ${field}: ${issue.reason}`);
      }
    }
    return blocks.slice(0, 20);
  }, [analysis]);
  const rows = analysis?.rows ?? [];
  const included = rows.filter(row => decisions[row.id]?.include);
  const remaining = included.filter(row => decisionProblems(row, decisions[row.id], accountId || cardId).length > 0);
  const extractionProblems = [...(analysis?.issues ?? []), ...rows.flatMap(row => row.issues.map(issue => `Row ${row.id}: ${issue}`))];
  const completenessBlocked = completeness?.status === "incomplete";
  const ocrUncertaintyBlocked = !!analysis?.ocrPages?.length && !ocrSourceConfirmed;
  const months = [...new Set(rows.map(row => row.date.slice(0, 7)))].sort();
  const monthlyTotals = monthlyStatementTotals(rows, decisions);
  const bankMonths = useMemo(() => reportBankMonthsFromRows(rows, analysis?.periodFrom, analysis?.periodTo), [rows, analysis?.periodFrom, analysis?.periodTo]);
  const economicMonths = useMemo(() => reportEconomicMonth(rows, decisions), [rows, decisions]);
  const matchProposals = useMemo(
    () => (analysis && accountId ? proposeStatementMatches(rows, accountId, transactions) : []),
    [analysis, accountId, rows, transactions],
  );
  const suggestedMatchCount = matchProposals.filter((m) => m.status === "suggested").length;
  const workflowStage = result ? "Receipt" : !analysis ? "Analyze" : !reconciliation?.matched || extractionProblems.length || completenessBlocked ? "Validate" : remaining.length || !currencyConfirmed ? "Review" : "Preview";
  const visible = rows.filter(row => (!month || row.date.startsWith(month)) && (!query || `${row.description} ${row.reference}`.toLowerCase().includes(query.toLowerCase())) &&
    (filter === "all" || filter === "duplicates" && decisions[row.id]?.duplicate || filter === "review" && decisions[row.id]?.include && decisionProblems(row, decisions[row.id], accountId || cardId).length > 0));
  const pageCount = Math.max(1, Math.ceil(visible.length / 25));
  const pageRows = visible.slice((Math.min(page, pageCount) - 1) * 25, Math.min(page, pageCount) * 25);
  const ready = dataReady && !busy && !saving && !result && !!analysis?.bank && !!loaded && !!reconciliation?.matched && !extractionProblems.length && !completenessBlocked && !ocrUncertaintyBlocked && !remaining.length && included.length > 0 && currencyConfirmed && (!analysis.ocrPages?.length || ocrSourceConfirmed) && (documentClass === "credit_card" ? !!cardId : !!accountId);

  async function close() {
    if (saving) return;
    if (analysis && !result && !await requestConfirm({ title: "Close statement review?", description: "Unimported review changes will be discarded. The original PDF is not stored by the app.", confirmLabel: "Close review" })) return;
    onClose();
  }
  async function reset() {
    if (analysis && !result && !await requestConfirm({ title: "Replace statement?", description: "Unimported review changes will be discarded.", confirmLabel: "Replace" })) return;
    controller.current?.abort(); passwordResolve.current?.(null); passwordResolve.current = null;
    await currentPdf.current?.destroy(); currentPdf.current = null;
    setLoaded(null); setAnalysis(null); setDecisions({}); setResult(null); setError(""); setFile(null); setPassword(""); setPasswordState(null); setCurrencyConfirmed(false); setPage(1); setQuery(""); setMonth(""); setFilter("all"); setShowSource(false); setReviewRevision(0); setSourceEvidence({}); setFieldEdits({}); setHighlightBox(null); setDocumentClass("unknown"); setCardId("");
  }
  function changeDecision(id: string, patch: Partial<StatementDecision>) {
    setReviewRevision((n) => n + 1);
    setDecisions(current => ({ ...current, [id]: { ...current[id], ...patch, reviewed: patch.reviewed ?? false } }));
  }
  function setAllIncludedReviewed(reviewed: boolean) {
    setReviewRevision((n) => n + 1);
    setDecisions((current) => Object.fromEntries(Object.entries(current).map(([id, d]) => [
      id,
      d.include ? { ...d, reviewed } : d,
    ])));
  }
  function changeBalances(kind: "opening" | "closing", value: string) {
    setReviewRevision((n) => n + 1);
    setCurrencyConfirmed(false);
    if (kind === "opening") setOpeningText(value);
    else setClosingText(value);
  }
  async function analyze() {
    if (!file || !user || !dataReady) return;
    if (!accountId && !cardId) return;
    setBusy(true); setError(""); setProgress("Opening PDF");
    setOcrSourceConfirmed(false);
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort;
    try {
      const pdf = await openStatementPdf(file, { signal: abort.signal, ocr: ocrMode, ocrProgress: (page, total) => setProgress(`OCR: page ${page} of ${total}`), password: incorrect => new Promise(resolve => { passwordResolve.current = resolve; setPassword(""); setPasswordState(incorrect ? "incorrect" : "needed"); }), progress: (page, total) => setProgress(`Reading page ${page} of ${total}`) });
      if (abort.signal.aborted || useAuthStore.getState().currentUser?.id !== user.id) { await pdf.destroy(); return; }
      currentPdf.current = pdf;
      const pageText = pdf.pages.flatMap((p) => p.tokens.map((t) => t.text)).join(" ");
      const detected = routeStatementDocumentClass(pageText);
      const resolvedClass = detected === "unknown" ? (cardId ? "credit_card" : "deposit_account") : detected;
      setDocumentClass(resolvedClass);
      if (resolvedClass === "credit_card" && !cardId) {
        await pdf.destroy(); currentPdf.current = null;
        setError("This looks like a credit-card statement. Select a credit card destination before analyzing.");
        return;
      }
      if (resolvedClass === "deposit_account" && !accountId) {
        await pdf.destroy(); currentPdf.current = null;
        setError("Select a bank account destination for this deposit statement.");
        return;
      }
      const parsed = analyzeStatement(pdf.pages, bank);
      if (resolvedClass === "credit_card") {
        parsed.warnings = [...(parsed.warnings || []), "Credit-card document class: liability arithmetic applies; deposit running-balance posting is not used."];
      }
      const review = Object.fromEntries(parsed.rows.map(row => {
        const decision = suggestStatementDecision(row, categories);
        decision.duplicate = statementDuplicate(row, accountId || cardId, transactions);
        if (decision.duplicate) decision.include = false;
        return [row.id, decision];
      }));
      const existingDraft = loadStatementDraft(user.id);
      let nextDecisions = review;
      let nextOpening = parsed.openingPaise === null ? "" : (parsed.openingPaise / 100).toFixed(2);
      let nextClosing = parsed.closingPaise === null ? "" : (parsed.closingPaise / 100).toFixed(2);
      if (existingDraft && draftMatchesFile(existingDraft, pdf.hash, user.id) && existingDraft.accountId === (accountId || cardId)) {
        // Keep user choices from the draft, but fill empty purpose/scope/category from fresh suggestions.
        nextDecisions = Object.fromEntries(Object.entries(review).map(([id, suggested]) => {
          const saved = (existingDraft.decisions as Record<string, StatementDecision>)[id];
          if (!saved) return [id, suggested];
          return [id, {
            ...suggested,
            ...saved,
            kind: saved.kind || suggested.kind,
            scope: saved.scope || suggested.scope,
            categoryId: saved.categoryId || suggested.categoryId,
            counterpartId: saved.counterpartId || suggested.counterpartId,
            reason: saved.kind ? (saved.reason || suggested.reason) : suggested.reason,
            duplicate: suggested.duplicate,
            include: suggested.duplicate ? false : saved.include,
          }];
        }));
        nextOpening = existingDraft.openingText || nextOpening;
        nextClosing = existingDraft.closingText || nextClosing;
        setCurrencyConfirmed(existingDraft.currencyConfirmed);
        setOcrSourceConfirmed(existingDraft.ocrSourceConfirmed);
      } else if (existingDraft && existingDraft.userId === user.id) {
        clearStatementDraft(user.id);
      }
      setLoaded(pdf); setAnalysis(parsed); setDecisions(nextDecisions); setOpeningText(nextOpening); setClosingText(nextClosing); setSourcePage(1); setReviewRevision(0); setSourceEvidence({}); setFieldEdits({}); setHighlightBox(null);
    } catch (error) { if (!abort.signal.aborted) setError(error instanceof Error ? error.message : "Statement analysis failed"); }
    finally { setBusy(false); setPasswordState(null); setPassword(""); passwordResolve.current = null; }
  }
  function downloadReview() {
    const sourceStats = sourceDocumentStats(loaded?.hash ?? "review", rows);
    const union = accountMonthUnionFromDocuments([{
      documentId: loaded?.hash ?? "review",
      rows: rows.map((r) => ({
        occurrenceId: r.id,
        bookingDate: r.date,
        debitPaise: r.debitPaise,
        creditPaise: r.creditPaise,
        fingerprint: `${r.date}|${r.debitPaise}|${r.creditPaise}|${r.description}`,
        resolvedObservationId: decisions[r.id]?.matchTransactionId ? `matched:${decisions[r.id].matchTransactionId}` : undefined,
      })),
    }]);
    const bundle = buildStatementExportBundle({
      parserVersion: analysis?.parserVersion ?? "unknown",
      documentHash: loaded?.hash ?? null,
      sourceDocuments: [sourceStats],
      accountMonthUnion: union,
      bankMonths,
      economicMonths,
    });
    const url = URL.createObjectURL(new Blob([JSON.stringify({
      analysis,
      decisions,
      openingPaise: opening,
      closingPaise: closing,
      ocrSourceConfirmed,
      reviewRevision,
      fieldEdits,
      completeness,
      observations,
      importResult: result,
      exportBundle: bundle,
      accountMonthCsv: accountMonthUnionToCsv(union),
    }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "statement-review.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function correctRowField(rowId: string, patch: { amountPaise?: number; date?: string; direction?: "debit" | "credit"; balancePaise?: number | null }, reason: string) {
    if (!analysis) return;
    setReviewRevision((n) => n + 1);
    setCurrencyConfirmed(false);
    setFieldEdits((current) => ({ ...current, [rowId]: { ...current[rowId], ...patch, reason } }));
    setAnalysis((current) => {
      if (!current) return current;
      return {
        ...current,
        rows: current.rows.map((row) => (row.id === rowId ? applyFieldCorrection(row, patch) : row)),
      };
    });
    setDecisions((current) => ({
      ...current,
      [rowId]: { ...current[rowId], reviewed: false },
    }));
  }
  function confirmMatch(occurrenceId: string, transactionId: string) {
    setReviewRevision((n) => n + 1);
    changeDecision(occurrenceId, { include: false, reviewed: true, matchTransactionId: transactionId });
  }
  async function save() {
    if (!ready || !user || !analysis?.bank || !loaded || opening === null || closing === null) return;
    if (!await requestConfirm({ title: `Import ${included.length} reviewed transactions?`, description: `${rows.length - included.length} rows are excluded. Categories and personal/business choices are your confirmed decisions, not bank-verified facts.`, confirmLabel: "Import reviewed" })) return;
    setSaving(true); setError("");
    try {
      if (useAuthStore.getState().currentUser?.id !== user.id || useAuthStore.getState().locked) throw new Error("Sign in to the original account before importing.");
      await requireEmptyOutbox(getDB(), user.id);

      if (documentClass === "credit_card") {
        if (!cardId) throw new Error("Select a credit card before importing a card statement.");
        const cardRows = included.map((row) => {
          const d = decisions[row.id];
          const isDebit = row.debitPaise > 0;
          const amountPaise = isDebit ? row.debitPaise : row.creditPaise;
          const direction = isDebit ? "debit" as const : "credit" as const;
          const kindHint = d.kind === "refund" ? "refund" as const : isDebit ? "purchase" as const : d.kind === "cc_payment" ? "payment" as const : "other" as const;
          // Payments must be matched to bank cc_payment (include:false); other credits post as refunds.
          if (!isDebit && kindHint === "payment") {
            return {
              id: row.id,
              page: row.page,
              date: row.date,
              description: row.description,
              reference: row.reference,
              amountPaise,
              direction,
              kindHint,
              issues: row.issues,
              decision: { include: false, reviewed: true, kind: "cc_payment" as const, categoryId: d.categoryId, scope: d.scope || "personal", counterpartId: d.counterpartId || "", matchTransactionId: d.matchTransactionId || "" },
            };
          }
          return {
            id: row.id,
            page: row.page,
            date: row.date,
            description: row.description,
            reference: row.reference,
            amountPaise,
            direction,
            kindHint: kindHint === "payment" ? "other" as const : kindHint,
            issues: row.issues,
            decision: {
              include: true,
              reviewed: true,
              kind: (isDebit ? "expense" : "refund") as StatementKind,
              categoryId: d.categoryId,
              scope: d.scope || "personal",
              counterpartId: d.counterpartId || "",
              matchTransactionId: d.matchTransactionId,
            },
          };
        });
        const fixture = parseSyntheticCardFixture({
          previousBalancePaise: opening,
          rows: cardRows.map((r) => ({
            id: r.id,
            bookingDate: r.date,
            narration: r.description,
            amountPaise: r.amountPaise,
            direction: r.direction,
            kindHint: r.kindHint === "payment" ? "payment" : r.kindHint === "refund" ? "refund" : r.direction === "debit" ? "purchase" : "other",
          })),
        });
        if (fixture.closingLiabilityPaise !== closing) {
          throw new Error(`Card liability does not reconcile: previous + increases − decreases = ${fixture.closingLiabilityPaise}, closing ${closing}`);
        }
        const cardRequest = {
          userId: user.id,
          cardId,
          issuer: analysis.bank,
          documentHash: loaded.hash,
          parserVersion: "statement-card-v1",
          previousBalancePaise: opening,
          closingLiabilityPaise: closing,
          statementDate: analysis.periodTo,
          rows: cardRows,
          mutationId: `statement-card:${await sha256(JSON.stringify({ hash: loaded.hash, cardId, rows: cardRows }))}`,
        };
        const body = JSON.stringify(cardRequest);
        if (new TextEncoder().encode(body).byteLength > 1048576) throw new Error("Statement exceeds the 1 MB reviewed-data limit.");
        const saved = await apiRequest<StatementImportResult>("/api/import/statement-card.php", { method: "POST", auth: true, body });
        clearStatementDraft(user.id);
        setResult(saved);
        try { if (useAuthStore.getState().currentUser?.id === user.id) await useDataStore.getState().refreshOne("transactions", user); }
        catch { toast({ title: "Import saved", description: "Refresh the transaction list after reconnecting.", kind: "warning" }); }
        return;
      }

      const importRows = rows.map(row => {
        const { reason: _reason, duplicate: _duplicate, suggestedKind: _sk, proposalStrength: _ps, ...decision } = decisions[row.id];
        return { ...row, decision };
      });
      const evidencePayload = Object.keys(sourceEvidence).length ? { ...sourceEvidence, evidenceOrigin: sourceEvidence.evidenceOrigin ?? "human_provided" } : {};
      const reviewDigest = await sha256Hex(buildServerAlignedDigestMaterial({
        accountId,
        bank: analysis.bank,
        documentHash: loaded.hash,
        parserVersion: analysis.parserVersion,
        openingPaise: opening,
        closingPaise: closing,
        order: analysis.order,
        rows: importRows.map((row) => ({
          id: row.id,
          date: row.date,
          debitPaise: row.debitPaise,
          creditPaise: row.creditPaise,
          balancePaise: row.balancePaise,
          description: row.description,
          reference: row.reference,
          decision: {
            include: row.decision.include,
            reviewed: row.decision.reviewed,
            kind: row.decision.kind,
            categoryId: row.decision.categoryId,
            scope: row.decision.scope,
            counterpartId: row.decision.counterpartId,
            matchTransactionId: row.decision.matchTransactionId,
          },
        })),
        sourceEvidence: evidencePayload,
        reviewRevision,
      }));
      const content = { userId: user.id, bank: analysis.bank, accountId, documentHash: loaded.hash, parserVersion: analysis.parserVersion, openingPaise: opening, closingPaise: closing, order: analysis.order,
        rows: importRows,
        sourceEvidence: Object.keys(evidencePayload).length ? evidencePayload : undefined,
        confirmedMatches: Object.entries(decisions).filter(([, d]) => !d.include && d.matchTransactionId).map(([occurrenceId, d]) => ({ occurrenceId, transactionId: d.matchTransactionId! })),
        reviewRevision,
        reviewDigest,
      };
      const sourceReview = analysis.ocrPages?.length ? { ocrSourceConfirmed } : {};
      const request: StatementImportRequest = { ...content, ...sourceReview, mutationId: `statement:${await sha256(JSON.stringify({ ...content, ...sourceReview }))}` };
      if (useAuthStore.getState().currentUser?.id !== user.id || useAuthStore.getState().locked) throw new Error("Account changed or locked before import");
      const body = JSON.stringify(request);
      if (new TextEncoder().encode(body).byteLength > 1048576) throw new Error("Statement exceeds the 1 MB reviewed-data limit. Export a shorter statement period.");
      const saved = await apiRequest<StatementImportResult>("/api/import/statement.php", { method: "POST", auth: true, body });
      clearStatementDraft(user.id);
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
          <label className="grid gap-2 text-sm font-medium">Bank account<select aria-label="Statement account" className={selectClass} disabled={busy || !dataReady} value={accountId} onChange={e => { setAccountId(e.target.value); if (e.target.value) setCardId(""); }}><option value="">Select a bank account</option>{availableAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium sm:col-span-2">Or credit card (card PDF path)<select aria-label="Statement credit card" className={selectClass} disabled={busy || !dataReady} value={cardId} onChange={e => { setCardId(e.target.value); if (e.target.value) setAccountId(""); }}><option value="">Select a credit card</option>{availableCards.map(card => <option key={card.id} value={card.id}>{card.nickname || card.last4 || card.id}</option>)}</select></label>
        </div>
        {documentClass === "credit_card" && <p className="mt-2 text-xs text-muted-foreground" role="status">Credit-card document class detected — liability arithmetic will be used (not deposit running balance).</p>}
        {dataReady && !availableAccounts.length && !availableCards.length && <div className="mt-4 flex items-center justify-between gap-3 border-y border-border py-3"><span className="text-sm">No bank accounts or cards</span><Button variant="outline" onClick={() => { onClose(); useNavStore.getState().setActive("accounts"); }}>Add account</Button></div>}
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
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span role="status" className="text-sm text-muted-foreground">{busy ? progress : "PDF and password: this device only"}</span><div className="flex gap-2">{busy && <Button variant="outline" onClick={() => { controller.current?.abort(); passwordResolve.current?.(null); }}>Cancel</Button>}<Button disabled={busy || !file || !(accountId || cardId) || !dataReady} onClick={() => void analyze()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Analyze statement</Button></div></div>
      </> : <>
        <nav aria-label="Statement import stages" className="mb-3 flex flex-wrap gap-2 text-xs">
          {(["Analyze", "Validate", "Review", "Preview", "Commit", "Receipt"] as const).map(stage => (
            <span key={stage} className={`rounded border px-2 py-1 ${workflowStage === stage || (stage === "Commit" && saving) ? "border-foreground font-semibold" : "border-border text-muted-foreground"}`}>{stage}</span>
          ))}
        </nav>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0"><h2 className="text-base font-semibold">{BANKS.find(b => b.id === analysis.bank)?.name ?? "Unidentified bank"}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{analysis.periodFrom ?? "Unknown date"} to {analysis.periodTo ?? "Unknown date"} / {rows.length} transactions / {analysis.pageCount} pages</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{analysis.bank ? supportLabelForBank(analysis.bank) : "Unsupported or unknown layout"}</p><p className="mt-1 break-all text-xs text-muted-foreground">{file?.name}</p></div>
          <div className="flex shrink-0 flex-wrap gap-2"><Button size="sm" variant="outline" disabled={saving || !!result || !user || !loaded} onClick={() => { if (!user || !loaded || !analysis) return; saveStatementDraft({ userId: user.id, documentHash: loaded.hash, fileName: file?.name ?? "statement.pdf", bank: analysis.bank, accountId: accountId || cardId, parserVersion: analysis.parserVersion, openingText, closingText, decisions, currencyConfirmed, ocrSourceConfirmed }); toast({ title: "Draft saved", description: "PDF password is never stored. Reselect the same file to resume.", kind: "info" }); }}>Save draft</Button><Button size="icon" variant="outline" aria-label="View source PDF" title="View source PDF" onClick={() => setShowSource(value => !value)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label="Download statement review" title="Download statement review" onClick={downloadReview}><Download className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label="Replace statement" title="Replace statement" disabled={saving} onClick={() => void reset()}><RotateCcw className="h-4 w-4" /></Button></div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border pb-4 sm:grid-cols-3 lg:grid-cols-5">
          <div><div className="text-xs text-muted-foreground">Total debits</div><div className="mt-1 break-all text-base font-semibold tabular-nums text-danger">{rows.length ? money(reconciliation?.debitPaise ?? 0) : "Unavailable"}</div></div>
          <div><div className="text-xs text-muted-foreground">Total credits</div><div className="mt-1 break-all text-base font-semibold tabular-nums text-emerald-600">{rows.length ? money(reconciliation?.creditPaise ?? 0) : "Unavailable"}</div></div>
          <div><div className="text-xs text-muted-foreground">Balance checks</div><div className="mt-1 text-sm font-semibold">{reconciliation?.matched && !extractionProblems.length ? "Arithmetic matched" : "Needs attention"}</div></div>
          <div><div className="text-xs text-muted-foreground">Completeness</div><div className="mt-1 text-sm font-semibold">{completenessBlocked ? "Mismatch — import blocked" : completeness?.status === "complete" ? "Controls matched" : "Unverified (no independent summary)"}</div></div>
          <div><div className="text-xs text-muted-foreground">Review queue</div><div className="mt-1 text-sm font-semibold">{remaining.length} pending / {included.length} selected</div></div>
        </div>
        {suggestedMatchCount > 0 && <div className="my-2 space-y-1 text-xs text-amber-800 dark:text-amber-200"><p>{suggestedMatchCount} possible duplicate suggestions (approval required; nothing is auto-merged). Review revision #{reviewRevision}. Observations: {observations?.segments[0]?.rows.length ?? 0}.</p>{matchProposals.filter(m => m.status === "suggested" && m.existingTransactionId).slice(0, 5).map(m => <button key={m.occurrenceId} type="button" className="mr-2 underline" disabled={saving || !!result} onClick={() => confirmMatch(m.occurrenceId, m.existingTransactionId!)}>Confirm match for row {m.occurrenceId}</button>)}</div>}
        {(completeness?.issues.length || ocrFieldBlocks.length > 0) && <details open={completenessBlocked} className="my-3 border-l-2 border-amber-500 pl-3 text-sm"><summary className="cursor-pointer font-medium">Completeness / OCR field checks</summary><ul className="mt-2 grid max-h-40 gap-1 overflow-y-auto text-xs">{[...(completeness?.issues ?? []), ...ocrFieldBlocks].map((issue, index) => <li key={index} className="break-words">{issue}</li>)}</ul></details>}
        {(extractionProblems.length > 0 || reconciliation?.errors.length || analysis.warnings.length > 0) && <details open={extractionProblems.length > 0} className="my-3 border-l-2 border-amber-500 pl-3 text-sm"><summary className="cursor-pointer font-medium">{extractionProblems.length + (reconciliation?.errors.length ?? 0)} blocking checks / {analysis.warnings.length} notices</summary><ul className="mt-2 grid max-h-40 gap-1 overflow-y-auto text-xs">{[...extractionProblems, ...(reconciliation?.errors ?? []), ...analysis.warnings].slice(0, 100).map((issue, index) => <li key={index} className="break-words">{issue}</li>)}</ul></details>}
        <details className="my-3 text-sm"><summary className="cursor-pointer font-medium">Independent source evidence (optional; required when printed controls exist)</summary><div className="mt-3 grid gap-2 sm:grid-cols-3"><label className="grid gap-1 text-xs">Printed debit count<Input inputMode="numeric" aria-label="Printed debit count" disabled={saving || !!result} value={sourceEvidence.printedDebitCount ?? ""} onChange={e => { setReviewRevision(n => n + 1); setSourceEvidence(ev => ({ ...ev, printedDebitCount: e.target.value === "" ? null : Number(e.target.value), evidenceOrigin: "human_provided" })); }} /></label><label className="grid gap-1 text-xs">Printed credit count<Input inputMode="numeric" aria-label="Printed credit count" disabled={saving || !!result} value={sourceEvidence.printedCreditCount ?? ""} onChange={e => { setReviewRevision(n => n + 1); setSourceEvidence(ev => ({ ...ev, printedCreditCount: e.target.value === "" ? null : Number(e.target.value), evidenceOrigin: "human_provided" })); }} /></label><label className="grid gap-1 text-xs">Expected transactions<Input inputMode="numeric" aria-label="Expected transaction count" disabled={saving || !!result} value={sourceEvidence.expectedTransactionCount ?? ""} onChange={e => { setReviewRevision(n => n + 1); setSourceEvidence(ev => ({ ...ev, expectedTransactionCount: e.target.value === "" ? null : Number(e.target.value), evidenceOrigin: "human_provided" })); }} /></label><label className="grid gap-1 text-xs">Printed gross debit (paise)<Input inputMode="numeric" aria-label="Printed gross debit paise" disabled={saving || !!result} value={sourceEvidence.printedGrossDebitPaise ?? ""} onChange={e => { setReviewRevision(n => n + 1); setSourceEvidence(ev => ({ ...ev, printedGrossDebitPaise: e.target.value === "" ? null : Number(e.target.value), evidenceOrigin: "human_provided" })); }} /></label><label className="grid gap-1 text-xs">Printed gross credit (paise)<Input inputMode="numeric" aria-label="Printed gross credit paise" disabled={saving || !!result} value={sourceEvidence.printedGrossCreditPaise ?? ""} onChange={e => { setReviewRevision(n => n + 1); setSourceEvidence(ev => ({ ...ev, printedGrossCreditPaise: e.target.value === "" ? null : Number(e.target.value), evidenceOrigin: "human_provided" })); }} /></label></div><p className="mt-2 text-xs text-muted-foreground">Missing evidence stays unverified — it is not treated as a pass. Known mismatches block import.</p></details>
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Bank movement (amounts and counts) / {accounts.find(a => a.id === accountId)?.name}</summary><div className="mt-3 overflow-auto"><table className="w-full min-w-[720px] text-xs"><thead><tr>{["Month", "Debit count", "Debits", "Credit count", "Credits", "Coverage", "Reviewed income", "Reviewed expenses", "Refunds"].map(label => <th key={label} scope="col" className="border-b border-border p-2 text-left font-medium">{label}</th>)}</tr></thead><tbody>{monthlyTotals.map(total => {
          const bank = bankMonths.find(m => m.month === total.month);
          const meaning = economicMonths.find(m => m.month === total.month);
          return <tr key={total.month}><th scope="row" className="p-2 text-left font-medium">{total.month}</th><td className="p-2 text-right tabular-nums">{total.debitCount}</td><td className="whitespace-nowrap p-2 text-right tabular-nums">{money(total.debitPaise)}</td><td className="p-2 text-right tabular-nums">{total.creditCount}</td><td className="whitespace-nowrap p-2 text-right tabular-nums">{money(total.creditPaise)}</td><td className="p-2">{bank?.coverage ?? "unknown"}</td><td className="whitespace-nowrap p-2 text-right tabular-nums">{money(meaning?.incomePaise ?? total.reviewedIncomePaise)}</td><td className="whitespace-nowrap p-2 text-right tabular-nums">{money(meaning?.expensePaise ?? total.reviewedExpensePaise)}</td><td className="whitespace-nowrap p-2 text-right tabular-nums">{money(meaning?.refundPaise ?? total.reviewedRefundPaise)}</td></tr>;
        })}</tbody></table><p className="mt-2 text-xs text-muted-foreground">Bank credits are not automatically income. Missing months are unknown coverage, not zero activity.</p></div></details>
        {!!analysis.ocrPages?.length && <label className="my-3 flex items-start gap-2 border-l-2 border-amber-500 pl-3 text-sm"><input type="checkbox" checked={ocrSourceConfirmed} disabled={saving || !!result} onChange={e => setOcrSourceConfirmed(e.target.checked)} />OCR dates, amounts and row completeness verified against the original PDF</label>}
        <div className="my-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs">Opening balance (INR)<Input aria-label="Statement opening balance" inputMode="decimal" value={openingText} disabled={saving || !!result} onChange={e => changeBalances("opening", e.target.value)} /></label>
          <label className="grid gap-1 text-xs">Closing balance (INR)<Input aria-label="Statement closing balance" inputMode="decimal" value={closingText} disabled={saving || !!result} onChange={e => changeBalances("closing", e.target.value)} /></label>
          <label className="flex items-center gap-2 self-end py-2 text-xs"><input type="checkbox" checked={currencyConfirmed} disabled={saving || !!result} onChange={e => setCurrencyConfirmed(e.target.checked)} />INR account and source balances confirmed</label>
        </div>
        <div className={showSource ? "grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]" : "min-w-0"}>
          <div className="min-w-0">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><Input aria-label="Search statement narration" placeholder="Search narration" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /><select aria-label="Statement month" className={selectClass} value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}><option value="">All months</option>{months.map(month => <option key={month}>{month}</option>)}</select><select aria-label="Statement row filter" className={selectClass} value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}><option value="all">All rows</option><option value="review">Needs review</option><option value="duplicates">Possible duplicates</option></select><select aria-label="Scope for selected rows" className={selectClass} value="" disabled={saving || !!result} onChange={e => { const scope = e.target.value as "personal" | "business"; setDecisions(current => Object.fromEntries(Object.entries(current).map(([id, d]) => [id, d.include ? { ...d, scope, reviewed: false } : d]))); }}><option value="">Selected scope</option><option value="personal">Personal</option><option value="business">Business</option></select></div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={saving || !!result || !included.some((row) => !decisions[row.id]?.reviewed)}
                aria-label="Review all included rows"
                onClick={() => setAllIncludedReviewed(true)}
              >
                <Check className="mr-2 h-4 w-4" />Review all
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={saving || !!result || !included.some((row) => decisions[row.id]?.reviewed)}
                aria-label="Clear all reviewed checkboxes"
                onClick={() => setAllIncludedReviewed(false)}
              >
                Clear reviews
              </Button>
              <span className="text-xs text-muted-foreground">Checks Reviewed on every included row. Purpose, category, and scope are still required before import.</span>
              {remaining.length > 0 && (
                <button
                  type="button"
                  className="text-xs font-medium text-amber-700 underline dark:text-amber-300"
                  aria-label="Go to next row needing classification"
                  onClick={() => {
                    setFilter("review");
                    const idx = rows.findIndex((row) => decisions[row.id]?.include && decisionProblems(row, decisions[row.id], accountId || cardId).length > 0);
                    if (idx >= 0) setPage(Math.floor(idx / 25) + 1);
                  }}
                >
                  {remaining.length} transaction{remaining.length === 1 ? "" : "s"} still need classification before import — go to next
                </button>
              )}
            </div>
            <div className="max-h-[48dvh] overflow-auto rounded-md border border-border">
              <table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead className="sticky top-0 z-10 bg-surface"><tr>
                <th scope="col" className="border-b border-border px-3 py-2 font-semibold">Include</th>
                <th scope="col" className="border-b border-border px-3 py-2 font-semibold">Date / narration</th>
                <th scope="col" className="border-b border-border px-3 py-2 font-semibold">Debit</th>
                <th scope="col" className="border-b border-border px-3 py-2 font-semibold">Credit</th>
                <th scope="col" className="border-b border-border px-3 py-2 font-semibold">Purpose / category</th>
                <th scope="col" className="border-b border-border px-3 py-2 font-semibold">
                  <span className="inline-flex items-center gap-2">
                    Review
                    <button
                      type="button"
                      className="text-xs font-medium text-primary underline disabled:pointer-events-none disabled:opacity-40"
                      disabled={saving || !!result || !included.some((row) => !decisions[row.id]?.reviewed)}
                      aria-label="Review all included rows"
                      onClick={() => setAllIncludedReviewed(true)}
                    >
                      all
                    </button>
                  </span>
                </th>
              </tr></thead><tbody>
                {pageRows.map(row => {
                  const decision = decisions[row.id];
                  const categoryType = decision.kind === "income" ? "income" : "expense";
                  const rowCategories = categories.filter(category => !category.isDeleted && !category.archived && (category.appliesTo === categoryType || category.appliesTo === "mixed"));
                  const counterparts = decision.kind === "cc_payment" ? cards.filter(c => !c.isDeleted && c.type === "credit").map(c => ({ id: c.id, label: c.nickname })) : ["refund", "contribution"].includes(decision.kind) ? transactions.filter(t => !t.isDeleted && t.type === "expense" && t.categoryId === decision.categoryId).map(t => ({ id: t.id, label: `${t.date.slice(0, 10)} ${t.description || t.merchantOrPerson} ${money(t.amountPaise ?? Math.round(t.amount * 100))}` })) : accounts.filter(a => !a.isDeleted && !a.isInactive && a.id !== accountId).map(a => ({ id: a.id, label: a.name }));
                  return <tr key={row.id} data-statement-row={row.id} className="border-b border-border align-top last:border-b-0"><td className="px-3 py-3"><input type="checkbox" aria-label={`Include row ${row.id}`} checked={decision.include} disabled={saving || !!result || row.issues.length > 0} onChange={e => changeDecision(row.id, { include: e.target.checked })} /></td>
                    <td className="max-w-64 px-3 py-3"><div className="font-medium">{row.date}</div><div className="mt-1 whitespace-normal break-words">{row.description}</div>{row.valueDate && <div className="mt-1 text-muted-foreground">Value date: {row.valueDate}</div>}<button type="button" className="mt-1 underline text-muted-foreground" onClick={() => { const obs = observations?.segments[0]?.rows.find(r => r.occurrenceId === row.id); const box = obs?.fields.amount?.box ?? obs?.fields.narration?.box; setSourcePage(row.page); setShowSource(true); setHighlightBox(box ? { page: row.page, ...box } : null); }}>Page {row.page} / balance {row.balancePaise === null ? "unknown" : money(row.balancePaise)}</button>{!result && !saving && <span className="mt-1 flex flex-wrap gap-2 text-muted-foreground"><button type="button" className="underline" onClick={() => { const next = window.prompt("Correct amount in paise (invalidates approval)", String(row.debitPaise || row.creditPaise)); if (next == null || next === "") return; const paise = Number(next); if (!Number.isInteger(paise) || paise < 0) { setError("Amount correction must be a non-negative integer paise value"); return; } const reason = window.prompt("Reason for financial correction", "User correction against source") || "User correction"; correctRowField(row.id, { amountPaise: paise }, reason); }}>Correct amount</button><button type="button" className="underline" onClick={() => { const next = window.prompt("Correct booking date YYYY-MM-DD (invalidates approval)", row.date); if (next == null || next === "") return; try { const reason = window.prompt("Reason for date correction", "User correction against source") || "User correction"; correctRowField(row.id, { date: next }, reason); } catch (err) { setError(err instanceof Error ? err.message : "Invalid date"); } }}>Correct date</button><button type="button" className="underline" onClick={() => { const direction = row.debitPaise > 0 ? "credit" : "debit"; const reason = window.prompt(`Flip direction to ${direction}? Enter reason`, "User correction against source"); if (reason == null) return; correctRowField(row.id, { direction }, reason || "User correction"); }}>Flip DR/CR</button></span>}{fieldEdits[row.id] && <p className="mt-1 text-amber-700">Corrected: {fieldEdits[row.id].reason}</p>}{decision.duplicate && <p className="mt-2 break-words text-amber-700">{decision.duplicate}</p>}{row.issues.map(issue => <p key={issue} className="mt-1 text-danger">{issue}</p>)}</td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums">{row.debitPaise ? money(row.debitPaise) : "-"}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{row.creditPaise ? money(row.creditPaise) : "-"}</td>
                    <td className="min-w-48 max-w-56 px-3 py-3"><div className="grid gap-2"><select aria-label={`Purpose row ${row.id}`} className={selectClass} value={decision.kind} disabled={saving || !!result || !decision.include} onChange={e => changeDecision(row.id, { kind: e.target.value as StatementKind | "", categoryId: "", counterpartId: "", proposalStrength: e.target.value ? "strong" : decision.proposalStrength })}><option value="">{decision.suggestedKind ? `Choose purpose (suggested: ${purposeLabels[decision.suggestedKind as StatementKind] ?? decision.suggestedKind})` : "Choose purpose"}</option>{Object.entries(purposeLabels).filter(([kind]) => kind === "transfer" || row.creditPaise ? ["income", "refund", "contribution", "transfer"].includes(kind) : ["expense", "transfer", "cc_payment"].includes(kind)).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select>
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
          {showSource && loaded && <aside className="min-w-0 border-l-0 border-border lg:border-l lg:pl-4"><div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-medium">Original PDF / page {sourcePage}</h3><div className="flex gap-2"><Button size="icon-sm" variant="outline" aria-label="Previous PDF page" title="Previous PDF page" disabled={sourcePage <= 1} onClick={() => setSourcePage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon-sm" variant="outline" aria-label="Next PDF page" title="Next PDF page" disabled={sourcePage >= analysis.pageCount} onClick={() => setSourcePage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button></div></div><div className="max-h-[55dvh] overflow-auto"><SourcePage loaded={loaded} page={sourcePage} highlight={highlightBox} /></div></aside>}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          {result ? <p role="status" className="text-sm font-medium text-emerald-600">{result.imported} imported / {result.duplicates} already imported / {result.skipped} excluded{result.importSourceId ? <span className="block text-xs font-normal text-muted-foreground">Source {result.importSourceId.slice(0, 18)}…</span> : null}</p> : <p className="text-xs text-muted-foreground">{!rows.length ? "No transactions extracted" : remaining.length ? `${remaining.length} selected rows still need review` : included.length ? "Selected rows reviewed" : "No rows selected"}{!reconciliation?.matched || extractionProblems.length || completenessBlocked ? " / balance, completeness or extraction checks unresolved" : ""}</p>}
          <div className="flex flex-wrap gap-2">{!result && <Button variant="outline" disabled={saving || !included.length || !included.some((row) => !decisions[row.id]?.reviewed)} aria-label="Review all included rows" onClick={() => setAllIncludedReviewed(true)}><Check className="mr-2 h-4 w-4" />Review all</Button>}{!result && <Button variant="outline" disabled={saving || !included.length} onClick={() => setDecisions(current => Object.fromEntries(Object.entries(current).map(([id, d]) => {
            const row = rows.find(r => r.id === id)!;
            if (!d.include || !canBulkConfirmDecision(d) || decisionProblems(row, { ...d, reviewed: true }, accountId || cardId).length) return [id, d];
            return [id, { ...d, reviewed: true }];
          })))}><Check className="mr-2 h-4 w-4" />Confirm complete</Button>}{result ? <Button onClick={onClose}>Done</Button> : <Button disabled={!ready} onClick={() => void save()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Import reviewed</Button>}</div>
        </div>
      </>}
      {!analysis && !busy && <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />Categories are suggestions. A recognized bank name is not a certified layout. PDF and password stay on this device.</div>}
    </DialogContent>
  </Dialog>;
}
