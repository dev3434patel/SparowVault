import type { AccountNature } from "@/company/types";

export interface CoaSeedGroup {
  code: string;
  name: string;
  nature: AccountNature;
  children?: CoaSeedGroup[];
  /** Suggested leaf ledgers under this group. */
  ledgers?: Array<{ code: string; name: string; isCashBank?: boolean; isPartyControl?: boolean }>;
}

/** Default chart-of-accounts template for client preview / offline seed display. */
export const DEFAULT_COA_SEED: CoaSeedGroup[] = [
  {
    code: "ASSETS",
    name: "Assets",
    nature: "ASSET",
    children: [
      {
        code: "CASH",
        name: "Cash",
        nature: "ASSET",
        ledgers: [{ code: "CASH_IN_HAND", name: "Cash in Hand", isCashBank: true }],
      },
      {
        code: "BANK",
        name: "Bank Accounts",
        nature: "ASSET",
        ledgers: [{ code: "BANK_PRIMARY", name: "Primary Bank", isCashBank: true }],
      },
      {
        code: "AR",
        name: "Accounts Receivable",
        nature: "ASSET",
        ledgers: [{ code: "AR_CONTROL", name: "Accounts Receivable", isPartyControl: true }],
      },
      {
        code: "LOANS_ADV_GIVEN",
        name: "Loans & Advances Given",
        nature: "ASSET",
        ledgers: [{ code: "ADVANCE_GIVEN", name: "Advances to Parties", isPartyControl: true }],
      },
      { code: "DEPOSITS", name: "Deposits", nature: "ASSET", ledgers: [{ code: "DEPOSITS", name: "Deposits" }] },
      { code: "INVENTORY", name: "Inventory", nature: "ASSET", ledgers: [{ code: "STOCK", name: "Stock" }] },
      {
        code: "FIXED_ASSETS",
        name: "Property / Fixed Assets",
        nature: "ASSET",
        ledgers: [{ code: "PROPERTY", name: "Property / Fixed Assets" }],
      },
      {
        code: "OTHER_CA",
        name: "Other Current Assets",
        nature: "ASSET",
        ledgers: [{ code: "OTHER_ASSET", name: "Other Current Assets" }],
      },
    ],
  },
  {
    code: "LIABILITIES",
    name: "Liabilities",
    nature: "LIABILITY",
    children: [
      {
        code: "AP",
        name: "Accounts Payable",
        nature: "LIABILITY",
        ledgers: [{ code: "AP_CONTROL", name: "Accounts Payable", isPartyControl: true }],
      },
      {
        code: "LOANS_BORROWED",
        name: "Loans Borrowed",
        nature: "LIABILITY",
        ledgers: [{ code: "LOAN_PAYABLE", name: "Loans Payable", isPartyControl: true }],
      },
      {
        code: "PARTY_PAYABLES",
        name: "Party Payables",
        nature: "LIABILITY",
        ledgers: [{ code: "PARTY_PAYABLE", name: "Party Payables", isPartyControl: true }],
      },
      {
        code: "TAXES_PAYABLE",
        name: "Taxes Payable",
        nature: "LIABILITY",
        ledgers: [{ code: "GST_PAYABLE", name: "GST Payable" }],
      },
      {
        code: "EXP_PAYABLE",
        name: "Expenses Payable",
        nature: "LIABILITY",
        ledgers: [{ code: "EXPENSES_PAYABLE", name: "Expenses Payable" }],
      },
      {
        code: "OTHER_LIAB",
        name: "Other Liabilities",
        nature: "LIABILITY",
        ledgers: [{ code: "OTHER_LIABILITY", name: "Other Liabilities" }],
      },
    ],
  },
  {
    code: "EQUITY",
    name: "Equity",
    nature: "EQUITY",
    children: [
      { code: "CAPITAL", name: "Capital", nature: "EQUITY", ledgers: [{ code: "CAPITAL", name: "Capital" }] },
      {
        code: "PARTNER_CAPITAL",
        name: "Partner Capital",
        nature: "EQUITY",
        ledgers: [{ code: "PARTNER_CAPITAL", name: "Partner Capital" }],
      },
      { code: "DRAWINGS", name: "Drawings", nature: "EQUITY", ledgers: [{ code: "DRAWINGS", name: "Drawings" }] },
      {
        code: "RETAINED",
        name: "Retained Earnings",
        nature: "EQUITY",
        ledgers: [{ code: "RETAINED_EARNINGS", name: "Retained Earnings" }],
      },
    ],
  },
  {
    code: "INCOME",
    name: "Income",
    nature: "INCOME",
    children: [
      { code: "SALES", name: "Sales", nature: "INCOME", ledgers: [{ code: "SALES", name: "Sales" }] },
      {
        code: "SERVICE",
        name: "Service Income",
        nature: "INCOME",
        ledgers: [{ code: "SERVICE_INCOME", name: "Service Income" }],
      },
      {
        code: "INT_INC",
        name: "Interest Income",
        nature: "INCOME",
        ledgers: [{ code: "INTEREST_INCOME", name: "Interest Income" }],
      },
      {
        code: "FARM_INC",
        name: "Farming Income",
        nature: "INCOME",
        ledgers: [{ code: "FARMING_INCOME", name: "Farming Income" }],
      },
      {
        code: "PROP_INC",
        name: "Property Income",
        nature: "INCOME",
        ledgers: [{ code: "PROPERTY_INCOME", name: "Property Income" }],
      },
      {
        code: "OTHER_INC",
        name: "Other Income",
        nature: "INCOME",
        ledgers: [{ code: "OTHER_INCOME", name: "Other Income" }],
      },
    ],
  },
  {
    code: "EXPENSE",
    name: "Expense",
    nature: "EXPENSE",
    children: [
      { code: "PURCHASE", name: "Purchase", nature: "EXPENSE", ledgers: [{ code: "PURCHASE", name: "Purchase" }] },
      {
        code: "FARM_EXP",
        name: "Farming Expense",
        nature: "EXPENSE",
        ledgers: [{ code: "FARMING_EXPENSE", name: "Farming Expense" }],
      },
      {
        code: "PROP_EXP",
        name: "Property Expense",
        nature: "EXPENSE",
        ledgers: [{ code: "PROPERTY_EXPENSE", name: "Property Expense" }],
      },
      { code: "SALARY", name: "Salary", nature: "EXPENSE", ledgers: [{ code: "SALARY", name: "Salary" }] },
      { code: "UTILITIES", name: "Utilities", nature: "EXPENSE", ledgers: [{ code: "UTILITIES", name: "Utilities" }] },
      { code: "TRANSPORT", name: "Transport", nature: "EXPENSE", ledgers: [{ code: "TRANSPORT", name: "Transport" }] },
      {
        code: "PROF_FEE",
        name: "Professional Fee",
        nature: "EXPENSE",
        ledgers: [{ code: "PROFESSIONAL_FEE", name: "Professional Fee" }],
      },
      {
        code: "INT_EXP",
        name: "Interest Expense",
        nature: "EXPENSE",
        ledgers: [{ code: "INTEREST_EXPENSE", name: "Interest Expense" }],
      },
      {
        code: "OTHER_EXP",
        name: "Other Expense",
        nature: "EXPENSE",
        ledgers: [{ code: "OTHER_EXPENSE", name: "Other Expense" }],
      },
    ],
  },
];
