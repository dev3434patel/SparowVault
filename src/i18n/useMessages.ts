import { useEffect, useState } from "react";
import { en, type Messages } from "./messages/en";
import { gu } from "./messages/gu";

const listeners = new Set<() => void>();

export function personalCatalog(locale: string | null | undefined): Messages {
  return locale === "gu" ? gu : en;
}

export function setPersonalLocale(locale: "en" | "gu"): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem("sv:personalLocale", locale);
  listeners.forEach((listener) => listener());
}

/** Apply the language stored on the personal settings record without a reload. */
export function applyProfileLanguage(language: string | null | undefined): void {
  if (language !== "en" && language !== "gu") return;
  setPersonalLocale(language);
}

export function fillMessage(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined && params[name] !== null ? String(params[name]) : `{${name}}`,
  );
}

export function useMessages(): Messages {
  const [locale, setLocale] = useState(() =>
    typeof localStorage === "undefined" ? null : localStorage.getItem("sv:personalLocale"),
  );
  useEffect(() => {
    const listener = () => {
      setLocale(typeof localStorage === "undefined" ? null : localStorage.getItem("sv:personalLocale"));
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return personalCatalog(locale);
}
