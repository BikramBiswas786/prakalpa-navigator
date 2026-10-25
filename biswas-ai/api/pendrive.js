// AI Pendrive: a shared folder that anyone with its name + PIN can open, stored in an S3-compatible bucket (B2/R2).
// No database: everything is JSON in the bucket.
//   names/<sha256(normalized name)>.json  -> { id }
//   pendrives/<id>/meta.json   name, scrypt PIN hash + salt, quota, used bytes, lockout
//   pendrives/<id>/index.json  files (by id, with their path) and empty folders
//   pendrives/<id>/f/<fileId>  file bytes (uploaded by the browser straight to the bucket)
//   pendrives/<id>/t/<fileId>.txt  text extracted in the browser
//   pendrives/<id>/bm25.json   keyword index over text chunks
// Renames and moves only change index.json; the stored bytes never move.
import crypto from "node:crypto";
import { makePool } from "./storage.js";
import * as rag from "./rag.js";

const env = process.env;
let SECRET = env.PENDRIVE_SECRET || "";
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("PENDRIVE_SECRET is not set: using a random one, so pendrive sessions end when the server restarts.");
}
// v103: a pool of S3-compatible backends. pool[0] is the primary: it holds all metadata (meta, index, text, bm25, stats);
// file bytes go to whichever backend had the most free room when the file was uploaded (f.b / pending.b, default "1").
export const pool = makePool(env, SECRET);
export const storage = pool.length ? pool[0].st : null;
const BAD_MS = 10 * 60 * 1000;
const bk = bid => pool.find(b => b.id === String(bid || "1")) || pool[0];
const QUOTA = Math.max(1, Number(env.PENDRIVE_QUOTA_BYTES) || 5 * 1024 ** 3);       // per pendrive
const MAX_FILE = Math.max(1, Number(env.PENDRIVE_MAX_FILE_BYTES) || 5 * 1024 ** 3);   // per file
// Safety cap across ALL pendrives, so we refuse uploads before hitting the storage plan's limit (B2 free tier: 10 GB).
const TOTAL_CAP = Math.max(1, Number(env.PENDRIVE_TOTAL_CAP_BYTES) || pool.reduce((a, b) => a + b.cap, 0) || 9 * 1024 ** 3);
const SINGLE = 16 * 1024 * 1024;           // v110: below this a file is one presigned PUT
const MIB = 1024 * 1024;
// v110: 16–64 MB parts: aim for ~10 s per part at 1/6 of the measured browser speed, and never more than 10,000 parts
export const partSizeFor = (size, bps) => { let ps = bps > 0 ? Math.round(bps / 6 * 10 / MIB) * MIB : 16 * MIB; ps = Math.min(64 * MIB, Math.max(16 * MIB, ps, Math.ceil(size / 10000 / MIB) * MIB)); return ps; };
const PART = 10 * 1024 * 1024;              // 10 MB parts; 5 GB = 512 parts (S3 allows 10,000)
if (Math.ceil(MAX_FILE / PART) > 10000) throw new Error("PENDRIVE_MAX_FILE_BYTES needs more than 10,000 parts of 10 MB");
const SESSION_MS = 12 * 3600 * 1000;
const LOCK_TRIES = 5, LOCK_MS = 15 * 60 * 1000;
const TEXT_MAX = 2 * 1024 * 1024;           // per-file extracted text kept for the AI
const JOB = { maxFiles: 40, mapChars: 12000, maxMapCalls: 10, askChars: 14000 };

/* ---------- helpers ---------- */
const hex = n => crypto.randomBytes(n).toString("hex");
const P = id => `pendrives/${id}`;
const normName = s => String(s || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
const nameKey = s => `names/${crypto.createHash("sha256").update(normName(s)).digest("hex")}.json`;
const scrypt = (pin, salt) => new Promise((res, rej) => crypto.scrypt(String(pin), Buffer.from(salt, "hex"), 32, { N: 16384, r: 8, p: 1 }, (e, k) => e ? rej(e) : res(k.toString("hex"))));
const b64u = b => Buffer.from(b).toString("base64url");
class HttpError extends Error { constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; } }
const fail = (s, c, x) => { throw new HttpError(s, c, x); };

