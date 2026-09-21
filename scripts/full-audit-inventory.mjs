import ts from "typescript";
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const directory = process.env.AUDIT_DIRECTORY || "docs/audit-evidence/2026-09-11-full/inventory";
await mkdir(directory, { recursive: true });
async function walk(root) {
  const rows = [];
  for (const file of await readdir(root, { withFileTypes: true })) {
    if (file.name.startsWith("._")) continue;
    const path = `${root}/${file.name}`;
    if (file.isDirectory()) rows.push(...await walk(path)); else rows.push(path);
  }
  return rows;
}
const functions = [], actions = [], fields = [], hashes = {}, assets = [], keywordHits = [];
const sources = [];
for (const root of ["src", "php", "api", "scripts", "tests"]) sources.push(...await walk(root));
for (const file of [...sources, "package.json", "package-lock.json", ".htaccess", "vite.config.ts", "vitest.config.mts"]) {
  const bytes = await readFile(file); hashes[file] = createHash("sha256").update(bytes).digest("hex");
  if (/^(src|php|api)\//.test(file) && /\.(tsx?|php)$/.test(file)) {
    for (const [index, text] of bytes.toString().split("\n").entries()) {
      const terms = text.match(/\b(TODO|FIXME|HACK|temporary|mock|hardcoded|placeholder|demo|localStorage|console\.log)\b/g);
      if (terms) keywordHits.push({ file, line: index + 1, terms: [...new Set(terms)], text: text.trim().slice(0, 300) });
    }
  }
  if (!file.startsWith("src/") || !/\.tsx?$/.test(file)) continue;
  const ast = ts.createSourceFile(file, bytes.toString(), ts.ScriptTarget.Latest, true);
  const line = node => ast.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const value = node => node?.getText(ast).replace(/\s+/g, " ").slice(0, 300);
  function visit(node) {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) functions.push({ file, line: line(node), name: value(node.name) });
    if (ts.isVariableDeclaration(node) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) functions.push({ file, line: line(node), name: value(node.name) });
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => [value(attr.name), value(attr.initializer)]));
      const tag = value(node.tagName);
      if (attrs.onClick || attrs.onSubmit) actions.push({ file, line: line(node), tag, ...attrs });
      if (["Field", "Input", "Select", "select", "input", "textarea", "Checkbox", "Switch"].includes(tag)) fields.push({ file, line: line(node), tag, ...attrs });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
for (const file of await walk("dist")) assets.push({ file, bytes: (await stat(file)).size });
const summary = {
  date: new Date().toISOString(), head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  remote: execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim(),
  node: process.version, php: execFileSync("php", ["-r", "echo PHP_VERSION;"], { encoding: "utf8" }),
  sourceFiles: sources.length, apiFiles: sources.filter(f => f.startsWith("api/") && f.endsWith(".php")).length,
  pageFiles: sources.filter(f => f.startsWith("src/components/pages/") && f.endsWith(".tsx")).length,
  tsTestFiles: sources.filter(f => /\.(test|spec)\.tsx?$/.test(f)).length,
  topLevelE2eScripts: sources.filter(f => /^tests\/[^/]+\.mjs$/.test(f)).length,
  serviceAndLibTsFiles: sources.filter(f => /^src\/(services|lib)\/.*\.ts$/.test(f) && !f.includes("__tests__")).length,
  componentTsxFiles: sources.filter(f => /^src\/components\/.*\.tsx$/.test(f)).length,
  todoFixmeHackLines: keywordHits.filter(row => row.terms.some(term => ["TODO", "FIXME", "HACK"].includes(term))).length,
  namedTsFunctions: functions.length, jsxActionDefinitions: actions.length, fieldDefinitions: fields.length,
  caveat: "Static AST inventory is not execution coverage. Generated/test/binary files hashed; AppleDouble metadata excluded. No secrets included.",
};
for (const [name, content] of Object.entries({ summary, functions, actions, fields, assets, "source-hashes": hashes, "keyword-hits": keywordHits })) await writeFile(`${directory}/${name}.json`, JSON.stringify(content, null, 2));
console.log(JSON.stringify(summary, null, 2));
