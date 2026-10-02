import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { getAdminPlans, saveAdminPlan } from "@/lib/cloud/saasClient";
import { useUIStore } from "@/store/uiStore";
import { AlertCircle, Loader2, Pencil, Plus, RefreshCw } from "lucide-react";
import { fillMessage, useMessages } from "@/i18n/useMessages";

type PlanRow = {
  id?: number;
  code: string;
  name: string;
  description?: string;
  price_inr: string;
  billing_interval: "monthly" | "yearly";
  trial_days: number;
  is_active: number;
};

const EMPTY_FORM: PlanRow = {
  code: "",
  name: "",
  description: "",
  price_inr: "299.00",
  billing_interval: "monthly",
  trial_days: 7,
  is_active: 1,
};

export function PlanManagementPage() {
  const chrome = useMessages().ui;
  const copy = chrome.admin.body.plans;
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PlanRow>(EMPTY_FORM);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const toast = useUIStore((s) => s.toast);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAdminPlans();
      setPlans(rows as PlanRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function autoCode(name: string) {
    return name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  const activeForm = editing ?? form;
  const setActiveForm = editing ? setEditing : setForm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = activeForm;
    if (!payload.name.trim() || !payload.code.trim()) {
      toast({ title: copy.nameCodeRequired, kind: "warning" });
      return;
    }
    if (!payload.price_inr || isNaN(Number(payload.price_inr))) {
      toast({ title: copy.priceInvalid, kind: "warning" });
      return;
    }
    setSaving(true);
    try {
      await saveAdminPlan({
        ...(payload.id ? { id: payload.id } : {}),
        code: payload.code,
        name: payload.name,
        description: payload.description ?? "",
        price_inr: String(Number(payload.price_inr).toFixed(2)),
        billing_interval: payload.billing_interval,
        trial_days: Number(payload.trial_days),
        is_active: payload.is_active,
      });
      toast({ title: editing ? copy.updated : copy.created, kind: "success" });
      setForm(EMPTY_FORM);
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : copy.saveFailed, kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" /> {chrome.common.refresh}
          </Button>
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

      {/* ── Create / Edit Form ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            {editing ? fillMessage(copy.editTitle, { name: editing.name }) : copy.newTitle}
          </CardTitle>
          <CardDescription>
            {editing ? copy.editHelp : copy.newHelp}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={copy.name} required>
              <Input
                value={activeForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setActiveForm({
                    ...activeForm,
                    name,
                    code: activeForm.id ? activeForm.code : autoCode(name),
                  } as PlanRow);
                }}
                placeholder={copy.namePlaceholder}
              />
            </Field>
            <Field label={copy.code} required hint={copy.codeHint}>
              <Input
                value={activeForm.code}
                onChange={(e) =>
                  setActiveForm({
                    ...activeForm,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                  } as PlanRow)
                }
                placeholder={copy.codePlaceholder}
              />
            </Field>
            <Field label={copy.price} required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={activeForm.price_inr}
                onChange={(e) => setActiveForm({ ...activeForm, price_inr: e.target.value } as PlanRow)}
                placeholder="299.00"
              />
            </Field>
            <Field label={copy.interval}>
              <Select
                value={activeForm.billing_interval}
                onValueChange={(v) =>
                  setActiveForm({ ...activeForm, billing_interval: v as "monthly" | "yearly" } as PlanRow)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{copy.monthly}</SelectItem>
                  <SelectItem value="yearly">{copy.yearly}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={copy.trialDays} hint={copy.trialHint}>
              <Input
                type="number"
                min="0"
                max="90"
                value={activeForm.trial_days}
                onChange={(e) => setActiveForm({ ...activeForm, trial_days: +e.target.value } as PlanRow)}
              />
            </Field>
            <Field label={copy.descriptionField}>
              <Input
                value={activeForm.description ?? ""}
                onChange={(e) => setActiveForm({ ...activeForm, description: e.target.value } as PlanRow)}
                placeholder={copy.descriptionPlaceholder}
              />
            </Field>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3 md:col-span-2">
              <Switch
                checked={activeForm.is_active === 1}
                onCheckedChange={(v) => setActiveForm({ ...activeForm, is_active: v ? 1 : 0 } as PlanRow)}
              />
              <div>
                <div className="text-sm font-medium">{chrome.common.active}</div>
                <div className="text-xs text-muted-foreground">
                  {copy.activeHelp}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Button type="submit" loading={saving}>
                <Plus className="h-4 w-4" />
                {editing ? copy.update : copy.create}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  {chrome.common.cancel}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Plans List ── */}
      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {copy.loading}
        </div>
      )}

      {!loading && plans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {copy.empty}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {plans.map((p) => (
          <Card key={p.id} className={`transition-opacity ${p.is_active ? "" : "opacity-60"}`}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{p.name}</span>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                    {p.code}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.is_active ? "bg-income/15 text-income" : "bg-surface-2 text-muted-foreground"}`}>
                    {p.is_active ? chrome.common.active : chrome.admin.inactive}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    ₹{Number(p.price_inr).toLocaleString("en-IN")}
                  </span>
                  <span>/ {p.billing_interval === "monthly" ? copy.monthly : p.billing_interval === "yearly" ? copy.yearly : p.billing_interval}</span>
                  {p.trial_days > 0 && <span>· {fillMessage(copy.trialBadge, { days: p.trial_days })}</span>}
                  {p.description && <span>· {p.description}</span>}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing({ ...p })}
              >
                <Pencil className="h-3.5 w-3.5" /> {copy.edit}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
