// share links (/s/<id>) and upload-request links for AI Pendrive.
//   shares/<sid>.json              one link: what it shares, options, counters, recent activity
//   pendrives/<pid>/shares.json    { ids: [sid…] } so the owner can list their links
//   stats/egress.json              today's download bytes per storage backend and per pendrive (budgets)
// The receiver never sees the pendrive name, PIN or any file outside the link. File bytes still go browser <-> bucket
// through short-lived presigned URLs, so every URL we hand out is counted against the day's egress budget first.
import crypto from "node:crypto";
import * as pd from "./pendrive.js";

const X = pd.internals, { meta, index, cget, cset, withLock, bk, P, scrypt, cleanPath, under, fail } = X;
const env = process.env;
const SECRET = env.PENDRIVE_SECRET || crypto.randomBytes(32).toString("hex");
const MB = 1024 * 1024, GB = 1024 * MB;
const TOKEN_MS = 2 * 3600 * 1000;
const URL_S = 300;                       // presigned links for receivers live 5 minutes
const LOCK_TRIES = 5, LOCK_MS = 15 * 60 * 1000;
const EXPIRY = { "1d": 86400e3, "7d": 7 * 86400e3, "30d": 30 * 86400e3, never: 0 };
// Free egress allowances, checked 2026-10-26 (see README): B2 = 3× average stored per month (we budget 1 GB/day);
// Filebase free = 5 GB/month, then 403s (≈160 MB/day); Tigris and Coritan: egress free, budget on request count / fair use.
const EGRESS_DEFAULT = { b2: 1 * GB, backblaze: 1 * GB, filebase: 160 * MB, tigris: 5 * GB, coritan: 5 * GB, local: 5 * GB };
const egressCap = name => { const o = Number(env[`SHARE_EGRESS_${String(name).toUpperCase()}`]); return o > 0 ? o : (EGRESS_DEFAULT[name] ?? 1 * GB); };
const PD_DAILY = () => Number(env.SHARE_PD_DAILY_BYTES) > 0 ? Number(env.SHARE_PD_DAILY_BYTES) : 2 * GB;
const AI_DAILY = () => Number(env.SHARE_AI_DAILY) > 0 ? Number(env.SHARE_AI_DAILY) : 30;
const hex = n => crypto.randomBytes(n).toString("hex");
const day = () => new Date().toISOString().slice(0, 10);
const SKEY = sid => `shares/${sid}.json`;
const ipHash = req => crypto.createHmac("sha256", SECRET).update(clientIp(req)).digest("hex").slice(0, 8);
function clientIp(req) { return (String(req.headers["x-forwarded-for"] || "").split(",").map(x => x.trim()).filter(Boolean).pop() || "") || String(req.socket && req.socket.remoteAddress || "?"); }

/* ---------- rate limits (per IP, in memory) ---------- */
const hits = new Map();
function limited(req, bucket, max, ms = 60000) {
  const k = bucket + ":" + clientIp(req), now = Date.now(); let r = hits.get(k);
  if (!r || now - r.t > ms) { r = { n: 0, t: now }; hits.set(k, r); }
  if (hits.size > 20000) hits.clear();
  return ++r.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, r] of hits) if (now - r.t > 120000) hits.delete(k); }, 60000).unref();

/* ---------- egress budget ---------- */
let eg = null, egSave = null;
async function egress() { if (!eg || eg.d !== day()) { const s = await cget("stats/egress.json"); eg = s && s.d === day() ? s : { d: day(), b: {}, p: {} }; } return eg; }
async function spend(pid, files) { // files: [{b, size}] → throws 503 busy when a budget would be passed
  const e = await egress(); const add = {}; let tot = 0;
  for (const f of files) { const b = bk(f.b); add[b.id] = (add[b.id] || 0) + f.size; tot += f.size; }
  for (const [id, n] of Object.entries(add)) { const b = bk(id); if ((e.b[id] || 0) + n > egressCap(b.name)) fail(503, "busy", { why: "backend" }); }
  if ((e.p[pid] || 0) + tot > PD_DAILY()) fail(503, "busy", { why: "pendrive" });
  for (const [id, n] of Object.entries(add)) e.b[id] = (e.b[id] || 0) + n;
  e.p[pid] = (e.p[pid] || 0) + tot;
  clearTimeout(egSave); egSave = setTimeout(() => cset("stats/egress.json", e).catch(() => {}), 1500);
}
export async function egressStatus() { const e = await egress(); return pd.pool.map(b => ({ name: b.name, used: e.b[b.id] || 0, cap: egressCap(b.name) })); }

