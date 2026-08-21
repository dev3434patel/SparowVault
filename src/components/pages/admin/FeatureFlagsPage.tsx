import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { getAdminFeatureFlags, saveAdminFeatureFlags } from "@/lib/cloud/saasClient";
import { useUIStore } from "@/store/uiStore";
import { AlertCircle, CheckCircle2, Flag, Loader2, RefreshCw, Save } from "lucide-react";

// Human-readable labels for known flag keys
const FLAG_LABELS: Record<string, { label: string; description: string }> = {
  cloud_sync_enabled:       { label: "Server sync",            description: "Allow users to sync data to the SQL server" },
  subscriptions_enabled:    { label: "Subscriptions",          description: "Enable the subscription / billing system" },
  razorpay_enabled:         { label: "Razorpay payments",      description: "Accept payments via Razorpay gateway" },
  registration_enabled:     { label: "New registrations",      description: "Allow new users to create accounts" },
  maintenance_mode:         { label: "Maintenance mode",       description: "Block all non-admin access with maintenance page" },
  demo_mode:                { label: "Demo mode",              description: "Show demo data and disable destructive actions" },
  export_enabled:           { label: "Data export",            description: "Allow users to export their data as CSV/JSON" },
  import_enabled:           { label: "Data import",            description: "Allow users to import data from files" },
  goals_enabled:            { label: "Goals module",           description: "Show the goals / savings targets section" },
  investments_enabled:      { label: "Investments module",     description: "Show the investments tracking section" },
  udhari_enabled:           { label: "Udhari (ledger)",        description: "Show the Udhari / personal ledger section" },
  recurring_enabled:        { label: "Recurring transactions", description: "Enable recurring transaction scheduling" },
};

function flagMeta(key: string): { label: string; description: string } {
  return FLAG_LABELS[key] ?? {
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "",
  };
}

export function FeatureFlagsPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useUIStore((s) => s.toast);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const raw = await getAdminFeatureFlags();
      setFlags(raw as Record<string, boolean>);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveAdminFeatureFlags(flags);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "Feature flags saved", kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to save flags", kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;

  return (
    <div>
      <PageHeader
        title="Feature Flags"
        description={
          loading
            ? "Global feature visibility and rollout switches."
            : `${enabledCount} of ${totalCount} flags enabled`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} loading={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={loading}>
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-income" /> Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save changes
                </>
              )}
            </Button>
          </div>
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

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading feature flags…
        </div>
      )}

      {!loading && totalCount === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Flag className="mx-auto mb-3 h-8 w-8 opacity-30" />
            No feature flags configured in the database yet.
          </CardContent>
        </Card>
      )}

      {!loading && totalCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flags</CardTitle>
            <CardDescription>
              Changes take effect immediately after saving. Use with care in production.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 p-0 pb-2">
            {Object.entries(flags).map(([key, value]) => {
              const meta = flagMeta(key);
              const isDanger = key === "maintenance_mode";
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between px-4 py-3 transition-colors hover:bg-surface-2 ${
                    isDanger && value ? "bg-expense/5" : ""
                  }`}
                >
                  <div className="flex-1 pr-4">
                    <div className={`text-sm font-medium ${isDanger && value ? "text-expense" : ""}`}>
                      {meta.label}
                    </div>
                    {meta.description && (
                      <div className="text-xs text-muted-foreground">{meta.description}</div>
                    )}
                    <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">{key}</div>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(v) => setFlags((f) => ({ ...f, [key]: v }))}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
