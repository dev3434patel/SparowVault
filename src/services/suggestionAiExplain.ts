/**
 * Optional AI copy — must not invent numbers. Server endpoint only (no raw API keys in client).
 */

const DISCLAIMER =
  "This rewrite is for educational guidance only; it does not change the calculated amounts above.";

export interface ExplainSuggestionPayload {
  title: string;
  reason: string;
  calculationInputsJson: Record<string, unknown>;
}

export const SUGGESTION_AI_SYSTEM_PROMPT =
  "You are a financial literacy assistant for Indian households. Rewrite the user message in clear, short plain English. NEVER change, invent, or round any numbers, dates, or currency strings from the payload. Do NOT mention unavailable data. Do NOT give stock, mutual fund, crypto, insurance, loan-product, or trading buy/sell advice. End with the disclaimer sentence exactly as provided in the request.";

const PRODUCT_ADVICE_RE =
  /\b(buy|sell|hold|switch|invest in|redeem|subscribe to|apply for|take|choose)\b[\s\S]{0,80}\b(stock|share|mutual fund|sip|crypto|bitcoin|etf|insurance|insurance policy|ulip|loan product|personal loan|home loan|business loan|car loan|vehicle loan|education loan|gold loan|credit card product|credit card)\b/i;

function numericTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of text.matchAll(/(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d+)?%?/g)) {
    tokens.add(match[0].replace(/,/g, ""));
  }
  return tokens;
}

export function buildSuggestionAiRewriteRequest(payload: ExplainSuggestionPayload): Record<string, unknown> {
  return {
    system: SUGGESTION_AI_SYSTEM_PROMPT,
    disclaimer: DISCLAIMER,
    payload: {
      title: payload.title,
      reason: payload.reason,
      calculationInputsJson: payload.calculationInputsJson,
    },
  };
}

export function validateSuggestionAiRewrite(
  payload: ExplainSuggestionPayload,
  text: string,
): { ok: true } | { ok: false; reason: "invented_number" | "regulated_advice" | "missing_disclaimer" } {
  if (!text.includes(DISCLAIMER)) return { ok: false, reason: "missing_disclaimer" };
  if (PRODUCT_ADVICE_RE.test(text)) return { ok: false, reason: "regulated_advice" };

  const sourceTokens = numericTokens(
    `${payload.title}\n${payload.reason}\n${JSON.stringify(payload.calculationInputsJson)}`,
  );
  const outputTokens = numericTokens(text);
  for (const token of outputTokens) {
    if (!sourceTokens.has(token)) return { ok: false, reason: "invented_number" };
  }
  return { ok: true };
}

/**
 * POST JSON to `VITE_SUGGESTION_EXPLAIN_URL` with body { title, reason, calculationInputsJson }.
 * Response JSON: `{ "text": "..." }`. The server must instruct the model to never alter numerals.
 */
export async function explainSuggestionInSimpleLanguage(
  payload: ExplainSuggestionPayload,
): Promise<string | null> {
  const url = import.meta.env.VITE_SUGGESTION_EXPLAIN_URL as string | undefined;
  if (!url || typeof fetch === "undefined") return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSuggestionAiRewriteRequest(payload)),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text) return null;
    const withDisclaimer = text.includes(DISCLAIMER) ? text : `${text}\n\n${DISCLAIMER}`;
    return validateSuggestionAiRewrite(payload, withDisclaimer).ok ? withDisclaimer : null;
  } catch {
    return null;
  }
}
