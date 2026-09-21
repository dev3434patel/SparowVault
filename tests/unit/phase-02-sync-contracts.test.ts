import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import generated from "@/config/syncContracts.generated.json";
import {
  SYNC_CONTRACTS,
  SYNC_CONTRACT_COLLECTIONS,
  SYNC_CONTRACT_DEXIE_STORES,
  SYNC_CONTRACT_SERVER_ALLOWLIST,
} from "@/config/syncContracts";
import { CLOUD_COLLECTIONS } from "@/lib/cloud/collections";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function read(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

function sourceFiles(directory: string, suffix: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith("._")) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path, suffix) : entry.name.endsWith(suffix) ? [path] : [];
  });
}

function sqlTables(sql: string): Set<string> {
  return new Set(
    [...sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+`?([a-zA-Z0-9_]+)`?/gi)].map(
      (m) => m[1],
    ),
  );
}

function phpTableRefs(source: string): Set<string> {
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*#.*$/gm, "");
  const refs = new Set<string>();
  const re = /\b(?:FROM|JOIN|UPDATE|INTO|DELETE\s+FROM)\s+`?([a-zA-Z0-9_]+)`?/gi;
  for (const m of cleaned.matchAll(re)) {
    refs.add(m[1]);
  }
  return refs;
}

describe("Phase 2 sync contract registry", () => {
  it("keeps generated JSON in sync with the TypeScript contract source", () => {
    expect(generated.generatedFrom).toBe("src/config/syncContracts.ts");
    expect(generated.contracts).toEqual(SYNC_CONTRACTS);
  });

  it("covers every required domain collection with explicit Dexie and server names", () => {
    expect(SYNC_CONTRACT_COLLECTIONS).toEqual([
      "accounts",
      "cards",
      "categories",
      "transactions",
      "budgets",
      "loans",
      "emiPayments",
      "udhari",
      "udhariSettlements",
      "investments",
      "savingsContributions",
      "goals",
      "goalContributions",
      "reminders",
      "alerts",
      "recurringRules",
      "attachments",
      "auditLogs",
      "snapshots",
      "exportHistory",
      "settings",
      "transferLinks",
      "creditLimitGroups",
      "cardStatements",
      "cardPaymentAllocations",
      "cardEmiPlans",
      "cardEmiInstallments",
      "obligations",
      "sinkingFunds",
      "households",
      "householdMembers",
      "householdPermissions",
      "fixedIncomeAssets",
      "insurancePolicies",
      "assetValuations",
      "importSources",
      "reconciliationMatches",
    ]);

    for (const contract of SYNC_CONTRACTS) {
      expect(contract.dexieStoreName.length).toBeGreaterThan(0);
      expect(contract.serverAllowlistName.length).toBeGreaterThan(0);
      expect(contract.requiredFields).toContain("id");
      expect(contract.requiredFields).toContain("userId");
      expect(contract.validationRules.join(" ")).toMatch(/authenticated user/);
      expect(contract.schemaVersion).toBeGreaterThanOrEqual(1);
    }
  });

  it("makes frontend cloud keys and PHP allowlist derive from the same generated contract", () => {
    expect(CLOUD_COLLECTIONS).toEqual(SYNC_CONTRACT_SERVER_ALLOWLIST);

    const php = execFileSync(
      "php",
      [
        "-r",
        "require 'php/helpers/cloud_payload.php'; echo json_encode(cloud_collection_allowlist());",
      ],
      { cwd: root, encoding: "utf8" },
    );
    const json = php.slice(php.indexOf("["));
    expect(JSON.parse(json)).toEqual([...SYNC_CONTRACT_SERVER_ALLOWLIST].sort());
  });

  it("keeps Dexie store names mapped for every synced collection", () => {
    const dbSource = read("src/db/database.ts");
    for (const store of SYNC_CONTRACT_DEXIE_STORES) {
      expect(dbSource).toContain(`${store}:`);
    }
  });

  it("declares and extracts the required transaction hot fields", () => {
    const tx = SYNC_CONTRACTS.find((c) => c.collectionName === "transactions");
    expect(tx).toBeTruthy();
    const requiredHotFields = [
      "amount_paise",
      "txn_local_date",
      "txn_month",
      "txn_type",
      "payment_mode",
      "category_id",
      "account_id",
      "card_id",
      "loan_id",
      "goal_id",
      "udhari_id",
      "business_or_personal",
      "source_device_id",
      "payload_hash",
    ];
    expect(tx?.hotFields).toEqual(expect.arrayContaining(requiredHotFields));

    const php = execFileSync(
      "php",
      [
        "-r",
        "require 'php/helpers/cloud_payload.php'; echo cloud_ccr_indexed_column_sql();",
      ],
      { cwd: root, encoding: "utf8" },
    );
    for (const field of requiredHotFields) {
      expect(php).toContain(field);
    }
  });
});

