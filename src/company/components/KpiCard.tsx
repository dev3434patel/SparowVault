import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CompanyMoney, type MoneySemantic } from "@/company/components/CompanyMoney";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const accent: Record<MoneySemantic, string> = {
  neutral: "before:bg-[hsl(var(--primary))]",
  debit: "before:bg-[hsl(var(--info))]",
  credit: "before:bg-[hsl(var(--income))]",
  profit: "before:bg-[hsl(var(--income))]",
  loss: "before:bg-[hsl(var(--expense))]",
  overdue: "before:bg-[hsl(var(--expense))]",
};

export function KpiCard({
  label,
  paise,
  subline,
  definition,
  loading,
  error,
  onRetry,
  onClick,
  semantic = "neutral",
  className,
}: {
  label: string;
  paise?: number;
  subline?: ReactNode;
  definition?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClick?: () => void;
  semantic?: MoneySemantic;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-[var(--shadow-card)] before:absolute before:inset-y-0 before:left-0 before:w-1",
        accent[semantic],
        onClick && !error && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        className,
      )}
      onClick={error ? undefined : onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardContent className="space-y-1.5 p-4 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {label}
          </div>
          <div className="flex items-center gap-1">
            {definition ? (
              <span className="text-[11px] text-muted-foreground/80" title={definition} aria-label={definition}>
                ⓘ
              </span>
            ) : null}
            {onClick && !error ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" /> : null}
          </div>
        </div>
        {loading ? (
          <div className="h-7 w-28 animate-pulse rounded-md bg-muted" />
        ) : error ? (
          <div className="space-y-2">
            <p className="text-xs text-destructive">{error}</p>
            {onRetry ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
              >
                Retry
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <CompanyMoney paise={paise ?? 0} semantic={semantic} className="text-xl tracking-tight md:text-[1.35rem]" />
            {subline ? <div className="text-[11px] leading-snug text-muted-foreground">{subline}</div> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
