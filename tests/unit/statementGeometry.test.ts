import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  boxesWithinTolerance,
  GEOMETRY_TOLERANCE_CSS_PX,
  ocrPixelToPageTopDown,
  pageTopDownToPdfUser,
  pageTopDownToViewportCss,
  pdfUserToViewportCss,
  viewerRenderScale,
  type PdfRotation,
} from "@/services/statements/geometry";
import { buildServerAlignedDigestMaterial } from "@/services/statements/reviewDigest";

/** Independent oracle: hand-computed for page 612×792, box at top-down (72, 100, 120, 14). */
const PAGE = { width: 612, height: 792 };
const TOP_DOWN = { x: 72, y: 100, width: 120, height: 14 };
const PDF_USER = pageTopDownToPdfUser(TOP_DOWN, PAGE.height); // y = 792-100-14 = 678

describe("statement geometry contract", () => {
  it("converts page-top-down to pdf user space without inventing dimensions", () => {
    expect(PDF_USER).toEqual({ x: 72, y: 678, width: 120, height: 14 });
  });

  it("maps OCR pixels through uniform image→page scale", () => {
    const box = ocrPixelToPageTopDown({ x: 300, y: 600, width: 90, height: 30 }, 300 / 72);
    expect(box.x).toBeCloseTo(72, 10);
    expect(box.y).toBeCloseTo(144, 10);
    expect(box.width).toBeCloseTo(21.6, 10);
    expect(box.height).toBeCloseTo(7.2, 10);
  });

  const rotations: PdfRotation[] = [0, 90, 180, 270];
  const scales = [1, 1.25, 1.5, 2, 3];
  const zooms = [0.75, 1, 1.25, 1.5, 2];

  it("rotation×scale independent oracle stays within 2 CSS px of composed transform", () => {
    for (const rotation of rotations) {
      for (const scale of scales) {
        const direct = pdfUserToViewportCss(PDF_USER, { ...PAGE, rotation }, scale);
        const composed = pageTopDownToViewportCss(TOP_DOWN, { ...PAGE, rotation }, scale);
        expect(boxesWithinTolerance(composed, direct, GEOMETRY_TOLERANCE_CSS_PX)).toBe(true);
        // Non-zero size after every rotation
        expect(composed.width).toBeGreaterThan(0);
        expect(composed.height).toBeGreaterThan(0);
      }
    }
  });

  it("viewer zoom factors compose linearly with fit scale (no double-cap)", () => {
    for (const zoom of zooms) {
      const scale = viewerRenderScale({ containerWidth: 400, pageWidth: 612, zoom });
      expect(scale).toBeCloseTo((400 / 612) * zoom, 8);
      const box = pageTopDownToViewportCss(TOP_DOWN, { ...PAGE, rotation: 0 }, scale);
      const at1 = pageTopDownToViewportCss(TOP_DOWN, { ...PAGE, rotation: 0 }, 400 / 612);
      expect(box.width / at1.width).toBeCloseTo(zoom, 6);
    }
  });

  it("native + OCR fixture anchors remain distinct under DPI-like scales", () => {
    const native = pageTopDownToViewportCss(TOP_DOWN, { ...PAGE, rotation: 0 }, 1);
    const ocrPage = ocrPixelToPageTopDown({ x: 72 * (300 / 72), y: 100 * (300 / 72), width: 120 * (300 / 72), height: 14 * (300 / 72) }, 300 / 72);
    const ocrView = pageTopDownToViewportCss(ocrPage, { ...PAGE, rotation: 0 }, 1);
    expect(boxesWithinTolerance(native, ocrView, GEOMETRY_TOLERANCE_CSS_PX)).toBe(true);
  });
});

describe("review digest alignment material", () => {
  it("stable stringify for empty evidence matches PHP empty-object encoding", () => {
    const material = buildServerAlignedDigestMaterial({
      accountId: "acc1",
      bank: "hdfc",
      documentHash: "a".repeat(64),
      parserVersion: "statement-text-v2",
      openingPaise: 100,
      closingPaise: 50,
      order: "ascending",
      rows: [{
        id: "r1",
        date: "2026-01-01",
        debitPaise: 50,
        creditPaise: 0,
        balancePaise: 50,
        description: "TEST",
        reference: "R1",
        decision: { include: true, reviewed: true, kind: "expense", categoryId: "c1", scope: "personal", counterpartId: "" },
      }],
      sourceEvidence: {},
      reviewRevision: 2,
    });
    expect(material).toContain('"sourceEvidence":{}');
    const digest = createHash("sha256").update(material).digest("hex");
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });
});
