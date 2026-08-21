import type { Fixture } from "./_types";
import { inertPin, iso } from "./_types";

const id = "fixt_card_03";

const fixture: Fixture = {
  name: "User 3 — credit card on top of a bank",
  description:
    "One bank account, one credit card with a non-zero outstanding balance. Includes a recent CC payment.",
  user: {
    id,
    username: "fixt_card",
    displayName: "Card Kamal",
    ...inertPin(id),
  },
  rows: [
    {
      collection: "accounts",
      entityId: "acc_sb_3",
      payload: {
        id: "acc_sb_3",
        userId: id,
        name: "ICICI Savings",
        type: "bank",
        currentBalance: 60000,
      },
    },
    {
      collection: "cards",
      entityId: "card_3",
      payload: {
        id: "card_3",
        userId: id,
        name: "HDFC Millennia",
        last4: "9999",
        creditLimit: 100000,
        outstandingBalance: 28000,
        statementDay: 5,
        dueDay: 25,
        billingCycle: "monthly",
      },
    },
    {
      collection: "transactions",
      entityId: "tx_card_spend",
      payload: {
        id: "tx_card_spend",
        userId: id,
        type: "expense",
        amount: 5500,
        date: iso(2026, 5, 7),
        cardId: "card_3",
        note: "Flight booking",
      },
    },
    {
      collection: "transactions",
      entityId: "tx_card_pay",
      payload: {
        id: "tx_card_pay",
        userId: id,
        type: "cc_payment",
        amount: 12000,
        date: iso(2026, 4, 24),
        accountId: "acc_sb_3",
        cardId: "card_3",
      },
    },
  ],
};

export default fixture;
