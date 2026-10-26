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
const pd = await import("./api/pendrive.js");
pd.useChat(chat);
// Non-secret AI Pendrive status for /healthz/pendrive (no keys, no bucket name).
const PD_STATUS = { storage: pd.storage ? (pd.storage.provider || "local") : "none", cors: pd.storage && pd.storage.provider ? "pending" : "n/a" };
const PORT = Number(process.env.PORT) || 3000;
const PAGE = path.join(DIR, "index.html");
// Internal build id: only in the X-Build header of /healthz (deploy check). Never shown in the UI.
const BUILD = "132";
// Cache-busting by content hash (no number a person would read as a version).
const ATTACH_TAG = crypto.createHash("sha256").update(fs.readFileSync(path.join(DIR, "attach.js"))).digest("hex").slice(0, 10);
// the Drafting Desk scripts: editors.js (frame, picker, save) and one module per editor; each tag is a content hash
const ED_FILES = ["editors.js", ...fs.readdirSync(DIR).filter(f => /^ed-[a-z]+\.js$/.test(f)).sort()];
const tagOf = f => crypto.createHash("sha256").update(fs.readFileSync(path.join(DIR, f))).digest("hex").slice(0, 10);
const PAGE_HTML = ED_FILES.reduce((html, f) => html.replace(new RegExp("/" + f.replace(".", "\\.") + "\\?h=[^\"]*"), "/" + f + "?h=" + tagOf(f)), fs.readFileSync(PAGE, "utf8").replace(/\/attach\.js\?h=[^"]*/, "/attach.js?h=" + ATTACH_TAG));
const FAVICON = fs.readFileSync(path.join(DIR, "favicon.svg"));
const MAX_BODY = 12 * 1024 * 1024;
// Security headers for the app page. The page has one inline <script>; it is allowed by its
// sha256 hash (computed at start), not by 'unsafe-inline'. Styles need 'unsafe-inline'
// (inline <style> blocks, style="" attributes and styles set from JS).
import crypto from "node:crypto";
const inlineHashes = (() => {
  try {
    const html = fs.readFileSync(PAGE, "utf8");
    return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${crypto.createHash("sha256").update(m[1], "utf8").digest("base64")}'`).join(" ");
  } catch (e) { return ""; }
})();
const PAGE_HEADERS = {
  "content-security-policy": [
    "default-src 'self'",
    `script-src 'self' ${inlineHashes} https://cdn.jsdelivr.net https://cdn.sheetjs.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    `connect-src 'self' https://cdn.jsdelivr.net https://cdn.sheetjs.com${[...new Set(pd.pool.map(b => b.st.origin).filter(Boolean))].map(o => " " + o).join("")}`,
    "worker-src 'self' blob:",
    "frame-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; "),
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY"
};
// share-link receiver page (own CSP: bucket origins for previews, never indexed, no referrer so the link id doesn't leak)
const share = await import("./api/share.js");
const SHARE_PAGE = fs.readFileSync(path.join(DIR, "share.html"));
const PD_ZIP_JS = (() => { // the ZIP writer + download sinks, cut from index.html so the share page reuses the same code
  const html = fs.readFileSync(PAGE, "utf8"); const a = html.indexOf("/* ---- store-only ZIP"), b = html.indexOf("// keys: \"f:<id>\"", a);
  return a > 0 && b > a ? html.slice(a, b) : "";
})();
const POOL_ORIGINS = [...new Set(pd.pool.map(b => b.st.origin).filter(Boolean))].join(" ");
const SHARE_HEADERS = {
  "content-security-policy": [
    "default-src 'self'", "script-src 'self' https://cdn.sheetjs.com", "style-src 'self' 'unsafe-inline'", `img-src 'self' data: blob: ${POOL_ORIGINS}`, `media-src 'self' blob: ${POOL_ORIGINS}`,
    `connect-src 'self' https://cdn.sheetjs.com ${POOL_ORIGINS}`, `frame-src 'self' blob: ${POOL_ORIGINS}`, "worker-src 'self' blob:", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
  ].join("; "),
  "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-frame-options": "DENY", "x-robots-tag": "noindex, nofollow"
};

import dns from "node:dns/promises";
import net from "node:net";
import { ensureCors, corsOrigins } from "./api/bucket-cors.js";
// Blocks private, loopback, link-local, CGNAT and metadata ranges after DNS lookup.
function privateIp(ip) {
  if (net.isIPv6(ip)) { const v = ip.toLowerCase(); if (v.startsWith("::ffff:")) return privateIp(v.slice(7)); return v === "::1" || v === "::" || /^f[cd]|^fe[89ab]/.test(v); }
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
async function publicHost(url) {
  try { const { hostname } = new URL(url); const rows = await dns.lookup(hostname.replace(/^\[|\]$/g, ""), { all: true }); return rows.length > 0 && rows.every(r => !privateIp(r.address)); } catch (e) { return false; }
}
// Follows up to 3 redirects by hand, re-checking every hop.
async function safeFetch(url, opts) {
  let u = safeHttpUrl(url);
  for (let hop = 0; u && hop < 4; hop++) {
    if (!(await publicHost(u))) return null;
    const r = await fetch(u, { ...opts, redirect: "manual" });
    if (r.status < 300 || r.status > 399) return r;
    u = safeHttpUrl(new URL(r.headers.get("location") || "", u).toString());
  }
  return null;
}
// Small per-IP limiter (in memory; resets on restart). Render's proxy puts the real
// client IP: the rightmost X-Forwarded-For entry (added by Render's proxy), not the spoofable first one; fall back to the socket address.
const rateHits = new Map();
function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",").map(x => x.trim()).filter(Boolean).pop() || ""; // rightmost hop = what Render's proxy saw; client-supplied entries sit to the left
  return xff || String(req.headers["x-real-ip"] || "").trim() || String(req.socket.remoteAddress || "unknown");
}
function limited(req, bucket, max, windowMs) {
  const key = bucket + ":" + clientIp(req);
  const now = Date.now();
  let row = rateHits.get(key);
  if (!row || now - row.t > windowMs) { row = { n: 0, t: now, w: windowMs }; rateHits.set(key, row); }
  row.n += 1;
  if (rateHits.size > 20000) rateHits.clear(); // hard memory cap
  return row.n > max;
}
// Drop expired windows every minute so memory stays small on the 512 MB instance.
setInterval(() => { const now = Date.now(); for (const [k, r] of rateHits) if (now - r.t > r.w) rateHits.delete(k); }, 60 * 1000).unref();
function tooMany(res) {
  res.writeHead(429, { "content-type": "application/json; charset=utf-8", "retry-after": "60", "cache-control": "no-store" });
  res.end(JSON.stringify({ error: "too_many_requests", retryAfter: 60, message: "Too many requests from this device. Please wait a minute and try again." }));
}
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
  const bits = [];
  const metaRes = [
    /property="og:description"\s+content="([^"]+)"/i,
    /content="([^"]+)"\s+property="og:description"/i,
    /name="description"\s+content="([^"]+)"/i,
    /"description"\s*:\s*"([^"\\]{40,400})"/i
  ];
  for (const re of metaRes) {
    const m = re.exec(raw);
    if (m) bits.push(decodeBasic(m[1]).replace(/\\n/g, " ").replace(/\s+/g, " ").trim());
  }
  const paras = [...raw.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(x => decodeBasic(x[1].replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter(t => t.length > 40)
    .slice(0, 14);
  const joined = bits.concat(paras).join("\n\n").slice(0, 4500);
  if (joined.length > 80 && !isWall(joined)) return joined;
  const plain = stripPage(raw);
  return plain.length > 80 && !isWall(plain) ? plain : "";
}
async function readPage(url) {
  const safe = safeHttpUrl(url);
  if (!safe) return "";
  const r = await safeFetch(safe, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (compatible; BiswasAI/1.0)" } });
  if (!r || !r.ok) return "";
  return stripPage(await r.text());
}
async function readHtml(url) {
  const safe = safeHttpUrl(url);
  if (!safe) return "";
  try {
    const r = await safeFetch(safe, { signal: AbortSignal.timeout(9000), headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36", "accept": "text/html" } });
    if (!r || !r.ok) return "";
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
    const r = await safeFetch(safe, { signal: AbortSignal.timeout(8000), headers: { "user-agent": CHROME, accept: "text/html" } });
    if (!r || !r.ok) return { url: "", text: "" };
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
    while ((m = re.exec(xml)) && items.length < 8) {
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
  const out = found.slice(0, 6);
  out.why = why;
  return out;
}
function skipSearchHost(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /(^|\.)bing\.com$|(^|\.)microsoft\.com$|(^|\.)duckduckgo\.com$|(^|\.)google\.[a-z.]+$|(^|\.)google\.co\.[a-z]+$/.test(host);
  } catch (e) { return true; }
}
function closeEnough(title, q) {
  const words = String(q || "").toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
  if (words.length < 2) return true;
  const hay = String(title || "").toLowerCase();
  const hit = words.filter(w => hay.includes(w) || (w.length > 5 && w.endsWith("ed") && hay.includes(w.slice(0, -2))));
  if (hit.some(w => w.length > 4)) return true;
  return hit.length >= 2;
}
function bingUrl(link) {
  const safe = safeHttpUrl(String(link || "").trim());
  if (!safe) return "";
  try {
    const u = new URL(safe);
    if (u.hostname.endsWith("bing.com")) {
      const inner = u.searchParams.get("url");
      return inner ? safeHttpUrl(inner) : "";
    }
    return safe;
  } catch (e) { return ""; }
}
async function searchNews(q, via, hostNeed) {
  const out = [];
  try {
    const r = await fetch("https://www.bing.com/news/search?q=" + encodeURIComponent(q) + "&format=RSS", {
      redirect: "follow", signal: AbortSignal.timeout(12000),
      headers: { ...NAV, accept: "application/rss+xml, application/xml, text/xml, */*" }
    });
    if (!r.ok) return out;
    const xml = await r.text();
    const re = /<item>([\s\S]*?)<\/item>/gi;
    let m;
    while ((m = re.exec(xml)) && out.length < 8) {
      const block = m[1];
      let title = (block.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
      title = decodeBasic(title.replace(/<!\[CDATA\[|\]\]>/g, "")).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      let link = decodeBasic(((block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim());
      const desc = decodeBasic(((block.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      const safe = bingUrl(link);
      if (!safe || skipSearchHost(safe) || title.length < 8) continue;
      const host = (() => { try { return new URL(safe).hostname.toLowerCase(); } catch (e) { return ""; } })();
      if (hostNeed && !host.includes(hostNeed)) continue;
      if (!hostNeed && (host.includes("msn.com") || host.endsWith("yahoo.com"))) continue;
      if (!closeEnough(title + " " + desc, q.replace(/^site:\S+\s+/, ""))) continue;
      if (!out.some(x => x.url === safe)) out.push({ title: title.slice(0, 160), url: safe, via, text: desc.slice(0, 500) });
    }
  } catch (e) { /* this engine can fail; the others still run */ }
  return out;
}
function searchBing(q) { return searchNews(q, "bing", ""); }
function searchMsn(q) { return searchNews("site:msn.com " + q, "msn", "msn.com"); }
function searchYahoo(q) { return searchNews("site:yahoo.com " + q, "yahoo", "yahoo.com"); }
async function searchWiki(q) {
  const out = [];
  try {
    const u = "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=" + encodeURIComponent(q) + "&gsrlimit=6&prop=extracts&exintro=1&explaintext=1&format=json&origin=*";
    const r = await fetch(u, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "BiswasAI/1.0", accept: "application/json" } });
    if (!r.ok) return out;
    const j = await r.json();
    const pages = ((j.query || {}).pages) || {};
    for (const p of Object.values(pages)) {
      if (out.length >= 6 || !p || !p.title) continue;
      const text = String(p.extract || "").replace(/\s+/g, " ").trim();
      if (!closeEnough(p.title + " " + text, q)) continue;
      const url = "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(p.title).replace(/ /g, "_"));
      out.push({ title: String(p.title).slice(0, 160), url, via: "wiki", text: text.slice(0, 700) });
    }
  } catch (e) { /* Wikipedia can be skipped */ }
  return out;
}
async function searchDuck(q) {
  const out = [];
  try {
    const r = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q), {
      redirect: "follow", signal: AbortSignal.timeout(12000),
      headers: { ...NAV, accept: "text/html" }
    });
    if (!r.ok) return out;
    const html = await r.text();
    const re = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && out.length < 8) {
      let href = m[1];
      const uddg = href.match(/uddg=([^&"]+)/);
      if (uddg) { try { href = decodeURIComponent(uddg[1]); } catch (e) { continue; } }
      const safe = safeHttpUrl(href);
      if (!safe || skipSearchHost(safe)) continue;
      const title = decodeBasic(m[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
      if (!closeEnough(title, q)) continue;
      if (!out.some(x => x.url === safe)) out.push({ title: (title || safe).slice(0, 160), url: safe, via: "duck" });
    }
  } catch (e) { /* leave Bing's results */ }
  return out;
}
async function searchParallel(q) {
  const out = [];
  const endpoint = "https://search.parallel.ai/mcp";
  const base = { "content-type": "application/json", accept: "application/json, text/event-stream", "user-agent": CHROME };
  const call = async (payload, session) => {
    const headers = { ...base };
    if (session) headers["mcp-session-id"] = session;
    const r = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(18000) });
    return { ok: r.ok, sid: r.headers.get("mcp-session-id") || session || "", text: await r.text() };
  };
  try {
    const init = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "biswas-ai", version: "1.0" } } });
    if (!init.ok || !init.sid) return out;
    await call({ jsonrpc: "2.0", method: "notifications/initialized" }, init.sid);
    const asked = await call({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "web_search", arguments: { search_queries: [String(q).slice(0, 180)], objective: "Current public pages for: " + String(q).slice(0, 180) } } }, init.sid);
    const msg = JSON.parse(asked.text);
    const chunk = (((msg.result || {}).content || [])[0] || {}).text || "";
    const data = JSON.parse(chunk);
    for (const row of data.results || []) {
      if (out.length >= 8) break;
      const url = safeHttpUrl(row && row.url);
      if (!url) continue;
      const title = String((row && row.title) || url).replace(/\s+/g, " ").trim().slice(0, 160);
      const text = ((row && row.excerpts) || []).map(x => String(x || "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" ").slice(0, 900);
      if (!out.some(x => x.url === url)) out.push({ title, url, via: "parallel", text });
    }
  } catch (e) { /* Parallel is free and keyless, but it can be busy */ }
  return out;
}
async function searchInstant(q) {
  try {
    const r = await fetch("https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=" + encodeURIComponent(q), {
      redirect: "follow", signal: AbortSignal.timeout(8000), headers: { ...NAV, accept: "application/json" }
    });
    if (!r.ok) return [];
    const j = await r.json();
    const url = safeHttpUrl(j.AbstractURL);
    if (!url || !j.AbstractText) return [];
    return [{ title: String(j.Heading || j.AbstractSource || url).slice(0, 160), url, via: "duck", text: String(j.AbstractText).slice(0, 900) }];
  } catch (e) { return []; }
}
async function searchTavily(q) {
  const key = (process.env.TAVILY_API_KEY || "").trim();
  if (!key) return [];
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { "authorization": "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ query: String(q).slice(0, 200), max_results: 10, include_answer: false })
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.results || []).slice(0, 10).map(row => ({
      title: String(row.title || row.url || "").slice(0, 160),
      url: safeHttpUrl(row.url),
      via: "tavily",
      text: String(row.content || "").slice(0, 1400)
    })).filter(x => x.url);
  } catch (e) { return []; }
}
async function searchExa(q) {
  const key = (process.env.EXA_API_KEY || "").trim();
  if (!key) return [];
  try {
    const r = await fetch("https://api.exa.ai/search", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { "x-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ query: String(q).slice(0, 200), numResults: 10, contents: { text: { maxCharacters: 1400 } } })
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.results || []).slice(0, 10).map(row => ({
      title: String(row.title || row.url || "").slice(0, 160),
      url: safeHttpUrl(row.url),
      via: "exa",
      text: String((row.text && row.text.text) || row.text || row.snippet || "").slice(0, 1400)
    })).filter(x => x.url);
  } catch (e) { return []; }
}
async function searchFirecrawl(q) {
  const key = (process.env.FIRECRAWL_API_KEY || "").trim();
  if (!key) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST", signal: AbortSignal.timeout(12000),
      headers: { "authorization": "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ query: String(q).slice(0, 200), limit: 10 })
    });
    if (!r.ok) return [];
    const j = await r.json();
    const rows = (j.data && j.data.web) || j.data || [];
    return rows.slice(0, 10).map(row => ({
      title: String(row.title || row.url || "").slice(0, 160),
      url: safeHttpUrl(row.url),
      via: "firecrawl",
      text: String(row.markdown || row.description || row.snippet || "").slice(0, 1400)
    })).filter(x => x.url);
  } catch (e) { return []; }
}
async function searchSerper(q) {
  const key = (process.env.SERPER_API_KEY || "").trim();
  if (!key) return [];
  try {
    const r = await fetch("https://google.serper.dev/search", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { "x-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ q: String(q).slice(0, 200), num: 10 })
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.organic || []).slice(0, 10).map(row => ({
      title: String(row.title || row.link || "").slice(0, 160),
      url: safeHttpUrl(row.link),
      via: "serper",
      text: String(row.snippet || "").slice(0, 1400)
    })).filter(x => x.url);
  } catch (e) { return []; }
}
async function searchParallelKey(q) {
  const key = (process.env.PARALLEL_API_KEY || "").trim();
  if (!key) return [];
  try {
    const r = await fetch("https://api.parallel.ai/v1/search", {
      method: "POST", signal: AbortSignal.timeout(14000),
      headers: { "x-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ objective: "Current public pages for: " + String(q).slice(0, 180), search_queries: [String(q).slice(0, 180)] })
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.results || []).slice(0, 10).map(row => ({
      title: String(row.title || row.url || "").slice(0, 160),
      url: safeHttpUrl(row.url),
      via: "parallel-key",
      text: ((row.excerpts || []).map(x => String(x || "")).join(" ")).slice(0, 1400)
    })).filter(x => x.url);
  } catch (e) { return []; }
}
async function searchKeiro(q) {
  const key = (process.env.KEIRO_API_KEY || "").trim();
  if (!key) return [];
  try {
    const r = await fetch("https://api.keirolabs.cloud/api/v2/search/fast", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { "authorization": "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ query: String(q).slice(0, 200), maxResults: 10 })
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.results || []).slice(0, 10).map(row => ({
      title: String(row.title || row.url || "").slice(0, 160),
      url: safeHttpUrl(row.url),
      via: "keiro",
      text: String(row.snippet || row.description || "").slice(0, 1400)
    })).filter(x => x.url);
  } catch (e) { return []; }
}
function forWestBengal(q) {
  const s = String(q || "").replace(/\s+/g, " ").trim();
  if (/bangladesh|বাংলাদেশ/i.test(s)) return s.slice(0, 220);
  const place = /west bengal|পশ্চিমবঙ্গ/i.test(s) ? "" : " West Bengal India";
  return (s + place).slice(0, 220);
}
function dropBangladesh(row) {
  const url = String(row && row.url || "");
  const blob = url + " " + String(row && row.title || "") + " " + String(row && row.text || "");
  if (/\.bd(\/|$|:)/i.test(url)) return true;
  if (/bangladesh|বাংলাদেশ|fireservice\.gov\.bd|qanun\.com/i.test(blob) && !/west bengal|পশ্চিমবঙ্গ/i.test(blob)) return true;
  return false;
}
async function searchMore(q, opts) {
  const cap = opts && opts.wide ? 48 : 24;
  const [par, parKey, tavily, exa, fire, serper, keiro, bing, msn, yahoo, duck, instant, wiki] = await Promise.all([
    searchParallel(q), searchParallelKey(q), searchTavily(q), searchExa(q), searchFirecrawl(q), searchSerper(q), searchKeiro(q),
    searchBing(q), searchMsn(q), searchYahoo(q), searchDuck(q), searchInstant(q), searchWiki(q)
  ]);
  const out = [];
  const push = row => {
    if (!row || !row.url || out.length >= cap || out.some(x => x.url === row.url)) return;
    if (opts && opts.wb && dropBangladesh(row)) return;
    if (!(opts && opts.wide)) {
      const words = String(q).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 4);
      const text = String(row.text || "");
      if (words.length >= 2 && text.length > 40) {
        const hay = (String(row.title || "") + " " + text).toLowerCase();
        if (words.filter(w => hay.includes(w)).length < 2) return;
      }
    }
    out.push(row);
  };
  const buckets = [tavily, exa, serper, fire, parKey, keiro, bing, par, msn, yahoo, wiki, duck, instant];
  let n = 0;
  while (out.length < cap) {
    let added = false;
    for (const bucket of buckets) {
      const row = bucket[n];
      if (!row) continue;
      push(row);
      added = true;
      if (out.length >= cap) break;
    }
    if (!added) break;
    n++;
  }
  instant.forEach(push);
  return out;
}
function officeTopic(s) {
  return /\b(dcrb|pension|gratuity|heir|annapurna|lakshmir|lakshmi|bhandar|vandar|ration|khadya|banglarbhumi|khatian|mutation|sarathi|prakalpa|birth|death|land)\b|জন্ম|মৃত্যু|প্রকল্প|ভাতা|পেনশন|গ্র্যাচুইটি/i.test(String(s || ""));
}
async function searchWeb(q) {
  const found = [];
  const add = (title, url) => { const safe = safeHttpUrl(url); if (safe && !found.some(x => x.url === safe)) found.push({ title, url: safe }); };
  if (!officeTopic(q)) {
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
    return found.slice(0, 4);
  }
  await searchOrders(q, found, add);
  const hints = [
    [/\bpension\b|\bdcrb\b|\bgratuity\b|death-cum-retirement|legal heir/i, [
      ["West Bengal DCRB Rules, 1971", "https://wbxpress.com/west-bengal-service-death-cum-retirement-benefit-rules-1971/"],
      ["Family for death gratuity", "https://wbxpress.com/definition-family-death-gratuity/"]
    ]],
    [/\bbirth\b|\bdeath\b|জন্ম|মৃত্যু/i, [
      ["Janma-Mrityu Tathya", "https://janma-mrityutathya.wb.gov.in/"],
      ["Civil Registration", "https://crsorgi.gov.in/"]
    ]],
    [/\bbsk\b|sahayata|সহায়তা/i, [["Bangla Sahayata Kendra", "https://bsk.wb.gov.in/about-bsk.html"]]],
    [/\bration\b|khadya|খাদ্য/i, [["Food and Supplies", "https://food.wb.gov.in/"]]],
    [/\blicen[cs]e\b|\bsarathi\b|\bdriving\b/i, [["Sarathi", "https://sarathi.parivahan.gov.in/"]]],
    [/\bland\b|\bmutation\b|khatian|খতিয়ান|banglarbhumi/i, [["Banglarbhumi", "https://banglarbhumi.gov.in/"]]]
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
async function research(q, opts) {
  const query = opts && opts.wb ? forWestBengal(q) : q;
  const hits = officeTopic(query) ? await searchWeb(query) : [];
  const more = await searchMore(query, opts);
  const pages = [];
  const seen = new Set();
  const add = (hit) => {
    if (!hit || !hit.url || seen.has(hit.url) || pages.length >= 6) return;
    if (opts && opts.wb && dropBangladesh(hit)) return;
    seen.add(hit.url);
    pages.push({ title: hit.title || hit.url, url: hit.url, text: hit.text || "", via: hit.via || "" });
  };
  more.slice(0, 4).forEach(add);
  hits.slice(0, 2).forEach(add);
  for (const p of pages) {
    if (String(p.text || "").length > 80) continue;
    try { p.text = await readPage(p.url); } catch (e) { p.text = ""; }
  }
  if (pages.filter(p => String(p.text || "").length > 80).length < 2) {
    for (const w of await wiki(query)) if (!seen.has(w.url) && !(opts && opts.wb && dropBangladesh(w))) { seen.add(w.url); pages.push(w); }
  }
  return pages.slice(0, 6);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://local");
  try {
    if (url.pathname === "/api/chat") {
      if (url.searchParams.get("test") && (!process.env.ADMIN_TOKEN || req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN)) { res.writeHead(403, { "content-type": "application/json" }).end(JSON.stringify({ error: "forbidden" })); return; }
      if (req.method === "POST" && limited(req, "chat", 30, 60 * 1000)) { tooMany(res); return; }
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
    if (url.pathname === "/api/pd/blob" && pd.storage && pd.storage.serve) { await pd.storage.serve(req, res, url); return; } // local dev storage only
    // share links. /s/<id> is the receiver page; /api/s/<op> its API (no login); /api/pd/share/* the owner's ops.
    if (/^\/s\/[a-f0-9]{32}\/?$/.test(url.pathname)) { res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...SHARE_HEADERS }).end(SHARE_PAGE); return; }
    if (url.pathname === "/share.js" || url.pathname === "/pd-zip.js") {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache", "x-content-type-options": "nosniff" }).end(url.pathname === "/share.js" ? fs.readFileSync(path.join(DIR, "share.js")) : PD_ZIP_JS); return;
    }
    if (url.pathname.startsWith("/api/s/") || url.pathname.startsWith("/api/pd/share/")) {
      const sendJson = (status, obj) => { if (!res.headersSent) res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-robots-tag": "noindex" }).end(JSON.stringify(obj)); };
      if (req.method !== "POST") { sendJson(405, { error: "method" }); return; }
      const origin = req.headers.origin;
      if (origin) { let ok = false; try { ok = new URL(origin).host === req.headers.host; } catch (e) { ok = false; } if (!ok) { sendJson(403, { error: "forbidden" }); return; } }
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 1024 * 1024) { sendJson(413, { error: "too_large" }); return; } chunks.push(c); }
      let body = {}; try { body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") || {}; } catch (e) { sendJson(400, { error: "bad_json" }); return; }
      try {
        if (url.pathname.startsWith("/api/pd/")) await share.owner(req, url.pathname.slice(8), body, sendJson);
        else await share.receiver(req, res, url.pathname.slice(7), body, sendJson);
      } catch (e) {
        if (e instanceof pd.HttpError) { if (!res.headersSent) sendJson(e.status, { error: e.code, ...(e.extra || {}) }); else res.end(); }
        else { console.error("share:", e.message); if (!res.headersSent) sendJson(500, { error: "server" }); else res.end(); }
      }
      return;
    }
    if (url.pathname.startsWith("/api/pd/")) {
      const sendJson = (status, obj) => { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }).end(JSON.stringify(obj)); };
      if (req.method !== "POST") { sendJson(405, { error: "method" }); return; }
      const origin = req.headers.origin;
      if (origin) { let ok = false; try { ok = new URL(origin).host === req.headers.host; } catch (e) { ok = false; } if (!ok) { sendJson(403, { error: "forbidden" }); return; } }
      const op = url.pathname.slice(8);
      if ((op === "open" || op === "create" || op === "pin") && limited(req, "pd-open", 10, 60 * 1000)) { tooMany(res); return; }
      if (op === "ai" && limited(req, "pd-ai", 10, 60 * 1000)) { tooMany(res); return; }
      if (limited(req, "pd", 1800, 60 * 1000)) /* folder imports: ~3 calls per small file */ { tooMany(res); return; }
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 8 * 1024 * 1024) { sendJson(413, { error: "too_large" }); return; } chunks.push(c); }
      let body = {};
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") || {}; } catch (e) { sendJson(400, { error: "bad_json" }); return; }
      try { await pd.handle(req, res, url, body, sendJson); }
      catch (e) {
        if (e instanceof pd.HttpError) { if (!res.headersSent) sendJson(e.status, { error: e.code, ...(e.extra || {}) }); else res.end(); }
        else { console.error("pendrive:", e.message); if (!res.headersSent) sendJson(500, { error: "server" }); else res.end(); }
      }
      return;
    }
    // Only the app page is served; nothing else in this folder (such as .env) is reachable.
    if (url.pathname === "/pd-text-worker.js") { // reads AI text off the main thread
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache", "x-content-type-options": "nosniff" });
      fs.createReadStream(path.join(DIR, "pd-text-worker.js")).pipe(res);
      return;
    }
    if (url.pathname === "/pd-dl-sw.js") { // service worker that streams a folder ZIP to the browser's downloads
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache", "x-content-type-options": "nosniff" });
      fs.createReadStream(path.join(DIR, "pd-dl-sw.js")).pipe(res);
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...PAGE_HEADERS });
      res.end(PAGE_HTML);
      return;
    }
    if (url.pathname === "/api/research" && req.method === "POST") {
      if (limited(req, "research", 20, 60 * 1000)) { tooMany(res); return; }
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
      const rawQ = String(body.q || "").slice(0, 240).trim();
      const wb = !!body.wb && !/bangladesh|বাংলাদেশ/i.test(rawQ);
      const q = wb ? forWestBengal(rawQ) : rawQ;
      if (body.list) {
        const hits = q && officeTopic(q) ? await searchWeb(q) : [];
        const google = body.google && q ? await searchGoogle(q) : [];
        const more = q ? await searchMore(q, { wb, wide: true }) : [];
        const keep = row => row && !(wb && dropBangladesh(row));
        res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        res.end(JSON.stringify({ hits: hits.filter(keep), google: (Array.isArray(google) ? google : []).filter(keep), more: more.filter(keep), googleWhy: google.why || "" }));
        return;
      }
      if (body.fast) {
        const links = Array.isArray(body.links) ? body.links.slice(0, 2) : [];
        const pages = (await Promise.all(links.map(async raw => {
          const safe = safeHttpUrl(String(raw || ""));
          if (!safe) return null;
          if (wb && dropBangladesh({ url: safe, title: "", text: "" })) return null;
          let text = "";
          try { text = await readPage(safe); } catch (e) { text = ""; }
          return { title: safe.replace(/^https?:\/\//, "").slice(0, 90), url: safe, text: String(text || "").slice(0, 900), via: "official" };
        }))).filter(Boolean);
        res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        res.end(JSON.stringify({ pages }));
        return;
      }
      let pages = q ? await research(rawQ, { wb }) : [];
      if (body.google && q) {
        try {
          const g = await searchGoogle(q);
          for (const hit of (Array.isArray(g) ? g : []).slice(0, 2)) {
            if (!hit || !hit.url || pages.some(p => p.url === hit.url) || (wb && dropBangladesh(hit))) continue;
            let text = "";
            try { text = await readPage(hit.url); } catch (e) { text = ""; }
            pages.push({ title: hit.title || hit.url, url: hit.url, text: String(text || "").slice(0, 1800), via: "google" });
          }
        } catch (e) { /* the pages already opened still go back */ }
      }
      if (body.google && q) {
        try {
          for (const hit of (await searchMore(q)).slice(0, 2)) {
            if (!hit || !hit.url || pages.some(p => p.url === hit.url) || (wb && dropBangladesh(hit))) continue;
            let text = "";
            try { text = await readPage(hit.url); } catch (e) { text = ""; }
            pages.push({ title: hit.title || hit.url, url: hit.url, text: String(text || "").slice(0, 1800), via: hit.via || "web" });
          }
        } catch (e) { /* keep what is already open */ }
      }
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify({ pages: pages.slice(0, 8) }));
      return;
    }
    if (url.pathname === "/healthz/pendrive") {
      // Non-secret status: is storage configured, which provider, and did the boot-time CORS check pass.
      // one row per storage backend (name, cors, used, cap, healthy); never keys, endpoints' secrets or bucket names.
      const backends = await pd.poolStatus();
      const cap = backends.reduce((a, b) => a + b.cap, 0), used = backends.reduce((a, b) => a + b.used, 0);
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify({ ...PD_STATUS, backends, used, cap, free: Math.max(0, cap - used) })); return;
    }
    if (ED_FILES.includes(url.pathname.slice(1))) { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" }).end(fs.readFileSync(path.join(DIR, url.pathname.slice(1)))); return; }
    if (url.pathname === "/attach.js") { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" }).end(fs.readFileSync(path.join(DIR, "attach.js"))); return; }
    if (url.pathname === "/fonts/ba-pdf.ttf") { res.writeHead(200, { "content-type": "font/ttf", "cache-control": "public, max-age=604800" }).end(fs.readFileSync(path.join(DIR, "fonts", "ba-pdf.ttf"))); return; }
    if (url.pathname === "/healthz") { res.writeHead(200, { "content-type": "text/plain", "cache-control": "no-store", "x-build": BUILD }).end("ok"); return; }
    if (url.pathname === "/favicon.svg" || url.pathname === "/favicon.ico") {
      // One SVG mark for both paths; browsers accept SVG from /favicon.ico when the type says so.
      res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" }).end(FAVICON); return;
    }
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
  // Names only, never values.
  const search = [["tavily", "TAVILY_API_KEY"], ["exa", "EXA_API_KEY"], ["serper", "SERPER_API_KEY"], ["firecrawl", "FIRECRAWL_API_KEY"], ["parallel", "PARALLEL_API_KEY"], ["keiro", "KEIRO_API_KEY"]]
    .filter(([, k]) => (process.env[k] || "").trim()).map(([n]) => n);
  // Apply the bucket CORS rule on every backend in the background; one failing backend never blocks the others or startup.
  for (const b of pd.pool) {
    if (!b.st.provider) continue;
    b.cors = "checking"; if (b.id === "1") PD_STATUS.cors = "checking";
    ensureCors(b.st, corsOrigins()).then(r => {
      b.cors = r.state; if (r.detail) b.corsDetail = String(r.detail).split(" ").slice(0, 3).join(" ").slice(0, 60); // op, HTTP status, S3 error code only
      if (b.id === "1") { PD_STATUS.cors = r.state; PD_STATUS.corsCheckedAt = new Date().toISOString(); }
      if (r.state === "already") console.log(`AI Pendrive [${b.name}]: bucket CORS already correct`);
      else if (r.state === "applied") console.log(`AI Pendrive [${b.name}]: bucket CORS applied`);
      else if (r.state === "compatible") console.log(`AI Pendrive [${b.name}]: bucket CORS set by the owner already allows this site`);
      else if (r.state === "native_rules") console.log(`AI Pendrive [${b.name}]: bucket CORS NOT applied: the B2 bucket has native CORS rules (set 'CORS Rules' to 'Do not share' in the B2 web UI, then restart, or run scripts/set-b2-cors.js --native)`);
      else console.log(`AI Pendrive [${b.name}]: bucket CORS check failed: ${r.detail || "unknown"}`);
    }).catch(() => { b.cors = "failed"; b.corsDetail = "exception"; console.log(`AI Pendrive [${b.name}]: bucket CORS check failed`); });
  }
  // Reconcile per-backend usage by listing each bucket a few times a day (B2 list = class C, cheap).
  { const gc = () => pd.gcTestPendrives({ minAgeMs: Number(process.env.PENDRIVE_TEST_GC_AGE_MS || 30 * 60 * 1000) }).then(r => { if (r.length) console.log("pendrive: emptied test pendrives", JSON.stringify(r)); }).catch(e => console.warn("pendrive: test gc", e.message));
    if (process.env.PENDRIVE_TEST_GC !== "0") { setTimeout(gc, Number(process.env.PENDRIVE_TEST_GC_DELAY_MS || 90 * 1000)).unref(); setInterval(gc, 3600 * 1000).unref(); } }
  if (pd.pool.some(b => b.st.sumPrefix)) { setTimeout(() => pd.reconcile().catch(() => {}), 60 * 1000).unref(); setInterval(() => pd.reconcile().catch(() => {}), 6 * 3600 * 1000).unref(); }
  console.log(pd.pool.length ? `AI Pendrive storage: ${pd.pool.map(b => `${b.name} (${b.st.origin || "local"}, cap ${(b.cap / 1024 ** 3).toFixed(1)} GiB)`).join(", ")}` : "AI Pendrive storage: not configured (set S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET)");
  console.log(`Search providers: ${search.length ? search.join(", ") : "keyless only"} (+ bing, duckduckgo, wikipedia, parallel-mcp)`);
});
