import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import { useI18n } from "@/company/i18n/react";

const ROLES = ["VIEWER", "DATA_ENTRY", "ACCOUNTANT", "MANAGER", "AUDITOR"];

export function InviteUser({ onInvited }: { onInvited?: () => void }) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [userId, setUserId] = useState("");
  const [roleCode, setRoleCode] = useState("VIEWER");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !userId.trim()) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await companyApi.inviteMember(companyId, { userId: userId.trim(), roleCode });
      setOk(t("users.inviteSaved"));
      setUserId("");
      onInvited?.();
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("users.inviteFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
        <h2 className="text-sm font-semibold">{t("users.invite")}</h2>
      </div>
      <div className="p-4">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => void onInvite(e)}>
          <Field label={t("users.userId")}>
            <Input value={userId} onChange={(e) => setUserId(e.target.value)} required />
          </Field>
          <Field label={t("users.role")}>
            <select
              className="flex h-9 rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" size="sm" disabled={busy}>
            {t("users.invite")}
          </Button>
        </form>
        {err ? <p className="mt-2 text-sm text-destructive">{err}</p> : null}
        {ok ? <p className="mt-2 text-sm text-emerald-600">{ok}</p> : null}
      </div>
    </section>
  );
}
