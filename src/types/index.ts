// -----------------------------------------------------------------------------
// SparowVault - Domain Types
// All entities inherit BaseEntity. Future backend migration preserved.
// -----------------------------------------------------------------------------

export type ID = string;
export type ISODate = string;

export interface BaseEntity {
  id: ID;
  userId: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
  isDeleted: 0 | 1;
  version: number;
  tags: string[];
  notes: string;
}

// --------------------------- Users / Profiles / Sessions ---------------------
export interface User extends BaseEntity {
  username: string;
  displayName: string;
  pinHash: string;
  pinSalt: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  avatarEmoji: string;
  avatarColor: string;
  mobile?: string;
  email?: string;
  themePreference: "light" | "dark" | "system";
  financialYearStartMonth: number; // 4 = April
  lastLoginAt?: ISODate;
  isLocked: 0 | 1;
}

export interface Session {
  id: ID;
  userId: ID;
  createdAt: ISODate;
  lastActiveAt: ISODate;
  locked: 0 | 1;
}

export interface ProfileSettings extends BaseEntity {
  theme: "light" | "dark" | "system";
  financialYearStartMonth: number;
  dateFormat: "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";
  customPaymentModes: string[];
  budgetThresholds: { warning: number; critical: number };
  quickAddDefaults: {
    accountId?: ID;
    categoryId?: ID;
    paymentMode?: PaymentMode;
  };
  warningPreferences: {
    budgetAlerts: boolean;
    dueAlerts: boolean;
    udhariAlerts: boolean;
    savingsAlerts: boolean;
    unusualSpendAlerts: boolean;
    duplicateAlerts: boolean;
  };
  currency: "INR";
}

// --------------------------- Core finance ------------------------------------
export type PaymentMode =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "cheque"
  | "debit_card"
  | "credit_card"
  | "wallet"
  | "auto_debit"
  | "other";

/** vNext — payment channel (how payment was made). */
export type PaymentChannel =
  | "cash"
  | "upi"
  | "card_pos"
  | "card_online"
  | "neft"
  | "imps"
  | "rtgs"
  | "cheque"
  | "auto_debit"
  | "wallet"
  | "other";

/** vNext — funding instrument (source of money). */
export type FundingInstrument =
  | "bank_account"
  | "cash_account"
  | "wallet_account"
  | "credit_card"
  | "debit_card_linked_bank"
  | "loan_account"
  | "other";

export type OutgoingIntent =
  | "purchase_expense"
  | "self_transfer"
  | "credit_card_bill"
  | "loan_emi_payment"
  | "invest_or_save"
  | "lend_udhari"
  | "repay_borrowed"
  | "refundable_deposit"
  | "gift_expense"
  | "cash_withdrawal"
  | "cash_deposit"
  | "other_outgoing";

export type IncomingIntent =
  | "salary_income"
  | "interest_dividend_income"
  | "transfer_from_own"
  | "purchase_refund"
  | "credit_card_refund"
  | "reimbursement"
  | "loan_received"
  | "udhari_repayment"
  | "investment_redemption"
  | "deposit_returned"
  | "cashback_reward"
  | "gift_received"
  | "other_incoming";

export type TransactionIntent = OutgoingIntent | IncomingIntent;

export type ReimbursementPolicy = "none" | "gross_expense" | "net_personal";

export type TransactionType =
  | "income"
  | "expense"
  | "transfer"
  | "loan_disbursement"
  | "emi_payment"
  | "loan_prepayment"
  | "cc_payment"
  | "udhari_given"
  | "udhari_received"
  | "udhari_collect"
  | "udhari_repay"
  | "udhari_write_off"
  | "savings_contribution"
  | "goal_withdrawal"
  | "investment_contribution"
  | "investment_sell"
  | "refund"
  | "adjustment"
  | "card_emi_conversion"
  | "card_emi_charge";

export type AccountType =
  | "cash"
  | "bank"
  | "upi_wallet"
  | "savings"
  | "current"
  | "wallet"
  | "debit_linked"
  | "petty_cash"
  | "family_pool"
  | "custom";

export interface Account extends BaseEntity {
  name: string;
  type: AccountType;
  institution?: string;
  openingBalance: number;
  /** Canonical balance in paise; wins over openingBalance when both set. */
  openingBalancePaise?: number;
  color: string;
  icon: string;
  isInactive: 0 | 1;
}

