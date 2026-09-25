import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/company/i18n/react";
import type { Locale } from "@/company/i18n/index";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(next: Locale) {
    setLocale(next);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2"
        aria-label={t("common.language")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span className="text-xs font-semibold tabular-nums">{locale === "gu" ? "ગુ" : "EN"}</span>
      </Button>
      {open ? (
        <div
          role="listbox"
          aria-label={t("common.language")}
          className="absolute right-0 z-50 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-[var(--shadow-elevated)]"
        >
          <button
            type="button"
            role="option"
            aria-selected={locale === "en"}
            className="flex w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
            onClick={() => pick("en")}
          >
            {t("common.english")}
          </button>
          <button
            type="button"
            role="option"
            aria-selected={locale === "gu"}
            className="flex w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
            onClick={() => pick("gu")}
          >
            {t("common.gujarati")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
