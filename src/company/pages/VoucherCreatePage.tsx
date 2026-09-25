import { useEffect, useState } from "react";
import { companyNavigate, companyPath, type CompanyNavKey } from "@/company/routes";
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

type ChooserTile = {
  label: string;
  hint: string;
  pathKey: CompanyNavKey;
  qs?: string;
  permission?: CompanyPermission;
  tone: "in" | "out" | "neutral" | "accent";
  icon: React.ReactNode;
};

const TILES: ChooserTile[] = [
  {
    label: "Money Received",
    hint: "Receipt into cash or bank",
    pathKey: "quick-received",
    permission: "create_receipt",
    tone: "in",
    icon: <ArrowDownLeft className="h-4 w-4" />,
  },
  {
    label: "Money Paid",
    hint: "Payment from cash or bank",
    pathKey: "quick-paid",
    permission: "create_payment",
    tone: "out",
    icon: <ArrowUpRight className="h-4 w-4" />,
  },
  {
    label: "Transfer",
    hint: "Move between cash & bank",
    pathKey: "quick-transfer",
    permission: "create_contra",
    tone: "neutral",
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
  {
    label: "Journal",
    hint: "Adjustment / non-cash entry",
    pathKey: "quick-journal",
    permission: "create_journal",
    tone: "accent",
    icon: <FileSpreadsheet className="h-4 w-4" />,
  },
  {
    label: "Against a Bill (Receivable)",
    hint: "Collect on an open receivable",
    pathKey: "receivables",
    permission: "view_receivables",
    tone: "in",
    icon: <CircleDollarSign className="h-4 w-4" />,
  },
  {
    label: "Against a Bill (Payable)",
    hint: "Pay an open payable bill",
    pathKey: "payables",
    permission: "view_payables",
    tone: "out",
    icon: <Receipt className="h-4 w-4" />,
  },
];

function can(permissions: CompanyPermission[], need?: CompanyPermission) {
  if (!need) return true;
  if (permissions.length === 0) return true;
  return permissions.includes(need);
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
  const permissions = useCompanyStore((s) => s.permissions);
  const tiles = TILES.filter((t) => can(permissions, t.permission));

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {tiles.map((t) => (
        <ActionTile
          key={t.label}
          label={t.label}
          hint={t.hint}
          tone={t.tone}
          icon={t.icon}
          onClick={() => onPick(t)}
        />
      ))}
    </div>
  );
}

/** Entry chooser for /vouchers/new — routes to existing quick / bill flows. */
export function VoucherCreatePage() {
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
          title="New voucher"
          subtitle="Choose what to record"
          actions={
            <Button size="sm" variant="outline" onClick={closeToList}>
              Back to list
            </Button>
          }
        />
        {sheetOpen ? (
          <div
            className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-label="What do you want to record?"
          >
            <button
              type="button"
              className="absolute inset-0"
              aria-label="Dismiss"
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
                  <h2 className="text-base font-semibold tracking-tight">What do you want to record?</h2>
                  <p className="text-xs text-muted-foreground">Pick a flow — opens the existing entry screen</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 p-0"
                  aria-label="Close"
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
        title="New voucher"
        subtitle="What do you want to record?"
        actions={
          <Button size="sm" variant="outline" onClick={closeToList}>
            Back to vouchers
          </Button>
        }
      />
      <SectionCard title="Entry type">
        <ChooserBody onPick={go} />
      </SectionCard>
    </div>
  );
}
