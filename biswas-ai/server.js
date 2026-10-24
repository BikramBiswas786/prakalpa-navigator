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
function decodeBasic(s) {
  return String(s || "")
    .replace(/&#(\d+);/g, (_, n) => { const c = Number(n); return c > 31 && c < 65536 ? String.fromCharCode(c) : " "; })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { const c = parseInt(n, 16); return c > 31 && c < 65536 ? String.fromCharCode(c) : " "; })
    .replace(new RegExp("&" + "amp;", "gi"), "&")
    .replace(new RegExp("&" + "nbsp;", "gi"), " ")
    .replace(/"/gi, '"')
    .replace(/'/gi, "'")
    .replace(/</gi, "<")
    .replace(/>/gi, ">")
    .replace(/&/gi, "&");
}
function stripPage(html) {
  return decodeBasic(String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3500);
}
function isWall(text) {
  const t = String(text || "").slice(0, 500).toLowerCase();
  return String(text || "").length < 900 && /access denied|enable javascript|just a moment|captcha|pardon our interruption|browser isn't supported/.test(t);
}
function readableText(html) {
  const raw = String(html || "");
  const markers = [/itemprop="articleBody"/i, /class="[^"]*entry-content[^"]*"/i, /class="[^"]*articlebody[^"]*"/i, /class="[^"]*article-body[^"]*"/i];
  for (const re of markers) {
    const m = re.exec(raw);
    if (!m) continue;
    const slice = raw.slice(m.index, m.index + 24000);
    const paras = [...slice.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(x => decodeBasic(x[1].replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
      .filter(t => t.length > 40);
    const joined = paras.join("\n\n").slice(0, 3500);
    if (joined.length > 80 && !isWall(joined)) return joined;
  }
  const plain = stripPage(raw);
  return plain.length > 80 && !isWall(plain) ? plain : "";
}
async function readPage(url) {
  const safe = safeHttpUrl(url);
  if (!safe) return "";
  const r = await fetch(safe, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (compatible; BiswasAI/1.0)" } });
  if (!r.ok) return "";
  return stripPage(await r.text());
}
async function readHtml(url) {
  const safe = safeHttpUrl(url);
  if (!safe) return "";
  try {
    const r = await fetch(safe, { redirect: "follow", signal: AbortSignal.timeout(9000), headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36", "accept": "text/html" } });
    if (!r.ok) return "";
    return await r.text();
  } catch (e) { return ""; }
}
function followLinks(html, base) {
  const out = [];
  const re = /href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(String(html || ""))) && out.length < 12) {
    try {
      const u = new URL(m[1], base);
      const host = u.hostname.toLowerCase();
      if (!host.endsWith(".gov.in") && host !== "wbxpress.com") continue;
      if (/\.(css|js|xml|ico|woff2?)(\?|$)/i.test(u.pathname)) continue;
      if (/\/wp-content\/|\/wp-includes\//i.test(u.pathname)) continue;
      const s = safeHttpUrl(u.toString());
      if (s && !out.includes(s)) out.push(s);
    } catch (e) { /* skip a bad link */ }
  }
  return out.slice(0, 3);
}
async function searchOrders(q, found, add) {
  for (let page = 1; page <= 2; page++) {
    if (found.length >= 8) break;
    try {
      const url = "https://wbxpress.com/?s=" + encodeURIComponent(q) + (page > 1 ? "&paged=" + page : "");
      const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0" } });
      const html = await r.text();
      const re = /<a[^>]+href="(https:\/\/wbxpress\.com\/[a-z0-9-]{8,}\/)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = re.exec(html)) && found.length < 8) {
        const title = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (title.length < 12) continue;
        add(title.slice(0, 140), m[1]);
      }
    } catch (e) { /* the next page or source still runs */ }
  }
}
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const GART_CTX = [["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1], "X", "X", 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0];
const NAV = {
  "user-agent": CHROME,
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-IN,en;q=0.9",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1"
};
function takeCookies(res, jar) {
  const lines = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const line of lines) {
    const pair = String(line || "").split(";")[0];
    const cut = pair.indexOf("=");
    if (cut > 0) jar[pair.slice(0, cut).trim()] = pair.slice(cut + 1).trim();
  }
}
function cookieHeader(jar) {
  return Object.keys(jar).map(k => k + "=" + jar[k]).join("; ");
}
function googleArticleId(link) {
  try {
    const u = new URL(String(link || "").trim());
    if (u.hostname !== "news.google.com") return "";
    const parts = u.pathname.split("/").filter(Boolean);
    const kind = parts[parts.length - 2];
    if (kind !== "articles" && kind !== "read") return "";
    const id = parts[parts.length - 1] || "";
    return /^[A-Za-z0-9_\-]+$/.test(id) ? id : "";
  } catch (e) { return ""; }
}
function parseGoogleBatch(text) {
  let body = String(text || "");
  const split = body.indexOf("\n\n");
  if (split >= 0) body = body.slice(split + 2);
  body = body.trimStart();
  if (body.startsWith(")]}'")) {
    const nl = body.indexOf("\n");
    body = (nl >= 0 ? body.slice(nl + 1) : body.slice(4)).trimStart();
  }
  let rows = JSON.parse(body);
  while (rows.length && Array.isArray(rows[rows.length - 1]) && (rows[rows.length - 1][0] === "di" || rows[rows.length - 1][0] === "e")) rows.pop();
  const out = {};
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 3) continue;
    if (row[0] !== "wrb.fr" && row[1] !== "Fbv4je") continue;
    let payload = row[2];
    if (typeof payload === "string") payload = JSON.parse(payload);
    if (!Array.isArray(payload) || payload[0] !== "garturlres" || typeof payload[1] !== "string") continue;
    let reqId = "";
    for (let i = row.length - 1; i >= 3; i--) if (row[i] != null) { reqId = String(row[i]); break; }
    let host = "";
    try { host = new URL(payload[1]).hostname.toLowerCase(); } catch (e) { host = ""; }
    if (reqId && host && !host.endsWith("google.com") && !host.endsWith("google.co.in")) out[reqId] = payload[1];
  }
  return out;
}
function safeBatch(text) {
  try { return parseGoogleBatch(text); } catch (e) { return {}; }
}
function titleHit(text, title) {
  const words = String(title || "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3).slice(0, 8);
  if (!words.length) return false;
  const hay = String(text || "").toLowerCase();
  return words.filter(w => hay.includes(w)).length >= Math.min(4, words.length);
}
async function openReadable(url) {
  const safe = safeHttpUrl(url);
  if (!safe) return { url: "", text: "" };
  try {
    const r = await fetch(safe, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: { "user-agent": CHROME, accept: "text/html" } });
    if (!r.ok) return { url: "", text: "" };
    const text = readableText(await r.text());
    return { url: r.url || safe, text };
  } catch (e) { return { url: "", text: "" }; }
}
async function decodeGoogleNews(ids, jar) {
  const headers = { ...NAV };
  const cookie = cookieHeader(jar || {});
  if (cookie) headers.cookie = cookie;
  const signed = await Promise.all(ids.map(async (id) => {
    try {
      const pageUrl = "https://news.google.com/rss/articles/" + id + "?hl=en-IN&gl=IN&ceid=IN:en";
      const r = await fetch(pageUrl, { redirect: "follow", signal: AbortSignal.timeout(12000), headers });
      if (!r.ok) return null;
      const html = await r.text();
      const sg = (html.match(/data-n-a-sg="([^"]+)"/) || [])[1];
      const ts = (html.match(/data-n-a-ts="([^"]+)"/) || [])[1];
      if (!sg || !ts) return null;
      return { id, sg, ts, bytes: html.length };
    } catch (e) { return null; }
  }));
  const ready = [];
  signed.forEach((row, i) => { if (row) ready.push({ ...row, req: String(i) }); });
  if (!ready.length) return { urls: {}, signed: 0 };
  const envelopes = ready.map(s => ["Fbv4je", JSON.stringify(["garturlreq", GART_CTX, s.id, /^\d+$/.test(s.ts) ? Number(s.ts) : s.ts, s.sg]), null, s.req]);
  const body = "f.req=" + encodeURIComponent(JSON.stringify([envelopes]));
  const attempts = [
    { "user-agent": CHROME, "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    { "user-agent": CHROME, "content-type": "application/x-www-form-urlencoded;charset=UTF-8", origin: "https://news.google.com", referer: "https://news.google.com/", ...(cookie ? { cookie } : {}) }
  ];
  const notes = [];
  for (const postHeaders of attempts) {
    try {
      const dec = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
        method: "POST",
        headers: postHeaders,
        body,
        signal: AbortSignal.timeout(12000)
      });
      const text = await dec.text();
      const urls = dec.ok ? safeBatch(text) : {};
      notes.push(dec.status + (text.includes("garturlres") ? ":yes" : ":no"));
      if (Object.keys(urls).length) return { urls, signed: ready.length, batch: notes.join(",") };
    } catch (e) { notes.push("err"); }
  }
  return { urls: {}, signed: ready.length, batch: notes.join(",") || "none" };
}
async function searchGoogle(q) {
  const found = [];
  const why = { rss: 0, items: 0, signed: 0, decoded: 0, kept: 0 };
  const add = (title, url) => { const safe = safeHttpUrl(url); if (safe && !found.some(x => x.url === safe)) found.push({ title, url: safe, via: "google" }); };
  try {
    const jar = {};
    const rssUrl = "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=en-IN&gl=IN&ceid=IN:en";
    const r = await fetch(rssUrl, { redirect: "follow", signal: AbortSignal.timeout(10000), headers: { ...NAV, accept: "application/rss+xml, application/xml, text/xml, */*" } });
    why.rss = r.status;
    if (!r.ok) { const out = found.slice(0, 3); out.why = why; return out; }
    takeCookies(r, jar);
    const xml = await r.text();
    const items = [];
    const re = /<item>([\s\S]*?)<\/item>/gi;
    let m;
    while ((m = re.exec(xml)) && items.length < 5) {
      const block = m[1];
      let title = (block.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
      title = decodeBasic(title.replace(/<!\[CDATA\[|\]\]>/g, "")).replace(/\s+/g, " ").trim();
      const link = ((block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      const source = ((block.match(/<source[^>]+url="([^"]+)"/i) || [])[1] || "").trim();
      const id = googleArticleId(link);
      if (title.length < 12 || !id) continue;
      items.push({ title: title.slice(0, 160), id, source });
    }
    why.items = items.length;
    const decoded = await decodeGoogleNews(items.map(x => x.id), jar);
    const urls = decoded.urls || {};
    why.signed = decoded.signed || 0;
    why.decoded = Object.keys(urls).length;
    why.batch = decoded.batch || "";
    const picked = [];
    await Promise.all(items.map(async (item, i) => {
      const pub = urls[String(i)];
      if (!pub) return;
      const text = readableText(await readHtml(pub));
      if (text.length > 80) picked.push({ title: item.title, url: pub, via: "google", n: i });
    }));
    picked.sort((a, b) => a.n - b.n);
    for (const row of picked) add(row.title, row.url);
    if (!found.length) {
      for (const item of items) {
        if (found.length >= 3) break;
        let origin = "";
        try { origin = new URL(item.source).origin; } catch (e) { continue; }
        const q = item.title.split(" - ")[0].slice(0, 90);
        const page = await openReadable(origin + "/?s=" + encodeURIComponent(q));
        if (page.text.length > 80 && titleHit(page.text, q)) add(item.title, page.url);
      }
      why.fallback = found.length;
    }
    why.kept = found.length;
  } catch (e) { why.error = "failed"; }
  const out = found.slice(0, 3);
  out.why = why;
  return out;
}
async function searchWeb(q) {
  const found = [];
  const add = (title, url) => { const safe = safeHttpUrl(url); if (safe && !found.some(x => x.url === safe)) found.push({ title, url: safe }); };
  await searchOrders(q, found, add);
  const hints = [
    [/birth|death|জন্ম|মৃত্যু/i, [
      ["Janma-Mrityu Tathya", "https://janma-mrityutathya.wb.gov.in/"],
      ["Civil Registration", "https://crsorgi.gov.in/"]
    ]],
    [/(^|[^a-z])bsk([^a-z]|$)|sahayata|সহায়তা/i, [["Bangla Sahayata Kendra", "https://bsk.wb.gov.in/about-bsk.html"]]],
    [/(^|[^a-z])ration([^a-z]|$)|khadya|খাদ্য/i, [["Food and Supplies", "https://food.wb.gov.in/"]]],
    [/licen[cs]e|sarathi|driving/i, [["Sarathi", "https://sarathi.parivahan.gov.in/"]]],
    [/land|mutation|khatian|খতিয়ান|banglarbhumi/i, [["Banglarbhumi", "https://banglarbhumi.gov.in/"]]]
  ];
  if (found.length < 6) for (const [re, rows] of hints) if (re.test(q)) for (const [title, url] of rows) add(title, url);
  if (found.length < 3) {
    try {
      const u = "https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=2&format=json&srsearch=" + encodeURIComponent(q);
      const r = await fetch(u, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "BiswasAI/1.0" } });
      const data = await r.json();
      for (const row of ((data.query && data.query.search) || []).slice(0, 2)) {
        if (!row.title) continue;
        add(row.title, "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(row.title).replace(/ /g, "_")));
      }
    } catch (e) { /* ignore */ }
  }
  return found.slice(0, 8);
}
async function wiki(q) {
  try {
    const u = "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=" + encodeURIComponent(q) + "&gsrlimit=2&prop=extracts&exintro=1&explaintext=1&format=json";
    const r = await fetch(u, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "BiswasAI/1.0" } });
    const data = await r.json();
    const pages = data && data.query && data.query.pages ? Object.values(data.query.pages) : [];
    return pages.filter(p => p.extract && p.extract.length > 80).slice(0, 2).map(p => ({
      title: p.title,
      url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(p.title || "").replace(/ /g, "_")),
      text: String(p.extract).slice(0, 1800)
    }));
  } catch (e) { return []; }
}
async function research(q) {
  const hits = await searchWeb(q);
  const pages = [];
  for (const hit of hits) {
    let text = "";
    try { text = await readPage(hit.url); } catch (e) { text = ""; }
    pages.push({ title: hit.title || hit.url, url: hit.url, text: text || "" });
    if (pages.length >= 3) break;
  }
  if (pages.filter(p => p.text.length > 80).length < 2) {
    for (const p of await wiki(q)) if (!pages.some(x => x.url === p.url)) pages.push(p);
  }
  return pages.slice(0, 4);
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
      let body = {};
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")) || {}; } catch (e) { body = {}; }
      if (body.url) {
        try {
          const safe = safeHttpUrl(String(body.url));
          const html = safe ? await readHtml(safe) : "";
          const more = followLinks(html, safe || "https://example.com").map(u => ({ title: u.replace(/^https?:\/\//, "").slice(0, 90), url: u }));
          res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
          res.end(JSON.stringify({ title: String(body.title || safe || "").slice(0, 140), url: safe, text: readableText(html), more }));
        } catch (e) {
          res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
          res.end(JSON.stringify({ title: String(body.title || ""), url: "", text: "", more: [] }));
        }
        return;
      }
      const q = String(body.q || "").slice(0, 240).trim();
      if (body.list) {
        const hits = q ? await searchWeb(q) : [];
        const google = body.google && q ? await searchGoogle(q) : [];
        res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        res.end(JSON.stringify({ hits, google, googleWhy: google.why || "" }));
        return;
      }
      const pages = q ? await research(q) : [];
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify({ pages }));
      return;
    }
    if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain" }).end("ok v47"); return; }
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
