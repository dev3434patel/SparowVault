import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyPermission } from "@/company/types";
import { useI18n } from "@/company/i18n/react";

const PERMISSION_LABELS: Partial<Record<CompanyPermission, string>> = {
  view_dashboard: "View dashboard",
  view_party: "View parties",
  view_party_balance: "View party balances",
  manage_parties: "Manage parties",
  view_ledgers: "View ledgers",
  manage_ledgers: "Manage ledgers",
  create_receipt: "Create receipts",
  create_payment: "Create payments",
  create_contra: "Create transfers",
  create_journal: "Create journals",
  approve_voucher: "Approve vouchers",
  post_voucher: "Post vouchers",
  reverse_voucher: "Reverse vouchers",
  view_receivables: "View receivables",
  view_payables: "View payables",
  view_day_book: "View day book",
  view_pnl: "View profit & loss",
  view_balance_sheet: "View balance sheet",
  view_trial_balance: "View trial balance",
  view_cash_bank_books: "View cash & bank books",
  view_audit: "View audit",
  export_reports: "Export reports",
  export_backup: "Export backup",
  manage_users: "Manage users",
  manage_company: "Manage company",
  manage_dimensions: "Manage dimensions",
  lock_period: "Lock periods",
  reopen_period: "Reopen periods",
  manage_opening_balances: "Manage opening balances",
};

function can(permissions: CompanyPermission[], need: CompanyPermission) {
  if (permissions.length === 0) return true;
  return permissions.includes(need);
}

export function permissionLabel(permission: CompanyPermission): string {
  return PERMISSION_LABELS[permission] ?? permission.replace(/_/g, " ");
}

export function PermissionDeniedBanner({
  permission,
  reason,
}: {
  permission: CompanyPermission;
  reason?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning-soft))] px-4 py-3 text-sm"
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning))]" aria-hidden />
      <div>
        <p className="font-medium text-foreground">{reason ?? t("permission.deniedBody")}</p>
        <p className="mt-0.5 text-xs font-semibold text-foreground">{t("permission.deniedTitle")}</p>
      </div>
    </div>
  );
}

/** Renders children when permitted; otherwise an honest inline denial banner (never silent hide). */
export function PermissionGate({
  permission,
  reason,
  children,
  fallback,
}: {
  permission: CompanyPermission;
  reason?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const permissions = useCompanyStore((s) => s.permissions);
  if (can(permissions, permission)) return <>{children}</>;
  return <>{fallback ?? <PermissionDeniedBanner permission={permission} reason={reason} />}</>;
}

export function useHasPermission(permission: CompanyPermission): boolean {
  const permissions = useCompanyStore((s) => s.permissions);
  return can(permissions, permission);
}
