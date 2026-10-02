import { useState } from "react";
import { PersonalPageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useUIStore } from "@/store/uiStore";
import {
  buildCAWorkbook,
  downloadBuffer,
  exportModuleToSheet,
  mapTransactionRow,
} from "@/exports/xlsxExporter";
import { exportHistoryRepo } from "@/repositories";
import {
  FileSpreadsheet,
  FileText,
  Database,
  Download,
  Receipt,
  Wallet,
  HandCoins,
  Target,
  PiggyBank,
  Landmark,
  CreditCard,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { useCloudAppStore } from "@/store/cloudAppStore";
import { cloudLogin } from "@/lib/cloud/client";
import { buildUserOwnedFullExportPayload } from "@/services/exportSafety";
import { collectPersonalBackupExtras } from "@/services/personalBookWorkflows";
import { planFeatureOff } from "@/services/modulePolicy";
import { useMessages } from "@/i18n/useMessages";

export function ExportPage() {
  const copy = useMessages().ui.exportPage;
  const user = useAuthStore((s) => s.currentUser);
  const data = useDataStore();
  const toast = useUIStore((s) => s.toast);
  const [exporting, setExporting] = useState<string | null>(null);
  const [backupPinOpen, setBackupPinOpen] = useState(false);
  const [backupPin, setBackupPin] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [format, setFormat] = useState<"xlsx" | "csv" | "json">("xlsx");
  const effectiveFeatures = useCloudAppStore((s) => s.effectiveFeatures);

  const exportsOff = effectiveFeatures.exports === false || planFeatureOff(effectiveFeatures, "max_exports_per_month");
  const caReportsOff = planFeatureOff(effectiveFeatures, "ca_reports");

  if (exportsOff) {
    return (
      <div>
        <PersonalPageHeader screen="exportLocked" />
      </div>
    );
  }

  async function logExport(scope: string, fileName: string, rows: number) {
    if (!user) return;
    await exportHistoryRepo.create({
      userId: user.id,
      data: {
        scope,
        format: format === "json" ? "json" : format,
        fileName,
        rowCount: rows,
        fromDate: from || undefined,
        toDate: to || undefined,
      },
    });
  }

  async function caExport() {
    if (!user || caReportsOff) return;
    setExporting("ca");
    const { buffer, filename } = buildCAWorkbook({
      transactions: filterTx(),
      categories: data.categories,
      accounts: data.accounts,
      cards: data.cards,
      budgets: data.budgets,
      goals: data.goals,
      goalContribs: data.goalContribs,
      loans: data.loans,
      emis: data.emis,
      udhari: data.udhari,
      investments: data.investments,
      savingsContribs: data.savingsContribs,
      events: data.ledgerEvents,
      effects: data.ledgerEffects,
      userId: user.id,
      reportPeriod: from || to ? `${from || "start"} to ${to || "end"}` : "all",
      appVersion: "sparowvault",
    });
    downloadBuffer(buffer, filename);
    await logExport("ca_workbook", filename, data.transactions.length);
    toast({ title: copy.caDownloaded, kind: "success" });
    setExporting(null);
  }

  function filterTx() {
    let txs = data.transactions;
    if (from) {
      const fromMs = new Date(from).getTime();
      txs = txs.filter((t) => new Date(t.date).getTime() >= fromMs);
    }
    if (to) {
      const toMs = new Date(to + "T23:59:59.999").getTime();
      txs = txs.filter((t) => new Date(t.date).getTime() <= toMs);
    }
    return txs;
  }

  async function quickExport(
    scope: string,
    label: string,
    buildRows: () => Record<string, unknown>[],
  ) {
    setExporting(scope);
    try {
      const rows = buildRows();
      const stamp = new Date().toISOString().slice(0, 10);
      const fileName =
        format === "json" ? `${label}_${stamp}.json` : `${label}_${stamp}.${format}`;
      if (format === "json") {
        const blob = new Blob([JSON.stringify(rows, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        exportModuleToSheet(label, rows, format);
      }
      await logExport(scope, fileName, rows.length);
      toast({ title: `${label} exported`, kind: "success" });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Export failed",
        kind: "error",
      });
    } finally {
      setExporting(null);
    }
  }

  function requestFullBackup() {
    if (!user) return;
    setBackupPin("");
    setBackupPinOpen(true);
  }

  async function confirmFullBackup() {
    if (!user) return;
    setExporting("backup");
    try {
      await cloudLogin({ username: user.username, pin: backupPin });
      setBackupPinOpen(false);
      const extras = await collectPersonalBackupExtras(user.id);
      const payload = buildUserOwnedFullExportPayload(user, {
        settings: data.settings,
        accounts: data.accounts,
        cards: data.cards,
        categories: data.categories,
        transactions: data.transactions,
        budgets: data.budgets,
        goals: data.goals,
        goalContribs: data.goalContribs,
        loans: data.loans,
        emis: data.emis,
        udhari: data.udhari,
        udhariSettlements: data.udhariSettlements,
        investments: data.investments,
        savingsContribs: data.savingsContribs,
        reminders: data.reminders,
        recurringRules: data.recurringRules,
        ...extras,
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SparowVault_Backup_${user.username}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      await logExport("full_backup", a.download, data.transactions.length);
      toast({ title: copy.backupReady, description: "{copy.backupSafe}", kind: "success" });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "PIN verification failed",
        kind: "error",
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <PersonalPageHeader screen="export" />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{copy.options}</CardTitle>
          <CardDescription>{copy.optionsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label={copy.from}>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={copy.to}>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label={copy.format}>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as "xlsx" | "csv" | "json")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">{copy.xlsx}</SelectItem>
                  <SelectItem value="csv">{copy.csv}</SelectItem>
                  <SelectItem value="json">{copy.json}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-[hsl(var(--primary))]/30">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-primary">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>{copy.caTitle}</CardTitle>
                  <CardDescription>{copy.caHint}</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 text-xs text-muted-foreground">
              Includes 16 sheets: transactions master, monthly summaries, category &
              payment splits, loans, cards, udhari, savings, goals, annual summary, tax
              & GST sheets, account ledger, and notes.
            </div>
            {caReportsOff ? (
              <p className="text-sm text-muted-foreground">{copy.caLocked}</p>
            ) : (
              <Button
                className="w-full"
                onClick={caExport}
                loading={exporting === "ca"}
              >
                <Download className="h-4 w-4" /> Download CA Workbook
              </Button>
            )}
          </CardContent>
        </Card>

        <ExportCard
          icon={<Receipt className="h-5 w-5" />}
          title="All Transactions"
          count={data.transactions.length}
          onExport={() =>
            quickExport("transactions", "Transactions", () =>
              filterTx().map((t) =>
                mapTransactionRow(t, {
                  categories: data.categories,
                  accounts: data.accounts,
                  cards: data.cards,
                }),
              ),
            )
          }
          exporting={exporting === "transactions"}
        />

        <ExportCard
          icon={<Wallet className="h-5 w-5" />}
          title="Accounts"
          count={data.accounts.length}
          onExport={() =>
            quickExport("accounts", "Accounts", () =>
              data.accounts.map((a) => ({
                Name: a.name,
                Type: a.type,
                Institution: a.institution ?? "",
                OpeningBalance: a.openingBalance,
                Inactive: a.isInactive ? "Yes" : "No",
              })),
            )
          }
          exporting={exporting === "accounts"}
        />

        <ExportCard
          icon={<CreditCard className="h-5 w-5" />}
          title="Cards"
          count={data.cards.length}
          onExport={() =>
            quickExport("cards", "Cards", () =>
              data.cards.map((c) => ({
                Nickname: c.nickname,
                Bank: c.bank,
                Type: c.type,
                Last4: c.last4,
                CreditLimit: c.creditLimit ?? "",
                StatementDay: c.statementDay ?? "",
                DueDay: c.dueDay ?? "",
              })),
            )
          }
          exporting={exporting === "cards"}
        />

        <ExportCard
          icon={<Landmark className="h-5 w-5" />}
          title="Loans"
          count={data.loans.length}
          onExport={() =>
            quickExport("loans", "Loans", () =>
              data.loans.map((l) => ({
                Lender: l.lender,
                Type: l.loanType,
                Principal: l.principal,
                Tenure: l.tenureMonths,
                Rate: l.annualInterestRate,
                DueDay: l.emiDueDay,
                StartDate: l.startDate.slice(0, 10),
                Status: l.status,
              })),
            )
          }
          exporting={exporting === "loans"}
        />

        <ExportCard
          icon={<HandCoins className="h-5 w-5" />}
          title="Udhari"
          count={data.udhari.length}
          onExport={() =>
            quickExport("udhari", "Udhari", () =>
              data.udhari.map((u) => ({
                Person: u.personName,
                Phone: u.phone ?? "",
                Type: u.type,
                Amount: u.amount,
                Settled: u.amountSettled,
                Remaining: u.amount - u.amountSettled,
                Status: u.status,
                Given: u.givenDate.slice(0, 10),
                Due: u.dueDate?.slice(0, 10) ?? "",
              })),
            )
          }
          exporting={exporting === "udhari"}
        />

        <ExportCard
          icon={<Target className="h-5 w-5" />}
          title="Goals"
          count={data.goals.length}
          onExport={() =>
            quickExport("goals", "Goals", () =>
              data.goals.map((g) => ({
                Title: g.title,
                Type: g.goalType,
                TargetAmount: g.targetAmount,
                CurrentSaved: g.currentSaved,
                TargetDate: g.targetDate.slice(0, 10),
                Status: g.status,
              })),
            )
          }
          exporting={exporting === "goals"}
        />

        <ExportCard
          icon={<PiggyBank className="h-5 w-5" />}
          title="Investments"
          count={data.investments.length}
          onExport={() =>
            quickExport("investments", "Investments", () =>
              data.investments.map((i) => ({
                Name: i.name,
                Type: i.type,
                MonthlyTarget: i.monthlyTarget,
                TotalContributed: i.totalContributed,
                Start: i.startDate.slice(0, 10),
                Maturity: i.maturityDate?.slice(0, 10) ?? "",
                Status: i.status,
              })),
            )
          }
          exporting={exporting === "investments"}
        />

        <Card className="border-[hsl(var(--info))]/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-info">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{copy.backupTitle}</CardTitle>
                <CardDescription>{copy.backupHint}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 text-xs text-muted-foreground">
              Export every collection for this profile as a JSON file you can re-import
              later or on another device.
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={requestFullBackup}
              loading={exporting === "backup"}
            >
              <Download className="h-4 w-4" /> Download Backup
            </Button>
          </CardContent>
        </Card>
      </div>

      {data.exportHistory.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{copy.recent}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {data.exportHistory.slice(0, 10).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{e.fileName}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.scope} · {e.format} · {e.rowCount} rows
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(e.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Dialog open={backupPinOpen} onOpenChange={setBackupPinOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{copy.confirmTitle}</DialogTitle>
            <DialogDescription>
              Enter your PIN before exporting the full profile JSON. The file contains
              sensitive financial data for the current user only.
            </DialogDescription>
          </DialogHeader>
          <Field label="PIN">
            <Input
              type="password"
              value={backupPin}
              onChange={(e) => setBackupPin(e.target.value)}
              placeholder={copy.enterPin}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackupPinOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmFullBackup} disabled={!backupPin} loading={exporting === "backup"}>
              Confirm export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExportCard({
  icon,
  title,
  count,
  onExport,
  exporting,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  onExport: () => void;
  exporting: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2">
            {icon}
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{count} records</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button className="w-full" variant="outline" onClick={onExport} loading={exporting}>
          <FileText className="h-4 w-4" /> Export
        </Button>
      </CardContent>
    </Card>
  );
}
