import { BANKS, type BankId, type StatementAnalysis, type StatementPage, type StatementRow, type StatementToken } from "./types";
import { detectStatementIssuer } from "./issuer";
import { uncertifiedLayoutIssue } from "./layoutRegistry";
import { buildPageCoverage, isNonTransactionNarration } from "./verifier";

export const MAX_STATEMENT_ROWS = 2000;
export const MAX_STATEMENT_PAISE = 1_000_000_000_000;
const datePattern = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.\-]\d{1,2}[/.\-](?:\d{4}|\d{2})|\d{1,2}[ \-][A-Za-z]{3}[ \-](?:\d{4}|\d{2}))\b/g;
const transactionStart = /^\s*(?:\d+\s+)?(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.\- ](?:\d{1,2}|[A-Za-z]{3})[/.\- ]\d{2,4})(?:\s|$)/;

export function statementDate(raw: string): string | null {
  const text = raw.trim();
  let day: number, month: number, year: number;
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) [, year, month, day] = match.map(Number);
  else {
    match = /^(\d{1,2})[/.\- ](\d{1,2}|[A-Za-z]{3})[/.\- ](\d{4}|\d{2})$/.exec(text);
    if (!match) return null;
    day = Number(match[1]);
    month = /^\d+$/.test(match[2]) ? Number(match[2]) : ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(match[2].toLowerCase()) + 1;
    year = Number(match[3]);
    if (match[3].length === 2) year += 2000;
  }
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** No float parsing, locale guessing, OCR character correction or arbitrary comma removal. */
export function statementPaise(raw: string, signed = false): number | null {
  let text = raw.trim().replace(/^(?:INR|Rs\.?|\u20b9)\s*/i, "");
  if (!text || /^(?:-|--|\u2014)$/.test(text)) return null;
  let negative = false;
  const direction = /\s*(CR|DR)\.?$/i.exec(text);
  if (direction) { negative = direction[1].toUpperCase() === "DR"; text = text.slice(0, direction.index).trim(); }
  if (/^\(.*\)$/.test(text)) { negative = true; text = text.slice(1, -1); }
  if (text.startsWith("-")) { negative = true; text = text.slice(1); }
  if (negative && !signed) return null;
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, cents = ""] = text.replaceAll(",", "").split(".");
  const result = BigInt(whole) * 100n + BigInt(cents.padEnd(2, "0"));
  if (result > BigInt(MAX_STATEMENT_PAISE)) return null;
  return Number(result) * (negative ? -1 : 1);
}

