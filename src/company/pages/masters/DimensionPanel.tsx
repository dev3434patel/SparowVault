import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi, type DimensionKind } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import { EmptyState, ErrorState, SectionCard } from "@/company/components/PageChrome";
import { useHasPermission } from "@/company/components/PermissionGate";
import { SkeletonList } from "@/company/components/CompanySkeleton";
import { useI18n } from "@/company/i18n/react";

const KIND_KEYS: Record<string, string> = {
  "business-units": "masters.businessUnits",
  branches: "masters.branches",
  areas: "masters.areas",
  projects: "masters.projects",
  "cost-centres": "masters.costCentres",
};

export function DimensionPanel({ kind }: { kind: DimensionKind }) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isBranch = kind === "branches";
  const canManage = useHasPermission("manage_dimensions");

  async function load() {
    if (!companyId) return;
    setLoading(true);
    setErr(null);
    try {
      setItems(await companyApi.listDimensions(companyId, kind));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("masters.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [companyId, kind]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !name.trim() || !canManage) return;
    setErr(null);
    try {
      await companyApi.createDimension(companyId, kind, {
        name: name.trim(),
        ...(isBranch && url.trim() ? { url: url.trim() } : {}),
      });
      setName("");
      setUrl("");
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("masters.createFailed"));
    }
  }

  return (
    <SectionCard title={t(KIND_KEYS[kind] ?? "masters.title")}>
      {canManage ? (
      <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => void onCreate(e)}>
        <Field label={t("masters.name")} className="flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-10" />
        </Field>
        {isBranch ? (
          <Field label={t("masters.branchUrl")} className="flex-1">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="h-10" />
          </Field>
        ) : null}
        <Button type="submit" size="sm">
          {t("masters.addDimension")}
        </Button>
      </form>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">{t("masters.manageNeeds")}</p>
      )}
      {err ? <ErrorState message={err} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonList rows={3} /> : null}
      {!loading && !err && items.length === 0 ? (
        <EmptyState title={t("masters.empty")} body={t("masters.emptyDimension")} />
      ) : null}
      {!loading && items.length > 0 ? (
        <ul className="divide-y divide-border text-sm">
          {items.map((it) => (
            <DimensionRow
              key={String(it.id)}
              item={it}
              isBranch={isBranch}
              canManage={canManage}
              onSave={async (nextName, nextUrl) => {
                if (!companyId || !canManage) return;
                setErr(null);
                try {
                  await companyApi.updateDimension(companyId, kind, {
                    id: String(it.id),
                    name: nextName,
                    ...(isBranch ? { url: nextUrl } : {}),
                  });
                  await load();
                } catch (error) {
                  setErr(error instanceof Error ? error.message : t("masters.updateFailed"));
                }
              }}
              onArchive={async () => {
                if (!companyId || !canManage) return;
                setErr(null);
                try {
                  await companyApi.archiveDimension(companyId, kind, String(it.id));
                  await load();
                } catch (error) {
                  setErr(error instanceof Error ? error.message : t("masters.archiveFailed"));
                }
              }}
            />
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}

function DimensionRow({
  item,
  isBranch,
  canManage,
  onSave,
  onArchive,
}: {
  item: Record<string, unknown>;
  isBranch: boolean;
  canManage: boolean;
  onSave: (name: string, url: string) => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(String(item.name ?? ""));
  const [url, setUrl] = useState(String(item.url ?? ""));
  return (
    <li className="flex flex-col gap-2 py-2 sm:flex-row sm:items-end">
      <Field label={t("masters.name")} className="flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" disabled={!canManage} />
      </Field>
      {isBranch ? (
        <Field label={t("masters.branchUrl")} className="flex-1">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="h-9" disabled={!canManage} />
        </Field>
      ) : null}
      {canManage ? (
        <>
          <Button type="button" size="sm" variant="outline" onClick={() => void onSave(name.trim(), url.trim())} disabled={!name.trim()}>
            {t("common.save")}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void onArchive()}>
            {t("masters.archive")}
          </Button>
        </>
      ) : null}
    </li>
  );
}
