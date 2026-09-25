import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createI18n, formatCompanyDate, readStoredLocale, writeStoredLocale, LANG_STORAGE_KEY } from "@/company/i18n/index";
import en from "@/company/i18n/locales/en.json";
import gu from "@/company/i18n/locales/gu.json";

const messages = { en, gu };

describe("company i18n t() fallback", () => {
  it("returns locale string when present", () => {
    const i18n = createI18n({ locale: "gu", fallback: "en", messages });
    expect(i18n.t("dashboard.title")).toBe(gu["dashboard.title"]);
  });

  it("falls back to English when gu key missing", () => {
    const sparse = {
      en: { "only.en": "English only" },
      gu: {} as Record<string, string>,
    };
    const i18n = createI18n({ locale: "gu", fallback: "en", messages: sparse });
    expect(i18n.t("only.en")).toBe("English only");
  });

  it("falls back to key itself when missing everywhere", () => {
    const i18n = createI18n({ locale: "en", fallback: "en", messages });
    expect(i18n.t("totally.missing.key")).toBe("totally.missing.key");
  });

  it("interpolates params", () => {
    const i18n = createI18n({ locale: "en", fallback: "en", messages });
    expect(i18n.t("common.refreshed", { time: "10:00" })).toBe("Refreshed 10:00");
  });

  it("setLocale switches active dictionary", () => {
    const i18n = createI18n({ locale: "en", fallback: "en", messages });
    expect(i18n.t("common.save")).toBe("Save");
    i18n.setLocale("gu");
    expect(i18n.locale).toBe("gu");
    expect(i18n.t("common.save")).toBe(gu["common.save"]);
  });
});

describe("spv.lang persistence", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to en", () => {
    expect(readStoredLocale()).toBe("en");
  });

  it("persists gu and survives re-read", () => {
    writeStoredLocale("gu");
    expect(store.get(LANG_STORAGE_KEY)).toBe("gu");
    expect(readStoredLocale()).toBe("gu");
  });
});

describe("formatCompanyDate", () => {
  it("formats en-IN style", () => {
    const s = formatCompanyDate("2026-09-24", "en");
    expect(s).toMatch(/24/);
    expect(s).toMatch(/2026/);
  });

  it("formats gu locale without throwing", () => {
    const s = formatCompanyDate("2026-09-24", "gu");
    expect(s.length).toBeGreaterThan(4);
  });
});

describe("en/gu key parity (smoke)", () => {
  it("has same key set", () => {
    const enKeys = Object.keys(en).sort();
    const guKeys = Object.keys(gu).sort();
    expect(guKeys).toEqual(enKeys);
  });
});
