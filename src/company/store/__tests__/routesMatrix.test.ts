import { describe, expect, it } from "vitest";
import { COMPANY_SIDEBAR_NAV, companyPath, pathToCompanyRoute } from "@/company/routes";

describe("company routes — page matrix fixes", () => {
  it("maps /masters/categories to masters-categories (not business-units)", () => {
    const m = pathToCompanyRoute("/company/app/masters/categories");
    expect(m.key).toBe("masters-categories");
    expect(m.params.tab).toBe("categories");
    expect(companyPath("masters-categories")).toBe("/company/app/masters/categories");
  });

  it("maps /vouchers/new to voucher-new (distinct from list)", () => {
    const neu = pathToCompanyRoute("/company/app/vouchers/new");
    const list = pathToCompanyRoute("/company/app/vouchers");
    expect(neu.key).toBe("voucher-new");
    expect(list.key).toBe("vouchers");
    expect(neu.key).not.toBe(list.key);
    expect(companyPath("voucher-new")).toBe("/company/app/vouchers/new");
  });

  it("keeps Cash & Bank off the chart of accounts route", () => {
    expect(companyPath("cash-bank")).toBe("/company/app/cash-bank");
    expect(pathToCompanyRoute("/company/app/cash-bank").key).toBe("cash-bank");
    expect(pathToCompanyRoute("/company/app/ledgers").key).toBe("ledgers");
  });

  it("round-trips every sidebar item to its own page", () => {
    for (const item of COMPANY_SIDEBAR_NAV) {
      const pathname = item.path.split("?")[0];
      expect(pathToCompanyRoute(pathname).key, item.key).toBe(item.key);
    }
  });
});
