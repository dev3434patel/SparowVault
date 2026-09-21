import { describe, expect, it } from "vitest";
import { analyzeStatement, reconcileStatement, statementDate, statementPaise } from "../../src/services/statements/parser";
import { decisionProblems, monthlyStatementTotals, statementDuplicate, suggestStatementDecision } from "../../src/services/statements/classification";
import type { StatementPage, StatementRow } from "../../src/services/statements/types";
import type { Category, Transaction } from "../../src/types";

function fixture(bank = "HDFC Bank", labels = ["Date", "Narration", "Chq/Ref No", "Withdrawal Amt", "Deposit Amt", "Closing Balance"]): StatementPage {
  const page: StatementPage = { number: 1, width: 720, height: 840, tokens: [] };
  const line = (y: number, texts: string[], positions = [20, 90, 310, 400, 485, 575]) => texts.forEach((text, i) => { if (text) page.tokens.push({ text, x: positions[i], y, width: Math.min(170, text.length * 4), height: 10 }); });
  line(30, [bank]); line(50, ["Statement Period: 01/08/2026 to 31/08/2026"]); line(70, ["Currency: INR"]); line(90, ["Opening Balance: 10,000.00"]);
  line(120, labels);
  line(150, ["01/08/2026", "SALARY ACME", "R01", "", "50,000.00", "60,000.00"]);
  line(180, ["02/08/2026", "UPI ZOMATO", "R02", "500.50", "", "59,499.50"]);
  line(210, ["03/08/2026", "UPI UNKNOWN PERSON", "R03", "1,000.00", "", "58,499.50"]);
  line(250, ["Closing Balance: 58,499.50"]);
  return page;
}
const row = (change: Partial<StatementRow> = {}): StatementRow => ({ id: "1", date: "2026-08-01", page: 1, y: 120, description: "UPI UNKNOWN PERSON", reference: "R01", debitPaise: 10000, creditPaise: 0, balancePaise: 90000, issues: [], ...change });
const category = (id: string, name: string, appliesTo: "income" | "expense"): Category => ({ id, userId: "user", name, appliesTo, createdAt: "", updatedAt: "", version: 1, isDeleted: 0, tags: [], notes: "", icon: "tag", color: "#000", archived: 0, sortOrder: 0, budgetable: 1, taxRelevant: 0, gstRelevant: 0 });

function numberedKotakFixture(): StatementPage[] {
  const pages = Array.from({ length: 4 }, (_, i): StatementPage => ({ number: i + 1, width: 595, height: 842, tokens: [] }));
  const add = (page: number, y: number, values: [number, string, number?][]) => values.forEach(([x, text, width]) => pages[page - 1].tokens.push({ text, x, y, width: width ?? text.length * 3.5, height: 8 }));
  for (let page = 1; page <= 4; page++) {
    add(page, 45, [[36, "Account Statement", 72], [111, "01 Apr 2025 - 31 Mar 2026", 97]]);
    add(page, 826, [[36, "Statement Generated on 01 Apr 2026, 12:00", 171], [514, `Page ${page} of`, 42], [559, "4", 4]]);
  }
  add(1, 70, [[36, "Currency: INR"]]);
  add(1, 200, [[44, "#", 4], [75.18, "Date", 17.58], [124.19, "Description", 43.26], [279.66, "Chq/Ref. No.", 47.38], [354.85, "Withdrawal (Dr.)", 61.34], [428.9, "Deposit (Cr.)", 46.66], [497.95, "Balance", 30.15]]);
  add(1, 220, [[39, "-", 2], [70.18, "-", 2], [119.19, "Opening Balance", 55], [274.66, "-", 2], [415.51, "-", 2], [484.56, "-", 2], [529.27, "1,000.00", 27]]);
  add(1, 240, [[39, "1", 4], [73, "02 Apr 2025", 37], [119.19, "SALARY TEST", 46], [274.66, "R01", 12], [459, "5,000.00", 27], [529, "6,000.00", 27]]);
  add(1, 260, [[39, "2", 4], [73, "03 Apr 2025", 37], [119.19, "UPI TEST SHOP", 50], [274.66, "R02", 12], [397, "100.25", 21], [529, "5,899.75", 27]]);
  add(1, 270, [[119.19, "WRAPPED NARRATION", 75]]);
  add(2, 100, [[39, "3", 4], [73, "30 Mar 2026", 37], [119.19, "TRANSFER HDFC BANK", 77], [274.66, "R03", 12], [391, "2,000.00", 27], [529, "3,899.75", 27]]);
  add(2, 120, [[39, "4", 4], [73, "31 Mar 2026", 37], [119.19, "TEST REFUND", 50], [274.66, "R04", 12], [469, "50.00", 17], [529, "3,949.75", 27]]);
  add(3, 97.5, [[251, "Account Summary", 92]]);
  add(3, 126, [[53.4, "Particulars", 41], [285.73, "Opening Balance", 64], [428.36, "Closing Balance", 60]]);
  add(3, 148.68, [[43.61, "Savings Account (SA):", 69], [359.64, "1,000.00", 27], [502, "3,949.75", 27]]);
  add(3, 799, [[63.75, "Registered Office: Synthetic test address. www.kotak.bank.in", 300]]);
  add(4, 100, [[39, "Important information for your account"]]);
  add(4, 625, [[39, "ATL - ATM withdrawal", 100], [300, "Interest information 5,000.00", 140]]);
  return pages;
}

