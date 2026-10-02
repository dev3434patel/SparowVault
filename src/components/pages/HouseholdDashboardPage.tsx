import { useEffect, useMemo, useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { householdMemberRepo, householdRepo, transactionRepo } from "@/repositories";
import {
  actingHouseholdMember,
  addHouseholdMember,
  markTransactionShared,
  createHouseholdRecord,
  householdActorCanWrite,
  setHouseholdMemberRole,
  sharedFamilyKpis,
  type HouseholdUiRole,
} from "@/services/personalBookWorkflows";
import { acceptServerHouseholdInvite, issueServerHouseholdInvite } from "@/services/householdGrantClient";
import type { Household, HouseholdMember } from "@/types";
import { formatINR } from "@/lib/format";
import { paiseToRupees } from "@/utils/money";
import { useMessages } from "@/i18n/useMessages";

export function HouseholdDashboardPage() {
  const user = useAuthStore((s) => s.currentUser);
  const toast = useUIStore((s) => s.toast);
  const messages = useMessages();
  const copy = messages.ui.household;
  const createLabel = messages.ui.common.create;
  const shareLabel = messages.ui.common.share;
  const unshareLabel = messages.ui.common.unshare;
  function roleText(role: string | undefined) {
    if (role === "owner") return copy.owner;
    if (role === "partner" || role === "editor") return copy.editor;
    return copy.viewer;
  }
  const transactions = useDataStore((s) => s.transactions);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<HouseholdUiRole>("editor");
  const [inviteCode, setInviteCode] = useState("");
  const [acceptCode, setAcceptCode] = useState("");
  const [acceptName, setAcceptName] = useState("");
  const [shareIds, setShareIds] = useState<string[]>([]);

  const active = households.find((household) => household.id === selectedId) ?? households[0];
  const householdMembers = members.filter((member) => member.householdId === active?.id);
  const actor = active ? actingHouseholdMember(householdMembers, active.id) : undefined;
  const canWrite = householdActorCanWrite(actor?.role);
  const kpis = useMemo(() => sharedFamilyKpis(transactions), [transactions]);

  async function reload(preferId?: string) {
    if (!user) return;
    const [householdRows, memberRows] = await Promise.all([
      householdRepo.list(user.id),
      householdMemberRepo.list(user.id),
    ]);
    const nextHouseholds = householdRows.filter((row) => row.isDeleted !== 1);
    setHouseholds(nextHouseholds);
    setMembers(memberRows.filter((row) => row.isDeleted !== 1));
    setSelectedId((current) => preferId || current || nextHouseholds[0]?.id || "");
  }

  useEffect(() => {
    void reload();
  }, [user?.id]);

  async function createHousehold() {
    if (!user) return;
    try {
      const created = await createHouseholdRecord(
        user.id,
        name,
        user.displayName || user.username,
      );
      setName("");
      toast({ title: "Household created", kind: "success" });
      await reload(created.household.id);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Could not create household", kind: "error" });
    }
  }

  async function addMember() {
    if (!user || !active) return;
    try {
      await addHouseholdMember(user.id, actor?.role, {
        householdId: active.id,
        displayName: memberName,
        role: memberRole,
      });
      setMemberName("");
      toast({ title: "Member saved", kind: "success" });
      await reload(active.id);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Could not add member", kind: "error" });
    }
  }

  async function createInvite() {
    if (!user || !active) return;
    try {
      const issued = await issueServerHouseholdInvite({
        householdId: active.id,
        role: "viewer",
        resourceScope: shareIds.map((entityId) => ({ collection: "transactions", entityId })),
      });
      setInviteCode(issued.token);
      toast({ title: copy.createInvite, kind: "success" });
      await reload(active.id);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Could not create invite", kind: "error" });
    }
  }

  async function acceptInvite() {
    if (!user) return;
    try {
      await acceptServerHouseholdInvite(acceptCode);
      setAcceptCode("");
      setAcceptName("");
      toast({ title: copy.accept, kind: "success" });
      await reload(active?.id);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Could not accept invite", kind: "error" });
    }
  }

  async function changeRole(member: HouseholdMember, role: HouseholdUiRole) {
    if (!user) return;
    try {
      await setHouseholdMemberRole(user.id, actor?.role, member.id, role);
      toast({ title: "Role updated", kind: "success" });
      await reload(member.householdId);
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Could not change role", kind: "error" });
    }
  }

  async function toggleShare(id: string, notes: string | undefined, shared: boolean) {
    try {
      const updated = await markTransactionShared(
        active ? actor?.role : "owner",
        id,
        notes,
        shared,
        (txId, patch) => transactionRepo.update(txId, patch),
      );
      if (updated) {
        upsertLocal("transactions", updated);
        toast({ title: shared ? copy.markedShared : copy.removedShare, kind: "info" });
      }
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : copy.shareFailed, kind: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PersonalPageHeader screen="household" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{copy.sharedIncome}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(paiseToRupees(kpis.incomePaise))}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{copy.sharedExpense}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(paiseToRupees(kpis.expensePaise))}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{copy.sharedSurplus}</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{formatINR(paiseToRupees(kpis.surplusPaise))}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>{copy.households}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {households.length > 0 ? (
            <Field label={copy.selected}>
              <Select value={active?.id} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder={copy.choose} />
                </SelectTrigger>
                <SelectContent>
                  {households.map((household) => (
                    <SelectItem key={household.id} value={household.id}>{household.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Field label={copy.newHousehold} className="min-w-[200px] flex-1">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.homePh} />
            </Field>
            <div className="flex items-end">
              <Button onClick={() => void createHousehold()}>{createLabel}</Button>
            </div>
          </div>
          {active ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {copy.yourRole}: {roleText(actor?.role)}. {canWrite ? copy.canEdit : copy.viewerBlocked}
              </p>
              {householdMembers.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <span>{member.displayName}</span>
                  <div className="flex items-center gap-2">
                    <Badge>{roleText(member.role)}</Badge>
                    <Select
                      value={member.role === "partner" ? "editor" : member.role}
                      onValueChange={(value) => void changeRole(member, value as HouseholdUiRole)}
                      disabled={!canWrite || member.id === actor?.id && member.role === "viewer"}
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">{copy.owner}</SelectItem>
                        <SelectItem value="editor">{copy.editor}</SelectItem>
                        <SelectItem value="viewer">{copy.viewer}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-3">
                <Field label={copy.memberName} className="min-w-[160px] flex-1">
                  <Input value={memberName} onChange={(event) => setMemberName(event.target.value)} disabled={!canWrite} />
                </Field>
                <Field label={copy.role}>
                  <Select value={memberRole} onValueChange={(value) => setMemberRole(value as HouseholdUiRole)} disabled={!canWrite}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">{copy.owner}</SelectItem>
                      <SelectItem value="editor">{copy.editor}</SelectItem>
                      <SelectItem value="viewer">{copy.viewer}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => void addMember()} disabled={!canWrite}>{copy.addMember}</Button>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <Button variant="outline" onClick={() => void createInvite()} disabled={!canWrite}>{copy.createInvite}</Button>
                {inviteCode ? <p className="text-sm">{copy.inviteCode} {inviteCode}. {copy.inviteOnce}</p> : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{copy.createFirst}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Field label={copy.inviteCode} className="min-w-[140px]">
              <Input value={acceptCode} onChange={(event) => setAcceptCode(event.target.value)} />
            </Field>
            <Field label={copy.inviteName} className="min-w-[160px] flex-1">
              <Input value={acceptName} onChange={(event) => setAcceptName(event.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => void acceptInvite()}>{copy.accept}</Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{copy.inviteOnce}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{copy.shareRow}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {transactions.filter((tx) => tx.isDeleted !== 1).slice(0, 8).map((tx) => {
            const shared = (tx.notes ?? "").includes("shared=1") || tx.tags?.includes("shared");
            return (
              <div key={tx.id} className="flex items-center justify-between gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shareIds.includes(tx.id)}
                    onChange={(event) => setShareIds((current) => event.target.checked ? [...current, tx.id] : current.filter((id) => id !== tx.id))}
                  />
                  <span>{tx.type} · {tx.description || tx.merchantOrPerson || tx.date.slice(0, 10)}</span>
                </label>
                <Button size="sm" variant="outline" disabled={Boolean(active) && !canWrite} onClick={() => void toggleShare(tx.id, tx.notes, !shared)}>
                  {shared ? unshareLabel : shareLabel}
                </Button>
              </div>
            );
          })}
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noTx}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
