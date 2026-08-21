import { z } from "zod";

export const createUserSchema = z
  .object({
    username: z
      .string()
      .min(3, "At least 3 characters")
      .max(24, "At most 24 characters")
      .regex(/^[a-zA-Z0-9._-]+$/, "Only letters, numbers and . _ -"),
    displayName: z.string().min(1, "Required").max(40),
    pin: z
      .string()
      .min(4, "Minimum 4 digits")
      .max(32, "Too long"),
    confirmPin: z.string().min(4),
    securityQuestion: z.string().optional(),
    securityAnswer: z.string().optional(),
    mobile: z
      .string()
      .regex(/^$|^[0-9+\-\s]{6,18}$/, "Enter a valid mobile number")
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .email("Enter a valid email")
      .optional()
      .or(z.literal("")),
    avatarEmoji: z.string().optional(),
    avatarColor: z.string().optional(),
  })
  .refine((v) => v.pin === v.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  type: z.enum([
    "income",
    "expense",
    "transfer",
    "loan_disbursement",
    "emi_payment",
    "loan_prepayment",
    "cc_payment",
    "udhari_given",
    "udhari_received",
    "udhari_collect",
    "udhari_repay",
    "udhari_write_off",
    "savings_contribution",
    "goal_withdrawal",
    "investment_contribution",
    "investment_sell",
    "refund",
    "adjustment",
  ]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  toAccountId: z.string().optional(),
  linkedCardId: z.string().optional(),
  linkedLoanId: z.string().optional(),
  linkedGoalId: z.string().optional(),
  linkedUdhariId: z.string().optional(),
  linkedSavingsId: z.string().optional(),
  paymentMode: z.enum([
    "cash",
    "upi",
    "bank_transfer",
    "cheque",
    "debit_card",
    "credit_card",
    "wallet",
    "auto_debit",
    "other",
  ]),
  merchantOrPerson: z.string().max(80).default(""),
  description: z.string().max(200).default(""),
  notes: z.string().max(500).default(""),
  tags: z.array(z.string()).default([]),
  billAvailable: z.union([z.literal(0), z.literal(1)]).default(0),
  gstApplicable: z.union([z.literal(0), z.literal(1)]).default(0),
  taxFlag: z.union([z.literal(0), z.literal(1)]).default(0),
  businessOrPersonal: z.enum(["personal", "business", "mixed"]).default("personal"),
  needWant: z.enum(["need", "want", "luxury", "unassigned"]).default("unassigned"),
  fixedVariable: z.enum(["fixed", "variable", "unassigned"]).default("unassigned"),
  plannedUnplanned: z.enum(["planned", "unplanned", "unassigned"]).default("unassigned"),
})
  .superRefine((v, ctx) => {
    if (v.type === "udhari_write_off") {
      if (!v.linkedUdhariId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["linkedUdhariId"], message: "Link the udhari record" });
      }
      if (!v.categoryId?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["categoryId"],
          message: "Pick an expense category (e.g. bad debt / loss)",
        });
      }
    }
    if (v.type === "udhari_collect" || v.type === "udhari_repay") {
      if (!v.accountId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["accountId"], message: "Account is required" });
      }
      if (!v.linkedUdhariId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["linkedUdhariId"], message: "Link the udhari record" });
      }
    }
    if (v.type === "loan_prepayment") {
      if (!v.accountId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["accountId"], message: "Account is required" });
      }
      if (!v.linkedLoanId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["linkedLoanId"], message: "Select the loan" });
      }
    }
    if (v.type === "goal_withdrawal") {
      if (!v.accountId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["accountId"], message: "Account is required" });
      }
      if (!v.linkedGoalId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["linkedGoalId"], message: "Select the goal" });
      }
    }
    if (v.type === "investment_sell") {
      if (!v.accountId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["accountId"], message: "Account is required" });
      }
      if (!v.linkedSavingsId?.trim()) {
        ctx.addIssue({ code: "custom", path: ["linkedSavingsId"], message: "Select the investment" });
      }
    }
  });

