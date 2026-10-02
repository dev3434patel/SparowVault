import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { categoryRepo, transactionRepo } from "@/repositories";
import type { Category, Transaction } from "@/types";
import { findDuplicateCategoryColors, findDuplicateCategoryNames } from "@/services/categoryColorEngine";
import { useMessages } from "@/i18n/useMessages";

export function CategoryCleanupPanel({
  categories,
  transactions,
}: {
  categories: Category[];
  transactions: Transaction[];
}) {
  const copy = useMessages().copy.cleanup;
  const toast = useUIStore((s) => s.toast);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const active = useMemo(
    () => categories.filter((c) => c.isDeleted !== 1 && c.archived !== 1),
    [categories],
  );

  const dupNames = useMemo(() => findDuplicateCategoryNames(categories), [categories]);
  const dupColors = useMemo(() => findDuplicateCategoryColors(categories), [categories]);

  async function mergeCategories() {
    if (!fromId || !toId || fromId === toId) {
      toast({ title: copy.pickTwo, kind: "warning" });
      return;
    }
    const from = active.find((c) => c.id === fromId);
    const to = active.find((c) => c.id === toId);
    if (!from || !to) return;
    const count = transactions.filter((t) => t.categoryId === fromId).length;
    const ok = await confirm({
      title: copy.mergeTitle,
      description: copy.mergeBody.replace("{n}", String(count)).replace("{from}", from.name).replace("{to}", to.name),
      confirmLabel: copy.merge,
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const affected = transactions.filter((t) => t.categoryId === fromId);
      for (const t of affected) {
        const u = await transactionRepo.update(t.id, { categoryId: toId });
        if (u) upsertLocal("transactions", u);
      }
      const archived = await categoryRepo.update(fromId, { archived: 1 });
      if (archived) upsertLocal("categories", archived);
      toast({ title: copy.merged, kind: "success" });
      setFromId("");
      setToId("");
    } catch (e) {
      console.error(e);
      toast({ title: copy.mergeFailed, kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {(dupNames.length > 0 || dupColors.length > 0) && (
        <Card className="border-warning/40 bg-warning-soft/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{copy.warnings}</CardTitle>
            <CardDescription>{copy.warningsBody}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {dupNames.length > 0 ? (
              <div>
                <div className="mb-1 font-medium">{copy.dupNames}</div>
                <ul className="list-inside list-disc text-muted-foreground">
                  {dupNames.map((d) => (
                    <li key={d.normalizedName}>{d.names.join(" · ")}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {dupColors.length > 0 ? (
              <div>
                <div className="mb-1 font-medium">{copy.dupColors}</div>
                <ul className="flex flex-wrap gap-2">
                  {dupColors.map((d) => (
                    <li key={d.normalizedColor} className="flex items-center gap-1 text-xs">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: d.normalizedColor }}
                      />
                      <span className="text-muted-foreground">{d.names.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{copy.reassign}</CardTitle>
          <CardDescription>
            {copy.reassignBody}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <div className="text-xs text-muted-foreground">{copy.from}</div>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger>
                <SelectValue placeholder={copy.source} />
              </SelectTrigger>
              <SelectContent>
                {active.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-xs text-muted-foreground">{copy.into}</div>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger>
                <SelectValue placeholder={copy.target} />
              </SelectTrigger>
              <SelectContent>
                {active.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void mergeCategories()} disabled={busy || !fromId || !toId}>
            {copy.merge}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy.hidden}</CardTitle>
          <CardDescription>
            {copy.hiddenBody}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{copy.deletedCount}: {categories.filter((c) => c.isDeleted === 1).length}</Badge>
          <Badge variant="outline">{copy.archivedCount}: {categories.filter((c) => c.archived === 1).length}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