export function cleanPath(raw, allowEmpty = false) {
  const parts = String(raw == null ? "" : raw).normalize("NFC").replace(/\\/g, "/").split("/").map(s => s.trim()).filter(Boolean);
  if (!parts.length && !allowEmpty) fail(400, "bad_path");
  if (parts.length > 30) fail(400, "bad_path");
  for (const s of parts) if (s === "." || s === ".." || s.length > 200 || /[\u0000-\u001f<>:"|?*]/.test(s)) fail(400, "bad_path");
  return parts.join("/");
}
const parentOf = p => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
const baseOf = p => p.slice(p.lastIndexOf("/") + 1);
const under = (p, folder) => !folder || p === folder || p.startsWith(folder + "/");

// One writer per pendrive at a time (single Render instance), so index updates never race.
const locks = new Map();
async function withLock(id, fn) {
  const prev = locks.get(id) || Promise.resolve();
  let release; const next = new Promise(r => (release = r));
  const chain = prev.then(() => next); locks.set(id, chain);
  await prev;
  try { return await fn(); } finally { release(); if (locks.get(id) === chain) locks.delete(id); }
}

/* ---------- sessions ---------- */
function issue(id) {
  const body = b64u(JSON.stringify({ p: id, exp: Date.now() + SESSION_MS }));
  return body + "." + crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
}
function session(req) {
  const tok = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [body, sig] = tok.split(".");
  if (!body || !sig) fail(401, "no_session");
  const want = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) fail(401, "bad_session");
  let s; try { s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch (e) { fail(401, "bad_session"); }
  if (!/^[a-f0-9]{24}$/.test(s.p) || !(s.exp > Date.now())) fail(401, "session_expired");
  return s.p;
}

/* ---------- meta + index ---------- */
// Small write-through cache for the JSON files (single Render instance): halves the storage round trips per call.
const cache = new Map(); const CACHE_MAX = process.env.PENDRIVE_CACHE === "0" ? 0 : 300; /* tests that edit storage directly set PENDRIVE_CACHE=0 */
async function cget(key) {
  if (cache.has(key)) { const v = cache.get(key); cache.delete(key); cache.set(key, v); return v == null ? null : structuredClone(v); }
  const v = await storage.getJson(key); cput(key, v); return v == null ? null : structuredClone(v);
}
function cput(key, v) { cache.delete(key); cache.set(key, v == null ? null : structuredClone(v)); while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value); }
async function cset(key, v) { await storage.putJson(key, v); cput(key, v); }
async function meta(id) { const m = await cget(`${P(id)}/meta.json`); if (!m) fail(404, "not_found"); return m; }
async function index(id) { return (await cget(`${P(id)}/index.json`)) || { files: {}, folders: [] }; }
const reservedOf = m => Object.values(m.pending || {}).reduce((a, b) => a + b.size, 0);
async function saveMeta(id, m) {
  await cset(`${P(id)}/meta.json`, m);
  // keep the cross-pendrive usage table in step (used + reserved per pendrive, and bytes per backend)
  const ix = await index(id); const ub = {};
  for (const f of Object.values(ix.files)) if (f.state === "ok") ub[f.b || "1"] = (ub[f.b || "1"] || 0) + f.size;
  for (const v of Object.values(m.pending || {})) ub[v.b || "1"] = (ub[v.b || "1"] || 0) + v.size;
  const u = { u: m.used || 0, r: reservedOf(m), ub };
  await withLock("stats", async () => {
    const st = (await cget("stats/usage.json")) || { by: {} };
    const cur = st.by[id] || { u: 0, r: 0 };
    if (cur.u === u.u && cur.r === u.r && JSON.stringify(cur.ub || {}) === JSON.stringify(ub)) return;
    st.by[id] = u; st.t = Date.now(); await cset("stats/usage.json", st);
  });
}
// Bytes used (files + reservations) per backend, from the usage table; older rows without "ub" count on the primary.
// A periodic bucket listing (reconcile) can only raise the number (orphaned parts/objects still cost space).
async function backendUse() {
  const st = (await cget("stats/usage.json")) || { by: {} }; const out = {};
  for (const b of pool) out[b.id] = 0;
  for (const v of Object.values(st.by)) { if (v.ub) for (const [k, n] of Object.entries(v.ub)) out[k] = (out[k] || 0) + n; else out["1"] = (out["1"] || 0) + v.u + v.r; }
  for (const b of pool) if (b.listed && b.listed.total > out[b.id]) out[b.id] = b.listed.total;
  return out;
}
export async function reconcile() {
  for (const b of pool) {
    if (!b.st.sumPrefix) continue;
    try { b.listed = { ...(await b.st.sumPrefix("pendrives/", /^pendrives\/[a-f0-9]{24}\/f\/[a-f0-9]{24}$/)), t: Date.now() }; }
    catch (e) { b.listErr = String(e.message || e).slice(0, 80); }
  }
}
export async function poolStatus() {
  const use = await backendUse().catch(() => ({}));
  return pool.map(b => ({ name: b.name, cors: b.cors || (b.st.provider ? "pending" : "n/a"), used: use[b.id] || 0, cap: b.cap, healthy: !(b.badUntil > Date.now()), placement: placeable(b), ...(b.corsDetail ? { corsDetail: b.corsDetail } : {}), ...(b.listed ? { listedAt: new Date(b.listed.t).toISOString() } : {}) }));
}
const hostOf = b => { try { return new URL(b.st.origin).host.toLowerCase(); } catch (e) { return ""; } };
const placeable = b => !(b.badUntil > Date.now()) && !["failed", "native_rules", "checking"].includes(b.cors);
const netOrAuth = e => /fetch failed|timeout|abort|ECONN|ENOTFOUND|EAI_AGAIN|certificate| 40[13]\b| 5\d\d\b/i.test(String(e && (e.message + " " + (e.cause && e.cause.code || "")) || e));
async function totalUse(exceptId) {
  const st = (await cget("stats/usage.json")) || { by: {} };
  return Object.entries(st.by).reduce((a, [k, v]) => k === exceptId ? a : a + v.u + v.r, 0);
}
const saveIndex = (id, x) => cset(`${P(id)}/index.json`, x);
// Existing pendrives get the current default quota if it's bigger than the one stored at creation.
const quotaOf = m => Math.max(Number(m.quota) || 0, QUOTA);
const publicMeta = m => ({ name: m.name, quota: quotaOf(m), used: m.used, reserved: reservedOf(m), maxFile: MAX_FILE });
function checkPin(pin) { if (!/^\d{4,8}$/.test(String(pin || ""))) fail(400, "bad_pin"); }
function pathTaken(ix, p) { return Object.values(ix.files).some(f => f.state === "ok" && f.path === p) || ix.folders.includes(p); }
function addFolders(ix, p) { const parts = p.split("/"); for (let i = 1; i <= parts.length; i++) { const f = parts.slice(0, i).join("/"); if (!ix.folders.includes(f)) ix.folders.push(f); } }

/* ---------- keyword index (BM25) ---------- */
const STOP = new Set("the a an and or of to in on for is are was were be by with at as it this that from not no yes can will what which who how why do does did has have had i you we they he she এবং ও বা এই সেই যে কি কী না হয় হবে করে করা আছে ছিল জন্য থেকে দিয়ে নিয়ে তার তাদের আমি আমরা তুমি আপনি একটি একটা".split(" "));
export function tokens(text) {
  const out = [];
  for (const m of String(text).normalize("NFC").toLowerCase().matchAll(/[\p{L}\p{M}\p{N}]+/gu)) {
    let w = m[0];
    if (w.length < 2 || STOP.has(w)) continue;
    if (/^[a-z]+$/.test(w)) w = w.replace(/(ies)$/, "y").replace(/(es|s)$/, "") || w;   // light English stemming
    else if (/[\u0980-\u09ff]/.test(w)) w = w.replace(/(গুলো|গুলি|দের|কে|তে|ের|র|য়|ে)$/u, "") || w; // common Bengali suffixes
    if (w.length >= 2) out.push(w);
  }
  return out;
}
async function bm(id) { return (await cget(`${P(id)}/bm25.json`)) || { v: 2, df: {}, n: 0, len: 0, files: {} }; }
// v115: chunks with locations (page / heading path / sheet rows) live in c/<fid>.json; bm25 indexes those chunks.
const cKey = (id, fid) => `${P(id)}/c/${fid}.json`;
async function putChunks(id, fid, text) { const built = rag.build(text); await storage.putText(cKey(id, fid), JSON.stringify(built)); return built; }
async function loadChunks(id, f) {
  try { const t = await storage.getText(cKey(id, f.id)); if (t) return JSON.parse(t); } catch (e) { /* rebuild below */ }
  return rag.build((await storage.getText(`${P(id)}/t/${f.id}.txt`)) || "");
}
function bmAddChunks(x, fileId, chunks) {
  bmRemove(x, fileId);
  x.files[fileId] = chunks.map(c => {
    const tf = {}; const tk = tokens(rag.searchText(c));
    for (const t of tk) tf[t] = (tf[t] || 0) + 1;
    for (const t of Object.keys(tf)) x.df[t] = (x.df[t] || 0) + 1;
    x.n += 1; x.len += tk.length;
    return { tf, l: tk.length };
  });
}
// Lazy migration of pre-v115 pendrives: rebuild chunk files + bm25 once, the first time someone asks.
async function ragIndex(id, all, emit) {
  let x = await bm(id); if (x.v === 2) return x;
  return withLock("bm:" + id, async () => {
    x = await bm(id); if (x.v === 2) return x;
    const nx = { v: 2, df: {}, n: 0, len: 0, files: {} }; const files = all.filter(f => f.text);
    emit && emit({ type: "progress", msg: `index ${files.length}` });
    for (let i = 0; i < files.length; i += 8) await Promise.all(files.slice(i, i + 8).map(async f => {
      try { const built = await putChunks(id, f.id, (await storage.getText(`${P(id)}/t/${f.id}.txt`)) || ""); bmAddChunks(nx, f.id, built.chunks); } catch (e) { console.warn("pendrive: reindex", e.message); }
    }));
    await cset(`${P(id)}/bm25.json`, nx); return nx;
  });
}
function bmRemove(x, fileId) {
  const f = x.files[fileId]; if (!f) return;
  for (const c of f) { for (const t of Object.keys(c.tf)) { x.df[t] -= 1; if (x.df[t] <= 0) delete x.df[t]; } x.n -= 1; x.len -= c.l; }
  delete x.files[fileId];
}
export function bmSearch(x, q, allowed, k = 8) {
  const qt = [...new Set(tokens(q))]; const avg = x.len / Math.max(1, x.n); const hits = [];
  for (const [fid, chunks] of Object.entries(x.files)) {
    if (allowed && !allowed.has(fid)) continue;
    chunks.forEach((c, i) => {
      let s = 0;
      for (const t of qt) {
        const f = c.tf[t]; if (!f) continue;
        const idf = Math.log(1 + (x.n - x.df[t] + 0.5) / (x.df[t] + 0.5));
        s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * c.l / avg));
      }
      if (s > 0) hits.push({ fid, i, s });
    });
  }
  return hits.sort((a, b) => b.s - a.s).slice(0, k);
}

