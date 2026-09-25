import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { createI18n } from "@/company/i18n/index";
import en from "@/company/i18n/locales/en.json";
import gu from "@/company/i18n/locales/gu.json";

/**
 * Smoke: render a dashboard-like chrome in Gujarati and assert 5 known strings.
 * Uses SSR markup (no jsdom) so company:test stays dependency-light.
 */
describe("Dashboard gu smoke", () => {
  it("renders 5 known Gujarati strings", () => {
    const i18n = createI18n({ locale: "gu", fallback: "en", messages: { en, gu } });
    const t = i18n.t.bind(i18n);
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement("h1", null, t("dashboard.title")),
        createElement("p", null, t("dashboard.liquidPosition")),
        createElement("button", { type: "button" }, t("dashboard.moneyReceived")),
        createElement("span", null, t("dashboard.cashBank")),
        createElement("span", null, t("dashboard.receivables")),
      ),
    );
    expect(html).toContain(gu["dashboard.title"]);
    expect(html).toContain(gu["dashboard.liquidPosition"]);
    expect(html).toContain(gu["dashboard.moneyReceived"]);
    expect(html).toContain(gu["dashboard.cashBank"]);
    expect(html).toContain(gu["dashboard.receivables"]);
    // Accounting safety: no accidental purpose-code translation in chrome
    expect(html).not.toContain("OTHER_RECEIPT");
  });
});