type Column = "sequence" | "date" | "valueDate" | "description" | "reference" | "debit" | "credit" | "balance" | "amount" | "direction";
interface Anchor { key: Column; x: number; end: number }
interface Line { y: number; tokens: StatementToken[]; text: string }
function lines(page: StatementPage): Line[] {
  const result: Line[] = [];
  for (const token of [...page.tokens].filter(t => t.text.trim()).sort((a, b) => a.y - b.y || a.x - b.x)) {
    let line = result[result.length - 1];
    if (!line || Math.abs(line.y - token.y) > 3) { line = { y: token.y, tokens: [], text: "" }; result.push(line); }
    line.tokens.push(token);
  }
  return result.map(line => ({ ...line, tokens: line.tokens.sort((a, b) => a.x - b.x), text: line.tokens.map(t => t.text.trim()).join(" ") }));
}
function column(raw: string): Column | null {
  if (raw.trim() === "#") return "sequence";
  const value = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (/^(transactiondate|txndate|trandate|date|postingdate)$/.test(value)) return "date";
  if (/^(valuedate|value)$/.test(value)) return "valueDate";
  if (/^(description|narration|particulars|transactiondetails|details)$/.test(value)) return "description";
  if (/^(withdrawal|withdrawals|withdrawalamt|withdrawalamount|withdrawaldr|debit|debitamount|debitamt|dramount)$/.test(value)) return "debit";
  if (/^(deposit|deposits|depositamt|depositamount|depositcr|credit|creditamount|creditamt|cramount)$/.test(value)) return "credit";
  if (/^(balance|closingbalance|runningbalance|balanceinr)$/.test(value)) return "balance";
  if (/^(amount|transactionamount|amountinr)$/.test(value)) return "amount";
  if (/^(drcr|crdr|type)$/.test(value)) return "direction";
  if (/^(ref|refno|reference|referenceno|chqrefno|chequeno|chequenumber|refnochequeno|chqno)$/.test(value)) return "reference";
  return null;
}
function header(line: Line, next?: Line): Anchor[] | null {
  const tokens = [...line.tokens];
  if (next && next.y - line.y < 16) tokens.push(...next.tokens.filter(t => /^[A-Za-z /().]+$/.test(t.text)));
  const found = new Map<Column, Anchor>();
  for (const token of tokens) {
    const key = column(token.text);
    if (key && !found.has(key)) found.set(key, { key, x: token.x, end: token.x + token.width });
  }
  if (!found.has("date") || !found.has("description") || !found.has("balance")) return null;
  if (!(found.has("debit") && found.has("credit")) && !(found.has("amount") && found.has("direction"))) return null;
  return [...found.values()].sort((a, b) => a.x - b.x);
}
function cells(line: Line, anchors: Anchor[]): Partial<Record<Column, string>> {
  const result: Partial<Record<Column, string>> = {};
  const dateIndex = anchors.findIndex(anchor => anchor.key === "date");
  const dateColumn = anchors[dateIndex], nextColumn = anchors[dateIndex + 1];
  // Header starts establish the left boundary. Use a small tolerance for right-aligned numeric cells.
  for (const token of line.tokens) {
    // PDF readers sometimes join adjacent date/narration cells into one text item.
    const joinedDate = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/.\- ](?:\d{1,2}|[A-Za-z]{3})[/.\- ]\d{2,4})\s+(.+)$/.exec(token.text);
    if (joinedDate && statementDate(joinedDate[1]) && dateColumn && nextColumn?.key === "description" && token.x >= dateColumn.x - 5 && token.x < nextColumn.x - 5 && token.x + token.width > nextColumn.x - 5) {
      result.date = `${result.date ?? ""} ${joinedDate[1]}`.trim();
      result.description = `${result.description ?? ""} ${joinedDate[2]}`.trim();
      continue;
    }
    const center = token.x + token.width / 2;
    let target = anchors[0];
    for (let i = 1; i < anchors.length; i++) {
      const prev = anchors[i - 1], current = anchors[i];
      const boundary = ["debit", "credit", "balance", "amount"].includes(current.key)
        ? (prev.end + current.x) / 2 : current.x - 5;
      if (center >= boundary) target = current;
    }
    result[target.key] = `${result[target.key] ?? ""} ${token.text}`.trim();
  }
  return result;
}
const blankAmount = (value: string) => /^(?:\s*|-|--|\u2014)$/.test(value);
function summaryAmount(line: string, kind: "opening" | "closing"): number | null {
  const label = kind === "opening" ? /^\s*(?:opening\s+bal(?:ance)?\.?|balance\s+brought\s+forward)\s*[:\-]?\s*/i : /^\s*(?:closing\s+bal(?:ance)?\.?|ending\s+balance)\s*[:\-]?\s*/i;
  const match = label.exec(line);
  if (!match) return null;
  const after = line.slice(match.index + match[0].length).trim();
  const amount = /^(?:(?:INR|Rs\.?|\u20b9)\s*)?[-(]?[\d,]+(?:\.\d{1,2})?\)?(?:\s*(?:CR|DR))?/i.exec(after);
  return amount ? statementPaise(amount[0], true) : null;
}

