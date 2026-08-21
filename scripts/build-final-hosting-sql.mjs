import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const root = process.cwd();

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const value = process.argv[i + 1]?.startsWith("--") ? "true" : process.argv[i + 1] ?? "true";
  args.set(key, value);
  if (value !== "true") i += 1;
}

const oldDumpPath = path.resolve(args.get("old") ?? "C:/Users/DELL/Downloads/sparocdy_money.sql");
const outPath = path.resolve(args.get("out") ?? "sql/FINAL_HOSTING_WITH_DATA.sql");
const reportPath = path.resolve(args.get("report") ?? "sql/FINAL_HOSTING_WITH_DATA_REPORT.md");
const mergeDb = args.get("merge-db") ?? "sparowvault_final_merge";
const schemaDb = args.get("schema-db") ?? "sparowvault_current_schema";

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  multipleStatements: false,
  namedPlaceholders: false,
};

const schemaFiles = [
  path.join(root, "sql", "production_schema.sql"),
  path.join(root, "sql", "migrations", "all_phases_combined.sql"),
];

function stripBom(value) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
}

function splitSqlStatements(sql) {
  const statements = [];
  let delimiter = ";";
  let buffer = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  let lineStart = true;

  const flushIfDelimited = () => {
    if (buffer.endsWith(delimiter)) {
      const statement = buffer.slice(0, -delimiter.length).trim();
      if (statement) statements.push(statement);
      buffer = "";
      lineStart = true;
      return true;
    }
    return false;
  };

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1] ?? "";

    if (lineStart) {
      const rest = sql.slice(i);
      const match = rest.match(/^\s*DELIMITER\s+(.+?)\r?\n/i);
      if (match) {
        const pending = buffer.trim();
        if (pending) statements.push(pending);
        buffer = "";
        delimiter = match[1].trim();
        i += match[0].length - 1;
        lineStart = true;
        continue;
      }
    }

    buffer += char;

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        lineStart = true;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        buffer += next;
        i += 1;
        inBlockComment = false;
      }
      lineStart = char === "\n";
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (char === "-" && next === "-") {
        const following = sql[i + 2] ?? "";
        if (/\s/.test(following)) {
          buffer += next;
          i += 1;
          inLineComment = true;
          continue;
        }
      }
      if (char === "#") {
        inLineComment = true;
        continue;
      }
      if (char === "/" && next === "*") {
        buffer += next;
        i += 1;
        inBlockComment = true;
        continue;
      }
      if (char === "'") inSingle = true;
      else if (char === '"') inDouble = true;
      else if (char === "`") inBacktick = true;
      else if (flushIfDelimited()) continue;
    } else if (inSingle) {
      if (char === "\\" && next) {
        buffer += next;
        i += 1;
      } else if (char === "'") {
        inSingle = false;
      }
    } else if (inDouble) {
      if (char === "\\" && next) {
        buffer += next;
        i += 1;
      } else if (char === '"') {
        inDouble = false;
      }
    } else if (inBacktick && char === "`") {
      inBacktick = false;
    }

    lineStart = char === "\n";
  }

  const trailing = buffer.trim();
  if (trailing) statements.push(trailing);
  return statements.filter((statement) => !/^DELIMITER\b/i.test(statement));
}

async function executeSqlFile(connection, filePath, database) {
  const sql = stripBom(await fs.readFile(filePath, "utf8"));
  await connection.query(`USE \`${database}\``);
  const statements = splitSqlStatements(sql);
  let executed = 0;
  for (const statement of statements) {
    const trimmed = statement.trim();
    if (!trimmed) continue;
    try {
      await connection.query(trimmed);
      executed += 1;
    } catch (error) {
      error.message = `${error.message}\nWhile executing ${filePath}\nStatement:\n${trimmed.slice(0, 800)}`;
      throw error;
    }
  }
  return executed;
}

async function tableNames(connection, database) {
  const [rows] = await connection.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name",
    [database],
  );
  return rows.map((row) => row.TABLE_NAME || row.table_name);
}

