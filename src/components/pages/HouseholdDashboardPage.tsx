import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { householdMemberRepo, householdRepo } from "@/repositories";
import type { Household, HouseholdMember } from "@/types";
import { calculateFinanceMonthKpis } from "@/services/financeKpiEngine";
import { filterByMonth } from "@/services/calculations";
import { formatINR } from "@/lib/format";
import { paiseToRupees } from "@/utils/money";

export function HouseholdDashboardPage() {
  const user = useAuthStore((s) => s.currentUser);
  const toast = useUIStore((s) => s.toast);
  const transactions = useDataStore((s) => s.transactions);
  const ledgerEvents = useDataStore((s) => s.ledgerEvents);
  const ledgerEffects = useDataStore((s) => s.ledgerEffects);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [name, setName] = useState("");
  const [memberName, setMemberName] = useState("");

  const today = useMemo(() => new Date(), []);
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const monthTx = filterByMonth(transactions, y, m);
  const kpis = calculateFinanceMonthKpis(ledgerEvents, ledgerEffects, y, m, monthTx);
  const active = households[0];

  async function reload() {
    if (!user) return;
    const [hs, ms] = await Promise.all([
      householdRepo.list(user.id),
      householdMemberRepo.list(user.id),
    ]);
    setHouseholds(hs.filter((h) => h.isDeleted !== 1));
    setMembers(ms.filter((m) => m.isDeleted !== 1));
  }

  useEffect(() => {
    void reload();
  }, [user?.id]);

  async function createHousehold() {
    if (!user || !name.trim()) {
      toast({ title: "Enter a household name", kind: "error" });
      return;
    }
    try {
      const h = await householdRepo.create({
        userId: user.id,
        data: { name: name.trim(), defaultCurrency: "INR" },
      });
      await householdMemberRepo.create({
        userId: user.id,
        data: {
          householdId: h.id,
          displayName: user.displayName || user.username,
          role: "owner",
        },
      });
      setName("");
      toast({ title: "Household created", kind: "success" });
      await reload();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not create household", kind: "error" });
    }
  }

  async function addMember() {
    if (!user || !active || !memberName.trim()) {
      toast({ title: "Enter member display name", kind: "error" });
      return;
    }
    try {
      await householdMemberRepo.create({
        userId: user.id,
        data: {
          householdId: active.id,
          displayName: memberName.trim(),
          role: "partner",
        },
      });
      setMemberName("");
      toast({ title: "Member added (partner)", kind: "success" });
      await reload();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not add member", kind: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Household dashboard"
        description="Owner/partner can manage members. Viewer cannot change household settings (enforced on server)."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Household income</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatINR(paiseToRupees(kpis.trueIncomePaise))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Household expense</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatINR(paiseToRupees(kpis.consumptionExpensePaise))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Operating surplus</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatINR(paiseToRupees(kpis.operatingSurplusPaise))}
          </CardContent>
        </Card>
      </div>

      {!active ? (
        <Card>
          <CardHeader><CardTitle>Create household</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Field label="Household name" className="min-w-[200px] flex-1">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home" />
            </Field>
            <div className="flex items-end">
              <Button onClick={createHousehold}>Create</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {active.name}
              <Badge variant="secondary">active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {members
                .filter((m) => m.householdId === active.id)
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>{m.displayName}</span>
                    <Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
                  </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Field label="Add partner / member" className="min-w-[200px] flex-1">
                <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button variant="outline" onClick={addMember}>
                  Add member
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
