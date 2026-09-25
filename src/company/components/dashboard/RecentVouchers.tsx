import { Button } from "@/components/ui/Button";
import { CompanyMoney } from "@/company/components/CompanyMoney";
import { SkeletonList } from "@/company/components/CompanySkeleton";
import { SectionCard, StatusBadge, type BadgeStatus } from "@/company/components/PageChrome";
import type { RecentVoucher, TopParty } from "@/company/hooks/useDashboardData";
import { companyNavigate, companyPath } from "@/company/routes";
import { useI18n } from "@/company/i18n/react";

type RecentVouchersProps = {
  initialLoading: boolean;
  topParties: TopParty[];
  recent: RecentVoucher[];
};

export function RecentVouchers({ initialLoading, topParties, recent }: RecentVouchersProps) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        title={t("dashboard.receivables")}
        actions={
          <Button size="sm" variant="ghost" onClick={() => companyNavigate(companyPath("receivables"))}>
            {t("common.all")}
          </Button>
        }
      >
        {initialLoading ? (
          <SkeletonList rows={5} />
        ) : topParties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No receivable exposure.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {topParties.map((p) => (
              <li key={p.partyId}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-surface-2"
                  onClick={() => companyNavigate(companyPath("party-detail", { id: p.partyId }))}
                >
                  <span className="truncate font-medium">{p.name}</span>
                  <CompanyMoney paise={p.outstanding} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!initialLoading ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Category subtotals may overlap because a party can belong to multiple categories. Company totals are
            deduplicated.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        title={t("dashboard.recent")}
        actions={
          <Button size="sm" variant="ghost" onClick={() => companyNavigate(companyPath("day-book"))}>
            View Day Book
          </Button>
        }
      >
        {initialLoading ? (
          <SkeletonList rows={5} />
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vouchers in this period.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-surface-2"
                  onClick={() => companyNavigate(companyPath("voucher-detail", { id: r.id }))}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {r.type} · {r.date}
                      </span>
                      <StatusBadge status={r.status as BadgeStatus} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{r.narration || r.id}</div>
                  </div>
                  <CompanyMoney paise={r.amountPaise} className="text-sm" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
