import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { getAdminFeatureFlags, saveAdminFeatureFlags } from "@/lib/cloud/saasClient";
import { useUIStore } from "@/store/uiStore";
import { AlertCircle, CheckCircle2, Flag, Loader2, RefreshCw, Save } from "lucide-react";
import { fillMessage, useMessages } from "@/i18n/useMessages";

const KNOWN_FLAGS = [
  "cloud_sync_enabled",
  "subscriptions_enabled",
  "razorpay_enabled",
  "registration_enabled",
  "maintenance_mode",
  "demo_mode",
  "export_enabled",
  "import_enabled",
  "goals_enabled",
  "investments_enabled",
  "udhari_enabled",
  "recurring_enabled",
] as const;

type FlagCopy = Record<string, string>;

function flagMeta(key: string, copy: FlagCopy): { label: string; description: string } {
  if ((KNOWN_FLAGS as readonly string[]).includes(key)) {
    return { label: copy[key] ?? key, description: copy[`${key}Help`] ?? "" };
  }
  return {
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "",
  };
}

export function FeatureFlagsPage() {
  const chrome = useMessages().ui;
  const copy = chrome.admin.body.flags;
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
      setError(e instanceof Error ? e.message : copy.loadFailed);
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
      toast({ title: copy.savedToast, kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : copy.saveFailed, kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;

  return (
    <div>
      <PageHeader
        title={copy.title}
        description={
          loading
            ? copy.intro
            : fillMessage(copy.enabledOf, { enabled: enabledCount, total: totalCount })
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} loading={loading}>
              <RefreshCw className="h-4 w-4" /> {chrome.common.refresh}
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={loading}>
              {saved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-income" /> {chrome.common.saved}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> {chrome.common.saveChanges}
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
            {chrome.admin.retry}
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {copy.loading}
        </div>
      )}

      {!loading && totalCount === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Flag className="mx-auto mb-3 h-8 w-8 opacity-30" />
            {copy.empty}
          </CardContent>
        </Card>
      )}

      {!loading && totalCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{copy.cardTitle}</CardTitle>
            <CardDescription>
              {copy.cardHelp}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 p-0 pb-2">
            {Object.entries(flags).map(([key, value]) => {
              const meta = flagMeta(key, copy);
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
