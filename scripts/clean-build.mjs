import { rm } from "node:fs/promises";

async function safeRemove(path) {
  try {
    await rm(path, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup.
  }
}

await safeRemove("dist");
