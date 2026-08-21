/**
 * Phase 11 — Persist deterministic suggestions with idempotent upserts.
 */

import { isAfter, parseISO } from "date-fns";
import { aiSuggestionRepo } from "@/repositories";
import type { AiSuggestion, AiSuggestionHistoryEvent, AiSuggestionStatus } from "@/types";
import {
  buildSuggestionDrafts,
  stableCalculationJson,
  type SuggestionEngineInput,
} from "@/services/suggestionEngine";

function sameCalendarMonth(iso: string, ref: Date): boolean {
  const d = parseISO(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function asCalcRecord(s: AiSuggestion): Record<string, unknown> {
  const v = s.calculationInputsJson;
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

export function appendSuggestionHistory(
  suggestion: Pick<AiSuggestion, "historyJson">,
  type: AiSuggestionHistoryEvent["type"],
  at: Date = new Date(),
  detail?: string,
): AiSuggestionHistoryEvent[] {
  const current = Array.isArray(suggestion.historyJson) ? suggestion.historyJson : [];
  return [...current, { type, at: at.toISOString(), ...(detail ? { detail } : {}) }];
}

export function historyTypeForStatus(status: AiSuggestionStatus): AiSuggestionHistoryEvent["type"] {
  if (status === "remind_later") return "snoozed";
  if (status === "active") return "viewed";
  return status;
}

export function shouldSkipSuggestionDraft(prev: AiSuggestion | undefined, today: Date): boolean {
  if (!prev) return false;
  if (prev.status === "useful" || prev.status === "action_taken") return true;
  if (prev.status === "dismissed" && sameCalendarMonth(prev.updatedAt, today)) return true;
  if (prev.status === "remind_later" && prev.remindAt && isAfter(parseISO(prev.remindAt), today)) {
    return true;
  }
  return false;
}

export async function syncSuggestionsForUser(
  userId: string,
  engineIn: SuggestionEngineInput,
): Promise<{ created: number; updated: number; expired: number }> {
  const today = engineIn.today ?? new Date();
  const drafts = buildSuggestionDrafts(engineIn);
  const existing = await aiSuggestionRepo.list(userId);
  let created = 0;
  let updated = 0;
  let expired = 0;
  const now = new Date();

  for (const row of existing) {
    if (row.status !== "active" && row.status !== "remind_later") continue;
    if (parseISO(row.expiresAt) >= now) continue;
    await aiSuggestionRepo.update(row.id, {
      status: "expired",
      historyJson: appendSuggestionHistory(row, "expired", now),
    } as Partial<AiSuggestion>);
    expired += 1;
  }

  const rows = await aiSuggestionRepo.list(userId);

  for (const draft of drafts) {
    const prev = rows.find((r) => r.dedupeKey === draft.dedupeKey);
    const calcStr = stableCalculationJson(draft.calculationInputsJson);
    const prevCalcStr = prev ? stableCalculationJson(asCalcRecord(prev)) : "";

    if (shouldSkipSuggestionDraft(prev, today)) continue;

    if (!prev) {
      await aiSuggestionRepo.create({
        userId,
        data: {
          dedupeKey: draft.dedupeKey,
          suggestionType: draft.suggestionType,
          severity: draft.severity,
          title: draft.title,
          reason: draft.reason,
          calculationInputsJson: draft.calculationInputsJson,
          recommendedAction: draft.recommendedAction,
          expectedImpactJson: draft.expectedImpactJson ?? null,
          confidenceScore: draft.confidenceScore,
          sourceModule: draft.sourceModule,
          status: "active",
          historyJson: [{ type: "created", at: now.toISOString() }],
          aiExplanation: null,
          remindAt: null,
          expiresAt: draft.expiresAt,
        },
      });
      created += 1;
      continue;
    }

    const unchangedCore =
      calcStr === prevCalcStr &&
      prev.title === draft.title &&
      prev.reason === draft.reason &&
      prev.recommendedAction === draft.recommendedAction;

    if (unchangedCore && (prev.status === "active" || prev.status === "remind_later")) {
      continue;
    }

    if (unchangedCore && prev.status === "expired") {
      await aiSuggestionRepo.update(prev.id, {
        status: "active",
        historyJson: appendSuggestionHistory(prev, "created", now, "Reactivated after expiry"),
      } as Partial<AiSuggestion>);
      updated += 1;
      continue;
    }

    const clearAi = calcStr !== prevCalcStr;
    await aiSuggestionRepo.update(prev.id, {
      suggestionType: draft.suggestionType,
      severity: draft.severity,
      title: draft.title,
      reason: draft.reason,
      calculationInputsJson: draft.calculationInputsJson,
      recommendedAction: draft.recommendedAction,
      expectedImpactJson: draft.expectedImpactJson ?? null,
      confidenceScore: draft.confidenceScore,
      sourceModule: draft.sourceModule,
      expiresAt: draft.expiresAt,
      status: "active",
      remindAt: null,
      aiExplanation: clearAi ? null : prev.aiExplanation,
      historyJson: appendSuggestionHistory(prev, "created", now, clearAi ? "Updated with changed calculations" : "Updated"),
    } as Partial<AiSuggestion>);
    updated += 1;
  }

  return { created, updated, expired };
}

export function buildSuggestionEngineInput(
  userId: string,
  slice: Pick<
    SuggestionEngineInput,
    | "accounts"
    | "cards"
    | "loans"
    | "emis"
    | "goals"
    | "budgets"
    | "udhari"
    | "recurringRules"
    | "categories"
    | "transactions"
    | "ledgerEvents"
    | "ledgerEffects"
  >,
  today?: Date,
): SuggestionEngineInput {
  return {
    userId,
    today,
    ...slice,
  };
}
