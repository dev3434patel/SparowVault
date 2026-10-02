import { useEffect, useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
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
import { setPersonalLocale, useMessages } from "@/i18n/useMessages";
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
  const messages = useMessages();
  const s = messages.ui.settings;
  const common = messages.ui.common;
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
  const [locale, setLocale] = useState<"en" | "gu">(() =>
    typeof localStorage !== "undefined" && localStorage.getItem("sv:personalLocale") === "gu" ? "gu" : "en",
  );

  useEffect(() => {
    setForm(settings ?? {});
    if (settings?.language === "en" || settings?.language === "gu") {
      setLocale(settings.language);
      setPersonalLocale(settings.language);
    }
  }, [settings]);

  async function persistLanguage(next: "en" | "gu") {
    if (!user) return;
    setForm((prev) => ({ ...prev, language: next }));
    try {
      if (settings) {
        const updated = await settingsRepo.update(settings.id, { language: next });
        if (updated) setSettings(updated);
      } else {
        const created = await settingsRepo.create({
          userId: user.id,
          data: { ...defaultSettingsPayload(), language: next } as ProfileSettings,
        });
        setSettings(created);
      }
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : messages.ui.settings.saveFailed, kind: "error" });
    }
  }

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
      language: locale,
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
      toast({ title: messages.ui.settings.saved, kind: "success" });
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : messages.ui.settings.saveFailed, kind: "error" });
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
      language: locale,
    };
  }

  async function resetDemo() {
    if (!user) return;
    await seedDemoData(user);
    const { loadAll } = useDataStore.getState();
    await loadAll(user);
    toast({ title: messages.ui.settings.demoAdded, kind: "success" });
    setConfirmResetOpen(false);
  }

  async function wipeAll() {
    if (!user) return;
    if (wipeInput !== `DELETE ${user.username}`) {
      toast({ title: messages.ui.settings.cancelled, kind: "info" });
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
    toast({ title: messages.ui.settings.wiped, kind: "warning" });
    setConfirmWipeOpen(false);
    setWipeInput("");
  }

  return (
    <div>
      <PersonalPageHeader
        screen="settings"
        actions={
          <Button onClick={save} loading={saving} className="w-full sm:w-auto">
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-income" /> {common.saved}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {common.saveChanges}
              </>
            )}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ── Appearance ── */}
        <Card>
          <CardHeader>
            <CardTitle>{s.appearance}</CardTitle>
            <CardDescription>{s.appearanceHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={messages.language.label}>
              <Select
                value={locale}
                onValueChange={(value) => {
                  const next = value === "gu" ? "gu" : "en";
                  setLocale(next);
                  setPersonalLocale(next);
                  void persistLanguage(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{messages.language.english}</SelectItem>
                  <SelectItem value="gu">{messages.language.gujarati}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={s.theme}>
              <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{s.light}</SelectItem>
                  <SelectItem value="dark">{s.dark}</SelectItem>
                  <SelectItem value="system">{s.system}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={s.dateFormat}>
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
                  <SelectItem value="dd/MM/yyyy">{s.indian}</SelectItem>
                  <SelectItem value="MM/dd/yyyy">{s.us}</SelectItem>
                  <SelectItem value="yyyy-MM-dd">{s.iso}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{s.charts}</CardTitle>
            <CardDescription>{s.chartsHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={s.dashboardMode}>
              <Select
                value={dashboardMode}
                onValueChange={(v) => setDashboardMode(v as typeof dashboardMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essential">{messages.modes.essential} — {messages.modes.essentialHint}</SelectItem>
                  <SelectItem value="family">{messages.modes.family} — {messages.modes.familyHint}</SelectItem>
                  <SelectItem value="wealth">{messages.modes.wealth} — {messages.modes.wealthHint}</SelectItem>
                  <SelectItem value="basic">{messages.modes.basic} — {messages.modes.basicHint}</SelectItem>
                  <SelectItem value="normal">{messages.modes.normal} — {messages.modes.normalHint}</SelectItem>
                  <SelectItem value="premium">{messages.modes.premium} — {messages.modes.premiumHint}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={s.chartColors}>
              <Select
                value={chartAccessibility}
                onValueChange={(v) => setChartAccessibility(v as typeof chartAccessibility)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{s.paletteDefault}</SelectItem>
                  <SelectItem value="colorblind">{s.paletteSafe}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <p className="text-xs text-muted-foreground">
              {s.cleanupHint}
            </p>
          </CardContent>
        </Card>

        {/* ── Financial Year ── */}
        <Card>
          <CardHeader>
            <CardTitle>{s.fy}</CardTitle>
            <CardDescription>{s.fyHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <Field label={s.startMonth}>
              <Select
                value={String(form.financialYearStartMonth ?? 4)}
                onValueChange={(v) => setForm({ ...form, financialYearStartMonth: +v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      [1, s.months.m1], [2, s.months.m2], [3, s.months.m3],
                      [4, s.months.m4], [5, s.months.m5], [6, s.months.m6],
                      [7, s.months.m7], [8, s.months.m8], [9, s.months.m9],
                      [10, s.months.m10], [11, s.months.m11], [12, s.months.m12],
                    ] as const
                  ).map(([v, l]) => (
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
            <CardTitle>{s.thresholds}</CardTitle>
            <CardDescription>{s.thresholdsHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={s.warningPct} hint={s.warningHint}>
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
            <Field label={s.criticalPct} hint={s.criticalHint}>
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
            <CardTitle>{s.warnings}</CardTitle>
            <CardDescription>{s.warningsHint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ["budgetAlerts", s.budgetOverruns],
                ["dueAlerts", s.emiCardDue],
                ["udhariAlerts", s.udhariOverdue],
                ["savingsAlerts", s.savingsEmergency],
                ["unusualSpendAlerts", s.unusualSpend],
                ["duplicateAlerts", s.duplicateTx],
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
            <CardTitle>{s.paymentModes}</CardTitle>
            <CardDescription>
              {s.paymentModesHint}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
              <Input
                className="min-w-0"
                value={customMode}
                onChange={(e) => setCustomMode(e.target.value)}
                placeholder={s.paymentPh}
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
                {common.add}
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
                <span className="text-xs text-muted-foreground">{s.noCustomModes}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Data Management ── */}
        <Card className="md:col-span-2 border-warning/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle>{s.data}</CardTitle>
            </div>
            <CardDescription>{s.dataHint}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Stats row */}
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-6">
              {[
                [messages.pages.transactions, data.transactions.length],
                [messages.pages.categories, data.categories.length],
                [messages.pages.accounts, data.accounts.length],
                [messages.pages.budgets, data.budgets.length],
                [messages.pages.goals, data.goals.length],
                [messages.pages.loans, data.loans.length],
              ].map(([label, count]) => (
                <div key={String(label)} className="rounded-lg border border-border p-3 text-center text-xs">
                  <div className="text-lg font-bold tabular-nums">{count}</div>
                  <div className="text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => setConfirmResetOpen(true)}>
                {s.reseed}
              </Button>
              <Button className="w-full sm:w-auto" variant="destructive" onClick={() => setConfirmWipeOpen(true)}>
                <Trash2 className="h-4 w-4" /> {s.wipe}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{s.reseedTitle}</DialogTitle>
            <DialogDescription>
              {s.reseedBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmResetOpen(false)}>
              {common.cancel}
            </Button>
            <Button onClick={resetDemo}>{common.continue}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmWipeOpen} onOpenChange={setConfirmWipeOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{s.wipeTitle}</DialogTitle>
            <DialogDescription>
              {s.wipeBody} <code>{`DELETE ${user?.username ?? ""}`}</code>
            </DialogDescription>
          </DialogHeader>
          <Field label={s.confirmation}>
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
              {common.cancel}
            </Button>
            <Button variant="destructive" onClick={wipeAll}>
              {s.deleteAll}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
