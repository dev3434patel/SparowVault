import { Button } from "@/components/ui/Button";
import { CompanyMoney } from "@/company/components/CompanyMoney";
import { SectionCard } from "@/company/components/PageChrome";
import { companyNavigate, companyPath } from "@/company/routes";
import { useI18n } from "@/company/i18n/react";

type AttentionSectionProps = {
  arOverdue: number;
  apOverdue: number;
  showApprovals: boolean;
  approvals: number;
  onAccount: number;
  load: () => void | Promise<void>;
  figuresUnverified?: boolean;
};

export function AttentionSection({
  arOverdue,
  apOverdue,
  showApprovals,
  approvals,
  onAccount,
  load,
  figuresUnverified = false,
}: AttentionSectionProps) {
  const { t } = useI18n();
  return (
    <SectionCard
      title={t("dashboard.attention")}
      actions={
        <Button size="sm" variant="ghost" onClick={() => void load()}>
          {t("common.refresh")}
        </Button>
      }
    >
      <div className="space-y-2 text-sm">
        {arOverdue > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[hsl(var(--expense))]/20 bg-[hsl(var(--expense-soft))]/50 px-3.5 py-2.5">
            <span>
              <CompanyMoney paise={arOverdue} semantic="overdue" /> overdue receivables
            </span>
            <Button size="sm" onClick={() => companyNavigate(companyPath("receivables"))}>
              {t("dashboard.viewAll")}
            </Button>
          </div>
        ) : null}
        {apOverdue > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[hsl(var(--expense))]/20 bg-[hsl(var(--expense-soft))]/50 px-3.5 py-2.5">
            <span>
              <CompanyMoney paise={apOverdue} semantic="overdue" /> overdue payables
            </span>
            <Button size="sm" onClick={() => companyNavigate(companyPath("payables"))}>
              {t("dashboard.viewAll")}
            </Button>
          </div>
        ) : null}
        {showApprovals && approvals > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[hsl(var(--warning))]/25 bg-[hsl(var(--warning-soft))]/60 px-3.5 py-2.5">
            <span>{t("dashboard.pendingApprovals")}: {approvals}</span>
            <Button size="sm" onClick={() => companyNavigate(companyPath("approvals"))}>
              {t("common.view")}
            </Button>
          </div>
        ) : null}
        {onAccount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[hsl(var(--info))]/20 bg-[hsl(var(--info-soft))]/50 px-3.5 py-2.5">
            <span>
              <CompanyMoney paise={onAccount} /> awaiting bill allocation
            </span>
            <Button size="sm" onClick={() => companyNavigate(companyPath("receivables"))}>
              Allocate now
            </Button>
          </div>
        ) : null}
        {!arOverdue && !apOverdue && !(showApprovals && approvals) && !onAccount ? (
          <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-muted-foreground">
            {figuresUnverified
              ? "Some figures failed to load. They are not a verified zero."
              : "Nothing urgent right now — books look clear."}
          </p>
        ) : null}
      </div>
    </SectionCard>
  );
}