export const accountSchema = z.object({
  name: z.string().min(1).max(40),
  type: z.enum([
    "cash",
    "bank",
    "upi_wallet",
    "savings",
    "current",
    "wallet",
    "debit_linked",
    "petty_cash",
    "family_pool",
    "custom",
  ]),
  institution: z.string().max(60).optional().default(""),
  openingBalance: z.coerce.number(),
  color: z.string().default("#0ea5e9"),
  icon: z.string().default("wallet"),
  notes: z.string().max(300).default(""),
});

export const cardSchema = z
  .object({
    nickname: z.string().min(1).max(40),
    bank: z.string().min(1).max(40),
    last4: z
      .string()
      .regex(/^\d{4}$/u, "Last 4 digits only")
      .optional()
      .or(z.literal("")),
    type: z.enum(["credit", "debit"]),
    linkedAccountId: z.string().optional(),
    creditLimit: z.coerce.number().optional(),
    statementDay: z.coerce.number().min(1).max(31).optional(),
    dueDay: z.coerce.number().min(1).max(31).optional(),
    interestRate: z.coerce.number().optional(),
    joiningFee: z.coerce.number().optional(),
    annualFee: z.coerce.number().optional(),
    annualFeeMonth: z.coerce.number().min(1).max(12).optional(),
    rewardNote: z.string().max(200).optional().default(""),
    color: z.string().default("#8b5cf6"),
    notes: z.string().max(300).default(""),
  })
  .superRefine((value, ctx) => {
    if (value.type !== "credit") return;
    if (value.creditLimit === undefined || value.creditLimit <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditLimit"],
        message: "Credit limit is required for credit cards.",
      });
    }
    if (value.statementDay === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["statementDay"],
        message: "Statement day is required for credit cards.",
      });
    }
    if (value.dueDay === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDay"],
        message: "Due day is required for credit cards.",
      });
    }
  });

export const categorySchema = z.object({
  name: z.string().min(1).max(40),
  parentId: z.string().nullable().optional(),
  appliesTo: z.enum(["income", "expense", "mixed"]),
  icon: z.string().default("tag"),
  color: z.string().default("#0ea5e9"),
  budgetable: z.union([z.literal(0), z.literal(1)]).default(1),
  taxRelevant: z.union([z.literal(0), z.literal(1)]).default(0),
  gstRelevant: z.union([z.literal(0), z.literal(1)]).default(0),
});

export const budgetSchema = z
  .object({
    period: z.enum(["monthly", "annual"]),
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12).optional(),
    categoryId: z.string().min(1),
    amount: z.coerce.number().positive("Budget must be > 0"),
    mode: z.enum(["fixed", "flexible"]).default("flexible"),
    carryForward: z.union([z.literal(0), z.literal(1)]).default(0),
    rolloverSavings: z.union([z.literal(0), z.literal(1)]).default(0),
    notes: z.string().max(300).default(""),
  })
  .refine((v) => v.period === "annual" || v.month !== undefined, {
    message: "Month required for monthly budget",
    path: ["month"],
  });

export const goalSchema = z.object({
  title: z.string().min(1).max(60),
  goalType: z.enum([
    "phone",
    "laptop",
    "bike",
    "car",
    "travel",
    "marriage",
    "education",
    "emergency_fund",
    "tax_reserve",
    "home_down_payment",
    "gadgets",
    "festive",
    "custom",
  ]),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.string().min(1),
  currentSaved: z.coerce.number().nonnegative().default(0),
  linkedAccountId: z.string().optional(),
  priority: z.coerce.number().min(1).max(5).default(3),
  autoContributionEnabled: z.boolean().default(false),
  autoContributionAmount: z.coerce.number().nonnegative().default(0),
  autoContributionDay: z.coerce.number().min(1).max(28).default(1),
  icon: z.string().default("target"),
  color: z.string().default("#8b5cf6"),
  status: z.enum(["active", "paused", "completed", "abandoned"]).default("active"),
  notes: z.string().max(300).default(""),
});

