import { AnnotationMode, type PDFPageProxy } from "pdfjs-dist";
import { createWorker, PSM, type Worker } from "tesseract.js";
import type { StatementPage, StatementToken } from "./types";

export const MAX_OCR_PAGES = 12;
const MAX_PIXELS = 9_000_000;
export async function createStatementOcr(signal: AbortSignal) {
  let worker: Worker | undefined;
  let stopped = false;
  const terminate = async () => { stopped = true; await worker?.terminate(); };
  const abort = () => { void terminate(); };
  signal.addEventListener("abort", abort, { once: true });
  const base = new URL(`${import.meta.env.BASE_URL}ocr/7.0.0/`, location.origin).href;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let cancelStartup: (() => void) | undefined;
  try {
    const loading = createWorker("eng", 1, { workerPath: base + "worker.min.js", corePath: base, langPath: base.slice(0, -1), gzip: false, cacheMethod: "none", workerBlobURL: false, errorHandler: () => undefined });
    void loading.then(async instance => { if (stopped) await instance.terminate(); }).catch(() => undefined);
    worker = await Promise.race([loading, new Promise<never>((_, reject) => {
      startupTimer = setTimeout(() => { stopped = true; reject(new Error("OCR initialization timed out. Check the locally hosted OCR assets.")); }, 60_000);
      cancelStartup = () => reject(new DOMException("Analysis cancelled", "AbortError"));
      signal.addEventListener("abort", cancelStartup, { once: true });
      if (signal.aborted) cancelStartup();
    })]);
    signal.throwIfAborted();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "1", user_defined_dpi: "300" });
  } catch (error) { await terminate(); signal.removeEventListener("abort", abort); throw error; }
  finally { clearTimeout(startupTimer); if (cancelStartup) signal.removeEventListener("abort", cancelStartup); }
  return {
    async read(page: PDFPageProxy): Promise<StatementPage> {
      signal.throwIfAborted();
      const original = page.getViewport({ scale: 1 });
      const scale = Math.min(300 / 72, Math.sqrt(MAX_PIXELS / (original.width * original.height)));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("OCR canvas is unavailable");
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancelRecognition: (() => void) | undefined;
      const render = page.render({ canvas, canvasContext: context, viewport, annotationMode: AnnotationMode.DISABLE, background: "white" });
      const cancelRender = () => render.cancel();
      signal.addEventListener("abort", cancelRender, { once: true });
      try {
        await render.promise;
        const recognition = worker!.recognize(canvas, {}, { blocks: true, text: true });
        const { data } = await Promise.race([recognition, new Promise<never>((_, reject) => { timer = setTimeout(() => { void terminate(); reject(new Error(`OCR page ${page.pageNumber} timed out. Use a clearer or shorter statement.`)); }, 90_000); }), new Promise<never>((_, reject) => {
          cancelRecognition = () => reject(new DOMException("Analysis cancelled", "AbortError"));
          signal.addEventListener("abort", cancelRecognition, { once: true });
          if (signal.aborted) cancelRecognition();
        })]);
        signal.throwIfAborted();
        const tokens: StatementToken[] = [];
        for (const block of data.blocks ?? []) for (const paragraph of block.paragraphs) for (const line of paragraph.lines) for (const word of line.words) {
          if (!word.text.trim()) continue;
          tokens.push({ text: word.text, x: word.bbox.x0 / scale, y: line.bbox.y1 / scale, width: (word.bbox.x1 - word.bbox.x0) / scale, height: (word.bbox.y1 - word.bbox.y0) / scale });
        }
        return { number: page.pageNumber, width: original.width, height: original.height, tokens, extraction: "ocr", confidence: data.confidence };
      } finally { clearTimeout(timer); if (cancelRecognition) signal.removeEventListener("abort", cancelRecognition); signal.removeEventListener("abort", cancelRender); canvas.width = 0; canvas.height = 0; }
    },
    async destroy() { signal.removeEventListener("abort", abort); await terminate(); },
  };
}
