import type { Fixture } from "./_types";
import { inertPin, iso } from "./_types";

const id = "fixt_udhari_pay_06";

const fixture: Fixture = {
  name: "User 6 — udhari payable (you borrowed)",
  description:
    "Borrowed ₹20,000 informally from a relative; haven't repaid anything yet. Net outstanding ₹20,000 owed.",
  user: {
    id,
    username: "fixt_udhari_pay",
    displayName: "Payable Priya",
    ...inertPin(id),
  },
  rows: [
    {
      collection: "accounts",
      entityId: "acc_cash_6",
      payload: { id: "acc_cash_6", userId: id, name: "Wallet", type: "cash", currentBalance: 22000 },
    },
    {
      collection: "udhari",
      entityId: "udh_p_6",
      payload: {
        id: "udh_p_6",
        userId: id,
        direction: "received",     // money I owe
        counterparty: "Mama (uncle)",
        principal: 20000,
        startDate: iso(2026, 4, 5),
        expectedReturnDate: iso(2026, 7, 5),
        status: "open",
      },
    },
    {
      collection: "transactions",
      entityId: "tx_udh_recv",
      payload: {
        id: "tx_udh_recv",
        userId: id,
        type: "udhari_received",
        amount: 20000,
        date: iso(2026, 4, 5),
        accountId: "acc_cash_6",
      },
    },
  ],
};

export default fixture;
