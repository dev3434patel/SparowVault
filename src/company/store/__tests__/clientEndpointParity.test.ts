/**
 * FE client must call canonical endpoints only — no duplicate *-create / *-item URLs.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CLIENT_DIR = join(process.cwd(), "src/company/api");
const FORBIDDEN = ["workspace-create.php", "workspace-item.php", "party-create.php"];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...collectTsFiles(p));
    else if (name.name.endsWith(".ts") || name.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("company API client endpoint parity", () => {
  it("does not call deprecated duplicate endpoints", () => {
    const files = collectTsFiles(CLIENT_DIR);
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const bad of FORBIDDEN) {
        if (text.includes(bad)) hits.push(`${file} → ${bad}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("createWorkspace uses workspaces.php POST", () => {
    const admin = readFileSync(join(CLIENT_DIR, "client/admin.ts"), "utf8");
    expect(admin).toMatch(/workspaces\.php/);
    expect(admin).not.toMatch(/workspace-create\.php/);
  });
});
