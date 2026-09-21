/**
 * Document intentional SQL files in hosting-bundle + HTTP deny via .htaccess.
 */
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

const htaccess = await readFile(".htaccess", "utf8");
const pkg = await readFile("scripts/package-hosting.mjs", "utf8");
const sqlDeniedInHttp = /FilesMatch\s+"[^"]*sql[^"]*"/.test(htaccess) && /Require all denied/.test(htaccess);
const intentionalCopies = [
  "HOSTING_READY_CLEAN_IMPORT.sql",
  "20260910_atomic_writes.sql",
  "20260911_security_sessions.sql",
].every((name) => pkg.includes(name));

let bundlePresent = false;
try {
  await access(join(process.cwd(), "release", "hosting-bundle", "HOSTING_READY_CLEAN_IMPORT.sql"));
  bundlePresent = true;
} catch {
  bundlePresent = false;
}

const policy = {
  intentionalOperatorInstallSqlInBundle: intentionalCopies,
  httpDenySqlExtensions: sqlDeniedInHttp,
  bundleContainsHostingSql: bundlePresent,
  allowlist: [
    "HOSTING_READY_CLEAN_IMPORT.sql — clean schema for host install (operator only)",
    "20260910_atomic_writes.sql — migration companion",
    "20260911_security_sessions.sql — migration companion",
  ],
  rule: "SQL may ship in the package for offline install; Apache .htaccess must deny HTTP GET of *.sql. PHP built-in serve does not honor .htaccess — Apache evidence required for deny proof.",
  status: intentionalCopies && sqlDeniedInHttp ? "PASS_POLICY_DOCUMENTED" : "FAIL",
};

await writeFile(
  join(outDir, "PACKAGE_SQL_ALLOWLIST.md"),
  `# Package SQL allowlist\n\n\`\`\`json\n${JSON.stringify(policy, null, 2)}\n\`\`\`\n`,
);
console.log(JSON.stringify(policy, null, 2));
process.exit(policy.status.startsWith("PASS") ? 0 : 1);
