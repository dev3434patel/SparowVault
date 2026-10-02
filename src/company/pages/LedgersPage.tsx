import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { companyApi } from "@/company/api/client";
import { companyNavigate, companyPath } from "@/company/routes";
import { useCompanyStore } from "@/company/store/companyStore";
import type { AccountGroup, CompanyLedger, LineSide } from "@/company/types";
import { parseMoneyInputToPaise } from "@/utils/money";
import { SkeletonTable } from "@/company/components/CompanySkeleton";
import { ScrollTable } from "@/company/components/responsive";
import { useI18n } from "@/company/i18n/react";
import { useHasPermission } from "@/company/components/PermissionGate";

export function LedgersPage({ cashBankOnly = false }: { cashBankOnly?: boolean }) {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [ledgers, setLedgers] = useState<CompanyLedger[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [obLedgerId, setObLedgerId] = useState("");
  const [obSide, setObSide] = useState<LineSide>("DEBIT");
  const [obAmount, setObAmount] = useState("");
  const [savingOb, setSavingOb] = useState(false);
  const canOpening = useHasPermission("manage_opening_balances");
  const canManage = useHasPermission("manage_ledgers");
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");

  async function load() {
    if (!companyId) return;
    setLoading(true);
    try {
      const catalog = await companyApi.listLedgerCatalog(companyId);
      setLedgers(catalog.ledgers);
      setGroups(catalog.groups);
      if (!newGroupId && catalog.groups[0]) setNewGroupId(catalog.groups[0].id);
      if (!obLedgerId && catalog.ledgers[0]) setObLedgerId(catalog.ledgers[0].id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const visible = useMemo(
    () => (cashBankOnly ? ledgers.filter((l) => l.isCashBank) : ledgers),
    [cashBankOnly, ledgers],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return visible;
    return visible.filter(
      (l) => l.name.toLowerCase().includes(needle) || l.code.toLowerCase().includes(needle),
    );
  }, [visible, q]);

  const capitalLedger = useMemo(
    () => ledgers.find((l) => l.code === "CAPITAL_LEDGER") ?? null,
    [ledgers],
  );

  async function onOpeningBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !obLedgerId) return;
    if (!canOpening) {
      setErr(t("ledgers.openingNeedPermission"));
      return;
    }
    setErr(null);
    setOk(null);
    let amountPaise: number;
    try {
      amountPaise = parseMoneyInputToPaise(obAmount, { allowZero: false, throwOnInvalid: true });
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("ledgers.openingInvalidAmount"));
      return;
    }
    if (!capitalLedger) {
      setErr(t("ledgers.openingCapitalMissing"));
      return;
    }
    if (obLedgerId === capitalLedger.id) {
      setErr(t("ledgers.openingNotCapital"));
      return;
    }
    const equitySide: LineSide = obSide === "DEBIT" ? "CREDIT" : "DEBIT";
    setSavingOb(true);
    try {
      const res = await companyApi.postVoucher(companyId, {
        mutationId: `ui-ob-${crypto.randomUUID()}`,
        voucherType: "OPENING_BALANCE",
        voucherDate: new Date().toISOString().slice(0, 10),
        narration: "Opening balance",
        status: "POSTED",
        lines: [
          { ledgerId: obLedgerId, side: obSide, amountPaise },
          { ledgerId: capitalLedger.id, side: equitySide, amountPaise },
        ],
      });
      setOk(t("ledgers.openingPosted", { number: res.voucherNumber || res.id }));
      setObAmount("");
    } catch (error) {
      setErr(error instanceof Error ? error.message : t("ledgers.openingFailed"));
    } finally {
      setSavingOb(false);
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">{cashBankOnly ? t("ledgers.cashTitle") : t("ledgers.title")}</h1>
      <p className="text-sm text-muted-foreground">
        {cashBankOnly ? t("ledgers.cashSubtitle") : t("ledgers.subtitle")}
      </p>
      <Input placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {ok ? <p className="text-sm text-emerald-600">{ok}</p> : null}
      {loading ? <SkeletonTable rows={6} cols={3} /> : null}

      {!cashBankOnly && canManage ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Manage ledgers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (!companyId || !newName.trim() || !newCode.trim() || !newGroupId) return;
                setErr(null);
                setOk(null);
                void companyApi
                  .mutateLedger(companyId, {
                    action: "create",
                    name: newName.trim(),
                    code: newCode.trim().toUpperCase(),
                    groupId: newGroupId,
                  })
                  .then(() => {
                    setOk("Ledger created. Opening differences are not posted.");
                    setNewName("");
                    setNewCode("");
                    return load();
                  })
                  .catch((error: unknown) => setErr(error instanceof Error ? error.message : "Create failed"));
              }}
            >
              <Field label="Group" className="flex-1">
                <select
                  className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  required
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.code} — {group.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Code">
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} required />
              </Field>
              <Field label="Name" className="flex-1">
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </Field>
              <Button type="submit" size="sm">
                Create ledger
              </Button>
            </form>
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (!companyId || !editId || !editName.trim()) return;
                setErr(null);
                setOk(null);
                void companyApi
                  .mutateLedger(companyId, { action: "rename", ledgerId: editId, name: editName.trim() })
                  .then(() => {
                    setOk("Ledger renamed");
                    return load();
                  })
                  .catch((error: unknown) => setErr(error instanceof Error ? error.message : "Rename failed"));
              }}
            >
              <Field label="Rename" className="flex-1">
                <select
                  className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
                  value={editId}
                  onChange={(e) => {
                    setEditId(e.target.value);
                    const row = ledgers.find((ledger) => ledger.id === e.target.value);
                    setEditName(row?.name ?? "");
                  }}
                >
                  <option value="">Choose a ledger</option>
                  {ledgers.map((ledger) => (
                    <option key={ledger.id} value={ledger.id}>
                      {ledger.code} — {ledger.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="New name" className="flex-1">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </Field>
              <Button type="submit" size="sm" variant="outline" disabled={!editId}>
                Rename
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!editId}
                onClick={() => {
                  if (!companyId || !editId) return;
                  if (!window.confirm("Archive this unused ledger? Ledgers that already have voucher lines stay in the books.")) return;
                  setErr(null);
                  setOk(null);
                  void companyApi
                    .mutateLedger(companyId, { action: "archive", ledgerId: editId })
                    .then(() => {
                      setOk("Ledger archived");
                      setEditId("");
                      setEditName("");
                      return load();
                    })
                    .catch((error: unknown) => setErr(error instanceof Error ? error.message : "Archive failed"));
                }}
              >
                Archive
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {cashBankOnly || !canOpening ? null : (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("ledgers.openingTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => void onOpeningBalance(e)}>
            <Field label={t("ledgers.openingLedger")} className="flex-1">
              <select
                className="flex h-9 w-full rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
                value={obLedgerId}
                onChange={(e) => setObLedgerId(e.target.value)}
                required
              >
                {ledgers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("ledgers.openingSide")}>
              <select
                className="flex h-9 rounded-md border border-[hsl(var(--input))] bg-card px-3 text-sm"
                value={obSide}
                onChange={(e) => setObSide(e.target.value as LineSide)}
              >
                <option value="DEBIT">{t("vouchers.debit")}</option>
                <option value="CREDIT">{t("vouchers.credit")}</option>
              </select>
            </Field>
            <Field label={t("quick.amount")}>
              <Input value={obAmount} onChange={(e) => setObAmount(e.target.value)} placeholder="0.00" required />
            </Field>
            <Button type="submit" size="sm" disabled={savingOb || !capitalLedger}>
              {savingOb ? t("quick.posting") : t("ledgers.openingPost")}
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("ledgers.openingHelp")}
          </p>
        </CardContent>
      </Card>
      )}

      {!loading && !err && filtered.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {cashBankOnly ? t("ledgers.cashEmpty") : t("ledgers.empty")}
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-2 md:hidden">
        {filtered.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-card p-3">
            <div className="font-medium">{l.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="outline">{l.code}</Badge>
              {l.nature ? <Badge variant="outline">{l.nature}</Badge> : null}
              {l.isCashBank ? <Badge variant="secondary">Cash/Bank</Badge> : null}
              {cashBankOnly ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() =>
                    companyNavigate(`${companyPath("report-view", { reportKey: "cash-bank-book" })}?ledgerId=${encodeURIComponent(l.id)}`)
                  }
                >
                  {t("ledgers.openBook")}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Card className="hidden md:block">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ledgers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollTable>
            <table className="w-full min-w-[28rem] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2">Code</th>
                <th scope="col" className="px-4 py-2">Name</th>
                <th scope="col" className="px-4 py-2">{cashBankOnly ? t("ledgers.openBook") : "Cash/Bank"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{l.code}</td>
                  <td className="px-4 py-2">{l.name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {cashBankOnly ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          companyNavigate(`${companyPath("report-view", { reportKey: "cash-bank-book" })}?ledgerId=${encodeURIComponent(l.id)}`)
                        }
                      >
                        {t("ledgers.openBook")}
                      </Button>
                    ) : l.isCashBank ? (
                      "Yes"
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </ScrollTable>
        </CardContent>
      </Card>
    </div>
  );
}
