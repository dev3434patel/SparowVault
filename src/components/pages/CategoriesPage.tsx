import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { categoryRepo } from "@/repositories";
import { categorySchema } from "@/services/validators";
import { suggestNextCategoryColor } from "@/services/categoryColorEngine";
import type { Category } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { Plus, Archive, ArchiveRestore, Pencil, Trash2, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CategoryCleanupPanel } from "@/components/categories/CategoryCleanupPanel";
import { findDuplicateCategoryColors } from "@/services/categoryColorEngine";

const ICON_PRESETS = [
  "🍽️","🛒","🏠","💡","📱","🌐","⚡","🔥","⛽","✈️","🛍️","🏥","📚","🎬","👨‍👩‍👧","💼","🧾","🛡️","📋","💳","🔁","💝","🔧","✨","💰","🏆","🎯","💎","📊","📈","🏦","🪙","🧮","💻","🏢","🏘️","💹","↩️","💸","🎁","⭐","🤝","💵",
];
const COLOR_PRESETS = [
  "#0ea5e9","#22c55e","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#3b82f6","#10b981","#a855f7","#6366f1","#dc2626","#16a34a","#0284c7","#d946ef","#eab308","#64748b",
];

export function CategoriesPage() {
  const user = useAuthStore((s) => s.currentUser);
  const categories = useDataStore((s) => s.categories);
  const transactions = useDataStore((s) => s.transactions);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);
  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [showArchived, setShowArchived] = useState(false);

  const visible = categories.filter((c) => {
    if (!showArchived && c.archived) return false;
    if (filter !== "all" && c.appliesTo !== filter && c.appliesTo !== "mixed") return false;
    return true;
  });

  function usageCount(c: Category) {
    return transactions.filter((t) => t.categoryId === c.id).length;
  }

  async function handleArchive(c: Category) {
    const updated = await categoryRepo.update(c.id, {
      archived: c.archived ? 0 : 1,
    });
    if (updated) {
      upsertLocal("categories", updated);
      toast({
        title: updated.archived ? "Category archived" : "Category restored",
        kind: "info",
      });
    }
  }

  async function handleDelete(c: Category) {
    if (usageCount(c) > 0) {
      toast({
        title: "Cannot delete",
        description: `${usageCount(c)} transaction(s) use this category. Archive instead or remap records first.`,
        kind: "warning",
      });
      return;
    }
    const ok = await confirm({
      title: "Delete this category?",
      description: "This category will be removed permanently.",
      destructive: true,
      confirmLabel: "Delete category",
    });
    if (!ok) return;
    await categoryRepo.softDelete(c.id);
    removeLocal("categories", c.id);
    toast({ title: "Category deleted", kind: "info" });
  }

  const dupColors = findDuplicateCategoryColors(categories);

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your money flows with custom taxonomy. Supports income, expense, and tax/GST flags."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> New Category
          </Button>
        }
      />

      <Tabs defaultValue="list" className="mt-2">
        <TabsList className="no-print">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="cleanup">Cleanup &amp; merge</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4 space-y-4">
      {dupColors.length > 0 ? (
        <div className="rounded-md border border-warning/40 bg-warning-soft/30 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Duplicate colors: </span>
          {dupColors.length} group(s) share the same swatch — charts use distinct colors, but editing colors
          here makes lists easier to scan.
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="income">Income only</SelectItem>
            <SelectItem value="expense">Expense only</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={showArchived}
            onCheckedChange={(c) => setShowArchived(!!c)}
          />
          Show archived
        </label>
        <div className="ml-auto text-sm text-muted-foreground">
          {visible.length} categories
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Tag className="h-6 w-6" />}
              title="No categories"
              description="Create your first category to start tracking."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> New Category
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <Card key={c.id} className={c.archived ? "opacity-60" : undefined}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                    style={{ backgroundColor: c.color + "22", color: c.color }}
                  >
                    {c.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-sm font-semibold">{c.name}</div>
                      {c.archived ? <Badge variant="outline">Archived</Badge> : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {c.appliesTo === "income"
                        ? "Income"
                        : c.appliesTo === "expense"
                          ? "Expense"
                          : "Mixed"}{" "}
                      • {usageCount(c)} record(s)
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {c.taxRelevant ? <Badge variant="info">Tax</Badge> : null}
                      {c.gstRelevant ? <Badge variant="warning">GST</Badge> : null}
                      {c.budgetable ? <Badge variant="secondary">Budgetable</Badge> : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditing(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleArchive(c)}
                    >
                      {c.archived ? (
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleDelete(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>
        <TabsContent value="cleanup" className="mt-4">
          <CategoryCleanupPanel categories={categories} transactions={transactions} />
        </TabsContent>
      </Tabs>

      <CategoryForm
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        category={editing}
        allCategories={categories}
        onSaved={(c) => {
          upsertLocal("categories", c);
          toast({
            title: editing ? "Category updated" : "Category created",
            kind: "success",
          });
          setAdding(false);
          setEditing(null);
        }}
        userId={user?.id}
      />
    </div>
  );
}

function CategoryForm({
  open,
  onClose,
  category,
  allCategories,
  onSaved,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  allCategories: Category[];
  onSaved: (c: Category) => void;
  userId?: string;
}) {
  const [state, setState] = useState({
    name: category?.name ?? "",
    icon: category?.icon ?? ICON_PRESETS[0],
    color: category?.color ?? COLOR_PRESETS[0],
    appliesTo: (category?.appliesTo ?? "expense") as "income" | "expense" | "mixed",
    budgetable: (category?.budgetable ?? 1) as 0 | 1,
    taxRelevant: (category?.taxRelevant ?? 0) as 0 | 1,
    gstRelevant: (category?.gstRelevant ?? 0) as 0 | 1,
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const chartAccessibility = useUIStore((s) => s.chartAccessibility);
  const selectedDuplicateColor = allCategories.some(
    (c) =>
      c.id !== category?.id &&
      c.isDeleted !== 1 &&
      c.archived !== 1 &&
      c.color.trim().toLowerCase() === state.color.trim().toLowerCase(),
  );

  useEffect(() => {
    if (!open) return;
    if (category) {
      setState({
        name: category.name,
        icon: category.icon,
        color: category.color,
        appliesTo: category.appliesTo,
        budgetable: category.budgetable,
        taxRelevant: category.taxRelevant,
        gstRelevant: category.gstRelevant,
      });
    } else {
      const appliesTo = "expense" as const;
      setState({
        name: "",
        icon: ICON_PRESETS[0],
        color: suggestNextCategoryColor(appliesTo, allCategories, chartAccessibility),
        appliesTo,
        budgetable: 1,
        taxRelevant: 0,
        gstRelevant: 0,
      });
    }
    setErr(null);
    setSaving(false);
  }, [category, open, allCategories, chartAccessibility]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || saving) return;
    const parse = categorySchema.safeParse(state);
    if (!parse.success) {
      setErr(parse.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setErr(null);
    setSaving(true);
    try {
      if (category) {
        const updated = await categoryRepo.update(category.id, parse.data);
        if (updated) onSaved(updated);
      } else {
        const created = await categoryRepo.create({
          userId,
          data: {
            ...parse.data,
            parentId: null,
            sortOrder: 999,
            archived: 0,
          },
        });
        onSaved(created);
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name" required>
            <Input
              value={state.name}
              onChange={(e) => setState({ ...state, name: e.target.value })}
              placeholder="Groceries"
            />
          </Field>
          <Field label="Applies to">
            <Select
              value={state.appliesTo}
              onValueChange={(v) => {
                const appliesTo = v as typeof state.appliesTo;
                setState((prev) => ({
                  ...prev,
                  appliesTo,
                  color: category
                    ? prev.color
                    : suggestNextCategoryColor(appliesTo, allCategories, chartAccessibility),
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {ICON_PRESETS.map((i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setState({ ...state, icon: i })}
                  className={`h-8 w-8 rounded-md text-lg ${state.icon === i ? "bg-primary text-primary-foreground" : "hover:bg-surface-2"}`}
                >
                  {i}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Color">
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setState({ ...state, color: c })}
                  className={`h-6 w-6 rounded-full border-2 ${state.color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {selectedDuplicateColor ? (
              <div className="mt-2 rounded-md border border-warning/40 bg-warning-soft/40 p-2 text-xs text-warning">
                Another active category already uses this color. Save is allowed, but charts and lists are easier
                to scan with a unique color.
              </div>
            ) : null}
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!state.budgetable}
                onCheckedChange={(v) => setState({ ...state, budgetable: v ? 1 : 0 })}
              />
              Budgetable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!state.taxRelevant}
                onCheckedChange={(v) => setState({ ...state, taxRelevant: v ? 1 : 0 })}
              />
              Tax relevant
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!state.gstRelevant}
                onCheckedChange={(v) => setState({ ...state, gstRelevant: v ? 1 : 0 })}
              />
              GST relevant
            </label>
          </div>
          {err ? (
            <div className="rounded-md bg-expense-soft p-2 text-xs text-danger">
              {err}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
