import { describe, expect, it } from "vitest";
import { analyzeStatement, reconcileStatement } from "../../src/services/statements/parser";
import {
  statementEvidenceInventory,
  supportLabelForBank,
  uncertifiedLayoutIssue,
} from "../../src/services/statements/layoutRegistry";
import { BANKS } from "../../src/services/statements/types";
import type { StatementAnalysis } from "../../src/services/statements/types";
import oracle from "../fixtures/statements/v2/layout-money-oracles.json";
import { genericStatementPage, numberedKotakPages } from "../fixtures/statements/syntheticPages";

type MoneyOracle = {
  openingPaise: number;
  closingPaise: number;
  debitPaise: number;
  creditPaise: number;
  rows: Array<{
    date: string;
    description: string;
    reference: string;
    debitPaise: number;
    creditPaise: number;
    balancePaise: number;
  }>;
};

function moneyFor(spec: (typeof oracle.layouts)[number]): MoneyOracle {
  if (spec.kind === "kotak-numbered") {
    return {
      openingPaise: spec.openingPaise,
      closingPaise: spec.closingPaise,
      debitPaise: spec.debitPaise,
      creditPaise: spec.creditPaise,
      rows: spec.rows,
    };
  }
  return oracle.generic;
}

function pagesFor(spec: (typeof oracle.layouts)[number]) {
  if (spec.kind === "kotak-numbered") return numberedKotakPages();
  return [genericStatementPage(spec.heading, spec.headers)];
}

function expectMoneyIntact(result: StatementAnalysis, expected: MoneyOracle) {
  expect(result.issues).toEqual([]);
  expect(result.rows).toHaveLength(expected.rows.length);
  expect(result.openingPaise).toBe(expected.openingPaise);
  expect(result.closingPaise).toBe(expected.closingPaise);
  const debitPaise = result.rows.reduce((sum, row) => sum + row.debitPaise, 0);
  const creditPaise = result.rows.reduce((sum, row) => sum + row.creditPaise, 0);
  expect(debitPaise).toBe(expected.debitPaise);
  expect(creditPaise).toBe(expected.creditPaise);
  expect(expected.openingPaise + creditPaise - debitPaise).toBe(expected.closingPaise);
  expected.rows.forEach((row, index) => expect(result.rows[index]).toMatchObject(row));
  const reconciled = reconcileStatement(result.rows, result.openingPaise, result.closingPaise, result.order);
  expect(reconciled.errors).toEqual([]);
  expect(reconciled.matched).toBe(true);
  expect(reconciled.debitPaise).toBe(expected.debitPaise);
  expect(reconciled.creditPaise).toBe(expected.creditPaise);
}

describe("layout money oracles", () => {
  it.each(oracle.layouts)("reconciles $layoutId", (spec) => {
    const expected = moneyFor(spec);
    expect(expected.openingPaise + expected.creditPaise - expected.debitPaise).toBe(expected.closingPaise);
    const result = analyzeStatement(pagesFor(spec));
    expect(result.bank).toBe(spec.bankId);
    expectMoneyIntact(result, expected);
  });

  it("fails when a parsed debit changes by one paise", () => {
    const spec = oracle.layouts.find((layout) => layout.bankId === "hdfc");
    if (!spec || spec.kind !== "generic") throw new Error("hdfc generic oracle missing");
    const result = analyzeStatement(pagesFor(spec));
    result.rows[1].debitPaise -= 1;
    const reconciled = reconcileStatement(result.rows, result.openingPaise, result.closingPaise, result.order);
    expect(reconciled.matched).toBe(false);
    expect(result.rows.reduce((sum, row) => sum + row.debitPaise, 0)).not.toBe(oracle.generic.debitPaise);
  });
});

describe("uncertified bank layouts", () => {
  const inventory = statementEvidenceInventory();

  it("counts recognized, fixture-tested, and verified-for-scope exactly", () => {
    expect(inventory.recognized).toBe(BANKS.length);
    expect(inventory.recognized).toBe(38);
    expect(inventory.fixtureTested).toBe(oracle.layouts.length);
    expect(inventory.fixtureTested).toBe(5);
    expect(inventory.verifiedForScope).toBe(0);
    expect(inventory.registeredOnly).toBe(15);
    expect(inventory.noLayoutSpec).toBe(18);
    expect(inventory.recognized).toBe(inventory.fixtureTested + inventory.registeredOnly + inventory.noLayoutSpec);
    expect(new Set(oracle.layouts.map((layout) => layout.layoutId)).size).toBe(inventory.fixtureTested);
  });

  it.each(inventory.banks.filter((bank) => bank.evidenceClass !== "fixture-tested"))("$bankId stays $evidenceClass", (bank) => {
    expect(supportLabelForBank(bank.bankId)).toMatch(/not certified/i);
    expect(uncertifiedLayoutIssue(bank.bankId)).toMatch(/not certified/i);
    const record = BANKS.find((item) => item.id === bank.bankId);
    const heading = bank.bankId === "other" ? "Account statement" : record?.name ?? "Account statement";
    const result = analyzeStatement(
      [genericStatementPage(heading)],
      bank.bankId === "other" ? "other" : "auto",
    );
    expect(result.bank).toBe(bank.bankId);
    expect(result.rows).toHaveLength(3);
    expect(result.issues).toContain(uncertifiedLayoutIssue(bank.bankId));
    expect(result.issues.some((issue) => /not certified/i.test(issue))).toBe(true);
    const reconciled = reconcileStatement(result.rows, result.openingPaise, result.closingPaise, result.order);
    expect(reconciled.matched).toBe(true);
    expect(reconciled.debitPaise).toBe(oracle.generic.debitPaise);
    expect(reconciled.creditPaise).toBe(oracle.generic.creditPaise);
  });
});
