#!/usr/bin/env node
/**
 * One-shot root cleanup for GitHub-ready SparowVault layout.
 * Safe: only moves reports / deletes known junk; never touches src|api|php|sql|tests|scripts.
 */
import { mkdirSync, renameSync, existsSync, rmSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function moveTo(destDir, name) {
  const src = join(ROOT, name);
  if (!existsSync(src)) return;
  ensureDir(destDir);
  const dest = join(destDir, name);
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  renameSync(src, dest);
  console.log("moved:", name, "→", destDir.replace(ROOT + "\\", "").replace(ROOT + "/", ""));
}

function del(name) {
  const p = join(ROOT, name);
  if (!existsSync(p)) return;
  rmSync(p, { recursive: true, force: true });
  console.log("deleted:", name);
}

const archiveReports = join(ROOT, "docs", "archive", "reports");
const archiveAudits = join(ROOT, "docs", "archive", "audits");
ensureDir(archiveReports);
ensureDir(archiveAudits);

const reportPatterns = [
  /^PHASE_.*\.md$/i,
  /^LOCAL_.*\.md$/i,
  /^LOCAL_PHASE_.*\.md$/i,
  /^LAUNCH_.*\.md$/i,
  /^MONEY_.*\.md$/i,
  /^SECURITY_PHASE.*\.md$/i,
  /^STAGING_.*\.md$/i,
  /^RESTORE_.*\.md$/i,
  /^STATUS_REPORT\.md$/i,
  /^SYSTEM_TEST_REPORT\.md$/i,
  /^PROJECT_AUDIT_.*\.md$/i,
  /^SYNC_CONTRACT_REGISTRY\.md$/i,
  /^SPAROWVAULT_FINAL_CERTIFICATION_REPORT\.md$/i,
  /^FINAL_VERSION_README\.md$/i,
  /^PHASE_GATE_INDEX\.md$/i,
];

for (const name of readdirSync(ROOT)) {
  if (reportPatterns.some((re) => re.test(name))) {
    moveTo(archiveReports, name);
  }
}

for (const name of [
  "AUDIT_REPORT.html",
  "AUDIT_REPORT_MVP.html",
  "AUDIT_REPORT_MVP.docx",
  "SPAROWVAULT_FULL_PROJECT_AUDIT_REPORT.docx",
]) {
  moveTo(archiveAudits, name);
}

// Keep current certification summaries under docs/certification
const certDir = join(ROOT, "docs", "certification");
ensureDir(certDir);
for (const name of [
  "PRODUCTION_RELEASE_CERTIFIED.md",
  "FINAL_OPEN_GAPS.md",
  "SPAROWVAULT_FINAL_FINANCE_CORRECTNESS_CERTIFICATION.md",
  "SPAROWVAULT_VNEXT_FINANCE_CERTIFICATION.md",
  "SPAROWVAULT_VNEXT_MANUAL_QA.md",
  "PHASE_L_VNEXT_FINANCE_GATE_REPORT.md",
]) {
  moveTo(certDir, name);
}

// Junk zips / leftovers
for (const name of [
  "api.zip",
  "php.zip",
  "dist.zip",
  "dist (2).zip",
  "FINAL VERSION.zip",
  "local-phase-12-report-review.json",
  "tsconfig.tsbuildinfo",
  "file.svg",
  "globe.svg",
  "next.svg",
  "vercel.svg",
  "window.svg",
  "favicon.ico", // vite serves from /public
]) {
  del(name);
}

// Duplicate / obsolete folders
for (const name of [
  "FINAL VERSION",
  "certification-logs",
  "deployment-logs",
  "audit-word-evidence",
  "audit-word-render",
  ".claude",
]) {
  del(name);
}

// local-phase-*-logs
for (const name of readdirSync(ROOT)) {
  if (/^local-phase-\d+-logs$/i.test(name)) del(name);
}

console.log("\nRoot cleanup complete.");
