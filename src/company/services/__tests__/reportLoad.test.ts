import { describe, expect, it } from "vitest";
import { dimensionSplit } from "@/company/finance/playbookGoldens";
import {
  beginReportLoad,
  initialReportLoadState,
  rejectReportLoad,
  reportScreenStatus,
  settleReportLoad,
} from "@/company/lib/reportLoad";
import { splitCostAllocation } from "@/company/services/booksPhases";

const emptyProject = { source: "posted_vouchers", dimension: "project", rows: [] as unknown[] };
const emptyArea = { source: "posted_vouchers", dimension: "area", rows: [] as unknown[] };
const emptyActivity = { source: "posted_vouchers", rows: [] as unknown[] };

describe("company report load", () => {
  it("keeps loading until the newest project, area, or user-activity request settles", () => {
    let state = initialReportLoadState();
    expect(reportScreenStatus(state, "project-report", true)).toBe("loading");

    state = beginReportLoad(state);
    const projectSeq = state.seq;
    state = beginReportLoad(state);
    const areaSeq = state.seq;
    expect(reportScreenStatus(state, "area-report", true)).toBe("loading");

    state = settleReportLoad(state, projectSeq, "project-report", { ok: true, data: emptyProject });
    expect(state.loading).toBe(true);
    expect(state.data).toBeNull();
    expect(reportScreenStatus(state, "area-report", true)).toBe("loading");

    state = settleReportLoad(state, areaSeq, "area-report", { ok: true, data: emptyArea });
    expect(state.loading).toBe(false);
    expect(state.loadedFor).toBe("area-report");
    expect(state.data).toEqual(emptyArea);
    expect(reportScreenStatus(state, "area-report", true)).toBe("ready");
  });

  it("treats an authorized empty row list as ready, not as an error", () => {
    let state = beginReportLoad(initialReportLoadState());
    state = settleReportLoad(state, state.seq, "user-activity", { ok: true, data: emptyActivity });
    expect(state.error).toBeNull();
    expect(state.data).toEqual(emptyActivity);
    expect(reportScreenStatus(state, "user-activity", true)).toBe("ready");
  });

  it("settles forbidden and failed requests as errors with no rows", () => {
    let state = beginReportLoad(initialReportLoadState());
    state = settleReportLoad(state, state.seq, "user-activity", {
      ok: false,
      error: "Missing permission: view_audit",
    });
    expect(state.loading).toBe(false);
    expect(state.data).toBeNull();
    expect(state.error).toBe("Missing permission: view_audit");
    expect(reportScreenStatus(state, "user-activity", true)).toBe("error");

    state = rejectReportLoad(state, "project-report", "Invalid report params");
    expect(state.loading).toBe(false);
    expect(state.data).toBeNull();
    expect(reportScreenStatus(state, "project-report", true)).toBe("error");
  });

  it("does not let a stale failure clear a newer request's loading flag", () => {
    let state = beginReportLoad(initialReportLoadState());
    const stale = state.seq;
    state = beginReportLoad(state);
    state = settleReportLoad(state, stale, "project-report", { ok: false, error: "Locked" });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
    expect(reportScreenStatus(state, "project-report", true)).toBe("loading");
  });
});

describe("independent synthetic oracle E", () => {
  it("keeps each dimension total equal to the voucher amount", () => {
    const baseExpensePaise = 1_000_000;
    const project = dimensionSplit(baseExpensePaise, [600_000, 400_000]);
    const area = dimensionSplit(baseExpensePaise, [700_000, 300_000]);
    expect(project.balanced).toBe(true);
    expect(area.balanced).toBe(true);
    expect(project.sumPaise).toBe(1_000_000);
    expect(area.sumPaise).toBe(1_000_000);
    expect(project.totalPaise).toBe(baseExpensePaise);
    expect(area.totalPaise).toBe(baseExpensePaise);

    const projectLine = splitCostAllocation(baseExpensePaise, [600_000, 400_000]);
    const areaLine = splitCostAllocation(baseExpensePaise, [700_000, 300_000]);
    expect(projectLine.voucherTotal).toBe(baseExpensePaise);
    expect(areaLine.voucherTotal).toBe(baseExpensePaise);
    expect(projectLine.allocated).toBe(baseExpensePaise);
    expect(areaLine.allocated).toBe(baseExpensePaise);
    expect(projectLine.lineAmount).toBe(baseExpensePaise);
    expect(areaLine.lineAmount).toBe(baseExpensePaise);
    expect(projectLine.voucherTotal).toBe(project.sumPaise);
    expect(areaLine.voucherTotal).toBe(area.sumPaise);
  });
});
