import * as XLSX from "xlsx";
import type {
  Account,
  Budget,
  Card,
  Category,
  EMIPayment,
  Goal,
  GoalContribution,
  Investment,
  Loan,
  SavingsContribution,
  Transaction,
  UdhariRecord,
  FinancialEvent,
  FinancialEffect,
} from "@/types";
import { formatPaymentMode, formatTxType } from "@/lib/format";
import {
  amortizationSchedule,
  summarizeCardHealth,
  summarizeLoan,
  sumExpense,
  expenseAmountPaise,
  expenseReportTransactions,
  sumIncome,
} from "@/services/calculations";
import {
  formatMoney,
  transactionAmountPaise,
  udhariAmountPaise,
  udhariSettledPaise,
  paiseToRupees,
  investmentTotalContributedPaise,
  investmentMonthlyPaise,
  rupeesToPaise,
} from "@/utils/money";
import {
  buildReportFooter,
  reportCategoryLedger,
  reportMonthlyCashflow,
  reportAccountReconciliation,
  type ReportContext,
} from "@/services/caReports";

// Nice Indian accountant-friendly column order used across exports
export function mapTransactionRow(
  t: Transaction,
  ctx: {
    categories: Category[];
    accounts: Account[];
    cards: Card[];
  },
) {
  const cat = ctx.categories.find((c) => c.id === t.categoryId);
  const acc = ctx.accounts.find((a) => a.id === t.accountId);
  const card = ctx.cards.find((c) => c.id === t.linkedCardId);
  return {
    Date: t.date.slice(0, 10),
    VoucherRefId: t.id,
    Type: formatTxType(t.type),
    Category: cat?.name ?? "",
    Subcategory: "",
    Description: t.description,
    MerchantOrPerson: t.merchantOrPerson,
    Amount: formatMoney(transactionAmountPaise(t)),
    PaymentMode: formatPaymentMode(t.paymentMode),
    Account: acc?.name ?? "",
    Card: card?.nickname ?? "",
    TaxFlag: t.taxFlag ? "Yes" : "No",
    GSTFlag: t.gstApplicable ? "Yes" : "No",
    BillAvailable: t.billAvailable ? "Yes" : "No",
    RecurringFlag: t.recurringRuleId ? "Yes" : "No",
    BusinessOrPersonal: t.businessOrPersonal,
    LinkedModuleRef:
      t.linkedLoanId ||
      t.linkedCardId ||
      t.linkedGoalId ||
      t.linkedUdhariId ||
      t.linkedSavingsId ||
      "",
    Notes: t.notes,
    Tags: (t.tags ?? []).join(", "),
  };
}

function autoWidth<T extends object>(rows: T[]): XLSX.ColInfo[] {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((k) => {
    const max = Math.max(
      k.length,
      ...rows.map((r) => String((r as Record<string, unknown>)[k] ?? "").length),
    );
    return { wch: Math.min(40, Math.max(10, max + 2)) };
  });
}

