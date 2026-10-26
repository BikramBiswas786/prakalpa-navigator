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
import { MetaStore } from "./metastore.js";
import * as rag from "./rag.js";
import { edAI } from "./edai.js";

const env = process.env;
let SECRET = env.PENDRIVE_SECRET || "";
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("PENDRIVE_SECRET is not set: using a random one, so pendrive sessions end when the server restarts.");
}
// a pool of S3-compatible backends. pool[0] is the primary: it holds all metadata (meta, index, text, bm25, stats);
// file bytes go to whichever backend had the most free room when the file was uploaded (f.b / pending.b, default "1").
export const pool = makePool(env, SECRET);
const metaStore = pool.length > 1 && pool.every(b => b.st.getTextV) && env.PD_META !== "primary" ? new MetaStore(pool, env) : null;
export const storage = metaStore || (pool.length ? pool[0].st : null);
export { metaStore };
if (metaStore) { metaStore.init().then(() => console.log(`AI Pendrive metadata replicas: ${metaStore.provider}${metaStore.synced ? " (synced)" : ""}`));
  let syncing = false; metaStore.onBack = b => { if (b === metaStore.legacy && !metaStore.synced && !syncing) { syncing = true; metaStore.sync(b).catch(e => console.warn("metadata sync:", e.message)).finally(() => { syncing = false; }); } }; }
const BAD_MS = 10 * 60 * 1000;
const bk = bid => pool.find(b => b.id === String(bid || "1")) || pool[0];
const QUOTA = Math.max(1, Number(env.PENDRIVE_QUOTA_BYTES) || 5 * 1024 ** 3);       // per pendrive
const MAX_FILE = Math.max(1, Number(env.PENDRIVE_MAX_FILE_BYTES) || 5 * 1024 ** 3);   // per file
// Safety cap across ALL pendrives, so we refuse uploads before hitting the storage plan's limit (B2 free tier: 10 GB).
const TOTAL_CAP = Math.max(1, Number(env.PENDRIVE_TOTAL_CAP_BYTES) || pool.reduce((a, b) => a + b.cap, 0) || 9 * 1024 ** 3);
const SINGLE = 16 * 1024 * 1024;           // below this a file is one presigned PUT
const MIB = 1024 * 1024;
// 16–64 MB parts: aim for ~10 s per part at 1/6 of the measured browser speed, and never more than 10,000 parts
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
/* Byte-bounded write-through cache for extracted text, chunk files, name lookups and conversation records (cuts B2 class-B GETs).
   This server is the only writer of these keys, so every put/del updates the cache; entries still expire after TTL. */
const tcache = new Map(); let tbytes = 0; const TC_MAX = process.env.PENDRIVE_CACHE === "0" ? 0 : 48 * 1024 * 1024, TC_TTL = 10 * 60 * 1000;
function tdrop(key) { const e = tcache.get(key); if (e) { tbytes -= e.n; tcache.delete(key); } }
function tkeep(key, v) { tdrop(key); const n = v == null ? 16 : v.length * 2; if (n > TC_MAX / 8) return; tcache.set(key, { v, n, t: Date.now() }); tbytes += n; while (tbytes > TC_MAX && tcache.size) tdrop(tcache.keys().next().value); }
async function tget(key) { const e = tcache.get(key); if (e && Date.now() - e.t < TC_TTL) { tcache.delete(key); tcache.set(key, e); return e.v; } const v = await storage.getText(key); tkeep(key, v); return v; }
async function tput(key, text, type) { await storage.putText(key, text, type); tkeep(key, text); }
async function tdel(key) { await storage.del(key); tkeep(key, null); }
async function jget(key) { const t = await tget(key); return t == null ? null : JSON.parse(t); }
const jset = (key, v) => tput(key, JSON.stringify(v), "application/json");
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
// chunks with locations (page / heading path / sheet rows) live in c/<fid>.json; bm25 indexes those chunks.
const cKey = (id, fid) => `${P(id)}/c/${fid}.json`;
async function putChunks(id, fid, text) { const built = rag.build(text); await tput(cKey(id, fid), JSON.stringify(built)); return built; }
async function loadChunks(id, f) {
  try { const t = await tget(cKey(id, f.id)); if (t) return JSON.parse(t); } catch (e) { /* rebuild below */ }
  return rag.build((await tget(`${P(id)}/t/${f.id}.txt`)) || "");
}
/* ---------- memory: one short card per file (what it is, key words, sheet columns), grown as files are indexed ----------
   pendrives/<id>/mem.json {v, files: {fid: {sum, kw, sheets, n, ai?}}}. A background job adds a 1–2 line AI summary (free models only). */
