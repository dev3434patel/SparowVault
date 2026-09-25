import { ErrorState, SectionCard } from "@/company/components/PageChrome";
import { SkeletonChart } from "@/company/components/CompanySkeleton";
import { companyNavigate, companyPath } from "@/company/routes";
import type { AgeingBucket, FlowChartPoint } from "@/company/hooks/useDashboardData";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/company/i18n/react";

type CashFlowChartProps = {
  initialLoading: boolean;
  errs: Record<string, string | null>;
  flowChart: FlowChartPoint[];
  ageing: AgeingBucket[];
  load: () => void | Promise<void>;
};

export function CashFlowChart({ initialLoading, errs, flowChart, ageing, load }: CashFlowChartProps) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard title={t("dashboard.cashFlow")}>
        {initialLoading ? (
          <SkeletonChart className="h-56" />
        ) : (
          <>
            {errs.flow ? <ErrorState message={errs.flow} onRetry={load} /> : null}
            {flowChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cash movements in this period.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="in"
                      name="Money In"
                      fill="hsl(var(--income))"
                      radius={[4, 4, 0, 0]}
                      onClick={() => companyNavigate(companyPath("day-book"))}
                    />
                    <Bar
                      dataKey="out"
                      name="Money Out"
                      fill="hsl(var(--expense))"
                      radius={[4, 4, 0, 0]}
                      onClick={() => companyNavigate(companyPath("day-book"))}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title={t("bills.ageing")}>
        {initialLoading ? (
          <SkeletonChart className="h-56" />
        ) : ageing.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ageing buckets to show.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageing}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  dataKey="amount"
                  name="₹"
                  fill="hsl(var(--info))"
                  radius={[4, 4, 0, 0]}
                  onClick={() => companyNavigate(companyPath("receivables"))}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
