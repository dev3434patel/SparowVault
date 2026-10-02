import type { StatementPage } from "../../../src/services/statements/types";

/** Token page matching the shared geometric header spec used by the synthetic PDFs. */
export function genericStatementPage(
  bank = "HDFC Bank",
  labels = ["Date", "Narration", "Chq/Ref No", "Withdrawal Amt", "Deposit Amt", "Closing Balance"],
): StatementPage {
  const page: StatementPage = { number: 1, width: 720, height: 840, tokens: [] };
  const line = (y: number, texts: string[], positions = [20, 90, 310, 400, 485, 575]) => texts.forEach((text, i) => {
    if (text) page.tokens.push({ text, x: positions[i], y, width: Math.min(170, text.length * 4), height: 10 });
  });
  line(30, [bank]);
  line(50, ["Statement Period: 01/08/2026 to 31/08/2026"]);
  line(70, ["Currency: INR"]);
  line(90, ["Opening Balance: 10,000.00"]);
  line(120, labels);
  line(150, ["01/08/2026", "SALARY ACME", "R01", "", "50,000.00", "60,000.00"]);
  line(180, ["02/08/2026", "UPI ZOMATO", "R02", "500.50", "", "59,499.50"]);
  line(210, ["03/08/2026", "UPI UNKNOWN PERSON", "R03", "1,000.00", "", "58,499.50"]);
  line(250, ["Closing Balance: 58,499.50"]);
  return page;
}

/** Token pages matching the Kotak numbered layout already implemented in the parser. */
export function numberedKotakPages(): StatementPage[] {
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
