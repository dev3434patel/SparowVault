/**
 * Local development Account Aggregator.
 * Off unless AA_LOCAL_PROVIDER=true.
 * URL: http://127.0.0.1:8791
 * Names: AA_BASE_URL, AA_CLIENT_ID, AA_CLIENT_SECRET
 * A licensed provider is still required for production.
 */
import http from "node:http";
import { AA_LOCAL_BASE_URL, AA_LOCAL_PROVIDER_LABEL, aaLocalProviderEnabled } from "../src/services/aa/config.ts";
import { createLocalAaProvider } from "../src/services/aa/localProvider.ts";

if (!aaLocalProviderEnabled(process.env.AA_LOCAL_PROVIDER)) {
  console.error("Local provider is off. Set AA_LOCAL_PROVIDER=true. Nothing was started.");
  process.exit(1);
}

const clientId = (process.env.AA_CLIENT_ID ?? "").trim();
const clientSecret = (process.env.AA_CLIENT_SECRET ?? "").trim();
if (!clientId || !clientSecret) {
  console.error("Set AA_CLIENT_ID and AA_CLIENT_SECRET. Values are not printed. Nothing was started.");
  process.exit(1);
}

const provider = createLocalAaProvider({ enabled: true, clientId, clientSecret });

const server = http.createServer(async (req, res) => {
  const method = (req.method ?? "GET").toUpperCase();
  const url = new URL(req.url ?? "/", AA_LOCAL_BASE_URL);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    if (size > 1_000_000) {
      res.writeHead(413, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ message: "Account Aggregator request was too large. Nothing was imported." }));
      return;
    }
    chunks.push(buf);
  }
  let body: unknown;
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw) {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ message: "Account Aggregator request body was not JSON. Nothing was imported." }));
      return;
    }
  }
  if (method !== "GET" && method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ message: "Account Aggregator rejected the request (405). Nothing was imported." }));
    return;
  }
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers[key] = value;
  }
  const result = provider.handle({ method, path: url.pathname, body, headers });
  res.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(result.body));
});

server.listen(8791, "127.0.0.1", () => {
  console.log(AA_LOCAL_PROVIDER_LABEL);
  console.log(`Listening at ${AA_LOCAL_BASE_URL}`);
  console.log("Names: AA_LOCAL_PROVIDER, AA_BASE_URL, AA_CLIENT_ID, AA_CLIENT_SECRET");
});
