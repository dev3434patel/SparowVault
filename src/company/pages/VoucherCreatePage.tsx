import { useEffect, useState } from "react";
import { companyNavigate, companyPath, type CompanyNavKey } from "@/company/routes";
import { companyAllows } from "@/company/auth/companyCan";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyPermission } from "@/company/types";
import { ActionTile, PageHeader, SectionCard } from "@/company/components/PageChrome";
import { Button } from "@/components/ui/Button";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  FileSpreadsheet,
  CircleDollarSign,
  Receipt,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/company/i18n/react";

type ChooserTile = {
  labelKey: string;
  hintKey: string;
  pathKey: CompanyNavKey;
  qs?: string;
  permission?: CompanyPermission;
  tone: "in" | "out" | "neutral" | "accent";
  icon: React.ReactNode;
};

const TILES: ChooserTile[] = [
  {
    labelKey: "voucherNew.received",
    hintKey: "voucherNew.receivedHint",
    pathKey: "quick-received",
    permission: "create_receipt",
    tone: "in",
    icon: <ArrowDownLeft className="h-4 w-4" />,
  },
  {
    labelKey: "voucherNew.paid",
    hintKey: "voucherNew.paidHint",
    pathKey: "quick-paid",
    permission: "create_payment",
    tone: "out",
    icon: <ArrowUpRight className="h-4 w-4" />,
  },
  {
    labelKey: "voucherNew.transfer",
    hintKey: "voucherNew.transferHint",
    pathKey: "quick-transfer",
    permission: "create_contra",
    tone: "neutral",
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
  {
    labelKey: "voucherNew.journal",
    hintKey: "voucherNew.journalHint",
    pathKey: "quick-journal",
    permission: "create_journal",
    tone: "accent",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  {
    labelKey: "voucherNew.billRecv",
    hintKey: "voucherNew.billRecvHint",
    pathKey: "receivables",
    permission: "view_receivables",
    tone: "in",
    icon: <CircleDollarSign className="h-4 w-4" />,
  },
  {
    labelKey: "voucherNew.billPay",
    hintKey: "voucherNew.billPayHint",
    pathKey: "payables",
    permission: "view_payables",
    tone: "out",
    icon: <Receipt className="h-4 w-4" />,
  },
];

function can(permissions: CompanyPermission[], state: "loading" | "ready" | "error", need?: CompanyPermission) {
  return companyAllows(state, permissions, need);
}

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);
  return mobile;
}

function ChooserBody({ onPick }: { onPick: (tile: ChooserTile) => void }) {
  const { t } = useI18n();
  const permissions = useCompanyStore((s) => s.permissions);
  const permissionsState = useCompanyStore((s) => s.permissionsState);
  const tiles = TILES.filter((t) => can(permissions, permissionsState, t.permission));

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {tiles.map((tile) => (
        <ActionTile
          key={tile.labelKey}
          label={t(tile.labelKey)}
          hint={t(tile.hintKey)}
          tone={tile.tone}
          icon={tile.icon}
          onClick={() => onPick(tile)}
        />
      ))}
    </div>
  );
}

/** Entry chooser for /vouchers/new — routes to existing quick / bill flows. */
export function VoucherCreatePage() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(true);

  function go(tile: ChooserTile) {
    const base = companyPath(tile.pathKey);
    const path = tile.qs ? `${base}?${tile.qs}` : base;
    companyNavigate(path);
  }

  function closeToList() {
    companyNavigate(companyPath("vouchers"));
  }

  if (isMobile) {
    return (
      <div className="relative min-h-[70vh]">
        <PageHeader
          title={t("voucherNew.title")}
          subtitle={t("voucherNew.choose")}
          actions={
            <Button size="sm" variant="outline" onClick={closeToList}>
              {t("voucherNew.backList")}
            </Button>
          }
        />
        {sheetOpen ? (
          <div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-label={t("voucherNew.what")}
          >
            <button
              type="button"
              className="absolute inset-0"
              aria-label={t("voucherNew.dismiss")}
              onClick={() => {
                setSheetOpen(false);
                closeToList();
              }}
            />
            <div
              className={cn(
                "relative z-10 max-h-[88vh] overflow-y-auto rounded-t-2xl border border-border bg-card px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-elevated)]",
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">{t("voucherNew.what")}</h2>
                  <p className="text-xs text-muted-foreground">{t("voucherNew.sheetHint")}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 p-0"
                  aria-label={t("common.close")}
                  onClick={() => {
                    setSheetOpen(false);
                    closeToList();
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-2 pb-2">
                <ChooserBody onPick={go} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("voucherNew.title")}
        subtitle={t("voucherNew.what")}
        actions={
          <Button size="sm" variant="outline" onClick={closeToList}>
            {t("voucherNew.backVouchers")}
          </Button>
        }
      />
      <SectionCard title={t("voucherNew.entryType")}>
        <ChooserBody onPick={go} />
      </SectionCard>
    </div>
  );
}