async function convertTablesToUtf8mb4(connection, database) {
  const [foreignKeys] = await connection.query(
    `
      SELECT table_name, constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = ?
        AND constraint_type = 'FOREIGN KEY'
    `,
    [database],
  );
  for (const foreignKey of foreignKeys) {
    const table = foreignKey.TABLE_NAME || foreignKey.table_name;
    const constraint = foreignKey.CONSTRAINT_NAME || foreignKey.constraint_name;
    await connection.query(
      `ALTER TABLE \`${database}\`.\`${table}\` DROP FOREIGN KEY ${quoteIdentifier(constraint)}`,
    );
  }

  const tables = await tableNames(connection, database);
  for (const table of tables) {
    await connection.query(
      `ALTER TABLE \`${database}\`.\`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  }
  return tables.length;
}

async function showColumns(connection, database, table) {
  const [rows] = await connection.query(`SHOW FULL COLUMNS FROM \`${database}\`.\`${table}\``);
  return rows;
}

function quoteIdentifier(value) {
  return `\`${String(value).replaceAll("`", "``")}\``;
}

function quoteSqlString(value) {
  return `'${String(value).replaceAll("\\", "\\\\").replaceAll("'", "''")}'`;
}

function columnDefinition(column) {
  const parts = [quoteIdentifier(column.Field), column.Type];
  if (column.Collation && /(char|text|enum|set)/i.test(column.Type)) {
    parts.push(`COLLATE ${column.Collation}`);
  }
  parts.push(column.Null === "NO" ? "NOT NULL" : "NULL");
  if (column.Default !== null && column.Default !== undefined) {
    const defaultValue = String(column.Default);
    if (/^(CURRENT_TIMESTAMP(?:\(\))?|NULL)$/i.test(defaultValue)) {
      parts.push(`DEFAULT ${defaultValue}`);
    } else {
      parts.push(`DEFAULT ${quoteSqlString(defaultValue)}`);
    }
  } else if (column.Null === "YES") {
    parts.push("DEFAULT NULL");
  }
  if (column.Extra) parts.push(column.Extra);
  if (column.Comment) parts.push(`COMMENT ${quoteSqlString(column.Comment)}`);
  return parts.join(" ");
}

async function syncMissingColumns(connection, sourceDb, targetDb, table) {
  const sourceColumns = await showColumns(connection, sourceDb, table);
  const targetColumns = await showColumns(connection, targetDb, table);
  const targetColumnNames = new Set(targetColumns.map((column) => column.Field));
  const added = [];
  for (const column of sourceColumns) {
    if (targetColumnNames.has(column.Field)) continue;
    await connection.query(
      `ALTER TABLE \`${targetDb}\`.\`${table}\` ADD COLUMN ${columnDefinition(column)}`,
    );
    added.push(`${table}.${column.Field}`);
  }
  return added;
}

async function indexGroups(connection, database, table) {
  const [rows] = await connection.query(`SHOW INDEX FROM \`${database}\`.\`${table}\``);
  const groups = new Map();
  for (const row of rows) {
    const keyName = row.Key_name;
    if (!groups.has(keyName)) {
      groups.set(keyName, {
        keyName,
        nonUnique: Number(row.Non_unique),
        columns: [],
      });
    }
    groups.get(keyName).columns.push({
      name: row.Column_name,
      seq: Number(row.Seq_in_index),
      subPart: row.Sub_part,
    });
  }
  for (const group of groups.values()) {
    group.columns.sort((a, b) => a.seq - b.seq);
  }
  return groups;
}

async function syncMissingIndexes(connection, sourceDb, targetDb, table) {
  const source = await indexGroups(connection, sourceDb, table);
  const target = await indexGroups(connection, targetDb, table);
  const added = [];
  for (const [keyName, group] of source.entries()) {
    if (target.has(keyName)) continue;
    const columns = group.columns
      .map((column) => `${quoteIdentifier(column.name)}${column.subPart ? `(${column.subPart})` : ""}`)
      .join(", ");
    const alter =
      keyName === "PRIMARY"
        ? `ALTER TABLE \`${targetDb}\`.\`${table}\` ADD PRIMARY KEY (${columns})`
        : `ALTER TABLE \`${targetDb}\`.\`${table}\` ADD ${group.nonUnique ? "KEY" : "UNIQUE KEY"} ${quoteIdentifier(keyName)} (${columns})`;
    await connection.query(alter);
    added.push(`${table}.${keyName}`);
  }
  return added;
}

async function copySeedRowsIfMissing(connection, sourceDb, targetDb, table) {
  const [targetCountRows] = await connection.query(
    `SELECT COUNT(*) AS count FROM \`${targetDb}\`.\`${table}\``,
  );
  if (Number(targetCountRows[0].count) > 0) return 0;
  const [sourceCountRows] = await connection.query(
    `SELECT COUNT(*) AS count FROM \`${sourceDb}\`.\`${table}\``,
  );
  const count = Number(sourceCountRows[0].count);
  if (count === 0) return 0;
  await connection.query(
    `INSERT INTO \`${targetDb}\`.\`${table}\` SELECT * FROM \`${sourceDb}\`.\`${table}\``,
  );
  return count;
}

async function normalizeHotFields(connection, database) {
  const tables = new Set(await tableNames(connection, database));
  if (!tables.has("cloud_collection_rows")) return 0;
  const columns = new Set((await showColumns(connection, database, "cloud_collection_rows")).map((column) => column.Field));
  const required = [
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
  if (!required.every((column) => columns.has(column))) return 0;
  const payloadColumn = columns.has("payload_json") ? "payload_json" : columns.has("payload") ? "payload" : null;
  if (!payloadColumn) return 0;
  const payloadSql = quoteIdentifier(payloadColumn);

  const [result] = await connection.query(`
    UPDATE \`${database}\`.cloud_collection_rows
    SET
      amount_paise = COALESCE(
        amount_paise,
        CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.amountPaise')), 'null') AS SIGNED),
        ROUND(CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.amount')), 'null') AS DECIMAL(18, 4)) * 100)
      ),
      txn_local_date = COALESCE(
        txn_local_date,
        STR_TO_DATE(LEFT(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.date')), 'null'), 10), '%Y-%m-%d')
      ),
      txn_month = COALESCE(
        txn_month,
        LEFT(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.date')), 'null'), 7)
      ),
      txn_type = COALESCE(txn_type, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.type')), 'null')),
      payment_mode = COALESCE(payment_mode, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.paymentMode')), 'null')),
      category_id = COALESCE(category_id, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.categoryId')), 'null')),
      account_id = COALESCE(account_id, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.accountId')), 'null')),
      card_id = COALESCE(card_id, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.linkedCardId')), 'null')),
      loan_id = COALESCE(loan_id, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.loanId')), 'null')),
      goal_id = COALESCE(goal_id, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.goalId')), 'null')),
      udhari_id = COALESCE(udhari_id, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.udhariId')), 'null')),
      business_or_personal = COALESCE(
        business_or_personal,
        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.businessOrPersonal')), 'null'),
        NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.business_or_personal')), 'null')
      ),
      source_device_id = COALESCE(source_device_id, NULLIF(JSON_UNQUOTE(JSON_EXTRACT(${payloadSql}, '$.sourceDeviceId')), 'null')),
      payload_hash = COALESCE(payload_hash, SHA2(${payloadSql}, 256))
    WHERE collection_name = 'transactions'
      AND JSON_VALID(${payloadSql})
      AND (
        amount_paise IS NULL OR txn_local_date IS NULL OR txn_month IS NULL OR txn_type IS NULL
        OR payment_mode IS NULL OR payload_hash IS NULL
      )
  `);
  return Number(result.affectedRows || 0);
}

async function backfillPlanPrices(connection, database) {
  const tables = new Set(await tableNames(connection, database));
  if (!tables.has("plans") || !tables.has("plan_prices")) return 0;
  const planColumns = new Set((await showColumns(connection, database, "plans")).map((column) => column.Field));
  if (!planColumns.has("price_inr") || !planColumns.has("billing_interval")) return 0;

  const [result] = await connection.query(`
    INSERT INTO \`${database}\`.plan_prices (
      plan_id,
      amount_paise,
      currency,
      billing_interval,
      starts_at,
      ends_at,
      notes,
      created_at
    )
    SELECT
      p.id,
      ROUND(CAST(p.price_inr AS DECIMAL(18, 2)) * 100),
      'INR',
      p.billing_interval,
      COALESCE(p.created_at, CURRENT_TIMESTAMP),
      NULL,
      'Backfilled from legacy plans.price_inr during final hosting SQL generation',
      CURRENT_TIMESTAMP
    FROM \`${database}\`.plans p
    WHERE NOT EXISTS (
      SELECT 1
      FROM \`${database}\`.plan_prices pp
      WHERE pp.plan_id = p.id
        AND pp.billing_interval = p.billing_interval
        AND pp.ends_at IS NULL
    )
  `);
  return Number(result.affectedRows || 0);
}

async function exportDatabase(connection, database, outputFile) {
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  const chunks = [];
  const tables = await tableNames(connection, database);
  const now = new Date().toISOString();

  chunks.push(`-- SparowVault final hosting SQL with preserved data\n`);
  chunks.push(`-- Generated: ${now}\n`);
  chunks.push(`-- Source dump: ${oldDumpPath.replaceAll("\\", "/")}\n`);
  chunks.push(`-- Target: import with phpMyAdmin or mysql into your hosting database\n\n`);
  chunks.push("SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n");
  chunks.push("SET time_zone = \"+00:00\";\n");
  chunks.push("SET FOREIGN_KEY_CHECKS = 0;\n");
  chunks.push("START TRANSACTION;\n\n");
  chunks.push("/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;\n");
  chunks.push("/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;\n");
  chunks.push("/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;\n");
  chunks.push("/*!40101 SET NAMES utf8mb4 */;\n\n");

  for (const table of tables) {
    const [createRows] = await connection.query(`SHOW CREATE TABLE \`${database}\`.\`${table}\``);
    const createSql = createRows[0]["Create Table"];
    chunks.push(`--\n-- Table structure for table ${quoteIdentifier(table)}\n--\n\n`);
    chunks.push(`DROP TABLE IF EXISTS ${quoteIdentifier(table)};\n`);
    chunks.push(`${createSql};\n\n`);
  }

  for (const table of tables) {
    const columns = await showColumns(connection, database, table);
    const columnNames = columns.map((column) => column.Field);
    const [rows] = await connection.query(`SELECT * FROM \`${database}\`.\`${table}\``);
    chunks.push(`--\n-- Data for table ${quoteIdentifier(table)} (${rows.length} rows)\n--\n\n`);
    if (rows.length === 0) continue;

    const columnSql = columnNames.map(quoteIdentifier).join(", ");
    const batchSize = 150;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const values = batch
        .map((row) => {
          const rowValues = columnNames.map((column) => {
            const value = row[column];
            if (value === null || value === undefined) return "NULL";
            if (value instanceof Date) return quoteSqlString(value.toISOString().slice(0, 19).replace("T", " "));
            if (Buffer.isBuffer(value)) return `0x${value.toString("hex")}`;
            return connection.escape(value);
          });
          return `(${rowValues.join(", ")})`;
        })
        .join(",\n");
      chunks.push(`INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES\n${values};\n\n`);
    }
  }

  chunks.push("COMMIT;\n");
  chunks.push("SET FOREIGN_KEY_CHECKS = 1;\n\n");
  chunks.push("/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;\n");
  chunks.push("/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;\n");
  chunks.push("/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;\n");

  await fs.writeFile(outputFile, chunks.join(""), "utf8");
  return { tables, bytes: Buffer.byteLength(chunks.join(""), "utf8") };
}

async function main() {
  await fs.access(oldDumpPath);

  const connection = await mysql.createConnection(dbConfig);
  const summary = {
    oldDumpPath,
    outPath,
    reportPath,
    mergeDb,
    schemaDb,
    statements: {},
    missingTablesCreated: [],
    missingColumnsAdded: [],
    missingIndexesAdded: [],
    seedRowsCopied: {},
    hotFieldRowsNormalized: 0,
    exportedTables: 0,
    exportedBytes: 0,
  };

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${mergeDb}\``);
    await connection.query(`DROP DATABASE IF EXISTS \`${schemaDb}\``);
    await connection.query(`CREATE DATABASE \`${mergeDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`CREATE DATABASE \`${schemaDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    summary.statements.oldDump = await executeSqlFile(connection, oldDumpPath, mergeDb);
    summary.convertedTablesToUtf8mb4 = await convertTablesToUtf8mb4(connection, mergeDb);
    summary.statements.mergeMigration = await executeSqlFile(
      connection,
      path.join(root, "sql", "migrations", "all_phases_combined.sql"),
      mergeDb,
    );

    for (const file of schemaFiles) {
      summary.statements[path.relative(root, file)] = await executeSqlFile(connection, file, schemaDb);
    }

    const schemaTables = await tableNames(connection, schemaDb);
    const mergeTables = new Set(await tableNames(connection, mergeDb));

    for (const table of schemaTables) {
      if (!mergeTables.has(table)) {
        const [createRows] = await connection.query(`SHOW CREATE TABLE \`${schemaDb}\`.\`${table}\``);
        await connection.query(`USE \`${mergeDb}\``);
        await connection.query(createRows[0]["Create Table"]);
        summary.missingTablesCreated.push(table);
        mergeTables.add(table);
      }
      summary.missingColumnsAdded.push(...(await syncMissingColumns(connection, schemaDb, mergeDb, table)));
      summary.missingIndexesAdded.push(...(await syncMissingIndexes(connection, schemaDb, mergeDb, table)));
      const copied = await copySeedRowsIfMissing(connection, schemaDb, mergeDb, table);
      if (copied > 0) summary.seedRowsCopied[table] = copied;
    }

    summary.hotFieldRowsNormalized = await normalizeHotFields(connection, mergeDb);
    summary.planPricesBackfilled = await backfillPlanPrices(connection, mergeDb);

    const exportResult = await exportDatabase(connection, mergeDb, outPath);
    summary.exportedTables = exportResult.tables.length;
    summary.exportedBytes = exportResult.bytes;

    const report = [
      "# Final Hosting SQL Report",
      "",
      `Generated: ${new Date().toISOString()}`,
      `Old source dump: \`${oldDumpPath}\``,
      `Output SQL: \`${outPath}\``,
      "",
      "## Result",
      "",
      `- Exported tables: ${summary.exportedTables}`,
      `- Export size: ${summary.exportedBytes} bytes`,
      `- Old dump statements imported: ${summary.statements.oldDump}`,
      `- Combined migration statements applied to old DB: ${summary.statements.mergeMigration}`,
      `- Hot-field transaction rows normalized: ${summary.hotFieldRowsNormalized}`,
      `- Plan price rows backfilled: ${summary.planPricesBackfilled}`,
      "",
      "## Schema Completion",
      "",
      `- Missing tables created: ${summary.missingTablesCreated.length ? summary.missingTablesCreated.join(", ") : "none"}`,
      `- Missing columns added: ${summary.missingColumnsAdded.length ? summary.missingColumnsAdded.join(", ") : "none"}`,
      `- Missing indexes added: ${summary.missingIndexesAdded.length ? summary.missingIndexesAdded.join(", ") : "none"}`,
      "",
      "## Seed Rows Copied Into Empty New Tables",
      "",
      Object.keys(summary.seedRowsCopied).length
        ? Object.entries(summary.seedRowsCopied).map(([table, count]) => `- ${table}: ${count}`).join("\n")
        : "- none",
      "",
      "## Hosting Import Note",
      "",
      "Import `sql/FINAL_HOSTING_WITH_DATA.sql` into the hosting database. It contains the old data plus the latest SparowVault tables, columns, indexes, and seed rows for newly introduced empty tables.",
      "",
    ].join("\n");
    await fs.writeFile(reportPath, report, "utf8");

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
