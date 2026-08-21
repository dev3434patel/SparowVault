import type { Fixture } from "./_types";
import { inertPin, iso } from "./_types";

const id = "fixt_income_budget_08";

const fixture: Fixture = {
  name: "User 8 — monthly income + category budgets",
  description:
    "Salaried user with a complete envelope budget: Food ₹8k, Transport ₹3k, Entertainment ₹2k, Bills ₹6k. Mid-month spend distributed across categories.",
  user: {
    id,
    username: "fixt_budgets",
    displayName: "Budget Bhavna",
    ...inertPin(id),
  },
  rows: [
    {
      collection: "accounts",
      entityId: "acc_sb_8",
      payload: { id: "acc_sb_8", userId: id, name: "Kotak Savings", type: "bank", currentBalance: 92000 },
    },
    // Categories
    { collection: "categories", entityId: "cat_food_8",   payload: { id: "cat_food_8",   userId: id, name: "Food",          kind: "expense" } },
    { collection: "categories", entityId: "cat_trans_8",  payload: { id: "cat_trans_8",  userId: id, name: "Transport",     kind: "expense" } },
    { collection: "categories", entityId: "cat_enter_8",  payload: { id: "cat_enter_8",  userId: id, name: "Entertainment", kind: "expense" } },
    { collection: "categories", entityId: "cat_bills_8",  payload: { id: "cat_bills_8",  userId: id, name: "Bills",         kind: "expense" } },
    { collection: "categories", entityId: "cat_sal_8",    payload: { id: "cat_sal_8",    userId: id, name: "Salary",        kind: "income"  } },
    // Budgets (monthly envelopes)
    { collection: "budgets", entityId: "bud_food",  payload: { id: "bud_food",  userId: id, categoryId: "cat_food_8",  amount: 8000, period: "monthly", startDate: iso(2026, 5, 1) } },
    { collection: "budgets", entityId: "bud_trans", payload: { id: "bud_trans", userId: id, categoryId: "cat_trans_8", amount: 3000, period: "monthly", startDate: iso(2026, 5, 1) } },
    { collection: "budgets", entityId: "bud_enter", payload: { id: "bud_enter", userId: id, categoryId: "cat_enter_8", amount: 2000, period: "monthly", startDate: iso(2026, 5, 1) } },
    { collection: "budgets", entityId: "bud_bills", payload: { id: "bud_bills", userId: id, categoryId: "cat_bills_8", amount: 6000, period: "monthly", startDate: iso(2026, 5, 1) } },
    // Salary income
    {
      collection: "transactions", entityId: "tx_sal_may",
      payload: { id: "tx_sal_may", userId: id, type: "income", amount: 90000, date: iso(2026, 4, 30), accountId: "acc_sb_8", categoryId: "cat_sal_8", note: "April salary" },
    },
    // May expenses (mid-month)
    { collection: "transactions", entityId: "tx_food_1",  payload: { id: "tx_food_1",  userId: id, type: "expense", amount: 2400, date: iso(2026, 5,  3), accountId: "acc_sb_8", categoryId: "cat_food_8" } },
    { collection: "transactions", entityId: "tx_food_2",  payload: { id: "tx_food_2",  userId: id, type: "expense", amount: 1900, date: iso(2026, 5, 10), accountId: "acc_sb_8", categoryId: "cat_food_8" } },
    { collection: "transactions", entityId: "tx_trans_1", payload: { id: "tx_trans_1", userId: id, type: "expense", amount: 800,  date: iso(2026, 5,  5), accountId: "acc_sb_8", categoryId: "cat_trans_8" } },
    { collection: "transactions", entityId: "tx_enter_1", payload: { id: "tx_enter_1", userId: id, type: "expense", amount: 1500, date: iso(2026, 5,  8), accountId: "acc_sb_8", categoryId: "cat_enter_8" } },
    { collection: "transactions", entityId: "tx_bills_1", payload: { id: "tx_bills_1", userId: id, type: "expense", amount: 4500, date: iso(2026, 5,  6), accountId: "acc_sb_8", categoryId: "cat_bills_8", note: "Electricity + internet" } },
  ],
};

export default fixture;
