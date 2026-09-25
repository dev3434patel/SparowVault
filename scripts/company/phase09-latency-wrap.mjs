/**
 * PHASE_09 latency wrapper: ensure cert user has OWNER on a 10k Scale Co, then run latency.
 */
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const ensure = spawnSync("php", ["scripts/company/_phase08_ensure_scale_member.php"], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
  shell: process.platform === "win32",
});
const out = `${ensure.stdout || ""}${ensure.stderr || ""}`;
process.stdout.write(out);
const m = out.match(/COMPANY_PERF_COMPANY_ID=([^\s]+)/);
if (!m) {
  console.error("ensure_scale_member failed to emit company id");
  process.exit(1);
}
const companyId = m[1].trim();

const lat = spawnSync("npm", ["run", "company:test:latency"], {
  cwd: root,
  encoding: "utf8",
  env: {
    ...process.env,
    COMPANY_LATENCY_COMPANY_ID: companyId,
    COMPANY_PERF_COMPANY_ID: companyId,
  },
  shell: process.platform === "win32",
  maxBuffer: 16 * 1024 * 1024,
});
process.stdout.write(lat.stdout || "");
process.stderr.write(lat.stderr || "");
process.exit(lat.status ?? 1);
