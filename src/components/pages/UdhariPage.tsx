import { useEffect, useMemo, useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyState,
} from "@/components/ui/Table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { transactionRepo, udhariRepo, udhariSettlementRepo } from "@/repositories";
import type { Account, Category, Transaction, UdhariRecord, UdhariSettlement } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { udhariSchema } from "@/services/validators";
import { UDHARI_CONTEXTS } from "@/constants";
import { formatINR, formatDate, isoToLocalDate, localDateToIso } from "@/lib/format";
import { totalUdhariPayable, totalUdhariReceivable } from "@/services/calculations";
import {
  buildUdhariPeopleIntel,
  buildUdhariWhatsAppReminder,
  udhariRemainingPaise,
  udhariSettlementTxnLabel,
  validateWriteOffReason,
} from "@/services/udhariEngine";
import { differenceInCalendarDays, format } from "date-fns";
import { HandCoins, Pencil, Plus, Trash2, CheckCircle, Users, History, Copy, Ban } from "lucide-react";
import { refsForUdhari } from "@/services/refIntegrity";
import { paiseToRupees, rupeesToPaise } from "@/utils/money";
import { useMessages } from "@/i18n/useMessages";

function ageingShort(labels: { label: string; amountPaise: number }[]): string {
  const parts: string[] = [];
  const map: Record<string, string> = {
    current: "ok",
    due_today: "today",
    overdue_1_7: "1–7d",
    overdue_8_30: "8–30d",
    overdue_30_plus: "30d+",
    no_due: "no due",
    normal_0_7: "0-7d normal",
    watch_8_30: "8-30d watch",
    risky_31_90: "31-90d risky",
    doubtful_90_plus: "90d+ doubtful",
  };
  for (const b of labels) {
    if (b.amountPaise <= 0) continue;
    parts.push(`${map[b.label] ?? b.label} ${formatINR(paiseToRupees(b.amountPaise), { decimals: 0 })}`);
  }
  return parts.length ? parts.join(" · ") : "—";
}