/* ---------- tokens for receivers ---------- */
function issue(sid, pv) { const body = Buffer.from(JSON.stringify({ s: sid, v: pv, exp: Date.now() + TOKEN_MS })).toString("base64url"); return body + "." + crypto.createHmac("sha256", SECRET).update("share|" + body).digest("base64url"); }
function check(tok, rec) {
  const [body, sig] = String(tok || "").split("."); if (!body || !sig) return false;
  const want = crypto.createHmac("sha256", SECRET).update("share|" + body).digest("base64url");
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return false;
  try { const s = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); return s.s === rec.sid && s.v === (rec.pw ? rec.pw.salt : "") && s.exp > Date.now(); } catch (e) { return false; }
}

/* ---------- what a link shows ---------- */
// The tree is rebuilt from the live index every time, so renames inside a shared folder show up and deleted files vanish.
function view(rec, ix) {
  const files = new Map(), dirs = new Set();
  for (const id of rec.ids || []) { const f = ix.files[id]; if (f && f.state === "ok") files.set(f.id, { f, rel: f.path.slice(f.path.lastIndexOf("/") + 1) }); }
  for (const d of rec.folders || []) {
    const cut = d.lastIndexOf("/") + 1; if (!ix.folders.includes(d) && !Object.values(ix.files).some(f => under(f.path, d))) continue;
    dirs.add(d.slice(cut));
    for (const sub of ix.folders) if (sub.startsWith(d + "/")) dirs.add(sub.slice(cut));
    for (const f of Object.values(ix.files)) if (f.state === "ok" && f.path.startsWith(d + "/")) files.set(f.id, { f, rel: f.path.slice(cut) });
  }
  return { files, dirs };
}
const pub = (rec, extra = {}) => ({ sid: rec.sid, kind: rec.kind, title: rec.title, created: rec.created, expires: rec.expires, maxDl: rec.maxDl, dl: rec.dl, bytes: rec.bytes,
  password: !!rec.pw, ai: !!rec.ai, revoked: !!rec.revoked, ids: rec.ids, folders: rec.folders, up: rec.up || null, events: (rec.events || []).slice(-50).reverse(), ...extra });
const dead = rec => rec.revoked ? "revoked" : rec.expires && rec.expires < Date.now() ? "expired" : rec.kind === "share" && rec.maxDl && rec.dl >= rec.maxDl ? "limit" : "";
function event(rec, req, a, name, size) { rec.events = rec.events || []; rec.events.push({ t: Date.now(), a, n: String(name || "").slice(0, 120), s: size || 0, ip: ipHash(req) }); if (rec.events.length > 200) rec.events = rec.events.slice(-200); }
async function load(sid) { if (!/^[a-f0-9]{32}$/.test(String(sid || ""))) fail(404, "not_found"); const r = await cget(SKEY(sid)); if (!r) fail(404, "not_found"); return r; }

