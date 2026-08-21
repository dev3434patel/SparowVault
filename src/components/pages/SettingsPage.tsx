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
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/components/theme/ThemeProvider";
import { settingsRepo } from "@/repositories";
import { useUIStore } from "@/store/uiStore";
import type { ProfileSettings } from "@/types";
import { AlertTriangle, CheckCircle2, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { seedDemoData } from "@/services/demoData";
import {
  accountRepo,
  alertRepo,
  budgetRepo,
  cardRepo,
  categoryRepo,
  emiRepo,
  exportHistoryRepo,
  goalContribRepo,
  goalRepo,
  investmentRepo,
  loanRepo,
  recurringRepo,
  reminderRepo,
  savingsContribRepo,
  transactionRepo,
  udhariRepo,
  udhariSettlementRepo,
} from "@/repositories";

export function SettingsPage() {
  const user = useAuthStore((s) => s.currentUser);
  const { mode, setMode } = useTheme();
  const settings = useDataStore((s) => s.settings);
  const setSettings = useDataStore((s) => s.setSettings);
  const toast = useUIStore((s) => s.toast);
  const dashboardMode = useUIStore((s) => s.dashboardMode);
  const setDashboardMode = useUIStore((s) => s.setDashboardMode);
  const chartAccessibility = useUIStore((s) => s.chartAccessibility);
  const setChartAccessibility = useUIStore((s) => s.setChartAccessibility);
  const data = useDataStore();

  const [form, setForm] = useState<Partial<ProfileSettings>>(settings ?? {});
  const [customMode, setCustomMode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);
  const [wipeInput, setWipeInput] = useState("");

  useEffect(() => {
    setForm(settings ?? {});
  }, [settings]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const payload: Partial<ProfileSettings> = {
      ...defaultSettingsPayload(),
      ...form,
      budgetThresholds: {
        warning: form.budgetThresholds?.warning ?? 80,
        critical: form.budgetThresholds?.critical ?? 100,
      },
      warningPreferences: {
        budgetAlerts: form.warningPreferences?.budgetAlerts ?? true,
        dueAlerts: form.warningPreferences?.dueAlerts ?? true,
        udhariAlerts: form.warningPreferences?.udhariAlerts ?? true,
        savingsAlerts: form.warningPreferences?.savingsAlerts ?? true,
        unusualSpendAlerts: form.warningPreferences?.unusualSpendAlerts ?? true,
        duplicateAlerts: form.warningPreferences?.duplicateAlerts ?? true,
      },
      quickAddDefaults: form.quickAddDefaults ?? {},
      customPaymentModes: form.customPaymentModes ?? [],
      currency: "INR",
    };
    try {
      if (settings) {
        const updated = await settingsRepo.update(settings.id, payload);
        if (updated) setSettings(updated);
      } else {
        const created = await settingsRepo.create({
          userId: user.id,
          data: payload as ProfileSettings,
        });
        setSettings(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "Settings saved", kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to save settings", kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  function defaultSettingsPayload(): Partial<ProfileSettings> {
    return {
      theme: mode,
      financialYearStartMonth: 4,
      dateFormat: "dd/MM/yyyy",
      customPaymentModes: [],
      budgetThresholds: { warning: 80, critical: 100 },
      quickAddDefaults: {},
      warningPreferences: {
        budgetAlerts: true,
        dueAlerts: true,
        udhariAlerts: true,
        savingsAlerts: true,
        unusualSpendAlerts: true,
        duplicateAlerts: true,
      },
      currency: "INR",
    };
  }

  async function resetDemo() {
    if (!user) return;
    await seedDemoData(user);
    const { loadAll } = useDataStore.getState();
    await loadAll(user);
    toast({ title: "Demo data added", kind: "success" });
    setConfirmResetOpen(false);
  }

  async function wipeAll() {
    if (!user) return;
    if (wipeInput !== `DELETE ${user.username}`) {
      toast({ title: "Cancelled", kind: "info" });
      return;
    }
    const repos = [
      accountRepo,
      alertRepo,
      budgetRepo,
      cardRepo,
      categoryRepo,
      emiRepo,
      exportHistoryRepo,
      goalContribRepo,
      goalRepo,
      investmentRepo,
      loanRepo,
      recurringRepo,
      reminderRepo,
      savingsContribRepo,
      transactionRepo,
      udhariRepo,
      udhariSettlementRepo,
    ];
    for (const r of repos) await r.hardDeleteAllForUser(user.id);
    const { loadAll } = useDataStore.getState();
    await loadAll(user);
    toast({ title: "Profile data wiped", kind: "warning" });
    setConfirmWipeOpen(false);
    setWipeInput("");
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Theme, financial year, alert thresholds, and advanced data controls."
        actions={
          <Button onClick={save} loading={saving} className="w-full sm:w-auto">
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
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ── Appearance ── */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Theme and display preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Theme">
              <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date format">
              <Select
                value={form.dateFormat ?? "dd/MM/yyyy"}
                onValueChange={(v) =>
                  setForm({ ...form, dateFormat: v as ProfileSettings["dateFormat"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">dd/MM/yyyy (Indian)</SelectItem>
                  <SelectItem value="MM/dd/yyyy">MM/dd/yyyy (US)</SelectItem>
                  <SelectItem value="yyyy-MM-dd">yyyy-MM-dd (ISO)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Charts &amp; dashboard</CardTitle>
            <CardDescription>Local preferences (this device only)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Default dashboard mode">
              <Select
                value={dashboardMode}
                onValueChange={(v) => setDashboardMode(v as typeof dashboardMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic — essentials only</SelectItem>
                  <SelectItem value="normal">Normal — full snapshot</SelectItem>
                  <SelectItem value="premium">Premium — adds net worth &amp; tax signals</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Chart colors">
              <Select
                value={chartAccessibility}
                onValueChange={(v) => setChartAccessibility(v as typeof chartAccessibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default palette</SelectItem>
                  <SelectItem value="colorblind">Color-blind safe (Wong-style)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <p className="text-xs text-muted-foreground">
              Category merge and duplicate checks live under Categories → Cleanup &amp; merge.
            </p>
          </CardContent>
        </Card>

        {/* ── Financial Year ── */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Year</CardTitle>
            <CardDescription>Used for annual reports and budget cycles</CardDescription>
          </CardHeader>
          <CardContent>
            <Field label="Start month">
              <Select
                value={String(form.financialYearStartMonth ?? 4)}
                onValueChange={(v) => setForm({ ...form, financialYearStartMonth: +v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    [1, "January"], [2, "February"], [3, "March"],
                    [4, "April (default)"], [5, "May"], [6, "June"],
                    [7, "July"], [8, "August"], [9, "September"],
                    [10, "October"], [11, "November"], [12, "December"],
                  ].map(([v, l]) => (
                    <SelectItem key={v} value={String(v)}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* ── Budget Thresholds ── */}
        <Card>
          <CardHeader>
            <CardTitle>Budget thresholds</CardTitle>
            <CardDescription>Alert levels as % of budget limit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Warning %" hint="Show warning badge when spent reaches this %">
              <Input
                type="number"
                min={0}
                max={200}
                value={form.budgetThresholds?.warning ?? 80}
                onChange={(e) =>
                  setForm({
                    ...form,
                    budgetThresholds: {
                      warning: +e.target.value,
                      critical: form.budgetThresholds?.critical ?? 100,
                    },
                  })
                }
              />
            </Field>
            <Field label="Critical %" hint="Show danger badge when spent reaches this %">
              <Input
                type="number"
                min={0}
                max={200}
                value={form.budgetThresholds?.critical ?? 100}
                onChange={(e) =>
                  setForm({
                    ...form,
                    budgetThresholds: {
                      warning: form.budgetThresholds?.warning ?? 80,
                      critical: +e.target.value,
                    },
                  })
                }
              />
            </Field>
          </CardContent>
        </Card>

        {/* ── Alert Preferences ── */}
        <Card>
          <CardHeader>
            <CardTitle>Warnings &amp; alerts</CardTitle>
            <CardDescription>Turn individual alert categories on/off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ["budgetAlerts", "Budget overruns"],
                ["dueAlerts", "EMI & card due"],
                ["udhariAlerts", "Udhari overdue"],
                ["savingsAlerts", "Savings & emergency fund"],
                ["unusualSpendAlerts", "Unusual spend detected"],
                ["duplicateAlerts", "Duplicate transactions"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg bg-surface-2 p-2"
              >
                <span className="min-w-0 pr-2 text-sm leading-tight">{label}</span>
                <Switch
                  checked={form.warningPreferences?.[key] ?? true}
                  onCheckedChange={(v) =>
                    setForm({
                      ...form,
                      warningPreferences: {
                        budgetAlerts: true,
                        dueAlerts: true,
                        udhariAlerts: true,
                        savingsAlerts: true,
                        unusualSpendAlerts: true,
                        duplicateAlerts: true,
                        ...(form.warningPreferences ?? {}),
                        [key]: v,
                      },
                    })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Custom Payment Modes ── */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Custom payment modes</CardTitle>
            <CardDescription>
              Add non-standard payment methods (e.g. Paytm QR, crypto, store credit)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <Input
                className="min-w-0"
                value={customMode}
                onChange={(e) => setCustomMode(e.target.value)}
                placeholder="e.g. Paytm QR, PhonePe Business, Store Credit"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customMode.trim()) {
                    setForm({
                      ...form,
                      customPaymentModes: [
                        ...(form.customPaymentModes ?? []),
                        customMode.trim(),
                      ],
                    });
                    setCustomMode("");
                  }
                }}
              />
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => {
                  if (!customMode.trim()) return;
                  setForm({
                    ...form,
                    customPaymentModes: [
                      ...(form.customPaymentModes ?? []),
                      customMode.trim(),
                    ],
                  });
                  setCustomMode("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.customPaymentModes ?? []).map((m, i) => (
                <span
                  key={i}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs"
                >
                  <span className="truncate">{m}</span>
                  <button
                    type="button"
                    className="ml-1 text-muted-foreground hover:text-expense"
                    onClick={() =>
                      setForm({
                        ...form,
                        customPaymentModes: (form.customPaymentModes ?? []).filter(
                          (_, j) => j !== i,
                        ),
                      })
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
              {(form.customPaymentModes ?? []).length === 0 && (
                <span className="text-xs text-muted-foreground">No custom modes added yet.</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Data Management ── */}
        <Card className="md:col-span-2 border-warning/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle>Data management</CardTitle>
            </div>
            <CardDescription>Demo data and destructive actions. These cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Stats row */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
              {[
                ["Transactions", data.transactions.length],
                ["Categories", data.categories.length],
                ["Accounts", data.accounts.length],
                ["Budgets", data.budgets.length],
                ["Goals", data.goals.length],
                ["Loans", data.loans.length],
              ].map(([label, count]) => (
                <div key={String(label)} className="rounded-lg border border-border p-3 text-center text-xs">
                  <div className="text-lg font-bold tabular-nums">{count}</div>
                  <div className="text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => setConfirmResetOpen(true)}>
                Re-seed demo data
              </Button>
              <Button className="w-full sm:w-auto" variant="destructive" onClick={() => setConfirmWipeOpen(true)}>
                <Trash2 className="h-4 w-4" /> Wipe all profile data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Re-seed demo data?</DialogTitle>
            <DialogDescription>
              This will add sample records to your profile. Existing records remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={resetDemo}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmWipeOpen} onOpenChange={setConfirmWipeOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Confirm profile wipe</DialogTitle>
            <DialogDescription>
              Type <code>{`DELETE ${user?.username ?? ""}`}</code> to permanently remove all profile data.
            </DialogDescription>
          </DialogHeader>
          <Field label="Confirmation text">
            <Input
              value={wipeInput}
              onChange={(e) => setWipeInput(e.target.value)}
              placeholder={user ? `DELETE ${user.username}` : "DELETE username"}
            />
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmWipeOpen(false);
                setWipeInput("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={wipeAll}>
              Delete all data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
