import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { companyApi } from "@/company/api/client";
import { useCompanyStore } from "@/company/store/companyStore";
import { invoiceThenReceipt, movingAverageSale, payrollAccrual } from "@/company/finance/playbookGoldens";
import { useHasPermission } from "@/company/components/PermissionGate";
import { useI18n } from "@/company/i18n/react";

export function ModulesPage() {
  const { t } = useI18n();
  const companyId = useCompanyStore((s) => s.activeCompanyId);
  const [note, setNote] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [bridgeState, setBridgeState] = useState("proposed");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [gstState, setGstState] = useState("draft");
  const [busy, setBusy] = useState(false);
  const canExport = useHasPermission("export_reports");
  const canLedgers = useHasPermission("manage_ledgers");
  const canJournal = useHasPermission("create_journal");
  const canCashBook = useHasPermission("view_cash_bank_books");
  const canCompany = useHasPermission("manage_company");

  useEffect(() => {
    if (!companyId) return;
    let stop = false;
    void companyApi.listCompanyItems(companyId).then((data) => {
      if (stop) return;
      const stockItem = (data.items ?? []).find((item) => item.kind === "STOCK" && item.id);
      if (stockItem?.id) setItemId(stockItem.id);
    }).catch(() => {
      /* A missing item list leaves buy and sell disabled until a new item is saved. */
    });
    return () => {
      stop = true;
    };
  }, [companyId]);
  const invoice = invoiceThenReceipt({ taxablePaise: 1_000_000, taxPaise: 180_000, receiptPaise: 500_000 });
  const stock = movingAverageSale({ buyQty: 10, buyRatePaise: 10_000, sellQty: 4, sellRatePaise: 15_000 });
  const payroll = payrollAccrual({
    grossPaise: 3_000_000,
    employeePfPaise: 300_000,
    otherDeductionPaise: 100_000,
    employerPfPaise: 180_000,
  });

  async function run(label: string, action: () => Promise<unknown>) {
    if (!companyId) {
      setNote(t("modules.needCompany"));
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const result = await action();
      const created = result as {
        item?: { id?: string; qty?: number; value?: number; cogs?: number };
        state?: string;
        id?: string;
        storageKey?: string;
      };
      if (typeof created?.state === "string") setBridgeState(created.state);
      if ("statusPersisted" in (created ?? {}) && (created as { statusPersisted?: boolean }).statusPersisted === false) {
        setNote(t("modules.savedMigration", { label }));
        return result;
      }
      const gst = (created as { gst?: { state?: string; filed?: boolean; irn?: string | null } } | null)?.gst;
      if (gst?.state) {
        setGstState(gst.state);
        setNote(t("modules.gstNote", { state: gst.state }));
        return result;
      }
      const match = (created as { match?: { cashPostedAgain?: number } } | null)?.match;
      if (match && match.cashPostedAgain === 0) {
        setNote(t("modules.chequeSaved"));
        return result;
      }
      if (typeof created?.storageKey === "string" && created.id) setDocumentId(created.id);
      if (created?.item?.id) setItemId(created.item.id);
      if (typeof created?.item?.qty === "number") {
        setNote(t("modules.stockSaved", { label, qty: created.item.qty, value: created.item.value ?? "", cogs: created.item.cogs ?? "" }));
        return result;
      }
      setNote(t("modules.sent", { label }));
      return result;
    } catch (error) {
      setNote(error instanceof Error ? error.message : t("modules.failed", { label }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{t("modules.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("modules.intro")}</p>
      {note ? <p className="text-sm">{note}</p> : null}
      <Card>
        <CardHeader><CardTitle>{t("modules.invoiceTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {t("modules.invoiceBody", {
              receivable: invoice.receivablePaise / 100,
              open: invoice.openReceivablePaise / 100,
              revenue: invoice.revenuePaise / 100,
            })}
          </p>
          <p>{t("modules.gstExportNote", { state: gstState })}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !canExport || gstState !== "draft"} onClick={() => void run(t("modules.labelGstValidate"), () => companyApi.advanceGst(companyId ?? "", "draft", "validate"))}>
              {t("modules.validateGst")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !canExport || gstState !== "validated"} onClick={() => void run(t("modules.labelGstExport"), () => companyApi.advanceGst(companyId ?? "", "validated", "export"))}>
              {t("modules.exportGst")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("modules.stockTitle")}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{t("modules.stockBody", { qty: stock.qtyLeft, value: stock.stockValuePaise / 100, cogs: stock.cogsPaise / 100 })}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !canLedgers} onClick={() => void run(t("modules.labelStock"), () => companyApi.saveCompanyItem(companyId ?? "", { action: "create", name: "Widget", kind: "STOCK" }))}>
              {t("modules.createStock")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !canLedgers} onClick={() => void run(t("modules.labelNonStock"), () => companyApi.saveCompanyItem(companyId ?? "", { action: "create", name: "Stationery", kind: "NON_STOCK" }))}>
              {t("modules.createNonStock")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !canLedgers} onClick={() => void run(t("modules.labelService"), () => companyApi.saveCompanyItem(companyId ?? "", { action: "create", name: "Consulting", kind: "SERVICE" }))}>
              {t("modules.createService")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !canLedgers || !itemId} onClick={() => void run(t("modules.labelBuy"), () => companyApi.saveCompanyItem(companyId ?? "", { action: "buy", itemId, qty: 10, unit: 100 }))}>
              {t("modules.buy")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy || !canLedgers || !itemId} onClick={() => void run(t("modules.labelSell"), () => companyApi.saveCompanyItem(companyId ?? "", { action: "sell", itemId, qty: 4, unit: 150 }))}>
              {t("modules.sell")}
            </Button>
          </div>
          <p>{t("modules.payrollBody", { expense: payroll.expensePaise / 100, net: payroll.netPayablePaise / 100 })}</p>
          <Button size="sm" disabled={busy} onClick={() => void run(t("modules.labelPayroll"), () => companyApi.payrollPreview(companyId ?? ""))}>
            {t("modules.preview")}
          </Button>
          <Button size="sm" variant="outline" disabled={busy || !canJournal} onClick={() => void run(t("modules.labelApprove"), () => companyApi.payrollPreview(companyId ?? "", "approve"))}>
            {t("modules.approve")}
          </Button>
          <Button size="sm" variant="outline" disabled={busy || !canJournal} onClick={() => void run(t("modules.labelAccrue"), () => companyApi.payrollPreview(companyId ?? "", "accrue"))}>
            {t("modules.accrue")}
          </Button>
          <Button size="sm" variant="outline" disabled={busy || !canJournal} onClick={() => void run(t("modules.labelPay"), () => companyApi.payrollPreview(companyId ?? "", "pay"))}>
            {t("modules.pay")}
          </Button>
          <p className="text-muted-foreground">{t("modules.payrollNote")}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("modules.bridgeTitle")}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !canJournal}
            onClick={() =>
              void run(t("modules.labelBridge"), () =>
                companyApi.saveBridge(companyId ?? "", {
                  amountPaise: 100000,
                  personalEntityId: "local-receivable",
                  state: "proposed",
                  event: "post_company",
                }),
              )
            }
          >
            {t("modules.recordBridge")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !canJournal}
            onClick={() =>
              void run(t("modules.labelBridgeRetry"), () =>
                companyApi.saveBridge(companyId ?? "", {
                  amountPaise: 100000,
                  personalEntityId: "local-receivable",
                  state: "retry",
                  event: "post_company",
                }),
              )
            }
          >
            {t("modules.retryBridge")}
          </Button>
          <p className="w-full text-sm text-muted-foreground">{t("modules.bridgeState", { state: bridgeState })}</p>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !canCashBook}
            onClick={() =>
              void run(t("modules.labelCheque"), async () => {
                const vouchers = await companyApi.listVouchers(companyId ?? "");
                const posted = vouchers.find((voucher) => voucher.status === "POSTED" && voucher.id);
                if (!posted) throw new Error(t("modules.needPosted"));
                return companyApi.matchCheque(companyId ?? "", {
                  voucherId: posted.id,
                  postedCashPaise: 0,
                  feePaise: 0,
                });
              })
            }
          >
            {t("modules.matchCheque")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(t("modules.labelGroups"), async () => {
                const groups = await companyApi.listCompanyGroups(companyId ?? "");
                if (groups.statutoryConsolidation) {
                  throw new Error(t("modules.groupMustManage"));
                }
                return groups;
              })
            }
          >
            {t("modules.groupTotals")}
          </Button>
          <Button size="sm" disabled={busy || !canCompany} onClick={() => void run(t("modules.labelBilling"), () => companyApi.saveOrgSubscriptionFixture(companyId ?? ""))}>
            {t("modules.saveBilling")}
          </Button>
          <Button
            size="sm"
            disabled={busy || !canCompany}
            onClick={() =>
              void run(t("modules.labelDocument"), () =>
                companyApi.saveCompanyDocument(companyId ?? "", {
                  fileName: "note.txt",
                  contentBase64: btoa("local attachment"),
                  mimeType: "text/plain",
                }),
              )
            }
          >
            {t("modules.saveDocument")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !documentId}
            onClick={() =>
              void run(t("modules.labelDownload"), async () => {
                const blob = await companyApi.downloadCompanyDocument(companyId ?? "", documentId ?? "");
                if (blob.size < 1) throw new Error(t("modules.missingFile"));
                return { downloaded: true };
              })
            }
          >
            {t("modules.download")}
          </Button>
          <Button
            size="sm"
            disabled={busy || !canJournal}
            onClick={() =>
              void run(t("modules.labelRecurring"), () =>
                companyApi.saveCompanyRecurring(companyId ?? "", {
                  name: "Rent draft",
                  cadence: "MONTHLY",
                  voucherType: "JOURNAL",
                  nextRunDate: new Date().toISOString().slice(0, 10),
                  template: { lines: [] },
                }),
              )
            }
          >
            {t("modules.recurring")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
