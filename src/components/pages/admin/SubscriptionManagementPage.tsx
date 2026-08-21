import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { adminSubscriptionAction, getAdminSubscriptions } from "@/lib/cloud/saasClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";

type SubRow = {
  id: number;
  user_id: string;
  username: string;
  display_name: string;
  plan_code: string;
  plan_name: string;
  status: "pending" | "trial" | "active" | "past_due" | "cancelled" | "expired";
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  amount_inr: string | null;
  latest_payment_status?: string | null;
  failed_webhook_count?: number | string | null;
  scheduled_plan_id?: number | string | null;
  scheduled_change_at?: string | null;
};

type StatusFilter = "all" | "pending" | "trial" | "active" | "past_due" | "cancelled" | "expired";

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  active:    { bg: "bg-income/15",   text: "text-income",           dot: "bg-income" },
  trial:     { bg: "bg-primary/15",  text: "text-primary",          dot: "bg-primary" },
  pending:   { bg: "bg-warning/15",  text: "text-warning",          dot: "bg-warning" },
  past_due:  { bg: "bg-expense/15",  text: "text-expense",          dot: "bg-expense" },
  cancelled: { bg: "bg-surface-2",   text: "text-muted-foreground", dot: "bg-muted-foreground" },
  expired:   { bg: "bg-surface-2",   text: "text-muted-foreground", dot: "bg-muted-foreground" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.expired;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status.replace("_", " ")}
    </span>
  );
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN");
}

export function SubscriptionManagementPage() {
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [mutatingId, setMutatingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAdminSubscriptions();
      setSubscriptions(rows as SubRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function mutateSubscription(subscriptionId: number, action: "manual_extend" | "cancel") {
    setMutatingId(subscriptionId);
    setError(null);
    try {
      await adminSubscriptionAction({
        subscriptionId,
        action,
        days: action === "manual_extend" ? 30 : undefined,
        reason: action === "manual_extend" ? "Admin manual extension" : "Admin cancellation",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Subscription update failed");
    } finally {
      setMutatingId(null);
    }
  }

  const filtered = useMemo(() => {
    let list = subscriptions;
    if (statusFilter !== "all") list = list.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.display_name?.toLowerCase().includes(q) ||
          s.username?.toLowerCase().includes(q) ||
          s.plan_code?.toLowerCase().includes(q) ||
          s.plan_name?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [subscriptions, statusFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, trial: 0, past_due: 0 };
    for (const s of subscriptions) {
      if (s.status in c) c[s.status]++;
    }
    return c;
  }, [subscriptions]);

  return (
    <div>
      <PageHeader
        title="Subscription Management"
        description={
          loading
            ? "Loading…"
            : `${subscriptions.length} total · ${counts.active} active · ${counts.trial} trial · ${counts.past_due} past due`
        }
        actions={
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-expense/30 bg-expense/10 p-4 text-sm text-expense">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="outline" size="sm" onClick={load} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by user or plan…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="past_due">Past due</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading subscriptions…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {search || statusFilter !== "all"
              ? "No subscriptions match your filters."
              : "No subscriptions found."}
          </CardContent>
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Billing health</TableHead>
                  <TableHead>Admin actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{s.display_name ?? s.username}</div>
                      <div className="text-xs text-muted-foreground">@{s.username}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{s.plan_name ?? s.plan_code}</div>
                      <div className="font-mono text-xs text-muted-foreground">{s.plan_code}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmt(s.started_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.status === "trial"
                        ? `Trial ends ${fmt(s.trial_ends_at)}`
                        : fmt(s.expires_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {s.amount_inr
                        ? `₹${Number(s.amount_inr).toLocaleString("en-IN")}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>Payment: {s.latest_payment_status ?? "none"}</div>
                      <div>Failed webhooks: {Number(s.failed_webhook_count ?? 0)}</div>
                      {s.scheduled_plan_id ? (
                        <div>Scheduled plan #{s.scheduled_plan_id} on {fmt(s.scheduled_change_at ?? null)}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          loading={mutatingId === s.id}
                          onClick={() => mutateSubscription(s.id, "manual_extend")}
                        >
                          Extend 30d
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          loading={mutatingId === s.id}
                          onClick={() => mutateSubscription(s.id, "cancel")}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
