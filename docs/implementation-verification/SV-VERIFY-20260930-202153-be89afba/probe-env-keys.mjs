import fs from "node:fs";

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[k] = v;
  }
  return env;
}

const base = parseEnv(fs.readFileSync(".env", "utf8"));
const keys = Object.keys(base).sort();
const selected = base.APP_ENV_FILE || "";
const selectedSafe = selected ? selected.replace(/[^A-Za-z0-9._-]/g, "") : "";
let selectedKeys = [];
let selectedDbContainsTest = null;
let selectedHasUrl = false;
if (selectedSafe && fs.existsSync(selectedSafe)) {
  const sel = parseEnv(fs.readFileSync(selectedSafe, "utf8"));
  selectedKeys = Object.keys(sel).sort();
  const name = sel.DB_NAME || "";
  let urlDb = "";
  if ((sel.DATABASE_URL || "").startsWith("mysql://")) {
    selectedHasUrl = true;
    try { urlDb = decodeURIComponent(new URL(sel.DATABASE_URL).pathname.replace(/^\//, "")); } catch { urlDb = ""; }
  }
  const target = urlDb || name;
  selectedDbContainsTest = /test/i.test(target);
  console.log(JSON.stringify({
    selectedFileBasename: selectedSafe,
    selectedTargetContainsTest: selectedDbContainsTest,
    selectedTargetLength: target.length,
    selectedHasDatabaseUrl: selectedHasUrl,
    selectedKeyCount: selectedKeys.length,
  }));
} else {
  console.log(JSON.stringify({
    baseKeyCount: keys.length,
    baseKeys: keys,
    selectedFilePresent: Boolean(selectedSafe && fs.existsSync(selectedSafe)),
    selectedFileBasename: selectedSafe || null,
  }));
}