export type CardType = "credit" | "debit";

export interface Card extends BaseEntity {
  nickname: string;
  bank: string;
  last4: string;
  type: CardType;
  linkedAccountId?: ID;
  creditLimit?: number;
  creditLimitPaise?: number;
  statementDay?: number; // 1-31
  dueDay?: number; // 1-31
  interestRate?: number; // APR %
  joiningFee?: number;
  annualFee?: number;
  annualFeeMonth?: number; // 1-12
  annualFeePaise?: number;
  rewardNote?: string;
  color: string;
  isInactive: 0 | 1;
  /** vNext — issuer display name. */
  issuerName?: string;
  autopayEnabled?: 0 | 1;
  autopayAccountId?: ID;
  cardRole?: "primary" | "add_on";
  sharedLimitGroupId?: ID;
}

export interface CreditLimitGroup extends BaseEntity {
  name: string;
  totalLimitPaise: number;
  issuerName?: string;
}

export interface CardStatement extends BaseEntity {
  cardId: ID;
  cycleStartDate: ISODate;
  cycleEndDate: ISODate;
  statementDate: ISODate;
  openingBalancePaise: number;
  closingBalancePaise: number;
  minimumDuePaise: number;
  retailSpendPaise: number;
  feesPaise: number;
  interestPaise: number;
  paymentsPaise: number;
  creditsPaise: number;
  status: "open" | "closed" | "paid";
}

export interface CardPaymentAllocation extends BaseEntity {
  cardId: ID;
  statementId?: ID;
  transactionId: ID;
  amountPaise: number;
  allocatedAt: ISODate;
}

/** vNext Phase E — Card EMI plan linked to purchase transaction(s). */
export interface CardEmiPlan extends BaseEntity {
  cardId: ID;
  purchaseTransactionIds: ID[];
  principalPaise: number;
  annualRateBps: number;
  tenureMonths: number;
  emiPaise: number;
  startDate: ISODate;
  status: "active" | "closed" | "foreclosed";
  scheduleStrategy: "reducing_balance" | "zero_rate" | "first_period_adjusted";
  calculationVersion: string;
  noCostEmi?: 0 | 1;
  merchantSubsidyPaise?: number;
}

export interface CardEmiInstallment extends BaseEntity {
  planId: ID;
  installmentNo: number;
  dueDate: ISODate;
  emiPaise: number;
  principalPaise: number;
  interestPaise: number;
  feePaise: number;
  taxPaise: number;
  status: "projected" | "billed" | "paid";
  source: "estimated" | "issuer_actual";
}

/** vNext Phase F — normalized due tracking. */
export interface Obligation extends BaseEntity {
  sourceType: "recurring_rule" | "loan_emi" | "card_statement" | "card_emi" | "udhari" | "insurance" | "custom";
  sourceId: ID;
  occurrenceKey: string;
  title: string;
  dueDate: ISODate;
  amountPaise: number;
  status: "due" | "paid" | "skipped" | "overdue";
  categoryId?: ID;
  accountId?: ID;
  cardId?: ID;
}

/** vNext Phase F — sinking fund target. */
export interface SinkingFund extends BaseEntity {
  name: string;
  targetPaise: number;
  targetDate: ISODate;
  linkedCategoryId?: ID;
  monthlyRequiredPaise?: number;
}

/** vNext Phase G — household consolidation. */
export interface Household extends BaseEntity {
  name: string;
  defaultCurrency: "INR";
}

export interface HouseholdMember extends BaseEntity {
  householdId: ID;
  userId: ID;
  role: "owner" | "partner" | "viewer";
  displayName: string;
}

export interface HouseholdPermission extends BaseEntity {
  householdId: ID;
  memberId: ID;
  canViewTransactions: 0 | 1;
  canEditTransactions: 0 | 1;
  canViewBalances: 0 | 1;
}

/** vNext Phase H — wealth entities. */
export interface FixedIncomeAsset extends BaseEntity {
  name: string;
  type: "fd" | "rd";
  principalPaise: number;
  rateBps: number;
  startDate: ISODate;
  maturityDate: ISODate;
  linkedAccountId?: ID;
  status: "active" | "matured" | "closed";
}

