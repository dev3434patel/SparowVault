/**
 * Phase 16 - persona inference, persona-aware ranking, deterministic coach
 * surfaces, and AI guardrails. AI may reword these outputs, but it must not
 * calculate, invent numbers, or recommend regulated products.
 */
import type {
  Account,
  AiSuggestion,
  AiSuggestionSeverity,
  AiSuggestionType,
  Card,
  Loan,
  Transaction,
  UdhariRecord,
} from "@/types";
import { transactionAmountPaise } from "@/utils/money";

export type Persona =
  | "student"
  | "salaried"
  | "freelancer"
  | "small_business"
  | "family"
  | "high_net_worth"
  | "cash_heavy"
  | "debt_heavy";

export interface PersonaSignals {
  monthlyIncomePaise: number;
  monthlyExpensePaise: number;
  netDebtPaise: number;
  liquidAssetsPaise: number;
  cashShareRatio: number;
  businessShareRatio: number;
  hasLoans: boolean;
  hasCardOutstanding: boolean;
}

export interface PersonaResult {
  primary: Persona;
  secondary?: Persona;
  confidence: number;
  signals: PersonaSignals;
  reason: string;
}

export const PERSONA_LABELS: Record<Persona, string> = {
  student: "Student",
  salaried: "Salaried",
  freelancer: "Freelancer",
  small_business: "Small business",
  family: "Family",
  high_net_worth: "High net worth",
  cash_heavy: "Cash heavy",
  debt_heavy: "Debt heavy",
};

function activeRecord<T extends { isDeleted?: number }>(row: T): boolean {
  return row.isDeleted !== 1;
}

export function buildPersonaSignals(input: {
  transactions: Transaction[];
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  udharis: UdhariRecord[];
  now?: Date;
}): PersonaSignals {
  const now = input.now ?? new Date();
  const cutoffMs = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();
  const recent = input.transactions.filter((t) => {
    if (t.isDeleted === 1) return false;
    const ts = new Date(t.date).getTime();
    return Number.isFinite(ts) && ts >= cutoffMs;
  });

  let incomePaise = 0;
  let expensePaise = 0;
  let cashTxs = 0;
  let businessTxs = 0;

  for (const t of recent) {
    const amountPaise = transactionAmountPaise(t);
    if (t.type === "income" || t.type === "refund") incomePaise += amountPaise;
    if (t.type === "expense") expensePaise += amountPaise;
    if (t.paymentMode === "cash") cashTxs += 1;
    if (t.businessOrPersonal === "business" || t.businessOrPersonal === "mixed") {
      businessTxs += 1;
    }
  }

  const liquidAssetsPaise =
    input.accounts.filter(activeRecord).reduce((sum, account) => {
      const balances = account as { closingBalancePaise?: number; openingBalancePaise?: number };
      return sum + (balances.closingBalancePaise ?? balances.openingBalancePaise ?? 0);
    }, 0) +
    input.udharis
      .filter((u) => activeRecord(u) && (u as { direction?: "given" | "received" }).direction === "given")
      .reduce((sum, u) => sum + ((u as { outstandingPaise?: number }).outstandingPaise ?? 0), 0);

  const cardOutstandingPaise = input.cards
    .filter(activeRecord)
    .reduce((sum, card) => sum + ((card as { outstandingPaise?: number }).outstandingPaise ?? 0), 0);
  const loanPrincipalPaise = input.loans
    .filter(activeRecord)
    .reduce((sum, loan) => sum + ((loan as { currentPrincipalPaise?: number }).currentPrincipalPaise ?? 0), 0);
  const udhariPayablePaise = input.udharis
    .filter((u) => activeRecord(u) && (u as { direction?: "given" | "received" }).direction === "received")
    .reduce((sum, u) => sum + ((u as { outstandingPaise?: number }).outstandingPaise ?? 0), 0);

  return {
    monthlyIncomePaise: Math.round(incomePaise / 3),
    monthlyExpensePaise: Math.round(expensePaise / 3),
    netDebtPaise: cardOutstandingPaise + loanPrincipalPaise + udhariPayablePaise,
    liquidAssetsPaise,
    cashShareRatio: recent.length ? cashTxs / recent.length : 0,
    businessShareRatio: recent.length ? businessTxs / recent.length : 0,
    hasLoans: input.loans.some(activeRecord),
    hasCardOutstanding: cardOutstandingPaise > 0,
  };
}

