import type { Fixture } from "./_types";
import { inertPin, iso } from "./_types";

const id = "fixt_cash_01";

const fixture: Fixture = {
  name: "User 1 — cash-only",
  description:
    "Single cash account, a handful of mixed-category expenses, no card, no debt. Smallest plausible footprint.",
  user: {
    id,
    username: "fixt_cash",
    displayName: "Cash Carol",
    ...inertPin(id),
  },
  rows: [
    {
      collection: "accounts",
      entityId: "acc_cash_1",
      payload: {
        id: "acc_cash_1",
        userId: id,
        name: "Wallet",
        type: "cash",
        currentBalance: 5000,
        currency: "INR",
        isDeleted: false,
      },
    },
    {
      collection: "categories",
      entityId: "cat_food",
      payload: { id: "cat_food", userId: id, name: "Food", kind: "expense", color: "#f59e0b" },
    },
    {
      collection: "transactions",
      entityId: "tx_1",
      payload: {
        id: "tx_1",
        userId: id,
        type: "expense",
        amount: 250,
        date: iso(2026, 5, 2),
        accountId: "acc_cash_1",
        categoryId: "cat_food",
        note: "Tea & samosa",
      },
    },
    {
      collection: "transactions",
      entityId: "tx_2",
      payload: {
        id: "tx_2",
        userId: id,
        type: "expense",
        amount: 175,
        date: iso(2026, 5, 4),
        accountId: "acc_cash_1",
        categoryId: "cat_food",
      },
    },
  ],
};

export default fixture;