/* ---------- AI (reuses the free-provider chain in chat.js) ---------- */
let chatMod = null;
export function useChat(mod) { chatMod = mod; }
async function askAI(system, user, maxOut = 1600) {
  if (env.PENDRIVE_MOCK_AI === "1") return mockAI(system, user);
  const req = new Request("http://pendrive.local/api/chat", { method: "POST", headers: { "content-type": "application/json", host: "pendrive.local" }, body: JSON.stringify({ system, messages: [{ role: "user", content: user }], maxOut }) });
  const r = await chatMod.POST(req);
  if (!r.ok) { let e = ""; try { e = (await r.json()).error; } catch (x) { /* ignore */ } fail(502, e || "ai_failed"); }
  let text = ""; const dec = new TextDecoder();
  for await (const c of r.body) text += dec.decode(c, { stream: true });
  return text.replace(/\u0000[A-Z_]+$/, "").trim();
}
// Test-only stand-in (PENDRIVE_MOCK_AI=1): cites the sources it was given and echoes a write request.
function mockAI(system, user) {
  const files = [...new Set([...user.matchAll(/\[FILE: ([^\]]+)\]/g)].map(m => m[1]))];
  if (/^Rewrite this answer/.test(user)) return "Reshaped:\n\n| ফাইল | বিষয় |\n| --- | --- |\n| [x.txt] | পুনর্গঠিত |";
  if (/prose/i.test(user.split("QUESTION:").pop() || "")) return `MOCK prose answer from ${files.length} source(s).`;
  let out = `MOCK answer from ${files.length} source(s): ${files.join(", ")}`;
  if (/^Numbered file extracts/.test(user)) { const c = user.match(/COMPUTED: .*? = (-?[\d.]+) \(/); const ns = [...user.matchAll(/^\[(\d+)\] \[FILE:/gm)].map(m => `[${m[1]}]`); out = (c ? `MOCK computed ${c[1]} [1]. ` : "") + out + " " + ns.join(""); }
  if (/table|টেবিল/i.test(user.split("QUESTION:").pop() || "")) out += "\n\n## সারসংক্ষেপ\n\n| ফাইল | বিষয় |\n| --- | --- |\n" + files.map(f => `| ${f} | বাজেট ও বিল |`).join("\n") + "\n\nমোট ফাইল: " + files.length;
  if (/write|লিখ|report|নোট/i.test(user.split("QUESTION:").pop() || "")) out += '\n```pendrive-write\n{"path":"Reports/summary.md","format":"md","content":"# Summary\\n\\nFrom: ' + files.join(", ") + '"}\n```';
  return out;
}
const WRITE_FORMATS = new Set(["docx", "xlsx", "pdf", "md", "txt", "csv"]);
export function parseActions(text) {
  const actions = [];
  const body = String(text).replace(/```pendrive-write\s*([\s\S]*?)```/g, (_, j) => {
    try {
      const a = JSON.parse(j.trim());
      const fmt = String(a.format || "").toLowerCase();
      let p = cleanPath(a.path);
      if (WRITE_FORMATS.has(fmt) && typeof a.content === "string" && a.content.length <= 300000) {
        if (!p.toLowerCase().endsWith("." + fmt)) p += "." + fmt;
        actions.push({ type: "write", path: p, format: fmt, content: a.content });
      }
    } catch (e) { /* ignore a broken block */ }
    return "";
  });
  return { text: body.trim(), actions };
}
// v108: output format rules. A table request (any language) must produce a GitHub markdown table.
export const TABLE_RE = /\b(table|tables|tabular|tabulate|list|listing|compar\w*|matrix|spreadsheet|csv|excel|columns?|rows?)\b|টেবিল|সারণি|সারণী|তালিকা|তুলনা|ছক|কলাম|এক্সেল/i;
export const wantsTable = (q, format) => format === "table" || (format !== "letter" && TABLE_RE.test(String(q || "")));
export const hasMdTable = t => /^\s*\|.*\|\s*\n\s*\|?\s*:?-{2,}/m.test(String(t || ""));
export function fmtRule(q, format) {
  const r = [];
  if (wantsTable(q, format)) r.push("OUTPUT FORMAT (mandatory): the answer MUST contain a GitHub-style markdown table: a header row, then a separator row like | --- | --- |, then one row per item, every row starting and ending with |. Use short cell text, keep [file] citations in a 'File'/'ফাইল' column. Do not use HTML, tabs or code blocks for the table. A one-line intro before the table and short notes after it are fine.");
  if (format === "report") r.push("OUTPUT FORMAT: a structured report in markdown: a # title, ## sections (Summary, Details, Conclusion), bullet points, and a markdown table where data fits.");
  if (format === "letter") r.push("OUTPUT FORMAT: a formal office letter/notesheet: To, Subject, salutation, body paragraphs, closing and signature lines. No tables unless asked.");
  return r.length ? "\n\n" + r.join("\n") : "";
}
const SYS = lang => `You are Biswas AI working inside the user's AI Pendrive (a shared office folder). Answer ONLY from the file extracts given. Cite the file name in square brackets for every fact, like [Folder/file.pdf]. If the extracts do not contain the answer, say so. ${lang === "en" ? "Reply in English." : "Reply in colloquial West Bengal Bengali, in Bengali script."}
If the user asks you to write, save or create a file (notesheet, report, table, summary), add ONE block at the end exactly like:
\`\`\`pendrive-write
{"path":"Folder/Name.docx","format":"docx","content":"markdown text (for xlsx: a markdown table)"}
\`\`\`
format is one of docx, xlsx, pdf, md, txt, csv. Never claim you deleted or overwrote anything; the user confirms that in the app.`;

/* ---------- API ---------- */
export async function handle(req, res, url, body, send) {
  if (!storage) fail(503, "storage_not_configured");
  const op = url.pathname.slice("/api/pd/".length);

  if (op === "create") {
    const name = String(body.name || "").normalize("NFC").trim().replace(/\s+/g, " ");
    if (name.length < 3 || name.length > 60) fail(400, "bad_name");
    checkPin(body.pin);
    const nk = nameKey(name);
    return withLock("names", async () => {
      if (await storage.getJson(nk)) fail(409, "name_taken");
      const id = hex(12), salt = hex(16);
      await saveMeta(id, { id, name, salt, hash: await scrypt(body.pin, salt), quota: QUOTA, used: 0, fails: 0, lockUntil: 0, pending: {}, created: Date.now() });
      await saveIndex(id, { files: {}, folders: [] });
      await storage.putJson(nk, { id });
      return send(200, { token: issue(id), ...publicMeta(await meta(id)) });
    });
  }
  if (op === "open") {
    checkPin(body.pin);
    const ref = await storage.getJson(nameKey(body.name));
    if (!ref) { await scrypt(body.pin, "00".repeat(16)); fail(401, "wrong"); } // same cost either way
    return withLock(ref.id, async () => {
      const m = await meta(ref.id);
      if (m.lockUntil > Date.now()) fail(423, "locked", { retryAfter: Math.ceil((m.lockUntil - Date.now()) / 1000) });
      const h = await scrypt(body.pin, m.salt);
      if (!crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(m.hash, "hex"))) {
        m.fails = (m.fails || 0) + 1;
        if (m.fails >= LOCK_TRIES) { m.fails = 0; m.lockUntil = Date.now() + LOCK_MS; await saveMeta(ref.id, m); fail(423, "locked", { retryAfter: LOCK_MS / 1000 }); }
        await saveMeta(ref.id, m);
        fail(401, "wrong", { left: LOCK_TRIES - m.fails });
      }
      if (m.fails || m.lockUntil) { m.fails = 0; m.lockUntil = 0; await saveMeta(ref.id, m); }
      return send(200, { token: issue(ref.id), ...publicMeta(m) });
    });
  }

  const id = req.pdAs || session(req); // v113: share upload-request links act on the owner's pendrive with a fixed op set
  if (op === "list") {
    const [m, ix] = await Promise.all([meta(id), index(id)]);
    const files = Object.values(ix.files).filter(f => f.state === "ok").map(({ id, path, size, type, mtime, text, note }) => ({ id, path, size, type, mtime, text, ...(note ? { note } : {}) }));
    const pending = Object.entries(m.pending || {}).map(([fileId, v]) => ({ fileId, path: v.path, size: v.size, t: v.t }));
    return send(200, { ...publicMeta(m), files, folders: ix.folders.slice().sort(), pending });
  }
  if (op === "download") {
    const ix = await index(id); const f = ix.files[String(body.id)];
    if (!f || f.state !== "ok") fail(404, "not_found");
    return send(200, { url: await bk(f.b).st.presignGet(`${P(id)}/f/${f.id}`, body.inline ? "" : baseOf(f.path)) });
  }
  if (op === "download-urls") { // v106: short-lived GET links (no attachment header) so the browser can stream files into a ZIP
    const ix = await index(id); const want = Array.isArray(body.ids) ? body.ids.slice(0, 500).map(String) : [];
    const urls = {};
    for (const fid of want) { const f = ix.files[fid]; if (f && f.state === "ok") urls[fid] = await bk(f.b).st.presignGet(`${P(id)}/f/${f.id}`, ""); }
    return send(200, { urls });
  }
  if (op === "text-get") {
    const ix = await index(id); const f = ix.files[String(body.id)];
    if (!f || !f.text) fail(404, "not_found");
    return send(200, { text: ((await storage.getText(`${P(id)}/t/${f.id}.txt`)) || "").slice(0, 200000) });
  }

  const writeTexts = async (ix, list) => { // v110: text sidecars in parallel, one bm25 write
    let x = await bm(id); const ok = list.filter(t => ix.files[String(t.id)]);
    for (let i = 0; i < ok.length; i += 8) await Promise.all(ok.slice(i, i + 8).map(t => storage.putText(`${P(id)}/t/${String(t.id)}.txt`, String(t.text || "").slice(0, TEXT_MAX))));
    const built = {};
    for (let i = 0; i < ok.length; i += 8) await Promise.all(ok.slice(i, i + 8).map(async t => { built[String(t.id)] = await putChunks(id, String(t.id), String(t.text || "").slice(0, TEXT_MAX)); }));
    if (x.v !== 2) { x = await ragIndex(id, Object.values(ix.files).filter(f => f.state === "ok" && f.text && !built[f.id]), null); }
    for (const t of ok) { const f = ix.files[String(t.id)]; const text = String(t.text || "").slice(0, TEXT_MAX); const b = built[f.id];
      bmAddChunks(x, f.id, b.chunks); f.text = text.length > 0 && b.chunks.length > 0; f.note = String(t.note || (b.scanned ? "scanned" : "")).slice(0, 80); if (b.pages) f.pages = b.pages; }
    if (ok.length) await cset(`${P(id)}/bm25.json`, x);
    return ok.length;
  };
  // v110: placement + reservation shared by upload/init and upload/batch-init. Small files (< 16 MB) get one presigned PUT;
  // big ones get a multipart upload with 16–64 MB parts sized from the browser's measured speed.
  const planOne = async (m, ix, it, use, ctx) => {
    const p = cleanPath(it.path); const size = Math.floor(Number(it.size));
    if (!(size >= 0) || size > MAX_FILE) fail(413, "file_too_big", { max: MAX_FILE });
    const type = String(it.type || "application/octet-stream").slice(0, 100);
    const same = Object.values(ix.files).find(f => f.state === "ok" && f.path === p);
    if (ix.folders.includes(p)) fail(409, "exists");
    if (same && !it.overwrite) fail(409, "exists", { id: same.id });
    const reserved = Object.values(m.pending || {}).reduce((a, b) => a + b.size, 0);
    const freed = same ? same.size : 0;
    if (m.used - freed + reserved + size > quotaOf(m)) fail(413, "quota", { quota: quotaOf(m), used: m.used, reserved });
    if (ctx.total + m.used - freed + reserved + size > TOTAL_CAP) fail(507, "total_cap", { cap: TOTAL_CAP });
    const fileId = hex(12);
    // Placement: healthy backends that can hold the file. Most free room first, but when free room is within 20% of the best,
    // the backend with the lowest measured latency wins (v110). Browsers PUT straight to the bucket, so CORS must be in place.
    let cands = pool.filter(b => placeable(b) && b.cap - (use[b.id] || 0) - (ctx.add[b.id] || 0) >= size);
    const free = b => b.cap - (use[b.id] || 0) - (ctx.add[b.id] || 0);
    const best = Math.max(0, ...cands.map(free));
    cands.sort((x, y) => { const nx = free(x) >= best * 0.8, ny = free(y) >= best * 0.8; if (nx !== ny) return nx ? -1 : 1; if (nx && ny && (x.st.lat || 0) !== (y.st.lat || 0)) return (x.st.lat || 1e9) - (y.st.lat || 1e9); return free(y) - free(x); });
    if (ctx.avoid.size) { const rest = cands.filter(b => !ctx.avoid.has(hostOf(b))); if (rest.length) cands = rest; }
    if (ctx.force) { cands = pool.filter(b => b.name === ctx.force); if (!cands.length) fail(400, "no_backend"); }
    if (!cands.length) fail(507, "total_cap", { cap: TOTAL_CAP });
    const single = size < SINGLE && !it.multipart;
    const partSize = single ? Math.max(1, size) : partSizeFor(size, Number(it.bps) || Number(ctx.bps) || 0);
    let uploadId = "single", where = null, lastErr = null;
    for (const b of cands) {
      try { if (single) { if (b.st.alive && !(ctx.ok || (ctx.ok = new Set())).has(b.id)) { await b.st.alive(); ctx.ok.add(b.id); } } else uploadId = await b.st.createMultipart(`${P(id)}/f/${fileId}`, type); where = b; break; }
      catch (e) { lastErr = e; if (netOrAuth(e) && !ctx.force) { b.badUntil = Date.now() + BAD_MS; console.warn(`storage backend ${b.name} unhealthy for 10 min: ${String(e.message || e).slice(0, 80)}`); } else if (ctx.force) break; }
    }
    if (!where) throw lastErr || new Error("storage unavailable");
    ctx.add[where.id] = (ctx.add[where.id] || 0) + size;
    m.pending = m.pending || {};
    m.pending[fileId] = { size, t: Date.now(), uploadId, path: p, type, b: where.id, replaces: same && it.overwrite ? same.id : "", ...(single ? { single: true } : { partSize }),  };
    const nParts = single ? 1 : Math.max(1, Math.ceil(size / partSize)), urls = {};
    const key = `${P(id)}/f/${fileId}`;
    if (single) urls[1] = await where.st.presignPut(key);
    else for (let n = 1; n <= Math.min(nParts, ctx.urlsPer || 50); n++) urls[n] = await where.st.presignPart(key, uploadId, n);
    return { fileId, uploadId, partSize, parts: nParts, urls, single, ...(ctx.force ? { backend: where.name } : {}) };
  };
  const planCtx = async () => {
    const force = url && url.searchParams.get("backend");
    if (force) {
      const tok = String(req.headers["x-admin-token"] || "");
      if (!env.ADMIN_TOKEN || tok.length !== env.ADMIN_TOKEN.length || !crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(env.ADMIN_TOKEN))) fail(403, "forbidden");
    }
    return { force, avoid: new Set((Array.isArray(body.avoid) ? body.avoid : []).slice(0, 10).map(h => String(h).toLowerCase())), add: {}, total: await totalUse(id), bps: Number(body.bps) || 0 };
  };
  const dropStale = m => { for (const [k, v] of Object.entries(m.pending || {})) if (Date.now() - v.t > 24 * 3600 * 1000) { (v.single ? bk(v.b).st.del(`${P(id)}/f/${k}`) : bk(v.b).st.abortMultipart(`${P(id)}/f/${k}`, v.uploadId)).catch(() => {}); delete m.pending[k]; } };
  if (op === "upload/init") {
    return withLock(id, async () => {
      const [m, ix] = await Promise.all([meta(id), index(id)]);
      const ctx = await planCtx(); dropStale(m);
      const r = await planOne(m, ix, body, await backendUse(), ctx);
      await saveMeta(id, m);
      return send(200, r);
    });
  }
  if (op === "upload/batch-init") { // v110: reserve up to 100 files in one call (one meta write); errors are per file
    const items = (Array.isArray(body.files) ? body.files : []).slice(0, 100);
    return withLock(id, async () => {
      const [m, ix] = await Promise.all([meta(id), index(id)]);
      const ctx = await planCtx(); ctx.urlsPer = 12; dropStale(m);
      const use = await backendUse(); const out = [];
      for (const it of items) {
        try { out.push(await planOne(m, ix, it, use, ctx)); }
        catch (e) { if (!(e instanceof HttpError)) throw e; out.push({ error: e.code, ...(e.extra || {}) }); }
      }
      await saveMeta(id, m);
      return send(200, { files: out });
    });
  }
  if (op === "hosts") { // v110: storage origins the browser may upload to, so it can probe which ones it can reach
    return send(200, { hosts: [...new Set(pool.filter(placeable).map(b => b.st.origin).filter(Boolean))] });
  }
  if (op === "upload/status") { // is this upload (saved in the browser's IndexedDB) still resumable?
    const m = await meta(id); const pend = (m.pending || {})[String(body.fileId)];
    return send(200, { ok: !!(pend && pend.uploadId === body.uploadId && pend.size === Number(body.size)) });
  }
  if (op === "upload/parts") {
    const m = await meta(id); const pend = (m.pending || {})[String(body.fileId)];
    if (!pend || pend.uploadId !== body.uploadId) fail(404, "no_upload");
    const total = pend.single ? 1 : Math.max(1, Math.ceil(pend.size / (pend.partSize || PART)));
    const ns = (Array.isArray(body.parts) ? body.parts : []).map(Number).filter(n => n >= 1 && n <= total).slice(0, 100);
    const urls = {};
    for (const n of ns) urls[n] = pend.single ? await bk(pend.b).st.presignPut(`${P(id)}/f/${body.fileId}`) : await bk(pend.b).st.presignPart(`${P(id)}/f/${body.fileId}`, pend.uploadId, n);
    return send(200, { urls });
  }
  // v110: finish one upload: bytes check, index entry. Network work is done before (finishBytes) so a batch can run it in parallel.
  const finishBytes = async (m, it) => {
    const fid = String(it.fileId); const pend = (m.pending || {})[fid];
    if (!pend || pend.uploadId !== it.uploadId) return { fid, error: "no_upload" };
    const key = `${P(id)}/f/${fid}`; const fst = bk(pend.b).st;
    try {
      if (!pend.single) { const parts = (Array.isArray(it.parts) ? it.parts : []).map(p => ({ n: Number(p.n), etag: String(p.etag || "") })).filter(p => p.n >= 1 && p.etag); await fst.completeMultipart(key, pend.uploadId, parts); }
      const h = await fst.head(key);
      if (!h || h.size !== pend.size) { await fst.del(key).catch(() => {}); delete m.pending[fid]; return { fid, error: "size_mismatch" }; }
      return { fid, pend, h };
    } catch (e) { return { fid, error: String(e.message || e).slice(0, 80), retry: true }; }
  };
  const finishIndex = async (m, ix, r) => {
    const { fid, pend, h } = r; delete m.pending[fid];
    let p = pend.path;
    if (pend.replaces && ix.files[pend.replaces]) { m.used -= ix.files[pend.replaces].size; await dropFile(id, ix, pend.replaces); }
    else if (pathTaken(ix, p)) { const dot = p.lastIndexOf("."); const stem = dot > p.lastIndexOf("/") ? p.slice(0, dot) : p; const ext = dot > p.lastIndexOf("/") ? p.slice(dot) : ""; let k = 2; while (pathTaken(ix, `${stem} (${k})${ext}`)) k++; p = `${stem} (${k})${ext}`; }
    m.used += h.size;
    ix.files[fid] = { id: fid, path: p, size: h.size, type: pend.type, mtime: Date.now(), text: false, state: "ok", ...(pend.b && pend.b !== "1" ? { b: pend.b } : {}) };
    if (parentOf(p)) addFolders(ix, parentOf(p));
    return { id: fid, path: p };
  };
  if (op === "upload/complete") {
    return withLock(id, async () => {
      const [m, ix] = await Promise.all([meta(id), index(id)]);
      const r = await finishBytes(m, body);
      if (r.error === "no_upload") fail(404, "no_upload");
      if (r.error === "size_mismatch") { await saveMeta(id, m); fail(400, "size_mismatch"); }
      if (r.error) throw new Error(r.error);
      const done = await finishIndex(m, ix, r);
      await saveIndex(id, ix); await saveMeta(id, m);
      return send(200, { ...done, ...publicMeta(m) });
    });
  }
  if (op === "upload/batch-complete") { // v110: up to 100 finished uploads (+ their AI text) in one call: one index/meta/bm25 write
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 100);
    return withLock(id, async () => {
      const [m, ix] = await Promise.all([meta(id), index(id)]);
      const rs = []; for (let i = 0; i < items.length; i += 8) rs.push(...await Promise.all(items.slice(i, i + 8).map(it => finishBytes(m, it))));
      const out = []; const texts = [];
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i];
        if (r.error) { out.push({ fileId: r.fid, error: r.error, retry: !!r.retry }); continue; }
        const d = await finishIndex(m, ix, r); out.push({ fileId: r.fid, ...d });
        if (typeof items[i].text === "string") texts.push({ id: d.id, text: items[i].text, note: items[i].note });
      }
      if (texts.length) await writeTexts(ix, texts);
      await saveIndex(id, ix); await saveMeta(id, m);
      return send(200, { files: out, ...publicMeta(m) });
    });
  }
  if (op === "upload/abort") {
    return withLock(id, async () => {
      const m = await meta(id); const fid = String(body.fileId); const pend = (m.pending || {})[fid];
      if (pend) { try { if (pend.single) await bk(pend.b).st.del(`${P(id)}/f/${fid}`); else await bk(pend.b).st.abortMultipart(`${P(id)}/f/${fid}`, pend.uploadId); } catch (e) { /* ignore */ } delete m.pending[fid]; await saveMeta(id, m); }
      return send(200, { ok: true });
    });
  }
  if (op === "text") {
    return withLock(id, async () => {
      const ix = await index(id); if (!ix.files[String(body.id)]) fail(404, "not_found");
      await writeTexts(ix, [body]); await saveIndex(id, ix);
      return send(200, { ok: true });
    });
  }
  if (op === "text-batch") { // v110: AI text for many files in one call
    const list = (Array.isArray(body.items) ? body.items : []).slice(0, 100);
    return withLock(id, async () => { const ix = await index(id); const n = await writeTexts(ix, list); await saveIndex(id, ix); return send(200, { ok: true, n }); });
  }
  if (op === "mkdir") {
    const p = cleanPath(body.path);
    return withLock(id, async () => { const ix = await index(id); if (pathTaken(ix, p)) fail(409, "exists"); addFolders(ix, p); await saveIndex(id, ix); return send(200, { ok: true }); });
  }
  if (op === "rename") {
    const nn = cleanPath(body.name); if (nn.includes("/")) fail(400, "bad_name");
    return withLock(id, async () => {
      const ix = await index(id);
      if (body.id) {
        const f = ix.files[String(body.id)]; if (!f) fail(404, "not_found");
        const np = (parentOf(f.path) ? parentOf(f.path) + "/" : "") + nn;
        if (np !== f.path && pathTaken(ix, np)) fail(409, "exists");
        f.path = np; f.mtime = Date.now();
      } else {
        const old = cleanPath(body.folder); if (!ix.folders.includes(old)) fail(404, "not_found");
        const np = (parentOf(old) ? parentOf(old) + "/" : "") + nn;
        if (np !== old && pathTaken(ix, np)) fail(409, "exists");
        moveTree(ix, old, np);
      }
      await saveIndex(id, ix); return send(200, { ok: true });
    });
  }
  if (op === "move") {
    const to = cleanPath(body.to, true);
    return withLock(id, async () => {
      const ix = await index(id);
      if (to && !ix.folders.includes(to)) fail(404, "no_target");
      for (const fid of (body.ids || []).map(String)) {
        const f = ix.files[fid]; if (!f) continue;
        const np = (to ? to + "/" : "") + baseOf(f.path);
        if (np !== f.path && pathTaken(ix, np)) fail(409, "exists", { path: np });
        f.path = np;
      }
      for (const raw of body.folders || []) {
        const old = cleanPath(raw); if (!ix.folders.includes(old)) continue;
        if (under(to, old)) fail(400, "into_itself");
        const np = (to ? to + "/" : "") + baseOf(old);
        if (np !== old && pathTaken(ix, np)) fail(409, "exists", { path: np });
        moveTree(ix, old, np);
      }
      await saveIndex(id, ix); return send(200, { ok: true });
    });
  }
  if (op === "delete") {
    if (body.confirm !== true) fail(400, "confirm_required");
    return withLock(id, async () => {
      const [m, ix] = await Promise.all([meta(id), index(id)]);
      const ids = new Set((body.ids || []).map(String));
      const folders = (body.folders || []).map(s => cleanPath(s));
      for (const f of Object.values(ix.files)) if (folders.some(d => under(f.path, d))) ids.add(f.id);
      let freed = 0;
      // v111: delete objects 8 at a time and rewrite the search index once (was 4 sequential storage calls per file)
      const list = [...ids].filter(fid => ix.files[fid]);
      for (const fid of list) freed += ix.files[fid].size;
      await dropFiles(id, ix, list);
      ix.folders = ix.folders.filter(p => !folders.some(d => under(p, d)));
      m.used = Math.max(0, m.used - freed);
      await saveIndex(id, ix); await saveMeta(id, m);
      return send(200, { ok: true, deleted: ids.size, ...publicMeta(m) });
    });
  }
  if (op === "ai") return aiJob(req, res, id, body);
  fail(404, "unknown");
}
function moveTree(ix, old, np) {
  for (const f of Object.values(ix.files)) if (under(f.path, old)) f.path = np + f.path.slice(old.length);
  ix.folders = ix.folders.map(p => under(p, old) ? np + p.slice(old.length) : p);
  addFolders(ix, np);
}
async function dropFiles(id, ix, list) {
  const withText = list.filter(fid => ix.files[fid].text);
  // v113: one flaky storage call used to fail the whole delete with "server" (objects gone, index unchanged).
  // Now each object delete is retried; if a backend still refuses, the key is parked in ix.gc and retried by the next delete.
  const keys = [];
  for (const fid of list) { keys.push({ b: ix.files[fid].b, k: `${P(id)}/f/${fid}` }); if (ix.files[fid].text || ix.files[fid].note) keys.push({ b: null, k: `${P(id)}/t/${fid}.txt` }, { b: null, k: cKey(id, fid) }); }
  const old = (ix.gc || []).slice(0, 50); ix.gc = (ix.gc || []).slice(50);
  await delKeys(ix, [...keys, ...old]);
  if (withText.length) { const x = await bm(id); for (const fid of withText) bmRemove(x, fid); await cset(`${P(id)}/bm25.json`, x); }
  for (const fid of list) delete ix.files[fid];
}
async function delKeys(ix, keys) {
  for (let i = 0; i < keys.length; i += 8) await Promise.all(keys.slice(i, i + 8).map(async it => {
    for (let n = 0; ; n++) {
      try { await (it.b === null ? storage : bk(it.b).st).del(it.k); return; }
      catch (e) { if (n >= 2) { console.warn("pendrive: delete deferred", e.message); (ix.gc = ix.gc || []).push(it); return; } await new Promise(r => setTimeout(r, 300 * (n + 1))); }
    }
  }));
  if (ix.gc && ix.gc.length > 5000) ix.gc = ix.gc.slice(-5000);
}
async function dropFile(id, ix, fid) {
  await bk(ix.files[fid] && ix.files[fid].b).st.del(`${P(id)}/f/${fid}`);
  if (ix.files[fid] && ix.files[fid].text) {
    await storage.del(`${P(id)}/t/${fid}.txt`); await storage.del(cKey(id, fid)).catch(() => {});
    const x = await bm(id); bmRemove(x, fid); await cset(`${P(id)}/bm25.json`, x);
  }
  delete ix.files[fid];
}

