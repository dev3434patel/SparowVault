import { describe, expect, it } from "vitest";
import { applyBulkAcceptDecision, decisionProblems, suggestStatementDecision } from "../../src/services/statements/classification";
import type { StatementRow } from "../../src/services/statements/types";
import type { Category } from "../../src/types";

const row = (change: Partial<StatementRow> = {}): StatementRow => ({
  id: "1",
  date: "2026-08-01",
  page: 1,
  y: 120,
  description: "UPI UNKNOWN PERSON",
  reference: "R01",
  debitPaise: 10000,
  creditPaise: 0,
  balancePaise: 90000,
  issues: [],
  ...change,
});

const category = (id: string, name: string, appliesTo: "income" | "expense", extra: Partial<Category> = {}): Category => ({
  id,
  userId: "user",
  name,
  appliesTo,
  createdAt: "",
  updatedAt: "",
  version: 1,
  isDeleted: 0,
  tags: [],
  notes: "",
  icon: "tag",
  color: "#000",
  archived: 0,
  sortOrder: 0,
  budgetable: 1,
  taxRelevant: 0,
  gstRelevant: 0,
  ...extra,
});

describe("statement bulk accept", () => {
  const categories = [
    category("old", "Old expense", "expense", { isDeleted: 1 }),
    category("rent", "Rent", "expense"),
    category("food", "Food", "expense"),
  ];

  it("does not apply a suggestion until bulk accept is invoked", () => {
    const suggested = suggestStatementDecision(row(), categories);
    expect(suggested).toMatchObject({ kind: "", suggestedKind: "expense", scope: "", reviewed: false });
    expect(decisionProblems(row(), suggested, "account").length).toBeGreaterThan(0);
  });

  it("accepts a debit suggestion as expense, personal, and reviewed when a category exists", () => {
    const suggested = suggestStatementDecision(row(), categories);
    const accepted = applyBulkAcceptDecision(row(), suggested, categories, "account", "", "user");
    expect(accepted).toMatchObject({
      kind: "expense",
      scope: "personal",
      categoryId: "rent",
      reviewed: true,
      counterpartId: "",
    });
    expect(decisionProblems(row(), accepted, "account")).toEqual([]);
  });

  it("uses the selected scope instead of personal when that control has a value", () => {
    const suggested = suggestStatementDecision(row(), categories);
    const accepted = applyBulkAcceptDecision(row(), suggested, categories, "account", "business", "user");
    expect(accepted.scope).toBe("business");
    expect(accepted.reviewed).toBe(true);
  });

  it("leaves a transfer blocked when no counterpart is chosen", () => {
    const transferRow = row({ description: "SELF TRANSFER" });
    const suggested = suggestStatementDecision(transferRow, categories);
    expect(suggested.kind).toBe("transfer");
    const accepted = applyBulkAcceptDecision(transferRow, suggested, categories, "account", "");
    expect(accepted.reviewed).toBe(false);
    expect(accepted.counterpartId).toBe("");
    expect(accepted.reason).toBe("bulk:transfer");
    expect(decisionProblems(transferRow, accepted, "account")).toContain("Choose the linked account/card/original expense");
  });

  it("does not invent a category when the user has none", () => {
    const suggested = suggestStatementDecision(row(), []);
    const accepted = applyBulkAcceptDecision(row(), suggested, [], "account", "");
    expect(accepted).toMatchObject({ kind: "expense", categoryId: "", reviewed: false, reason: "bulk:category" });
  });
});
