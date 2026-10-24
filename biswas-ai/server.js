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

function safeHttpUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[)/.test(h)) return "";
    return u.toString();
  } catch (e) { return ""; }
}
function stripPage(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1800);
}
async function readPage(url) {
  const safe = safeHttpUrl(url);
  if (!safe) return "";
  const r = await fetch(safe, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (compatible; BiswasAI/1.0)" } });
  if (!r.ok) return "";
  return stripPage(await r.text());
}
async function searchWeb(q) {
  const found = [];
  const add = (title, url) => { const safe = safeHttpUrl(url); if (safe && !found.some(x => x.url === safe)) found.push({ title, url: safe }); };
  const hints = [
    [/birth|death|জন্ম|মৃত্যু|registration/i, [["Janma-Mrityu Tathya", "https://janma-mrityutathya.wb.gov.in/"], ["Civil Registration", "https://crsorgi.gov.in/"]]],
    [/bsk|sahayata|সহায়তা/i, [["Bangla Sahayata Kendra", "https://bsk.wb.gov.in/about-bsk.html"]]],
    [/ration|khadya|খাদ্য/i, [["Food and Supplies", "https://food.wb.gov.in/"]]],
    [/licen[cs]e|sarathi|driving/i, [["Sarathi", "https://sarathi.parivahan.gov.in/"]]],
    [/land|mutation|khatian|খতিয়ান|banglarbhumi/i, [["Banglarbhumi", "https://banglarbhumi.gov.in/"]]]
  ];
  for (const [re, rows] of hints) if (re.test(q)) for (const [title, url] of rows) add(title, url);
  try {
    const r = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q), { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0" } });
    const html = await r.text();
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && found.length < 5) {
      let href = m[1].replace(/&/g, "&");
      const ud = href.match(/uddg=([^&]+)/);
      if (ud) href = decodeURIComponent(ud[1]);
      add(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140), href);
    }
  } catch (e) { /* search can fail; the known sites above still run */ }
  return found.slice(0, 4);
}
async function research(q) {
  const hits = await searchWeb(q);
  const pages = [];
  for (const hit of hits) {
    try {
      const text = await readPage(hit.url);
      if (text.length > 60) pages.push({ title: hit.title || hit.url, url: hit.url, text });
    } catch (e) { /* skip a page that does not open */ }
    if (pages.length >= 3) break;
  }
  return pages;
}

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
    if (url.pathname === "/api/research" && req.method === "POST") {
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 20000) { res.writeHead(413).end(); return; } chunks.push(c); }
      let q = "";
      try { q = String(JSON.parse(Buffer.concat(chunks).toString("utf8")).q || "").slice(0, 240); } catch (e) { q = ""; }
      const pages = q.trim() ? await research(q.trim()) : [];
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify({ pages }));
      return;
    }
    if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }).end("ok v27"); return; }
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