const NOT_FOUND = { en: "Not found in your files. The selected files don't contain enough evidence to answer this, so I won't guess.", bn: "আপনার ফাইলে পাওয়া যায়নি। বেছে নেওয়া ফাইলগুলোতে এর উত্তরের যথেষ্ট প্রমাণ নেই, তাই আন্দাজে কিছু বলছি না।" };
const locLabel = l => !l ? "" : l.page ? `page ${l.page}` : l.sheet ? `sheet "${l.sheet}" rows ${l.r1}–${l.r2}` : l.h ? `section: ${l.h}` : "";
// v115: retrieval for "ask": expanded BM25 (top 40) → optional embeddings/reranker → lexical rerank → top 6, numbered [n].
// Spreadsheet maths is computed here (rag.aggregate, no eval) and handed to the model as an exact, citable fact.
async function askCited(id, ix, all, withText, q, lang, fmt, emit, SYSX, skillNote) {
  const x = await ragIndex(id, all, emit);
  const allowed = new Set(withText.map(f => f.id)); const ex = rag.expand(q, tokens);
  const hits = bmSearch(x, [...ex.base, ...ex.extra].join(" "), allowed, 40);
  const cache = {}; const getC = async fid => (cache[fid] = cache[fid] || await loadChunks(id, ix.files[fid]));
  const cands = [];
  for (const h of hits) { const c = (await getC(h.fid)).chunks[h.i]; if (c) cands.push({ ...h, chunk: c }); }
  const overview = rag.OVERVIEW.test(q);
  if (overview) for (const f of withText.slice(0, 8)) if (!cands.some(c => c.fid === f.id)) { const c = (await getC(f.id)).chunks[0]; if (c) cands.push({ fid: f.id, i: 0, s: 0, chunk: c }); }
  const how = await rag.remoteScores(q, cands.slice(0, 30));
  rag.lexRerank(q, cands, tokens);
  let agg = null;
  if (rag.numericQuestion(q)) {
    const sheetFiles = [];
    for (const f of withText.filter(f => /\.(xlsx|xls|ods)$/i.test(f.path)).slice(0, 20)) { const c = await getC(f.id); if (c.sheets) sheetFiles.push({ id: f.id, path: f.path, sheets: c.sheets }); }
    agg = rag.aggregate(q, sheetFiles, tokens);
  }
  const need = ex.base.length >= 3 ? 0.34 : ex.base.length === 2 ? 0.5 : 1;
  const strong = cands.filter(c => c.cov >= need || (c.emb || 0) >= 0.62);
  emit({ type: "progress", msg: `chunks ${cands.length} → ${strong.length}${how ? " · " + how : ""}${agg ? " · computed" : ""}` });
  if (!overview && !agg && !strong.length) return { notFound: true };
  const ev = []; let left = JOB.askChars;
  if (agg) { const t = rag.aggText(agg); ev.push({ fid: agg.fid, loc: { sheet: agg.sheet, r1: agg.rows[0] || 0, r2: agg.rows[agg.rows.length - 1] || 0, rows: agg.rows.slice(0, 200) }, text: "COMPUTED: " + t, quote: "" }); left -= t.length; }
  for (const c of (overview ? cands : strong).slice(0, agg ? 5 : 6)) { if (left <= 200) break; const t = c.chunk.t.slice(0, left); left -= t.length; ev.push({ fid: c.fid, loc: c.chunk.loc, text: t, quote: rag.quote(t, q, tokens) }); }
  const ctx = ev.map((e, i) => `[${i + 1}] [FILE: ${ix.files[e.fid].path}]${locLabel(e.loc) ? ` (${locLabel(e.loc)})` : ""}\n${e.text}`).join("\n\n");
  const rules = `\nRULES: Use only the numbered extracts. After each fact write the extract number in square brackets, like [1] or [2][3] (not file names). ${agg ? "Extract [1] is an exact COMPUTED value from the spreadsheet: give that number as the answer, do not recompute it. " : ""}If the extracts do not answer the question, reply with exactly NOT_FOUND and nothing else.`;
  let answer = await askAI(SYSX(lang), `Numbered file extracts:\n\n${ctx}\n${rules}\nQUESTION: ${q}${fmtRule(q, fmt)}`, skillNote ? 3600 : 1800);
  if (/^\W*NOT_FOUND\W*$/.test(answer.trim()) || (/NOT_FOUND/.test(answer) && answer.length < 80)) return { notFound: true };
  answer = answer.replace(/\bNOT_FOUND\b/g, "");
  const used = new Set([...answer.matchAll(/\[(\d{1,2})\]/g)].map(m => Number(m[1])).filter(n => n >= 1 && n <= ev.length));
  const cites = ev.map((e, i) => ({ n: i + 1, id: e.fid, path: ix.files[e.fid].path, loc: e.loc, quote: e.quote })).filter(c => !used.size || used.has(c.n));
  return { answer, cites, sources: [...new Set(cites.map(c => c.path))] };
}

