import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyState,
} from "@/components/ui/Table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { useDataStore } from "@/store/dataStore";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { transactionRepo } from "@/repositories";
import type { Transaction, TransactionType, PaymentMode } from "@/types";
import { formatINR, formatDate, formatPaymentMode, formatTxType } from "@/lib/format";
import { parseISO } from "date-fns";
import {
  Copy,
  Pencil,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PAYMENT_MODES, TRANSACTION_TYPES } from "@/constants";
import { useAuthStore } from "@/store/authStore";
import { isIncomeTx, sumExpense, sumIncome } from "@/services/calculations";
import { paiseToRupees, transactionAmountPaise } from "@/utils/money";

export function TransactionsPage({ fixedType }: { fixedType?: "income" | "expense" } = {}) {
  const user = useAuthStore((s) => s.currentUser);
  const transactions = useDataStore((s) => s.transactions);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);
  const consumePendingTransactionFilters = useUIStore((s) => s.consumePendingTransactionFilters);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentMode | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | "all">("all");
  const [accountFilter, setAccountFilter] = useState<string | "all">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sort, setSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">(
    "date-desc",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (fixedType) return;
    const pending = consumePendingTransactionFilters();
    if (!pending) return;
    if (pending.categoryIds?.length === 1) setCategoryFilter(pending.categoryIds[0]!);
    if (pending.dateFrom) setDateFrom(pending.dateFrom);
    if (pending.dateTo) setDateTo(pending.dateTo);
    if (pending.types?.length === 1) setTypeFilter(pending.types[0]!);
    setFiltersOpen(true);
  }, [fixedType, consumePendingTransactionFilters]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (fixedType === "income") {
      list = list.filter((t) => ["income", "refund"].includes(t.type));
    } else if (fixedType === "expense") {
      list = list.filter((t) => t.type === "expense");
    } else if (typeFilter !== "all") {
      list = list.filter((t) => t.type === typeFilter);
    }
    if (paymentFilter !== "all") {
      list = list.filter((t) => t.paymentMode === paymentFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((t) => t.categoryId === categoryFilter);
    }
    if (accountFilter !== "all") {
      list = list.filter((t) => t.accountId === accountFilter);
    }
    if (dateFrom) {
      const ms = new Date(dateFrom).getTime();
      list = list.filter((t) => parseISO(t.date).getTime() >= ms);
    }
    if (dateTo) {
      const ms = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      list = list.filter((t) => parseISO(t.date).getTime() <= ms);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => {
        const cat = categories.find((c) => c.id === t.categoryId);
        return (
          t.merchantOrPerson.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          (cat?.name.toLowerCase().includes(q) ?? false) ||
          t.tags.some((tg) => tg.toLowerCase().includes(q))
        );
      });
    }
    list = [...list].sort((a, b) => {
      if (sort === "date-desc") return +new Date(b.date) - +new Date(a.date);
      if (sort === "date-asc") return +new Date(a.date) - +new Date(b.date);
      if (sort === "amount-desc")
        return transactionAmountPaise(b) - transactionAmountPaise(a);
      if (sort === "amount-asc")
        return transactionAmountPaise(a) - transactionAmountPaise(b);
      return 0;
    });
    return list;
  }, [
    transactions,
    categoryFilter,
    accountFilter,
    typeFilter,
    paymentFilter,
    dateFrom,
    dateTo,
    search,
    sort,
    fixedType,
    categories,
  ]);

  const totalIncome = sumIncome(filtered);
  const totalExpense = sumExpense(filtered);

  async function handleDelete(id: string) {
    if (!user) return;
    const ok = await confirm({
      title: "Delete this transaction?",
      description: "This transaction will be removed permanently.",
      destructive: true,
      confirmLabel: "Delete transaction",
    });
    if (!ok) return;
    await transactionRepo.softDelete(id);
    removeLocal("transactions", id);
    toast({ title: "Transaction deleted", kind: "info" });
  }

  async function handleDuplicate(t: Transaction) {
    if (!user) return;
    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      version: _v,
      ...rest
    } = t;
    void _id;
    void _c;
    void _u;
    void _v;
    const created = await transactionRepo.create({
      userId: user.id,
      data: { ...rest, description: `${t.description} (copy)` } as Transaction,
    });
    upsertLocal("transactions", created);
    toast({ title: "Duplicated", kind: "success" });
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selected.size} transactions?`,
      description: "Selected transactions will be removed permanently.",
      destructive: true,
      confirmLabel: "Delete selected",
    });
    if (!ok) return;
    const ids = Array.from(selected);
    await transactionRepo.softDeleteMany(ids);
    for (const id of ids) {
      removeLocal("transactions", id);
    }
    toast({ title: `Deleted ${selected.size} transactions`, kind: "info" });
    setSelected(new Set());
  }

  function resetFilters() {
    setSearch("");
    setTypeFilter("all");
    setPaymentFilter("all");
    setCategoryFilter("all");
    setAccountFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const activeFilters =
    (typeFilter !== "all" ? 1 : 0) +
    (paymentFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0) +
    (accountFilter !== "all" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div>
      <PageHeader
        title={
          fixedType === "income"
            ? "Income"
            : fixedType === "expense"
              ? "Expenses"
              : "All Transactions"
        }
        description={
          fixedType === "income"
            ? "All incoming cash flows — salary, freelance, refunds."
            : fixedType === "expense"
              ? "Every expense tracked across accounts, cards, and categories."
              : "Unified ledger across every transaction type."
        }
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merchant, description, notes, tags, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {activeFilters > 0 ? (
            <Badge variant="info" className="ml-1">
              {activeFilters}
            </Badge>
          ) : null}
        </Button>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest first</SelectItem>
            <SelectItem value="date-asc">Oldest first</SelectItem>
            <SelectItem value="amount-desc">Amount: high → low</SelectItem>
            <SelectItem value="amount-asc">Amount: low → high</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtersOpen ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {!fixedType ? (
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {TRANSACTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Select
                value={paymentFilter}
                onValueChange={(v) => setPaymentFilter(v as typeof paymentFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payment modes</SelectItem>
                  {PAYMENT_MODES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={accountFilter}
                onValueChange={(v) => setAccountFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {filtered.length} transactions match
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-3 w-3" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="income">
          Income: {formatINR(paiseToRupees(totalIncome), { decimals: 0 })}
        </Badge>
        <Badge variant="expense">
          Expense: {formatINR(paiseToRupees(totalExpense), { decimals: 0 })}
        </Badge>
        <Badge variant="info">
          Net: {formatINR(paiseToRupees(totalIncome - totalExpense), { decimals: 0 })}
        </Badge>
        {selected.size > 0 ? (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground">
              {selected.size} selected
            </span>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="No transactions"
              description="Add one to get started, or remove filters to see more."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> Add transaction
                </Button>
              }
            />
          ) : (
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const cat = categories.find((c) => c.id === t.categoryId);
                  const isIncome = isIncomeTx(t);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border-strong"
                          checked={selected.has(t.id)}
                          onChange={(e) => {
                            const s = new Set(selected);
                            if (e.target.checked) s.add(t.id);
                            else s.delete(t.id);
                            setSelected(s);
                          }}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(t.date, "dd MMM yy")}
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
                            style={{ backgroundColor: (cat?.color ?? "#64748b") + "22" }}
                          >
                            {cat?.icon ?? "💳"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {t.merchantOrPerson || t.description || "—"}
                            </div>
                            {t.description && t.merchantOrPerson ? (
                              <div className="truncate text-[11px] text-muted-foreground">
                                {t.description}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{cat?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            t.type === "income" || t.type === "refund"
                              ? "income"
                              : t.type === "expense" ||
                                  t.type === "emi_payment" ||
                                  t.type === "cc_payment" ||
                                  t.type === "udhari_write_off"
                                ? "expense"
                                : "info"
                          }
                        >
                          {formatTxType(t.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatPaymentMode(t.paymentMode)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.tags.slice(0, 2).map((tg) => (
                            <Badge
                              key={tg}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {tg}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums font-semibold",
                          isIncome
                            ? "text-income"
                            : "text-expense",
                        )}
                      >
                        {isIncome ? "+" : "−"}
                        {formatINR(paiseToRupees(transactionAmountPaise(t)), { decimals: 0 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditing(t)}
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDuplicate(t)}
                            aria-label="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(t.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={adding} onOpenChange={(o) => !o && setAdding(false)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Add transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm
            forcedType={
              fixedType === "income"
                ? "income"
                : fixedType === "expense"
                  ? "expense"
                  : undefined
            }
            onCancel={() => setAdding(false)}
            onSaved={() => setAdding(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TransactionForm
              initial={editing}
              onCancel={() => setEditing(null)}
              onSaved={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