export interface InsurancePolicy extends BaseEntity {
  name: string;
  insurer: string;
  premiumPaise: number;
  premiumDueDay: number;
  coveragePaise: number;
  status: "active" | "lapsed";
}

export interface AssetValuation extends BaseEntity {
  assetType: "gold" | "property" | "vehicle" | "other";
  label: string;
  valuePaise: number;
  asOfDate: ISODate;
}

/** vNext Phase I — import/reconciliation. */
export interface ImportSource extends BaseEntity {
  name: string;
  kind: "csv" | "manual" | "aa_ready";
  lastImportAt?: ISODate;
}

export interface ReconciliationMatch extends BaseEntity {
  leftTransactionId: ID;
  rightTransactionId?: ID;
  status: "suggested" | "confirmed" | "rejected";
  confidence: number;
}

/** Phase 7 — Optional MySQL `user_credit_cards` shadow row (server analytics); app uses `Card` + ledger. */
export interface UserCreditCardShadow {
  id: ID;
  userId: ID;
  cardName: string;
  issuerName: string;
  last4: string;
  creditLimitPaise: number;
  currentOutstandingPaise: number;
  unbilledAmountPaise: number;
  statementBalancePaise: number;
  minimumDuePaise: number;
  statementDay: number;
  dueDay: number;
  lastStatementDate?: string | null;
  nextDueDate?: string | null;
  interestRateBps: number;
  annualFeePaise: number;
  isActive: 0 | 1;
  deletedAt?: string | null;
}

export interface Category extends BaseEntity {
  name: string;
  parentId: ID | null;
  appliesTo: "income" | "expense" | "mixed";
  icon: string;
  color: string;
  budgetable: 0 | 1;
  taxRelevant: 0 | 1;
  gstRelevant: 0 | 1;
  defaultPaymentMode?: PaymentMode;
  sortOrder: number;
  archived: 0 | 1;
}

export type NeedWant = "need" | "want" | "luxury" | "unassigned";
export type FixedVariable = "fixed" | "variable" | "unassigned";
export type PersonalBusiness = "personal" | "business" | "mixed";

export interface Transaction extends BaseEntity {
  date: ISODate;
  type: TransactionType;
  amount: number; // legacy rupees mirror; canonical is amountPaise
  amountPaise?: number;
  categoryId?: ID;
  subcategoryId?: ID;
  accountId?: ID;
  toAccountId?: ID; // for transfer
  linkedCardId?: ID;
  linkedLoanId?: ID;
  linkedGoalId?: ID;
  linkedUdhariId?: ID;
  linkedSavingsId?: ID;
  paymentMode: PaymentMode;
  merchantOrPerson: string;
  description: string;
  billAvailable: 0 | 1;
  gstApplicable: 0 | 1;
  taxFlag: 0 | 1;
  businessOrPersonal: PersonalBusiness;
  needWant: NeedWant;
  fixedVariable: FixedVariable;
  plannedUnplanned: "planned" | "unplanned" | "unassigned";
  recurringRuleId?: ID;
  attachmentMetaId?: ID;
  splitParentId?: ID;
  /** vNext — user-facing intent (maps to type when saving). */
  transactionIntent?: TransactionIntent;
  paymentChannel?: PaymentChannel;
  fundingInstrument?: FundingInstrument;
  linkedOriginalTransactionId?: ID;
  isReimbursable?: 0 | 1;
  reimbursementPolicy?: ReimbursementPolicy;
  /** Cost basis for investment_sell gain/loss split (paise). */
  costBasisPaise?: number;
  transferLinkId?: ID;
  groupId?: ID;
  /** vNext — link card EMI conversion/charge to plan. */
  linkedCardEmiPlanId?: ID;
  /** Processing fee / tax for card_emi_conversion or card_emi_charge (paise). */
  feePaise?: number;
  taxPaise?: number;
  interestPaise?: number;
  principalComponentPaise?: number;
}

/** vNext — metadata for atomic self-transfers. */
export interface TransferLink extends BaseEntity {
  fromAccountId: ID;
  toAccountId: ID;
  amountPaise: number;
  transactionId: ID;
  channel?: PaymentChannel;
  reference?: string;
  utr?: string;
  status: "pending" | "completed" | "failed" | "reversed";
  feeTransactionId?: ID;
}

