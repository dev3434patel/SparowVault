#!/usr/bin/env node
/**
 * Generates statement-intelligence baseline inventories from source.
 * Does not invent bank accuracy claims.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "docs", "statements-v2");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, "phase-reports"), { recursive: true });

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const db = fs.readFileSync(path.join(root, "src", "db", "database.ts"), "utf8");
const storeMatches = [...db.matchAll(/^\s+(\w+)!:\s+Table</gm)].map((m) => m[1]);
const sync = fs.readFileSync(path.join(root, "src", "config", "syncContracts.ts"), "utf8");
const syncCols = [...sync.matchAll(/collectionName:\s+"([^"]+)"/g)].map((m) => m[1]);
const banks = JSON.parse(fs.readFileSync(path.join(root, "php", "config", "statement_banks.json"), "utf8"));
const stmtFiles = fs.readdirSync(path.join(root, "src", "services", "statements"));
const localOnly = ["users", "sessions", "syncMutations", "aiSuggestions"];
const target20 = [
  "hdfc", "icici", "sbi", "axis", "kotak", "pnb", "bob", "canara", "union", "indusind",
  "idbi", "boi", "iob", "maharashtra", "uco", "federal", "yes", "idfc_first", "au", "bandhan",
];

const inventory = {
  generatedAt: new Date().toISOString(),
  dexie: {
    storeCount: storeMatches.length,
    stores: storeMatches,
    note: "Correct count is 41 stores = 37 synced + 4 local-only. Audit text saying 40 is a documentation error.",
  },
  sync: {
    collectionCount: syncCols.length,
    collections: syncCols,
  },
  localOnly,
  syncedPlusLocal: syncCols.length + localOnly.length,
  statementBanks: {
    count: banks.length,
    ids: banks.map((b) => b.id),
  },
  statementModules: stmtFiles,
  target20,
  target20Present: target20.filter((id) => banks.some((b) => b.id === id)),
  target20Missing: target20.filter((id) => !banks.some((b) => b.id === id)),
  adapters: {
    dedicatedLayouts: ["kotak-numbered"],
    geometricShared: true,
    note: "A bank ID in the registry is not a certified layout adapter.",
  },
};

fs.writeFileSync(path.join(outDir, "SCHEMA_AND_SYNC_INVENTORY.json"), JSON.stringify(inventory, null, 2));
fs.writeFileSync(
  path.join(outDir, "COMMAND_MANIFEST.json"),
  JSON.stringify({ generatedAt: inventory.generatedAt, scripts: pkg.scripts }, null, 2),
);

console.log(
  JSON.stringify(
    {
      stores: storeMatches.length,
      sync: syncCols.length,
      syncedPlusLocal: inventory.syncedPlusLocal,
      banks: banks.length,
      target20Present: inventory.target20Present.length,
    },
    null,
    2,
  ),
);
