#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SYNC_CONTRACTS } from "../src/config/syncContracts.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outPath = resolve(root, "src/config/syncContracts.generated.json");

await writeFile(
  outPath,
  `${JSON.stringify({ generatedFrom: "src/config/syncContracts.ts", contracts: SYNC_CONTRACTS }, null, 2)}\n`,
  "utf8",
);

console.log(`wrote ${outPath}`);