function isKotakNumberedHeader(line: Line): boolean {
  const labels = line.tokens.map(token => token.text.toLowerCase().replace(/[^a-z#]/g, ""));
  return ["#", "date", "description", "chqrefno", "withdrawaldr", "depositcr", "balance"].every(label => labels.includes(label));
}

function kotakAccountSummary(pageLines: Line[]) {
  const heading = pageLines.findIndex(line => /^Account Summary$/i.test(line.text));
  if (heading < 0) return [];
  const index = pageLines.findIndex((line, i) => i > heading && ["Particulars", "Opening Balance", "Closing Balance"].every(label => line.tokens.some(token => token.text === label)));
  if (index < 0) return [];
  const header = pageLines[index];
  const openingX = header.tokens.find(token => token.text === "Opening Balance")!.x;
  const closingX = header.tokens.find(token => token.text === "Closing Balance")!.x;
  return pageLines.slice(index + 1).filter(line => line.y - header.y < 90 && /^(?:Savings|Current) Account\b/i.test(line.text)).map(line => {
    const amount = (min: number, max: number) => statementPaise(line.tokens.filter(t => t.x >= min && t.x < max).map(t => t.text).join(" "), true);
    return { opening: amount(openingX, closingX), closing: amount(closingX, Infinity) };
  });
}

export function reconcileStatement(rows: StatementRow[], opening: number | null, closing: number | null, order: "ascending" | "descending") {
  const errors: string[] = [];
  const chronological = order === "ascending" ? rows : [...rows].reverse();
  const debitPaise = rows.reduce((sum, row) => sum + row.debitPaise, 0);
  const creditPaise = rows.reduce((sum, row) => sum + row.creditPaise, 0);
  if (!rows.length) errors.push("No transaction rows were extracted.");
  if (opening === null) errors.push("Opening balance must be confirmed from the statement.");
  if (closing === null) errors.push("Closing balance must be confirmed from the statement.");
  let balance = opening;
  for (const [i, row] of chronological.entries()) {
    if (balance !== null && balance + row.creditPaise - row.debitPaise !== row.balancePaise) errors.push(`Running balance mismatch on page ${row.page}, row ${row.id}.`);
    if (row.balancePaise === null) errors.push(`Missing balance on row ${row.id}.`);
    balance = row.balancePaise;
    if (i && row.date < chronological[i - 1].date) errors.push("Transaction dates are not consistently ordered.");
  }
  if (balance !== null && closing !== null && balance !== closing) errors.push("Last running balance does not match the closing balance.");
  if (opening !== null && closing !== null && opening + creditPaise - debitPaise !== closing) errors.push("Opening + credits - debits does not equal closing.");
  return { errors: [...new Set(errors)], debitPaise, creditPaise, netPaise: creditPaise - debitPaise, matched: errors.length === 0 };
}

export function analyzeStatement(pages: StatementPage[], selectedBank: BankId | "auto" = "auto"): StatementAnalysis {
  const allLines = pages.map(page => ({ page, lines: lines(page) }));
  const numberedLayout = allLines.some(p => p.lines.some(isKotakNumberedHeader));
  // Bank branding must be in the page heading, not a transaction mentioning another bank.
  const heading = allLines.flatMap(p => {
    const tableStart = p.lines.findIndex((line, index) => header(line, p.lines[index + 1]) || transactionStart.test(line.text));
    return p.lines.slice(0, tableStart < 0 ? 12 : tableStart).filter(l => l.y < p.page.height * 0.22).map(l => l.text);
  }).join(" ");
  // This export's logo is an image. Use its bank-specific legal/footer text, never a payee name.
  const kotakBrand = numberedLayout && allLines.some(p => p.lines.some(line => /^Any discrepancy.*notice of Kotak Mahindra Bank\b/i.test(line.text) || /^Registered Office:.*www\.kotak\.(?:bank\.in|com)\b/i.test(line.text)));
  const spans = BANKS.flatMap(bank => [...heading.matchAll(new RegExp(bank.pattern.source, "gi"))].map(match => ({ bank, start: match.index!, end: match.index! + match[0].length })));
  const detected = BANKS.filter(bank => bank.id === "kotak" && kotakBrand || spans.some(span => span.bank.id === bank.id && !spans.some(other => other.bank.id !== bank.id && other.start <= span.start && other.end >= span.end && other.end - other.start > span.end - span.start)));
  const bank = detected.length === 1 ? detected[0].id : selectedBank === "auto" ? null : selectedBank;
  const issuer = detectStatementIssuer(pages);
  const result: StatementAnalysis = { parserVersion: "statement-text-v2", bank, rows: [], openingPaise: null, closingPaise: null, periodFrom: null, periodTo: null, periodSource: "transactions", order: "ascending", issues: [], warnings: [], pageCount: pages.length };
  const finish = () => {
    if (result.bank) {
      const certificationIssue = uncertifiedLayoutIssue(result.bank);
      if (certificationIssue) result.issues.push(certificationIssue);
    }
    result.issues = [...new Set(result.issues)];
    return result;
  };
  // Only strong header/footer issuer evidence can contradict the detected bank.
  if (!issuer.needsConfirmation && issuer.bankId && bank && issuer.bankId !== bank) {
    result.warnings.push(`Header/footer issuer hint (${issuer.bankId}) differs from selected/detected bank (${bank}).`);
  }
  const kotakNumbered = bank === "kotak" && numberedLayout;
  const ocrPages = pages.filter(page => page.extraction === "ocr");
  if (ocrPages.length) {
    result.parserVersion = "statement-ocr-v1";
    result.ocrPages = ocrPages.map(page => page.number);
    result.warnings.push("OCR-derived data: verify every date, amount, reference and row count against the original PDF. Arithmetic matching alone does not prove completeness.");
    for (const page of ocrPages) if ((page.confidence ?? 0) < 80) result.issues.push(`OCR confidence is too low on page ${page.number}. Use a clearer scan or the bank's original PDF.`);
  }
  if (selectedBank !== "auto" && detected.length === 1 && detected[0].id !== selectedBank) result.issues.push("Selected bank does not match the statement heading.");
  if (!bank) result.issues.push("Bank could not be identified. Select the issuing bank and analyze again.");
  if (detected.length > 1) result.issues.push("Multiple bank headings detected. Upload one account statement at a time.");
  if (/credit\s+card\s+statement|minimum\s+(?:amount\s+)?due|total\s+amount\s+due/i.test(heading)) result.issues.push("Credit-card statements need a separate liability parser; this import accepts bank account statements only.");
  let anchors: Anchor[] | null = null;
  let anchorPageWidth = 0;
  let lastRow: StatementRow | undefined;
  let lastNarrationY = 0;
  const summaryAccounts: { opening: number | null; closing: number | null }[] = [];
  let rowCounter = 0;
  for (const [pageIndex, { page, lines: pageLines }] of allLines.entries()) {
    const pageMarkers = pageLines.map(line => /\bPage\s+(\d+)\s+of\s+(\d+)\s*$/i.exec(line.text)).filter((match): match is RegExpExecArray => !!match);
    const pageVerified = pageMarkers.length === 1 && Number(pageMarkers[0][1]) === pageIndex + 1 && Number(pageMarkers[0][2]) === pages.length;
    if (kotakNumbered) {
      if (!pageVerified) result.issues.push(`Missing, repeated or inconsistent printed page numbering on page ${page.number}.`);
      summaryAccounts.push(...kotakAccountSummary(pageLines));
    }
    if (pageLines.reduce((n, line) => n + line.text.length, 0) < 20) { result.issues.push(`Page ${page.number} has no usable text. Scanned pages require OCR review and are not imported.`); continue; }
    // A numbered Kotak table may continue without a header. Require the same geometry and printed page identity.
    let pageHasHeader = kotakNumbered && pageVerified && !!anchors && Math.abs(anchorPageWidth - page.width) < 1 && pageLines.some(line => {
      const value = cells(line, anchors!);
      return /^\d+$/.test(value.sequence ?? "") && !!statementDate(value.date ?? "");
    });
    for (let i = 0; i < pageLines.length; i++) {
      const line = pageLines[i];
      const open = summaryAmount(line.text, "opening"), close = summaryAmount(line.text, "closing");
      if (open !== null) {
        if (result.openingPaise !== null && result.openingPaise !== open) result.issues.push("Conflicting opening balances detected.");
        result.openingPaise = open;
      }
      if (close !== null) {
        if (result.closingPaise !== null && result.closingPaise !== close) result.issues.push("Conflicting closing balances detected.");
        result.closingPaise = close;
      }
      if (/^(?:account\s+statement|statement\s+(?:period|from)|period\s*[:\-])|^from.*\bto\b/i.test(line.text)) {
        const dates = [...line.text.matchAll(datePattern)].map(m => statementDate(m[0])).filter((d): d is string => !!d);
        if (dates.length === 2 && dates[0] <= dates[1]) {
          if (result.periodSource === "printed" && (result.periodFrom !== dates[0] || result.periodTo !== dates[1])) result.issues.push("Conflicting statement periods detected.");
          result.periodFrom = dates[0]; result.periodTo = dates[1]; result.periodSource = "printed";
        }
      }
      const candidate = header(line, pageLines[i + 1]);
      if (candidate) { anchors = candidate; anchorPageWidth = page.width; pageHasHeader = true; continue; }
      if (open !== null || close !== null || /^(?:page\s+\d|opening\s+balance|closing\s+balance|total\b|(?:account\s+)?statement\b|end\s+of\s+statement|computer\s+generated)/i.test(line.text)) continue;
      const startsDate = transactionStart.test(line.text);
      if (!anchors || !pageHasHeader) {
        if (startsDate && /\d[,.]\d{2}/.test(line.text)) result.issues.push(`Possible transaction outside a recognized table on page ${page.number}.`);
        continue;
      }
      const cell = cells(line, anchors);
      const dateText = cell.date ?? "";
      const date = statementDate(dateText);
      if (kotakNumbered && /^(?:Opening|Closing) Balance$/i.test(cell.description ?? "") && [cell.sequence, cell.date, cell.reference, cell.debit, cell.credit].every(value => blankAmount(value ?? ""))) {
        const amount = statementPaise(cell.balance ?? "", true);
        const key = /^Opening/i.test(cell.description!) ? "openingPaise" : "closingPaise";
        if (amount === null) result.issues.push(`Invalid source ${key === "openingPaise" ? "opening" : "closing"} balance on page ${page.number}.`);
        else {
          if (result[key] !== null && result[key] !== amount) result.issues.push(`Conflicting source ${key === "openingPaise" ? "opening" : "closing"} balances.`);
          result[key] = amount;
        }
        continue;
      }
      if (isNonTransactionNarration(cell.description ?? "") && blankAmount(cell.debit ?? "") && blankAmount(cell.credit ?? "") && blankAmount(cell.amount ?? "")) {
        const amount = statementPaise(cell.balance ?? "", true);
        if (/opening|brought|b\/?\s*f/i.test(cell.description ?? "") && amount !== null) {
          result.openingPaise ??= amount;
        }
        if (/closing|carried|c\/?\s*f/i.test(cell.description ?? "") && amount !== null) {
          result.closingPaise ??= amount;
        }
        continue;
      }
      if (!date && !startsDate) {
        if (lastRow && !cell.sequence && !cell.date && cell.description && !cell.debit && !cell.credit && !cell.amount && !cell.balance && line.y - lastNarrationY < 45 && lastRow.page === page.number) {
          lastRow.description += ` ${cell.description}`;
          if (cell.reference) lastRow.reference += ` ${cell.reference}`;
          lastNarrationY = line.y;
        } else if ((cell.debit || cell.credit || cell.amount || cell.balance) && /\d[,.]\d{2}/.test(line.text)) result.issues.push(`Unassigned amount-bearing line on page ${page.number}; layout needs review.`);
        continue;
      }
      const row: StatementRow = { id: String(++rowCounter), page: page.number, y: line.y, date: date ?? dateText, description: cell.description ?? "", reference: cell.reference ?? "", debitPaise: 0, creditPaise: 0, balancePaise: statementPaise(cell.balance ?? "", true), issues: [] };
      if (kotakNumbered && (!/^\d+$/.test(cell.sequence ?? "") || Number(cell.sequence) !== rowCounter)) row.issues.push(`Source transaction numbering is not continuous; expected ${rowCounter}.`);
      if (!date) row.issues.push("Invalid or ambiguous transaction date.");
      if (cell.valueDate) { const valueDate = statementDate(cell.valueDate); if (valueDate) row.valueDate = valueDate; else row.issues.push("Invalid value date."); }
      for (const key of ["debit", "credit"] as const) {
        const raw = cell[key] ?? "";
        const amount = blankAmount(raw) ? 0 : statementPaise(raw);
        if (amount === null) row.issues.push(`Invalid ${key} amount.`);
        else row[key === "debit" ? "debitPaise" : "creditPaise"] = amount;
      }
      if (anchors.some(a => a.key === "amount")) {
        const amount = statementPaise(cell.amount ?? "");
        const direction = (cell.direction ?? "").toUpperCase().replaceAll(".", "");
        if (amount === null || !["DR", "CR", "DEBIT", "CREDIT"].includes(direction)) row.issues.push("Amount needs an explicit Dr/Cr direction.");
        else row[["DR", "DEBIT"].includes(direction) ? "debitPaise" : "creditPaise"] = amount;
      }
      if ((row.debitPaise > 0) === (row.creditPaise > 0)) row.issues.push("Exactly one positive debit or credit is required.");
      if (!row.description) row.issues.push("Missing transaction narration.");
      if (row.balancePaise === null) row.issues.push("Invalid or missing running balance.");
      result.rows.push(row); lastRow = row; lastNarrationY = line.y;
      if (result.rows.length > MAX_STATEMENT_ROWS) { result.issues.push(`More than ${MAX_STATEMENT_ROWS} rows; split the statement by period.`); return finish(); }
    }
  }
  if (kotakNumbered) {
    if (summaryAccounts.length !== 1) result.issues.push("A single account-summary row is required for this Kotak layout.");
    else {
      const summary = summaryAccounts[0];
      if (summary.opening === null || summary.closing === null) result.issues.push("Invalid balances in the printed account summary.");
      if (result.openingPaise !== null && summary.opening !== result.openingPaise) result.issues.push("Opening balance does not match the printed account summary.");
      if (result.closingPaise !== null && summary.closing !== result.closingPaise) result.issues.push("Closing balance does not match the printed account summary.");
      result.openingPaise ??= summary.opening;
      result.closingPaise ??= summary.closing;
    }
  }
  if (result.rows.length) {
    const dates = result.rows.map(r => r.date).sort();
    if (result.periodSource === "transactions") { result.periodFrom = dates[0]; result.periodTo = dates[dates.length - 1]; result.warnings.push("Period is inferred from transaction dates, not a printed statement period."); }
    else if (result.rows.some(row => row.date < result.periodFrom! || row.date > result.periodTo!)) result.issues.push("A transaction date is outside the printed statement period.");
    if (result.rows[0].date > result.rows[result.rows.length - 1].date) result.order = "descending";
    // Same-day-only files may still be reverse-ordered; use the balances only when one order is proven.
    const ascending = reconcileStatement(result.rows, result.openingPaise, result.closingPaise, "ascending");
    const descending = reconcileStatement(result.rows, result.openingPaise, result.closingPaise, "descending");
    if (descending.matched && !ascending.matched) result.order = "descending";
  } else result.issues.push("No supported transaction table found. Use a text-based bank account PDF with dated debit/credit and balance columns.");
  if (!/\bINR\b|\bRs\.?\b|\u20b9/i.test(allLines.flatMap(p => p.lines.map(l => l.text)).join(" "))) result.warnings.push("Currency was not identified; confirm this is an INR account statement.");
  if (/\b(?:USD|EUR|GBP|AED|JPY|AUD|SGD)\b/.test(heading)) result.issues.push("Non-INR statement detected; multi-currency import is not supported.");
  const pageCoverageResult = buildPageCoverage(
    pages.map((page) => ({
      number: page.number,
      tokenCount: page.tokens.reduce((n, token) => n + token.text.length, 0),
      extraction: page.extraction,
    })),
    result.rows,
  );
  result.pageCoverage = pageCoverageResult.coverage;
  for (const issue of pageCoverageResult.issues) result.issues.push(issue);
  if (result.ocrPages?.length) {
    result.warnings.push(
      "OCR critical fields require human verification even when page confidence is high; page confidence is not money-digit proof.",
    );
  }
  return finish();
}
