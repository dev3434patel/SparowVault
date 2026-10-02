import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi } from "@/company/api/client";
import { ApiError } from "@/lib/apiClient";
import { PermissionGate, useHasPermission } from "@/company/components/PermissionGate";
import { PinConfirmDialog } from "@/company/components/PinConfirmDialog";
import { useCompanyStore } from "@/company/store/companyStore";
import { useI18n } from "@/company/i18n/react";

export function SettingsPage() {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const workspace = useCompanyStore((s) => s.workspace);
  const [locks, setLocks] = useState<Array<Record<string, unknown>>>([]);
  const [lockBeforeDate, setLockBeforeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lockReason, setLockReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reopenId, setReopenId] = useState<string | null>(null);
  const canReopen = useHasPermission("reopen_period");
  const canManageCompany = useHasPermission("manage_company");
  const hydrateWorkspace = useCompanyStore((s) => s.hydrateWorkspace);
  const [displayName, setDisplayName] = useState("");
  const [gstin, setGstin] = useState("");
  const [fyMonth, setFyMonth] = useState("4");
  const [booksStart, setBooksStart] = useState("");
  const [needImpactAck, setNeedImpactAck] = useState(false);

  useEffect(() => {
    setDisplayName(workspace?.displayName ?? "");
    setGstin(workspace?.gstin ?? "");
    setFyMonth(String(workspace?.financialYearStartMonth ?? 4));
    setBooksStart(workspace?.booksStartDate ?? "");
  }, [workspace?.displayName, workspace?.gstin, workspace?.financialYearStartMonth, workspace?.booksStartDate]);

  async function loadLocks() {
    if (!companyId) return;
    try {
      setLocks(await companyApi.listPeriodLocks(companyId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("settings.loadFailed"));
    }
  }

  useEffect(() => {
    void loadLocks();
  }, [companyId]);

  async function onCreateLock(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !lockBeforeDate) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await companyApi.createPeriodLock(companyId, {
        lockBeforeDate,
        reason: lockReason.trim() || undefined,
      });
      setOk(t("settings.lockCreated"));
      setLockReason("");
      await loadLocks();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Lock failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(acknowledgeImpact: boolean) {
    if (!companyId || !canManageCompany) return;
    const month = Number(fyMonth);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      setErr("Financial year start month must be 1 to 12.");
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await companyApi.updateWorkspaceProfile(companyId, {
        displayName: displayName.trim(),
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
        financialYearStartMonth: month,
        booksStartDate: booksStart.trim() || null,
        ...(acknowledgeImpact ? { acknowledgeImpact: true } : {}),
      });
      await hydrateWorkspace(companyId);
      setNeedImpactAck(false);
      setOk("Profile saved");
    } catch (error) {
      if (error instanceof ApiError && error.code === "BOOKS_IMPACT") {
        setNeedImpactAck(true);
        setErr("Posted vouchers already use this financial year. Confirm the change. Posted vouchers stay as they are.");
      } else {
        setErr(error instanceof Error ? error.message : "Profile update failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    await saveProfile(false);
  }

  function onReopen(lockId: string) {
    setReopenId(lockId);
  }

  async function confirmReopen(pin: string, reason: string) {
    if (!companyId || !reopenId || !canReopen) {
      setErr("Reopen needs the reopen period permission. A PIN alone does not reopen a lock.");
      setReopenId(null);
      return;
    }
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await companyApi.reopenPeriodLock(companyId, {
        lockId: reopenId,
        pin,
        reason: reason.trim() || undefined,
      });
      setOk("Period reopened");
      setReopenId(null);
      await loadLocks();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Reopen failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
          <h2 className="text-sm font-semibold">{t("settings.profile")}</h2>
        </div>
        <div className="space-y-2 p-4 text-sm">
          {!workspace ? (
            <p className="text-muted-foreground">No workspace loaded.</p>
          ) : (
            <>
              <div>
                <span className="text-muted-foreground">Display name: </span>
                {workspace.displayName}
              </div>
              <div>
                <span className="text-muted-foreground">Legal name: </span>
                {workspace.legalName}
              </div>
              <div>
                <span className="text-muted-foreground">Currency: </span>
                {workspace.currency}
              </div>
              <div>
                <span className="text-muted-foreground">FY start month: </span>
                {workspace.financialYearStartMonth}
              </div>
              <div>
                <span className="text-muted-foreground">Books start: </span>
                {workspace.booksStartDate}
              </div>
              <div>
                <span className="text-muted-foreground">GST: </span>
                {workspace.gstEnabled ? workspace.gstin || "enabled" : "off"}
              </div>
              <div>
                <span className="text-muted-foreground">GSTIN: </span>
                {workspace.gstin || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Status: </span>
                {workspace.status}
              </div>
              {canManageCompany ? (
                <form className="space-y-2 pt-2" onSubmit={(e) => void onSaveProfile(e)}>
                  <Field label="Display name">
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={255} />
                  </Field>
                  <Field label="Financial year start month">
                    <Input value={fyMonth} onChange={(e) => { setFyMonth(e.target.value); setNeedImpactAck(false); }} inputMode="numeric" />
                  </Field>
                  <Field label="Books start">
                    <Input type="date" value={booksStart} onChange={(e) => { setBooksStart(e.target.value); setNeedImpactAck(false); }} />
                  </Field>
                  <Field label="GSTIN">
                    <Input
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      maxLength={15}
                      placeholder="15 characters, optional"
                    />
                  </Field>
                  <Button type="submit" size="sm" disabled={busy || !displayName.trim()}>
                    Save profile
                  </Button>
                  {needImpactAck ? (
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void saveProfile(true)}>
                      Confirm impact and save
                    </Button>
                  ) : null}
                </form>
              ) : null}
            </>
          )}
        </div>
      </section>

      <PermissionGate permission="lock_period">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
            <h2 className="text-sm font-semibold">{t("settings.periodLocks")}</h2>
          </div>
          <div className="space-y-3 p-4 text-sm">
            <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => void onCreateLock(e)}>
              <Field label={t("settings.lockBefore")}>
                <Input
                  type="date"
                  value={lockBeforeDate}
                  onChange={(e) => setLockBeforeDate(e.target.value)}
                  required
                />
              </Field>
              <Field label={t("settings.lockReason")} className="flex-1">
                <Input value={lockReason} onChange={(e) => setLockReason(e.target.value)} placeholder={t("common.optional")} />
              </Field>
              <Button type="submit" size="sm" disabled={busy}>
                {t("settings.lockPeriod")}
              </Button>
            </form>
            {locks.length === 0 ? (
              <p className="text-muted-foreground">{t("settings.noLocks")}</p>
            ) : (
              <ul className="space-y-2">
                {locks.map((lock) => {
                  const id = String(lock.id ?? "");
                  const released = lock.released_at ?? lock.releasedAt;
                  return (
                    <li
                      key={id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0"
                    >
                      <div>
                        <div className="font-medium">
                          {t("settings.before", { date: String(lock.lock_before_date ?? lock.lockBeforeDate ?? "—") })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {String(lock.reason ?? "—")}
                          {released ? ` · released ${String(released)}` : " · active"}
                        </div>
                      </div>
                      {!released ? (
                        canReopen ? (
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => onReopen(id)}>
                            {t("settings.reopen")}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Reopen permission required</span>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </PermissionGate>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {ok ? <p className="text-sm text-emerald-600">{ok}</p> : null}
      <PinConfirmDialog
        open={reopenId !== null}
        title={t("settings.reopen")}
        confirmLabel={t("settings.reopen")}
        busy={busy}
        onCancel={() => setReopenId(null)}
        onConfirm={(pin, reason) => void confirmReopen(pin, reason)}
      />
    </div>
  );
}
