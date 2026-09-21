import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createReadStream } from "node:fs";
import { mkdtemp, readFile, writeFile, rm, stat, access, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

export async function testDatabaseSnapshot({ db, cfg, env, check }) {
  await check("backup: private consistent dump restores every table's full contents in an isolated database", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sv-backup-test-"));
    const target = `sv_restore_test_${process.pid}_${Date.now()}`;
    let created = false;
    const tool = async (variable, name) => {
      if (process.env[variable]) return process.env[variable];
      const candidates = [
        `/Applications/XAMPP/xamppfiles/bin/${name}`,
        `C:\\xampp\\mysql\\bin\\${name}.exe`,
        `C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\${name}.exe`,
      ];
      for (const candidate of candidates) {
        try { await access(candidate); return candidate; } catch { /* try next */ }
      }
      return name;
    };
    const run = async (command, args, environment, input, expectedCode = 0) => {
      const child = spawn(command, args, { env: environment, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      child.stdout.on("data", chunk => { stdout += chunk; }); child.stderr.on("data", chunk => { stderr += chunk; });
      if (input) createReadStream(input).pipe(child.stdin); else child.stdin.end();
      const [code] = await once(child, "close"); assert.equal(code, expectedCode, stderr || stdout); return stdout;
    };
    const parseJsonPayload = (raw) => {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      assert.ok(start >= 0 && end > start, `Expected JSON payload, got: ${raw.slice(0, 200)}`);
      return JSON.parse(raw.slice(start, end + 1));
    };
    const snapshot = async database => {
      const [tables] = await db.query("SELECT table_name name FROM information_schema.tables WHERE table_schema=? AND table_type='BASE TABLE' ORDER BY table_name", [database]);
      const result = {};
      for (const { name } of tables) {
        assert.match(name, /^[A-Za-z0-9_]+$/);
        const [rows] = await db.query(`SELECT * FROM \`${database}\`.\`${name}\``);
        result[name] = { count: rows.length, hash: createHash("sha256").update(rows.map(row => JSON.stringify(row)).sort().join("\n")).digest("hex") };
      }
      return result;
    };
    try {
      const [{ source }] = (await db.query("SELECT DATABASE() source"))[0];
      assert.match(source, /^sv_write_test_/);
      const before = await snapshot(source);
      const output = parseJsonPayload(await run("php", ["scripts/backup_db.php"], { ...env, BACKUP_DIR: directory, MYSQLDUMP_BIN: await tool("MYSQLDUMP_BIN", "mysqldump") }));
      const manifest = JSON.parse(await readFile(output.manifest, "utf8"));
      assert.equal(manifest.sha256, createHash("sha256").update(await readFile(output.backup)).digest("hex"));
      assert.equal(manifest.encrypted, false); assert.equal(manifest.restoreVerified, false);
      if (process.platform !== "win32") {
        assert.equal((await stat(output.backup)).mode & 0o077, 0);
      }
      assert.ok(!(await readdir(directory)).some(name => name.includes(".client-") || name.endsWith(".part")));
      await db.query(`CREATE DATABASE \`${target}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`); created = true;
      const option = value => JSON.stringify(String(value));
      const config = join(directory, "restore.cnf");
      await writeFile(config, `[client]\nhost=${option(cfg.host)}\nport=${option(cfg.port)}\nuser=${option(cfg.user)}\npassword=${option(cfg.password)}\nprotocol=tcp\n`, { mode: 0o600 });
      await run(await tool("MYSQL_BIN", "mysql"), [`--defaults-extra-file=${config}`, target], env, output.backup);
      assert.deepEqual(await snapshot(target), before, "Restored table content differs, not merely row counts");
      assert.deepEqual(await snapshot(source), before, "Backup must not change source records");
      const [foreignKeys] = await db.query("SELECT COUNT(*) n FROM information_schema.referential_constraints WHERE constraint_schema=?", [target]);
      assert.ok(Number(foreignKeys[0].n) > 0, "Restore must preserve foreign keys");
      const existingFiles = (await readdir(directory)).sort();
      const missingDump = process.platform === "win32" ? "C:\\\\does-not-exist\\\\mysqldump.exe" : "/does-not-exist/mysqldump";
      await run("php", ["scripts/backup_db.php"], { ...env, BACKUP_DIR: directory, MYSQLDUMP_BIN: missingDump }, undefined, 1);
      assert.deepEqual((await readdir(directory)).sort(), existingFiles, "Failed dump must not publish or leak temporary credentials");
    } finally {
      if (created) await db.query(`DROP DATABASE \`${target}\``);
      await rm(directory, { recursive: true, force: true });
    }
  });
}