// --------------------------- Financial ledger (Phase 5) --------------------
/** Denormalized ledger: one row per money movement derived from a transaction. */
export type FinancialEventType =
  | "income"
  | "expense"
  | "expense_cash"
  | "expense_bank"
  | "expense_upi"
  | "credit_card_purchase"
  | "credit_card_payment"
  | "transfer"
  | "loan_disbursement"
  | "emi_payment"
  | "loan_prepayment"
  | "goal_contribution"
  | "goal_withdrawal"
  | "udhari_given"
  | "udhari_received"
  | "udhari_settlement"
  | "udhari_write_off"
  | "investment_buy"
  | "investment_sell"
  | "refund"
  | "fee"
  | "tax"
  | "adjustment"
  | "card_emi_conversion"
  | "card_emi_charge";

export type FinancialEventStatus = "posted" | "needs_review" | "reversed";

export type FinancialEventSource = "transaction" | "backfill" | "manual";

export interface FinancialEvent {
  id: ID;
  userId: ID;
  sourceTransactionId: ID;
  eventType: FinancialEventType;
  eventDate: string;
  amountPaise: number;
  currency: string;
  description: string;
  source: FinancialEventSource;
  status: FinancialEventStatus;
  reversalOfEventId?: ID | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt?: ISODate | null;
}

export type FinancialEffectTargetType =
  | "account"
  | "credit_card"
  | "loan"
  | "goal"
  | "udhari_person"
  | "investment"
  | "income_category"
  | "expense_category"
  | "reimbursement"
  | "fee"
  | "tax"
  | "card_emi_plan";

export type FinancialEffectComponent =
  | "cash"
  | "income"
  | "expense"
  | "principal"
  | "interest"
  | "penalty"
  | "fee"
  | "tax"
  | "liability"
  | "asset"
  | "receivable"
  | "payable";

export type FinancialEffectDirection = "increase" | "decrease";

export interface FinancialEffect {
  id: ID;
  eventId: ID;
  userId: ID;
  targetType: FinancialEffectTargetType;
  targetId: ID;
  effectDirection: FinancialEffectDirection;
  amountPaise: number;
  component: FinancialEffectComponent;
  createdAt: ISODate;
}

// --------------------------- Budgets -----------------------------------------
export interface Budget extends BaseEntity {
  period: "monthly" | "annual";
  month?: number; // 1-12 for monthly
  year: number;
  categoryId: ID;
  amount: number;
  /** Canonical limit in paise; wins over amount when both set. */
  limitPaise?: number;
  mode: "fixed" | "flexible";
  carryForward: 0 | 1;
  rolloverSavings: 0 | 1;
}

// --------------------------- Goals -------------------------------------------
export type GoalType =
  | "phone"
  | "laptop"
  | "bike"
  | "car"
  | "travel"
  | "marriage"
  | "education"
  | "emergency_fund"
  | "tax_reserve"
  | "home_down_payment"
  | "gadgets"
  | "festive"
  | "custom";

export type GoalStatus = "active" | "paused" | "completed" | "abandoned";

export interface Goal extends BaseEntity {
  title: string;
  goalType: GoalType;
  targetAmount: number;
  targetAmountPaise?: number;
  targetDate: ISODate;
  startedAt: ISODate;
  currentSaved: number;
  savedAmountPaise?: number;
  linkedAccountId?: ID;
  priority: 1 | 2 | 3 | 4 | 5;
  autoContribution?: {
    enabled: boolean;
    amount: number;
    dayOfMonth: number;
  };
  icon: string;
  color: string;
  status: GoalStatus;
}

export interface GoalContribution extends BaseEntity {
  goalId: ID;
  date: ISODate;
  amount: number;
  amountPaise?: number;
  sourceAccountId?: ID;
  transactionId?: ID;
}

// --------------------------- Loans / EMI -------------------------------------
export type LoanType =
  | "home"
  | "personal"
  | "vehicle"
  | "education"
  | "business"
  | "gold"
  | "informal"
  | "custom";

export type LoanLifecycleMode = "fresh" | "existing" | "ongoing_imported";
export type LoanInterestType = "reducing_balance" | "flat_interest" | "interest_only" | "custom_manual";