export function UdhariPage() {
  const copy = useMessages().copy.udhari;
  const user = useAuthStore((s) => s.currentUser);
  const udhari = useDataStore((s) => s.udhari);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);

  const [tab, setTab] = useState<"all" | "receivable" | "payable" | "overdue">("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<UdhariRecord | null>(null);
  const [settling, setSettling] = useState<UdhariRecord | null>(null);

  const accounts = useDataStore((s) => s.accounts);
  const udhariSettlements = useDataStore((s) => s.udhariSettlements);
  const categories = useDataStore((s) => s.categories);
  const [mainTab, setMainTab] = useState<"people" | "entries" | "history">("entries");
  const [writeOff, setWriteOff] = useState<UdhariRecord | null>(null);

  const peopleRows = useMemo(
    () => buildUdhariPeopleIntel(udhari, udhariSettlements, new Date()),
    [udhari, udhariSettlements],
  );

  const settlementHistory = useMemo(() => {
    const byId = new Map(udhari.map((x) => [x.id, x]));
    return [...udhariSettlements]
      .filter((s) => s.isDeleted !== 1)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .map((s) => ({
        s,
        person: byId.get(s.udhariId)?.personName ?? "—",
        entryType: byId.get(s.udhariId)?.type,
      }));
  }, [udhari, udhariSettlements]);

  const expenseCategories = useMemo(
    () => categories.filter((c) => !c.archived && (c.appliesTo === "expense" || c.appliesTo === "mixed")),
    [categories],
  );

  const filtered = useMemo(() => {
    const today = new Date();
    return udhari
      .filter((u) => {
        if (tab === "all") return true;
        if (tab === "overdue") {
          return (
            u.status !== "settled" &&
            u.status !== "written_off" &&
            u.dueDate &&
            differenceInCalendarDays(today, new Date(u.dueDate)) > 0
          );
        }
        return u.type === tab;
      })
      .sort((a, b) => +new Date(b.givenDate) - +new Date(a.givenDate));
  }, [udhari, tab]);

  const receivable = totalUdhariReceivable(udhari);
  const payable = totalUdhariPayable(udhari);
  const net = receivable - payable;

  async function handleDelete(id: string) {
    const refs = refsForUdhari(id);
    if (refs.blocking) {
      toast({
        title: copy.cannotDelete,
        description: refs.message,
        kind: "warning",
      });
      return;
    }
    const ok = await confirm({
      title: copy.deleteTitle,
      description: copy.deleteBody,
      destructive: true,
      confirmLabel: copy.deleteConfirm,
    });
    if (!ok) return;
    await udhariRepo.softDelete(id);
    removeLocal("udhari", id);
    toast({ title: copy.removed, kind: "info" });
  }

  async function settle(u: UdhariRecord, amtRupee: number, accountId: string) {
    if (!user) return;
    const newSettled = Math.min(u.amount, u.amountSettled + amtRupee);
    const status =
      newSettled >= u.amount ? "settled" : newSettled > 0 ? "partial" : "open";
    const txnType = u.type === "receivable" ? "udhari_collect" : "udhari_repay";
    const saved = await transactionRepo.create({
      userId: user.id,
      data: {
        date: new Date().toISOString(),
        type: txnType,
        amount: amtRupee,
        amountPaise: rupeesToPaise(amtRupee),
        accountId,
        linkedUdhariId: u.id,
        paymentMode: "bank_transfer",
        merchantOrPerson: u.personName.trim() || "Udhari",
        description: udhariSettlementTxnLabel(txnType),
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "unassigned",
        fixedVariable: "unassigned",
        plannedUnplanned: "unassigned",
      } as unknown as Transaction,
    });
    upsertLocal("transactions", saved);

    const updated = await udhariRepo.update(u.id, {
      amountSettled: newSettled,
      status,
    });
    if (updated) upsertLocal("udhari", updated);
    const s = await udhariSettlementRepo.create({
      userId: user.id,
      data: {
        udhariId: u.id,
        date: new Date().toISOString(),
        amount: amtRupee,
        amountPaise: rupeesToPaise(amtRupee),
        transactionId: saved.id,
        accountId,
        kind: "cash",
      } as unknown as UdhariSettlement,
    });
    upsertLocal("udhariSettlements", s);
    toast({
      title: status === "settled" ? "Fully settled" : "Partial settlement recorded",
      kind: "success",
    });
    setSettling(null);
  }

  async function recordWriteOff(u: UdhariRecord, amtRupee: number, categoryId: string, reason: string) {
    if (!user) return;
    const reasonError = validateWriteOffReason(reason);
    if (reasonError) {
      toast({ title: copy.reasonRequired, description: reasonError, kind: "error" });
      return;
    }
    const newSettled = Math.min(u.amount, u.amountSettled + amtRupee);
    const status =
      newSettled >= u.amount ? "written_off" : newSettled > 0 ? "partial" : "open";
    const saved = await transactionRepo.create({
      userId: user.id,
      data: {
        date: new Date().toISOString(),
        type: "udhari_write_off",
        amount: amtRupee,
        amountPaise: rupeesToPaise(amtRupee),
        categoryId,
        linkedUdhariId: u.id,
        paymentMode: "other",
        merchantOrPerson: u.personName.trim() || "Udhari",
        description: `Udhari receivable written off (bad debt / loss): ${reason.trim()}`,
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "unassigned",
        fixedVariable: "unassigned",
        plannedUnplanned: "unplanned",
      } as unknown as Transaction,
    });
    upsertLocal("transactions", saved);
    const updated = await udhariRepo.update(u.id, {
      amountSettled: newSettled,
      status,
    });
    if (updated) upsertLocal("udhari", updated);
    const st = await udhariSettlementRepo.create({
      userId: user.id,
      data: {
        udhariId: u.id,
        date: new Date().toISOString(),
        amount: amtRupee,
        amountPaise: rupeesToPaise(amtRupee),
        transactionId: saved.id,
        kind: "write_off",
        reason: reason.trim(),
      } as unknown as UdhariSettlement,
    });
    upsertLocal("udhariSettlements", st);
    toast({ title: copy.writeOff, kind: "success" });
    setWriteOff(null);
  }

  return (
    <div>
      <PersonalPageHeader
        screen="udhari"
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> New Entry
          </Button>
        }
      />

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
        <TabsList className="mb-3 grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="people">
            <Users className="mr-1 inline h-3.5 w-3.5" /> People
          </TabsTrigger>
          <TabsTrigger value="entries">
            <HandCoins className="mr-1 inline h-3.5 w-3.5" /> Entries
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-1 inline h-3.5 w-3.5" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people">
          <Card>
            <CardContent className="p-0">
              {peopleRows.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title={copy.emptyPeople}
                  description="Add udhari entries; balances group by person name + phone."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead className="text-right">Receivable</TableHead>
                      <TableHead className="text-right">Payable</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Overdue</TableHead>
                      <TableHead>Ageing (open)</TableHead>
                      <TableHead>WhatsApp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {peopleRows.map((p) => {
                      const remind =
                        p.openEntries.find(
                          (e) => e.type === "receivable" && udhariRemainingPaise(e) > 0,
                        ) ?? p.openEntries[0];
                      const wa =
                        remind && udhariRemainingPaise(remind) > 0
                          ? buildUdhariWhatsAppReminder(remind, udhariRemainingPaise(remind))
                          : "";
                      return (
                        <TableRow key={p.key}>
                          <TableCell>
                            <div className="font-medium">{p.displayName}</div>
                            {p.phone ? (
                              <div className="text-[11px] text-muted-foreground">{p.phone}</div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                p.riskLevel === "doubtful" || p.riskLevel === "risky"
                                  ? "danger"
                                  : p.riskLevel === "watch"
                                    ? "warning"
                                    : "outline"
                              }
                            >
                              {p.riskLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="tabular-nums text-right text-income">
                            {formatINR(paiseToRupees(p.totalReceivablePaise), { decimals: 0 })}
                          </TableCell>
                          <TableCell className="tabular-nums text-right text-expense">
                            {formatINR(paiseToRupees(p.totalPayablePaise), { decimals: 0 })}
                          </TableCell>
                          <TableCell
                            className={`tabular-nums text-right font-medium ${p.netPaise >= 0 ? "text-income" : "text-expense"}`}
                          >
                            {formatINR(paiseToRupees(p.netPaise), { decimals: 0 })}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {p.overdueCount > 0
                              ? `${p.overdueCount} · ${formatINR(paiseToRupees(p.overdueAmountPaise), { decimals: 0 })}`
                              : "—"}
                          </TableCell>
                          <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                            {ageingShort(p.ageingBuckets)}
                          </TableCell>
                          <TableCell>
                            {wa ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  void navigator.clipboard.writeText(wa);
                                  toast({ title: copy.reminderCopied, kind: "success" });
                                }}
                              >
                                <Copy className="mr-1 h-3 w-3" /> Copy
                              </Button>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entries">
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>You'll receive</CardDescription>
                <CardTitle className="tabular-nums text-income">
                  {formatINR(receivable)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>You'll pay</CardDescription>
                <CardTitle className="tabular-nums text-expense">
                  {formatINR(payable)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Net position</CardDescription>
                <CardTitle
                  className={`tabular-nums ${net >= 0 ? "text-income" : "text-expense"}`}
                >
                  {formatINR(net)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Open entries</CardDescription>
                <CardTitle>
                  {udhari.filter((u) => u.status !== "settled" && u.status !== "written_off").length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">All ({udhari.length})</TabsTrigger>
              <TabsTrigger value="receivable">
                Receivable ({udhari.filter((u) => u.type === "receivable").length})
              </TabsTrigger>
              <TabsTrigger value="payable">
                Payable ({udhari.filter((u) => u.type === "payable").length})
              </TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              <Card>
                <CardContent className="p-0">
                  {filtered.length === 0 ? (
                    <EmptyState
                      icon={<HandCoins className="h-6 w-6" />}
                      title={copy.emptyEntries}
                      description="Track money given/taken from friends, family, suppliers."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Person</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Context</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Settled</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((u) => {
                          const remaining = u.amount - u.amountSettled;
                          const today = new Date();
                          const isOverdue =
                            u.status !== "settled" &&
                            u.status !== "written_off" &&
                            u.dueDate &&
                            differenceInCalendarDays(today, new Date(u.dueDate)) > 0;
                          const waText =
                            u.type === "receivable" && remaining > 0
                              ? buildUdhariWhatsAppReminder(u, rupeesToPaise(remaining))
                              : "";
                          return (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div className="font-medium">{u.personName}</div>
                                {u.phone ? (
                                  <div className="text-[11px] text-muted-foreground">
                                    {u.phone}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <Badge variant={u.type === "receivable" ? "income" : "danger"}>
                                  {u.type === "receivable" ? "To Receive" : "To Pay"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs capitalize text-muted-foreground">
                                {u.context.replace("_", " ")}
                              </TableCell>
                              <TableCell className="tabular-nums text-right">
                                {formatINR(u.amount, { decimals: 0 })}
                              </TableCell>
                              <TableCell className="tabular-nums text-right">
                                {formatINR(u.amountSettled, { decimals: 0 })}
                              </TableCell>
                              <TableCell className="tabular-nums text-right font-medium">
                                {formatINR(remaining, { decimals: 0 })}
                              </TableCell>
                              <TableCell className="text-xs">
                                {u.dueDate ? formatDate(u.dueDate) : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    isOverdue
                                      ? "danger"
                                      : u.status === "settled"
                                        ? "success"
                                        : u.status === "written_off"
                                          ? "secondary"
                                          : u.status === "partial"
                                            ? "warning"
                                            : "outline"
                                  }
                                >
                                  {isOverdue ? "Overdue" : u.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-1">
                                  {u.status !== "settled" && u.status !== "written_off" ? (
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      onClick={() => setSettling(u)}
                                      title="Settle with cash"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    </Button>
                                  ) : null}
                                  {u.type === "receivable" &&
                                  u.status !== "settled" &&
                                  u.status !== "written_off" &&
                                  remaining > 0 ? (
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      onClick={() => setWriteOff(u)}
                                      title="Write off receivable"
                                    >
                                      <Ban className="h-3.5 w-3.5" />
                                    </Button>
                                  ) : null}
                                  {waText ? (
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      title="Copy WhatsApp reminder"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(waText);
                                        toast({ title: "Copied", kind: "success" });
                                      }}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  ) : null}
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    onClick={() => setEditing(u)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(u.id)}
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
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settlement &amp; write-off log</CardTitle>
              <CardDescription>Cash settlements include bank/UPI account; write-offs have no cash leg.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {settlementHistory.length === 0 ? (
                <EmptyState
                  icon={<History className="h-6 w-6" />}
                  title="No settlements yet"
                  description="Record a settlement from an entry row."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Person</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlementHistory.map(({ s, person, entryType }) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs">{formatDate(s.date)}</TableCell>
                        <TableCell>{person}</TableCell>
                        <TableCell className="text-xs capitalize">{entryType ?? "—"}</TableCell>
                        <TableCell className="text-xs">{s.kind === "write_off" ? "Write-off" : "Cash"}</TableCell>
                        <TableCell className="tabular-nums text-right">
                          {formatINR(s.amount, { decimals: 0 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UdhariForm
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        record={editing}
        userId={user?.id}
        onSaved={(u) => {
          upsertLocal("udhari", u);
          toast({ title: editing ? "Updated" : "Added", kind: "success" });
          setAdding(false);
          setEditing(null);
        }}
      />

      <SettleDialog
        record={settling}
        accounts={accounts}
        onClose={() => setSettling(null)}
        onSubmit={(amt, accountId) => settling && settle(settling, amt, accountId)}
      />

      <WriteOffDialog
        record={writeOff}
        categories={expenseCategories}
        onClose={() => setWriteOff(null)}
        onSubmit={(amt, categoryId, reason) => writeOff && recordWriteOff(writeOff, amt, categoryId, reason)}
      />
    </div>
  );
}

function SettleDialog({
  record,
  accounts,
  onClose,
  onSubmit,
}: {
  record: UdhariRecord | null;
  accounts: Account[];
  onClose: () => void;
  onSubmit: (amount: number, accountId: string) => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState<string>("");
  const remaining = record ? record.amount - record.amountSettled : 0;

  useEffect(() => {
    setAmount(0);
    setAccountId(accounts[0]?.id ?? "");
  }, [record, accounts]);

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle — {record?.personName}</DialogTitle>
        </DialogHeader>
        <div className="mb-3 rounded-lg bg-surface-2 p-3 text-xs">
          <div className="flex justify-between">
            <span>Remaining</span>
            <span className="tabular-nums font-semibold">
              {formatINR(remaining)}
            </span>
          </div>
        </div>
        <Field label="Account (cash in/out)" required>
          <Select value={accountId || undefined} onValueChange={(v) => setAccountId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Amount to settle (₹)" required>
          <Input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(+e.target.value)}
            max={remaining}
          />
        </Field>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAmount(remaining)}>
            Settle full
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAmount(Math.round(remaining / 2))}
          >
            Half
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => amount > 0 && accountId && onSubmit(amount, accountId)}
            disabled={amount <= 0 || amount > remaining || !accountId}
          >
            Record settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WriteOffDialog({
  record,
  categories,
  onClose,
  onSubmit,
}: {
  record: UdhariRecord | null;
  categories: Category[];
  onClose: () => void;
  onSubmit: (amount: number, categoryId: string, reason: string) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const remaining = record ? record.amount - record.amountSettled : 0;

  useEffect(() => {
    setAmount(remaining > 0 ? remaining : 0);
    setCategoryId(categories[0]?.id ?? "");
    setReason("");
  }, [record, remaining, categories]);

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write off receivable — {record?.personName}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Reduces receivable and posts a personal loss / bad-debt expense (not cash). Pick an expense
          category such as &quot;Miscellaneous&quot; or a dedicated bad-debt category.
        </p>
        <Field label="Expense category" required>
          <Select value={categoryId || undefined} onValueChange={(v) => setCategoryId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Amount (₹)" required>
          <Input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(+e.target.value)}
            max={remaining}
          />
        </Field>
        <Field label="Reason" required>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. unrecoverable, waived, refused"
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => amount > 0 && categoryId && !validateWriteOffReason(reason) && onSubmit(amount, categoryId, reason)}
            disabled={amount <= 0 || amount > remaining || !categoryId || !!validateWriteOffReason(reason)}
          >
            Record write-off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UdhariForm({
  open,
  onClose,
  record,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  record: UdhariRecord | null;
  userId?: string;
  onSaved: (u: UdhariRecord) => void;
}) {
  const [state, setState] = useState({
    personName: record?.personName ?? "",
    phone: record?.phone ?? "",
    type: (record?.type ?? "receivable") as UdhariRecord["type"],
    amount: record?.amount ?? 0,
    givenDate: record?.givenDate
      ? isoToLocalDate(record.givenDate)
      : format(new Date(), "yyyy-MM-dd"),
    dueDate: record?.dueDate ? isoToLocalDate(record.dueDate) : "",
    context: record?.context ?? "friend",
    reminderOn: (record?.reminderOn ?? 1) as 0 | 1,
    notes: record?.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState({
      personName: record?.personName ?? "",
      phone: record?.phone ?? "",
      type: (record?.type ?? "receivable") as UdhariRecord["type"],
      amount: record?.amount ?? 0,
      givenDate: record?.givenDate
        ? isoToLocalDate(record.givenDate)
        : format(new Date(), "yyyy-MM-dd"),
      dueDate: record?.dueDate ? isoToLocalDate(record.dueDate) : "",
      context: record?.context ?? "friend",
      reminderOn: (record?.reminderOn ?? 1) as 0 | 1,
      notes: record?.notes ?? "",
    });
    setErr(null);
  }, [record, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parse = udhariSchema.safeParse(state);
    if (!parse.success) {
      setErr(parse.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...parse.data,
        givenDate: localDateToIso(parse.data.givenDate),
        dueDate: parse.data.dueDate ? localDateToIso(parse.data.dueDate) : undefined,
      };
      if (record) {
        const updated = await udhariRepo.update(record.id, payload as unknown as Partial<UdhariRecord>);
        if (updated) onSaved(updated);
      } else {
        const created = await udhariRepo.create({
          userId,
          data: {
            ...payload,
            amountSettled: 0,
            status: "open",
          } as unknown as UdhariRecord,
        });
        onSaved(created);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save udhari");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{record ? "Edit Udhari" : "New Udhari"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Person" required className="col-span-2">
            <Input
              value={state.personName}
              onChange={(e) => setState({ ...state, personName: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={state.phone}
              onChange={(e) => setState({ ...state, phone: e.target.value })}
              placeholder="+91 …"
            />
          </Field>
          <Field label="Type">
            <Select
              value={state.type}
              onValueChange={(v) => setState({ ...state, type: v as UdhariRecord["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receivable">To Receive (I gave money)</SelectItem>
                <SelectItem value="payable">To Pay (I took money)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Amount (₹)" required>
            <Input
              type="number"
              value={state.amount}
              onChange={(e) => setState({ ...state, amount: +e.target.value })}
            />
          </Field>
          <Field label="Context">
            <Select
              value={state.context}
              onValueChange={(v) => setState({ ...state, context: v as UdhariRecord["context"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UDHARI_CONTEXTS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Given date" required>
            <Input
              type="date"
              value={state.givenDate}
              onChange={(e) => setState({ ...state, givenDate: e.target.value })}
            />
          </Field>
          <Field label="Due date">
            <Input
              type="date"
              value={state.dueDate}
              onChange={(e) => setState({ ...state, dueDate: e.target.value })}
            />
          </Field>
          <Field label="Reminder">
            <Select
              value={String(state.reminderOn)}
              onValueChange={(v) =>
                setState({ ...state, reminderOn: (v === "1" ? 1 : 0) as 0 | 1 })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">On</SelectItem>
                <SelectItem value="0">Off</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes" className="col-span-2">
            <Input
              value={state.notes}
              onChange={(e) => setState({ ...state, notes: e.target.value })}
              placeholder="Optional"
            />
          </Field>
          {err ? (
            <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger">
              {err}
            </div>
          ) : null}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
