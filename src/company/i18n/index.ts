/**
 * Lightweight company i18n — no heavy dependency.
 * Lookup: messages[locale][key] → messages.en[key] → key itself.
 */
export type Locale = "en" | "gu";
export type MessageDict = Record<string, string>;
export type MessagesByLocale = Record<Locale, MessageDict>;

export type I18nInstance = {
  locale: Locale;
  fallback: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
};

const missingLogged = new Set<string>();

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined && params[name] !== null ? String(params[name]) : `{${name}}`,
  );
}

export function createI18n({
  locale,
  fallback = "en",
  messages,
  onLocaleChange,
}: {
  locale: Locale;
  fallback?: Locale;
  messages: MessagesByLocale;
  onLocaleChange?: (locale: Locale) => void;
}): I18nInstance {
  let current: Locale = locale === "gu" ? "gu" : "en";

  function t(key: string, params?: Record<string, string | number>): string {
    const primary = messages[current]?.[key];
    if (primary !== undefined) return interpolate(primary, params);
    const fb = messages[fallback]?.[key];
    if (fb !== undefined) {
      if (import.meta.env?.DEV && current !== fallback) {
        const miss = `${current}:${key}`;
        if (!missingLogged.has(miss)) {
          missingLogged.add(miss);
          console.warn(`[i18n] missing key "${key}" for locale "${current}", using ${fallback}`);
        }
      }
      return interpolate(fb, params);
    }
    if (import.meta.env?.DEV) {
      const miss = `*:${key}`;
      if (!missingLogged.has(miss)) {
        missingLogged.add(miss);
        console.warn(`[i18n] missing key "${key}" in all locales`);
      }
    }
    return interpolate(key, params);
  }

  return {
    get locale() {
      return current;
    },
    fallback,
    t,
    setLocale(next: Locale) {
      current = next === "gu" ? "gu" : "en";
      onLocaleChange?.(current);
    },
  };
}

export const LANG_STORAGE_KEY = "spv.lang";

/** Future: persist preferred_locale on company_memberships (DB) — not required for PHASE_07. */

export function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw === "gu" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return "en";
}

export function writeStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Display dates; Gujarati month names via gu-IN when available. */
export function formatCompanyDate(isoOrDate: string | Date, locale: Locale): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate.includes("T") ? isoOrDate : `${isoOrDate}T12:00:00`) : isoOrDate;
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  try {
    const tag = locale === "gu" ? "gu-IN" : "en-IN";
    return new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short", year: "numeric" }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  }
}