describe("Phase 2 database/schema drift", () => {
  it("has every Phase 2 required table in SPAROWVAULT_FULL_DATABASE.sql", () => {
    const tables = sqlTables(read("sql/SPAROWVAULT_FULL_DATABASE.sql"));
    const requiredTables = [
      "users",
      "cloud_collection_rows",
      "financial_events",
      "financial_effects",
      "user_credit_cards",
      "user_loans",
      "user_loan_payments",
      "udhari_people",
      "udhari_entries",
      "udhari_settlements",
      "ai_suggestions",
      "user_policy_acceptances",
      "user_audit_logs",
      "retention_jobs",
      "plan_prices",
      "payments",
      "subscriptions",
      "webhook_events",
    ];
    expect([...tables].sort()).toEqual(expect.arrayContaining(requiredTables));
  });

  it("has every PHP-referenced table in the full database schema", () => {
    const schemaTables = sqlTables(read("sql/SPAROWVAULT_FULL_DATABASE.sql") + "\n" + read("sql/migrations/20260910_atomic_writes.sql") + "\n" + read("sql/migrations/20260911_security_sessions.sql"));
    const phpFiles = ["php", "api"].flatMap(directory => sourceFiles(resolve(root, directory), ".php"));

    const refs = new Set<string>();
    for (const file of phpFiles) {
      for (const table of phpTableRefs(readFileSync(file, "utf8"))) {
        refs.add(table);
      }
    }

    const sqlWords = new Set([
      "CASCADE",
      "CURRENT_TIMESTAMP",
      "accepted_at",
      "and",
      "attempt_count",
      "current",
      "failed",
      "hit_count",
      "is_enabled",
      "security_question",
      "setting_value",
    ]);
    const missing = [...refs]
      .filter((table) => !sqlWords.has(table))
      .filter((table) => !schemaTables.has(table))
      .sort();
    expect(missing).toEqual([]);
  });

  it("has required report/sync indexes in the full database schema", () => {
    const schema = read("sql/SPAROWVAULT_FULL_DATABASE.sql");
    const requiredIndexes = [
      "idx_ccr_uid_coll_txn_date",
      "idx_ccr_uid_cat_month",
      "idx_ccr_uid_card_txn_date",
      "idx_ccr_uid_loan_txn_date",
      "idx_ccr_uid_goal_txn_date",
      "idx_ccr_uid_amount_paise",
      "idx_fin_ev_user_date",
      "idx_fin_ef_user_target",
    ];
    for (const indexName of requiredIndexes) {
      expect(schema).toContain(indexName);
    }
  });

  it("keeps phase migrations statically idempotent", () => {
    const files = sourceFiles(resolve(root, "sql/migrations"), ".sql")
      .filter(file => !file.endsWith("_rollback.sql"));

    for (const file of files) {
      const body = readFileSync(file, "utf8").replace(/^\s*--.*$/gm, "");
      const alterAdds = body.match(/ALTER\s+TABLE[\s\S]*?\bADD\s+(?:COLUMN|KEY|INDEX)\b/gi) ?? [];
      for (const statement of alterAdds) {
        expect(`${statement}\n${body}`).toMatch(
          /IF\s+NOT\s+EXISTS|INFORMATION_SCHEMA|PREPARE|SHOW\s+INDEXES|ADD_COLUMN_IF_MISSING/i,
        );
      }
      const createTables = body.match(/CREATE\s+TABLE(?!\s+IF\s+NOT\s+EXISTS)/gi) ?? [];
      expect(createTables).toEqual([]);
    }
  });
});