/* ---------- owner ops: /api/pd/share/* (pendrive session) ---------- */
export async function owner(req, op, body, send) {
  const pid = X.session(req);
  const listKey = `${P(pid)}/shares.json`;
  if (op === "share/create") {
    const kind = body.kind === "upload" ? "upload" : "share";
    const ix = await index(pid);
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).filter(id => ix.files[id] && ix.files[id].state === "ok").slice(0, 2000);
    const folders = (Array.isArray(body.folders) ? body.folders : []).map(f => cleanPath(f)).slice(0, 200);
    let up = null;
    if (kind === "upload") {
      const folder = cleanPath(body.folder || "Received", true) || "Received";
      up = { folder, maxFiles: Math.min(1000, Math.max(1, Number(body.maxFiles) || 50)), maxBytes: Math.min(5 * GB, Math.max(1, Number(body.maxBytes) || 500 * MB)), count: 0, bytes: 0 };
    } else if (!ids.length && !folders.length) fail(400, "nothing_shared");
    const exp = Object.prototype.hasOwnProperty.call(EXPIRY, body.expiry) ? EXPIRY[body.expiry] : EXPIRY["7d"];
    let pw = null;
    if (body.password) { const p = String(body.password); if (p.length < 4 || p.length > 100) fail(400, "bad_password"); const salt = hex(16); pw = { salt, hash: await scrypt(p, salt) }; }
    const rec = { v: 1, sid: hex(16), pid, kind, title: String(body.title || "").slice(0, 120), created: Date.now(), expires: exp ? Date.now() + exp : 0,
      maxDl: Math.max(0, Math.min(100000, Number(body.maxDl) || 0)), dl: 0, bytes: 0, pw, ai: kind === "share" && body.ai === true, revoked: false, fails: 0, lockUntil: 0, ids, folders, up, events: [] };
    await cset(SKEY(rec.sid), rec);
    await withLock("shares:" + pid, async () => { const l = (await cget(listKey)) || { ids: [] }; l.ids.push(rec.sid); await cset(listKey, l); });
    return send(200, pub(rec, { url: "/s/" + rec.sid }));
  }
  if (op === "share/list") {
    const l = (await cget(listKey)) || { ids: [] }; const out = [];
    for (const sid of l.ids.slice(-200)) { const r = await cget(SKEY(sid)); if (r && r.pid === pid) out.push(pub(r, { state: dead(r) || "active", url: "/s/" + sid })); }
    const e = await egress(); return send(200, { shares: out.reverse(), egress: { backends: await egressStatus(), pendrive: { used: e.p[pid] || 0, cap: PD_DAILY() } } });
  }
  const rec = await load(body.sid); if (rec.pid !== pid) fail(404, "not_found");
  if (op === "share/revoke") return withLock("share:" + rec.sid, async () => { const r = await load(rec.sid); r.revoked = true; await cset(SKEY(r.sid), r); send(200, pub(r, { state: "revoked" })); });
  if (op === "share/get") return send(200, pub(rec, { state: dead(rec) || "active", url: "/s/" + rec.sid }));
  fail(404, "unknown");
}

