import { describe, expect, it } from "vitest";
import {
  buildSuggestionAiRewriteRequest,
  validateSuggestionAiRewrite,
} from "@/services/suggestionAiExplain";

const payload = {
  title: "HDFC utilization",
  reason: "Your HDFC card outstanding is Rs 42,000 of Rs 50,000, which is 84%.",
  calculationInputsJson: {
    outstandingPaise: 4_200_000,
    limitPaise: 5_000_000,
    utilizationPct: 84,
  },
};

describe("aiGuardrails", () => {
  it("AI rephrase preserves exact numbers from deterministic inputs", () => {
    const text =
      "Your HDFC card outstanding is Rs 42,000 of Rs 50,000, which is 84%.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.";

    expect(validateSuggestionAiRewrite(payload, text)).toEqual({ ok: true });
  });

  it("AI rephrase rejects changed or invented numbers", () => {
    const text =
      "Your HDFC card outstanding is Rs 43,000 of Rs 50,000, which is 86%.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.";

    expect(validateSuggestionAiRewrite(payload, text)).toEqual({
      ok: false,
      reason: "invented_number",
    });
  });

  it("AI guardrail blocks specific stock or mutual fund buy/sell advice", () => {
    const text =
      "Your HDFC card outstanding is Rs 42,000 of Rs 50,000, which is 84%. You should buy a mutual fund.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.";

    expect(validateSuggestionAiRewrite(payload, text)).toEqual({
      ok: false,
      reason: "regulated_advice",
    });
  });

  it("AI rewrite request includes only deterministic payload and guardrail instructions", () => {
    const request = buildSuggestionAiRewriteRequest(payload);

    expect(request).toHaveProperty("payload");
    expect(JSON.stringify(request)).toContain("calculationInputsJson");
    expect(JSON.stringify(request)).toContain("NEVER change, invent, or round any numbers");
  });
});
