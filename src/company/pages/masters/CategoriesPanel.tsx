import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import {
  companyApi,
  type PartyCategoryMember,
  type PartyCategoryRow,
} from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import type { CompanyParty } from "@/company/types";
import {
  EmptyState,
  ErrorState,
  SectionCard,
  ToneBadge,
} from "@/company/components/PageChrome";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/company/i18n/react";

export function CategoriesPanel({ canManage }: { canManage: boolean }) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [categories, setCategories] = useState<PartyCategoryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<PartyCategoryMember[]>([]);
  const [parties, setParties] = useState<CompanyParty[]>([]);
  const [newName, setNewName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [partyQuery, setPartyQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadList() {
    if (!companyId) return;
    setLoading(true);
    setErr(null);
    try {
      const rows = await companyApi.listPartyCategories(companyId);
      setCategories(rows);
      if (selectedId && !rows.some((r) => r.id === selectedId)) {
        setSelectedId(null);
        setMembers([]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("masters.loadCategoriesFailed"));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(categoryId: string) {
    if (!companyId) return;
    setDetailLoading(true);
    setErr(null);
    try {
      const { category, members: mem } = await companyApi.getPartyCategory(companyId, categoryId);
      if (category) {
        setRenameValue(category.name);
        setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)));
      }
      setMembers(mem);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("masters.loadCategoryFailed"));
      setMembers([]);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadList();
    if (!companyId) return;
    void companyApi.listParties(companyId).then(setParties).catch(() => setParties([]));
  }, [companyId]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, companyId]);

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);

  const pickerParties = useMemo(() => {
    const needle = partyQuery.trim().toLowerCase();
    return parties
      .filter((p) => p.active !== false)
      .filter((p) => !memberIds.has(p.id))
      .filter(
        (p) =>
          !needle ||
          p.displayName.toLowerCase().includes(needle) ||
          (p.mobile ?? "").includes(needle),
      )
      .slice(0, 12);
  }, [parties, memberIds, partyQuery]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !newName.trim() || !canManage) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await companyApi.createPartyCategory(companyId, { name: newName.trim() });
      setNewName("");
      await loadList();
      const id = res.category?.id ?? res.categoryId;
      if (id) setSelectedId(id);
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("masters.createFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !selectedId || !renameValue.trim() || !canManage) return;
    setBusy(true);
    setErr(null);
    try {
      await companyApi.renamePartyCategory(companyId, selectedId, renameValue.trim());
      await loadList();
      await loadDetail(selectedId);
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("masters.renameFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!companyId || !selectedId || !canManage) return;
    const cat = categories.find((c) => c.id === selectedId);
    if (cat && cat.memberCount > 0) {
      setErr(t("masters.deleteNamed", { name: cat.name, n: cat.memberCount }));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await companyApi.deletePartyCategory(companyId, selectedId);
      setSelectedId(null);
      setMembers([]);
      await loadList();
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("masters.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onAssign(partyId: string) {
    if (!companyId || !selectedId || !canManage) return;
    setBusy(true);
    setErr(null);
    try {
      await companyApi.assignPartyToCategory(companyId, selectedId, partyId);
      setPartyQuery("");
      await loadList();
      await loadDetail(selectedId);
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("masters.assignFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onUnassign(partyId: string) {
    if (!companyId || !selectedId || !canManage) return;
    setBusy(true);
    setErr(null);
    try {
      await companyApi.unassignPartyFromCategory(companyId, selectedId, partyId);
      await loadList();
      await loadDetail(selectedId);
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("masters.removeFailed"));
    } finally {
      setBusy(false);
    }
  }

  const selected = categories.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <SectionCard
        title={t("masters.catTitle")}
        actions={
          canManage ? (
            <form className="flex items-center gap-2" onSubmit={(e) => void onCreate(e)}>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("masters.newNamePh")}
                className="h-8 w-36 text-sm"
                id="company-new-category"
                aria-label={t("masters.newName")}
              />
              <Button type="submit" size="sm" disabled={busy || !newName.trim()}>
                {t("masters.createCategory")}
              </Button>
            </form>
          ) : null
        }
      >
        {err ? <div className="mb-3"><ErrorState message={err} onRetry={() => void loadList()} /></div> : null}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : null}
        {!loading && categories.length === 0 ? (
          <EmptyState
            title={t("masters.emptyTitle")}
            body={t("masters.emptyBody")}
            actions={
              canManage ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const el = document.getElementById("company-new-category");
                    el?.focus();
                  }}
                >
                  {t("masters.createFirst")}
                </Button>
              ) : null
            }
          />
        ) : null}
        {!loading && categories.length > 0 ? (
          <ul className="divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-1 py-2.5 text-left text-sm transition hover:bg-surface-2",
                    selectedId === c.id && "bg-surface-2",
                  )}
                >
                  <span className="font-medium">{c.name}</span>
                  <ToneBadge label={t("masters.memberCount", { n: c.memberCount })} tone="neutral" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      <SectionCard title={selected ? selected.name : t("masters.detail")}>
        {!selectedId ? (
          <p className="text-sm text-muted-foreground">{t("masters.selectCategory")}</p>
        ) : (
          <div className="space-y-4">
            {canManage ? (
              <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => void onRename(e)}>
                <Field label={t("masters.rename")} className="flex-1">
                  <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="h-10" />
                </Field>
                <Button type="submit" size="sm" variant="outline" disabled={busy || !renameValue.trim()}>
                  {t("masters.saveName")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  disabled={busy || (selected?.memberCount ?? 0) > 0}
                  title={
                    (selected?.memberCount ?? 0) > 0
                      ? t("masters.cannotDelete", { n: selected?.memberCount ?? 0 })
                      : t("masters.deleteCategory")
                  }
                  onClick={() => void onDelete()}
                >
                  {t("common.delete")}
                </Button>
              </form>
            ) : null}
            {(selected?.memberCount ?? 0) > 0 && canManage ? (
              <p className="text-xs text-muted-foreground">
                {t("masters.deleteBlocked")}
              </p>
            ) : null}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("masters.members", { n: members.length })}
              </h3>
              {detailLoading ? (
                <div className="h-16 animate-pulse rounded-lg bg-muted" />
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("masters.noParties")}</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                      <div>
                        <div className="font-medium">{m.displayName}</div>
                        {m.mobile ? <div className="text-xs text-muted-foreground">{m.mobile}</div> : null}
                      </div>
                      {canManage ? (
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void onUnassign(m.id)}>
                          {t("masters.removeParty")}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canManage ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("masters.assignParty")}
                </h3>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={partyQuery}
                    onChange={(e) => setPartyQuery(e.target.value)}
                    placeholder={t("masters.searchParties")}
                    className="h-10 pl-9"
                  />
                </div>
                {pickerParties.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {partyQuery.trim() ? t("masters.noMatch") : t("masters.allAssigned")}
                  </p>
                ) : (
                  <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
                    {pickerParties.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span>{p.displayName}</span>
                        <Button type="button" size="sm" disabled={busy} onClick={() => void onAssign(p.id)}>
                          {t("masters.assignParty")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
