/** SparowVault Company domain types — money is always integer paise. */

export type AccountNature = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export type LineSide = "DEBIT" | "CREDIT";

export type VoucherType =
  | "RECEIPT"
  | "PAYMENT"
  | "CONTRA"
  | "JOURNAL"
  | "PURCHASE"
  | "SALE"
  | "DEBIT_NOTE"
  | "CREDIT_NOTE"
  | "OPENING_BALANCE"
  | "ADJUSTMENT";

export type VoucherStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "POSTED"
  | "REJECTED"
  | "CANCELLED"
  | "REVERSED";

export type { CompanyPermission, PurposeCode } from "@/company/types/domainCodes";

export type SystemRoleCode =
  | "COMPANY_OWNER"
  | "SUPER_ADMIN"
  | "ACCOUNTANT"
  | "MANAGER"
  | "DATA_ENTRY"
  | "VIEWER"
  | "AUDITOR";

export type MembershipStatus = "INVITED" | "ACTIVE" | "SUSPENDED";

export type WorkspaceStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

export type PartyType = "PERSON" | "BUSINESS" | "OTHER";

export type PartyRoleCode =
  | "LENDER"
  | "BORROWER"
  | "VENDOR"
  | "CUSTOMER"
  | "FARMER"
  | "EMPLOYEE"
  | "CONTRACTOR"
  | "PARTNER"
  | "LAND_OWNER"
  | "PROPERTY_PARTY"
  | "OTHER";

export type BillRefStatus = "OPEN" | "PARTIAL" | "SETTLED" | "CANCELLED";

export type BillAllocationType =
  | "NEW_REFERENCE"
  | "AGAINST_REFERENCE"
  | "ADVANCE"
  | "ON_ACCOUNT";

export type ReportKey =
  | "day-book"
  | "cash-book"
  | "bank-book"
  | "party-ledger"
  | "ledger-statement"
  | "group-summary"
  | "receipts-payments"
  | "receivables"
  | "payables"
  | "outstanding-ageing"
  | "trial-balance"
  | "profit-loss"
  | "balance-sheet"
  | "cash-flow"
  | "project-report"
  | "business-report"
  | "area-report"
  | "category-report"
  | "user-entry-report"
  | "audit-report";

export type AgeingBucketKey =
  | "not_due"
  | "0_15"
  | "16_30"
  | "31_60"
  | "61_90"
  | "90_plus";

