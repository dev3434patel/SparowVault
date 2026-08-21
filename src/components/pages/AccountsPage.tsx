import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { accountRepo } from "@/repositories";
import type { Account } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { confirm } from "@/store/uiStore";
import { accountSchema } from "@/services/validators";
import { deriveAccountBalanceFromAccount } from "@/services/calculations";
import { ACCOUNT_TYPE_LABELS } from "@/constants";
import { formatINR } from "@/lib/format";
import { paiseToRupees } from "@/utils/money";
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/Table";
import { refsForAccount } from "@/services/refIntegrity";

export function AccountsPage() {
  const user = useAuthStore((s) => s.currentUser);
  const accounts = useDataStore((s) => s.accounts);
  const transactions = useDataStore((s) => s.transactions);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const toast = useUIStore((s) => s.toast);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) {
      map.set(a.id, deriveAccountBalanceFromAccount(a.id, a, transactions));
    }
    return map;
  }, [accounts, transactions]);

  const totalBalance = Array.from(balances.values()).reduce((a, b) => a + b, 0);

  async function handleDelete(id: string) {
    const refs = refsForAccount(id);
    if (refs.blocking) {
      toast({
        title: "Cannot delete account",
        description: refs.message,
        kind: "warning",
      });
      return;
    }
    const ok = await confirm({
      title: "Delete this account?",
      description: "This account will be removed permanently.",
      destructive: true,
      confirmLabel: "Delete account",
    });
    if (!ok) return;
    await accountRepo.softDelete(id);
    removeLocal("accounts", id);
    toast({ title: "Account removed", kind: "info" });
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="All your money containers — cash, bank, UPI, wallets."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> New Account
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total balance</CardDescription>
            <CardTitle className="tabular-nums">{formatINR(paiseToRupees(totalBalance))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Accounts</CardDescription>
            <CardTitle>{accounts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active</CardDescription>
            <CardTitle>{accounts.filter((a) => !a.isInactive).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Transactions</CardDescription>
            <CardTitle>{transactions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Wallet className="h-6 w-6" />}
              title="No accounts yet"
              description="Add a bank account, UPI wallet, or cash tracker to get started."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> Add Account
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card
              key={a.id}
              className={`overflow-hidden ${a.isInactive ? "opacity-60" : ""}`}
            >
              <div className="h-1.5" style={{ backgroundColor: a.color }} />
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                    style={{ backgroundColor: a.color + "22", color: a.color }}
                  >
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{a.name}</div>
                      {a.isInactive ? (
                        <Badge variant="outline">Inactive</Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABELS[a.type]}
                      {a.institution ? ` • ${a.institution}` : ""}
                    </div>
                    <div className="mt-2 text-xl font-semibold tabular-nums">
                      {formatINR(paiseToRupees(balances.get(a.id) ?? 0))}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Opening: {formatINR(a.openingBalance, { decimals: 0 })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditing(a)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleDelete(a.id)}
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

      <AccountForm
        open={adding || !!editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        account={editing}
        userId={user?.id}
        onSaved={(a) => {
          upsertLocal("accounts", a);
          toast({
            title: editing ? "Account updated" : "Account created",
            kind: "success",
          });
          setAdding(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function AccountForm({
  open,
  onClose,
  account,
  userId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  account: Account | null;
  userId?: string;
  onSaved: (a: Account) => void;
}) {
  const [state, setState] = useState({
    name: account?.name ?? "",
    type: (account?.type ?? "bank") as Account["type"],
    institution: account?.institution ?? "",
    openingBalance: account?.openingBalance ?? 0,
    color: account?.color ?? "#0ea5e9",
    icon: account?.icon ?? "wallet",
    notes: account?.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setState({
      name: account?.name ?? "",
      type: (account?.type ?? "bank") as Account["type"],
      institution: account?.institution ?? "",
      openingBalance: account?.openingBalance ?? 0,
      color: account?.color ?? "#0ea5e9",
      icon: account?.icon ?? "wallet",
      notes: account?.notes ?? "",
    });
    setErr(null);
  }, [account, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parse = accountSchema.safeParse(state);
    if (!parse.success) {
      setErr(parse.error.issues[0]?.message ?? "Invalid");
      return;
    }
    if (account) {
      const updated = await accountRepo.update(account.id, parse.data);
      if (updated) onSaved(updated);
    } else {
      const created = await accountRepo.create({
        userId,
        data: {
          ...parse.data,
          isInactive: 0,
        } as Account,
      });
      onSaved(created);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? "Edit Account" : "New Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="Name" required className="col-span-2">
            <Input
              value={state.name}
              onChange={(e) => setState({ ...state, name: e.target.value })}
              placeholder="HDFC Savings"
            />
          </Field>
          <Field label="Type">
            <Select
              value={state.type}
              onValueChange={(v) => setState({ ...state, type: v as Account["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Institution">
            <Input
              value={state.institution}
              onChange={(e) => setState({ ...state, institution: e.target.value })}
              placeholder="HDFC Bank"
            />
          </Field>
          <Field label="Opening balance (₹)" className="col-span-2">
            <Input
              type="number"
              value={state.openingBalance}
              onChange={(e) =>
                setState({ ...state, openingBalance: +e.target.value })
              }
            />
          </Field>
          <Field label="Color">
            <Input
              type="color"
              value={state.color}
              onChange={(e) => setState({ ...state, color: e.target.value })}
              className="h-9 p-1"
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
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