export interface Loan extends BaseEntity {
  name?: string;
  lender: string;
  loanType: LoanType;
  principal: number;
  principalPaise?: number;
  disbursedAmount?: number;
  disbursedAmountPaise?: number;
  startDate: ISODate;
  firstEmiDate?: ISODate;
  tenureMonths: number;
  annualInterestRate: number;
  annualInterestBps?: number;
  interestType?: LoanInterestType;
  emiDueDay: number;
  lifecycleMode?: LoanLifecycleMode;
  completedEmis?: number;
  remainingEmis?: number;
  outstandingPrincipal?: number;
  outstandingPrincipalPaise?: number;
  nextDueDate?: ISODate;
  emiAmountOverride?: number;
  emiPaise?: number;
  processingFee: number;
  insuranceCost: number;
  prepaymentAllowed: 0 | 1;
  foreclosureCharges?: number;
  linkedAccountId?: ID;
  linkedCardId?: ID;
  blockedAmount?: number;
  status: "active" | "closed" | "defaulted";
}

export type EMIStatus =
  | "due"
  | "unpaid"
  | "paid"
  | "partial"
  | "overdue"
  | "late"
  | "skipped"
  | "restructured"
  | "moratorium";

export interface EMIPayment extends BaseEntity {
  loanId: ID;
  dueDate: ISODate;
  paidDate?: ISODate;
  amountDue: number;
  /** Canonical EMI line amount (due) in paise. */
  amountPaise?: number;
  amountPaid: number;
  amountPaidPaise?: number;
  principalComponent: number;
  principalComponentPaise?: number;
  interestComponent: number;
  interestComponentPaise?: number;
  penaltyPaise?: number;
  feePaise?: number;
  extraPrincipalPaise?: number;
  openingPrincipalPaise?: number;
  closingPrincipalPaise?: number;
  status: EMIStatus;
  transactionId?: ID;
}

// --------------------------- Udhari / advances -------------------------------
export type UdhariType = "receivable" | "payable";
export type UdhariStatus = "open" | "partial" | "settled" | "written_off";

export interface UdhariRecord extends BaseEntity {
  personName: string;
  phone?: string;
  type: UdhariType;
  amount: number;
  amountPaise?: number;
  givenDate: ISODate;
  dueDate?: ISODate;
  status: UdhariStatus;
  amountSettled: number;
  amountSettledPaise?: number;
  reminderOn: 0 | 1;
  context: "friend" | "family" | "salary_advance" | "supplier" | "customer" | "other";
}

export interface UdhariSettlement extends BaseEntity {
  udhariId: ID;
  date: ISODate;
  amount: number;
  amountPaise?: number;
  transactionId?: ID;
  /** Cash account when kind is cash; omitted for write-off. */
  accountId?: ID;
  /** Cash settlement vs bad-debt / forgiveness (no cash movement). */
  kind?: "cash" | "write_off";
  reason?: string;
}

// --------------------------- Savings / Investments ---------------------------
export type InvestmentType =
  | "sip"
  | "ppf"
  | "fd"
  | "rd"
  | "emergency_fund"
  | "sinking_fund"
  | "tax_reserve"
  | "recurring_savings"
  | "gold"
  | "custom";

export interface Investment extends BaseEntity {
  name: string;
  type: InvestmentType;
  startDate: ISODate;
  frequency: "monthly" | "quarterly" | "yearly" | "oneoff";
  monthlyTarget: number;
  /** Canonical monthly / recurring amount in paise (SIP target). */
  amountPaise?: number;
  totalContributed: number;
  totalContributedPaise?: number;
  maturityDate?: ISODate;
  expectedReturnRate?: number;
  linkedAccountId?: ID;
  status: "active" | "paused" | "matured" | "closed";
}

export interface SavingsContribution extends BaseEntity {
  investmentId: ID;
  date: ISODate;
  amount: number;
  amountPaise?: number;
  transactionId?: ID;
}

// --------------------------- Reminders / Alerts ------------------------------
export type ReminderKind =
  | "emi"
  | "credit_card"
  | "recurring"
  | "udhari"
  | "goal"
  | "custom";

