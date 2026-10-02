/**
 * Exact statement-bank evidence counts.
 * Synthetic fixtures stay fixture-tested. verified-for-scope requires a real holdout, which this repo does not have.
 */
import fs from "node:fs";
import path from "node:path";

const STATUS_ORDER = ["verified-for-scope", "real-corpus-tested", "synthetic-tested", "registered", "disabled"];
const ORACLE_PATH = "tests/fixtures/statements/v2/layout-money-oracles.json";
const MONEY_TEST_PATH = "tests/unit/statementLayoutMoney.test.ts";

function bestStatus(layouts, bankId) {
  const mine = layouts.filter((layout) => layout.bankId === bankId);
  if (!mine.length) return null;
  for (const status of STATUS_ORDER) {
    if (mine.some((layout) => layout.status === status)) return status;
  }
  return "registered";
}

function evidenceClass(status) {
  if (status === "verified-for-scope") return "verified-for-scope";
  if (status === "synthetic-tested") return "fixture-tested";
  if (!status) return "no-layout-spec";
  return "registered-only";
}

export function loadStatementEvidence(root) {
  const banks = JSON.parse(fs.readFileSync(path.join(root, "php/config/statement_banks.json"), "utf8"));
  const layoutsDoc = JSON.parse(fs.readFileSync(path.join(root, "php/config/statement_layouts.json"), "utf8"));
  const layouts = layoutsDoc.layouts;
  const oracle = JSON.parse(fs.readFileSync(path.join(root, ORACLE_PATH), "utf8"));
  const testSrc = fs.readFileSync(path.join(root, MONEY_TEST_PATH), "utf8");
  const oracleIds = new Set(oracle.layouts.map((layout) => layout.layoutId));
  const gaps = [];

  if (!testSrc.includes("analyzeStatement") || !testSrc.includes("reconcileStatement")) {
    gaps.push("layout money test does not run analyzeStatement and reconcileStatement");
  }
  if (!testSrc.includes("layout-money-oracles.json")) {
    gaps.push("layout money test does not load the synthetic oracle");
  }

  const rows = banks.map((bank) => {
    const status = bestStatus(layouts, bank.id);
    const layout = layouts.find((item) => item.bankId === bank.id && item.status === status) ?? null;
    const rowClass = evidenceClass(status);
    let testName = layout && rowClass === "fixture-tested" ? `reconciles ${layout.layoutId}` : `${bank.id} stays ${rowClass}`;
    if (rowClass === "fixture-tested" && layout) {
      if (!oracleIds.has(layout.layoutId)) {
        gaps.push(`${layout.layoutId} is synthetic-tested but missing from the money oracle`);
      }
      for (const rel of layout.evidence ?? []) {
        if (!fs.existsSync(path.join(root, rel))) gaps.push(`missing evidence file ${rel} for ${layout.layoutId}`);
      }
      if (!(layout.evidence ?? []).length) gaps.push(`${layout.layoutId} is synthetic-tested with no evidence paths`);
    }
    if (rowClass !== "fixture-tested" && layout && oracleIds.has(layout.layoutId)) {
      gaps.push(`${layout.layoutId} is in the money oracle but its registry status is ${layout.status}`);
    }
    if (status === "verified-for-scope") {
      gaps.push(`${layout?.layoutId ?? bank.id} is verified-for-scope without an authorized real-PDF holdout in this repo`);
    }
    return {
      bankId: bank.id,
      evidenceClass: rowClass,
      layoutId: layout?.layoutId ?? null,
      testName,
    };
  });

  const syntheticIds = layouts.filter((layout) => layout.status === "synthetic-tested").map((layout) => layout.layoutId).sort();
  const oracleIdList = [...oracleIds].sort();
  if (syntheticIds.join("\n") !== oracleIdList.join("\n")) {
    gaps.push(`oracle layouts (${oracleIdList.length}) do not match synthetic-tested specs (${syntheticIds.length})`);
  }
  for (const layoutId of oracleIdList) {
    if (!syntheticIds.includes(layoutId)) gaps.push(`${layoutId} oracle entry has no synthetic-tested layout spec`);
  }

  const count = (name) => rows.filter((row) => row.evidenceClass === name).length;
  return {
    recognized: rows.length,
    fixtureTested: count("fixture-tested"),
    verifiedForScope: count("verified-for-scope"),
    registeredOnly: count("registered-only"),
    noLayoutSpec: count("no-layout-spec"),
    banks: rows,
    gaps,
    layouts,
  };
}
