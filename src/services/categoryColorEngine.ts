/**
 * Phase 12 — Distinct chart colors, palettes per domain, color-blind option,
 * duplicate detection, and auto-suggest for new categories.
 */

import type { Category } from "@/types";
import type { CategorySlice } from "@/services/calculations";

export type ChartAccessibility = "default" | "colorblind";

/** Distinct expense chart colors (default). */
export const EXPENSE_CHART_PALETTE_DEFAULT = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#CC79A7",
  "#56B4E9",
  "#D55E00",
  "#F0E442",
  "#000000",
  "#332288",
  "#882255",
  "#44AA99",
  "#DDCC77",
] as const;

/** Income / inflow chart colors (separate family from expense). */
export const INCOME_CHART_PALETTE_DEFAULT = [
  "#117733",
  "#6699CC",
  "#661100",
  "#999933",
  "#AA4499",
  "#228833",
  "#CCBB44",
  "#88CCEE",
  "#EE8866",
  "#BBBBBB",
] as const;

/** Color-blind safe (Wong / Okabe–Ito inspired). */
export const EXPENSE_CHART_PALETTE_COLORBLIND = [
  "#000000",
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
] as const;

export const INCOME_CHART_PALETTE_COLORBLIND = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#CC79A7",
  "#56B4E9",
  "#D55E00",
  "#F0E442",
  "#000000",
] as const;

/** Reserved for aggregated “Others” bucket in charts. */
export const CHART_OTHERS_COLOR = "#94a3b8";

/** Module accent families (use in cards / non-category charts). */
export const MODULE_COLOR = {
  cards: "#0072B2",
  loans: "#D55E00",
  goals: "#009E73",
  udhari: "#CC79A7",
  investments: "#66428C",
  tax: "#332288",
  cashflow: "#44AA99",
} as const;

export type ModuleColorKey = keyof typeof MODULE_COLOR;

export function moduleColor(module: ModuleColorKey): string {
  return MODULE_COLOR[module];
}

export function expensePalette(accessibility: ChartAccessibility): readonly string[] {
  return accessibility === "colorblind" ? EXPENSE_CHART_PALETTE_COLORBLIND : EXPENSE_CHART_PALETTE_DEFAULT;
}

export function incomePalette(accessibility: ChartAccessibility): readonly string[] {
  return accessibility === "colorblind" ? INCOME_CHART_PALETTE_COLORBLIND : INCOME_CHART_PALETTE_DEFAULT;
}

function normHex(c: string): string {
  return c.trim().toLowerCase();
}

/** Active categories shown in normal UI (not soft-deleted, not archived). */
export function activeCategoriesForColoring(categories: Category[]): Category[] {
  return categories.filter((c) => c.isDeleted !== 1 && c.archived !== 1);
}

/**
 * Groups to top N slices + “Others”; assigns distinct chart colors (ignores stored
 * category.color for the chart so neighbors never clash).
 */
export function expenseBreakdownWithDistinctChartColors(
  slices: CategorySlice[],
  accessibility: ChartAccessibility,
  topN = 5,
): Array<
  CategorySlice & {
    chartColor: string;
    chartKey: string;
    categoryIcon?: string;
  }
> {
  const sorted = [...slices].sort((a, b) => b.amountPaise - a.amountPaise);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const pal = [...expensePalette(accessibility)];
  const out: Array<CategorySlice & { chartColor: string; chartKey: string; categoryIcon?: string }> = [];

  top.forEach((s, i) => {
    out.push({
      ...s,
      chartColor: pal[i % pal.length] ?? CHART_OTHERS_COLOR,
      chartKey: s.categoryId,
    });
  });

  if (rest.length > 0) {
    const sumPaise = rest.reduce((a, s) => a + s.amountPaise, 0);
    const totalAll = sorted.reduce((a, s) => a + s.amountPaise, 0) || 1;
    out.push({
      categoryId: "__others__",
      categoryName: "Others",
      color: CHART_OTHERS_COLOR,
      amountPaise: sumPaise,
      percent: (100 * sumPaise) / totalAll,
      chartColor: CHART_OTHERS_COLOR,
      chartKey: "__others__",
    });
  }

  return out;
}

export function attachCategoryIcons(
  rows: Array<CategorySlice & { chartColor: string; chartKey: string; categoryIcon?: string }>,
  categories: Category[],
): typeof rows {
  const map = new Map(categories.map((c) => [c.id, c.icon]));
  return rows.map((r) =>
    r.categoryId === "__others__"
      ? { ...r, categoryIcon: "⋯" }
      : { ...r, categoryIcon: map.get(r.categoryId) ?? "🧾" },
  );
}

export function hideDeletedCategorySlices(
  slices: CategorySlice[],
  categories: Category[],
): CategorySlice[] {
  const activeIds = new Set(activeCategoriesForColoring(categories).map((c) => c.id));
  return slices.filter((s) => s.categoryId === "uncategorized" || activeIds.has(s.categoryId));
}

/** Colors used by active categories (same appliesTo family). */
export function usedColorsForAppliesTo(categories: Category[], appliesTo: Category["appliesTo"]): Set<string> {
  const set = new Set<string>();
  for (const c of activeCategoriesForColoring(categories)) {
    if (appliesTo === "mixed") {
      set.add(normHex(c.color));
    } else if (c.appliesTo === appliesTo || c.appliesTo === "mixed") {
      set.add(normHex(c.color));
    }
  }
  return set;
}

export function suggestNextCategoryColor(
  appliesTo: Category["appliesTo"],
  categories: Category[],
  accessibility: ChartAccessibility,
): string {
  const pal =
    appliesTo === "income"
      ? [...incomePalette(accessibility)]
      : [...expensePalette(accessibility)];
  const used = usedColorsForAppliesTo(categories, appliesTo);
  for (const hex of pal) {
    if (!used.has(normHex(hex))) return hex;
  }
  return pal[used.size % pal.length] ?? "#64748b";
}

export interface DuplicateColorGroup {
  normalizedColor: string;
  categoryIds: string[];
  names: string[];
}

export function findDuplicateCategoryColors(categories: Category[]): DuplicateColorGroup[] {
  const active = activeCategoriesForColoring(categories);
  const by = new Map<string, Category[]>();
  for (const c of active) {
    const k = normHex(c.color);
    const arr = by.get(k) ?? [];
    arr.push(c);
    by.set(k, arr);
  }
  const out: DuplicateColorGroup[] = [];
  for (const [normalizedColor, arr] of by) {
    if (arr.length < 2) continue;
    out.push({
      normalizedColor,
      categoryIds: arr.map((c) => c.id),
      names: arr.map((c) => c.name),
    });
  }
  return out.sort((a, b) => b.categoryIds.length - a.categoryIds.length);
}

export interface DuplicateNameGroup {
  normalizedName: string;
  categoryIds: string[];
  names: string[];
}

export function findDuplicateCategoryNames(categories: Category[]): DuplicateNameGroup[] {
  const active = activeCategoriesForColoring(categories);
  const by = new Map<string, Category[]>();
  for (const c of active) {
    const k = c.name.trim().toLowerCase();
    const arr = by.get(k) ?? [];
    arr.push(c);
    by.set(k, arr);
  }
  const out: DuplicateNameGroup[] = [];
  for (const [normalizedName, arr] of by) {
    if (arr.length < 2) continue;
    out.push({
      normalizedName,
      categoryIds: arr.map((c) => c.id),
      names: arr.map((c) => c.name),
    });
  }
  return out;
}
