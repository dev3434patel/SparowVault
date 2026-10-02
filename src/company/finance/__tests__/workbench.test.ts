import { describe, expect, it } from "vitest";
import {
  groupManagementTotal,
  gstExportIsFiled,
  nextBridgeState,
  nextGstState,
  recurringStartsAsDraft,
  reimbursementPair,
} from "@/company/finance/workbench";

describe("company workbench", () => {
  it("stops at exported and does not call that filed", () => {
    expect(nextGstState("draft")).toBe("validated");
    expect(nextGstState("validated")).toBe("exported");
    expect(nextGstState("exported")).toBe("blocked");
    expect(gstExportIsFiled()).toBe(false);
  });

  it("reimbursement is two books", () => {
    const row = reimbursementPair(100_000);
    expect(row.companyPayablePaise).toBe(100_000);
    expect(row.personalReceivablePaise).toBe(100_000);
    expect(row.sameDatabaseTransaction).toBe(false);
    expect(nextBridgeState("proposed", "post_company")).toBe("company_posted");
  });

  it("eliminates a group pair only when matched", () => {
    const open = groupManagementTotal([{ leftPaise: 100, rightPaise: 100, matched: false }]);
    const matched = groupManagementTotal([{ leftPaise: 100, rightPaise: 100, matched: true }]);
    expect(open.totalPaise).toBe(200);
    expect(matched.totalPaise).toBe(100);
    expect(matched.statutoryConsolidation).toBe(false);
  });

  it("recurring templates start as drafts", () => {
    expect(recurringStartsAsDraft()).toBe("draft");
  });
});
