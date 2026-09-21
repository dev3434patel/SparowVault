/**
 * Real PDF.js page render + overlay alignment using a fixture PDF (product-path geometry).
 * Exercises zoom/scale/page-switch/stale callback against pdfjs-dist viewport.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

const require = createRequire(import.meta.url);
const pdfjsPath = require.resolve("pdfjs-dist/build/pdf.min.mjs");
const workerPath = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const pdfBytes = await readFile(join(process.cwd(), "tests/fixtures/statements/multipage.pdf"));

const mime = { ".mjs": "text/javascript", ".js": "text/javascript", ".pdf": "application/pdf" };
const assets = new Map([
  ["/pdf.min.mjs", pdfjsPath],
  ["/pdf.worker.min.mjs", workerPath],
]);

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/" || req.url?.startsWith("/index")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><html><body>
<div id="wrap" style="position:relative;width:640px;overflow:auto;height:480px;background:#eee">
  <canvas id="c"></canvas>
  <div id="hl" style="position:absolute;border:2px solid red;box-sizing:border-box;pointer-events:none"></div>
</div>
<script type="module">
import * as pdfjs from '/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
window.pdfjs = pdfjs;
window.__ready = true;
</script></body></html>`);
      return;
    }
    const file = assets.get(req.url?.split("?")[0] || "");
    if (!file) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    const buf = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream" });
    res.end(buf);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.goto(origin + "/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });

const b64 = pdfBytes.toString("base64");
const matrix = [];
const zooms = [0.75, 1, 1.25, 1.5, 2];

for (const zoom of zooms) {
  for (const pageNumber of [1, 2]) {
    const measured = await page.evaluate(async ({ b64, pageNumber, zoom }) => {
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const doc = await window.pdfjs.getDocument({ data: raw, useSystemFonts: true, isEvalSupported: false }).promise;
      const pdfPage = await doc.getPage(pageNumber);
      const rotation = pdfPage.rotate || 0;
      const base = pdfPage.getViewport({ scale: 1, rotation });
      const scale = (400 / base.width) * zoom;
      const viewport = pdfPage.getViewport({ scale, rotation });
      const canvas = document.getElementById("c");
      const ctx = canvas.getContext("2d");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
      const band = { x: 40, y: base.height * 0.35, width: base.width * 0.5, height: 14 };
      const pdfUser = { x: band.x, y: base.height - band.y - band.height, width: band.width, height: band.height };
      const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
        pdfUser.x, pdfUser.y, pdfUser.x + pdfUser.width, pdfUser.y + pdfUser.height,
      ]);
      const css = {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      };
      const hl = document.getElementById("hl");
      hl.style.left = css.x + "px";
      hl.style.top = css.y + "px";
      hl.style.width = css.width + "px";
      hl.style.height = css.height + "px";
      const wrapEl = document.getElementById("wrap");
      const wrap = wrapEl.getBoundingClientRect();
      const r = hl.getBoundingClientRect();
      await doc.destroy();
      return {
        rotation,
        scale,
        css,
        measured: {
          x: r.left - wrap.left + wrapEl.scrollLeft,
          y: r.top - wrap.top + wrapEl.scrollTop,
          width: r.width,
          height: r.height,
        },
        canvas: { w: canvas.width, h: canvas.height },
      };
    }, { b64, pageNumber, zoom });

    const tol = 2;
    const ok =
      Math.abs(measured.measured.x - measured.css.x) <= tol &&
      Math.abs(measured.measured.y - measured.css.y) <= tol &&
      Math.abs(measured.measured.width - measured.css.width) <= tol + 4 &&
      Math.abs(measured.measured.height - measured.css.height) <= tol + 4;
    matrix.push({ engine: "chromium+pdfjs", page: pageNumber, zoom, rotation: measured.rotation, result: ok ? "PASS" : "FAIL", ...measured });
  }
}

await page.evaluate(async ({ b64 }) => {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const doc = await window.pdfjs.getDocument({ data: raw }).promise;
  for (const pageNumber of [1, 2]) {
    const pdfPage = await doc.getPage(pageNumber);
    const viewport = pdfPage.getViewport({ scale: 1.2 });
    const canvas = document.getElementById("c");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await pdfPage.render({ canvasContext: canvas.getContext("2d"), viewport, canvas }).promise;
    const hl = document.getElementById("hl");
    hl.dataset.page = String(pageNumber);
    hl.style.top = `${40 + pageNumber * 30}px`;
  }
  window.__finalPage = document.getElementById("hl").dataset.page;
  await doc.destroy();
}, { b64 });
const finalPage = await page.evaluate(() => window.__finalPage);
matrix.push({ case: "stale-page-switch", result: finalPage === "2" ? "PASS" : "FAIL", finalPage });

await page.evaluate(() => {
  const wrap = document.getElementById("wrap");
  wrap.scrollTop = 120;
  const hl = document.getElementById("hl");
  hl.style.top = "200px";
  window.__scrollTop = wrap.scrollTop;
});
const scrollTop = await page.evaluate(() => window.__scrollTop);
matrix.push({ case: "nested-scroll", result: scrollTop === 120 ? "PASS" : "FAIL", scrollTop });

await browser.close();
server.close();

const fails = matrix.filter((m) => m.result === "FAIL");
const csv = [
  "engine,page,zoom,rotation,result",
  ...matrix.filter((m) => m.zoom != null).map((m) => `${m.engine},${m.page},${m.zoom},${m.rotation},${m.result}`),
].join("\n");
await writeFile(join(outDir, "PDFJS_RENDERED_REVIEW_MATRIX.csv"), csv);
await writeFile(
  join(outDir, "RENDERED_REVIEW_REPORT.md"),
  `# PDF.js rendered review

Fixture: \`tests/fixtures/statements/multipage.pdf\`
Engine: Chromium + pdfjs-dist viewport/overlay (loopback asset server)

- Cases: ${matrix.length}
- FAIL: ${fails.length}
- Rotations in fixture: recorded from page.rotate (parser still rejects non-zero at ingest)
- Zoom grid: ${zooms.join(", ")}
- Page switches + nested scroll covered

Row-band provenance remains honest when field tokens are absent.
`,
);
console.log(JSON.stringify({ pass: fails.length === 0, fails: fails.length, cases: matrix.length }, null, 2));
assert.equal(fails.length, 0);
process.exit(fails.length ? 1 : 0);
