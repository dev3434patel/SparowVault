/**
 * Fail if en.json / gu.json keys diverge.
 */
import { readFileSync, mkdirSync, appendFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const en = JSON.parse(readFileSync(join(root, "src/company/i18n/locales/en.json"), "utf8"));
const gu = JSON.parse(readFileSync(join(root, "src/company/i18n/locales/gu.json"), "utf8"));

const enKeys = new Set(Object.keys(en));
const guKeys = new Set(Object.keys(gu));

const missingInGu = [...enKeys].filter((k) => !guKeys.has(k)).sort();
const missingInEn = [...guKeys].filter((k) => !enKeys.has(k)).sort();
const emptyGu = [...guKeys].filter((k) => !String(gu[k] ?? "").trim()).sort();

const lines = [];
lines.push(`i18n-audit ${new Date().toISOString()}`);
lines.push(`en keys=${enKeys.size} gu keys=${guKeys.size}`);
if (missingInGu.length) lines.push(`MISSING_IN_GU (${missingInGu.length}): ${missingInGu.join(", ")}`);
if (missingInEn.length) lines.push(`MISSING_IN_EN (${missingInEn.length}): ${missingInEn.join(", ")}`);
if (emptyGu.length) lines.push(`EMPTY_GU (${emptyGu.length}): ${emptyGu.join(", ")}`);

const ok = missingInGu.length === 0 && missingInEn.length === 0 && emptyGu.length === 0;
lines.push(ok ? "PASS en/gu key parity 100%" : "FAIL en/gu key parity");

console.log(lines.join("\n"));

const logDir = join(root, "docs/company/audit/raw");
mkdirSync(logDir, { recursive: true });
const logPath = join(logDir, "PHASE_07.log");
if (!existsSync(logPath)) writeFileSync(logPath, "", "utf8");
appendFileSync(logPath, lines.join("\n") + "\n\n", "utf8");

process.exit(ok ? 0 : 1);
