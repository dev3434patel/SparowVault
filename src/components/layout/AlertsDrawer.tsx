import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/Sheet";
import { useUIStore } from "@/store/uiStore";
import { useDataStore } from "@/store/dataStore";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Bell, Trash2 } from "lucide-react";
import { alertRepo } from "@/repositories";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/Table";
import { alertPreferenceEnabled } from "@/services/alertPreferences";
import { useMessages } from "@/i18n/useMessages";

export function AlertsDrawer() {
  const open = useUIStore((s) => s.alertsOpen);
  const setOpen = useUIStore((s) => s.setAlertsOpen);
  const alerts = useDataStore((s) => s.alerts);
  const settings = useDataStore((s) => s.settings);
  const visible = alerts.filter((a) => alertPreferenceEnabled(settings?.warningPreferences, a.kind));
  const user = useAuthStore((s) => s.currentUser);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);

  const messages = useMessages();
  const copy = messages.ui.alerts;
  const common = messages.ui.common;
  const unread = visible.filter((a) => !a.dismissed);
  const dismissed = visible.filter((a) => !!a.dismissed);

  async function dismiss(id: string) {
    if (!user) return;
    const updated = await alertRepo.update(id, { dismissed: 1 });
    if (updated) upsertLocal("alerts", updated);
  }
  async function restore(id: string) {
    if (!user) return;
    const updated = await alertRepo.update(id, { dismissed: 0 });
    if (updated) upsertLocal("alerts", updated);
  }
  async function removeAlert(id: string) {
    await alertRepo.hardDelete(id);
    removeLocal("alerts", id);
  }
  async function dismissAll() {
    for (const a of unread) {
      await dismiss(a.id);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" size="lg" className="flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> {copy.drawerTitle}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {unread.length} {copy.activeCount} • {dismissed.length} {copy.dismissed}
          </p>
        </SheetHeader>

        <div className="flex items-center justify-end gap-2 -mt-1">
          {unread.length > 0 ? (
            <Button size="sm" variant="outline" onClick={dismissAll}>
              {common.dismissAll}
            </Button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto mt-2 space-y-2">
          {unread.length === 0 && dismissed.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-income" />}
              title={copy.caughtUp}
              description={copy.caughtUpBody}
            />
          ) : null}

          {unread.map((a) => {
            const Icon =
              a.severity === "danger"
                ? AlertCircle
                : a.severity === "warning"
                  ? AlertTriangle
                  : a.severity === "success"
                    ? CheckCircle2
                    : Info;
            const tone =
              a.severity === "danger"
                ? "text-danger bg-expense-soft border-l-danger"
                : a.severity === "warning"
                  ? "text-warning bg-warning-soft border-l-warning"
                  : a.severity === "success"
                    ? "text-income bg-income-soft border-l-income"
                    : "text-info bg-info-soft border-l-info";
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-md border border-l-4 p-3",
                  tone,
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {a.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.message}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatDate(a.triggeredAt, "dd MMM, p")}
                  </div>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={common.dismiss}
                  onClick={() => dismiss(a.id)}
                >
                  ×
                </Button>
              </div>
            );
          })}

          {dismissed.length > 0 ? (
            <div className="pt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {copy.dismissed}
              </div>
              {dismissed.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 rounded-md border border-dashed border-border p-3 text-muted-foreground mb-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-xs">{a.message}</div>
                  </div>
                  <Button size="icon-sm" variant="ghost" onClick={() => restore(a.id)}>
                    ↺
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removeAlert(a.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
