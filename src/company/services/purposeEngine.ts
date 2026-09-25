import type {
  DraftVoucherLine,
  PurposeCode,
  PurposeMeta,
  VoucherType,
} from "@/company/types";
import purposeRules from "../../../config/company-purpose-rules.json";

type PurposeRuleRow = (typeof purposeRules.purposes)[number];

/** Purposes that require an explicit counter ledger — derived from JSON counterStrategy. */
export const EXPLICIT_COUNTER_PURPOSES = new Set<PurposeCode>(
  purposeRules.purposes
    .filter((r) => r.counterStrategy === "EXPLICIT_COUNTER")
    .map((r) => r.key as PurposeCode),
);

function metaFromRule(row: PurposeRuleRow): PurposeMeta {
  const code = row.key as PurposeCode;
  const deprecated = Boolean(row.deprecated);
  const description = deprecated
    ? `${row.displayLabel} (deprecated — prefer a non-legacy purpose).`
    : row.displayLabel;
  return {
    code,
    label: deprecated ? `${row.displayLabel}` : row.displayLabel,
    voucherType: row.voucherType as VoucherType,
    affectsProfit: Boolean(row.affectsProfitHint),
    requiresParty: Boolean(row.requiresParty),
    allowReceived: Boolean(row.allowReceived),
    allowPaid: Boolean(row.allowPaid),
    deprecated: deprecated || undefined,
    explicitCounter: row.counterStrategy === "EXPLICIT_COUNTER" || undefined,
    description,
  };
}

/** Canonical purpose catalogue — built from config/company-purpose-rules.json. */
export const PURPOSE_CATALOGUE: Record<PurposeCode, PurposeMeta> = Object.fromEntries(
  purposeRules.purposes.map((row) => [row.key as PurposeCode, metaFromRule(row)]),
) as Record<PurposeCode, PurposeMeta>;

export const RECEIPT_PURPOSES: PurposeCode[] = Object.values(PURPOSE_CATALOGUE)
  .filter(
    (m) =>
      !m.deprecated &&
      (m.allowReceived === true ||
        (m.allowReceived !== false && m.voucherType === "RECEIPT") ||
        m.code === "SALE"),
  )
  .map((m) => m.code);

export const PAYMENT_PURPOSES: PurposeCode[] = Object.values(PURPOSE_CATALOGUE)
  .filter(
    (m) =>
      !m.deprecated &&
      (m.allowPaid === true || (m.allowPaid !== false && m.voucherType === "PAYMENT")),
  )
  .map((m) => m.code);

export interface PurposeDraftArgs {
  purpose: PurposeCode;
  amountPaise: number;
  /** Cash or bank ledger receiving or paying money. */
  cashBankLedgerId: string;
  /** Counter / party relationship / income-expense / capital / drawings ledger. */
  partyRelationshipLedgerId: string;
  /** Alias for explicit-counter purposes. */
  counterLedgerId?: string;
  /** CONTRA only: source money ledger (credited). Defaults to cashBankLedgerId. */
  fromLedgerId?: string;
  /** CONTRA only: destination money ledger (debited). Defaults to partyRelationshipLedgerId. */
  toLedgerId?: string;
  /** When OTHER is used in quick received/paid, force RECEIPT or PAYMENT shape. */
  quickDirection?: "received" | "paid";
}

function assertPositivePaise(amountPaise: number): void {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("amountPaise must be a positive integer");
  }
}

function ruleFor(purpose: PurposeCode): PurposeRuleRow | undefined {
  return purposeRules.purposes.find((r) => r.key === purpose);
}

/**
 * Thin FE preview mirror of php/helpers/company/posting.php `company_preview_purpose`.
 * Line *shape* (sides + cash/counter slots) must match PHP; ledger resolution stays server-side.
 * CONTRA_EXPLICIT mirrors PHP: throws — UI must supply explicit from/to via dedicated transfer flow.
 */
