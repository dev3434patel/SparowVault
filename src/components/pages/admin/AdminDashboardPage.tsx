import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getAdminDashboard } from "@/lib/cloud/saasClient";
import { Users, CreditCard, TrendingUp, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

interface DashStats {
  users?: number;
  activeSubscriptions?: number;
  mrrEstimateInr?: string | number;
  failedPayments?: number;
  rateLimitBuckets?: number;
  recentAuditEvents24h?: number;
  payments24h?: number;
  actor?: string;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDashboard();
      setStats(data as DashStats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const CARDS = [
    {
      label: "Total Users",
      value: loading ? "—" : String(stats.users ?? 0),
      icon: Users,
      accent: "text-primary",
      bg: "bg-primary/10",
      desc: "All registered accounts",
    },
    {
      label: "Active Subscriptions",
      value: loading ? "—" : String(stats.activeSubscriptions ?? 0),
      icon: CreditCard,
      accent: "text-income",
      bg: "bg-income/10",
      desc: "Currently paying users",
    },
    {
      label: "MRR Estimate",
      value: loading ? "—" : `₹${Number(stats.mrrEstimateInr ?? 0).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      accent: "text-income",
      bg: "bg-income/10",
      desc: "Monthly recurring revenue",
    },
    {
      label: "Failed Payments",
      value: loading ? "—" : String(stats.failedPayments ?? 0),
      icon: AlertCircle,
      accent: Number(stats.failedPayments ?? 0) > 0 ? "text-expense" : "text-muted-foreground",
      bg: Number(stats.failedPayments ?? 0) > 0 ? "bg-expense/10" : "bg-surface-2",
      desc: "Payments that failed and need review",
    },
    {
      label: "API Buckets",
      value: loading ? "—" : String(stats.rateLimitBuckets ?? 0),
      icon: RefreshCw,
      accent: "text-info",
      bg: "bg-info/10",
      desc: "Active rate-limit bucket rows",
    },
    {
      label: "Audit Events (24h)",
      value: loading ? "—" : String(stats.recentAuditEvents24h ?? 0),
      icon: AlertCircle,
      accent: "text-warning",
      bg: "bg-warning/10",
      desc: "Recent audited admin/user mutations",
    },
    {
      label: "Payments (24h)",
      value: loading ? "—" : String(stats.payments24h ?? 0),
      icon: CreditCard,
      accent: "text-primary",
      bg: "bg-primary/10",
      desc: "Payment records created in last day",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Platform-wide operational overview."
        actions={
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-expense/30 bg-expense/10 p-4 text-sm text-expense">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={load} className="ml-auto shrink-0">
            Retry
          </Button>
        </div>
      )}

      {loading && !error && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading stats…
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">{c.label}</CardDescription>
                  <span className={`rounded-md p-1.5 ${c.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${c.accent}`} />
                  </span>
                </div>
                <CardTitle className={`text-2xl font-bold tabular-nums ${c.accent}`}>
                  {c.value}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && !error && stats.actor && (
        <p className="mt-5 text-xs text-muted-foreground">
          Viewed as <span className="font-medium text-foreground">@{stats.actor}</span>
        </p>
      )}
    </div>
  );
}
