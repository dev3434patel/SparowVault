import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { VoucherStatus } from "@/company/types";
import { useI18n } from "@/company/i18n/react";

export type BadgeTone = "success" | "warn" | "danger" | "neutral" | "info";

/** Statuses StatusBadge accepts with an exact tone map (no substring heuristics). */
export type BadgeStatus =
  | VoucherStatus
  | "ACTIVE"
  | "INACTIVE"
  | "INVITED"
  | "SUSPENDED"
  | "PENDING"
  | "SETTLED"
  | "PARTIAL"
  | "OVERDUE"
  | "OPEN"
  | "CLOSED";

export const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-[hsl(var(--income-soft))] text-[hsl(var(--income))] border-transparent",
  warn: "bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))] border-transparent",
  danger: "bg-[hsl(var(--expense-soft))] text-[hsl(var(--expense))] border-transparent",
  neutral: "bg-[hsl(var(--surface-3))] text-[hsl(var(--foreground))] border-border",
  info: "bg-[hsl(var(--info-soft))] text-[hsl(var(--info))] border-transparent",
};

export const STATUS_TONE: Record<BadgeStatus, BadgeTone> = {
  POSTED: "success",
  APPROVED: "success",
  SETTLED: "success",
  ACTIVE: "success",
  OPEN: "info",
  INVITED: "info",
  DRAFT: "warn",
  PENDING_APPROVAL: "warn",
  PENDING: "warn",
  PARTIAL: "warn",
  SUSPENDED: "warn",
  REJECTED: "danger",
  CANCELLED: "danger",
  REVERSED: "danger",
  OVERDUE: "danger",
  INACTIVE: "neutral",
  CLOSED: "neutral",
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const { t } = useI18n();
  const tone = STATUS_TONE[status];
  const statusKey = `status.${status}`;
  const translated = t(statusKey);
  const label = translated !== statusKey ? translated : status.replace(/_/g, " ");
  return (
    <span
      role="status"
      className={cn(
        "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        BADGE_TONE_CLASS[tone],
      )}
    >
      {label}
    </span>
  );
}

/** Non-status chip (e.g. member counts, role labels) — explicit tone, no status map. */
export function ToneBadge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        BADGE_TONE_CLASS[tone],
      )}
    >
      {label}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-1 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {actions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2" data-primary-actions>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function SectionCard({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {actions}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-gradient-to-b from-card to-[hsl(var(--surface))] px-6 py-10 text-center shadow-[var(--shadow-card)]">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-[hsl(var(--expense-soft))] px-3 py-2.5 text-sm"
      role="alert"
      aria-live="polite"
    >
      <p className="text-destructive">{message}</p>
      {onRetry ? (
        <button type="button" className="mt-1 text-xs font-semibold text-destructive underline" onClick={onRetry}>
          {t("common.retryAction")}
        </button>
      ) : null}
    </div>
  );
}

/** Compact action tile for dashboard / mobile quick add */
export function ActionTile({
  label,
  hint,
  onClick,
  tone = "neutral",
  icon,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  tone?: "neutral" | "in" | "out" | "accent";
  icon?: ReactNode;
}) {
  const tones = {
    neutral: "border-border bg-card hover:border-[hsl(var(--border-strong))] hover:bg-surface-2",
    in: "border-[hsl(var(--income))]/35 bg-card hover:bg-[hsl(var(--income-soft))]",
    out: "border-[hsl(var(--expense))]/35 bg-card hover:bg-[hsl(var(--expense-soft))]",
    accent: "border-[hsl(var(--info))]/35 bg-card hover:bg-[hsl(var(--info-soft))]",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hint ? `${label}. ${hint}` : label}
      className={cn(
        "flex min-h-[4.25rem] items-center gap-3 rounded-xl border px-3.5 py-3 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]",
        tones[tone],
      )}
    >
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--surface))] text-foreground/80">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-sm font-semibold tracking-tight">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
    </button>
  );
}
