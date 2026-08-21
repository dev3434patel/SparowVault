/**
 * PHASE 0 — Fixture index. Lets consumers do:
 *   import { allFixtures } from "tests/fixtures/users";
 */
import cash from "./01-cash-account";
import bank from "./02-bank-account";
import card from "./03-credit-card";
import loan from "./04-personal-loan";
import udhariR from "./05-udhari-receivable";
import udhariP from "./06-udhari-payable";
import goal from "./07-goal";
import budgets from "./08-income-and-budgets";

import type { Fixture } from "./_types";

export const allFixtures: Fixture[] = [
  cash,
  bank,
  card,
  loan,
  udhariR,
  udhariP,
  goal,
  budgets,
];

export { cash, bank, card, loan, udhariR, udhariP, goal, budgets };
export * from "./_types";
