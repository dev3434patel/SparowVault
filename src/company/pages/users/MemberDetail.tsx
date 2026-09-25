import { Button } from "@/components/ui/Button";
import { StatusBadge, type BadgeStatus } from "@/company/components/PageChrome";
import type { MemberRow } from "@/company/pages/users/useMembers";

export function MemberDetail({ member, onClose }: { member: MemberRow; onClose: () => void }) {
  const status = String(member.status ?? "ACTIVE") as BadgeStatus;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-border/80 bg-[hsl(var(--surface))]/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Member detail</h2>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="space-y-2 p-4 text-sm">
        <div>
          <span className="text-muted-foreground">Name: </span>
          {String(member.display_name ?? member.username ?? "—")}
        </div>
        <div>
          <span className="text-muted-foreground">User ID: </span>
          {String(member.user_id ?? member.userId ?? "—")}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          <StatusBadge
            status={
              (["ACTIVE", "INACTIVE", "INVITED", "SUSPENDED", "PENDING"] as BadgeStatus[]).includes(status)
                ? status
                : "ACTIVE"
            }
          />
        </div>
        <div>
          <span className="text-muted-foreground">Role: </span>
          {String(member.role_code ?? member.roleCode ?? "—")}
        </div>
      </div>
    </section>
  );
}
