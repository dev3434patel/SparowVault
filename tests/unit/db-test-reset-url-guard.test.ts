import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

describe("db-test-reset disposable database guard", () => {
  it("exits 2 for a URL-only database name without test and does not call createConnection", () => {
    const flag = path.join(mkdtempSync(path.join(tmpdir(), "sv-db-url-")), "create-connection.txt");
    const env = { ...process.env, SV_CREATE_CONNECTION_FLAG: flag };
    for (const key of ["TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER", "TEST_DB_PASS", "TEST_DB_NAME"]) {
      delete env[key];
    }
    env.TEST_DATABASE_URL = "mysql://audit@127.0.0.1:1/sparowvault_owner_books";

    const result = spawnSync(
      process.execPath,
      ["--import", pathToFileURL(path.join(root, "tests/unit/helpers/register-mysql2-spy.mjs")).href, "scripts/db-test-reset.mjs"],
      { cwd: root, env, encoding: "utf8" },
    );

    expect(result.status).toBe(2);
    expect(existsSync(flag)).toBe(false);
    expect(`${result.stdout ?? ""}\n${result.stderr ?? ""}`).not.toMatch(/CREATE_CONNECTION_CALLED|ECONNREFUSED/);
    expect(`${result.stderr ?? ""}`).toMatch(/must contain 'test'/);
  });
});
