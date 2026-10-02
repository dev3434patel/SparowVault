import { describe, expect, it } from "vitest";
import { syncBadgeLabel } from "@/config/syncContracts";

describe("sync badge labels", () => {
  it("reads known collections from the registry", () => {
    expect(syncBadgeLabel("households")).toBe("Households");
    expect(syncBadgeLabel("fixedIncomeAssets")).toBe("Fixed deposits");
    expect(syncBadgeLabel("reconciliationMatches")).toBe("Reconciliation matches");
  });

  it("keeps a missing label as the collection key", () => {
    expect(syncBadgeLabel("not-a-collection")).toBe("not-a-collection");
  });
});
