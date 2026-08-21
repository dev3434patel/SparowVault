const CANDIDATE_PORTS = [5173, 5174, 5175, 5176, 4173, 4000];

async function detectBaseUrl() {
  for (const port of CANDIDATE_PORTS) {
    const url = `http://localhost:${port}`;
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) continue;
      const html = await res.text();
      if (html.includes('id="root"') || html.toLowerCase().includes("sparowvault")) {
        return url;
      }
    } catch {
      // Port not serving the frontend; try next.
    }
  }
  return null;
}

async function run() {
  const base = process.env.BASE_URL?.trim() || (await detectBaseUrl());
  if (!base) {
    console.error(
      "No running frontend found on common ports. Start Vite first (npm run dev:client) or set BASE_URL.",
    );
    process.exit(2);
  }

  console.log(`Using BASE_URL=${base}`);

  const child = await import("node:child_process");
  const proc = child.spawn(process.execPath, ["tests/browser-e2e.mjs"], {
    stdio: "inherit",
    env: { ...process.env, BASE_URL: base },
  });

  proc.on("exit", (code) => process.exit(code ?? 1));
  proc.on("error", () => process.exit(1));
}

run();
