import type { PaymentMode, TransactionType } from "@/types";

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "debit_card", label: "Debit Card" },
  { value: "credit_card", label: "Credit Card" },
  { value: "wallet", label: "Wallet" },
  { value: "auto_debit", label: "Auto Debit" },
  { value: "other", label: "Other" },
];

export const TRANSACTION_TYPES: { value: TransactionType; label: string; tone: string }[] = [
  { value: "income", label: "Income", tone: "income" },
  { value: "expense", label: "Expense", tone: "expense" },
  { value: "transfer", label: "Transfer", tone: "info" },
  { value: "loan_disbursement", label: "Loan Disbursement", tone: "info" },
  { value: "emi_payment", label: "EMI Payment", tone: "expense" },
  { value: "loan_prepayment", label: "Loan Prepayment", tone: "expense" },
  { value: "cc_payment", label: "Card Payment", tone: "expense" },
  { value: "udhari_given", label: "Udhari Given", tone: "info" },
  { value: "udhari_received", label: "Udhari Received", tone: "info" },
  { value: "udhari_collect", label: "Udhari Collected", tone: "info" },
  { value: "udhari_repay", label: "Udhari Repaid", tone: "info" },
  { value: "udhari_write_off", label: "Udhari Write-off", tone: "expense" },
  { value: "savings_contribution", label: "Savings", tone: "goal" },
  { value: "goal_withdrawal", label: "Goal Withdrawal", tone: "info" },
  { value: "investment_contribution", label: "Investment", tone: "goal" },
  { value: "investment_sell", label: "Investment Sell", tone: "income" },
  { value: "refund", label: "Refund", tone: "income" },
  { value: "adjustment", label: "Adjustment", tone: "warning" },
  { value: "card_emi_conversion", label: "Card EMI Conversion", tone: "info" },
  { value: "card_emi_charge", label: "Card EMI Charge", tone: "expense" },
];

export const DEFAULT_EXPENSE_CATEGORIES: {
  name: string;
  icon: string;
  color: string;
  taxRelevant?: boolean;
  gstRelevant?: boolean;
}[] = [
  { name: "Food & Dining", icon: "🍽️", color: "#f97316" },
  { name: "Groceries", icon: "🛒", color: "#10b981" },
  { name: "Rent", icon: "🏠", color: "#6366f1" },
  { name: "Utilities", icon: "💡", color: "#f59e0b" },
  { name: "Mobile Recharge", icon: "📱", color: "#06b6d4" },
  { name: "Internet", icon: "🌐", color: "#3b82f6" },
  { name: "Electricity", icon: "⚡", color: "#eab308" },
  { name: "Gas", icon: "🔥", color: "#ef4444" },
  { name: "Fuel", icon: "⛽", color: "#dc2626" },
  { name: "Travel", icon: "✈️", color: "#8b5cf6" },
  { name: "Shopping", icon: "🛍️", color: "#ec4899" },
  { name: "Medical", icon: "🏥", color: "#ef4444", taxRelevant: true },
  { name: "Education", icon: "📚", color: "#0ea5e9", taxRelevant: true },
  { name: "Entertainment", icon: "🎬", color: "#a855f7" },
  { name: "Family", icon: "👨‍👩‍👧", color: "#f43f5e" },
  { name: "Business", icon: "💼", color: "#0284c7", gstRelevant: true },
  { name: "Tax", icon: "🧾", color: "#dc2626", taxRelevant: true },
  { name: "Insurance", icon: "🛡️", color: "#14b8a6", taxRelevant: true },
  { name: "EMI", icon: "📋", color: "#9333ea" },
  { name: "Loan Repayment", icon: "💳", color: "#7c3aed" },
  { name: "Credit Card Bill", icon: "💳", color: "#be185d" },
  { name: "Subscriptions", icon: "🔁", color: "#0891b2" },
  { name: "Donation", icon: "💝", color: "#db2777", taxRelevant: true },
  { name: "Maintenance", icon: "🔧", color: "#64748b" },
  { name: "Miscellaneous", icon: "✨", color: "#94a3b8" },
];

export const DEFAULT_INCOME_CATEGORIES: { name: string; icon: string; color: string }[] = [
  { name: "Salary", icon: "💼", color: "#059669" },
  { name: "Freelance", icon: "💻", color: "#0891b2" },
  { name: "Business", icon: "🏢", color: "#0284c7" },
  { name: "Rent Income", icon: "🏘️", color: "#0d9488" },
  { name: "Interest", icon: "📈", color: "#059669" },
  { name: "Dividend", icon: "💹", color: "#16a34a" },
  { name: "Refund", icon: "↩️", color: "#84cc16" },
  { name: "Cashback", icon: "💸", color: "#65a30d" },
  { name: "Gift", icon: "🎁", color: "#d946ef" },
  { name: "Bonus", icon: "⭐", color: "#eab308" },
  { name: "Commission", icon: "🤝", color: "#0284c7" },
  { name: "Other", icon: "💵", color: "#64748b" },
];

export const AVATAR_EMOJIS = [
  "💰",
  "🏆",
  "🎯",
  "💎",
  "📊",
  "📈",
  "💼",
  "🏦",
  "🪙",
  "🧮",
  "🪄",
  "🦁",
  "🐯",
  "🦊",
  "🌟",
  "⚡",
  "🔥",
  "🌈",
];
export const AVATAR_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#3b82f6",
];

export const GOAL_TYPE_LABELS: Record<string, string> = {
  phone: "Phone Purchase",
  laptop: "Laptop Purchase",
  bike: "Bike / Two-Wheeler",
  car: "Car Purchase",
  travel: "Travel / Vacation",
  marriage: "Marriage",
  education: "Education",
  emergency_fund: "Emergency Fund",
  tax_reserve: "Tax Reserve",
  home_down_payment: "Home Down Payment",
  gadgets: "Gadgets",
  festive: "Festive / Puja",
  custom: "Custom Goal",
};

export const LOAN_TYPE_LABELS: Record<string, string> = {
  home: "Home Loan",
  personal: "Personal Loan",
  vehicle: "Vehicle Loan",
  education: "Education Loan",
  business: "Business Loan",
  gold: "Gold Loan",
  informal: "Informal Loan",
  custom: "Custom Loan",
};

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  sip: "SIP",
  ppf: "PPF",
  fd: "Fixed Deposit",
  rd: "Recurring Deposit",
  emergency_fund: "Emergency Fund",
  sinking_fund: "Sinking Fund",
  tax_reserve: "Tax Reserve",
  recurring_savings: "Recurring Savings",
  gold: "Gold Savings",
  custom: "Custom",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank Account",
  upi_wallet: "UPI Wallet",
  savings: "Savings Account",
  current: "Current Account",
  wallet: "Wallet",
  debit_linked: "Debit-Linked",
  petty_cash: "Petty Cash",
  family_pool: "Family Pool",
  custom: "Custom",
};

export const BANK_BRANDS = [
  "HDFC Bank",
  "ICICI Bank",
  "SBI",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "IDFC First Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Canara Bank",
  "IndusInd Bank",
  "AU Small Finance Bank",
  "American Express",
  "HSBC",
  "Citibank",
  "Standard Chartered",
  "RBL Bank",
  "Paytm Payments Bank",
  "Federal Bank",
];

export const UDHARI_CONTEXTS: { value: string; label: string }[] = [
  { value: "friend", label: "Friend" },
  { value: "family", label: "Family" },
  { value: "salary_advance", label: "Salary Advance" },
  { value: "supplier", label: "Supplier Advance" },
  { value: "customer", label: "Customer Advance" },
  { value: "other", label: "Other" },
];
