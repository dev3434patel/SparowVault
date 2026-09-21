/**
 * Canonical statement highlight geometry.
 * Boxes are never invented for missing token provenance — callers must set provenanceLevel.
 *
 * Coordinate spaces:
 * - pdf_user: PDF.js default user space (origin bottom-left, y up), unrotated page units
 * - page_top_down: parser/OCR token space (origin top-left, y down), page units at scale 1
 * - viewport_css: overlay canvas CSS pixels after PDF.js viewport transform
 */
export type PdfRotation = 0 | 90 | 180 | 270;
export type GeometrySpace = "pdf_user" | "page_top_down" | "ocr_pixel" | "viewport_css";
export type ProvenanceLevel = "field_token" | "row_band" | "page_only" | "missing";

export interface GeometryBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanonicalFieldBox {
  documentId: string;
  accountSegmentId: string;
  pageIndex: number; // 1-based
  space: GeometrySpace;
  box: GeometryBox | null;
  quads?: Array<GeometryBox>;
  page: { width: number; height: number; rotation: PdfRotation; crop?: GeometryBox | null };
  extractionMethod: "native" | "ocr" | "user_correction";
  observationId: string;
  provenanceLevel: ProvenanceLevel;
  reason: string;
}

export const GEOMETRY_TOLERANCE_CSS_PX = 2;

/** Convert page-top-down (parser) box into PDF user space for convertToViewportRectangle. */
export function pageTopDownToPdfUser(box: GeometryBox, pageHeight: number): GeometryBox {
  return {
    x: box.x,
    y: pageHeight - box.y - box.height,
    width: box.width,
    height: box.height,
  };
}

/** Map OCR pixel box through uniform image→page scale (no deskew). */
export function ocrPixelToPageTopDown(box: GeometryBox, imageToPageScale: number): GeometryBox {
  if (!(imageToPageScale > 0)) throw new Error("imageToPageScale must be positive");
  return {
    x: box.x / imageToPageScale,
    y: box.y / imageToPageScale,
    width: box.width / imageToPageScale,
    height: box.height / imageToPageScale,
  };
}

/**
 * Independent PDF-user → viewport CSS transform for uncropped pages.
 * Matches PDF.js default viewport mapping for rotations 0/90/180/270 at the given scale.
 * Does NOT call production PDF.js — used as the test oracle and overlay fallback.
 */
export function pdfUserToViewportCss(
  box: GeometryBox,
  page: { width: number; height: number; rotation: PdfRotation },
  scale: number,
): GeometryBox {
  if (!(scale > 0)) throw new Error("scale must be positive");
  const corners = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height],
  ].map(([x, y]) => rotatePdfPoint(x, y, page.width, page.height, page.rotation));

  const xs = corners.map((c) => c[0] * scale);
  const ys = corners.map((c) => {
    const rotatedHeight = page.rotation % 180 === 0 ? page.height : page.width;
    return (rotatedHeight - c[1]) * scale;
  });
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rotatePdfPoint(x: number, y: number, width: number, height: number, rotation: PdfRotation): [number, number] {
  switch (rotation) {
    case 0:
      return [x, y];
    case 90:
      return [y, width - x];
    case 180:
      return [width - x, height - y];
    case 270:
      return [height - y, x];
    default:
      return [x, y];
  }
}

/** Compose page-top-down observation → viewport CSS for the viewer overlay. */
export function pageTopDownToViewportCss(
  box: GeometryBox,
  page: { width: number; height: number; rotation: PdfRotation },
  scale: number,
): GeometryBox {
  const pdf = pageTopDownToPdfUser(box, page.height);
  return pdfUserToViewportCss(pdf, page, scale);
}

export function boxesWithinTolerance(actual: GeometryBox, expected: GeometryBox, tol = GEOMETRY_TOLERANCE_CSS_PX): boolean {
  return (
    Math.abs(actual.x - expected.x) <= tol &&
    Math.abs(actual.y - expected.y) <= tol &&
    Math.abs(actual.width - expected.width) <= tol &&
    Math.abs(actual.height - expected.height) <= tol
  );
}

/** Viewer render scale: match zoom exactly; separate from devicePixelRatio backing store. */
export function viewerRenderScale(opts: {
  containerWidth: number;
  pageWidth: number;
  zoom: number;
  maxScale?: number;
}): number {
  const fit = opts.containerWidth / opts.pageWidth;
  const scale = fit * opts.zoom;
  if (opts.maxScale != null) return Math.min(opts.maxScale, scale);
  return scale;
}

export function honestRowBandBox(rowY: number, pageWidth: number): { box: GeometryBox; provenanceLevel: ProvenanceLevel; reason: string } {
  return {
    box: { x: 0, y: Math.max(0, rowY - 2), width: Math.max(1, pageWidth), height: 14 },
    provenanceLevel: "row_band",
    reason: "Only row y is known; highlight is a full-width row band, not a field token box",
  };
}
