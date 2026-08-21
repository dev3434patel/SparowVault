import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
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
import { useDataStore } from "@/store/dataStore";
import { useAuthStore } from "@/store/authStore";
import { auditRepo, transactionRepo } from "@/repositories";
import type { PaymentMode, Transaction, TransactionType } from "@/types";
import { useUIStore } from "@/store/uiStore";
import { Upload, FileUp, Database, AlertTriangle, Download } from "lucide-react";
import { exportModuleToSheet } from "@/exports/xlsxExporter";
import { apiRequest } from "@/lib/apiClient";
import { paiseToRupees, safeParseMoneyInput, transactionAmountPaise } from "@/utils/money";
import {
  buildImportPreview,
  buildDataRepairQueue,
  createImportBatchRecord,
  buildImportRollbackPlan,
  type ImportMapping,
  type ImportBatchRecord,
  type DataRepairQueue,
} from "@/services/importExportRepair";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";

type MappingKey =
  | "date"
  | "type"
  | "amount"
  | "category"
  | "account"
  | "card"
  | "loan"
  | "person"
  | "description"
  | "merchantOrPerson"
  | "paymentMode"
  | "businessOrPersonal"
  | "notes"
  | "taxFlag"
  | "gstFlag"
  | "billAvailable";

const TARGET_FIELDS: { key: MappingKey; label: string; required?: boolean }[] = [
  { key: "date", label: "Date", required: true },
  { key: "type", label: "Type", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "category", label: "Category" },
  { key: "account", label: "Account" },
  { key: "card", label: "Card" },
  { key: "loan", label: "Loan" },
  { key: "person", label: "Person" },
  { key: "description", label: "Description" },
  { key: "merchantOrPerson", label: "Merchant/Person" },
  { key: "paymentMode", label: "Payment Mode" },
  { key: "businessOrPersonal", label: "Business/Personal" },
  { key: "notes", label: "Notes" },
  { key: "taxFlag", label: "Tax Flag" },
  { key: "gstFlag", label: "GST Flag" },
  { key: "billAvailable", label: "Bill Available" },
];