const memKey = id => `${P(id)}/mem.json`;
async function mem(id) { return (await cget(memKey(id))) || { v: 1, files: {} }; }
function memCard(text, built) {
  const lines = String(text).split("\n").map(l => l.replace(/\t+/g, " | ").trim()).filter(l => l && !/^\[(Sheet|Page)[: ]/.test(l));
  let sum = ""; for (const l of lines) { if (sum.length > 260) break; sum += (sum ? " · " : "") + l.slice(0, 160); }
  const tf = {}; for (const t of tokens(String(text).slice(0, 60000))) if (t.length > 3 && !/^[\d.,]+$/.test(t)) tf[t] = (tf[t] || 0) + 1;
  const card = { sum: sum.slice(0, 300), kw: Object.entries(tf).sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e[0]), n: String(text).length };
  if (built && built.sheets) card.sheets = Object.entries(built.sheets).slice(0, 12).map(([name, d]) => { const hi = d.rows.findIndex(r => r.some(Boolean)); return { name, cols: hi >= 0 ? d.rows[hi].filter(Boolean).slice(0, 20).map(c => c.slice(0, 40)) : [], rows: hi >= 0 ? d.rows.length - hi - 1 : 0 }; });
  return card;
}
function memText(c) { return `${c.ai || c.sum}${c.sheets && c.sheets.length ? "\nSheets: " + c.sheets.map(s => `${s.name} (${s.rows} rows; columns: ${s.cols.join(" | ")})`).join("; ") : ""}${c.kw && c.kw.length ? "\nKey words: " + c.kw.join(", ") : ""}`; }
async function memFill(id, files, getC) { // cards for files indexed before memory existed
  const m = await mem(id); const miss = files.filter(f => !m.files[f.id]).slice(0, 60); if (!miss.length) return m;
  for (let i = 0; i < miss.length; i += 8) await Promise.all(miss.slice(i, i + 8).map(async f => { try { const t = (await tget(`${P(id)}/t/${f.id}.txt`)) || ""; m.files[f.id] = memCard(t, await getC(f.id)); } catch (e) { /* skip */ } }));
  await cset(memKey(id), m); memGrow(id); return m;
}
const memBusy = new Set();
function memGrow(id) { // background: short AI summaries, one at a time, free models only
  if (env.PENDRIVE_MOCK_AI === "1" || env.PENDRIVE_MEM_AI === "0" || memBusy.has(id)) return;
  memBusy.add(id);
  (async () => {
    for (let n = 0; n < 25; n++) {
      const m = await mem(id); const ix = await index(id);
      const fid = Object.keys(m.files).find(k => ix.files[k] && !m.files[k].ai && !m.files[k].aiTry && m.files[k].n > 120); if (!fid) break;
      let ai = "";
      try {
        const t = ((await tget(`${P(id)}/t/${fid}.txt`)) || "").slice(0, 5000);
        ai = (await askAI("You write very short file descriptions.", `File: ${ix.files[fid].path}\n\n${t}\n\nIn one or two sentences (max 45 words), say what this file is and its key facts (who, what, when, main numbers). Write in the file's own language. No preamble.`, 160, { fast: true, freeOnly: true })).replace(/\s+/g, " ").slice(0, 320);
      } catch (e) { /* try once only */ }
      await withLock(id, async () => { const m2 = await mem(id); if (m2.files[fid]) { if (ai) m2.files[fid].ai = ai; else m2.files[fid].aiTry = 1; await cset(memKey(id), m2); } });
      await new Promise(r => setTimeout(r, 2500));
    }
  })().catch(e => console.warn("pendrive: memory", e.message)).finally(() => memBusy.delete(id));
}
async function memDrop(id, fids) { const m = await cget(memKey(id)); if (!m) return; let ch = false; for (const f of fids) if (m.files[f]) { delete m.files[f]; ch = true; } if (ch) await cset(memKey(id), m); }
/* answer cache: same question + same files (ids, sizes, times) → same answer, until a file changes. pendrives/<id>/acache.json */
const acKey = id => `${P(id)}/acache.json`;
function acSig(parts, files) { return crypto.createHash("sha1").update(JSON.stringify([parts, files.map(f => [f.id, f.path, f.size, f.mtime || 0]).sort((a, b) => a[0] < b[0] ? -1 : 1)])).digest("hex"); }
async function acGet(id, k) { const c = await cget(acKey(id)); return c && c[k] ? c[k].ans : null; }
async function acPut(id, k, ans) { const c = (await cget(acKey(id))) || {}; c[k] = { at: Date.now(), ans }; const ks = Object.keys(c).sort((a, b) => c[b].at - c[a].at); for (const x of ks.slice(60)) delete c[x]; await cset(acKey(id), c); }
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
// Lazy migration of older pendrives: rebuild chunk files + bm25 once, the first time someone asks.
async function ragIndex(id, all, emit) {
  let x = await bm(id); if (x.v === 2) return x;
  return withLock("bm:" + id, async () => {
    x = await bm(id); if (x.v === 2) return x;
    const nx = { v: 2, df: {}, n: 0, len: 0, files: {} }; const files = all.filter(f => f.text);
    emit && emit({ type: "progress", msg: `index ${files.length}` });
    for (let i = 0; i < files.length; i += 8) await Promise.all(files.slice(i, i + 8).map(async f => {
      try { const built = await putChunks(id, f.id, (await tget(`${P(id)}/t/${f.id}.txt`)) || ""); bmAddChunks(nx, f.id, built.chunks); } catch (e) { console.warn("pendrive: reindex", e.message); }
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
// opts.fast: quickest models first (two race); opts.onDelta(text) gets the answer as it arrives; opts.freeOnly skips paid models.
async function askAI(system, user, maxOut = 1600, opts = {}) {
  if (env.PENDRIVE_MOCK_AI === "1") {
    const out = mockAI(system, user);
    if (opts.onDelta) { const d = Number(env.PENDRIVE_MOCK_DELAY || 0); const h = Math.ceil(out.length / 2); if (d) await new Promise(r => setTimeout(r, d)); opts.onDelta(out.slice(0, h)); if (d) await new Promise(r => setTimeout(r, d)); opts.onDelta(out.slice(h)); }
    else if (env.PENDRIVE_MOCK_DELAY) await new Promise(r => setTimeout(r, 2 * Number(env.PENDRIVE_MOCK_DELAY)));
    return out;
  }
  const req = new Request("http://pendrive.local/api/chat", { method: "POST", headers: { "content-type": "application/json", host: "pendrive.local" }, body: JSON.stringify({ system, messages: [{ role: "user", content: user }], maxOut, ...(opts.fast ? { fast: true, race: true } : {}), ...(opts.freeOnly ? { freeOnly: true } : {}) }) });
  const r = await chatMod.POST(req);
  if (!r.ok) { let e = ""; try { e = (await r.json()).error; } catch (x) { /* ignore */ } fail(502, e || "ai_failed"); }
  if (opts.meta) opts.meta.provider = r.headers.get("x-ai-provider") || "";
  let text = ""; const dec = new TextDecoder();
  for await (const c of r.body) { const d = dec.decode(c, { stream: true }); text += d; if (opts.onDelta) { const v = d.replace(/\u0000[A-Z_]*/g, ""); if (v) opts.onDelta(v); } }
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
  const body2 = body.replace(/```pendrive-image\s*([\s\S]*?)```/g, (_, j) => {
    try { const a = imageAction(JSON.parse(j.trim())); if (a) actions.push(a); } catch (e) { /* ignore a broken block */ }
    return "";
  });
  return { text: body2.trim(), actions };
}
// an image the browser draws (text on a background, a poster/notice, or a simple chart) and offers as a PNG
const HEX = v => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(v || "")) ? String(v) : "";
function imageAction(a) {
  if (!a || typeof a !== "object") return null;
  const kind = ["text", "poster", "chart", "picture"].includes(a.kind) ? a.kind : "text";
  const scene = String(a.scene || "").replace(/\s+/g, " ").trim().slice(0, 600);
  const text = String(a.text || "").slice(0, 20000), title = String(a.title || "").slice(0, 300);
  let chart = null;
  if (kind === "chart" && a.chart && Array.isArray(a.chart.labels) && Array.isArray(a.chart.values)) {
    const n = Math.min(a.chart.labels.length, a.chart.values.length, 40);
    chart = { type: ["bar", "line", "pie"].includes(a.chart.type) ? a.chart.type : "bar", labels: a.chart.labels.slice(0, n).map(x => String(x).slice(0, 40)), values: a.chart.values.slice(0, n).map(Number).map(v => isFinite(v) ? v : 0) };
  }
  if (!text.trim() && !title.trim() && !chart && !scene) return null;
  // the model sometimes forgets "scene": for a picture or poster, paint from the title/text (the image model is told to draw no words)
  const sc = scene || (kind === "picture" || kind === "poster" ? (title + ". " + text).replace(/\s+/g, " ").trim().slice(0, 300) : "");
  let name = cleanPath(String(a.name || a.path || "AI image")).replace(/\.(png|jpe?g|webp)$/i, "") + ".png";
  return { type: "image", kind: chart ? "chart" : kind === "chart" ? "text" : kind, path: name, format: "png", bg: HEX(a.bg) || "#ffffff", fg: HEX(a.fg) || "#111111", accent: HEX(a.accent) || "", align: a.align === "center" ? "center" : "left", title, text, chart, scene: chart ? "" : sc };
}
// "write this as an image", "make a poster", "a chart of…", "…on a black background" — the user wants a picture back, not prose
export const IMAGE_OUT_RE = /\b(make|create|generate|draw|write|render|put|turn|convert|give|produce|design|export|save)\b[^.?!\n]{0,140}\b(a|an|as|into|to|one)\s+((?!this\b|that\b|these\b|those\b|the\b|my\b|of\b)[\w-]+\s+){0,4}(image|picture|png|jpe?g|poster|chart|graph|banner|wallpaper)\b|\b(on|in|with|onto)\s+(a|an|one)?\s*([\w-]+\s+){0,3}background\b|ছবি\s*(বানা|তৈরি|কর)|ছবিতে|পোস্টার|চার্ট/i;
export function imageColors(q) {
  const s = String(q || "").toLowerCase();
  const C = { black: "#000000", white: "#ffffff", red: "#b91c1c", blue: "#1e3a8a", green: "#166534", yellow: "#facc15", grey: "#4b5563", gray: "#4b5563", navy: "#0b1f4b", কালো: "#000000", সাদা: "#ffffff", লাল: "#b91c1c", নীল: "#1e3a8a", সবুজ: "#166534" };
  const m = s.match(/(black|white|red|blue|green|yellow|grey|gray|navy|কালো|সাদা|লাল|নীল|সবুজ)\s*(\w+\s*)?(background|bg|ব্যাকগ্রাউন্ড|পটভূমি)/);
  const t = s.match(/(black|white|red|blue|green|yellow|grey|gray|navy|কালো|সাদা|লাল|নীল|সবুজ)\s*(text|letters|font|লেখা)/);
  const bg = m ? C[m[1]] : "#ffffff";
  const dark = ["#000000", "#b91c1c", "#1e3a8a", "#166534", "#4b5563", "#0b1f4b"].includes(bg);
  return { bg, fg: t ? C[t[1]] : dark ? "#ffffff" : "#111111" };
}
// the model forgot the block: make one from its answer so the user still gets the picture
export function ensureImage(q, text, actions) {
  if (!IMAGE_OUT_RE.test(String(q || "")) || actions.some(a => a.type === "image")) return actions;
  const body = String(text || "").replace(/\s*\[\d{1,2}\]/g, "").replace(/^MOCK answer[^\n]*\n?/, "").trim() || String(text || "").trim();
  const a = imageAction({ kind: /poster|notice|banner|পোস্টার/i.test(q) ? "poster" : "text", name: "AI image " + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ""), text: body, ...imageColors(q) });
  return a ? [...actions, a] : actions;
}
// output format rules. A table request (any language) must produce a GitHub markdown table.
export const TABLE_RE = /\b(table|tables|tabular|tabulate|list|listing|compar\w*|matrix|spreadsheet|csv|excel|columns?|rows?)\b|টেবিল|সারণি|সারণী|তালিকা|তুলনা|ছক|কলাম|এক্সেল/i;
export const wantsTable = (q, format) => format === "table" || (format !== "letter" && TABLE_RE.test(String(q || "")));
export const hasMdTable = t => /^\s*\|.*\|\s*\n\s*\|?\s*:?-{2,}/m.test(String(t || ""));
export function fmtRule(q, format) {
  const r = [];
  if (wantsTable(q, format)) r.push("OUTPUT FORMAT (mandatory): the answer MUST contain a GitHub-style markdown table: a header row, then a separator row like | --- | --- |, then one row per item, every row starting and ending with |. Use short cell text, keep [file] citations in a 'File'/'ফাইল' column. Do not use HTML, tabs or code blocks for the table. A one-line intro before the table and short notes after it are fine.");
  if (format === "report") r.push("OUTPUT FORMAT: a structured report in markdown: a # title, ## sections (Summary, Details, Conclusion), bullet points, and a markdown table where data fits.");
  if (IMAGE_OUT_RE.test(String(q || ""))) r.push("OUTPUT: the user wants an IMAGE back. Reply with one short line, then the ```pendrive-image block holding the complete requested text (colours as asked). Do not add commentary inside the text." + (/\b(picture|photo|illustration|drawing|scene|poster|banner|flyer)\b|ছবি|পোস্টার/i.test(String(q || "")) ? " This request wants a real picture: use kind \"picture\" (or \"poster\" for a notice with a picture) and fill \"scene\" with an English description of what to paint, no words in it." : ""));
  if (/tally|voucher|ভাউচার|ট্যালি/i.test(String(q || "")) && /\b(make|create|prepare|build|convert|export|import|entry|entries|বানাও|তৈরি)\b/i.test(String(q || ""))) r.push("OUTPUT FORMAT (Tally): give the vouchers as ONE markdown table with exactly these columns: | Date | Voucher type | Voucher no | Debit ledger | Credit ledger | Amount | Narration |. Dates as dd-mm-yyyy, Amount as a plain number. No total row. Then one line telling the user to press ⬇ Tally XML (in More) and import it in Tally (Gateway of Tally → Import → Vouchers).");
  if (format === "letter") r.push("OUTPUT FORMAT: a formal office letter/notesheet: To, Subject, salutation, body paragraphs, closing and signature lines. No tables unless asked.");
  return r.length ? "\n\n" + r.join("\n") : "";
}
const SYS = lang => `You are Biswas AI working inside the user's AI Pendrive (a shared office folder). Answer ONLY from the file extracts given. Cite the file name in square brackets for every fact, like [Folder/file.pdf]. If the extracts do not contain the answer, say so. ${lang === "en" ? "Reply in English." : "Reply in colloquial West Bengal Bengali, in Bengali script."}
If the user asks you to write, save or create a file (notesheet, report, table, summary), add ONE block at the end exactly like:
\`\`\`pendrive-write
{"path":"Folder/Name.docx","format":"docx","content":"markdown text (for xlsx: a markdown table)"}
\`\`\`
format is one of docx, xlsx, pdf, md, txt, csv.
If the user asks for an IMAGE / picture / PNG / poster / notice / chart (for example "write this text on a black background image"), add ONE block at the end exactly like:
\`\`\`pendrive-image
{"name":"Short name","kind":"text","bg":"#000000","fg":"#ffffff","title":"","text":"the full text, line breaks kept","align":"left"}
\`\`\`
kind is "picture" (a real AI-generated picture/photo/illustration), "text" (plain text on a background), "poster" (title + body, centred, for notices) or "chart" (add "chart":{"type":"bar|line|pie","labels":[...],"values":[numbers]}). Put the COMPLETE text in "text" in its original language and script; the app draws the PNG.
When the user wants a real picture, photo, illustration, drawing of a scene, or a poster/banner/card with a picture, ALSO add "scene":"a short ENGLISH description of what to draw (people, place, objects, mood), with NO words or letters in it". The app generates that picture with an image model and writes your "title"/"text" on top of it (so Bengali stays correct). For a picture only, use kind "picture" with "scene" and empty "text". For a plain text image or a notice without a picture, leave "scene" out. Never say you cannot make images.
Files whose text starts with "[Tally export]" are Tally Prime / Tally ERP 9 data already decoded for you: the summary lines give voucher totals by type, each ledger's Dr/Cr movement and GST ledgers, and the [Sheet: Vouchers] rows list every ledger entry. Answer ledger balances, voucher totals and GST questions from those numbers exactly and cite the file. Tally Excel/PDF exports are read like any sheet or PDF. Never claim you deleted or overwrote anything; the user confirms that in the app.`;

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
      if (await jget(nk).catch(e => { if (/^storage_reset/.test(e.message || "")) fail(409, "name_taken"); throw e; })) fail(409, "name_taken");
      const id = hex(12), salt = hex(16);
      await saveMeta(id, { id, name, salt, hash: await scrypt(body.pin, salt), quota: QUOTA, used: 0, fails: 0, lockUntil: 0, pending: {}, created: Date.now() });
      await saveIndex(id, { files: {}, folders: [] });
      await jset(nk, { id });
      for (const k of [`${P(id)}/conv/index.json`, ...["word", "excel", "image", "note"].map(a => `${P(id)}/edconv/${a}.json`)]) cput(k, null); // a new pendrive has none: skip 5 GETs
      return send(200, { token: issue(id), ...publicMeta(await meta(id)) });
    });
  }
  if (op === "open") {
    checkPin(body.pin);
    const ref = await jget(nameKey(body.name));
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

  const id = req.pdAs || session(req); // share upload-request links act on the owner's pendrive with a fixed op set
  // Change the PIN: owner session only, the current PIN must match (wrong tries count toward the same lock as opening).
  if (op === "pin") {
    if (req.pdAs) fail(403, "forbidden");
    checkPin(body.pin); checkPin(body.newPin);
    return withLock(id, async () => {
      const m = await meta(id);
      if (m.lockUntil > Date.now()) fail(423, "locked", { retryAfter: Math.ceil((m.lockUntil - Date.now()) / 1000) });
      const h = await scrypt(body.pin, m.salt);
      if (!crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(m.hash, "hex"))) {
        m.fails = (m.fails || 0) + 1;
        if (m.fails >= LOCK_TRIES) { m.fails = 0; m.lockUntil = Date.now() + LOCK_MS; await saveMeta(id, m); fail(423, "locked", { retryAfter: LOCK_MS / 1000 }); }
        await saveMeta(id, m); fail(401, "wrong", { left: LOCK_TRIES - m.fails });
      }
      m.salt = hex(16); m.hash = await scrypt(body.newPin, m.salt); m.fails = 0; m.lockUntil = 0; await saveMeta(id, m);
      return send(200, { ok: true });
    });
  }
  // Editor conversations: one list per editor area (word/excel/image/note). Each row = a snapshot of the document + its AI thread.
  // Always a NEW row on save (never overwrite or merge). Owner only.
  if (op.startsWith("edconv/")) {
    if (req.pdAs) fail(403, "forbidden");
    const area = String(body.area || ""); if (!["word", "excel", "image", "note"].includes(area)) fail(400, "bad_area");
    const IK = `${P(id)}/edconv/${area}.json`, rKey = r => `${P(id)}/edconv/${r}.json`;
    const rid = String(body.rid || ""); const okId = new RegExp(`^${area}-[a-f0-9]{16}$`).test(rid);
    const title = x => String(x || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 140);
    const listR = async () => ((await cget(IK)) || { rows: [] }).rows;
    if (op === "edconv/list") return send(200, { rows: (await listR()).sort((a, b) => b.at - a.at) });
    if (op === "edconv/get") { if (!okId) fail(400, "bad_id"); const r = await jget(rKey(rid)); if (!r) fail(404, "not_found"); return send(200, r); }
    return withLock("edconv:" + id + area, async () => {
      const rows = await listR(); const i = rows.findIndex(r => r.id === rid);
      if (op === "edconv/delete") { if (i < 0) fail(404, "not_found"); await tdel(rKey(rid)); rows.splice(i, 1); await cset(IK, { rows }); return send(200, { ok: true }); }
      if (op === "edconv/rename") { if (i < 0) fail(404, "not_found"); const tt = title(body.title); if (!tt) fail(400, "no_title"); const r = await jget(rKey(rid)); if (r) { r.title = tt; await jset(rKey(rid), r); } rows[i].title = tt; await cset(IK, { rows }); return send(200, rows[i]); }
      if (op !== "edconv/save") fail(404, "unknown_op");
      const data = String(body.data || ""); if (!/^[A-Za-z0-9+/=]*$/.test(data)) fail(400, "bad_data"); if (data.length > 5500000) fail(413, "too_large");
      const thread = (Array.isArray(body.thread) ? body.thread : []).slice(-80).map(t => ({ q: String(t.q || "").slice(0, 4000), a: String(t.a || "").slice(0, 8000), at: Number(t.at) || Date.now() }));
      if (rows.length >= 300) fail(409, "too_many");
      const nid = area + "-" + crypto.randomBytes(8).toString("hex");
      const rec = { id: nid, area, title: title(body.title) || "Untitled", name: title(body.name) || "Untitled", ext: String(body.ext || "").replace(/[^a-z0-9]/gi, "").slice(0, 8), mime: String(body.mime || "").slice(0, 120), at: Date.now(), data, thread };
      await jset(rKey(nid), rec);
      const row = { id: nid, area, title: rec.title, name: rec.name, ext: rec.ext, at: rec.at, n: thread.length, size: data.length };
      rows.push(row); await cset(IK, { rows }); return send(200, row);
    });
  }
  // Saved conversations (thread of questions, answers, edits, revisions). One small index + one JSON per conversation.
  // Owner only (PIN session); share links never reach these ops.
  if (op.startsWith("conv/")) {
    if (req.pdAs) fail(403, "forbidden");
    const CK = `${P(id)}/conv/index.json`, cKeyOf = c => `${P(id)}/conv/${c}.json`;
    const cid = String(body.cid || ""); const okId = /^[a-f0-9]{16}$/.test(cid);
    const title = s => String(s || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 120);
    const listC = async () => ((await cget(CK)) || { convs: [] }).convs;
    if (op === "conv/list") return send(200, { convs: (await listC()).sort((a, b) => b.at - a.at) });
    if (op === "conv/get") { if (!okId) fail(400, "bad_id"); const c = await jget(cKeyOf(cid)); if (!c) fail(404, "not_found"); return send(200, c); }
    if (op === "conv/save" || op === "conv/rename" || op === "conv/delete") return withLock("conv:" + id, async () => {
      const convs = await listC(); const i = convs.findIndex(c => c.id === cid);
      if (op === "conv/delete") { if (i < 0) fail(404, "not_found"); await tdel(cKeyOf(cid)); convs.splice(i, 1); await cset(CK, { convs }); return send(200, { ok: true }); }
      if (op === "conv/rename") { if (i < 0) fail(404, "not_found"); const tt = title(body.title); if (!tt) fail(400, "no_title"); const c = await jget(cKeyOf(cid)); if (c) { c.title = tt; await jset(cKeyOf(cid), c); } convs[i].title = tt; await cset(CK, { convs }); return send(200, convs[i]); }
      const turns = (Array.isArray(body.turns) ? body.turns : []).slice(-60).map(t => ({
        q: String(t.q || "").slice(0, 2000), md: String(t.md || "").slice(0, 200000), at: Number(t.at) || Date.now(),
        kind: ["ask", "revise", "edit"].includes(t.kind) ? t.kind : "ask",
        sources: (Array.isArray(t.sources) ? t.sources : []).slice(0, 50).map(x => String(x).slice(0, 500)),
        ...(Array.isArray(t.imgs) && t.imgs.length ? { imgs: t.imgs.slice(0, 4).map(imageAction).filter(Boolean) } : {}),
        cites: (Array.isArray(t.cites) ? t.cites : []).slice(0, 20).map(c => ({ n: Number(c.n) || 0, path: String(c.path || "").slice(0, 500), id: String(c.id || "").slice(0, 64), quote: String(c.quote || "").slice(0, 600), loc: c.loc && typeof c.loc === "object" ? JSON.parse(JSON.stringify(c.loc).slice(0, 400) || "null") : null }))
      })).filter(t => t.md || t.q);
      if (!turns.length) fail(400, "empty");
      const branch = typeof body.branch === "string" && body.branch.trim() ? cleanPath(body.branch).slice(0, 120) : "";
      const nid = i >= 0 ? cid : crypto.randomBytes(8).toString("hex");
      const rec = { id: nid, title: title(body.title) || title(turns[0].q) || "Conversation", branch, at: Date.now(), turns };
      const json = JSON.stringify(rec); if (json.length > 1500000) fail(413, "too_large");
      if (i < 0 && convs.length >= 200) fail(409, "too_many");
      await jset(cKeyOf(nid), rec);
      const row = { id: nid, title: i >= 0 && !body.title ? convs[i].title : rec.title, branch, at: rec.at, n: turns.length, size: json.length };
      if (i >= 0) convs[i] = row; else convs.push(row);
      await cset(CK, { convs }); return send(200, row);
    });
    fail(404, "unknown_op");
  }
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
  if (op === "download-urls") { // short-lived GET links (no attachment header) so the browser can stream files into a ZIP
    const ix = await index(id); const want = Array.isArray(body.ids) ? body.ids.slice(0, 500).map(String) : [];
    const urls = {};
    for (const fid of want) { const f = ix.files[fid]; if (f && f.state === "ok") urls[fid] = await bk(f.b).st.presignGet(`${P(id)}/f/${f.id}`, ""); }
    return send(200, { urls });
  }
  if (op === "text-get") {
    const ix = await index(id); const f = ix.files[String(body.id)];
    if (!f || !f.text) fail(404, "not_found");
    return send(200, { text: ((await tget(`${P(id)}/t/${f.id}.txt`)) || "").slice(0, 200000) });
  }

  const writeTexts = async (ix, list) => { // text sidecars in parallel, one bm25 write
    let x = await bm(id); const ok = list.filter(t => ix.files[String(t.id)]);
    for (let i = 0; i < ok.length; i += 8) await Promise.all(ok.slice(i, i + 8).map(t => tput(`${P(id)}/t/${String(t.id)}.txt`, String(t.text || "").slice(0, TEXT_MAX))));
    const built = {};
    for (let i = 0; i < ok.length; i += 8) await Promise.all(ok.slice(i, i + 8).map(async t => { built[String(t.id)] = await putChunks(id, String(t.id), String(t.text || "").slice(0, TEXT_MAX)); }));
    if (x.v !== 2) { x = await ragIndex(id, Object.values(ix.files).filter(f => f.state === "ok" && f.text && !built[f.id]), null); }
    for (const t of ok) { const f = ix.files[String(t.id)]; const text = String(t.text || "").slice(0, TEXT_MAX); const b = built[f.id];
      bmAddChunks(x, f.id, b.chunks); f.text = text.length > 0 && b.chunks.length > 0; f.note = String(t.note || (b.scanned ? "scanned" : "")).slice(0, 80); if (b.pages) f.pages = b.pages; }
    if (ok.length) {
      await cset(`${P(id)}/bm25.json`, x);
      try { const m = await mem(id); for (const t of ok) { const f = ix.files[String(t.id)]; m.files[f.id] = memCard(String(t.text || "").slice(0, TEXT_MAX), built[f.id]); } await cset(memKey(id), m); memGrow(id); } catch (e) { console.warn("pendrive: memory", e.message); }
    }
    return ok.length;
  };
  // placement + reservation shared by upload/init and upload/batch-init. Small files (< 16 MB) get one presigned PUT;
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
    // the backend with the lowest measured latency wins. Browsers PUT straight to the bucket, so CORS must be in place.
    let cands = pool.filter(b => placeable(b) && b.cap - (use[b.id] || 0) - (ctx.add[b.id] || 0) >= size);
    const free = b => b.cap - (use[b.id] || 0) - (ctx.add[b.id] || 0);
    const best = Math.max(0, ...cands.map(free));
    cands.sort((x, y) => { const nx = free(x) >= best * 0.8, ny = free(y) >= best * 0.8; if (nx !== ny) return nx ? -1 : 1; if (nx && ny && (x.st.lat || 0) !== (y.st.lat || 0)) return (x.st.lat || 1e9) - (y.st.lat || 1e9); return free(y) - free(x); });
    // Tiering: standard-port (443) buckets first in PD_PLACE_ORDER; a bucket on a non-standard port (e.g. coritan :7337, blocked on many office
    // networks) is a last resort, used only when the browser's probe reached it (ctx.reach) or the caller forced it.
    const ORD = String(env.PD_PLACE_ORDER || "filebase,tigris,b2,s3").split(",").map(x => x.trim());
    const odd = b => { try { const u = new URL(b.st.origin || ""); return u.protocol === "https:" && !!u.port && u.port !== "443"; } catch (e) { return false; } };
    const tier = b => odd(b) || env.PD_LAST_RESORT?.split(",").includes(b.name) || (!env.PD_LAST_RESORT && b.name === "coritan") ? 9 : (ORD.indexOf(b.name) < 0 ? 5 : ORD.indexOf(b.name));
    cands = cands.filter(b => tier(b) < 9 || ctx.reach.has(hostOf(b)));
    cands.sort((x, y) => tier(x) - tier(y));
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
    return { force, avoid: new Set((Array.isArray(body.avoid) ? body.avoid : []).slice(0, 10).map(h => String(h).toLowerCase())), reach: new Set((Array.isArray(body.reach) ? body.reach : []).slice(0, 10).map(h => String(h).toLowerCase())), add: {}, total: await totalUse(id), bps: Number(body.bps) || 0 };
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
  if (op === "upload/batch-init") { // reserve up to 100 files in one call (one meta write); errors are per file
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
  if (op === "hosts") { // storage origins the browser may upload to, so it can probe which ones it can reach
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
  // finish one upload: bytes check, index entry. Network work is done before (finishBytes) so a batch can run it in parallel.
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
  if (op === "upload/batch-complete") { // up to 100 finished uploads (+ their AI text) in one call: one index/meta/bm25 write
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
  if (op === "text-batch") { // AI text for many files in one call
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
      // delete objects 8 at a time and rewrite the search index once (was 4 sequential storage calls per file)
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
  if (op === "ed-ai") { const r = await edAI(body, askAI, env.PENDRIVE_MOCK_AI === "1"); if (r.error) fail(400, r.error); return send(200, r); }
  if (op === "ocr") { // read the text in up to 4 page images with a vision model; the browser falls back to Tesseract when this says no_vision
    const imgs = (Array.isArray(body.images) ? body.images : []).slice(0, 4).filter(im => im && /^image\/(jpeg|png|webp)$/.test(im.mime) && typeof im.data === "string" && im.data.length < 2500000);
    if (!imgs.length) fail(400, "no_image");
    if (env.PENDRIVE_MOCK_AI === "1") fail(422, "no_vision");
    const sys = "You are an exact OCR engine. Transcribe ALL text visible in the image(s), in reading order, in its original language and script (Bengali stays Bengali, English stays English). Keep line breaks, list markers and table rows (use | between cells). Do not translate, summarise, explain or add anything. If there are several images, start each with [Page n]. If there is no text, reply NO_TEXT.";
    const r = await chatMod.POST(new Request("http://pendrive.local/api/chat", { method: "POST", headers: { "content-type": "application/json", host: "pendrive.local" }, body: JSON.stringify({ system: sys, messages: [{ role: "user", content: "Transcribe the text." }], images: imgs, maxOut: 4000 }) }));
    if (!r.ok) { let e = ""; try { e = (await r.json()).error; } catch (x) { /* ignore */ } fail(r.status === 422 ? 422 : 502, e || "no_vision"); }
    let text = ""; const dec = new TextDecoder(); for await (const c of r.body) text += dec.decode(c, { stream: true });
    text = text.replace(/\u0000[A-Z_]*/g, "").trim();
    if (/^\W*NO_TEXT\W*$/.test(text)) text = "";
    return send(200, { text: text.slice(0, TEXT_MAX), provider: r.headers.get("x-ai-provider") || "vision" });
  }
  fail(404, "unknown");
}
function moveTree(ix, old, np) {
  for (const f of Object.values(ix.files)) if (under(f.path, old)) f.path = np + f.path.slice(old.length);
  ix.folders = ix.folders.map(p => under(p, old) ? np + p.slice(old.length) : p);
  addFolders(ix, np);
}
async function dropFiles(id, ix, list) {
  const withText = list.filter(fid => ix.files[fid].text);
  // one flaky storage call used to fail the whole delete with "server" (objects gone, index unchanged).
  // Now each object delete is retried; if a backend still refuses, the key is parked in ix.gc and retried by the next delete.
  const keys = [];
  for (const fid of list) { keys.push({ b: ix.files[fid].b, k: `${P(id)}/f/${fid}` }); if (ix.files[fid].text || ix.files[fid].note) keys.push({ b: null, k: `${P(id)}/t/${fid}.txt` }, { b: null, k: cKey(id, fid) }); }
  const old = (ix.gc || []).slice(0, 50); ix.gc = (ix.gc || []).slice(50);
  await delKeys(ix, [...keys, ...old]);
  if (withText.length) { const x = await bm(id); for (const fid of withText) bmRemove(x, fid); await cset(`${P(id)}/bm25.json`, x); await memDrop(id, withText).catch(() => {}); }
  for (const fid of list) delete ix.files[fid];
}
async function delKeys(ix, keys) {
  for (let i = 0; i < keys.length; i += 8) await Promise.all(keys.slice(i, i + 8).map(async it => {
    for (let n = 0; ; n++) {
      try { await (it.b === null ? storage : bk(it.b).st).del(it.k); if (it.b === null) tkeep(it.k, null); return; }
      catch (e) { if (n >= 2) { console.warn("pendrive: delete deferred", e.message); (ix.gc = ix.gc || []).push(it); return; } await new Promise(r => setTimeout(r, 300 * (n + 1))); }
    }
  }));
  if (ix.gc && ix.gc.length > 5000) ix.gc = ix.gc.slice(-5000);
}
async function dropFile(id, ix, fid) {
  await bk(ix.files[fid] && ix.files[fid].b).st.del(`${P(id)}/f/${fid}`);
  if (ix.files[fid] && ix.files[fid].text) {
    await tdel(`${P(id)}/t/${fid}.txt`); await tdel(cKey(id, fid)).catch(() => {});
    const x = await bm(id); bmRemove(x, fid); await cset(`${P(id)}/bm25.json`, x); await memDrop(id, [fid]).catch(() => {});
  }
  delete ix.files[fid];
}

const NOT_FOUND = { en: "Not found in your files. The selected files don't contain enough evidence to answer this, so I won't guess.", bn: "আপনার ফাইলে পাওয়া যায়নি। বেছে নেওয়া ফাইলগুলোতে এর উত্তরের যথেষ্ট প্রমাণ নেই, তাই আন্দাজে কিছু বলছি না।" };
const locLabel = l => !l ? "" : l.page ? `page ${l.page}` : l.sheet ? `sheet "${l.sheet}" rows ${l.r1}–${l.r2}` : l.h ? `section: ${l.h}` : "";
// retrieval for "ask": expanded BM25 (top 40) → optional embeddings/reranker → lexical rerank → top 6, numbered [n].
// Spreadsheet maths is computed here (rag.aggregate, no eval) and handed to the model as an exact, citable fact.
async function askCited(id, ix, all, withText, q, lang, fmt, emit, SYSX, skillNote, fast = null) {
  const x = await ragIndex(id, all, emit);
  const allowed = new Set(withText.map(f => f.id)); const ex = rag.expand(q, tokens);
  const hits = bmSearch(x, [...ex.base, ...ex.extra].join(" "), allowed, 40);
  const cache = {}; const getC = async fid => (cache[fid] = cache[fid] || await loadChunks(id, ix.files[fid]));
  const cands = [];
  for (const h of hits) { const c = (await getC(h.fid)).chunks[h.i]; if (c) cands.push({ ...h, chunk: c }); }
  const overview = rag.OVERVIEW.test(q);
  const memo = fast ? await memFill(id, withText, getC).catch(() => null) : null;
  if (overview && memo) { // Fast: the file cards from memory answer "what is in here" in one short call
    for (const f of withText.slice(0, 24)) if (memo.files[f.id] && !cands.some(c => c.fid === f.id)) cands.push({ fid: f.id, i: -1, s: 0, chunk: { t: "FILE CARD (from memory)\n" + memText(memo.files[f.id]), loc: null } });
  } else if (overview) for (const f of withText.slice(0, 8)) if (!cands.some(c => c.fid === f.id)) { const c = (await getC(f.id)).chunks[0]; if (c) cands.push({ fid: f.id, i: 0, s: 0, chunk: c }); }
  const how = fast ? "" : await rag.remoteScores(q, cands.slice(0, 30)); // Fast skips the remote re-ranker (a network round trip)
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
  const ev = []; let left = fast ? 9000 : JOB.askChars;
  if (agg) { const t = rag.aggText(agg); ev.push({ fid: agg.fid, loc: { sheet: agg.sheet, r1: agg.rows[0] || 0, r2: agg.rows[agg.rows.length - 1] || 0, rows: agg.rows.slice(0, 200) }, text: "COMPUTED: " + t, quote: "" }); left -= t.length; }
  for (const c of (overview ? cands : strong).slice(0, overview && memo ? 24 : fast ? (agg ? 4 : 5) : agg ? 5 : 6)) { if (left <= 200) break; const t = c.chunk.t.slice(0, left); left -= t.length; ev.push({ fid: c.fid, loc: c.chunk.loc, text: t, quote: rag.quote(t, q, tokens) }); }
  const cardIds = memo && !overview ? [...new Set(ev.map(e => e.fid))].filter(f => memo.files[f]).slice(0, 4) : [];
  const cardsTxt = cardIds.length ? `\nAbout these files (memory; for orientation only, cite the extracts):\n${cardIds.map(f => `- ${ix.files[f].path}: ${memText(memo.files[f]).replace(/\n/g, " · ")}`).join("\n")}\n` : "";
  const ctx = ev.map((e, i) => `[${i + 1}] [FILE: ${ix.files[e.fid].path}]${/^ocr/.test(ix.files[e.fid].note || "") ? " (image text, read by OCR)" : ""}${locLabel(e.loc) ? ` (${locLabel(e.loc)})` : ""}\n${e.text}`).join("\n\n");
  const rules = `\nRULES: Use only the numbered extracts. After each fact write the extract number in square brackets, like [1] or [2][3] (not file names). ${agg ? "Extract [1] is an exact COMPUTED value from the spreadsheet: give that number as the answer, do not recompute it. " : ""}${overview ? "This is an overview question: describe what the extracts contain." : "If the extracts do not answer the question, reply with exactly NOT_FOUND and nothing else."}`;
  let answer = await askAI(SYSX(lang), `Numbered file extracts:\n\n${ctx}\n${cardsTxt}${rules}\nQUESTION: ${q}${fmtRule(q, fmt)}`, skillNote ? 3600 : 1800, fast || {});
  if (!overview && /^\W*NOT_FOUND\W*$/.test(answer.trim()) || (/NOT_FOUND/.test(answer) && answer.length < 80)) return { notFound: true };
  answer = answer.replace(/\bNOT_FOUND\b/g, "");
  const used = new Set([...answer.matchAll(/\[(\d{1,2})\]/g)].map(m => Number(m[1])).filter(n => n >= 1 && n <= ev.length));
  const cites = ev.map((e, i) => ({ n: i + 1, id: e.fid, path: ix.files[e.fid].path, loc: e.loc, quote: e.quote, ocr: /^ocr/.test(ix.files[e.fid].note || "") || undefined })).filter(c => !used.size || used.has(c.n));
  return { answer, cites, sources: [...new Set(cites.map(c => c.path))] };
}

// Streams NDJSON: {type:"progress"} lines, then {type:"answer", text, sources, cites, actions}.
async function aiJob(req, res, id, body) {
  const q = String(body.question || "").slice(0, 2000).trim();
  if (!q) fail(400, "no_question");
  const lang = body.lang === "en" ? "en" : "bn";
  const fmt = ["auto", "table", "report", "letter"].includes(body.format) ? body.format : "auto";
  // optional skill + attachment note from the shared client module (plain text, capped).
  const skillNote = String(body.skillNote || "").replace(/[\u0000-\u0008]/g, "").slice(0, 4000);
  const SYSX = l => SYS(l) + skillNote;
  const ix = await index(id);
  const all = Object.values(ix.files).filter(f => f.state === "ok");
  const scope = body.scope || {};
  let inScope = all;
  if (Array.isArray(scope.ids) && scope.ids.length) { const s = new Set(scope.ids.map(String)); inScope = all.filter(f => s.has(f.id)); }
  else if (scope.folder) { const d = cleanPath(scope.folder); inScope = all.filter(f => under(f.path, d)); }
  if (typeof scope.branch === "string") { // branches are folders under "⎇/"; the default branch is everything else
    const r = scope.branch ? "⎇/" + cleanPath(scope.branch) : "";
    inScope = inScope.filter(f => r ? under(f.path, r) : !under(f.path, "⎇"));
  }
  res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  const emit = o => res.write(JSON.stringify(o) + "\n");
  if (typeof body.revise === "string" && body.revise.trim()) { // revise the current (maybe hand-edited) output with an instruction; no new retrieval
    try {
      emit({ type: "progress", msg: "revise" });
      const cur = body.revise.slice(0, 60000);
      const ans = await askAI(SYSX(lang), `CURRENT DOCUMENT (markdown; the user may have edited it by hand):\n\n${cur}\n\nINSTRUCTION: ${q}\n\nReturn the full revised document in markdown, nothing else. Apply the instruction; keep every other fact, number, table row and [n] citation unless the instruction says otherwise.${fmtRule(q, fmt)}`, 3600);
      const { text, actions: acts } = parseActions(ans); const actions = ensureImage(q, text, acts);
      emit({ type: "answer", text, sources: [], cites: [], actions, revised: true });
    } catch (e) { emit({ type: "error", error: e.code || "ai_failed" }); }
    return res.end();
  }
  const noText = inScope.filter(f => !f.text).map(f => f.path);
  const withText = inScope.filter(f => f.text);
  const scanned = inScope.filter(f => f.note === "scanned").map(f => f.path);
  const fastOn = body.fast === true && body.mode !== "analyse";
  const t0 = Date.now(); let tFirst = 0;
  const fast = fastOn ? { fast: true, meta: {}, onDelta: d => { if (!tFirst) tFirst = Date.now() - t0; emit({ type: "delta", text: d }); } } : null;
  const ck = fastOn ? acSig([q.toLowerCase().replace(/\s+/g, " "), lang, fmt, body.mode || "ask", skillNote], inScope) : "";
  const done = async o => { const total = Date.now() - t0; if (fastOn && !o.notFound && !o.cached) await acPut(id, ck, o).catch(e => console.warn("pendrive: answer cache", e.message)); emit({ ...o, ms: { first: tFirst || total, total }, fast: fastOn }); };
  try {
    if (fastOn && withText.length) { const hit = await acGet(id, ck).catch(() => null); if (hit) { emit({ type: "progress", msg: "cache" }); await done({ ...hit, cached: true }); return res.end(); } }
    if (!withText.length) {
      emit({ type: "answer", text: lang === "en" ? "The selected files have no text read yet. Use “🔍 Read text (OCR)” on the file row, then ask again." : "বেছে নেওয়া ফাইলের লেখা এখনও পড়া হয়নি। ফাইলের সারিতে “🔍 লেখা পড়ুন (OCR)” চাপুন, তারপর আবার জিজ্ঞাসা করুন।", sources: [], cites: [], actions: [], noText, scanned });
      return res.end();
    }
    const read = async f => ((await tget(`${P(id)}/t/${f.id}.txt`)) || "");
    let answer, sources, cites;
    const picked0 = (Array.isArray(scope.ids) && scope.ids.length) || withText.length <= 5;
    if (picked0 && withText.length <= 5 && IMAGE_OUT_RE.test(q) && /\b(all|whole|full|entire|every|exact)\b[^.?!]{0,40}\b(text|words|writing)\b|\b(text|words|writing) (of|from|in) (this|the|that|these)\b|সব লেখা|পুরো লেখা|লেখাগুলো/i.test(q)) {
      // "write all the text of this screenshot on a black image": copy the files' own text (OCR included) exactly, no AI rewording
      const parts = []; for (const f of withText) parts.push((await read(f)).replace(/^\s*\[Page \d+\]\s*$/gm, "").trim());
      const a = imageAction({ kind: /poster|notice|banner|পোস্টার/i.test(q) ? "poster" : "text", name: withText.length === 1 ? withText[0].path.split("/").pop().replace(/\.[^.]+$/, "") + " text" : "Text image", text: parts.join("\n\n").slice(0, 20000), ...imageColors(q) });
      const msg = lang === "en" ? `Here is all the text of ${withText.map(f => f.path.split("/").pop()).join(", ")} as an image (${a ? a.text.length : 0} characters, copied exactly).` : `${withText.map(f => f.path.split("/").pop()).join(", ")} ফাইলের সব লেখা ছবি করে দেওয়া হল (${a ? a.text.length : 0} অক্ষর, হুবহু)।`;
      await done({ type: "answer", text: msg, sources: withText.map(f => f.path), cites: [], actions: a ? [a] : [], noText, scanned });
      return res.end();
    }
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
      let r = await askCited(id, ix, all, withText, q, lang, fmt, emit, SYSX, skillNote, fast);
      // a format/accounts transform over files the user picked is not a fact lookup; give the AI their text instead of refusing.
      const transform = IMAGE_OUT_RE.test(q) || /excel|xlsx|spreadsheet|\bsheet\b|table|csv|json|convert|format|account|ledger|budget|expense|total|summar|translat|letter|হিসাব|এক্সেল|শিট|টেবিল|খরচ|মোট|সারাংশ|অনুবাদ|চিঠি/i.test(q) || /SKILL: (Excel|Drafting|Summary|Translation|Coding|Analysis)/.test(skillNote);
      const picked = (Array.isArray(scope.ids) && scope.ids.length) || withText.length <= 5;
      if (r.notFound && transform && picked) {
        emit({ type: "progress", msg: "transform" });
        let left = JOB.askChars; const parts = [];
        for (const f of withText.slice(0, 12)) { if (left <= 200) break; const t = (await read(f)).slice(0, left); left -= t.length; parts.push(`[FILE: ${f.path}]\n${t}`); }
        const ans = await askAI(SYSX(lang), `Selected files (full text):\n\n${parts.join("\n\n")}\n\nUse only these files. Keep every number exactly.\nQUESTION: ${q}${fmtRule(q, fmt)}`, skillNote ? 3600 : 1800);
        r = { answer: ans, sources: withText.slice(0, parts.length).map(f => f.path), cites: [] };
      }
      if (r.notFound) { emit({ type: "answer", text: NOT_FOUND[lang], sources: [], cites: [], actions: [], noText, notFound: true, scanned }); return res.end(); }
      ({ answer, sources, cites } = r);
    }
    if (wantsTable(q, fmt) && !hasMdTable(answer)) { // the model ignored the format: ask once more to reshape its own answer
      emit({ type: "progress", msg: "table" });
      try { const again = await askAI(SYS(lang), `Rewrite this answer so it includes a GitHub-style markdown table (header row, | --- | separator, one row per item). Keep every fact and every [file] citation; keep any pendrive-write block and any \`\`\`attachment block unchanged.\n\nANSWER:\n${answer}\n\nQUESTION: ${q}`, 2000); if (hasMdTable(again)) answer = again; } catch (e) { /* keep the first answer */ }
    }
    const { text, actions: acts } = parseActions(answer); const actions = ensureImage(q, text, acts);
    await done({ type: "answer", text, sources, cites: cites || [], actions, noText, scanned });
  } catch (e) {
    emit({ type: "error", error: e.code || "ai_failed" });
  }
  res.end();
}
export { HttpError };
// helpers for api/share.js (share links, upload-request links)
export const internals = { session, meta, index, cget, cset, withLock, bk, P, hex, scrypt, cleanPath, under, fail, aiJob, limitedKey: null };

// empty leftover automated-test pendrives. Only names starting "zz-test-" that are over 30 minutes old;
// every other pendrive is skipped before its files are read. Files and reservations go; the empty pendrive stays.
export async function gcTestPendrives({ minAgeMs = 30 * 60 * 1000 } = {}) {
  const st = (await cget("stats/usage.json")) || { by: {} }; const out = [];
  for (const [id, v] of Object.entries(st.by)) {
    if (!(v.u + v.r > 0)) continue;
    const m0 = await cget(`${P(id)}/meta.json`).catch(() => null);
    if (!m0 || !/^zz-test-/i.test(String(m0.name || "")) || Date.now() - (m0.created || 0) < minAgeMs) continue;
    try {
      await withLock(id, async () => {
        const [m, ix] = await Promise.all([meta(id), index(id)]);
        if (!/^zz-test-/i.test(String(m.name || ""))) return;
        for (const [k, p] of Object.entries(m.pending || {})) { try { await (p.single ? bk(p.b).st.del(`${P(id)}/f/${k}`) : bk(p.b).st.abortMultipart(`${P(id)}/f/${k}`, p.u)); } catch (e) { /* stale */ } }
        m.pending = {}; const n = Object.keys(ix.files).length;
        await dropFiles(id, ix, Object.keys(ix.files));
        ix.folders = []; m.used = 0;
        await saveIndex(id, ix); await saveMeta(id, m);
        out.push({ name: m.name, files: n });
      });
    } catch (e) { out.push({ name: m0.name, error: String(e.message || e).slice(0, 80) }); }
  }
  return out;
}
