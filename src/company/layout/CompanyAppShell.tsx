import { useState, type ReactNode } from "react";
import { CompanyHeader } from "@/company/layout/CompanyHeader";
import { CompanySidebar } from "@/company/layout/CompanySidebar";
import { CompanyMobileNav } from "@/company/layout/CompanyMobileNav";
import { COMPANY_SIDEBAR_NAV, companyNavigate, type CompanyNavKey } from "@/company/routes";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import { IndianRupee } from "lucide-react";
import { useI18n } from "@/company/i18n/react";

export function CompanyAppShell({
  activeKey,
  children,
}: {
  activeKey: CompanyNavKey;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useI18n();
  const groups = COMPANY_SIDEBAR_NAV.reduce<Record<string, typeof COMPANY_SIDEBAR_NAV>>((acc, item) => {
    (acc[item.groupKey] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--surface))] text-foreground">
      <CompanySidebar activeKey={activeKey} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CompanyHeader onMenu={() => setMenuOpen(true)} />
        <main className={cn("flex-1 overflow-y-auto")}>
          <div className="mx-auto w-full max-w-[1400px] p-3 pb-24 md:p-6 md:pb-6">{children}</div>
        </main>
        <CompanyMobileNav activeKey={activeKey} />
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[300px] p-0" aria-label={t("common.navigate")}>
          <SheetTitle className="sr-only">{t("a11y.openNavigation")}</SheetTitle>
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--goal))] text-white">
              <IndianRupee className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </div>
            <div>
              <div className="text-sm font-semibold">{t("common.companyBooks")}</div>
              <div className="text-[11px] text-muted-foreground">{t("common.navigate")}</div>
            </div>
          </div>
          <nav className="space-y-3 overflow-y-auto p-2 pb-10">
            {Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
                  {t(group)}
                </div>
                <div className="space-y-0.5">
                  {items.map((it) => {
                    const active = activeKey === it.key;
                    return (
                      <button
                        key={it.key}
                        type="button"
                        className={cn(
                          "flex w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                          active
                            ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                        )}
                        onClick={() => {
                          companyNavigate(it.path);
                          setMenuOpen(false);
                        }}
                      >
                        {t(it.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
