import type { Fixture } from "./_types";
import { inertPin, iso } from "./_types";

const id = "fixt_udhari_recv_05";

const fixture: Fixture = {
  name: "User 5 — udhari receivable (you lent money)",
  description:
    "Lent ₹15,000 to a friend; partial repayment of ₹5,000 recorded as a settlement. Net outstanding ₹10,000.",
  user: {
    id,
    username: "fixt_udhari_recv",
    displayName: "Receivable Ravi",
    ...inertPin(id),
  },
  rows: [
    {
      collection: "accounts",
      entityId: "acc_cash_5",
      payload: { id: "acc_cash_5", userId: id, name: "Wallet", type: "cash", currentBalance: 8000 },
    },
    {
      collection: "udhari",
      entityId: "udh_r_5",
      payload: {
        id: "udh_r_5",
        userId: id,
        direction: "given",        // money I gave out
        counterparty: "Rohit (cousin)",
        principal: 15000,
        startDate: iso(2026, 3, 12),
        expectedReturnDate: iso(2026, 6, 12),
        status: "open",
      },
    },
    {
      collection: "udhariSettlements",
      entityId: "udh_s_5_1",
      payload: {
        id: "udh_s_5_1",
        userId: id,
        udhariId: "udh_r_5",
        amount: 5000,
        date: iso(2026, 4, 20),
        method: "upi",
      },
    },
    {
      collection: "transactions",
      entityId: "tx_udh_give",
      payload: {
        id: "tx_udh_give",
        userId: id,
        type: "udhari_given",
        amount: 15000,
        date: iso(2026, 3, 12),
        accountId: "acc_cash_5",
      },
    },
    {
      collection: "transactions",
      entityId: "tx_udh_back",
      payload: {
        id: "tx_udh_back",
        userId: id,
        type: "udhari_received",
        amount: 5000,
        date: iso(2026, 4, 20),
        accountId: "acc_cash_5",
      },
    },
  ],
};

export default fixture;
