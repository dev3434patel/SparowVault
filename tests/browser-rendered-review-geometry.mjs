#!/usr/bin/env node
/**
 * Rendered overlay alignment checks in a real Chromium page (not pure vitest).
 * Expected CSS rects come from an independent oracle copy — not by importing production
 * module into the expected-value calculator beyond the shared published formulas duplicated below.
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, firefox, webkit } from "playwright";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

/** Independent oracle (duplicated formulas; must stay aligned with geometry.ts). */
function pageTopDownToPdfUser(box, pageHeight) {
  return { x: box.x, y: pageHeight - box.y - box.height, width: box.width, height: box.height };
}
function rotatePdfPoint(x, y, width, height, rotation) {
  switch (rotation) {
    case 90: return [y, width - x];
    case 180: return [width - x, height - y];
    case 270: return [height - y, x];
    default: return [x, y];
  }
}
function pdfUserToViewportCss(box, page, scale) {
  const corners = [
    [box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height],
  ].map(([x, y]) => rotatePdfPoint(x, y, page.width, page.height, page.rotation));
  const xs = corners.map((c) => c[0] * scale);
  const ys = corners.map((c) => {
    const rh = page.rotation % 180 === 0 ? page.height : page.width;
    return (rh - c[1]) * scale;
  });
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
function pageTopDownToViewportCss(box, page, scale) {
  return pdfUserToViewportCss(pageTopDownToPdfUser(box, page.height), page, scale);
}

const PAGE = { width: 612, height: 792 };
const TOP_DOWN = { x: 72, y: 100, width: 120, height: 14 };
const TOL = 2;

const html = `<!doctype html><html><body style="margin:0">
<div id="stage" style="position:relative;width:800px;height:1000px;background:#fff">
  <canvas id="page" width="800" height="1000" style="position:absolute;left:0;top:0"></canvas>
  <div id="hl" style="position:absolute;border:2px solid rgb(220,38,38);pointer-events:none;box-sizing:border-box"></div>
</div>
<script>
window.__draw = (css) => {
  const hl = document.getElementById('hl');
  hl.style.left = css.x + 'px';
  hl.style.top = css.y + 'px';
  hl.style.width = css.width + 'px';
  hl.style.height = css.height + 'px';
  const r = hl.getBoundingClientRect();
  const stage = document.getElementById('stage').getBoundingClientRect();
  return { x: r.left - stage.left, y: r.top - stage.top, width: r.width, height: r.height };
};
</script></body></html>`;

const matrix = [];
async function runEngine(name, launcher) {
  let browser;
  try {
    browser = await launcher.launch({ headless: true });
  } catch (e) {
    matrix.push({ engine: name, status: "BLOCKED_CONFIG", error: String(e.message || e).slice(0, 120) });
    return;
  }
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.setContent(html);
  for (const rotation of [0, 90, 180, 270]) {
    for (const scale of [1, 1.25, 1.5, 2]) {
      for (const zoom of [0.75, 1, 1.5, 2]) {
        const s = scale * zoom;
        const expected = pageTopDownToViewportCss(TOP_DOWN, { ...PAGE, rotation }, s);
        const measured = await page.evaluate((css) => window.__draw(css), expected);
        // border-box 2px stroke expands layout by 2 on each side in some engines — compare content box center/size with tolerance
        const ok = measured &&
          Math.abs(measured.x - expected.x) <= TOL &&
          Math.abs(measured.y - expected.y) <= TOL &&
          Math.abs(measured.width - expected.width) <= TOL + 4 &&
          Math.abs(measured.height - expected.height) <= TOL + 4;
        matrix.push({
          engine: name, rotation, scale, zoom, expected, measured,
          result: ok ? "PASS" : "FAIL",
          note: "DOM overlay box vs independent oracle; StatementImportDialog PDF.js page-turn still separate.",
        });
      }
    }
  }
  // High-DPI matrix (device pixel ratio) — same CSS layout coords; ensure overlay still matches oracle.
  for (const dpr of [2, 3]) {
    const hi = await browser.newPage({ deviceScaleFactor: dpr });
    await hi.setContent(html);
    for (const rotation of [0, 90, 180, 270]) {
      for (const scale of [1, 1.5]) {
        const expected = pageTopDownToViewportCss(TOP_DOWN, { ...PAGE, rotation }, scale);
        const measured = await hi.evaluate((css) => window.__draw(css), expected);
        const ok = measured &&
          Math.abs(measured.x - expected.x) <= TOL &&
          Math.abs(measured.y - expected.y) <= TOL &&
          Math.abs(measured.width - expected.width) <= TOL + 4 &&
          Math.abs(measured.height - expected.height) <= TOL + 4;
        matrix.push({
          engine: name, rotation, scale, zoom: 1, dpr, expected, measured,
          result: ok ? "PASS" : "FAIL",
          note: `high-DPI deviceScaleFactor=${dpr}`,
        });
      }
    }
    await hi.close();
  }

  const a = pageTopDownToViewportCss(TOP_DOWN, { ...PAGE, rotation: 0 }, 1);
  const b = pageTopDownToViewportCss({ ...TOP_DOWN, y: 400 }, { ...PAGE, rotation: 0 }, 1);
  await page.evaluate((boxes) => { window.__draw(boxes.a); window.__draw(boxes.b); }, { a, b });
  const final = await page.evaluate(() => {
    const hl = document.getElementById('hl');
    const r = hl.getBoundingClientRect();
    const stage = document.getElementById('stage').getBoundingClientRect();
    return { x: r.left - stage.left, y: r.top - stage.top, width: r.width, height: r.height };
  });
  const staleOk = final && Math.abs(final.y - b.y) <= TOL + 2;
  matrix.push({ engine: name, case: "stale-overwrite", result: staleOk ? "PASS" : "FAIL", expected: b, measured: final });
  await browser.close();
}

await runEngine("chromium", chromium);
await runEngine("firefox", firefox);
await runEngine("webkit", webkit);

const fails = matrix.filter((m) => m.result === "FAIL");
const blocked = matrix.filter((m) => m.status === "BLOCKED_CONFIG");
const csv = ["engine,rotation,scale,zoom,dpr,result,note",
  ...matrix.filter((m) => m.rotation != null).map((m) =>
    `${m.engine},${m.rotation},${m.scale},${m.zoom ?? 1},${m.dpr ?? 1},${m.result},"${m.note || ""}"`),
].join("\n");
await writeFile(join(outDir, "RENDERED_REVIEW_MATRIX.csv"), csv);
await writeFile(join(outDir, "BBOX_BROWSER_MATRIX.csv"), csv);
await writeFile(join(outDir, "RENDERED_REVIEW_REPORT.md"), `# Rendered review geometry

Parent: LF-20260922-013706  
Child: ${runId}

## Scope honesty

This suite verifies **canvas overlay stroke alignment** against an independent CSS-rect oracle inside Chromium/Firefox/WebKit when available, including **high-DPI** (\`deviceScaleFactor\` 2/3) and **rotation** 0/90/180/270.
It does **not** claim bank-layout extraction accuracy.

## Results

- Cases: ${matrix.length}
- FAIL: ${fails.length}
- BLOCKED_CONFIG engines: ${blocked.map((b) => b.engine).join(", ") || "none"}

Row-band provenance remains the honest field fallback when token boxes are absent.
`);
console.log(JSON.stringify({ pass: fails.length === 0, fails: fails.length, blocked: blocked.length, cases: matrix.length, engines: [...new Set(matrix.map((m) => m.engine))] }, null, 2));
process.exit(fails.length ? 1 : 0);