export function inferPersona(signals: PersonaSignals, selectedPersona?: Persona | "auto"): PersonaResult {
  if (selectedPersona && selectedPersona !== "auto") {
    return {
      primary: selectedPersona,
      confidence: 1,
      signals,
      reason: "User selected this coaching mode.",
    };
  }

  const income = Math.max(1, signals.monthlyIncomePaise);
  const debtMonths = signals.netDebtPaise / income;
  let primary: Persona = "salaried";
  let secondary: Persona | undefined;
  let confidence = 0.5;
  let reason = "Default salary-style coaching fits the available data.";

  if (debtMonths >= 6) {
    primary = "debt_heavy";
    confidence = Math.min(1, 0.5 + (debtMonths - 6) / 12);
    reason = "Debt is at least six months of current monthly income.";
  } else if (signals.cashShareRatio >= 0.7) {
    primary = "cash_heavy";
    confidence = signals.cashShareRatio;
    reason = "Most recent transactions are cash-based.";
  } else if (signals.businessShareRatio >= 0.3) {
    primary = signals.businessShareRatio >= 0.6 ? "small_business" : "freelancer";
    confidence = Math.min(1, 0.5 + signals.businessShareRatio);
    reason = "Business-marked transactions are a large share of recent activity.";
  } else if (signals.liquidAssetsPaise >= income * 50) {
    primary = "high_net_worth";
    confidence = 0.9;
    reason = "Liquid assets are high compared with monthly income.";
  } else if (signals.monthlyIncomePaise < 1_500_000) {
    primary = "student";
    confidence = 0.7;
    reason = "Monthly income is below the student/low-income coaching threshold.";
  } else {
    primary = "salaried";
    confidence = 0.6;
    if (signals.monthlyExpensePaise > signals.monthlyIncomePaise * 1.3) secondary = "family";
  }

  if (primary !== "debt_heavy" && (signals.hasCardOutstanding || signals.hasLoans) && debtMonths >= 2) {
    secondary ??= "debt_heavy";
  }

  return { primary, secondary, confidence, signals, reason };
}

export type SuggestionTopic =
  | "safe_daily_spend"
  | "credit_card"
  | "loan"
  | "udhari"
  | "subscription"
  | "tax"
  | "missing_bill"
  | "emergency_fund"
  | "goal"
  | "budget"
  | "investment"
  | "net_worth";

const RANKING: Record<Persona, SuggestionTopic[]> = {
  student: ["safe_daily_spend", "udhari", "emergency_fund", "budget", "subscription"],
  salaried: ["budget", "goal", "credit_card", "loan", "emergency_fund", "subscription"],
  freelancer: ["tax", "missing_bill", "budget", "credit_card", "udhari", "goal"],
  small_business: ["missing_bill", "tax", "safe_daily_spend", "udhari", "budget", "credit_card", "loan", "net_worth"],
  family: ["goal", "budget", "credit_card", "loan", "emergency_fund"],
  high_net_worth: ["net_worth", "safe_daily_spend", "investment", "goal", "tax"],
  cash_heavy: ["safe_daily_spend", "missing_bill", "budget", "udhari"],
  debt_heavy: ["credit_card", "loan", "safe_daily_spend", "budget", "emergency_fund"],
};

export function rankTopicsForPersona(persona: Persona): SuggestionTopic[] {
  return RANKING[persona] ?? RANKING.salaried;
}

export function topicForSuggestionType(type: AiSuggestionType): SuggestionTopic {
  switch (type) {
    case "cashflow":
      return "safe_daily_spend";
    case "credit_card":
    case "loan":
    case "udhari":
    case "subscription":
    case "tax":
    case "missing_bill":
    case "emergency_fund":
    case "goal":
    case "budget":
    case "net_worth":
      return type;
    case "investment_tracking_only":
      return "investment";
    default:
      return "budget";
  }
}

function severityRank(severity?: AiSuggestionSeverity): number {
  if (severity === "danger") return 0;
  if (severity === "warning") return 1;
  if (severity === "opportunity") return 2;
  return 3;
}

export function rankSuggestionsForPersona<
  T extends {
    topic?: SuggestionTopic;
    suggestionType?: AiSuggestionType;
    severity?: AiSuggestionSeverity;
    confidenceScore?: number;
  },
