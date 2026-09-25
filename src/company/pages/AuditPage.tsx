import { useEffect, useState } from "react";
import { companyApi } from "@/company/api/client";
import { SkeletonList } from "@/company/components/CompanySkeleton";
import { EmptyState } from "@/company/components/PageChrome";
import { PermissionGate } from "@/company/components/PermissionGate";
import { useCompanyStore } from "@/company/store/companyStore";
import { ApiError } from "@/lib/apiClient";
import { useI18n } from "@/company/i18n/react";

export function AuditPage() {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const rows = await companyApi.listAudit(companyId);
        if (!cancelled) setEvents(rows);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 404) {
            setEvents([]);
          } else {
            setErr(e instanceof Error ? e.message : t("audit.loadFailed"));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <PermissionGate permission="view_audit">
      <div className="space-y-3">
        <div>
          <h1 className="text-lg font-semibold">{t("audit.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("audit.subtitle")}</p>
        </div>
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        {loading ? <SkeletonList rows={6} /> : null}
        {!loading && events.length === 0 ? (
          <EmptyState title={t("audit.empty")} body={t("audit.subtitle")} />
        ) : null}
        {!loading && events.length > 0 ? (
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <div className="divide-y divide-border p-2 text-sm">
              {events.map((ev, i) => (
                <div key={String(ev.id ?? i)} className="px-2 py-2.5">
                  <div className="font-medium">{String(ev.action ?? "event")}</div>
                  <div className="text-xs text-muted-foreground">
                    {String(ev.created_at ?? ev.createdAt ?? "")} · {String(ev.entity_type ?? ev.entityType ?? "")}{" "}
                    {String(ev.entity_id ?? ev.entityId ?? "")}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PermissionGate>
  );
}
