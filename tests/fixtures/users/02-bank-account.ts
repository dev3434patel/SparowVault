import type { Fixture } from "./_types";
import { inertPin, iso } from "./_types";

const id = "fixt_bank_02";

const fixture: Fixture = {
  name: "User 2 — single bank account",
  description:
    "One savings bank account, salary credit, a few debit transactions. No credit instruments.",
  user: {
    id,
    username: "fixt_bank",
    displayName: "Bank Bharat",
    ...inertPin(id),
  },
  rows: [
    {
      collection: "accounts",
      entityId: "acc_sb_1",
      payload: {
        id: "acc_sb_1",
        userId: id,
        name: "HDFC Savings",
        type: "bank",
        currentBalance: 75000,
        currency: "INR",
        accountNumberLast4: "1234",
      },
    },
    {
      collection: "categories",
      entityId: "cat_salary",
      payload: { id: "cat_salary", userId: id, name: "Salary", kind: "income" },
    },
    {
      collection: "categories",
      entityId: "cat_groceries",
      payload: { id: "cat_groceries", userId: id, name: "Groceries", kind: "expense" },
    },
    {
      collection: "transactions",
      entityId: "tx_sal_apr",
      payload: {
        id: "tx_sal_apr",
        userId: id,
        type: "income",
        amount: 75000,
        date: iso(2026, 4, 30),
        accountId: "acc_sb_1",
        categoryId: "cat_salary",
        note: "April salary",
      },
    },
    {
      collection: "transactions",
      entityId: "tx_gro_1",
      payload: {
        id: "tx_gro_1",
        userId: id,
        type: "expense",
        amount: 4200,
        date: iso(2026, 5, 3),
        accountId: "acc_sb_1",
        categoryId: "cat_groceries",
      },
    },
  ],
};

export default fixture;