export const loanSchema = z
  .object({
    lender: z.string().min(1).max(60),
    loanType: z.enum([
      "home",
      "personal",
      "vehicle",
      "education",
      "business",
      "gold",
      "informal",
      "custom",
    ]),
    interestType: z
      .enum(["reducing_balance", "flat_interest", "interest_only", "custom_manual"])
      .default("reducing_balance"),
    principal: z.coerce.number().positive(),
    disbursedAmount: z.coerce.number().nonnegative().optional(),
    startDate: z.string().min(1),
    firstEmiDate: z.string().optional().or(z.literal("")),
    tenureMonths: z.coerce.number().int().positive(),
    annualInterestRate: z.coerce.number().nonnegative(),
    emiDueDay: z.coerce.number().int().min(1).max(28),
    lifecycleMode: z.enum(["fresh", "existing", "ongoing_imported"]).default("fresh"),
    completedEmis: z.coerce.number().int().min(0).optional(),
    remainingEmis: z.coerce.number().int().min(0).optional(),
    outstandingPrincipal: z.coerce.number().nonnegative().optional(),
    nextDueDate: z.string().optional().or(z.literal("")),
    emiAmountOverride: z.coerce.number().positive().optional(),
    processingFee: z.coerce.number().nonnegative().default(0),
    insuranceCost: z.coerce.number().nonnegative().default(0),
    prepaymentAllowed: z.union([z.literal(0), z.literal(1)]).default(1),
    foreclosureCharges: z.coerce.number().nonnegative().optional(),
    linkedAccountId: z.string().optional(),
    linkedCardId: z.string().optional(),
    blockedAmount: z.coerce.number().nonnegative().optional(),
    notes: z.string().max(300).default(""),
  })
  .superRefine((value, ctx) => {
    if (value.lifecycleMode !== "existing" && value.lifecycleMode !== "ongoing_imported") return;

    const hasCompleted = value.completedEmis !== undefined && value.completedEmis > 0;
    const hasRemaining = value.remainingEmis !== undefined && value.remainingEmis > 0;
    const hasOutstanding =
      value.outstandingPrincipal !== undefined && value.outstandingPrincipal > 0;

    if (!hasCompleted && !hasRemaining && !hasOutstanding) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completedEmis"],
        message:
          "For an ongoing or imported loan, enter completed EMIs, remaining EMIs, or outstanding principal.",
      });
    }

    if (
      value.remainingEmis !== undefined &&
      value.remainingEmis > value.tenureMonths
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["remainingEmis"],
        message: "Remaining EMIs cannot exceed total tenure.",
      });
    }

    if (
      value.completedEmis !== undefined &&
      value.completedEmis > value.tenureMonths
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["completedEmis"],
        message: "Completed EMIs cannot exceed total tenure.",
      });
    }
  });

export const udhariSchema = z.object({
  personName: z.string().min(1).max(60),
  phone: z.string().optional().default(""),
  type: z.enum(["receivable", "payable"]),
  amount: z.coerce.number().positive(),
  givenDate: z.string().min(1),
  dueDate: z.string().optional(),
  context: z
    .enum(["friend", "family", "salary_advance", "supplier", "customer", "other"])
    .default("friend"),
  reminderOn: z.union([z.literal(0), z.literal(1)]).default(1),
  notes: z.string().max(300).default(""),
});

export const investmentSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum([
    "sip",
    "ppf",
    "fd",
    "rd",
    "emergency_fund",
    "sinking_fund",
    "tax_reserve",
    "recurring_savings",
    "gold",
    "custom",
  ]),
  startDate: z.string().min(1),
  frequency: z.enum(["monthly", "quarterly", "yearly", "oneoff"]).default("monthly"),
  monthlyTarget: z.coerce.number().nonnegative().default(0),
  maturityDate: z.string().optional(),
  expectedReturnRate: z.coerce.number().nonnegative().optional(),
  linkedAccountId: z.string().optional(),
  notes: z.string().max(300).default(""),
});
