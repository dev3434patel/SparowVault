import { ToneBadge } from "@/company/components/PageChrome";
import { useI18n } from "@/company/i18n/react";

const ROLE_HELP = ["VIEWER", "DATA_ENTRY", "ACCOUNTANT", "MANAGER", "AUDITOR"] as const;

export function RoleManager() {
  const { t } = useI18n();
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
        <h2 className="text-sm font-semibold">{t("users.roleGuide")}</h2>
      </div>
      <ul className="divide-y divide-border p-2 text-sm">
        {ROLE_HELP.map((code) => (
          <li key={code} className="flex items-start justify-between gap-3 px-2 py-2.5">
            <div>
              <ToneBadge label={code} tone="info" />
              <p className="mt-1 text-xs text-muted-foreground">{t(`users.role.${code}`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
