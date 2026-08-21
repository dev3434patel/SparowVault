import { describe, expect, it } from "vitest";
import {
  buildSuggestionAiRewriteRequest,
  validateSuggestionAiRewrite,
} from "@/services/suggestionAiExplain";

const payload = {
  title: "Safe daily spend",
  reason: "After your card bill and EMI, you can safely spend Rs 381 per day until salary.",
  calculationInputsJson: {
    cardBillPaise: 300_000,
    emiPaise: 0,
    safeDailySpendPaise: 38_100,
    daysUntilSalary: 11,
  },
};

describe("suggestion AI explain guardrails", () => {
  it("sends only safe deterministic context to the rewrite endpoint", () => {
    const req = buildSuggestionAiRewriteRequest(payload);

    expect(req).toHaveProperty("system");
    expect(JSON.stringify(req)).toContain("calculationInputsJson");
    expect(JSON.stringify(req)).toContain("NEVER change, invent, or round any numbers");
    expect(JSON.stringify(req)).toContain("Do NOT give stock");
  });

  it("rejects rewrites that invent new numbers", () => {
    const result = validateSuggestionAiRewrite(
      payload,
      "You can safely spend Rs 500 per day.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
    );

    expect(result).toEqual({ ok: false, reason: "invented_number" });
  });

  it("rejects regulated product advice", () => {
    const result = validateSuggestionAiRewrite(
      payload,
      "You can safely spend Rs 381 per day and should buy a mutual fund.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
    );

    expect(result).toEqual({ ok: false, reason: "regulated_advice" });
  });

  it("rejects loan and credit-card product recommendations", () => {
    expect(
      validateSuggestionAiRewrite(
        payload,
        "You can safely spend Rs 381 per day and should apply for a credit card.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
      ),
    ).toEqual({ ok: false, reason: "regulated_advice" });

    expect(
      validateSuggestionAiRewrite(
        payload,
        "You can safely spend Rs 381 per day and should take a home loan.\n\nThis rewrite is for educational guidance only; it does not change the calculated amounts above.",
      ),
    ).toEqual({ ok: false, reason: "regulated_advice" });
  });
});
