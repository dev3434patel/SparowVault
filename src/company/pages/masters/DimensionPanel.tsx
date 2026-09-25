import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi, type DimensionKind } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import { EmptyState, ErrorState, SectionCard } from "@/company/components/PageChrome";
import { SkeletonList } from "@/company/components/CompanySkeleton";

export function DimensionPanel({ kind }: { kind: DimensionKind }) {
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    setErr(null);
    try {
      setItems(await companyApi.listDimensions(companyId, kind));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
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
    if (!companyId || !name.trim()) return;
    setErr(null);
    try {
      await companyApi.createDimension(companyId, kind, { name: name.trim() });
      setName("");
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Create failed");
    }
  }

  return (
    <SectionCard title={kind.replace(/-/g, " ")}>
      <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => void onCreate(e)}>
        <Field label="Name" className="flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-10" />
        </Field>
        <Button type="submit" size="sm">
          Add dimension
        </Button>
      </form>
      {err ? <ErrorState message={err} onRetry={() => void load()} /> : null}
      {loading ? <SkeletonList rows={3} /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState title="No items yet" body="Add the first dimension to use it on vouchers and reports." />
      ) : null}
      {!loading && items.length > 0 ? (
        <ul className="divide-y divide-border text-sm">
          {items.map((it) => (
            <li key={String(it.id)} className="flex justify-between gap-2 py-2">
              <span className="font-medium">{String(it.name ?? "")}</span>
              <span className="font-mono text-xs text-muted-foreground">{String(it.code ?? "")}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}
