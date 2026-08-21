import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { alertRepo } from "@/repositories";
import { useUIStore } from "@/store/uiStore";
import { runAlertEngine } from "@/services/alertsEngine";
import {
  AlertTriangle,
  BellOff,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { pathToNav } from "@/lib/navRoutes";
import { useNavStore } from "@/store/navStore";
import { EmptyState } from "@/components/ui/Table";

export function AlertsPage() {
  const user = useAuthStore((s) => s.currentUser);
  const setActive = useNavStore((s) => s.setActive);
  const alerts = useDataStore((s) => s.alerts);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);

  const active = useMemo(() => alerts.filter((a) => !a.dismissed), [alerts]);
  const dismissed = useMemo(() => alerts.filter((a) => a.dismissed), [alerts]);

  const severityCounts = useMemo(() => {
    const m: Record<string, number> = { info: 0, warning: 0, danger: 0, success: 0 };
    for (const a of active) m[a.severity] = (m[a.severity] ?? 0) + 1;
    return m;
  }, [active]);

  async function dismiss(id: string) {
    const u = await alertRepo.update(id, { dismissed: 1 });
    if (u) upsertLocal("alerts", u);
  }
  async function restore(id: string) {
    const u = await alertRepo.update(id, { dismissed: 0 });
    if (u) upsertLocal("alerts", u);
  }
  async function hardDelete(id: string) {
    await alertRepo.hardDelete(id);
    removeLocal("alerts", id);
  }

  async function rerun() {
    if (!user) return;
    await runAlertEngine(user);
    const fresh = await alertRepo.list(user.id);
    const freshIds = new Set(fresh.map((a) => a.id));
    for (const a of alerts) {
      if (!freshIds.has(a.id)) removeLocal("alerts", a.id);
    }
    for (const a of fresh) upsertLocal("alerts", a);
    toast({ title: "Alerts refreshed", kind: "success" });
  }

  async function dismissAll() {
    const ids = active.map((a) => a.id);
    const updated = await alertRepo.updateMany(ids, { dismissed: 1 });
    for (const a of updated) upsertLocal("alerts", a);
  }

  return (
    <div>
      <PageHeader
        title="Alerts Center"
        description="Proactive warnings: budget, EMI, dues, udhari, savings, and more."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={rerun}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            {active.length > 0 ? (
              <Button variant="outline" onClick={dismissAll}>
                <BellOff className="h-4 w-4" /> Dismiss all
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active" value={active.length} tone="primary" />
        <StatCard label="Critical" value={severityCounts.danger ?? 0} tone="danger" />
        <StatCard label="Warnings" value={severityCounts.warning ?? 0} tone="warning" />
        <StatCard label="Info" value={severityCounts.info ?? 0} tone="info" />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed ({dismissed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          {active.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6 text-income" />}
                  title="All clear"
                  description="No active alerts. Your finances are in a good place right now."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {active
                .slice()
                .sort(
                  (a, b) =>
                    sevScore(b.severity) - sevScore(a.severity) ||
                    +new Date(b.triggeredAt) - +new Date(a.triggeredAt),
                )
                .map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${sevBg(a.severity)}`}
                          >
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold">{a.title}</div>
                              <Badge variant={sevVariant(a.severity)}>
                                {a.severity}
                              </Badge>
                            </div>
                            <div className="mt-0.5 text-sm text-muted-foreground">
                              {a.message}
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {formatDate(a.triggeredAt)} · {a.kind}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          {a.linkHref ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActive(pathToNav(a.linkHref!), "user")}
                            >
                              Open
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" onClick={() => dismiss(a.id)}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="dismissed">
          {dismissed.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState title="No dismissed alerts" description="Nothing here." />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {dismissed.map((a) => (
                <Card key={a.id} className="opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{a.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {a.message}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => restore(a.id)}>
                          Restore
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => hardDelete(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "danger" | "warning" | "info";
}) {
  const color =
    tone === "danger"
      ? "text-expense"
      : tone === "warning"
        ? "text-warning"
        : tone === "info"
          ? "text-info"
          : "text-primary";
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={color}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function sevScore(s: string) {
  return s === "danger" ? 3 : s === "warning" ? 2 : s === "info" ? 1 : 0;
}
function sevVariant(s: string): "danger" | "warning" | "info" | "success" {
  return s === "danger"
    ? "danger"
    : s === "warning"
      ? "warning"
      : s === "success"
        ? "success"
        : "info";
}
function sevBg(s: string) {
  return s === "danger"
    ? "bg-expense-soft text-expense"
    : s === "warning"
      ? "bg-warning-soft text-warning"
      : s === "success"
        ? "bg-income-soft text-income"
        : "bg-info-soft text-info";
}