/* ---------- receiver ops: /api/s/<op> (no login) ---------- */
export async function receiver(req, res, op, body, send) {
  if (limited(req, "s", 120)) fail(429, "too_many_requests");
  const rec = await load(body.sid);
  const why = dead(rec); if (why) fail(410, why);
  if (op === "open") {
    if (limited(req, "s-open", 20)) fail(429, "too_many_requests");
    if (rec.pw) {
      if (rec.lockUntil > Date.now()) fail(423, "locked", { retryAfter: Math.ceil((rec.lockUntil - Date.now()) / 1000) });
      if (!body.password) return send(200, { need: "password", kind: rec.kind, title: rec.title });
      const h = await scrypt(String(body.password).slice(0, 100), rec.pw.salt);
      if (!crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(rec.pw.hash, "hex"))) {
        return withLock("share:" + rec.sid, async () => { const r = await load(rec.sid); r.fails = (r.fails || 0) + 1; if (r.fails >= LOCK_TRIES) { r.fails = 0; r.lockUntil = Date.now() + LOCK_MS; } await cset(SKEY(r.sid), r); fail(r.lockUntil > Date.now() ? 423 : 401, r.lockUntil > Date.now() ? "locked" : "wrong", { left: LOCK_TRIES - r.fails }); });
      }
      if (rec.fails) await withLock("share:" + rec.sid, async () => { const r = await load(rec.sid); r.fails = 0; await cset(SKEY(r.sid), r); });
    }
    return send(200, { token: issue(rec.sid, rec.pw ? rec.pw.salt : ""), ...(await describe(rec)) });
  }
  if (!check(body.token, rec)) fail(401, "need_password");
  if (op === "tree") return send(200, await describe(rec));
  if (rec.kind === "upload") return upload(req, rec, op, body, send);
  const ix = await index(rec.pid); const v = view(rec, ix);
  if (op === "url") { // one file: preview (inline) or download
    const it = v.files.get(String(body.id)); if (!it) fail(404, "not_found");
    const { f } = it; const inline = !!body.inline;
    if (!inline && limited(req, "s-dl", 60)) fail(429, "too_many_requests");
    return withLock("share:" + rec.sid, async () => {
      const r = await load(rec.sid); if (dead(r)) fail(410, dead(r));
      await spend(rec.pid, [{ b: f.b, size: inline ? Math.min(f.size, Number(body.range) > 0 ? Number(body.range) : f.size) : f.size }]);
      if (!inline) { r.dl++; r.bytes += f.size; event(r, req, "download", it.rel, f.size); await cset(SKEY(r.sid), r); }
      const type = inline ? previewType(f) : "";
      send(200, { url: await bk(f.b).st.presignGet(`${P(rec.pid)}/f/${f.id}`, inline ? "" : it.rel.slice(it.rel.lastIndexOf("/") + 1), { type, expires: URL_S }), type, size: f.size });
    });
  }
  if (op === "zip") { // all (or some) files as one ZIP built in the receiver's browser
    if (limited(req, "s-dl", 60)) fail(429, "too_many_requests");
    const want = Array.isArray(body.ids) && body.ids.length ? body.ids.map(String) : [...v.files.keys()];
    const list = want.map(id => v.files.get(id)).filter(Boolean).slice(0, 2000);
    return withLock("share:" + rec.sid, async () => {
      const r = await load(rec.sid); if (dead(r)) fail(410, dead(r));
      const tot = list.reduce((a, x) => a + x.f.size, 0);
      await spend(rec.pid, list.map(x => ({ b: x.f.b, size: x.f.size })));
      r.dl++; r.bytes += tot; event(r, req, "zip", `${list.length} files`, tot); await cset(SKEY(r.sid), r);
      const urls = {}; for (const x of list) urls[x.f.id] = await bk(x.f.b).st.presignGet(`${P(rec.pid)}/f/${x.f.id}`, "", { expires: 3600 });
      send(200, { urls });
    });
  }
  if (op === "ai") {
    if (!rec.ai) fail(403, "ai_off");
    if (limited(req, "s-ai", 6)) fail(429, "too_many_requests");
    await withLock("share:" + rec.sid, async () => { const r = await load(rec.sid); r.aiDay = r.aiDay && r.aiDay.d === day() ? r.aiDay : { d: day(), n: 0 }; if (r.aiDay.n >= AI_DAILY()) fail(429, "ai_budget"); r.aiDay.n++; event(r, req, "ai", String(body.question || "").slice(0, 80)); await cset(SKEY(r.sid), r); });
    const ids = [...v.files.keys()]; if (!ids.length) fail(404, "not_found");
    const names = new Map([...v.files.values()].map(x => [x.f.path, x.rel]));
    return shareAi(req, res, rec.pid, { question: body.question, lang: body.lang, mode: "ask", scope: { ids } }, names);
  }
  fail(404, "unknown");
}
// The AI answers only from the shared files; any pendrive-write actions are dropped and paths are shown relative to the link.
async function shareAi(req, res, pid, body, names) {
  const fake = { write: s => { for (const line of String(s).split("\n")) { if (!line) continue; let o; try { o = JSON.parse(line); } catch (e) { continue; }
    if (o.type === "answer") { o.actions = []; o.sources = (o.sources || []).map(p => names.get(p) || "").filter(Boolean); o.noText = (o.noText || []).map(p => names.get(p) || "").filter(Boolean); o.scanned = (o.scanned || []).map(p => names.get(p) || "").filter(Boolean); o.cites = (o.cites || []).filter(c => names.has(c.path)).map(c => ({ ...c, path: names.get(c.path) })); let t = String(o.text || ""); for (const [p, r] of names) t = t.split(p).join(r); o.text = t; }
    if (o.type === "progress") o = { type: "progress" };
    res.write(JSON.stringify(o) + "\n"); } }, end: () => res.end(), writeHead: (...a) => res.writeHead(...a), get headersSent() { return res.headersSent; } };
  return X.aiJob(req, fake, pid, body);
}
function previewType(f) {
  const ext = (f.path.split(".").pop() || "").toLowerCase();
  const T = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "text/plain; charset=utf-8", mp4: "video/mp4", webm: "video/webm", mov: "video/mp4", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4" };
  return T[ext] || "application/octet-stream"; // text/docx/xlsx are fetched as bytes and rendered by the page
}
async function describe(rec) {
  const base = { kind: rec.kind, title: rec.title, expires: rec.expires, ai: !!rec.ai };
  if (rec.kind === "upload") { const u = rec.up; return { ...base, up: { maxFiles: u.maxFiles, maxBytes: u.maxBytes, count: u.count, left: Math.max(0, u.maxFiles - u.count) } }; }
  const ix = await index(rec.pid); const v = view(rec, ix);
  const files = [...v.files.values()].map(({ f, rel }) => ({ id: f.id, path: rel, size: f.size, mtime: f.mtime, type: f.type, text: !!f.text })).sort((a, b) => a.path.localeCompare(b.path));
  return { ...base, files, folders: [...v.dirs].sort(), maxDl: rec.maxDl, left: rec.maxDl ? Math.max(0, rec.maxDl - rec.dl) : null };
}

