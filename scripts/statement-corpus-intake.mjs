#!/usr/bin/env node
/**
 * Private local corpus intake scaffolding (C5).
 * Does NOT invent statements or mark layouts verified-for-scope.
 * Scans authorized roots and writes a gap/intake manifest.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const runId = process.env.LF_RUN_ID || `intake-${Date.now()}`;
const outDir = join(ROOT, "docs", "local-finalization", runId);
mkdirSync(outDir, { recursive: true });

const TARGET_BANKS = [
  "hdfc", "icici", "sbi", "axis", "kotak", "pnb", "bob", "canara", "union", "indusind",
  "idbi", "boi", "iob", "bom", "uco", "federal", "yes", "idfc", "au", "bandhan",
];

const authorizedRoots = [
  join(ROOT, ".local", "statement-corpus"),
  join(ROOT, "tests", "fixtures", "statements"),
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(pdf|json)$/i.test(name)) acc.push(p);
  }
  return acc;
}

const scorecardPath = join(ROOT, "docs", "statements-v2", "BANK_LAYOUT_SCORECARD.json");
const scorecard = existsSync(scorecardPath) ? JSON.parse(readFileSync(scorecardPath, "utf8")) : { layouts: [] };

const found = [];
for (const root of authorizedRoots) {
  for (const file of walk(root)) {
    const buf = readFileSync(file);
    found.push({
      path: relative(ROOT, file).replaceAll("\\", "/"),
      bytes: buf.length,
      sha256: createHash("sha256").update(buf).digest("hex"),
      kind: file.endsWith(".pdf") ? "pdf" : "json",
      root: relative(ROOT, root).replaceAll("\\", "/"),
      label: root.includes(".local") ? "PRIVATE_LOCAL" : "PUBLIC_SYNTHETIC_FIXTURE",
    });
  }
}

const layouts = Array.isArray(scorecard.layouts) ? scorecard.layouts : Array.isArray(scorecard) ? scorecard : [];
const verified = layouts.filter((l) => (l.status || l.supportStatus) === "verified-for-scope");
const synthetic = layouts.filter((l) => (l.status || l.supportStatus) === "synthetic-tested");

const gaps = TARGET_BANKS.map((bankId) => {
  const bankLayouts = layouts.filter((l) => (l.bankId || l.bank) === bankId);
  const hasVerified = bankLayouts.some((l) => (l.status || l.supportStatus) === "verified-for-scope");
  const privatePdfs = found.filter((f) => f.label === "PRIVATE_LOCAL" && f.kind === "pdf");
  return {
    bankId,
    hasVerifiedForScope: hasVerified,
    layoutCount: bankLayouts.length,
    missingEvidence: hasVerified
      ? []
      : [
          "authorized real statement PDF under .local/statement-corpus",
          "independent expected rows / printed controls (not parser self-oracle)",
          "holdout partition per HOLDOUT_POLICY.md",
        ],
    privatePdfCount: privatePdfs.length,
    readyAutomation: "npm run statements:certify && npm run statements:gate:strict",
  };
});

const manifest = {
  generatedAt: new Date().toISOString(),
  runId,
  authorizedRootsChecked: authorizedRoots.map((r) => relative(ROOT, r).replaceAll("\\", "/")),
  diskSweep: false,
  bankPortalAccess: false,
  filesFound: found,
  privatePdfCount: found.filter((f) => f.label === "PRIVATE_LOCAL" && f.kind === "pdf").length,
  verifiedForScopeCount: verified.length,
  syntheticTestedCount: synthetic.length,
  targetBanks: 20,
  gaps,
  blockedFor20BankClaim: verified.length === 0,
  nextStep: "Place authorized Wave A specimens under .local/statement-corpus/<bank>/ with provenance.json; annotate expected independently; run statements:certify.",
};

writeFileSync(join(outDir, "REAL_CORPUS_GAP_MANIFEST.json"), JSON.stringify(manifest, null, 2));
writeFileSync(join(ROOT, "docs", "statements-v2", "REAL_CORPUS_GAP_MANIFEST.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ runId, privatePdfCount: manifest.privatePdfCount, verifiedForScopeCount: verified.length, blocked: manifest.blockedFor20BankClaim }, null, 2));
