import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const generatedDirs = [
  "dist",
  "build",
  "release",
  "hosting-bundle",
  "FINAL VERSION",
  "certification-logs",
  "backups",
  "data",
  "node_modules",
];

const lintableRoots = [
  "src",
  "tests",
  "scripts",
  "api",
  "php",
  "eslint.config.mjs",
  "vite.config.ts",
  "vitest.config.mts",
];

function normalize(content) {
  return content.replace(/\r\n/g, "\n");
}

function hasIgnore(content, dir) {
  const escaped = dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`(^|\\n)${escaped}/?(\\n|$)`),
    new RegExp(`(^|\\n)/${escaped}/?(\\n|$)`),
    new RegExp(`["']${escaped}/\\*\\*["']`),
    new RegExp(`["']${escaped}/["']`),
    new RegExp(`["']${escaped}/\\*["']`),
  ];
  return patterns.some((pattern) => pattern.test(content));
}

async function listExistingGeneratedFiles() {
  const found = [];
  for (const dir of generatedDirs) {
    const abs = path.join(ROOT, dir);
    if (!existsSync(abs)) continue;
    const stack = [abs];
    let inspected = 0;
    while (stack.length && inspected < 20) {
      const current = stack.pop();
      inspected += 1;
      let entries = [];
      try {
        entries = await readdir(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries.slice(0, 20)) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else found.push(path.relative(ROOT, full).replace(/\\/g, "/"));
        if (found.length > 200) return found;
      }
    }
  }
  return found;
}

async function main() {
  const failures = [];
  const warnings = [];

  const packageJson = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
  const lintScript = packageJson.scripts?.lint ?? "";
  if (lintScript !== "eslint .") {
    failures.push(`package.json lint script is expected to be "eslint ." but found "${lintScript}".`);
  }
  if (!packageJson.scripts?.["check:repo-clean"]) {
    failures.push("package.json is missing scripts.check:repo-clean.");
  }

  const gitignore = normalize(await readFile(path.join(ROOT, ".gitignore"), "utf8"));
  const prettierignorePath = path.join(ROOT, ".prettierignore");
  const prettierignore = existsSync(prettierignorePath)
    ? normalize(await readFile(prettierignorePath, "utf8"))
    : "";
  const eslintConfig = normalize(await readFile(path.join(ROOT, "eslint.config.mjs"), "utf8"));

  for (const dir of generatedDirs) {
    if (!hasIgnore(gitignore, dir)) failures.push(`.gitignore does not ignore ${dir}/.`);
    if (!hasIgnore(prettierignore, dir)) failures.push(`.prettierignore does not ignore ${dir}/.`);
    if (!hasIgnore(eslintConfig, dir)) failures.push(`eslint.config.mjs does not ignore ${dir}/.`);
  }

  for (const root of lintableRoots) {
    if (!existsSync(path.join(ROOT, root))) {
      warnings.push(`Expected lintable root is absent: ${root}`);
    }
  }

  const generatedFiles = await listExistingGeneratedFiles();

  const result = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    lintScript,
    generatedDirs,
    lintableRoots,
    generatedFilesSample: generatedFiles.slice(0, 40),
    failures,
    warnings,
  };

  console.log(JSON.stringify(result, null, 2));

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
