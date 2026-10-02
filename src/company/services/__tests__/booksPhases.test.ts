import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import reportRegistry from "../../../../config/company-report-registry.json";
import localBillingFixture from "../__fixtures__/companyOrgSubscription.webhook.json";
import {
  applyWeightedAverage,
  backupScopeOk,
  backupUsesServerDump,
  bridgeTransition,
  chequeMatchEffect,
  consumeInviteToken,
  customerCollection,
  documentDownloadStatus,
  documentHostingStatus,
  documentKeyOutsidePublicWeb,
  documentRelativeKey,
  groupManagementTotals,
  gstWorkbench,
  invoiceThenSettlement,
  normalizePartyType,
  orgSubscriptionFromFixture,
  ownerCountAfterRoleChange,
  payrollPayment,
  payrollPreview,
  recurringRunDecision,
  recurringTemplateDraft,
  reimbursementPlan,
  splitCostAllocation,
  stockState,
  stripBackupSecrets,
} from "@/company/services/booksPhases";

describe("company book phases", () => {
  it("keeps one owner when a role change would remove the last one", () => {
    const members = [{ id: "m1", roles: ["OWNER"] }];
    expect(ownerCountAfterRoleChange(members, "m1", "ACCOUNTANT")).toBe(0);
    expect(ownerCountAfterRoleChange([], "m2", "OWNER")).toBe(1);
    expect(ownerCountAfterRoleChange(members, "m1", "OWNER")).toBe(1);
    expect(
      ownerCountAfterRoleChange(
        [
          { id: "m1", roles: ["OWNER"] },
          { id: "m2", roles: ["OWNER"] },
        ],
        "m1",
        "VIEWER",
      ),
    ).toBe(1);
  });

  it("hashes invite tokens as one-use and does not accept a second consume", () => {
    const token = "plain-token-once";
    const tokenHash = createHash("sha256").update(token).digest("hex");
    expect(tokenHash).not.toBe(token);
    const first = consumeInviteToken({ tokenHash, usedAt: null }, tokenHash);
    expect(first.ok).toBe(true);
    const second = consumeInviteToken({ tokenHash, usedAt: "2026-09-30T00:00:00Z" }, tokenHash);
    expect(second).toEqual({ ok: false, error: "TOKEN_USED" });
  });

  it("distinguishes a person from an organization", () => {
    expect(normalizePartyType("person")).toBe("PERSON");
    expect(normalizePartyType("organization")).toBe("ORGANIZATION");
    expect(normalizePartyType("BUSINESS")).toBe("ORGANIZATION");
  });

  it("splits 10000 into 6000 and 4000 without doubling the voucher total", () => {
    const split = splitCostAllocation(10000, [6000, 4000]);
    expect(split.allocated).toBe(10000);
    expect(split.voucherTotal).toBe(10000);
    expect(split.voucherTotal).not.toBe(20000);
  });

  it("stores document keys outside the public web root and 404s a missing file", () => {
    const key = documentRelativeKey("company_1", "doc_1");
    expect(documentKeyOutsidePublicWeb(key)).toBe(true);
    expect(documentKeyOutsidePublicWeb("public/uploads/doc_1")).toBe(false);
    expect(documentDownloadStatus(true, true, false)).toBe(404);
    expect(documentHostingStatus(262145)).toBe("BLOCKED_EXTERNAL");
  });

  it("invoice 10000 + tax 1800 => receivable 11800; receipt 5000 leaves 6800 and does not change revenue", () => {
    const effect = invoiceThenSettlement("sale", 10000, 1800, 5000);
    expect(effect.receivableOrPayable).toBe(11800);
    expect(effect.outstanding).toBe(6800);
    expect(effect.revenue).toBe(10000);
    expect(effect.revenueAfterSettlement).toBe(10000);
    expect(effect.settlementIsSeparateVoucher).toBe(true);
    expect(effect.hypotheticalTax).toBe(true);
  });

  it("does not post cash again when a posted cheque is matched", () => {
    const match = chequeMatchEffect(25000, 150);
    expect(match.cashPostedAgain).toBe(0);
    expect(match.postedCash).toBe(25000);
    expect(match.feeIsExplicitVoucher).toBe(true);
    expect(match.feeVoucherAmount).toBe(150);
  });

  it("enables the six management reports with real handlers", () => {
    const keys = [
      "receipts-payments",
      "project-report",
      "business-report",
      "area-report",
      "category-report",
      "user-activity",
    ];
    for (const key of keys) {
      const row = reportRegistry.reports.find((report) => report.key === key);
      expect(row?.enabled).toBe(true);
      expect(row && "handler" in row && row.handler).toBeTruthy();
    }
  });

  it("keeps recurring output as a draft and refuses a second run or a locked date", () => {
    expect(recurringTemplateDraft({ voucherType: "JOURNAL" }).status).toBe("DRAFT");
    expect(recurringTemplateDraft({}).bankPaymentOnDueDate).toBe(false);
    expect(recurringRunDecision("2026-09-01", null, false).bankPayment).toBe(false);
    expect(recurringRunDecision("2026-09-01", null, true).reason).toBe("IDEMPOTENT");
    expect(recurringRunDecision("2026-09-01", "2026-10-01", false).reason).toBe("PERIOD_LOCKED");
  });

  it("scopes a backup to one company and drops secrets", () => {
    expect(backupUsesServerDump()).toBe(false);
    expect(stripBackupSecrets({ display_name: "Acme", pin: "1234", password_hash: "x" })).toEqual({
      display_name: "Acme",
    });
    expect(backupScopeOk([{ company_id: "c1" }, { company_id: "c2" }], "c1")).toBe(false);
    expect(backupScopeOk([{ company_id: "c1" }], "c1")).toBe(true);
  });

  it("buy 10 at 100, sell 4 at 150 => qty 6, value 600, COGS 400", () => {
    const bought = applyWeightedAverage(stockState(), "buy", 10, 100);
    const sold = applyWeightedAverage(bought, "sell", 4, 150);
    expect(sold.qty).toBe(6);
    expect(sold.value).toBe(600);
    expect(sold.cogs).toBe(400);
    expect(sold.stockLedger).toBe("STOCK");
    const collected = customerCollection(sold, 600);
    expect(collected.revenue).toBe(sold.revenue);
    expect(collected.cogs).toBe(sold.cogs);
    expect(collected.collection.repeatsRevenue).toBe(false);
    expect(collected.collection.repeatsCogs).toBe(false);
  });

  it("exports GST without filing or inventing an IRN", () => {
    const validated = gstWorkbench("draft", "validate");
    const exported = gstWorkbench(validated.state, "export");
    expect(exported).toEqual({ state: "exported", filed: false, irn: null });
    expect(() => gstWorkbench("exported", "file")).toThrow(/not filed/);
  });

  it("previews synthetic gross 30000 as expense 31800 and net payable 26000", () => {
    const preview = payrollPreview(30000);
    expect(preview.employeeDeductions).toBe(4000);
    expect(preview.employer).toBe(1800);
    expect(preview.expense).toBe(31800);
    expect(preview.netPayable).toBe(26000);
    expect(preview.rates).toBe("unverified");
    const payment = payrollPayment(preview);
    expect(payment.repeatsSalaryExpense).toBe(false);
    expect(payment.lines.map((line) => line.amount)).toEqual([26000, 26000]);
    expect(payment.expenseUnchanged).toBe(31800);
    expect(() => payrollPreview(28000)).toThrow(/unverified/);
  });

  it("moves a reimbursement across bridge states without one shared transaction", () => {
    expect(bridgeTransition("proposed", "post_company")).toBe("company_posted");
    expect(bridgeTransition("company_posted", "apply_personal")).toBe("personal_applied");
    expect(bridgeTransition("personal_applied", "complete")).toBe("completed");
    expect(bridgeTransition("company_posted", "fail")).toBe("retry");
    const plan = reimbursementPlan(5000);
    expect(plan.companyPayable).toBe(5000);
    expect(plan.personalReceivable).toBe(5000);
    expect(plan.singleDatabaseTransaction).toBe(false);
  });

  it("applies a local company subscription fixture and rejects live delivery", () => {
    const raw = JSON.parse(readFileSync(new URL("../__fixtures__/companyOrgSubscription.webhook.json", import.meta.url), "utf8"));
    expect(raw).toEqual(localBillingFixture);
    const applied = orgSubscriptionFromFixture(localBillingFixture);
    expect(applied.subject).toBe("company_org_subscriptions");
    expect(applied.personalSubscriptionUntouched).toBe(true);
    expect(() => orgSubscriptionFromFixture({ ...localBillingFixture, source: "razorpay" })).toThrow(/untested/);
  });

  it("sums management totals and eliminates only a matched pair", () => {
    const companies = [
      { companyId: "a", total: 100 },
      { companyId: "b", total: 40 },
    ];
    expect(groupManagementTotals(companies, []).managementTotal).toBe(140);
    const matched = groupManagementTotals(companies, [{ fromCompanyId: "a", toCompanyId: "b", amount: 15 }]);
    expect(matched.managementTotal).toBe(125);
    expect(matched.statutoryConsolidation).toBe(false);
    expect(matched.automaticElimination).toBe(false);
  });
});