describe("strict statement normalization", () => {
  it.each([["1,23,456.78", 12345678], ["123,456.78", 12345678], ["0.01", 1], ["Rs. 1,000.5", 100050], ["1.00 CR", 100]])("parses integer money %s", (input, expected) => expect(statementPaise(input)).toBe(expected));
  it.each(["1,2,3.45", "1O0.00", "1.234", "1e3", "NaN", "Infinity", "-10.00", "10.00 DR", "10000000001.00", "1 000.00", "1,000,00"]) ("rejects ambiguous money %s", input => expect(statementPaise(input)).toBeNull());
  it("handles negative running balances only in signed fields", () => { expect(statementPaise("100.00 DR", true)).toBe(-10000); expect(statementPaise("(100.00)", true)).toBe(-10000); });
  it.each([["29/02/2024", "2024-02-29"], ["01-08-26", "2026-08-01"], ["02 Aug 2026", "2026-08-02"], ["2026-08-01", "2026-08-01"], ["31/02/2026", null], ["2026-02-29", null], ["08/31/2026", null]])("checks actual calendar date %s", (input, expected) => expect(statementDate(input)).toBe(expected));
});
describe("statement layout extraction", () => {
  it.each([["State Bank of India", "sbi"], ["Central Bank of India", "central"], ["Union Bank of India", "union"], ["Bank of India", "boi"], ["South Indian Bank", "south_indian"], ["Indian Bank", "indian"]])("distinguishes overlapping bank names: %s", (name, expected) => {
    expect(analyzeStatement([fixture(name)]).bank).toBe(expected);
  });
  it("does not suppress a separate bank heading when names overlap", () => {
    const page = fixture("State Bank of India / Bank of India");
    expect(analyzeStatement([page]).issues).toContain("Multiple bank headings detected. Upload one account statement at a time.");
  });
  it.each([
    ["HDFC Bank", "hdfc", ["Date", "Narration", "Chq/Ref No", "Withdrawal Amt", "Deposit Amt", "Closing Balance"]],
    ["Kotak Mahindra Bank", "kotak", ["Date", "Narration", "Ref No", "Debit", "Credit", "Balance"]],
    ["State Bank of India", "sbi", ["Txn Date", "Description", "Ref No/Cheque No", "Debit", "Credit", "Balance"]],
    ["IndusInd Bank", "indusind", ["Date", "Particulars", "Chq No", "Withdrawal", "Deposit", "Balance"]],
    ["Axis Bank", "axis", ["Tran Date", "Particulars", "Cheque No", "Debit", "Credit", "Balance"]],
  ])("extracts synthetic %s headings without collapsing debit/credit", (label, id, headers) => {
    const result = analyzeStatement([fixture(label as string, headers as string[])]);
    expect(result.bank).toBe(id); expect(result.rows).toHaveLength(3); expect(result.issues).toEqual([]); expect(result.rows.flatMap(r => r.issues)).toEqual([]);
    expect(result.periodFrom).toBe("2026-08-01"); expect(result.periodTo).toBe("2026-08-31"); expect(result.periodSource).toBe("printed");
    expect(reconcileStatement(result.rows, result.openingPaise, result.closingPaise, result.order)).toMatchObject({ matched: true, debitPaise: 150050, creditPaise: 5000000 });
  });
  it("does not detect another bank from a transaction narration", () => {
    const page = fixture(); page.tokens.find(t => t.text === "SALARY ACME")!.text = "TRANSFER AXIS BANK";
    expect(analyzeStatement([page]).bank).toBe("hdfc");
  });
  it("does not treat balance words in a transaction narration as statement metadata", () => {
    const page = fixture(); page.tokens.find(t => t.text === "SALARY ACME")!.text = "Opening Balance: 100";
    const result = analyzeStatement([page]); expect(result.rows).toHaveLength(3); expect(result.openingPaise).toBe(1000000);
  });
  it("blocks bank mismatch and non-INR/credit-card headings", () => {
    expect(analyzeStatement([fixture()], "sbi").issues.join(" ")).toMatch(/does not match/);
    expect(analyzeStatement([fixture("HDFC Bank USD")]).issues.join(" ")).toMatch(/Non-INR/);
    expect(analyzeStatement([fixture("HDFC Bank Credit Card Statement")]).issues.join(" ")).toMatch(/Credit-card/);
  });
  it("blocks empty/scanned pages instead of accepting the other pages", () => {
    expect(analyzeStatement([fixture(), { number: 2, width: 720, height: 840, tokens: [] }]).issues.join(" ")).toMatch(/Scanned/);
  });
  it("retains wrapped narration and flags unassigned monetary lines", () => {
    const page = fixture(); page.tokens.push({ text: "ORDER 12345", x: 90, y: 191, width: 50, height: 10 });
    expect(analyzeStatement([page]).rows[1].description).toBe("UPI ZOMATO ORDER 12345");
    page.tokens.push({ text: "500.00", x: 400, y: 225, width: 30, height: 10 });
    expect(analyzeStatement([page]).issues.join(" ")).toMatch(/Unassigned/);
  });
  it("retains invalid dates/ambiguous amounts as blocking row issues", () => {
    const page = fixture(); page.tokens.find(t => t.text === "02/08/2026")!.text = "31/02/2026";
    page.tokens.find(t => t.text === "500.50")!.text = "5O0.50";
    const result = analyzeStatement([page]); expect(result.rows).toHaveLength(3); expect(result.rows[1].issues.length).toBeGreaterThan(1);
  });
  it("does not claim first-row opening balance is independently verified", () => {
    const page = fixture(); page.tokens = page.tokens.filter(t => !t.text.startsWith("Opening Balance"));
    const result = analyzeStatement([page]); expect(result.openingPaise).toBeNull(); expect(reconcileStatement(result.rows, null, result.closingPaise, result.order).matched).toBe(false);
  });
  it("validates every running balance, not only final net totals", () => {
    const result = analyzeStatement([fixture()]); result.rows[1].balancePaise! += 100;
    const check = reconcileStatement(result.rows, result.openingPaise, result.closingPaise, "ascending"); expect(check.matched).toBe(false); expect(check.errors.some(e => e.includes("Running balance"))).toBe(true);
  });
  it("detects reverse chronological order", () => {
    const page = fixture(); for (const token of page.tokens) { if (token.y === 150) token.y = 210; else if (token.y === 210) token.y = 150; }
    const result = analyzeStatement([page]); expect(result.order).toBe("descending"); expect(reconcileStatement(result.rows, result.openingPaise, result.closingPaise, result.order).matched).toBe(true);
  });
  it("supports amount plus explicit Dr/Cr without guessing from narration", () => {
    const page = fixture("Kotak Mahindra Bank", ["Date", "Narration", "Ref No", "Amount", "Dr/Cr", "Balance"]);
    for (const token of page.tokens) if ([150, 180, 210].includes(token.y) && token.x === 485) { token.x = 400; }
    page.tokens.push({ text: "CR", x: 485, y: 150, width: 10, height: 10 }, { text: "DR", x: 485, y: 180, width: 10, height: 10 }, { text: "DR", x: 485, y: 210, width: 10, height: 10 });
    const result = analyzeStatement([page]); expect(result.rows[0].creditPaise).toBe(5000000); expect(result.rows[1].debitPaise).toBe(50050); expect(result.rows.flatMap(r => r.issues)).toEqual([]);
  });
});
describe("review-first categorization", () => {
  const categories = [category("salary", "Salary", "income"), category("food", "Food & Dining", "expense")];
  it("suggests salary and food but never confirms purpose or personal/business scope", () => {
    expect(suggestStatementDecision(row({ description: "SALARY ACME", debitPaise: 0, creditPaise: 100 }), categories)).toMatchObject({ kind: "income", categoryId: "salary", scope: "", reviewed: false });
    expect(suggestStatementDecision(row({ description: "UPI ZOMATO" }), categories)).toMatchObject({ kind: "expense", categoryId: "food", reviewed: false });
  });
  it("unknown transfers are not guessed as income or expense", () => {
    expect(suggestStatementDecision(row(), categories).kind).toBe("");
    expect(suggestStatementDecision(row({ description: "NEFT LOAN DISBURSAL", debitPaise: 0, creditPaise: 100 }), categories)).toMatchObject({ kind: "", include: false });
    expect(suggestStatementDecision(row({ description: "ATM CASH WITHDRAWAL" }), categories).kind).toBe("transfer");
  });
  it("rejects contradictory purpose, missing category and unreviewed rows", () => {
    const decision = { ...suggestStatementDecision(row(), []), kind: "income" as const, reviewed: true };
    expect(decisionProblems(row(), decision, "account")).toContain("Purpose contradicts debit/credit direction");
    expect(decisionProblems(row(), decision, "account")).toContain("Choose a category");
  });
  it("flags possible existing transfers from either account without silently merging", () => {
    const tx = { id: "x", date: "2026-08-01", accountId: "from", toAccountId: "to", amountPaise: 10000, type: "transfer", description: "SELF TRANSFER", isDeleted: 0 } as Transaction;
    expect(statementDuplicate(row(), "from", [tx])).toMatch(/Possible match/);
    expect(statementDuplicate(row({ debitPaise: 0, creditPaise: 10000 }), "to", [tx])).toMatch(/Possible match/);
    expect(statementDuplicate(row(), "unrelated", [tx])).toBeNull();
  });
  it("monthly credits and debits are distinct from reviewed income and expenses", () => {
    const rows = [row({ id: "1", debitPaise: 0, creditPaise: 10000 }), row({ id: "2", description: "UPI ZOMATO" })];
    const decisions = Object.fromEntries(rows.map(r => [r.id, suggestStatementDecision(r, categories)]));
    expect(monthlyStatementTotals(rows, decisions)[0]).toMatchObject({ debitPaise: 10000, creditPaise: 10000, reviewedIncomePaise: 0, reviewedExpensePaise: 0 });
    decisions["2"] = { ...decisions["2"], reviewed: true, scope: "personal" };
    expect(monthlyStatementTotals(rows, decisions)[0].reviewedExpensePaise).toBe(10000);
  });
});

