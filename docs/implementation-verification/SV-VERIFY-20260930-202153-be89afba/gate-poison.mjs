/**
 * Gate-poisoning fixtures. These are not application results.
 * A manifest passes only when every local mandatory row is PASS,
 * evidence hashes match, test count is non-zero, and external bank scope stays blocked
 * without being counted as a local pass.
 */
const cases = [];

function evaluate(manifest) {
  const reasons = [];
  if (!manifest.evidenceHash || manifest.evidenceHash !== manifest.expectedHash) reasons.push("stale-or-missing-hash");
  if (!Array.isArray(manifest.evidence) || manifest.evidence.length === 0) reasons.push("missing-evidence");
  if (!Number.isInteger(manifest.testCount) || manifest.testCount <= 0) reasons.push("zero-tests");
  const local = (manifest.requirements || []).filter((row) => row.scope === "local" && row.mandatory);
  if (local.some((row) => row.status !== "PASS")) reasons.push("failed-mandatory-local");
  const bank = (manifest.requirements || []).find((row) => row.scope === "bank");
  if (bank && bank.status !== "BLOCKED_EXTERNAL") reasons.push("bank-scope-not-blocked");
  if (bank && bank.status === "PASS") reasons.push("blocked-bank-counted-as-pass");
  return { pass: reasons.length === 0, reasons };
}

const good = {
  evidenceHash: "abc",
  expectedHash: "abc",
  evidence: ["oracle-company.json"],
  testCount: 581,
  requirements: [
    { id: "L1", scope: "local", mandatory: true, status: "PASS" },
    { id: "B1", scope: "bank", mandatory: false, status: "BLOCKED_EXTERNAL" },
  ],
};

const fixtures = {
  "missing-evidence": { ...good, evidence: [] },
  "stale-hash": { ...good, evidenceHash: "old" },
  "zero-tests": { ...good, testCount: 0 },
  "failed-mandatory-local": {
    ...good,
    requirements: [
      { id: "L1", scope: "local", mandatory: true, status: "FAIL" },
      { id: "B1", scope: "bank", mandatory: false, status: "BLOCKED_EXTERNAL" },
    ],
  },
  "blocked-bank-as-pass": {
    ...good,
    requirements: [
      { id: "L1", scope: "local", mandatory: true, status: "PASS" },
      { id: "B1", scope: "bank", mandatory: false, status: "PASS" },
    ],
  },
  "complete-local-with-blocked-bank": good,
};

let failed = 0;
for (const [name, manifest] of Object.entries(fixtures)) {
  const result = evaluate(manifest);
  const expectPass = name === "complete-local-with-blocked-bank";
  const ok = result.pass === expectPass;
  if (!ok) failed += 1;
  cases.push({ name, expectPass, actualPass: result.pass, reasons: result.reasons, ok });
  console.log((ok ? "ok" : "BAD") + " " + name + " pass=" + result.pass + " " + result.reasons.join(","));
}
console.log(failed === 0 ? "GATE_POISON_OK" : "GATE_POISON_BAD");
process.exit(failed === 0 ? 0 : 1);