function addSheet<T extends object>(wb: XLSX.WorkBook, name: string, rows: T[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoWidth(rows);
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

interface ExportContext {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  budgets: Budget[];
  goals: Goal[];
  goalContribs: GoalContribution[];
  loans: Loan[];
  emis: EMIPayment[];
  udhari: UdhariRecord[];
  investments: Investment[];
  savingsContribs: SavingsContribution[];
  events?: FinancialEvent[];
  effects?: FinancialEffect[];
  userId?: string;
  reportPeriod?: string;
  appVersion?: string;
}

export function buildCAWorkbook(ctx: ExportContext, label = "SparowVault_CA_Export") {
  const wb = XLSX.utils.book_new();
  const reportCtx: ReportContext = {
    txs: ctx.transactions,
    events: ctx.events ?? [],
    effects: ctx.effects ?? [],
    accounts: ctx.accounts,
    cards: ctx.cards,
    loans: ctx.loans,
    emis: ctx.emis,
    goals: ctx.goals,
    udharis: ctx.udhari,
    categories: ctx.categories,
  };

  // Transactions_Master
  const masterRows = ctx.transactions.map((t) => mapTransactionRow(t, ctx));
  addSheet(wb, "Transactions_Master", masterRows);

  // Monthly summaries
  const cashflowRows = reportMonthlyCashflow(reportCtx);
  addSheet(
    wb,
    "Income_Summary_Monthly",
    cashflowRows.map((row) => ({ Month: row.yyyymm, Income: paiseToRupees(row.inflowsPaise) })),
  );
  addSheet(
    wb,
    "Expense_Summary_Monthly",
    cashflowRows.map((row) => ({
      Month: row.yyyymm,
      Expense: paiseToRupees(row.outflowsPaise),
      Net: paiseToRupees(row.netPaise),
    })),
  );

  // By Category
  const categoryLedgerRows = reportCategoryLedger(reportCtx);
  addSheet(
    wb,
    "Expense_By_Category",
    categoryLedgerRows.map((row) => ({
      Category: row.categoryName,
      Amount: paiseToRupees(row.totalExpensePaise),
      TxCount: row.txCount,
    })),
  );

  // Subcategory (same as category for now)
  addSheet(wb, "Expense_By_Subcategory", [
    { Note: "Subcategories are mapped under Category in current version." },
  ]);

  // By Payment Mode
  const byMode = new Map<string, number>();
  for (const t of expenseReportTransactions(ctx.transactions)) {
    const m = formatPaymentMode(t.paymentMode);
    byMode.set(m, (byMode.get(m) ?? 0) + expenseAmountPaise(t));
  }
  addSheet(
    wb,
    "Expense_By_Payment_Mode",
    Array.from(byMode.entries()).map(([PaymentMode, ap]) => ({
      PaymentMode,
      Amount: paiseToRupees(ap),
    })),
  );

  // Loan EMI register
  const loanRows = ctx.loans.map((l) => {
    const s = summarizeLoan(
      l,
      ctx.emis.filter((e) => e.loanId === l.id),
    );
    return {
      Lender: l.lender,
      Type: l.loanType,
      Principal: l.principal,
      Rate: l.annualInterestRate,
      TenureMonths: l.tenureMonths,
      EMI: paiseToRupees(s.emiPaise),
      Outstanding: paiseToRupees(s.outstandingPrincipalPaise),
      TotalInterest: paiseToRupees(s.totalInterestPaise),
      StartDate: l.startDate.slice(0, 10),
      Status: l.status,
    };
  });
  addSheet(wb, "Loan_EMI_Register", loanRows);

  // Credit cards register
  const cardRows = ctx.cards
    .filter((c) => c.type === "credit")
    .map((c) => {
      const h = summarizeCardHealth(c, ctx.transactions);
      return {
        Bank: c.bank,
        Card: c.nickname,
        Last4: c.last4,
        Limit: c.creditLimit ?? 0,
        Outstanding: Math.round(paiseToRupees(h.outstandingBalancePaise)),
        UtilizationPct: Math.round(h.utilization),
        StatementDay: c.statementDay ?? "",
        DueDay: c.dueDay ?? "",
        NextDue: h.nextDueDate ? h.nextDueDate.slice(0, 10) : "",
      };
    });
  addSheet(wb, "Credit_Card_Register", cardRows);

  // Udhari
  addSheet(
    wb,
    "Udhari_Register",
    ctx.udhari.map((u) => ({
      Person: u.personName,
      Phone: u.phone ?? "",
      Type: u.type,
      Amount: paiseToRupees(udhariAmountPaise(u)),
      Settled: paiseToRupees(udhariSettledPaise(u)),
      Remaining: paiseToRupees(udhariAmountPaise(u) - udhariSettledPaise(u)),
      Context: u.context,
      GivenDate: u.givenDate.slice(0, 10),
      DueDate: u.dueDate ? u.dueDate.slice(0, 10) : "",
      Status: u.status,
      Notes: u.notes,
    })),
  );

  // Savings & investments
  addSheet(
    wb,
    "Savings_Investments_Register",
    ctx.investments.map((i) => ({
      Name: i.name,
      Type: i.type,
      Frequency: i.frequency,
      StartDate: i.startDate.slice(0, 10),
      MonthlyTarget: paiseToRupees(investmentMonthlyPaise(i)),
      TotalContributed: paiseToRupees(investmentTotalContributedPaise(i)),
      Maturity: i.maturityDate ? i.maturityDate.slice(0, 10) : "",
      ExpectedReturnPct: i.expectedReturnRate ?? "",
      Status: i.status,
    })),
  );

  // Goal contribution register
  addSheet(
    wb,
    "Goal_Contribution_Register",
    ctx.goalContribs.map((g) => {
      const goal = ctx.goals.find((x) => x.id === g.goalId);
      return {
        Goal: goal?.title ?? "",
        Date: g.date.slice(0, 10),
        Amount: formatMoney(g.amountPaise ?? rupeesToPaise(g.amount)),
      };
    }),
  );

  // Annual summary
  const years = Array.from(
    new Set(ctx.transactions.map((t) => t.date.slice(0, 4))),
  ).sort();
  addSheet(
    wb,
    "Annual_Personal_Financial_Summary",
    years.map((y) => {
      const yt = ctx.transactions.filter((t) => t.date.startsWith(y));
      const inc = sumIncome(yt);
      const exp = sumExpense(yt);
      return {
        Year: y,
        Income: paiseToRupees(inc),
        Expense: paiseToRupees(exp),
        Net: paiseToRupees(inc - exp),
        SavingsRatePct: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0,
      };
    }),
  );

  // Tax flagged
  addSheet(
    wb,
    "Tax_Flagged_Transactions",
    ctx.transactions.filter((t) => t.taxFlag).map((t) => mapTransactionRow(t, ctx)),
  );

  // GST bill entries
  addSheet(
    wb,
    "GST_Bill_Entries",
    ctx.transactions
      .filter((t) => t.gstApplicable || t.billAvailable)
      .map((t) => mapTransactionRow(t, ctx)),
  );

  // Account ledger
  addSheet(
    wb,
    "Account_Ledger",
    ctx.accounts.flatMap((a) => {
      const accTx = ctx.transactions
        .filter((t) => t.accountId === a.id || t.toAccountId === a.id)
        .sort((x, y) => +new Date(x.date) - +new Date(y.date));
      return accTx.map((t) => ({
        Account: a.name,
        Date: t.date.slice(0, 10),
        Type: formatTxType(t.type),
        Description: t.description || t.merchantOrPerson,
        Amount: paiseToRupees(transactionAmountPaise(t)),
      }));
    }),
  );

  addSheet(
    wb,
    "Account_Reconciliation",
    reportAccountReconciliation(reportCtx).map((row) => ({
      Account: row.accountName,
      OpeningBalance: paiseToRupees(row.openingBalancePaise),
      Inflows: paiseToRupees(row.inflowsPaise),
      Outflows: paiseToRupees(row.outflowsPaise),
      CalculatedClosing: paiseToRupees(row.calculatedClosingBalancePaise),
      ReportedClosing: paiseToRupees(row.reportedClosingBalancePaise),
      Mismatch: paiseToRupees(row.mismatchPaise),
      Status: row.status,
      PossibleCauses: row.possibleCauses.join(", "),
      MissingAccountTransactions: row.missingAccountTransactionIds.join(", "),
      DeletedOrReversedTransactions: row.deletedOrReversedTransactionIds.join(", "),
      LegacyFallbackTransactions: row.legacyFallbackTransactionIds.join(", "),
    })),
  );

  // Loan amortization schedules (one sheet per active loan, name truncated)
  for (const loan of ctx.loans.filter((l) => l.status === "active")) {
    const sched = amortizationSchedule(loan);
    const rows = sched.map((row) => ({
      Month: row.monthIndex,
      DueDate: row.dueDate.slice(0, 10),
      EMI: paiseToRupees(row.emiPaise),
      Principal: paiseToRupees(row.principalPaise),
      Interest: paiseToRupees(row.interestPaise),
      ClosingPrincipal: paiseToRupees(row.balancePaise),
    }));
    const name = `Amort_${loan.lender}`.replace(/[^\w]/g, "_").slice(0, 31);
    addSheet(wb, name, rows);
  }

  // Interest paid (EMI lines marked paid)
  addSheet(
    wb,
    "Interest_Paid_Report",
    ctx.emis
      .filter((e) => e.status === "paid" || e.status === "partial")
      .map((e) => {
        const loan = ctx.loans.find((l) => l.id === e.loanId);
        return {
          Loan: loan?.lender ?? "",
          DueDate: e.dueDate.slice(0, 10),
          InterestPaid: paiseToRupees(e.interestComponentPaise ?? 0),
          PrincipalPaid: paiseToRupees(e.principalComponentPaise ?? 0),
          Status: e.status,
        };
      }),
  );

  // Business vs personal (expense) by month
  const bp = new Map<string, { Business: number; Personal: number; Mixed: number }>();
  for (const t of expenseReportTransactions(ctx.transactions)) {
    const key = t.date.slice(0, 7);
    const cur = bp.get(key) ?? { Business: 0, Personal: 0, Mixed: 0 };
    const p = expenseAmountPaise(t);
    if (t.businessOrPersonal === "business") cur.Business += p;
    else if (t.businessOrPersonal === "personal") cur.Personal += p;
    else cur.Mixed += p;
    bp.set(key, cur);
  }
  addSheet(
    wb,
    "Business_Personal_Split",
    Array.from(bp.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([Month, v]) => ({
        Month,
        Business: paiseToRupees(v.Business),
        Personal: paiseToRupees(v.Personal),
        Mixed: paiseToRupees(v.Mixed),
      })),
  );

  // Bills missing (business expenses)
  addSheet(
    wb,
    "Bills_Missing_Report",
    ctx.transactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.businessOrPersonal === "business" &&
          t.billAvailable !== 1,
      )
      .map((t) => mapTransactionRow(t, ctx)),
  );

  const footer = buildReportFooter({
    ctx: reportCtx,
    userId: ctx.userId ?? ctx.transactions[0]?.userId ?? ctx.accounts[0]?.userId ?? "unknown",
    reportPeriod: ctx.reportPeriod ?? "all",
    appVersion: ctx.appVersion ?? "sparowvault",
    exportVersion: "ca-v1",
  });
  addSheet(wb, "Export_Footer", [footer]);

  // CA Notes
  addSheet(wb, "CA_Notes", [
    { Note: `Exported by SparowVault on ${footer.generatedAt}.` },
    { Note: "All values in INR. Sign convention in amounts is positive; type indicates direction." },
    { Note: "Financial year is customizable per profile (default April–March)." },
    { Note: "Udhari is informal, not recognised under formal accounting standards." },
  ]);

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return { buffer: buf, filename: `${label}_${new Date().toISOString().slice(0, 10)}.xlsx` };
}

export function downloadBuffer(
  buf: ArrayBuffer | Uint8Array,
  filename: string,
  mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
) {
  const blob = new Blob([buf as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportModuleToSheet<T extends object>(
  moduleName: string,
  rows: T[],
  format: "xlsx" | "csv" = "xlsx",
) {
  const wb = XLSX.utils.book_new();
  addSheet(wb, moduleName, rows);
  const filename = `${moduleName}_${new Date().toISOString().slice(0, 10)}.${format}`;
  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[moduleName]);
    downloadBuffer(new TextEncoder().encode(csv).buffer, filename, "text/csv");
    return;
  }
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBuffer(buf, filename);
}
