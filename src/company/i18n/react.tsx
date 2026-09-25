import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createI18n,
  formatCompanyDate,
  readStoredLocale,
  writeStoredLocale,
  type Locale,
  type MessagesByLocale,
} from "@/company/i18n/index";
import en from "@/company/i18n/locales/en.json";
import gu from "@/company/i18n/locales/gu.json";

const messages = { en, gu } as MessagesByLocale;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (isoOrDate: string | Date) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window !== "undefined" ? readStoredLocale() : "en",
  );

  const i18n = useMemo(
    () =>
      createI18n({
        locale,
        fallback: "en",
        messages,
      }),
    [locale],
  );

  const setLocale = useCallback((next: Locale) => {
    writeStoredLocale(next);
    setLocaleState(next);
    try {
      window.dispatchEvent(new CustomEvent("spv-lang-change", { detail: next }));
    } catch {
      /* ignore */
    }
  }, []);

  // Cross-tab / test harness: react when spv.lang changes without a full remount race.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "spv.lang") return;
      const next = e.newValue === "gu" ? "gu" : "en";
      setLocaleState(next);
    }
    function onCustom(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      const next = detail === "gu" ? "gu" : "en";
      setLocaleState(next);
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("spv-lang-change", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("spv-lang-change", onCustom as EventListener);
    };
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => i18n.t(key, params),
      formatDate: (d) => formatCompanyDate(d, locale),
    }),
    [locale, setLocale, i18n],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback for tests / early mount — English only
    const i18n = createI18n({ locale: "en", fallback: "en", messages });
    return {
      locale: "en",
      setLocale: () => {},
      t: (key, params) => i18n.t(key, params),
      formatDate: (d) => formatCompanyDate(d, "en"),
    };
  }
  return ctx;
}
