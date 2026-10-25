// AI Pendrive: a shared folder that anyone with its name + PIN can open, stored in R2.
// No database: everything is JSON in the bucket.
//   names/<sha256(normalized name)>.json  -> { id }
//   pendrives/<id>/meta.json   name, scrypt PIN hash + salt, quota, used bytes, lockout
//   pendrives/<id>/index.json  files (by id, with their path) and empty folders
//   pendrives/<id>/f/<fileId>  file bytes (uploaded by the browser straight to R2)
//   pendrives/<id>/t/<fileId>.txt  text extracted in the browser
//   pendrives/<id>/bm25.json   keyword index over text chunks
// Renames and moves only change index.json; the stored bytes never move.
import crypto from "node:crypto";
import { makeStorage } from "./storage.js";

const env = process.env;
let SECRET = env.PENDRIVE_SECRET || "";
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("PENDRIVE_SECRET is not set: using a random one, so pendrive sessions end when the server restarts.");
}
export const storage = makeStorage(env, SECRET);
const QUOTA = Math.max(1, Number(env.PENDRIVE_QUOTA_BYTES) || 2 * 1024 ** 3);
const MAX_FILE = Math.max(1, Number(env.PENDRIVE_MAX_FILE_BYTES) || 2 * 1024 ** 3);
const PART = 10 * 1024 * 1024;              // 10 MB parts; 2 GB = 205 parts (S3 allows 10,000)
const SESSION_MS = 12 * 3600 * 1000;
const LOCK_TRIES = 5, LOCK_MS = 15 * 60 * 1000;
const TEXT_MAX = 2 * 1024 * 1024;           // per-file extracted text kept for the AI
const CHUNK = 1500;
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
async function meta(id) { const m = await storage.getJson(`${P(id)}/meta.json`); if (!m) fail(404, "not_found"); return m; }
async function index(id) { return (await storage.getJson(`${P(id)}/index.json`)) || { files: {}, folders: [] }; }
const saveMeta = (id, m) => storage.putJson(`${P(id)}/meta.json`, m);
const saveIndex = (id, x) => storage.putJson(`${P(id)}/index.json`, x);
const publicMeta = m => ({ name: m.name, quota: m.quota, used: m.used, reserved: Object.values(m.pending || {}).reduce((a, b) => a + b.size, 0) });
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
const chunksOf = text => { const out = []; for (let i = 0; i < text.length && out.length < 2000; i += CHUNK) out.push(text.slice(i, i + CHUNK + 200)); return out; };
async function bm(id) { return (await storage.getJson(`${P(id)}/bm25.json`)) || { df: {}, n: 0, len: 0, files: {} }; }
function bmRemove(x, fileId) {
  const f = x.files[fileId]; if (!f) return;
  for (const c of f) { for (const t of Object.keys(c.tf)) { x.df[t] -= 1; if (x.df[t] <= 0) delete x.df[t]; } x.n -= 1; x.len -= c.l; }
  delete x.files[fileId];
}
function bmAdd(x, fileId, text) {
  bmRemove(x, fileId);
  x.files[fileId] = chunksOf(text).map(c => {
    const tf = {}; const tk = tokens(c);
    for (const t of tk) tf[t] = (tf[t] || 0) + 1;
    for (const t of Object.keys(tf)) x.df[t] = (x.df[t] || 0) + 1;
    x.n += 1; x.len += tk.length;
    return { tf, l: tk.length };
  });
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
  let out = `MOCK answer from ${files.length} source(s): ${files.join(", ")}`;
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

  const id = session(req);
  if (op === "list") {
    const [m, ix] = await Promise.all([meta(id), index(id)]);
    const files = Object.values(ix.files).filter(f => f.state === "ok").map(({ id, path, size, type, mtime, text }) => ({ id, path, size, type, mtime, text }));
    return send(200, { ...publicMeta(m), files, folders: ix.folders.slice().sort() });
  }
  if (op === "download") {
    const ix = await index(id); const f = ix.files[String(body.id)];
    if (!f || f.state !== "ok") fail(404, "not_found");
    return send(200, { url: await storage.presignGet(`${P(id)}/f/${f.id}`, body.inline ? "" : baseOf(f.path)) });
  }
  if (op === "text-get") {
    const ix = await index(id); const f = ix.files[String(body.id)];
    if (!f || !f.text) fail(404, "not_found");
    return send(200, { text: ((await storage.getText(`${P(id)}/t/${f.id}.txt`)) || "").slice(0, 200000) });
  }

  if (op === "upload/init") {
    const p = cleanPath(body.path); const size = Math.floor(Number(body.size));
    if (!(size >= 0) || size > MAX_FILE) fail(413, "file_too_big", { max: MAX_FILE });
    const type = String(body.type || "application/octet-stream").slice(0, 100);
    return withLock(id, async () => {
      const [m, ix] = await Promise.all([meta(id), index(id)]);
      const same = Object.values(ix.files).find(f => f.state === "ok" && f.path === p);
      if (ix.folders.includes(p)) fail(409, "exists");
      if (same && !body.overwrite) fail(409, "exists", { id: same.id });
      const reserved = Object.values(m.pending || {}).reduce((a, b) => a + b.size, 0);
      const freed = same ? same.size : 0;
      if (m.used - freed + reserved + size > m.quota) fail(413, "quota", { quota: m.quota, used: m.used, reserved });
      const fileId = hex(12);
      const uploadId = await storage.createMultipart(`${P(id)}/f/${fileId}`, type);
      m.pending = m.pending || {};
      for (const [k, v] of Object.entries(m.pending)) if (Date.now() - v.t > 24 * 3600 * 1000) delete m.pending[k]; // stale reservations
      m.pending[fileId] = { size, t: Date.now(), uploadId, path: p, type, replaces: same && body.overwrite ? same.id : "" };
      await saveMeta(id, m);
      return send(200, { fileId, uploadId, partSize: PART, parts: Math.max(1, Math.ceil(size / PART)) });
    });
  }
  if (op === "upload/parts") {
    const m = await meta(id); const pend = (m.pending || {})[String(body.fileId)];
    if (!pend || pend.uploadId !== body.uploadId) fail(404, "no_upload");
    const total = Math.max(1, Math.ceil(pend.size / PART));
    const ns = (Array.isArray(body.parts) ? body.parts : []).map(Number).filter(n => n >= 1 && n <= total).slice(0, 50);
    const urls = {};
    for (const n of ns) urls[n] = await storage.presignPart(`${P(id)}/f/${body.fileId}`, pend.uploadId, n);
    return send(200, { urls });
  }
  if (op === "upload/complete") {
    return withLock(id, async () => {
      const [m, ix] = await Promise.all([meta(id), index(id)]);
      const fid = String(body.fileId); const pend = (m.pending || {})[fid];
      if (!pend || pend.uploadId !== body.uploadId) fail(404, "no_upload");
      const parts = (Array.isArray(body.parts) ? body.parts : []).map(p => ({ n: Number(p.n), etag: String(p.etag || "") })).filter(p => p.n >= 1 && p.etag);
      const key = `${P(id)}/f/${fid}`;
      await storage.completeMultipart(key, pend.uploadId, parts);
      const h = await storage.head(key);
      delete m.pending[fid];
      if (!h || h.size !== pend.size) { await storage.del(key); await saveMeta(id, m); fail(400, "size_mismatch"); }
      let p = pend.path;
      if (pend.replaces && ix.files[pend.replaces]) { m.used -= ix.files[pend.replaces].size; await dropFile(id, ix, pend.replaces); }
      else if (pathTaken(ix, p)) { const dot = p.lastIndexOf("."); const stem = dot > p.lastIndexOf("/") ? p.slice(0, dot) : p; const ext = dot > p.lastIndexOf("/") ? p.slice(dot) : ""; let k = 2; while (pathTaken(ix, `${stem} (${k})${ext}`)) k++; p = `${stem} (${k})${ext}`; }
      m.used += h.size;
      ix.files[fid] = { id: fid, path: p, size: h.size, type: pend.type, mtime: Date.now(), text: false, state: "ok" };
      if (parentOf(p)) addFolders(ix, parentOf(p));
      await saveIndex(id, ix); await saveMeta(id, m);
      return send(200, { id: fid, path: p, ...publicMeta(m) });
    });
  }
  if (op === "upload/abort") {
    return withLock(id, async () => {
      const m = await meta(id); const fid = String(body.fileId); const pend = (m.pending || {})[fid];
      if (pend) { try { await storage.abortMultipart(`${P(id)}/f/${fid}`, pend.uploadId); } catch (e) { /* ignore */ } delete m.pending[fid]; await saveMeta(id, m); }
      return send(200, { ok: true });
    });
  }
  if (op === "text") {
    const text = String(body.text || "").slice(0, TEXT_MAX);
    return withLock(id, async () => {
      const ix = await index(id); const f = ix.files[String(body.id)];
      if (!f) fail(404, "not_found");
      await storage.putText(`${P(id)}/t/${f.id}.txt`, text);
      const x = await bm(id); bmAdd(x, f.id, text); await storage.putJson(`${P(id)}/bm25.json`, x);
      f.text = text.length > 0; f.note = String(body.note || "").slice(0, 80); await saveIndex(id, ix);
      return send(200, { ok: true });
    });
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
      for (const fid of ids) { const f = ix.files[fid]; if (!f) continue; freed += f.size; await dropFile(id, ix, fid); }
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
async function dropFile(id, ix, fid) {
  await storage.del(`${P(id)}/f/${fid}`);
  if (ix.files[fid] && ix.files[fid].text) {
    await storage.del(`${P(id)}/t/${fid}.txt`);
    const x = await bm(id); bmRemove(x, fid); await storage.putJson(`${P(id)}/bm25.json`, x);
  }
  delete ix.files[fid];
}

// Streams NDJSON: {type:"progress"} lines, then {type:"answer", text, sources, actions}.
async function aiJob(req, res, id, body) {
  const q = String(body.question || "").slice(0, 2000).trim();
  if (!q) fail(400, "no_question");
  const lang = body.lang === "en" ? "en" : "bn";
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
  try {
    if (!withText.length) {
      emit({ type: "answer", text: lang === "en" ? "None of the selected files has readable text. Scanned images need OCR, which isn't supported yet." : "বেছে নেওয়া ফাইলে পড়ার মতো লেখা নেই। স্ক্যান করা ছবি পড়তে OCR লাগে, সেটা এখনও নেই।", sources: [], actions: [], noText });
      return res.end();
    }
    const read = async f => ((await storage.getText(`${P(id)}/t/${f.id}.txt`)) || "");
    let answer, sources;
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
        notes.push(await askAI(SYS("en"), `Make short factual notes for this task, keeping file names in [brackets].\nTASK: ${q}\n\n${ctx}\n\nQUESTION: notes only`, 900));
      }
      emit({ type: "progress", step: used.length + 1, of: used.length + 1, msg: "combine" });
      const skipped = withText.length - used.flat().length;
      answer = await askAI(SYS(lang), `Notes made from the files (each fact has its file name):\n\n${notes.map((n, i) => `[FILE: notes ${i + 1}]\n${n}`).join("\n\n")}\n\n${used.flat().map(x => `[FILE: ${x.f.path}]`).join(" ")}\n${skipped > 0 ? `(${skipped} more files were not read because of the job limit; say so.)\n` : ""}\nQUESTION: ${q}`, 2000);
      sources = used.flat().map(x => x.f.path);
    } else {
      const x = await bm(id);
      let hits = bmSearch(x, q, new Set(withText.map(f => f.id)), 10);
      if (!hits.length) hits = withText.slice(0, 4).map(f => ({ fid: f.id, i: 0 })); // nothing matched: start of each file
      emit({ type: "progress", msg: `chunks ${hits.length}` });
      const texts = {}; let ctx = "", left = JOB.askChars;
      for (const h of hits) {
        const f = ix.files[h.fid]; if (!f || left <= 0) continue;
        texts[h.fid] = texts[h.fid] ?? await read(f);
        const part = texts[h.fid].slice(h.i * CHUNK, h.i * CHUNK + CHUNK + 200).slice(0, left);
        ctx += `[FILE: ${f.path}]\n${part}\n\n`; left -= part.length;
      }
      sources = [...new Set(hits.map(h => ix.files[h.fid] && ix.files[h.fid].path).filter(Boolean))];
      answer = await askAI(SYS(lang), `File extracts:\n\n${ctx}\nQUESTION: ${q}`, 1800);
    }
    const { text, actions } = parseActions(answer);
    emit({ type: "answer", text, sources, actions, noText });
  } catch (e) {
    emit({ type: "error", error: e.code || "ai_failed" });
  }
  res.end();
}
export { HttpError };
