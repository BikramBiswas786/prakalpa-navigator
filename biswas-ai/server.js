// Biswas AI for Office: standalone server. Needs only Node.js 20+ (no packages).
//   node server.js           -> http://localhost:3000
// Put API keys in a .env file next to this file (see .env.example) or in the
// host's environment settings. PORT sets the port (default 3000).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

// Load .env (KEY=value lines) without overriding real environment variables.
const envFile = path.join(DIR, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const chat = await import("./api/chat.js");
const PORT = Number(process.env.PORT) || 3000;
const PAGE = path.join(DIR, "index.html");
const MAX_BODY = 12 * 1024 * 1024;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://local");
  try {
    if (url.pathname === "/api/chat") {
      if (req.method !== "GET" && req.method !== "POST") { res.writeHead(405).end(); return; }
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > MAX_BODY) { res.writeHead(413).end(); return; } chunks.push(c); }
      const ctl = new AbortController();
      res.on("close", () => { if (!res.writableFinished) ctl.abort(); });
      const request = new Request(`http://${req.headers.host || "localhost"}${req.url}`, {
        method: req.method, headers: req.headers, signal: ctl.signal,
        body: req.method === "POST" ? Buffer.concat(chunks) : undefined
      });
      const out = req.method === "POST" ? await chat.POST(request) : await chat.GET(request);
      res.writeHead(out.status, Object.fromEntries(out.headers));
      if (out.body) for await (const c of out.body) res.write(c);
      res.end();
      return;
    }
    // Only the app page is served; nothing else in this folder (such as .env) is reachable.
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", "x-content-type-options": "nosniff" });
      fs.createReadStream(PAGE).pipe(res);
      return;
    }
    if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }).end("ok v22"); return; }
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
    res.end();
  }
});

server.listen(PORT, async () => {
  const { providers } = await (await chat.GET()).json();
  console.log(`Biswas AI for Office is running: http://localhost:${PORT}`);
  console.log(providers.length ? `AI providers: ${providers.join(", ")}` : "No AI keys found. Add them to .env (see .env.example).");
});
