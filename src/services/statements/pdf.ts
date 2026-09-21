import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { StatementPage } from "./types";

GlobalWorkerOptions.workerSrc = workerUrl;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_PAGES = 60;
export async function sha256(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export interface LoadedStatement {
  document: PDFDocumentProxy;
  pages: StatementPage[];
  hash: string;
  destroy: () => Promise<void>;
}
export async function openStatementPdf(file: File, options: {
  signal: AbortSignal;
  password: (incorrect: boolean) => Promise<string | null>;
  progress: (page: number, total: number) => void;
  ocr?: "auto" | "force" | "off";
  ocrProgress?: (page: number, total: number) => void;
}): Promise<LoadedStatement> {
  if (!file.size || file.size > MAX_PDF_BYTES) throw new Error("Select a PDF between 1 byte and 20 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder("ascii").decode(bytes.slice(0, 1024)).includes("%PDF-")) throw new Error("The selected file is not a PDF.");
  const hash = await sha256(bytes);
  options.signal.throwIfAborted();
  const task = getDocument({ data: bytes, isEvalSupported: false, stopAtErrors: true, useSystemFonts: true, useWasm: false, disableFontFace: true, maxImageSize: 20_000_000, enableXfa: false });
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const armTimeout = () => { timer = setTimeout(() => { timedOut = true; void task.destroy(); }, 60_000); };
  armTimeout();
  const abort = () => { void task.destroy(); };
  options.signal.addEventListener("abort", abort, { once: true });
  task.onPassword = (update: (password: string) => void, reason: number) => {
    clearTimeout(timer);
    void options.password(reason === 2).then(password => {
      if (password === null || options.signal.aborted) { void task.destroy(); return; }
      armTimeout(); update(password);
    }).catch(() => { void task.destroy(); });
  };
  try {
    const document = await task.promise;
    if (document.numPages > MAX_PDF_PAGES) throw new Error(`This PDF has more than ${MAX_PDF_PAGES} pages. Split it by statement period.`);
    const pages: StatementPage[] = [];
    let itemCount = 0;
    let ocr: Awaited<ReturnType<typeof import("./ocr")["createStatementOcr"]>> | undefined;
    let ocrPages = 0;
    try {
    for (let number = 1; number <= document.numPages; number++) {
      options.signal.throwIfAborted();
      options.progress(number, document.numPages);
      const page = await document.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      if (page.rotate !== 0) throw new Error("Rotated pages require a reviewed layout. Export an upright statement PDF from the bank.");
      const content = await page.getTextContent();
      itemCount += content.items.length;
      if (itemCount > 200_000) throw new Error("PDF text exceeds the extraction limit. Split it into smaller statements.");
      let extracted: StatementPage = { number, width: viewport.width, height: viewport.height, tokens: content.items.flatMap(item => {
        if (!("str" in item) || !item.str.trim()) return [];
        return [{ text: item.str, x: item.transform[4], y: viewport.height - item.transform[5], width: item.width, height: item.height }];
      }) };
      if (options.ocr === "force" || options.ocr !== "off" && extracted.tokens.reduce((n, token) => n + token.text.length, 0) < 20) {
        const { createStatementOcr, MAX_OCR_PAGES } = await import("./ocr");
        if (++ocrPages > MAX_OCR_PAGES) throw new Error(`OCR is limited to ${MAX_OCR_PAGES} pages per statement. Upload a shorter period.`);
        clearTimeout(timer);
        options.ocrProgress?.(number, document.numPages);
        ocr ??= await createStatementOcr(options.signal);
        extracted = await ocr.read(page);
        armTimeout();
      }
      pages.push(extracted);
      page.cleanup();
    }
    } finally { await ocr?.destroy(); }
    clearTimeout(timer);
    return { document, pages, hash, destroy: async () => { options.signal.removeEventListener("abort", abort); await task.destroy(); } };
  } catch (error) {
    clearTimeout(timer);
    options.signal.removeEventListener("abort", abort);
    await task.destroy().catch(() => undefined);
    if (options.signal.aborted) throw new DOMException("Analysis cancelled", "AbortError");
    if (timedOut) throw new Error("PDF processing timed out. Try a smaller statement.");
    throw error instanceof Error && !/password|worker|UnknownErrorException|InvalidPDFException/i.test(error.name)
      ? error : new Error("PDF could not be opened. Check its password or download a fresh copy from your bank.");
  }
}
