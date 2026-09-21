#!/usr/bin/env node
/**
 * Fail fast when localhost:8080 is occupied by something that is not SparowVault's PHP API.
 * Prevents the common local failure where another Vite app steals :8080 and browsers see broken CORS.
 */
import { createConnection } from "node:net";

const host = process.env.SV_API_HOST ?? "127.0.0.1";
const port = Number(process.env.SV_API_PORT ?? 8080);

function probe(timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.on("connect", () => done("busy"));
    socket.on("timeout", () => done("free"));
    socket.on("error", () => done("free"));
  });
}

async function healthLooksLikePhpApi() {
  try {
    const res = await fetch(`http://${host}:${port}/api/health.php`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json?.ok && json?.data?.status);
  } catch {
    return false;
  }
}

const state = await probe();
if (state === "free") {
  process.exit(0);
}

if (await healthLooksLikePhpApi()) {
  console.error(
    `[sparowvault] Port ${port} already serves the SparowVault PHP API. Stop the existing php -S process first, or reuse it.`,
  );
  process.exit(1);
}

console.error(
  `[sparowvault] Port ${port} is in use by a non-API process (often another Vite app).\n` +
    `  Free it, then run: npm run dev:server\n` +
    `  Quick check: curl http://localhost:${port}/api/health.php`,
);
process.exit(1);
