import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useUIStore } from "@/store/uiStore";
import { useNavStore, type NavKey } from "@/store/navStore";
import { useDataStore } from "@/store/dataStore";
import {
  LayoutDashboard,
  Receipt,
  Target,
  BarChart3,
  Wallet,
  CreditCard,
  Upload,
  Download,
  Settings,
  Bell,
  Sparkles,
  Search,
  Plus,
  Users,
  CalendarDays,
  Home,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";

interface CmdItem {
  id: string;
  label: string;
  group: "Navigate" | "Actions" | "Transactions";
  action: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
}

const NAV_ITEMS: { key: NavKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "income", label: "Income", icon: Receipt },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "budgets", label: "Budgets", icon: BarChart3 },
  { key: "goals", label: "Goals", icon: Target },
  { key: "accounts", label: "Accounts", icon: Wallet },
  { key: "cards", label: "Cards", icon: CreditCard },
  { key: "loans", label: "Loans & EMI", icon: CreditCard },
  { key: "udhari", label: "Udhari & Advances", icon: Users },
  { key: "savings", label: "Savings & Investments", icon: Wallet },
  { key: "bill-calendar", label: "Bills & Calendar", icon: CalendarDays },
  { key: "household", label: "Household", icon: Home },
  { key: "reconciliation", label: "Reconciliation", icon: Scale },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "suggestions", label: "Suggestions", icon: Sparkles },
  { key: "export", label: "Export Center", icon: Download },
  { key: "import", label: "Import Center", icon: Upload },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const openQuickAdd = useUIStore((s) => s.openQuickAdd);
  const setActive = useNavStore((s) => s.setActive);
  const transactions = useDataStore((s) => s.transactions);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const items: CmdItem[] = useMemo(() => {
    const acts: CmdItem[] = [
      ...NAV_ITEMS.map((n) => ({
        id: `nav:${n.key}`,
        label: `Go to ${n.label}`,
        group: "Navigate" as const,
        action: () => {
          setActive(n.key);
          setOpen(false);
        },
        icon: n.icon,
      })),
      {
        id: "act:add-income",
        label: "Add income",
        group: "Actions",
        action: () => {
          openQuickAdd("income");
          setOpen(false);
        },
        icon: Plus,
        hint: "Quick add",
      },
      {
        id: "act:add-expense",
        label: "Add expense",
        group: "Actions",
        action: () => {
          openQuickAdd("expense");
          setOpen(false);
        },
        icon: Plus,
        hint: "Quick add",
      },
      {
        id: "act:add-transfer",
        label: "Add transfer",
        group: "Actions",
        action: () => {
          openQuickAdd("transfer");
          setOpen(false);
        },
        icon: Plus,
      },
    ];
    if (query.length > 1) {
      const q = query.toLowerCase();
      for (const t of transactions.slice(0, 80)) {
        const blob = `${t.merchantOrPerson} ${t.description} ${t.type}`.toLowerCase();
        if (blob.includes(q)) {
          acts.push({
            id: `tx:${t.id}`,
            label: `${t.merchantOrPerson || t.description || t.type} — ${formatINR(t.amount)}`,
            group: "Transactions",
            action: () => {
              setActive("transactions");
              setOpen(false);
            },
            icon: Receipt,
            hint: t.type,
          });
        }
      }
    }
    return acts;
  }, [openQuickAdd, setActive, setOpen, transactions, query]);

  const filtered = query
    ? items.filter((i) =>
        i.label.toLowerCase().includes(query.toLowerCase()),
      )
    : items;
  const grouped = filtered.reduce<Record<string, CmdItem[]>>((acc, it) => {
    (acc[it.group] ||= []).push(it);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden" size="md" showClose={false}>
        <VisuallyHidden.Root>
          <DialogTitle>Command palette</DialogTitle>
        </VisuallyHidden.Root>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search transactions, jump to page…"
            className="flex-1 bg-transparent py-3 text-sm outline-none"
          />
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[10px]">
            Esc
          </kbd>
        </div>
        <div className="max-h-[420px] overflow-y-auto py-1">
          {Object.entries(grouped).map(([group, arr]) => (
            <div key={group} className="px-1">
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </div>
              {arr.map((it) => {
                const Icon = it.icon;
                return (
                  <button
                    key={it.id}
                    onClick={it.action}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface-2",
                    )}
                  >
                    {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.hint ? (
                      <span className="text-[10px] text-muted-foreground">
                        {it.hint}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matches
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