/* ---------- upload-request links ---------- */
// The receiver drives the normal upload/init → parts → complete flow, but on a fixed set of ops, inside one folder,
// with a file-size limit and a file-count limit. Resume: the page keeps fileId/uploadId and asks upload/parts again.
async function upload(req, rec, op, body, send) {
  if (limited(req, "s-up", 600)) fail(429, "too_many_requests");
  const call = async (pop, b) => { let out; await pd.handle({ headers: {}, pdAs: rec.pid, socket: req.socket }, null, new URL("http://share.local/api/pd/" + pop), b, (s, j) => { out = { s, j }; }); if (out.s !== 200) fail(out.s, out.j.error || "server", out.j); return out.j; };
  const u = rec.up;
  if (op === "up-init") {
    const size = Math.floor(Number(body.size)); if (!(size >= 0)) fail(400, "bad_size");
    if (size > u.maxBytes) fail(413, "file_too_big", { max: u.maxBytes });
    const name = String(body.name || "").normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "_").trim().slice(0, 150) || "file";
    return withLock("share:" + rec.sid, async () => {
      const r = await load(rec.sid); if (r.up.count + (r.up.open || 0) >= r.up.maxFiles) fail(409, "upload_limit");
      const ix = await index(rec.pid); let p = `${u.folder}/${name}`, n = 1;
      const taken = q => Object.values(ix.files).some(f => f.state === "ok" && f.path === q) || ix.folders.includes(q);
      while (taken(p) && n < 999) { n++; const dot = name.lastIndexOf("."); p = `${u.folder}/${dot > 0 ? name.slice(0, dot) + ` (${n})` + name.slice(dot) : name + ` (${n})`}`; }
      const j = await call("upload/init", { path: p, size, type: String(body.type || "").slice(0, 100), multipart: size >= 16 * MB });
      r.up.open = (r.up.open || 0) + 1; r.up.pend = r.up.pend || {}; r.up.pend[j.fileId] = { t: Date.now(), size, name: p.slice(u.folder.length + 1) };
      for (const [k, v] of Object.entries(r.up.pend)) if (Date.now() - v.t > 2 * 86400e3) { delete r.up.pend[k]; r.up.open = Math.max(0, r.up.open - 1); }
      await cset(SKEY(r.sid), r); send(200, j);
    });
  }
  const mine = () => { if (!rec.up.pend || !rec.up.pend[String(body.fileId)]) fail(404, "no_upload"); };
  if (op === "up-parts") { mine(); return send(200, await call("upload/parts", { fileId: body.fileId, uploadId: body.uploadId, parts: body.parts })); }
  if (op === "up-abort") { mine(); const j = await call("upload/abort", { fileId: body.fileId, uploadId: body.uploadId }); await withLock("share:" + rec.sid, async () => { const r = await load(rec.sid); if (r.up.pend && r.up.pend[body.fileId]) { delete r.up.pend[body.fileId]; r.up.open = Math.max(0, (r.up.open || 1) - 1); } await cset(SKEY(r.sid), r); }); return send(200, j); }
  if (op === "up-complete") {
    mine();
    const j = await call("upload/complete", { fileId: body.fileId, uploadId: body.uploadId, parts: body.parts });
    await withLock("share:" + rec.sid, async () => { const r = await load(rec.sid); const pe = r.up.pend && r.up.pend[body.fileId]; if (pe) { delete r.up.pend[body.fileId]; r.up.open = Math.max(0, (r.up.open || 1) - 1); r.up.count++; r.up.bytes += pe.size; event(r, req, "upload", pe.name, pe.size); } await cset(SKEY(r.sid), r); });
    return send(200, { ok: true, path: String(j.path || "").slice(u.folder.length + 1) });
  }
  fail(404, "unknown");
}