>(suggestions: T[], persona: Persona): T[] {
  const order = rankTopicsForPersona(persona);
  const rank = new Map(order.map((topic, index) => [topic, index] as const));

  return suggestions
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aTopic = a.item.topic ?? (a.item.suggestionType ? topicForSuggestionType(a.item.suggestionType) : undefined);
      const bTopic = b.item.topic ?? (b.item.suggestionType ? topicForSuggestionType(b.item.suggestionType) : undefined);
      const aRank = aTopic ? rank.get(aTopic) ?? 999 : 999;
      const bRank = bTopic ? rank.get(bTopic) ?? 999 : 999;
      if (aRank !== bRank) return aRank - bRank;
      const aSeverity = severityRank(a.item.severity);
      const bSeverity = severityRank(b.item.severity);
      if (aSeverity !== bSeverity) return aSeverity - bSeverity;
      const aConfidence = a.item.confidenceScore ?? 0;
      const bConfidence = b.item.confidenceScore ?? 0;
      if (aConfidence !== bConfidence) return bConfidence - aConfidence;
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

export type CoachSurfaceKey =
  | "top_3_actions_today"
  | "weekly_money_review"
  | "monthly_closing_summary"
  | "debt_action_plan"
  | "goal_action_plan"
  | "cashflow_danger_warning";

export interface CoachMessage {
  id: string;
  surface: CoachSurfaceKey;
  title: string;
  message: string;
  sourceData: Record<string, unknown>;
  calculation: string;
  confidence: number;
  recommendedAction: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  suggestionIds: string[];
}

export interface PersonaCoachSurfaces {
  persona: PersonaResult;
  rankedSuggestions: AiSuggestion[];
  top3ActionsToday: CoachMessage[];
  weeklyMoneyReview: CoachMessage;
  monthlyClosingSummary: CoachMessage;
  debtActionPlan?: CoachMessage;
  goalActionPlan?: CoachMessage;
  cashflowDangerWarning?: CoachMessage;
}

function riskFromSeverity(severity?: AiSuggestionSeverity): CoachMessage["riskLevel"] {
  if (severity === "danger") return "critical";
  if (severity === "warning") return "high";
  if (severity === "opportunity") return "medium";
  return "low";
}

function coachMessageFromSuggestion(
  suggestion: AiSuggestion,
  surface: CoachSurfaceKey,
  titlePrefix?: string,
): CoachMessage {
  return {
    id: `${surface}:${suggestion.id}`,
    surface,
    title: titlePrefix ? `${titlePrefix}: ${suggestion.title}` : suggestion.title,
    message: suggestion.reason,
    sourceData: suggestion.calculationInputsJson,
    calculation: `Source module ${suggestion.sourceModule}; deterministic type ${suggestion.suggestionType}.`,
    confidence: suggestion.confidenceScore,
    recommendedAction: suggestion.recommendedAction,
    riskLevel: riskFromSeverity(suggestion.severity),
    suggestionIds: [suggestion.id],
  };
}

function summaryMessage(input: {
  surface: CoachSurfaceKey;
  title: string;
  message: string;
  signals: PersonaSignals;
  confidence: number;
  recommendedAction: string;
  riskLevel: CoachMessage["riskLevel"];
  suggestionIds?: string[];
}): CoachMessage {
  return {
    id: input.surface,
    surface: input.surface,
    title: input.title,
    message: input.message,
    sourceData: {
      monthlyIncomePaise: input.signals.monthlyIncomePaise,
      monthlyExpensePaise: input.signals.monthlyExpensePaise,
      netDebtPaise: input.signals.netDebtPaise,
      liquidAssetsPaise: input.signals.liquidAssetsPaise,
      cashShareRatio: input.signals.cashShareRatio,
      businessShareRatio: input.signals.businessShareRatio,
    },
    calculation: "Derived from persona signals built from recent transactions, accounts, cards, loans, and udhari records.",
    confidence: input.confidence,
    recommendedAction: input.recommendedAction,
    riskLevel: input.riskLevel,
    suggestionIds: input.suggestionIds ?? [],
  };
}

export function buildPersonaCoachSurfaces(input: {
  persona: PersonaResult;
  suggestions: AiSuggestion[];
}): PersonaCoachSurfaces {
  const active = input.suggestions.filter((suggestion) => suggestion.status === "active");
  const rankedSuggestions = rankSuggestionsForPersona(active, input.persona.primary);
  const signals = input.persona.signals;
  const top3ActionsToday = rankedSuggestions
    .slice(0, 3)
    .map((suggestion) => coachMessageFromSuggestion(suggestion, "top_3_actions_today", "Do today"));

  const cashflowSuggestion = rankedSuggestions.find(
    (suggestion) => suggestion.suggestionType === "cashflow" && suggestion.severity !== "info",
  );
  const debtSuggestion = rankedSuggestions.find(
    (suggestion) => suggestion.suggestionType === "credit_card" || suggestion.suggestionType === "loan",
  );
  const goalSuggestion = rankedSuggestions.find((suggestion) => suggestion.suggestionType === "goal");

  const weeklyMoneyReview = summaryMessage({
    surface: "weekly_money_review",
    title: "Weekly money review",
    message: `Review ${top3ActionsToday.length || rankedSuggestions.length} priority item(s) for ${PERSONA_LABELS[input.persona.primary]} mode.`,
    signals,
    confidence: input.persona.confidence,
    recommendedAction: top3ActionsToday[0]?.recommendedAction ?? "Refresh suggestions after adding this week's transactions.",
    riskLevel: rankedSuggestions.some((s) => s.severity === "danger")
      ? "critical"
      : rankedSuggestions.some((s) => s.severity === "warning")
        ? "high"
        : "medium",
    suggestionIds: rankedSuggestions.slice(0, 5).map((suggestion) => suggestion.id),
  });

  const monthlyClosingSummary = summaryMessage({
    surface: "monthly_closing_summary",
    title: "Monthly closing summary",
    message: "Close the month by checking cashflow, debt, goals, missing bills, and subscriptions before reports are exported.",
    signals,
    confidence: input.persona.confidence,
    recommendedAction: "Resolve high-risk suggestions first, then review tax/report suggestions before export.",
    riskLevel: signals.monthlyExpensePaise > signals.monthlyIncomePaise ? "high" : "medium",
    suggestionIds: rankedSuggestions.map((suggestion) => suggestion.id),
  });

  return {
    persona: input.persona,
    rankedSuggestions,
    top3ActionsToday,
    weeklyMoneyReview,
    monthlyClosingSummary,
    debtActionPlan: debtSuggestion ? coachMessageFromSuggestion(debtSuggestion, "debt_action_plan", "Debt action") : undefined,
    goalActionPlan: goalSuggestion ? coachMessageFromSuggestion(goalSuggestion, "goal_action_plan", "Goal action") : undefined,
    cashflowDangerWarning: cashflowSuggestion
      ? coachMessageFromSuggestion(cashflowSuggestion, "cashflow_danger_warning", "Cashflow warning")
      : undefined,
  };
}

const FORBIDDEN_AI_PATTERNS = [
  /\b(?:buy|sell|short|long)\s+(?:[A-Z]{2,5}|nifty|sensex|tcs|reliance|hdfc|sbi|infosys)\b/i,
  /\bsip\s+in\s+\w+/i,
  /\binvest\s+in\s+\w+\s+(?:fund|stock|crypto|nft)\b/i,
  /\b(?:should|recommend|advise)\s+(?:i|you)\s+(?:buy|sell)\b/i,
  /\b(?:buy|sell|switch|redeem|subscribe to|invest in)\b[\s\S]{0,60}\b(?:stock|share|mutual fund|sip|crypto|bitcoin|etf|nft)\b/i,
  /\b(?:take|apply for|choose|switch to)\b[\s\S]{0,60}\b(?:loan|credit card|card)\b/i,
  /\b(?:guaranteed|sure[- ]?shot|risk[- ]?free|cannot lose|will definitely)\b/i,
];

export interface AiGuardResult {
  ok: boolean;
  violations: string[];
}

export interface AiGuardrailOptions {
  allowedNumbers?: Array<number | string>;
  allowUnsupportedCalculations?: boolean;
}

function normalizeNumberToken(value: number | string): string {
  return String(value).replace(/,/g, "").replace(/%$/, "");
}

export function aiGuardrails(text: string, options: AiGuardrailOptions = {}): AiGuardResult {
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_AI_PATTERNS) {
    if (pattern.test(text)) violations.push(pattern.source);
  }

  if (options.allowedNumbers) {
    const allowed = new Set(options.allowedNumbers.map(normalizeNumberToken));
    for (const match of text.matchAll(/(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?%?/g)) {
      const token = normalizeNumberToken(match[0]);
      if (!allowed.has(token)) violations.push(`unsupported_number:${match[0]}`);
    }
  }

  if (!options.allowUnsupportedCalculations && /\b(?:i calculated|my calculation|projected return|guaranteed saving)\b/i.test(text)) {
    violations.push("unsupported_calculation_claim");
  }

  return { ok: violations.length === 0, violations };
}
