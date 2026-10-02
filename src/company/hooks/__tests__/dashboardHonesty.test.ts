import { describe, expect, it } from "vitest";
import { dashboardBookLooksEmpty } from "@/company/hooks/useDashboardData";

describe("dashboardBookLooksEmpty", () => {
  it("treats a failed load as unverified, not an empty book", () => {
    expect(
      dashboardBookLooksEmpty({
        loading: false,
        cash: 0,
        ar: 0,
        ap: 0,
        moneyIn: 0,
        moneyOut: 0,
        recentCount: 0,
        widgetErrors: ["Could not load Cash & Bank"],
      }),
    ).toBe(false);
  });

  it("allows an empty book only when every widget loaded", () => {
    expect(
      dashboardBookLooksEmpty({
        loading: false,
        cash: 0,
        ar: 0,
        ap: 0,
        moneyIn: 0,
        moneyOut: 0,
        recentCount: 0,
        widgetErrors: [],
      }),
    ).toBe(true);
  });
});