// Streams NDJSON: {type:"progress"} lines, then {type:"answer", text, sources, cites, actions}.
async function aiJob(req, res, id, body) {
  const q = String(body.question || "").slice(0, 2000).trim();
  if (!q) fail(400, "no_question");
  const lang = body.lang === "en" ? "en" : "bn";
  const fmt = ["auto", "table", "report", "letter"].includes(body.format) ? body.format : "auto";
  // v109: optional skill + attachment note from the shared client module (plain text, capped).
  const skillNote = String(body.skillNote || "").replace(/[\u0000-\u0008]/g, "").slice(0, 4000);
  const SYSX = l => SYS(l) + skillNote;
  const ix = await index(id);
  const all = Object.values(ix.files).filter(f => f.state === "ok");
  const scope = body.scope || {};
  let inScope = all;
  if (Array.isArray(scope.ids) && scope.ids.length) { const s = new Set(scope.ids.map(String)); inScope = all.filter(f => s.has(f.id)); }
  else if (scope.folder) { const d = cleanPath(scope.folder); inScope = all.filter(f => under(f.path, d)); }
  res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  const emit = o => res.write(JSON.stringify(o) + "\n");
  const noText = inScope.filter(f => !f.text).map(f => f.path);
  const withText = inScope.filter(f => f.text);
  const scanned = inScope.filter(f => f.note === "scanned").map(f => f.path);
  try {
    if (!withText.length) {
      emit({ type: "answer", text: lang === "en" ? "None of the selected files has readable text. Scanned images need OCR, which isn't supported yet." : "বেছে নেওয়া ফাইলে পড়ার মতো লেখা নেই। স্ক্যান করা ছবি পড়তে OCR লাগে, সেটা এখনও নেই।", sources: [], cites: [], actions: [], noText, scanned });
      return res.end();
    }
    const read = async f => ((await storage.getText(`${P(id)}/t/${f.id}.txt`)) || "");
    let answer, sources, cites;
    if (body.mode === "analyse") {
      const files = withText.slice(0, JOB.maxFiles);
      emit({ type: "progress", msg: `files ${files.length}/${withText.length}` });
      const groups = []; let cur = [], size = 0;
      for (const f of files) {
        const text = (await read(f)).slice(0, Math.floor(JOB.mapChars * 0.9));
        if (size + text.length > JOB.mapChars && cur.length) { groups.push(cur); cur = []; size = 0; }
        cur.push({ f, text }); size += text.length;
      }
      if (cur.length) groups.push(cur);
      const used = groups.slice(0, JOB.maxMapCalls);
      const notes = [];
      for (let g = 0; g < used.length; g++) {
        emit({ type: "progress", step: g + 1, of: used.length + 1, msg: used[g].map(x => x.f.path).join(", ") });
        const ctx = used[g].map(x => `[FILE: ${x.f.path}]\n${x.text}`).join("\n\n");
        notes.push(await askAI(SYS("en"), `Make short factual notes for this task, keeping file names in [brackets].${wantsTable(q, fmt) ? " The final answer will be a table: give one line per item as 'item | field | field | [file]' so every value is kept." : ""}\nTASK: ${q}\n\n${ctx}\n\nQUESTION: notes only`, 900));
      }
      emit({ type: "progress", step: used.length + 1, of: used.length + 1, msg: "combine" });
      const skipped = withText.length - used.flat().length;
      answer = await askAI(SYSX(lang), `Notes made from the files (each fact has its file name):\n\n${notes.map((n, i) => `[FILE: notes ${i + 1}]\n${n}`).join("\n\n")}\n\n${used.flat().map(x => `[FILE: ${x.f.path}]`).join(" ")}\n${skipped > 0 ? `(${skipped} more files were not read because of the job limit; say so.)\n` : ""}\nQUESTION: ${q}${fmtRule(q, fmt)}${wantsTable(q, fmt) ? "\nKeep every row from the notes in the table; merge duplicates, do not drop items." : ""}`, skillNote ? 3600 : 2000);
      sources = used.flat().map(x => x.f.path);
    } else {
      const r = await askCited(id, ix, all, withText, q, lang, fmt, emit, SYSX, skillNote);
      if (r.notFound) { emit({ type: "answer", text: NOT_FOUND[lang], sources: [], cites: [], actions: [], noText, notFound: true, scanned }); return res.end(); }
      ({ answer, sources, cites } = r);
    }
    if (wantsTable(q, fmt) && !hasMdTable(answer)) { // v108: the model ignored the format: ask once more to reshape its own answer
      emit({ type: "progress", msg: "table" });
      try { const again = await askAI(SYS(lang), `Rewrite this answer so it includes a GitHub-style markdown table (header row, | --- | separator, one row per item). Keep every fact and every [file] citation; keep any pendrive-write block and any \`\`\`attachment block unchanged.\n\nANSWER:\n${answer}\n\nQUESTION: ${q}`, 2000); if (hasMdTable(again)) answer = again; } catch (e) { /* keep the first answer */ }
    }
    const { text, actions } = parseActions(answer);
    emit({ type: "answer", text, sources, cites: cites || [], actions, noText, scanned });
  } catch (e) {
    emit({ type: "error", error: e.code || "ai_failed" });
  }
  res.end();
}
export { HttpError };
// v113: helpers for api/share.js (share links, upload-request links)
export const internals = { session, meta, index, cget, cset, withLock, bk, P, hex, scrypt, cleanPath, under, fail, aiJob, limitedKey: null };