export function mapPurposeToDraftLines(args: PurposeDraftArgs): DraftVoucherLine[] {
  const { purpose, amountPaise, cashBankLedgerId } = args;
  assertPositivePaise(amountPaise);

  const meta = PURPOSE_CATALOGUE[purpose];
  if (!meta) throw new Error(`Unknown purpose: ${purpose}`);
  if (meta.deprecated) {
    const row = ruleFor(purpose);
    const repl = (row as { replacedBy?: string } | undefined)?.replacedBy ?? "OTHER_PAYMENT";
    throw new Error(`This purpose was retired. Use ${repl} instead`);
  }

  const rule = ruleFor(purpose);
  const strategy = rule?.counterStrategy ?? "";

  if (strategy === "CONTRA_EXPLICIT" || purpose === "CONTRA") {
    // Match PHP: CONTRA requires explicit from/to — transfer UI builds lines itself.
    const fromId = args.fromLedgerId ?? cashBankLedgerId;
    const toId = args.toLedgerId ?? args.counterLedgerId ?? args.partyRelationshipLedgerId;
    if (!fromId || !toId) throw new Error("CONTRA requires from and to money ledgers");
    if (fromId === toId) throw new Error("CONTRA from and to ledgers must differ");
    return [
      { ledgerId: toId, side: "DEBIT", amountPaise, role: "to", purposeCode: purpose },
      { ledgerId: fromId, side: "CREDIT", amountPaise, role: "from", purposeCode: purpose },
    ];
  }

  const counterId = args.counterLedgerId || args.partyRelationshipLedgerId;

  if (meta.explicitCounter || EXPLICIT_COUNTER_PURPOSES.has(purpose)) {
    if (!counterId) {
      throw new Error(`counterLedgerId required for purpose ${purpose} (use server preview)`);
    }
  }

  if (!counterId) throw new Error("partyRelationshipLedgerId / counterLedgerId required");

  const voucherType = resolveVoucherType(purpose, args.quickDirection);
  const direction = String(rule?.direction ?? "").toUpperCase();
  const isReceipt =
    direction === "RECEIVED" || voucherType === "RECEIPT" || voucherType === "SALE";

  if (isReceipt) {
    return [
      {
        ledgerId: cashBankLedgerId,
        side: "DEBIT",
        amountPaise,
        role: "cash_bank",
        purposeCode: purpose,
      },
      {
        ledgerId: counterId,
        side: "CREDIT",
        amountPaise,
        role: "counter",
        purposeCode: purpose,
      },
    ];
  }

  return [
    {
      ledgerId: counterId,
      side: "DEBIT",
      amountPaise,
      role: "counter",
      purposeCode: purpose,
    },
    {
      ledgerId: cashBankLedgerId,
      side: "CREDIT",
      amountPaise,
      role: "cash_bank",
      purposeCode: purpose,
    },
  ];
}

export function resolveVoucherType(
  purpose: PurposeCode,
  quickDirection?: "received" | "paid",
): VoucherType {
  const rule = ruleFor(purpose);
  if (purpose === "CONTRA" || rule?.counterStrategy === "CONTRA_EXPLICIT") return "CONTRA";
  if (rule?.voucherType) {
    const vt = rule.voucherType as VoucherType;
    if (vt === "RECEIPT" || vt === "PAYMENT" || vt === "SALE" || vt === "PURCHASE" || vt === "JOURNAL") {
      if (purpose === "OTHER_RECEIPT" || quickDirection === "received") return "RECEIPT";
      if (purpose === "OTHER_PAYMENT" || quickDirection === "paid") return "PAYMENT";
      return vt;
    }
  }
  return PURPOSE_CATALOGUE[purpose].voucherType;
}

export function purposeAffectsProfit(purpose: PurposeCode): boolean {
  return PURPOSE_CATALOGUE[purpose]?.affectsProfit ?? false;
}

export function getPurposesForVoucherType(voucherType: VoucherType): PurposeMeta[] {
  if (voucherType === "RECEIPT") {
    return RECEIPT_PURPOSES.map((c) => PURPOSE_CATALOGUE[c]);
  }
  if (voucherType === "PAYMENT") {
    return PAYMENT_PURPOSES.map((c) => PURPOSE_CATALOGUE[c]);
  }
  if (voucherType === "CONTRA") return [PURPOSE_CATALOGUE.CONTRA];
  return Object.values(PURPOSE_CATALOGUE).filter((m) => !m.deprecated);
}

/** Estimate P&L impact in paise from draft lines given ledger natures. */
export function estimateProfitImpactPaise(
  lines: DraftVoucherLine[],
  natureByLedgerId: Record<string, "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE">,
): number {
  let income = 0;
  let expense = 0;
  for (const line of lines) {
    const nature = natureByLedgerId[line.ledgerId];
    if (nature === "INCOME") {
      if (line.side === "CREDIT") income += line.amountPaise;
      else income -= line.amountPaise;
    } else if (nature === "EXPENSE") {
      if (line.side === "DEBIT") expense += line.amountPaise;
      else expense -= line.amountPaise;
    }
  }
  return income - expense;
}
