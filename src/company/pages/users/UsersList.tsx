import { SkeletonList } from "@/company/components/CompanySkeleton";
import { PermissionGate } from "@/company/components/PermissionGate";
import { PageHeader, StatusBadge, type BadgeStatus } from "@/company/components/PageChrome";
import { MemberDetail } from "@/company/pages/users/MemberDetail";
import { InviteUser } from "@/company/pages/users/InviteUser";
import { RoleManager } from "@/company/pages/users/RoleManager";
import { useMembers } from "@/company/pages/users/useMembers";
import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { useI18n } from "@/company/i18n/react";

export function UsersList() {
  const { t } = useI18n();
  const { members, err, loading, load } = useMembers();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const selected = members.find((m) => String(m.id) === selectedId) ?? null;

  return (
    <PermissionGate permission="manage_users">
      <div className="space-y-4">
        <PageHeader
          title={t("users.title")}
          subtitle={t("users.subtitle")}
          actions={
            <Button size="sm" onClick={() => setShowInvite((v) => !v)}>
              {showInvite ? t("users.hideInvite") : t("users.invite")}
            </Button>
          }
        />

        {showInvite ? <InviteUser onInvited={() => void load()} /> : null}

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
            <h2 className="text-sm font-semibold">{t("users.memberships")}</h2>
          </div>
          <div className="space-y-1 p-4 text-sm">
            {loading ? <SkeletonList rows={4} /> : null}
            {!loading && members.length === 0 ? (
              <p className="text-muted-foreground">{t("users.empty")}</p>
            ) : null}
            {!loading
              ? members.map((m, i) => {
                  const id = String(m.id ?? i);
                  const status = String(m.status ?? "ACTIVE") as BadgeStatus;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedId(id)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border-b border-border px-1 py-2 text-left last:border-0 hover:bg-surface-2"
                    >
                      <span className="truncate font-medium">
                        {String(m.display_name ?? m.username ?? m.user_id ?? m.userId ?? t("common.member"))}
                      </span>
                      <StatusBadge status={STATUS_SAFE.includes(status) ? status : "ACTIVE"} />
                    </button>
                  );
                })
              : null}
          </div>
        </section>

        {selected ? <MemberDetail member={selected} onClose={() => setSelectedId(null)} /> : null}

        <RoleManager />

        {err ? <p className="text-sm text-destructive" role="alert" aria-live="polite">{err}</p> : null}
      </div>
    </PermissionGate>
  );
}

const STATUS_SAFE: BadgeStatus[] = ["ACTIVE", "INACTIVE", "INVITED", "SUSPENDED", "PENDING"];