export function ImportPage() {
  const user = useAuthStore((s) => s.currentUser);
  const categories = useDataStore((s) => s.categories);
  const accounts = useDataStore((s) => s.accounts);
  const cards = useDataStore((s) => s.cards);
  const loans = useDataStore((s) => s.loans);
  const udhari = useDataStore((s) => s.udhari);
  const transactions = useDataStore((s) => s.transactions);
  const goals = useDataStore((s) => s.goals);
  const investments = useDataStore((s) => s.investments);
  const ledgerEvents = useDataStore((s) => s.ledgerEvents);
  const ledgerEffects = useDataStore((s) => s.ledgerEffects);
  const upsertLocal = useDataStore((s) => s.upsertLocal);
  const removeLocal = useDataStore((s) => s.removeLocal);
  const refreshOne = useDataStore((s) => s.refreshOne);
  const toast = useUIStore((s) => s.toast);
  const fileInput = useRef<HTMLInputElement>(null);
  const restoreInput = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<MappingKey, string>>>({});
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "allow">("skip");
  const [importing, setImporting] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [lastImportBatch, setLastImportBatch] = useState<ImportBatchRecord | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const preview = rows.length > 0
    ? buildImportPreview(rows, mapping as ImportMapping, {
        existingTransactions: transactions,
        categories,
        accounts,
        cards,
        loans,
        udhari,
      })
    : null;
  const repairQueue = user
    ? buildDataRepairQueue({
        userId: user.id,
        transactions,
        events: ledgerEvents,
        effects: ledgerEffects,
        accounts,
        cards,
        loans,
        goals,
        investments,
        udhari,
        categories,
      })
    : null;

  async function handleFile(file: File) {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    const first = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(first, { defval: "" }) as Record<string, unknown>[];
    if (json.length === 0) {
      toast({ title: "Empty file", kind: "warning" });
      return;
    }
    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    setRows(json);
    const auto: Partial<Record<MappingKey, string>> = {};
    for (const tf of TARGET_FIELDS) {
      const hit = hdrs.find((h) =>
        h.toLowerCase().replace(/[^a-z]/g, "").includes(tf.key.toLowerCase()),
      );
      if (hit) auto[tf.key] = hit;
    }
    setMapping(auto);
  }

  function validRowCount() {
    if (!mapping.date || !mapping.type || !mapping.amount) return 0;
    return rows.filter((r) => {
      const amountPaise = safeParseMoneyInput(r[mapping.amount!] as string | number, {
        allowZero: false,
        allowRounding: false,
        throwOnInvalid: false,
      });
      return r[mapping.date!] && r[mapping.type!] && amountPaise > 0;
    }).length;
  }

  async function performImport() {
    if (!user) return;
    if (!mapping.date || !mapping.type || !mapping.amount) {
      toast({
        title: "Mapping incomplete",
        description: "Date, Type, and Amount are required",
        kind: "warning",
      });
      return;
    }
    setImporting(true);
    let imported = 0;
    let skipped = 0;
    const importBatchId = `imp_${Date.now().toString(36)}`;
    const importedRowIds: string[] = [];
    const prepared: Array<Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted" | "version">> = [];

    for (const r of rows) {
      const dateRaw = r[mapping.date!];
      const amtRaw = r[mapping.amount!];
      const typeRaw = String(r[mapping.type!] ?? "").toLowerCase();
      let amountPaise = 0;
      try {
        amountPaise = safeParseMoneyInput(amtRaw as string | number, {
          allowZero: false,
          allowRounding: false,
          field: "amount",
          throwOnInvalid: true,
        });
      } catch {
        skipped++;
        continue;
      }
      if (!dateRaw) {
        skipped++;
        continue;
      }
      const type = normalizeType(typeRaw);
      if (!type) {
        skipped++;
        continue;
      }
      const date = normalizeDate(String(dateRaw));
      if (!date) {
        skipped++;
        continue;
      }

      const catName = mapping.category ? String(r[mapping.category] ?? "") : "";
      const accName = mapping.account ? String(r[mapping.account] ?? "") : "";
      const cat = categories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase(),
      );
      const acc = accounts.find(
        (a) => a.name.toLowerCase() === accName.toLowerCase(),
      );

      const description = mapping.description ? String(r[mapping.description] ?? "") : "";
      const merchant = mapping.merchantOrPerson
        ? String(r[mapping.merchantOrPerson] ?? "")
        : "";
      const paymentMode = normalizePaymentMode(
        String(mapping.paymentMode ? r[mapping.paymentMode] ?? "" : "other"),
      );
      const notes = mapping.notes ? String(r[mapping.notes] ?? "") : "";

      if (duplicateMode === "skip") {
        const existing = useDataStore.getState().transactions.find(
          (t) =>
            t.date.slice(0, 10) === date.slice(0, 10) &&
            transactionAmountPaise(t) === amountPaise &&
            t.type === type &&
            t.merchantOrPerson === merchant,
        );
        if (existing) {
          skipped++;
          continue;
        }
      }

      prepared.push({
        date,
        type,
        amount: paiseToRupees(amountPaise),
        amountPaise,
        categoryId: cat?.id,
        accountId: acc?.id,
        paymentMode,
        merchantOrPerson: merchant,
        description,
        billAvailable: mapping.billAvailable && truthy(r[mapping.billAvailable!]) ? 1 : 0,
        gstApplicable: mapping.gstFlag && truthy(r[mapping.gstFlag!]) ? 1 : 0,
        taxFlag: mapping.taxFlag && truthy(r[mapping.taxFlag!]) ? 1 : 0,
        businessOrPersonal: "personal",
        needWant: "unassigned",
        fixedVariable: "unassigned",
        plannedUnplanned: "unassigned",
        importBatchId,
        notes,
        tags: [],
      } as unknown as Omit<Transaction, "id" | "userId" | "createdAt" | "updatedAt" | "isDeleted" | "version">);
    }

    try {
      if (prepared.length > 200) {
        const res = await apiRequest<{ imported: number; rejectedCount: number }>("/api/import/transactions.php", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ rows: prepared }),
        });
        imported = res.imported;
        skipped += res.rejectedCount;
        await refreshOne("transactions", user);
      } else {
        for (const row of prepared) {
          const created = await transactionRepo.create({
            userId: user.id,
            data: row as unknown as Transaction,
          });
          upsertLocal("transactions", created);
          importedRowIds.push(created.id);
          imported++;
        }
      }
      const audit = await auditRepo.create({
        userId: user.id,
        data: {
          action: "import",
          entity: "import_batch",
          entityId: importBatchId,
          detail: JSON.stringify({
            rowCount: rows.length,
            imported,
            skipped,
            duplicateMode,
          }),
        },
      });
      const batch = createImportBatchRecord({
        importBatchId,
        preview: preview ?? buildImportPreview([], {}, {
          existingTransactions: [],
          categories,
          accounts,
          cards,
          loans,
          udhari,
        }),
        importedRowIds,
        auditLogId: audit.id,
      });
      setLastImportBatch(batch);
      setRows([]);
      setHeaders([]);
      setMapping({});
      toast({
        title: "Import complete",
        description: `Imported ${imported}, skipped ${skipped}`,
        kind: imported > 0 ? "success" : "warning",
      });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Import failed",
        kind: "error",
      });
    } finally {
      setImporting(false);
    }
  }

  async function rollbackLastImport() {
    if (!user || !lastImportBatch || lastImportBatch.importedRowIds.length === 0) return;
    setRollingBack(true);
    try {
      const plan = buildImportRollbackPlan(lastImportBatch);
      for (const id of plan.transactionIdsToSoftDelete) {
        await transactionRepo.softDelete(id);
        removeLocal("transactions", id);
      }
      await auditRepo.create({
        userId: user.id,
        data: {
          action: "soft_delete",
          entity: "import_batch",
          entityId: lastImportBatch.importBatchId,
          detail: JSON.stringify(plan),
        },
      });
      toast({
        title: "Import rolled back",
        description: `${plan.transactionIdsToSoftDelete.length} imported transactions were soft-deleted.`,
        kind: "success",
      });
      setLastImportBatch(null);
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Rollback failed",
        kind: "error",
      });
    } finally {
      setRollingBack(false);
    }
  }

  function downloadTemplate() {
    exportModuleToSheet(
      "Transactions_Template",
      [
        {
          Date: "2026-04-01",
          Type: "expense",
          Amount: 1200,
          Category: "Groceries",
          Account: "HDFC Savings",
          Description: "Monthly groceries",
          MerchantOrPerson: "BigBasket",
          PaymentMode: "UPI",
          Notes: "",
          TaxFlag: "No",
          GSTFlag: "No",
          BillAvailable: "Yes",
        },
      ],
    );
  }

  async function handleRestoreFile(file: File) {
    if (!user) return;
    setPendingRestoreFile(file);
    setRestoreConfirmOpen(true);
  }

  async function confirmRestore() {
    if (!user || !pendingRestoreFile) return;
    const file = pendingRestoreFile;
    setRestoreConfirmOpen(false);
    setPendingRestoreFile(null);
    const text = await file.text();
    try {
      const payload = JSON.parse(text) as {
        version?: number;
        collections?: Record<string, unknown[]>;
      };
      if (!payload.collections) throw new Error("Invalid backup");
      let total = 0;
      let merged = 0;
      let skipped = 0;
      for (const [, arr] of Object.entries(payload.collections)) {
        if (!Array.isArray(arr)) continue;
        const repoMap: Record<string, (d: unknown) => Promise<unknown>> = {};
        // We'll just push into dataStore via generic repos below
        void repoMap;
        total += arr.length;
      }
      // Simpler restore: rehydrate top collections via direct repos
      const { collections } = payload;
      async function bulk<T extends { id: string; userId: string }>(
        arr: unknown[] | undefined,
        repoKey: string,
      ) {
        if (!arr) return;
        const {
          accountRepo,
          cardRepo,
          categoryRepo,
          transactionRepo: txr,
          budgetRepo,
          goalRepo,
          goalContribRepo,
          loanRepo,
          emiRepo,
          udhariRepo,
          udhariSettlementRepo,
          investmentRepo,
          savingsContribRepo,
          reminderRepo,
          recurringRepo,
        } = await import("@/repositories");
        const table: Record<string, { create: (i: { userId: string; data: T }) => Promise<T> }> = {
          accounts: accountRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          cards: cardRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          categories: categoryRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          transactions: txr as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          budgets: budgetRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          goals: goalRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          goalContribs: goalContribRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          loans: loanRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          emis: emiRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          udhari: udhariRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          udhariSettlements: udhariSettlementRepo as unknown as {
            create: (i: { userId: string; data: T }) => Promise<T>;
          },
          investments: investmentRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          savingsContribs: savingsContribRepo as unknown as {
            create: (i: { userId: string; data: T }) => Promise<T>;
          },
          reminders: reminderRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
          recurringRules: recurringRepo as unknown as { create: (i: { userId: string; data: T }) => Promise<T> },
        };
        const repo = table[repoKey];
        if (!repo) return;
        const existingRows =
          ((useDataStore.getState() as unknown as Record<string, unknown[]>)[repoKey] as
            | Record<string, unknown>[]
            | undefined) ?? [];
        const signatures = new Set(
          existingRows.map((row) => stableSignature(row)),
        );
        for (const item of arr as T[]) {
          const { id: _discardId, userId: _discardUid, ...rest } = item as T;
          void _discardId;
          void _discardUid;
          const sig = stableSignature(rest as Record<string, unknown>);
          if (signatures.has(sig)) {
            skipped++;
            continue;
          }
          const created = await repo.create({
            userId: user!.id,
            data: rest as unknown as T,
          });
          upsertLocal(repoKey as never, created as never);
          signatures.add(sig);
          merged++;
        }
      }
      for (const key of [
        "accounts",
        "cards",
        "categories",
        "transactions",
        "budgets",
        "goals",
        "goalContribs",
        "loans",
        "emis",
        "udhari",
        "udhariSettlements",
        "investments",
        "savingsContribs",
        "reminders",
        "recurringRules",
      ] as const) {
        await bulk(collections[key] as unknown[], key);
      }
      toast({
        title: "Backup restored",
        description: `${merged} merged, ${skipped} skipped (${total} in file)`,
        kind: merged > 0 ? "success" : "warning",
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Invalid backup file", kind: "error" });
    }
  }

  const valid = preview?.validRows ?? validRowCount();
  const invalid = preview?.invalidRows ?? rows.length - valid;

  return (
    <div>
      <PageHeader
        title="Import Center"
        description="Import CSV/XLSX, map fields, preview, and restore JSON backups."
        actions={
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Template
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Import transactions</CardTitle>
            <CardDescription>CSV or Excel · field mapping · duplicate detection</CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div
                className="cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-primary"
                onClick={() => fileInput.current?.click()}
              >
                <FileUp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <div className="font-medium">Drop file or click to browse</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Accepts .xlsx, .xls, .csv
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">{rows.length}</span> rows loaded ·{" "}
                    <Badge variant="success">{valid} valid</Badge>{" "}
                    {invalid > 0 ? (
                      <Badge variant="warning">{invalid} need mapping</Badge>
                    ) : null}
                    {preview?.duplicateCandidates ? (
                      <Badge variant="outline">
                        {preview.duplicateCandidates} duplicate candidate(s)
                      </Badge>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRows([]);
                      setHeaders([]);
                      setMapping({});
                    }}
                  >
                    Reset
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {TARGET_FIELDS.map((tf) => (
                    <Field
                      key={tf.key}
                      label={tf.label + (tf.required ? " *" : "")}
                    >
                      <Select
                        value={mapping[tf.key] ?? "none"}
                        onValueChange={(v) =>
                          setMapping({
                            ...mapping,
                            [tf.key]: v === "none" ? undefined : v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="— not mapped —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— not mapped —</SelectItem>
                          {headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  ))}
                </div>
                {preview ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface-1 p-3 text-sm md:grid-cols-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Income estimate</div>
                      <div className="font-semibold">₹{paiseToRupees(preview.estimatedIncomePaise).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Expense estimate</div>
                      <div className="font-semibold">₹{paiseToRupees(preview.estimatedExpensePaise).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Card liability change</div>
                      <div className="font-semibold">₹{paiseToRupees(preview.estimatedCardLiabilityChangePaise).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Cashflow effect</div>
                      <div className="font-semibold">₹{paiseToRupees(preview.estimatedCashflowEffectPaise).toFixed(2)}</div>
                    </div>
                    {[
                      ["accounts", preview.missingAccounts],
                      ["categories", preview.missingCategories],
                      ["cards", preview.missingCards],
                      ["loans", preview.missingLoans],
                      ["people", preview.missingPeople],
                    ].some(([, values]) => (values as string[]).length > 0) ? (
                      <div className="col-span-2 rounded-md bg-warning-soft p-2 text-xs text-warning md:col-span-4">
                        {[
                          ["accounts", preview.missingAccounts],
                          ["categories", preview.missingCategories],
                          ["cards", preview.missingCards],
                          ["loans", preview.missingLoans],
                          ["people", preview.missingPeople],
                        ]
                          .filter(([, values]) => (values as string[]).length > 0)
                          .map(([label, values]) => `${label}: ${(values as string[]).join(", ")}`)
                          .join(" | ")}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Field label="Duplicates">
                    <Select
                      value={duplicateMode}
                      onValueChange={(v) => setDuplicateMode(v as "skip" | "allow")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip matching rows</SelectItem>
                        <SelectItem value="allow">Allow all</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex-1" />
                  <Button
                    onClick={performImport}
                    loading={importing}
                    disabled={valid === 0}
                  >
                    <Upload className="h-4 w-4" /> Import {valid} rows
                  </Button>
                </div>

                <div className="mt-4 max-h-[360px] overflow-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={h}>{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 25).map((r, i) => (
                        <TableRow key={i}>
                          {headers.map((h) => (
                            <TableCell key={h} className="text-xs">
                              {String(r[h] ?? "")}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {rows.length > 25 ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Showing first 25 rows of {rows.length}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-goal-soft text-goal">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Restore backup</CardTitle>
                <CardDescription>Merge a JSON backup into this profile</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-lg bg-warning-soft p-3 text-xs text-warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Records will be added to this profile. Existing data is preserved.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => restoreInput.current?.click()}
            >
              <Upload className="h-4 w-4" /> Select backup file
            </Button>
            <input
              ref={restoreInput}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleRestoreFile(f);
              }}
            />
          </CardContent>
        </Card>

        {rows.length === 0 ? (
          <Card className="lg:col-span-3">
            <CardContent>
              <EmptyState
                title="Ready to import"
                description="Download a template, fill in transactions, and upload back."
                action={
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4" /> Download template
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : null}

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Repair Center</CardTitle>
            <CardDescription>
              Queues that can break reports, ledger accuracy, or future imports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastImportBatch?.importedRowIds.length ? (
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  Last import batch <span className="font-mono">{lastImportBatch.importBatchId}</span>{" "}
                  created {lastImportBatch.importedRowIds.length} transaction(s).
                </div>
                <Button variant="outline" size="sm" loading={rollingBack} onClick={rollbackLastImport}>
                  Rollback last import
                </Button>
              </div>
            ) : null}
            {repairQueue ? <RepairQueueGrid repairQueue={repairQueue} /> : null}
          </CardContent>
        </Card>
      </div>
      <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Confirm backup restore</DialogTitle>
            <DialogDescription>
              Restore will merge backup records into this profile. Existing data is preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRestoreConfirmOpen(false);
                setPendingRestoreFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmRestore}>Continue restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RepairQueueGrid({ repairQueue }: { repairQueue: DataRepairQueue }) {
  const items = [
    {
      label: "Transactions without ledger event",
      count: repairQueue.transactionsWithoutLedgerEvent.length,
      hint: "Needs ledger rebuild or transaction repair.",
    },
    {
      label: "Credit-card transactions without card",
      count: repairQueue.creditCardTransactionsWithoutCard.length,
      hint: "Card purchase/payment cannot update card liability correctly.",
    },
    {
      label: "EMI transactions without loan",
      count: repairQueue.emiTransactionsWithoutLoan.length,
      hint: "EMI principal and interest split cannot be trusted.",
    },
    {
      label: "Udhari entries without person",
      count: repairQueue.udhariEntriesWithoutPerson.length,
      hint: "Receivable/payable ledger is missing person link.",
    },
    {
      label: "Categories missing color",
      count: repairQueue.categoriesMissingColor.length,
      hint: "Dashboard charts may show duplicate or fallback colors.",
    },
    {
      label: "Duplicate categories",
      count: repairQueue.duplicateCategories.length,
      hint: "Imports may map rows to the wrong category.",
    },
    {
      label: "Legacy amount without amountPaise",
      count: repairQueue.legacyAmountWithoutAmountPaise.length,
      hint: "Money should be normalized before CA exports.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-surface-1 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">{item.label}</div>
            <Badge variant={item.count > 0 ? "warning" : "success"}>{item.count}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>
        </div>
      ))}
    </div>
  );
}

function truthy(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v).toLowerCase().trim();
  return ["y", "yes", "1", "true"].includes(s);
}

function normalizeType(raw: string): TransactionType | null {
  const s = raw.toLowerCase().trim();
  const map: Record<string, TransactionType> = {
    income: "income",
    expense: "expense",
    transfer: "transfer",
    emi: "emi_payment",
    "emi payment": "emi_payment",
    "credit card": "cc_payment",
    "cc payment": "cc_payment",
    udhari: "udhari_given",
    "udhari given": "udhari_given",
    "udhari received": "udhari_received",
    savings: "savings_contribution",
    investment: "investment_contribution",
    refund: "refund",
    adjustment: "adjustment",
  };
  return map[s] ?? null;
}

function normalizeDate(raw: string): string | null {
  // Accept ISO, dd/mm/yyyy, mm/dd/yyyy
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(raw).toISOString();
  const parts = raw.split(/[/\-.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) {
      return new Date(`${a}-${b}-${c}`).toISOString();
    }
    // assume dd/mm/yyyy (Indian default)
    return new Date(`${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`).toISOString();
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizePaymentMode(raw: string): PaymentMode {
  const s = raw.toLowerCase().trim();
  if (s.includes("upi")) return "upi";
  if (s.includes("cash")) return "cash";
  if (s.includes("cheque")) return "cheque";
  if (s.includes("credit")) return "credit_card";
  if (s.includes("debit")) return "debit_card";
  if (s.includes("bank") || s.includes("transfer") || s.includes("neft") || s.includes("imps"))
    return "bank_transfer";
  if (s.includes("wallet")) return "wallet";
  if (s.includes("auto")) return "auto_debit";
  return "other";
}

function stableSignature(obj: Record<string, unknown>): string {
  const metaKeys = new Set(["id", "userId", "createdAt", "updatedAt", "version", "isDeleted"]);
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (metaKeys.has(k)) continue;
    cleaned[k] = v;
  }
  return JSON.stringify(sortForSignature(cleaned));
}

function sortForSignature(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForSignature);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortForSignature(v)]));
  }
  return value;
}