export interface Reminder extends BaseEntity {
  kind: ReminderKind;
  title: string;
  dueDate: ISODate;
  amount?: number;
  linkedId?: ID;
  recurring: 0 | 1;
  intervalDays?: number;
  done: 0 | 1;
}

export type AlertSeverity = "info" | "warning" | "danger" | "success";

export interface AppAlert extends BaseEntity {
  kind: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  linkHref?: string;
  dismissed: 0 | 1;
  triggeredAt: ISODate;
}

export interface RecurringRule extends BaseEntity {
  title: string;
  type: TransactionType;
  amount: number;
  amountPaise?: number;
  categoryId?: ID;
  accountId?: ID;
  paymentMode: PaymentMode;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  dayOfMonth?: number;
  dayOfWeek?: number;
  nextRunDate: ISODate;
  endDate?: ISODate;
  active: 0 | 1;
}

export interface AttachmentMeta extends BaseEntity {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  linkedType: "transaction" | "loan" | "investment" | "card" | "other";
  linkedId: ID;
}

export interface ExportHistory extends BaseEntity {
  scope: string;
  format: "xlsx" | "csv" | "json";
  fromDate?: ISODate;
  toDate?: ISODate;
  fileName: string;
  rowCount: number;
}

export interface AuditLog extends BaseEntity {
  action:
    | "create"
    | "update"
    | "soft_delete"
    | "restore"
    | "hard_delete"
    | "login"
    | "logout"
    | "lock"
    | "unlock"
    | "export"
    | "import"
    | "backup"
    | "restore_backup"
    | "settings_change";
  entity: string;
  entityId?: ID;
  detail: string;
}

export interface FinancialSnapshot extends BaseEntity {
  periodKey: string; // e.g., "2026-04"
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  budgetUsage: number;
  creditUtilization: number;
  healthScore: number;
}

/** Phase 11 — rule-backed suggestions; numbers live only in JSON + deterministic copy. */
export type AiSuggestionType =
  | "budget"
  | "credit_card"
  | "loan"
  | "cashflow"
  | "goal"
  | "udhari"
  | "tax"
  | "missing_bill"
  | "subscription"
  | "emergency_fund"
  | "net_worth"
  | "investment_tracking_only";

export type AiSuggestionSeverity = "info" | "warning" | "danger" | "opportunity";

export type AiSuggestionStatus =
  | "active"
  | "viewed"
  | "dismissed"
  | "useful"
  | "not_useful"
  | "remind_later"
  | "action_taken"
  | "expired";

export interface AiSuggestionHistoryEvent {
  type: "created" | "viewed" | "dismissed" | "useful" | "not_useful" | "snoozed" | "action_taken" | "expired";
  at: ISODate;
  detail?: string;
}

export interface AiSuggestion extends BaseEntity {
  dedupeKey: string;
  suggestionType: AiSuggestionType;
  severity: AiSuggestionSeverity;
  title: string;
  reason: string;
  /** Deterministic facts backing title/reason; AI must not alter these numbers. */
  calculationInputsJson: Record<string, unknown>;
  recommendedAction: string;
  expectedImpactJson?: Record<string, unknown> | null;
  confidenceScore: number;
  sourceModule: string;
  status: AiSuggestionStatus;
  historyJson?: AiSuggestionHistoryEvent[];
  aiExplanation?: string | null;
  remindAt?: ISODate | null;
  expiresAt: ISODate;
}

// --------------------------- Utility / union ---------------------------------
export type AnyEntity =
  | User
  | Account
  | Card
  | Category
  | Transaction
  | Budget
  | Goal
  | GoalContribution
  | Loan
  | EMIPayment
  | UdhariRecord
  | UdhariSettlement
  | Investment
  | SavingsContribution
  | Reminder
  | AppAlert
  | RecurringRule
  | AttachmentMeta
  | ExportHistory
  | AuditLog
  | FinancialSnapshot
  | AiSuggestion
  | ProfileSettings;

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

export interface TransactionFilters {
  search?: string;
  from?: ISODate;
  to?: ISODate;
  types?: TransactionType[];
  categoryIds?: ID[];
  accountIds?: ID[];
  paymentModes?: PaymentMode[];
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
  businessOrPersonal?: PersonalBusiness;
  taxFlag?: boolean;
  gstFlag?: boolean;
  needWant?: NeedWant;
}
