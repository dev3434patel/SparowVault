/**
 * Verify security headers for SparowVault SPA/API (PHASE_10).
 *
 * Modes:
 *  1) Config lint (always): .htaccess + deploy/nginx-spa.conf.example must declare
 *     HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, CSP.
 *  2) Live probe when HEADERS_CHECK_URL or COMPANY_STAGING_URL is set (HTTPS preferred).
 *
 * Exit 0 only if config lint passes AND (no live URL OR live headers pass).
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rawDir = join(root, "docs/company/audit/raw");
mkdirSync(rawDir, { recursive: true });
const logPath = join(rawDir, "PHASE_10.log");
const outPath = join(rawDir, "PHASE_10_HEADERS.txt");

const REQUIRED = [
  { name: "Strict-Transport-Security", re: /strict-transport-security/i },
  { name: "X-Frame-Options", re: /x-frame-options[^\\n]*deny/i },
  { name: "X-Content-Type-Options", re: /x-content-type-options[^\\n]*nosniff/i },
  { name: "Referrer-Policy", re: /referrer-policy/i },
  { name: "Content-Security-Policy", re: /content-security-policy/i },
];

function log(line) {
  console.log(line);
  appendFileSync(logPath, line + "\n", "utf8");
}

const lines = [`HEADERS CHECK ${new Date().toISOString()}`];
let fail = 0;

function checkConfig(label, path) {
  const abs = join(root, path);
  if (!existsSync(abs)) {
    lines.push(`FAIL config missing ${path}`);
    fail++;
    return;
  }
  const text = readFileSync(abs, "utf8");
  for (const req of REQUIRED) {
    const ok = req.re.test(text);
    lines.push(`${ok ? "PASS" : "FAIL"} config:${label} ${req.name}`);
    if (!ok) fail++;
  }
}

checkConfig("htaccess", ".htaccess");
checkConfig("nginx", "deploy/nginx-spa.conf.example");

// PHP apply_security_headers also emits these (API path)
const secPhp = join(root, "php/helpers/security.php");
if (existsSync(secPhp)) {
  const text = readFileSync(secPhp, "utf8");
  for (const req of REQUIRED.filter((r) => r.name !== "Strict-Transport-Security")) {
    const ok = req.re.test(text);
    lines.push(`${ok ? "PASS" : "FAIL"} config:php-api ${req.name}`);
    if (!ok) fail++;
  }
  const hsts = /Strict-Transport-Security/i.test(text);
  lines.push(`${hsts ? "PASS" : "FAIL"} config:php-api Strict-Transport-Security (production gated)`);
  if (!hsts) fail++;
}

const liveUrl = (process.env.HEADERS_CHECK_URL || process.env.COMPANY_STAGING_URL || "").replace(/\/$/, "");
if (liveUrl) {
  lines.push(`LIVE_URL ${liveUrl}`);
  try {
    const res = await fetch(liveUrl, { method: "GET", redirect: "manual" });
    const headers = res.headers;
    // Also follow one redirect to HTTPS landing if needed
    let probe = res;
    if ([301, 302, 307, 308].includes(res.status) && res.headers.get("location")) {
      probe = await fetch(res.headers.get("location"), { method: "GET", redirect: "follow" });
    }
    const h = probe.headers;
    const get = (n) => h.get(n) || "";
    const checks = [
      ["Strict-Transport-Security", /max-age=\d+/i.test(get("strict-transport-security")), get("strict-transport-security")],
      ["X-Frame-Options", /deny/i.test(get("x-frame-options")), get("x-frame-options")],
      ["X-Content-Type-Options", /nosniff/i.test(get("x-content-type-options")), get("x-content-type-options")],
      ["Referrer-Policy", get("referrer-policy").length > 0, get("referrer-policy")],
      ["Content-Security-Policy", /default-src/i.test(get("content-security-policy")), get("content-security-policy").slice(0, 80)],
    ];
    for (const [name, ok, val] of checks) {
      lines.push(`${ok ? "PASS" : "FAIL"} live ${name} value=${JSON.stringify(val)}`);
      if (!ok) fail++;
    }
    if (!/^https:/i.test(liveUrl) && !/^https:/i.test(probe.url || "")) {
      lines.push("WARN live URL is not HTTPS — HSTS may be absent until TLS terminates");
    }
  } catch (e) {
    lines.push(`FAIL live probe ${String(e).slice(0, 200)}`);
    fail++;
  }
} else {
  lines.push("LIVE_URL unset — config lint only (set COMPANY_STAGING_URL for live HTTPS verification)");
}

lines.push(`SUMMARY fail=${fail}`);
lines.push(fail === 0 ? "HEADERS CHECK PASS" : "HEADERS CHECK FAIL");
const body = lines.join("\n") + "\n";
writeFileSync(outPath, body, "utf8");
if (!existsSync(logPath)) writeFileSync(logPath, "", "utf8");
appendFileSync(logPath, "\n" + body, "utf8");
console.log(body);
process.exit(fail === 0 ? 0 : 1);
