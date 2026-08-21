// Rich Indian demo data seeder. Creates realistic records over 6 months.
import type { User } from "@/types";
import {
  accountRepo,
  budgetRepo,
  cardRepo,
  categoryRepo,
  emiRepo,
  goalContribRepo,
  goalRepo,
  investmentRepo,
  loanRepo,
  savingsContribRepo,
  transactionRepo,
  udhariRepo,
  auditRepo,
} from "@/repositories";
import { addDays, addMonths, format, startOfMonth, subMonths } from "date-fns";
import { seedDefaultAccounts, seedDefaultCategories } from "./defaultsService";
import { calculateEMI, amortizationSchedule } from "./calculations";
import { paiseToRupees } from "@/utils/money";

function iso(d: Date) {
  return d.toISOString();
}

export async function seedDemoData(user: User) {
  const uid = user.id;
  await seedDefaultCategories(user);
  await seedDefaultAccounts(user);

  const cats = await categoryRepo.list(uid);
  const accts = await accountRepo.list(uid);
  const cashAcc = accts.find((a) => a.type === "cash")!;
  const savingsAcc = accts.find((a) => a.type === "savings")!;
  const upiAcc = accts.find((a) => a.type === "upi_wallet")!;

  const catByName = (n: string) => cats.find((c) => c.name === n);

  // Update opening balances to look realistic
  await accountRepo.update(savingsAcc.id, { openingBalance: 45000 });
  await accountRepo.update(cashAcc.id, { openingBalance: 2000 });
  await accountRepo.update(upiAcc.id, { openingBalance: 3000 });

  // -------- Credit Card
  const card = await cardRepo.create({
    userId: uid,
    data: {
      nickname: "HDFC Millennia",
      bank: "HDFC Bank",
      last4: "4421",
      type: "credit",
      creditLimit: 200000,
      statementDay: 5,
      dueDay: 22,
      interestRate: 42,
      joiningFee: 1000,
      annualFee: 1000,
      annualFeeMonth: 6,
      rewardNote: "5% cashback on online, 1% offline",
      color: "#0ea5e9",
      isInactive: 0,
    },
  });

  // -------- Loan (Home Loan)
  const loanStart = subMonths(new Date(), 18);
  const loan = await loanRepo.create({
    userId: uid,
    data: {
      lender: "SBI",
      loanType: "home",
      principal: 2500000,
      startDate: iso(loanStart),
      tenureMonths: 240,
      annualInterestRate: 8.6,
      emiDueDay: 5,
      processingFee: 12500,
      insuranceCost: 8000,
      prepaymentAllowed: 1,
      foreclosureCharges: 2,
      linkedAccountId: savingsAcc.id,
      status: "active",
    },
  });
  const schedule = amortizationSchedule(loan);
  // Record first 18 EMI payments as paid
  for (let i = 0; i < 18; i++) {
    const row = schedule[i];
    await emiRepo.create({
      userId: uid,
      data: {
        loanId: loan.id,
        dueDate: row.dueDate,
        paidDate: row.dueDate,
        amountDue: paiseToRupees(row.emiPaise),
        amountPaise: row.emiPaise,
        amountPaid: paiseToRupees(row.emiPaise),
        principalComponent: paiseToRupees(row.principalPaise),
        interestComponent: paiseToRupees(row.interestPaise),
        status: "paid",
      },
    });
  }
  // Upcoming EMI (not paid)
  for (let i = 18; i < 22; i++) {
    const row = schedule[i];
    await emiRepo.create({
      userId: uid,
      data: {
        loanId: loan.id,
        dueDate: row.dueDate,
        amountDue: paiseToRupees(row.emiPaise),
        amountPaise: row.emiPaise,
        amountPaid: 0,
        principalComponent: paiseToRupees(row.principalPaise),
        interestComponent: paiseToRupees(row.interestPaise),
        status: "due",
      },
    });
  }

  // -------- Udhari
  await udhariRepo.create({
    userId: uid,
    data: {
      personName: "Rahul (Brother-in-law)",
      phone: "98XXXXXX21",
      type: "receivable",
      amount: 15000,
      givenDate: iso(subMonths(new Date(), 2)),
      dueDate: iso(addMonths(new Date(), 1)),
      status: "open",
      amountSettled: 0,
      reminderOn: 1,
      context: "family",
    },
  });
  await udhariRepo.create({
    userId: uid,
    data: {
      personName: "Neha",
      type: "payable",
      amount: 5000,
      givenDate: iso(subMonths(new Date(), 1)),
      status: "partial",
      amountSettled: 2000,
      reminderOn: 1,
      context: "friend",
    },
  });

  // -------- Goals
  const phoneGoal = await goalRepo.create({
    userId: uid,
    data: {
      title: "iPhone 17 Pro",
      goalType: "phone",
      targetAmount: 149000,
      targetDate: iso(addMonths(new Date(), 5)),
      startedAt: iso(subMonths(new Date(), 3)),
      currentSaved: 35000,
      linkedAccountId: savingsAcc.id,
      priority: 2,
      icon: "📱",
      color: "#0ea5e9",
      status: "active",
    },
  });
  const emergencyGoal = await goalRepo.create({
    userId: uid,
    data: {
      title: "Emergency Fund (6 months)",
      goalType: "emergency_fund",
      targetAmount: 360000,
      targetDate: iso(addMonths(new Date(), 12)),
      startedAt: iso(subMonths(new Date(), 6)),
      currentSaved: 120000,
      linkedAccountId: savingsAcc.id,
      priority: 1,
      icon: "🛡️",
      color: "#10b981",
      status: "active",
    },
  });
  // A few contribution records
  for (let i = 3; i >= 0; i--) {
    await goalContribRepo.create({
      userId: uid,
      data: {
        goalId: phoneGoal.id,
        date: iso(subMonths(new Date(), i)),
        amount: i === 0 ? 11000 : 8000,
        sourceAccountId: savingsAcc.id,
      },
    });
    await goalContribRepo.create({
      userId: uid,
      data: {
        goalId: emergencyGoal.id,
        date: iso(subMonths(new Date(), i)),
        amount: 20000,
        sourceAccountId: savingsAcc.id,
      },
    });
  }

  // -------- Investments
  const sip = await investmentRepo.create({
    userId: uid,
    data: {
      name: "Mirae Asset Large Cap SIP",
      type: "sip",
      startDate: iso(subMonths(new Date(), 10)),
      frequency: "monthly",
      monthlyTarget: 10000,
      totalContributed: 100000,
      expectedReturnRate: 12,
      linkedAccountId: savingsAcc.id,
      status: "active",
    },
  });
  const ppf = await investmentRepo.create({
    userId: uid,
    data: {
      name: "PPF Account",
      type: "ppf",
      startDate: iso(subMonths(new Date(), 36)),
      frequency: "yearly",
      monthlyTarget: 12500,
      totalContributed: 450000,
      expectedReturnRate: 7.1,
      maturityDate: iso(addMonths(new Date(), 12 * 12)),
      linkedAccountId: savingsAcc.id,
      status: "active",
    },
  });
  // FD
  await investmentRepo.create({
    userId: uid,
    data: {
      name: "HDFC 2Y FD",
      type: "fd",
      startDate: iso(subMonths(new Date(), 8)),
      frequency: "oneoff",
      monthlyTarget: 0,
      totalContributed: 200000,
      expectedReturnRate: 7.25,
      maturityDate: iso(addMonths(new Date(), 16)),
      linkedAccountId: savingsAcc.id,
      status: "active",
    },
  });
  for (let i = 5; i >= 0; i--) {
    await savingsContribRepo.create({
      userId: uid,
      data: {
        investmentId: sip.id,
        date: iso(subMonths(new Date(), i)),
        amount: 10000,
      },
    });
  }

  // -------- Transactions (6 months of activity)
  const today = new Date();
  const monthsBack = 6;
  const expenseCats = {
    Food: catByName("Food & Dining"),
    Groceries: catByName("Groceries"),
    Rent: catByName("Rent"),
    Utilities: catByName("Utilities"),
    Mobile: catByName("Mobile Recharge"),
    Internet: catByName("Internet"),
    Electricity: catByName("Electricity"),
    Fuel: catByName("Fuel"),
    Travel: catByName("Travel"),
    Shopping: catByName("Shopping"),
    Entertainment: catByName("Entertainment"),
    Medical: catByName("Medical"),
    Subscriptions: catByName("Subscriptions"),
    Maintenance: catByName("Maintenance"),
  };
  const incomeCats = {
    Salary: catByName("Salary"),
    Freelance: catByName("Freelance"),
    Bonus: catByName("Bonus"),
    Cashback: catByName("Cashback"),
  };

  for (let m = monthsBack - 1; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(today, m));
    // Salary on 1st
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 0)),
        type: "income",
        amount: 125000,
        categoryId: incomeCats.Salary?.id,
        accountId: savingsAcc.id,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Acme Pvt Ltd",
        description: "Monthly salary",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 1,
        businessOrPersonal: "personal",
        needWant: "unassigned",
        fixedVariable: "fixed",
        plannedUnplanned: "planned",
      },
    });
    if (m % 2 === 0) {
      await transactionRepo.create({
        userId: uid,
        data: {
          date: iso(addDays(monthStart, 5)),
          type: "income",
          amount: 18000,
          categoryId: incomeCats.Freelance?.id,
          accountId: savingsAcc.id,
          paymentMode: "upi",
          merchantOrPerson: "Side Project",
          description: "Client invoice",
          billAvailable: 1,
          gstApplicable: 1,
          taxFlag: 1,
          businessOrPersonal: "business",
          needWant: "unassigned",
          fixedVariable: "variable",
          plannedUnplanned: "unassigned",
        },
      });
    }
    if (m === 3) {
      await transactionRepo.create({
        userId: uid,
        data: {
          date: iso(addDays(monthStart, 10)),
          type: "income",
          amount: 50000,
          categoryId: incomeCats.Bonus?.id,
          accountId: savingsAcc.id,
          paymentMode: "bank_transfer",
          merchantOrPerson: "Acme Pvt Ltd",
          description: "Diwali bonus",
          billAvailable: 0,
          gstApplicable: 0,
          taxFlag: 1,
          businessOrPersonal: "personal",
          needWant: "unassigned",
          fixedVariable: "variable",
          plannedUnplanned: "unassigned",
        },
      });
    }

    // Rent
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 2)),
        type: "expense",
        amount: 28000,
        categoryId: expenseCats.Rent?.id,
        accountId: savingsAcc.id,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Landlord",
        description: "Monthly rent",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "need",
        fixedVariable: "fixed",
        plannedUnplanned: "planned",
      },
    });
    // Utilities / Electricity / Internet
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 6)),
        type: "expense",
        amount: 2200 + Math.round(Math.random() * 600),
        categoryId: expenseCats.Electricity?.id,
        accountId: upiAcc.id,
        paymentMode: "upi",
        merchantOrPerson: "BESCOM",
        description: "Electricity bill",
        billAvailable: 1,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "need",
        fixedVariable: "variable",
        plannedUnplanned: "planned",
      },
    });
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 7)),
        type: "expense",
        amount: 999,
        categoryId: expenseCats.Internet?.id,
        accountId: upiAcc.id,
        paymentMode: "auto_debit",
        merchantOrPerson: "Airtel Xstream",
        description: "Internet",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "need",
        fixedVariable: "fixed",
        plannedUnplanned: "planned",
      },
    });
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 8)),
        type: "expense",
        amount: 399,
        categoryId: expenseCats.Mobile?.id,
        accountId: upiAcc.id,
        paymentMode: "upi",
        merchantOrPerson: "Jio",
        description: "Mobile recharge",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "need",
        fixedVariable: "fixed",
        plannedUnplanned: "planned",
      },
    });
    // Groceries (weekly)
    for (let w = 0; w < 4; w++) {
      await transactionRepo.create({
        userId: uid,
        data: {
          date: iso(addDays(monthStart, 2 + w * 7)),
          type: "expense",
          amount: 1200 + Math.round(Math.random() * 1000),
          categoryId: expenseCats.Groceries?.id,
          accountId: upiAcc.id,
          paymentMode: "upi",
          merchantOrPerson: ["Big Basket", "Zepto", "DMart", "Reliance Fresh"][w],
          description: "Weekly groceries",
          billAvailable: 1,
          gstApplicable: 1,
          taxFlag: 0,
          businessOrPersonal: "personal",
          needWant: "need",
          fixedVariable: "variable",
          plannedUnplanned: "planned",
        },
      });
    }
    // Food/dining — multiple times
    for (let i = 0; i < 6; i++) {
      await transactionRepo.create({
        userId: uid,
        data: {
          date: iso(addDays(monthStart, 3 + i * 4)),
          type: "expense",
          amount: 250 + Math.round(Math.random() * 1200),
          categoryId: expenseCats.Food?.id,
          accountId: upiAcc.id,
          paymentMode: i % 2 ? "upi" : "credit_card",
          linkedCardId: i % 2 ? undefined : card.id,
          merchantOrPerson: ["Swiggy", "Zomato", "Starbucks", "Barbeque Nation"][i % 4],
          description: "Meal",
          billAvailable: 1,
          gstApplicable: 1,
          taxFlag: 0,
          businessOrPersonal: "personal",
          needWant: "want",
          fixedVariable: "variable",
          plannedUnplanned: "unplanned",
        },
      });
    }
    // Fuel
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 10)),
        type: "expense",
        amount: 2500,
        categoryId: expenseCats.Fuel?.id,
        accountId: upiAcc.id,
        paymentMode: "credit_card",
        linkedCardId: card.id,
        merchantOrPerson: "HP Petrol Pump",
        description: "Fuel",
        billAvailable: 1,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "need",
        fixedVariable: "variable",
        plannedUnplanned: "planned",
      },
    });
    // Shopping occasional
    if (m % 2 === 1) {
      await transactionRepo.create({
        userId: uid,
        data: {
          date: iso(addDays(monthStart, 15)),
          type: "expense",
          amount: 3500 + Math.round(Math.random() * 4500),
          categoryId: expenseCats.Shopping?.id,
          accountId: upiAcc.id,
          paymentMode: "credit_card",
          linkedCardId: card.id,
          merchantOrPerson: ["Myntra", "Amazon", "Flipkart"][m % 3],
          description: "Online shopping",
          billAvailable: 1,
          gstApplicable: 1,
          taxFlag: 0,
          businessOrPersonal: "personal",
          needWant: "want",
          fixedVariable: "variable",
          plannedUnplanned: "unplanned",
        },
      });
    }
    // Entertainment
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 18)),
        type: "expense",
        amount: 499,
        categoryId: expenseCats.Subscriptions?.id,
        accountId: upiAcc.id,
        paymentMode: "auto_debit",
        merchantOrPerson: "Netflix",
        description: "Subscription",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "want",
        fixedVariable: "fixed",
        plannedUnplanned: "planned",
      },
    });
    // Travel (occasional)
    if (m === 1) {
      await transactionRepo.create({
        userId: uid,
        data: {
          date: iso(addDays(monthStart, 20)),
          type: "expense",
          amount: 18500,
          categoryId: expenseCats.Travel?.id,
          accountId: savingsAcc.id,
          paymentMode: "credit_card",
          linkedCardId: card.id,
          merchantOrPerson: "MakeMyTrip",
          description: "Goa weekend",
          billAvailable: 1,
          gstApplicable: 1,
          taxFlag: 0,
          businessOrPersonal: "personal",
          needWant: "want",
          fixedVariable: "variable",
          plannedUnplanned: "unplanned",
        },
      });
    }
    // EMI payment entry (expense)
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 5)),
        type: "emi_payment",
        amount: paiseToRupees(schedule[0].emiPaise),
        amountPaise: schedule[0].emiPaise,
        linkedLoanId: loan.id,
        accountId: savingsAcc.id,
        paymentMode: "auto_debit",
        merchantOrPerson: "SBI Home Loan",
        description: "EMI",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 1,
        businessOrPersonal: "personal",
        needWant: "need",
        fixedVariable: "fixed",
        plannedUnplanned: "planned",
      },
    });
    // SIP contribution
    await transactionRepo.create({
      userId: uid,
      data: {
        date: iso(addDays(monthStart, 7)),
        type: "investment_contribution",
        amount: 10000,
        linkedSavingsId: sip.id,
        accountId: savingsAcc.id,
        paymentMode: "auto_debit",
        merchantOrPerson: "Mirae Asset",
        description: "SIP contribution",
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "unassigned",
        fixedVariable: "fixed",
        plannedUnplanned: "planned",
      },
    });
    // CC payment
    if (m > 0) {
      await transactionRepo.create({
        userId: uid,
        data: {
          date: iso(addDays(monthStart, 22)),
          type: "cc_payment",
          amount: 14500 + Math.round(Math.random() * 4000),
          linkedCardId: card.id,
          accountId: savingsAcc.id,
          paymentMode: "bank_transfer",
          merchantOrPerson: "HDFC Credit Card",
          description: "Credit card bill",
          billAvailable: 0,
          gstApplicable: 0,
          taxFlag: 0,
          businessOrPersonal: "personal",
          needWant: "need",
          fixedVariable: "variable",
          plannedUnplanned: "planned",
        },
      });
    }
  }

  // -------- Budgets (current month)
  const curMonth = new Date().getMonth() + 1;
  const curYear = new Date().getFullYear();
  const budgetPlan: [string, number][] = [
    ["Food & Dining", 6000],
    ["Groceries", 8000],
    ["Rent", 28000],
    ["Electricity", 3000],
    ["Fuel", 3000],
    ["Shopping", 5000],
    ["Subscriptions", 1000],
    ["Travel", 4000],
  ];
  for (const [name, amount] of budgetPlan) {
    const c = cats.find((x) => x.name === name);
    if (!c) continue;
    await budgetRepo.create({
      userId: uid,
      data: {
        period: "monthly",
        month: curMonth,
        year: curYear,
        categoryId: c.id,
        amount,
        mode: "flexible",
        carryForward: 0,
        rolloverSavings: 0,
      },
    });
  }

  void ppf;
  await auditRepo.create({
    userId: uid,
    data: {
      action: "create",
      entity: "DemoData",
      detail: `Seeded demo data on ${format(new Date(), "dd MMM yyyy")}`,
    },
  });
  void calculateEMI;
}
