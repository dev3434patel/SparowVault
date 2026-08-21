export const en = {
  dashboard: {
    trueIncome: "True income",
    consumptionExpense: "Consumption expense",
    operatingSurplus: "Operating surplus",
    bankAndCash: "Bank & cash",
  },
  nav: {
    overview: "Overview",
    ledger: "Ledger",
    planning: "Planning",
    money: "Money",
    insights: "Insights",
    data: "Data",
    system: "System",
    billCalendar: "Bill calendar",
    reconciliation: "Reconciliation",
    household: "Household",
  },
  modes: {
    essential: "Essential",
    family: "Family",
    wealth: "Wealth",
  },
} as const;

export type Messages = typeof en;