describe("Kotak numbered account statement regression", () => {
  it("separates a reader-joined date/narration item using the known date column", () => {
    const pages = numberedKotakFixture();
    for (const page of pages) for (const token of page.tokens) {
      if (token.x !== 73) continue;
      const narration = page.tokens.find(other => other.y === token.y && other.x === 119.19)!;
      token.text += ` ${narration.text}`; token.width = narration.x + narration.width - token.x;
      page.tokens = page.tokens.filter(other => other !== narration);
    }
    const result = analyzeStatement(pages); expect(result.rows).toHaveLength(4); expect(result.rows.flatMap(r => r.issues)).toEqual([]);
    expect(result.rows[0]).toMatchObject({ date: "2025-04-02", description: "SALARY TEST" });
  });
  it("extracts Dr/Cr columns, table opening, separate summary and headerless continuation", () => {
    const result = analyzeStatement(numberedKotakFixture());
    expect(result).toMatchObject({ bank: "kotak", parserVersion: "statement-text-v2", periodFrom: "2025-04-01", periodTo: "2026-03-31", periodSource: "printed", openingPaise: 100000, closingPaise: 394975, issues: [], warnings: [] });
    expect(result.rows).toHaveLength(4); expect(result.rows.flatMap(r => r.issues)).toEqual([]);
    expect(result.rows[1].description).toBe("UPI TEST SHOP WRAPPED NARRATION");
    expect(result.rows[2]).toMatchObject({ page: 2, description: "TRANSFER HDFC BANK", debitPaise: 200000, creditPaise: 0 });
    expect(reconcileStatement(result.rows, result.openingPaise, result.closingPaise, result.order)).toMatchObject({ matched: true, debitPaise: 210025, creditPaise: 505000 });
  });
  it("does not mistake continuation-page payee bank names for the issuer", () => {
    const pages = numberedKotakFixture(); pages[1].tokens.find(t => t.text === "TRANSFER HDFC BANK")!.text = "STATE BANK OF INDIA";
    expect(analyzeStatement(pages).bank).toBe("kotak"); expect(analyzeStatement(pages, "sbi").issues.join(" ")).toMatch(/does not match/);
  });
  it.each(["missing", "repeated", "count"])("blocks %s page markers even with balanced rows", kind => {
    const pages = numberedKotakFixture(); const token = pages[3].tokens.find(t => t.text === "Page 4 of")!;
    if (kind === "missing") pages[3].tokens = pages[3].tokens.filter(t => t !== token);
    else if (kind === "repeated") token.text = "Page 3 of";
    else pages[3].tokens.find(t => t.x === 559)!.text = "5";
    expect(analyzeStatement(pages).issues.join(" ")).toMatch(/page numbering/);
  });
  it("blocks missing source transaction numbers even when monetary amounts offset", () => {
    const pages = numberedKotakFixture(); pages[1].tokens.find(t => t.x === 39 && t.text === "3")!.text = "5";
    expect(analyzeStatement(pages).rows.flatMap(r => r.issues).join(" ")).toMatch(/numbering is not continuous/);
  });
  it.each(["opening", "closing", "invalid", "multiple", "missing"])("validates %s independent summary evidence", kind => {
    const pages = numberedKotakFixture();
    if (kind === "opening") pages[2].tokens.find(t => t.x === 359.64)!.text = "1,000.01";
    if (kind === "closing") pages[2].tokens.find(t => t.x === 502)!.text = "3,949.76";
    if (kind === "invalid") pages[2].tokens.find(t => t.x === 502)!.text = "3,9O9.75";
    if (kind === "multiple") pages[2].tokens.push(...pages[2].tokens.filter(t => t.y === 148.68).map(t => ({ ...t, y: 170 })));
    if (kind === "missing") pages[2].tokens = pages[2].tokens.filter(t => t.y !== 148.68);
    const result = analyzeStatement(pages);
    expect(result.issues.length > 0 || !reconcileStatement(result.rows, result.openingPaise, result.closingPaise, result.order).matched).toBe(true);
  });
  it("does not carry column positions onto a differently sized continuation page", () => {
    const pages = numberedKotakFixture(); pages[1].width = 700;
    expect(analyzeStatement(pages).issues.join(" ")).toMatch(/outside a recognized table/);
  });
});
