import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "D:/Claude/SparowVault",
  resolve: {
    alias: {
      "@": path.resolve("D:/Claude/SparowVault/src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "docs/implementation-verification/SV-VERIFY-20260930-202241-b182d88604c9/runners/personal-oracles.test.ts",
    ],
  },
});
