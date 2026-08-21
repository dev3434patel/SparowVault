import { describe, expect, it } from "vitest";
import {
  expenseBreakdownWithDistinctChartColors,
  findDuplicateCategoryColors,
  hideDeletedCategorySlices,
  incomePalette,
  moduleColor,
  suggestNextCategoryColor,
} from "@/services/categoryColorEngine";
import type { Category } from "@/types";
import type { CategorySlice } from "@/services/calculations";

const baseCat = (over: Partial<Category>): Category => ({
  id: "c1",
  userId: "u",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  isDeleted: 0,
  version: 1,
  tags: [],
  notes: "",
  name: "A",
  parentId: null,
  appliesTo: "expense",
  icon: "🍽️",
  color: "#0072B2",
  budgetable: 1,
  taxRelevant: 0,
  gstRelevant: 0,
  sortOrder: 1,
  archived: 0,
  ...over,
});

describe("categoryColorEngine", () => {
  it("assigns distinct chart colors including Others bucket", () => {
    const slices: CategorySlice[] = Array.from({ length: 7 }).map((_, i) => ({
      categoryId: `id${i}`,
      categoryName: `C${i}`,
      color: "#111111",
      amountPaise: 1000 - i,
      percent: 10,
    }));
    const out = expenseBreakdownWithDistinctChartColors(slices, "default", 5);
    const colors = out.map((x) => x.chartColor);
    expect(new Set(colors).size).toBe(colors.length);
    expect(out.some((x) => x.categoryId === "__others__")).toBe(true);
  });

  it("detects duplicate colors among active categories", () => {
    const cats = [baseCat({ id: "1", name: "A", color: "#e69f00" }), baseCat({ id: "2", name: "B", color: "#E69F00" })];
    const d = findDuplicateCategoryColors(cats);
    expect(d.length).toBe(1);
    expect(d[0]!.categoryIds.length).toBe(2);
  });

  it("suggestNextCategoryColor avoids used swatches", () => {
    const cats = [baseCat({ id: "1", color: "#0072B2" })];
    const next = suggestNextCategoryColor("expense", cats, "default");
    expect(next.toLowerCase()).not.toBe("#0072b2");
  });

  it("keeps income and expense palettes separate", () => {
    expect(incomePalette("default")[0]).not.toBe("#0072B2");
    const income = suggestNextCategoryColor("income", [], "default");
    const expense = suggestNextCategoryColor("expense", [], "default");
    expect(income).not.toBe(expense);
  });

  it("exposes separate module colors", () => {
    const modules = ["cards", "loans", "goals", "udhari", "investments"] as const;
    const colors = modules.map((m) => moduleColor(m));
    expect(new Set(colors).size).toBe(modules.length);
  });

  it("hides deleted and archived categories from chart slices", () => {
    const cats = [
      baseCat({ id: "active", archived: 0, isDeleted: 0 }),
      baseCat({ id: "deleted", archived: 0, isDeleted: 1 }),
      baseCat({ id: "archived", archived: 1, isDeleted: 0 }),
    ];
    const slices: CategorySlice[] = [
      { categoryId: "active", categoryName: "Active", color: "#111", amountPaise: 100, percent: 50 },
      { categoryId: "deleted", categoryName: "Deleted", color: "#222", amountPaise: 50, percent: 25 },
      { categoryId: "archived", categoryName: "Archived", color: "#333", amountPaise: 50, percent: 25 },
    ];

    expect(hideDeletedCategorySlices(slices, cats).map((s) => s.categoryId)).toEqual(["active"]);
  });
});
