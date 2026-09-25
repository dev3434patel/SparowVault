import type {
  CompanyWorkspace,
  CompanyParty,
  CompanyLedger,
  CompanyVoucher,
} from "@/company/types";

export const BASE = "/api/company";

export type DimensionKind = "business-units" | "branches" | "areas" | "projects" | "cost-centres";

export type PartyCategoryRow = {
  id: string;
  companyId: string;
  name: string;
  memberCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PartyCategoryMember = {
  id: string;
  displayName: string;
  mobile?: string | null;
  active?: boolean;
};

export function mapWorkspace(row: Record<string, unknown>): CompanyWorkspace {
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id ?? row.ownerUserId ?? ""),
    legalName: String(row.legal_name ?? row.legalName ?? ""),
    displayName: String(row.display_name ?? row.displayName ?? ""),
    businessType: (row.business_type ?? row.businessType) as string | undefined,
    registrationType: (row.registration_type ?? row.registrationType) as string | undefined,
    gstEnabled: Boolean(row.gst_enabled ?? row.gstEnabled ?? false),
    gstin: (row.gstin as string | null) ?? null,
    pan: (row.pan as string | null) ?? null,
    cin: (row.cin as string | null) ?? null,
    address: (row.address as string) ?? undefined,
    state: (row.state as string) ?? undefined,
    country: String(row.country ?? "IN"),
    currency: String(row.currency ?? "INR"),
    financialYearStartMonth: Number(row.financial_year_start_month ?? row.financialYearStartMonth ?? 4),
    booksStartDate: String(row.books_start_date ?? row.booksStartDate ?? ""),
    timezone: String(row.timezone ?? "Asia/Kolkata"),
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    status: (row.status as CompanyWorkspace["status"]) ?? "ACTIVE",
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
  };
}

