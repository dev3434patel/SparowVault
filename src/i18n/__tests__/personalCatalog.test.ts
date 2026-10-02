import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { en } from "@/i18n/messages/en";
import { gu } from "@/i18n/messages/gu";
import { applyProfileLanguage, personalCatalog, useMessages } from "@/i18n/useMessages";
import { formatIntentLabel, formatPaymentMode, formatTxType } from "@/lib/format";

function walk(english: unknown, gujarati: unknown, path: string) {
  expect(gujarati, path).not.toBeUndefined();
  if (typeof english === "string") {
    expect(typeof gujarati, path).toBe("string");
    expect(String(gujarati).length, path).toBeGreaterThan(0);
    return;
  }
  const left = english as Record<string, unknown>;
  const right = gujarati as Record<string, unknown>;
  for (const key of Object.keys(left)) walk(left[key], right[key], `${path}.${key}`);
  for (const key of Object.keys(right)) {
    expect(left[key], `${path}.${key}`).not.toBeUndefined();
  }
}

function Probe() {
  const messages = useMessages();
  return createElement("span", null, `${messages.dashboard.morning}|${messages.language.gujarati}`);
}

describe("personal catalog", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses Gujarati only when that locale is selected", () => {
    expect(personalCatalog("en").modes.essential).toBe("Essential");
    expect(personalCatalog("gu").modes.essential).toBe("જરૂરી");
    expect(personalCatalog("gu").modes.premium).toBe("વિસ્તૃત");
    expect(personalCatalog("gu").screens.accounts.title).toBe("ખાતાં");
    expect(personalCatalog("en").screens.settings.description).toContain("language");
    expect(personalCatalog("gu").dashboard.morning).toBe("શુભ સવાર");
    expect(personalCatalog("gu").fields.lender).toBe("ધિરાણકર્તા");
    expect(personalCatalog("en").fields.openingBalance).toContain("Opening");
    expect(personalCatalog("en").pages.accounts).toBe("Accounts");
    expect(personalCatalog(null).dashboard.bankAndCash).toBe("Bank & cash");
  });

  it("has every English key in Gujarati", () => {
    walk(en, gu, "messages");
  });

  it("personal formatters follow the personal locale", () => {
    localStorage.setItem("sv:personalLocale", "en");
    expect(formatTxType("expense")).toBe("Expense");
    expect(formatTxType("emi_payment")).toBe("EMI Payment");
    expect(formatPaymentMode("cash")).toBe("Cash");
    expect(formatPaymentMode("upi")).toBe("UPI");
    expect(formatIntentLabel("purchase_expense")).toBe("I bought or paid for something");
    expect(formatIntentLabel("other_incoming")).toBe("Other");
    localStorage.setItem("sv:personalLocale", "gu");
    expect(formatTxType("expense")).toBe("ખર્ચ");
    expect(formatPaymentMode("cash")).toBe("રોકડ");
    expect(formatPaymentMode("upi")).toBe("UPI");
    expect(formatIntentLabel("purchase_expense")).toBe("મેં કંઈક ખરીદ્યું અથવા ચૂકવ્યું");
    expect(formatTxType("not_a_type")).toBe("not_a_type");
  });

  it("company shell formatters use company messages", () => {
    vi.stubGlobal("window", { location: { pathname: "/company/vouchers" } });
    localStorage.setItem("sv:personalLocale", "en");
    localStorage.setItem("spv.lang", "gu");
    expect(formatTxType("expense")).toBe("ખર્ચ");
    expect(formatPaymentMode("cash")).toBe("રોકડ");
    expect(formatPaymentMode("upi")).toBe("UPI");
    expect(formatIntentLabel("salary_income")).toBe("પગાર / ધંધો / ફ્રીલાન્સ આવક");
    localStorage.setItem("spv.lang", "en");
    expect(formatTxType("expense")).toBe("Expense");
    expect(formatIntentLabel("salary_income")).toBe("Salary / business / freelance income");
  });

  it("useMessages returns Gujarati when the profile language is Gujarati", () => {
    applyProfileLanguage("gu");
    expect(store.get("sv:personalLocale")).toBe("gu");
    const html = renderToStaticMarkup(createElement(Probe));
    expect(html).toContain("શુભ સવાર");
    expect(html).toContain("ગુજરાતી");
    expect(html).not.toContain("Good morning");
  });
});
