import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import {
  assetValuationRepo,
  fixedIncomeAssetRepo,
  insurancePolicyRepo,
} from "@/repositories";
import type { AssetValuation, FixedIncomeAsset, InsurancePolicy } from "@/types";
import { formatINR, formatDate } from "@/lib/format";
import { paiseToRupees, rupeesToPaise } from "@/utils/money";
import { DataConfidenceBadge } from "@/components/finance/DataConfidenceBadge";
import { InvestmentsPage } from "@/components/pages/InvestmentsPage";

function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function WealthHubPage() {
  const user = useAuthStore((s) => s.currentUser);
  const toast = useUIStore((s) => s.toast);
  const [fds, setFds] = useState<FixedIncomeAsset[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [vals, setVals] = useState<AssetValuation[]>([]);
  const [fdName, setFdName] = useState("");
  const [fdType, setFdType] = useState<"fd" | "rd">("fd");
  const [fdPrincipal, setFdPrincipal] = useState("");
  const [fdRate, setFdRate] = useState("6.5");
  const [fdStart, setFdStart] = useState(localToday());
  const [fdMaturity, setFdMaturity] = useState(localToday());
  const [insName, setInsName] = useState("");
  const [insurer, setInsurer] = useState("");
  const [insPremium, setInsPremium] = useState("");
  const [insCoverage, setInsCoverage] = useState("");
  const [insDueDay, setInsDueDay] = useState("1");
  const [valLabel, setValLabel] = useState("");
  const [valType, setValType] = useState<"gold" | "property" | "vehicle" | "other">("other");
  const [valAmount, setValAmount] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    if (!user) return;
    try {
      const [a, b, c] = await Promise.all([
        fixedIncomeAssetRepo.list(user.id),
        insurancePolicyRepo.list(user.id),
        assetValuationRepo.list(user.id),
      ]);
      setFds(a.filter((x) => x.isDeleted !== 1));
      setPolicies(b.filter((x) => x.isDeleted !== 1));
      setVals(c.filter((x) => x.isDeleted !== 1));
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Failed to load wealth data", kind: "error" });
    }
  }

  useEffect(() => {
    void reload();
  }, [user?.id]);

  async function addFd() {
    if (!user) return;
    if (!fdName.trim() || !fdPrincipal || Number(fdPrincipal) <= 0) {
      toast({ title: "Enter name and principal amount", kind: "error" });
      return;
    }
    if (!fdMaturity || fdMaturity < fdStart) {
      toast({ title: "Maturity date must be on/after start date", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await fixedIncomeAssetRepo.create({
        userId: user.id,
        data: {
          name: fdName.trim(),
          type: fdType,
          principalPaise: rupeesToPaise(Number(fdPrincipal)),
          rateBps: Math.round(Number(fdRate || 0) * 100),
          startDate: fdStart,
          maturityDate: fdMaturity,
          status: "active",
        },
      });
      setFdName("");
      setFdPrincipal("");
      toast({ title: `${fdType.toUpperCase()} saved`, kind: "success" });
      await reload();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not save FD/RD", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function addInsurance() {
    if (!user) return;
    if (!insName.trim() || !insurer.trim() || !insPremium) {
      toast({ title: "Enter policy name, insurer, and premium", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await insurancePolicyRepo.create({
        userId: user.id,
        data: {
          name: insName.trim(),
          insurer: insurer.trim(),
          premiumPaise: rupeesToPaise(Number(insPremium)),
          premiumDueDay: Math.min(28, Math.max(1, Number(insDueDay) || 1)),
          coveragePaise: rupeesToPaise(Number(insCoverage) || 0),
          status: "active",
        },
      });
      setInsName("");
      setInsurer("");
      setInsPremium("");
      setInsCoverage("");
      toast({ title: "Insurance policy saved", kind: "success" });
      await reload();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not save policy", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function addValuation() {
    if (!user) return;
    if (!valLabel.trim() || !valAmount || Number(valAmount) <= 0) {
      toast({ title: "Enter label and value", kind: "error" });
      return;
    }
    setBusy(true);
    try {
      await assetValuationRepo.create({
        userId: user.id,
        data: {
          assetType: valType,
          label: valLabel.trim(),
          valuePaise: rupeesToPaise(Number(valAmount)),
          asOfDate: localToday(),
        },
      });
      setValLabel("");
      setValAmount("");
      toast({ title: "Valuation saved", kind: "success" });
      await reload();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not save valuation", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Wealth & assets"
        description="Investments, fixed deposits, insurance, and manual valuations — bank→FD is an asset move, not expense."
      />
      <Tabs defaultValue="investments">
        <TabsList>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="fd">FD / RD</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="valuations">Valuations</TabsTrigger>
        </TabsList>
        <TabsContent value="investments">
          <InvestmentsPage embedded />
        </TabsContent>
        <TabsContent value="fd" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Add FD/RD <DataConfidenceBadge confidence="user_confirmed" />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Name">
                <Input value={fdName} onChange={(e) => setFdName(e.target.value)} placeholder="SBI FD 2026" />
              </Field>
              <Field label="Type">
                <Select value={fdType} onValueChange={(v) => setFdType(v as "fd" | "rd")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fd">Fixed Deposit</SelectItem>
                    <SelectItem value="rd">Recurring Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Principal (₹)">
                <Input type="number" min={0} value={fdPrincipal} onChange={(e) => setFdPrincipal(e.target.value)} />
              </Field>
              <Field label="Annual rate %">
                <Input type="number" step="0.01" value={fdRate} onChange={(e) => setFdRate(e.target.value)} />
              </Field>
              <Field label="Start date">
                <Input type="date" value={fdStart} onChange={(e) => setFdStart(e.target.value)} />
              </Field>
              <Field label="Maturity date">
                <Input type="date" value={fdMaturity} onChange={(e) => setFdMaturity(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button onClick={addFd} loading={busy}>Save</Button>
              </div>
            </CardContent>
          </Card>
          {fds.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex justify-between py-4 text-sm">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-muted-foreground">
                    {f.type.toUpperCase()} · {(f.rateBps / 100).toFixed(2)}% · matures {formatDate(f.maturityDate)}
                  </div>
                </div>
                <div className="tabular-nums font-semibold">{formatINR(paiseToRupees(f.principalPaise))}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Add insurance policy</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Policy name">
                <Input value={insName} onChange={(e) => setInsName(e.target.value)} />
              </Field>
              <Field label="Insurer">
                <Input value={insurer} onChange={(e) => setInsurer(e.target.value)} placeholder="LIC / HDFC Life" />
              </Field>
              <Field label="Premium (₹)">
                <Input type="number" value={insPremium} onChange={(e) => setInsPremium(e.target.value)} />
              </Field>
              <Field label="Coverage (₹)">
                <Input type="number" value={insCoverage} onChange={(e) => setInsCoverage(e.target.value)} />
              </Field>
              <Field label="Premium due day (1–28)">
                <Input type="number" min={1} max={28} value={insDueDay} onChange={(e) => setInsDueDay(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button onClick={addInsurance} loading={busy}>Save</Button>
              </div>
            </CardContent>
          </Card>
          {policies.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex justify-between py-4 text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-muted-foreground">{p.insurer} · due day {p.premiumDueDay}</div>
                </div>
                <div className="text-right">
                  <div className="tabular-nums">{formatINR(paiseToRupees(p.premiumPaise))} / cycle</div>
                  {p.coveragePaise > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Cover {formatINR(paiseToRupees(p.coveragePaise))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="valuations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Manual valuation <DataConfidenceBadge confidence="user_confirmed" />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Label">
                <Input value={valLabel} onChange={(e) => setValLabel(e.target.value)} placeholder="Gold jewellery" />
              </Field>
              <Field label="Type">
                <Select value={valType} onValueChange={(v) => setValType(v as typeof valType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Value (₹)">
                <Input type="number" value={valAmount} onChange={(e) => setValAmount(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <Button onClick={addValuation} loading={busy}>Save</Button>
              </div>
            </CardContent>
          </Card>
          {vals.map((v) => (
            <Card key={v.id}>
              <CardContent className="flex justify-between py-4 text-sm">
                <div>
                  <div className="font-medium">{v.label}</div>
                  <div className="text-muted-foreground">{v.assetType} · as of {formatDate(v.asOfDate)}</div>
                </div>
                <div className="tabular-nums font-semibold">{formatINR(paiseToRupees(v.valuePaise))}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
