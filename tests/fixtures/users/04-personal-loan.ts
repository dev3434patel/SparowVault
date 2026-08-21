import type { Fixture } from "./_types";
import { inertPin, iso } from "./_types";

const id = "fixt_loan_04";

const fixture: Fixture = {
  name: "User 4 — personal loan with EMI",
  description:
    "Active personal loan (₹2 L principal, 60 m tenure, 10% APR), 12 EMIs paid. Bank account to draw from.",
  user: {
    id,
    username: "fixt_loan",
    displayName: "Loan Lakshmi",
    ...inertPin(id),
  },
  rows: [
    {
      collection: "accounts",
      entityId: "acc_sb_4",
      payload: { id: "acc_sb_4", userId: id, name: "SBI Savings", type: "bank", currentBalance: 45000 },
    },
    {
      collection: "loans",
      entityId: "loan_pl_4",
      payload: {
        id: "loan_pl_4",
        userId: id,
        lender: "Bajaj Finserv",
        type: "personal",
        principal: 200000,
        annualRate: 10,
        tenureMonths: 60,
        completedEmis: 12,
        startDate: iso(2025, 5, 1),
        dueDay: 5,
        lifecycleMode: "existing",
      },
    },
    {
      collection: "emiPayments",
      entityId: "emi_pay_apr",
      payload: {
        id: "emi_pay_apr",
        userId: id,
        loanId: "loan_pl_4",
        amount: 4249.41,    // textbook EMI ≈ ₹4249.41
        date: iso(2026, 5, 5),
        accountId: "acc_sb_4",
        status: "paid",
      },
    },
    {
      collection: "transactions",
      entityId: "tx_emi_apr",
      payload: {
        id: "tx_emi_apr",
        userId: id,
        type: "emi_payment",
        amount: 4249.41,
        date: iso(2026, 5, 5),
        accountId: "acc_sb_4",
        note: "Bajaj EMI",
      },
    },
  ],
};

export default fixture;
