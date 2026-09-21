import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const statementMode = process.argv.includes("--statements");
const directory = statementMode ? process.env.STATEMENT_EVIDENCE_DIRECTORY || "docs/statement-evidence/2026-09-10" : "docs/implementation-evidence/2026-09-10";
await mkdir(directory, { recursive: true });
const results = [];
for (const [name, command, args] of [
  ["typecheck", "npm", ["run", "typecheck"]],
  ["lint", "npm", ["run", "lint"]],
  ["unit", "npm", ["run", "test"]],
  ["integrity-browser", "node", ["tests/atomic-writes-e2e.mjs", "--browser", ...(statementMode ? ["--statements"] : [])]],
  ["build", "npm", ["run", "build"]],
  ...(statementMode ? [["production-artifact", "node", ["tests/atomic-writes-e2e.mjs", "--browser", "--statements", "--artifact"]]] : []),
]) {
  const started = Date.now();
  let output = "";
  const child = spawn(command, args, { stdio: "pipe", shell: process.platform === "win32", env: name === "build" && statementMode ? { ...process.env, VITE_API_BASE_URL: "", VITE_API_TARGET: "" } : process.env });
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  await writeFile(`${directory}/${name}.log`, output);
  results.push({ name, command: [command, ...args].join(" "), ...(name === "build" && statementMode ? { environmentOverrides: { VITE_API_BASE_URL: "", VITE_API_TARGET: "" } } : {}), exitCode: code, durationMs: Date.now() - started, log: `${name}.log` });
  console.log(`${code === 0 ? "PASS" : "FAIL"} ${name} (${Date.now() - started} ms)`);
}
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith("._")) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else result.push(path);
  }
  return result;
}
const source = [];
for (const root of ["src", "php", "api", "tests", "scripts"]) source.push(...await files(root));
source.push("package.json", "package-lock.json", "vite.config.ts", "vitest.config.mts", "eslint.config.mjs", "sql/migrations/20260910_atomic_writes.sql", "sql/migrations/20260911_security_sessions.sql");
if (statementMode) source.push(".htaccess");
const phpFiles = source.filter(file => /^(php|api)\//.test(file) && file.endsWith(".php"));
const phpOutput = [];
let phpStatus = 0;
for (const file of phpFiles) {
  try { phpOutput.push(execFileSync("php", ["-l", file], { encoding: "utf8" })); }
  catch (error) { phpStatus = 1; phpOutput.push(`${file}: ${error.message}`); }
}
await writeFile(`${directory}/php-syntax.log`, phpOutput.join(""));
results.push({ name: "php-syntax", command: "php -l on all non-metadata api/php files", fileCount: phpFiles.length, exitCode: phpStatus, log: "php-syntax.log" });
const hashes = {};
for (const file of source) hashes[file] = createHash("sha256").update(await readFile(file)).digest("hex");
await writeFile(`${directory}/source-hashes.json`, JSON.stringify(hashes, null, 2) + "\n");
await writeFile(`${directory}/verification.json`, JSON.stringify({ date: new Date().toISOString(), head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), worktree: "Includes uncommitted implementation and preserved user changes; see source-hashes.json", results }, null, 2) + "\n");
process.exitCode = results.some(result => result.exitCode !== 0) ? 1 : 0;