export function mapParty(row: Record<string, unknown>, companyId?: string): CompanyParty {
  const rolesRaw = row.roles;
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw.map((r) => (typeof r === "string" ? r : String((r as { role_code?: string }).role_code ?? r)))
    : [];
  return {
    id: String(row.id),
    companyId: String(row.company_id ?? row.companyId ?? companyId ?? ""),
    displayName: String(row.display_name ?? row.displayName ?? ""),
    legalName: (row.legal_name ?? row.legalName) as string | null | undefined,
    partyType: ((row.party_type ?? row.partyType) as CompanyParty["partyType"]) ?? "PERSON",
    mobile: (row.mobile as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    areaId: (row.area_id ?? row.areaId) as string | null | undefined,
    gstin: (row.gstin as string | null) ?? null,
    pan: (row.pan as string | null) ?? null,
    openingBalancePaise: Number(row.opening_balance_paise ?? row.openingBalancePaise ?? 0),
    openingBalanceSide: (row.opening_balance_side ?? row.openingBalanceSide) as CompanyParty["openingBalanceSide"],
    defaultCreditDays: (row.default_credit_days ?? row.defaultCreditDays) as number | null | undefined,
    creditLimitPaise: (row.credit_limit_paise ?? row.creditLimitPaise) as number | null | undefined,
    active: Boolean(Number(row.active ?? 1)),
    notes: (row.notes as string) ?? undefined,
    roles: roles as CompanyParty["roles"],
    categoryIds: [],
    tagIds: [],
    receivableOutstandingPaise: Number(
      row.receivable_outstanding_paise ?? row.receivableOutstandingPaise ?? 0,
    ),
    payableOutstandingPaise: Number(row.payable_outstanding_paise ?? row.payableOutstandingPaise ?? 0),
    netBalancePaise: Number(row.net_balance_paise ?? row.netBalancePaise ?? 0),
  };
}

export function mapLedger(row: Record<string, unknown>, companyId?: string): CompanyLedger {
  return {
    id: String(row.id),
    companyId: String(row.company_id ?? row.companyId ?? companyId ?? ""),
    groupId: String(row.group_id ?? row.groupId ?? ""),
    name: String(row.name ?? ""),
    code: String(row.code ?? ""),
    nature: (row.nature as CompanyLedger["nature"]) ?? "ASSET",
    isCashBank: Boolean(Number(row.is_cash_bank ?? row.isCashBank ?? 0)),
    isPartyControl: Boolean(Number(row.is_party_control ?? row.isPartyControl ?? 0)),
    active: Boolean(Number(row.active ?? 1)),
  };
}

export function mapVoucher(row: Record<string, unknown>): CompanyVoucher {
  const linesRaw = Array.isArray(row.lines) ? row.lines : [];
  return {
    id: String(row.id),
    companyId: String(row.company_id ?? row.companyId ?? ""),
    voucherNumber: String(row.voucher_number ?? row.voucherNumber ?? ""),
    voucherType: (row.voucher_type ?? row.voucherType) as CompanyVoucher["voucherType"],
    voucherDate: String(row.voucher_date ?? row.voucherDate ?? ""),
    effectiveDate: (row.effective_date ?? row.effectiveDate) as string | null | undefined,
    partyId: (row.party_id ?? row.partyId) as string | null | undefined,
    businessUnitId: (row.business_unit_id ?? row.businessUnitId) as string | null | undefined,
    branchId: (row.branch_id ?? row.branchId) as string | null | undefined,
    areaId: (row.area_id ?? row.areaId) as string | null | undefined,
    projectId: (row.project_id ?? row.projectId) as string | null | undefined,
    costCentreId: (row.cost_centre_id ?? row.costCentreId) as string | null | undefined,
    narration: (row.narration as string) ?? undefined,
    referenceNumber: (row.reference_number ?? row.referenceNumber) as string | null | undefined,
    externalReference: (row.external_reference ?? row.externalReference) as string | null | undefined,
    purposeCode: (row.purpose ?? row.purposeCode) as CompanyVoucher["purposeCode"],
    status: (row.status as CompanyVoucher["status"]) ?? "POSTED",
    createdBy: String(row.created_by ?? row.createdBy ?? ""),
    approvedBy: (row.approved_by ?? row.approvedBy) as string | null | undefined,
    reversedVoucherId: (row.reversed_voucher_id ?? row.reversedVoucherId) as string | null | undefined,
    correctionOfVoucherId: (row.correction_of_voucher_id ?? row.correctionOfVoucherId) as string | null | undefined,
    mutationId: String(row.mutation_id ?? row.mutationId ?? ""),
    postedAt: (row.posted_at ?? row.postedAt) as string | null | undefined,
    lines: linesRaw.map((l, i) => {
      const line = l as Record<string, unknown>;
      return {
        id: line.id ? String(line.id) : undefined,
        companyId: line.company_id ? String(line.company_id) : undefined,
        voucherId: line.voucher_id ? String(line.voucher_id) : undefined,
        lineNo: Number(line.line_no ?? line.lineNo ?? i + 1),
        ledgerId: String(line.ledger_id ?? line.ledgerId ?? ""),
        side: (line.side as "DEBIT" | "CREDIT") ?? "DEBIT",
        amountPaise: Number(line.amount_paise ?? line.amountPaise ?? 0),
        partyRelationshipId: (line.party_relationship_id ?? line.partyRelationshipId) as string | null | undefined,
        costCentreId: (line.cost_centre_id ?? line.costCentreId) as string | null | undefined,
        projectId: (line.project_id ?? line.projectId) as string | null | undefined,
        areaId: (line.area_id ?? line.areaId) as string | null | undefined,
        narration: (line.narration as string) ?? undefined,
        ledgerName: (line.ledger_name ?? line.ledgerName) as string | undefined,
        ledgerCode: (line.ledger_code ?? line.ledgerCode) as string | undefined,
      };
    }),
  };
}

export interface VoucherPreviewLine {
  ledgerId: string;
  side: "DEBIT" | "CREDIT";
  amountPaise: number;
  partyRelationshipId?: string | null;
  ledgerName?: string;
  ledgerCode?: string;
}

export interface VoucherPreviewPayload {
  lines: VoucherPreviewLine[];
  previewHash?: string;
  profitImpactPaise?: number;
  [key: string]: unknown;
}
