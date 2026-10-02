import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { companyApi } from "@/company/api/client";
import { StatusBadge, type BadgeStatus } from "@/company/components/PageChrome";
import type { MemberRow } from "@/company/pages/users/useMembers";
import { useCompanyStore } from "@/company/store/companyStore";
import { useI18n } from "@/company/i18n/react";

const ASSIGNABLE = ["VIEWER", "DATA_ENTRY", "ACCOUNTANT", "MANAGER", "AUDITOR"];

export function MemberDetail({
  member,
  onClose,
  onChanged,
}: {
  member: MemberRow;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const status = String(member.status ?? "ACTIVE") as BadgeStatus;
  const current = String(member.role_code ?? member.roleCode ?? "");
  const [roleCode, setRoleCode] = useState(ASSIGNABLE.includes(current) ? current : "ACCOUNTANT");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSaveRole() {
    if (!companyId) return;
    setBusy(true);
    setErr(null);
    try {
      await companyApi.setMemberRole(companyId, { membershipId: String(member.id), roleCode });
      onChanged?.();
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("users.roleFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
        <h2 className="text-sm font-semibold">{t("users.memberDetail")}</h2>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          {t("common.close")}
        </Button>
      </div>
      <div className="space-y-2 p-4 text-sm">
        <div>
          <span className="text-muted-foreground">{t("users.name")}: </span>
          {String(member.display_name ?? member.username ?? "—")}
        </div>
        <div>
          <span className="text-muted-foreground">{t("users.userId")}: </span>
          {String(member.user_id ?? member.userId ?? "—")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t("users.status")}:</span>
          <StatusBadge
            status={
              (["ACTIVE", "INACTIVE", "INVITED", "SUSPENDED", "PENDING"] as BadgeStatus[]).includes(status)
                ? status
                : "ACTIVE"
            }
          />
        </div>
        <div>
          <span className="text-muted-foreground">{t("users.role")}: </span>
          {current || "—"}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select
            className="flex h-9 rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
            value={roleCode}
            onChange={(e) => setRoleCode(e.target.value)}
          >
            {ASSIGNABLE.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" disabled={busy} onClick={() => void onSaveRole()}>
            {t("users.saveRole")}
          </Button>
        </div>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
      </div>
    </section>
  );
}