export interface CompanyWorkspace {
  id: string;
  ownerUserId: string;
  legalName: string;
  displayName: string;
  businessType?: string;
  registrationType?: string;
  gstEnabled: boolean;
  gstin?: string | null;
  pan?: string | null;
  cin?: string | null;
  address?: string;
  state?: string;
  country?: string;
  currency: string;
  financialYearStartMonth: number;
  booksStartDate: string;
  timezone: string;
  phone?: string | null;
  email?: string | null;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyRole {
  id: string;
  companyId: string;
  code: SystemRoleCode | string;
  name: string;
  isSystem: boolean;
  permissions: CompanyPermission[];
}

export interface CompanyMembership {
  id: string;
  companyId: string;
  userId: string;
  status: MembershipStatus;
  joinedAt?: string | null;
  displayName?: string;
  roles: CompanyRole[];
  companyDisplayName?: string;
}

export interface CompanyParty {
  id: string;
  companyId: string;
  displayName: string;
  legalName?: string | null;
  partyType: PartyType;
  mobile?: string | null;
  email?: string | null;
  areaId?: string | null;
  gstin?: string | null;
  pan?: string | null;
  openingBalancePaise: number;
  openingBalanceSide?: LineSide | null;
  defaultCreditDays?: number | null;
  creditLimitPaise?: number | null;
  active: boolean;
  notes?: string;
  roles: PartyRoleCode[];
  categoryIds: string[];
  tagIds: string[];
  /** Open receivable outstanding (they owe you), paise */
  receivableOutstandingPaise?: number;
  /** Open payable outstanding (you owe them), paise */
  payableOutstandingPaise?: number;
  /** Receivable − Payable, paise */
  netBalancePaise?: number;
}

export interface AccountGroup {
  id: string;
  companyId: string;
  parentId?: string | null;
  name: string;
  code: string;
  nature: AccountNature;
  isSystem: boolean;
}

export interface CompanyLedger {
  id: string;
  companyId: string;
  groupId: string;
  name: string;
  code: string;
  nature: AccountNature;
  isCashBank: boolean;
  isPartyControl: boolean;
  active: boolean;
}

export interface PartyRelationshipAccount {
  id: string;
  companyId: string;
  partyId: string;
  ledgerId: string;
  relationshipCode: string;
  label: string;
}

export interface VoucherLine {
  id?: string;
  companyId?: string;
  voucherId?: string;
  lineNo: number;
  ledgerId: string;
  side: LineSide;
  amountPaise: number;
  partyRelationshipId?: string | null;
  costCentreId?: string | null;
  projectId?: string | null;
  areaId?: string | null;
  narration?: string;
  ledgerName?: string;
  ledgerCode?: string;
}

export interface CompanyVoucher {
  id: string;
  companyId: string;
  voucherNumber: string;
  voucherType: VoucherType;
  voucherDate: string;
  effectiveDate?: string | null;
  partyId?: string | null;
  businessUnitId?: string | null;
  branchId?: string | null;
  areaId?: string | null;
  projectId?: string | null;
  costCentreId?: string | null;
  narration?: string;
  referenceNumber?: string | null;
  externalReference?: string | null;
  purposeCode?: PurposeCode | null;
  status: VoucherStatus;
  createdBy: string;
  approvedBy?: string | null;
  reversedVoucherId?: string | null;
  correctionOfVoucherId?: string | null;
  mutationId: string;
  postedAt?: string | null;
  lines: VoucherLine[];
}

export interface BillRef {
  id: string;
  companyId: string;
  partyId: string;
  refType: string;
  refNumber: string;
  billDate: string;
  dueDate?: string | null;
  originalAmountPaise: number;
  outstandingPaise: number;
  side: "RECEIVABLE" | "PAYABLE";
  status: BillRefStatus;
  projectId?: string | null;
  businessUnitId?: string | null;
}

export interface BillAllocation {
  id: string;
  companyId: string;
  billRefId: string;
  voucherId: string;
  voucherLineId?: string | null;
  amountPaise: number;
  allocationType: BillAllocationType;
}

export interface BusinessUnit {
  id: string;
  companyId: string;
  name: string;
  code: string;
  active: boolean;
}

export interface Area {
  id: string;
  companyId: string;
  parentId?: string | null;
  name: string;
  code: string;
  active: boolean;
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  code: string;
  businessUnitId?: string | null;
  active: boolean;
}

export interface CostCentre {
  id: string;
  companyId: string;
  name: string;
  code: string;
  active: boolean;
}

export interface PartyCategory {
  id: string;
  companyId: string;
  name: string;
  code: string;
}

export interface DraftVoucherLine {
  ledgerId: string;
  side: LineSide;
  amountPaise: number;
  role?: "cash_bank" | "counter" | "from" | "to";
  purposeCode?: PurposeCode;
  narration?: string;
}

export interface PurposeMeta {
  code: PurposeCode;
  label: string;
  voucherType: VoucherType;
  /** When true, counter line uses an income/expense nature (P&L impact). */
  affectsProfit: boolean;
  requiresParty: boolean;
  description: string;
  /** Shown on Money Received quick entry when true (defaults from voucherType). */
  allowReceived?: boolean;
  /** Shown on Money Paid quick entry when true (defaults from voucherType). */
  allowPaid?: boolean;
  /** Prefer OTHER_RECEIPT / OTHER_PAYMENT / property subtypes instead. */
  deprecated?: boolean;
  /** Requires explicit counterLedgerId — client draft mapper throws; use server preview. */
  explicitCounter?: boolean;
}
