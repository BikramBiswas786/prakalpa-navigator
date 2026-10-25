// Storage adapters for AI Pendrive. Zero dependencies: SigV4 is done with node:crypto.
//
// Interface (every method is async):
//   getJson(key) -> object | null        putJson(key, obj)
//   getText(key) -> string | null        putText(key, text)
//   head(key) -> { size } | null         del(key)
//   createMultipart(key, type) -> uploadId
//   presignPart(key, uploadId, partNumber) -> url   (browser PUTs the bytes there)
//   completeMultipart(key, uploadId, parts[{n, etag}])   abortMultipart(key, uploadId)
//   presignGet(key, filename) -> url
//   origin -> the origin the browser talks to (for the CSP connect-src), or "" for same-origin
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const sha256hex = b => crypto.createHash("sha256").update(b).digest("hex");
const hmac = (k, s) => crypto.createHmac("sha256", k).update(s).digest();
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const encPath = p => p.split("/").map(enc).join("/");
// Keys are built only by api/pendrive.js from hex ids; refuse anything else.
const SAFE_KEY = /^pendrives\/[a-f0-9]{24}\/[a-z0-9._\/-]{1,200}$|^names\/[a-f0-9]{64}\.json$|^stats\/usage\.json$/;
function checkKey(key) { if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error("bad key"); return key; }

/* ---------------- Any S3-compatible store (Backblaze B2, Cloudflare R2, versitygw, MinIO) ---------------- */
// Config: S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET (optional S3_ADDRESSING=path|virtual).
// Fallback alias: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET (endpoint built from the account id, region "auto").
export function s3Config(env) {
  if (env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    const endpoint = env.S3_ENDPOINT.replace(/\/+$/, "");
    // B2 endpoints look like https://s3.<region>.backblazeb2.com; derive the region if it isn't given.
    const region = env.S3_REGION || ((endpoint.match(/s3\.([a-z0-9-]+)\.backblazeb2\.com/) || [])[1]) || "us-east-1";
    return { provider: /backblazeb2\.com/.test(endpoint) ? "b2" : "s3", endpoint, region, bucket: env.S3_BUCKET, ak: env.S3_ACCESS_KEY_ID, sk: env.S3_SECRET_ACCESS_KEY, addressing: env.S3_ADDRESSING === "virtual" ? "virtual" : "path" };
  }
  if (env.R2_BUCKET && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && (env.R2_ACCOUNT_ID || env.R2_ENDPOINT)) {
    return { provider: "r2", endpoint: (env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/+$/, ""), region: env.R2_REGION || "auto", bucket: env.R2_BUCKET, ak: env.R2_ACCESS_KEY_ID, sk: env.R2_SECRET_ACCESS_KEY, addressing: "path" };
  }
  return null;
}
export class S3Storage {
  constructor(env) {
    const c = env.endpoint ? env : s3Config(env);
    if (!c) throw new Error("S3 storage not configured");
    Object.assign(this, { provider: c.provider, region: c.region, bucket: c.bucket, ak: c.ak, sk: c.sk, addressing: c.addressing });
    const u = new URL(c.endpoint);
    if (this.addressing === "virtual") u.host = `${this.bucket}.${u.host}`;
    this.endpoint = u.origin + u.pathname.replace(/\/+$/, "");
    this.origin = u.origin;   // what the browser connects to (CSP connect-src)
    this.host = u.host;
  }
  scope(date) { return `${date.slice(0, 8)}/${this.region}/s3/aws4_request`; }
  signingKey(date) {
    let k = hmac("AWS4" + this.sk, date.slice(0, 8));
    k = hmac(k, this.region); k = hmac(k, "s3"); return hmac(k, "aws4_request");
  }
  static amzDate(d = new Date()) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  canonicalQuery(q) { return Object.keys(q).sort().map(k => `${enc(k)}=${enc(String(q[k]))}`).join("&"); }
  // key "" = the bucket itself (used by scripts/set-b2-cors.js)
  uri(key) {
    if (key === "") return this.addressing === "virtual" ? "/" : `/${enc(this.bucket)}`;
    const k = encPath(checkKey(key));
    return this.addressing === "virtual" ? `/${k}` : `/${enc(this.bucket)}/${k}`;
  }

  presign(method, key, query = {}, expires = 3600) {
    const date = S3Storage.amzDate();
    const q = { ...query, "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${this.ak}/${this.scope(date)}`, "X-Amz-Date": date, "X-Amz-Expires": String(expires), "X-Amz-SignedHeaders": "host" };
    const cq = this.canonicalQuery(q);
    const creq = [method, this.uri(key), cq, `host:${this.host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
    const sts = ["AWS4-HMAC-SHA256", date, this.scope(date), sha256hex(creq)].join("\n");
    const sig = crypto.createHmac("sha256", this.signingKey(date)).update(sts).digest("hex");
    return `${this.endpoint}${this.uri(key)}?${cq}&X-Amz-Signature=${sig}`;
  }
  async request(method, key, query = {}, body = null, headers = {}) {
    const date = S3Storage.amzDate();
    const payload = body == null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(body);
    const ph = sha256hex(payload);
    const h = { host: this.host, "x-amz-content-sha256": ph, "x-amz-date": date, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)])) };
    const names = Object.keys(h).sort();
    const cq = this.canonicalQuery(query);
    const creq = [method, this.uri(key), cq, names.map(n => `${n}:${h[n].trim()}\n`).join(""), names.join(";"), ph].join("\n");
    const sts = ["AWS4-HMAC-SHA256", date, this.scope(date), sha256hex(creq)].join("\n");
    const sig = crypto.createHmac("sha256", this.signingKey(date)).update(sts).digest("hex");
    h.authorization = `AWS4-HMAC-SHA256 Credential=${this.ak}/${this.scope(date)}, SignedHeaders=${names.join(";")}, Signature=${sig}`;
    delete h.host;
    const url = `${this.endpoint}${this.uri(key)}${cq ? "?" + cq : ""}`;
    return fetch(url, { method, headers: h, body: method === "GET" || method === "HEAD" ? undefined : payload, signal: AbortSignal.timeout(30000) });
  }
  async getText(key) {
    const r = await this.request("GET", key);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`storage get ${r.status}`);
    return r.text();
  }
  async getJson(key) { const t = await this.getText(key); return t == null ? null : JSON.parse(t); }
  async putText(key, text, type = "text/plain; charset=utf-8") {
    const r = await this.request("PUT", key, {}, Buffer.from(text, "utf8"), { "content-type": type });
    if (!r.ok) throw new Error(`storage put ${r.status}`);
  }
  putJson(key, obj) { return this.putText(key, JSON.stringify(obj), "application/json"); }
  async head(key) {
    const r = await this.request("HEAD", key);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`storage head ${r.status}`);
    return { size: Number(r.headers.get("content-length") || 0) };
  }
  async del(key) { const r = await this.request("DELETE", key); if (!r.ok && r.status !== 404) throw new Error(`storage delete ${r.status}`); }
  async createMultipart(key, type) {
    const r = await this.request("POST", key, { uploads: "" }, null, { "content-type": type || "application/octet-stream" });
    const xml = await r.text();
    const id = (xml.match(/<UploadId>([^<]+)<\/UploadId>/) || [])[1];
    if (!r.ok || !id) throw new Error(`storage multipart ${r.status}`);
    return id;
  }
  async presignPart(key, uploadId, n) { return this.presign("PUT", key, { partNumber: String(n), uploadId }, 3600); }
  async completeMultipart(key, uploadId, parts) {
    const xml = `<CompleteMultipartUpload>${parts.map(p => `<Part><PartNumber>${Number(p.n)}</PartNumber><ETag>${String(p.etag).replace(/[<>&]/g, "")}</ETag></Part>`).join("")}</CompleteMultipartUpload>`;
    const r = await this.request("POST", key, { uploadId }, xml, { "content-type": "application/xml" });
    const text = await r.text();
    if (!r.ok || /<Error>/.test(text)) throw new Error(`storage complete ${r.status} ${(text.match(/<Code>([^<]+)/) || [])[1] || ""}`);
  }
  async abortMultipart(key, uploadId) { await this.request("DELETE", key, { uploadId }); }
  // Sum of object sizes under a prefix (ListObjectsV2; used to reconcile usage counters a few times a day).
  async sumPrefix(prefix, keep = /./) {
    let total = 0, count = 0, token = "";
    for (let page = 0; page < 200; page++) {
      const q = { "list-type": "2", prefix, "max-keys": "1000", ...(token ? { "continuation-token": token } : {}) };
      const r = await this.request("GET", "", q); const t = await r.text();
      if (!r.ok) throw new Error(`storage list ${r.status}`);
      for (const c of t.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) { const k = (c[1].match(/<Key>([^<]*)</) || [])[1] || ""; if (!keep.test(k)) continue; total += Number((c[1].match(/<Size>(\d+)</) || [])[1] || 0); count++; }
      token = (t.match(/<NextContinuationToken>([^<]+)</) || [])[1] || "";
      if (!/<IsTruncated>true/.test(t) || !token) break;
    }
    return { total, count };
  }
  async presignGet(key, filename) {
    const q = filename ? { "response-content-disposition": `attachment; filename*=UTF-8''${enc(filename)}` } : {};
    return this.presign("GET", key, q, 900);
  }
}
export const R2Storage = S3Storage; // old name

/* ---------------- Local disk (development and tests only) ---------------- */
// Presigned URLs point back at this server (/api/pd/blob), signed with an HMAC.
export class LocalStorage {
  constructor(dir, secret) { this.dir = dir; this.secret = secret; this.origin = ""; fs.mkdirSync(dir, { recursive: true }); }
  file(key) { return path.join(this.dir, checkKey(key)); }
  async getText(key) { try { return await fs.promises.readFile(this.file(key), "utf8"); } catch (e) { if (e.code === "ENOENT") return null; throw e; } }
  async getJson(key) { const t = await this.getText(key); return t == null ? null : JSON.parse(t); }
  async putText(key, text) { const f = this.file(key); await fs.promises.mkdir(path.dirname(f), { recursive: true }); await fs.promises.writeFile(f + ".tmp", text); await fs.promises.rename(f + ".tmp", f); }
  putJson(key, obj) { return this.putText(key, JSON.stringify(obj)); }
  async head(key) { try { return { size: (await fs.promises.stat(this.file(key))).size }; } catch (e) { return null; } }
  async del(key) { await fs.promises.rm(this.file(key), { force: true }); }
  sign(op, key, extra) { const e = Date.now() + 3600 * 1000; const s = crypto.createHmac("sha256", this.secret).update(`${op}|${key}|${extra}|${e}`).digest("hex"); return `/api/pd/blob?op=${op}&k=${encodeURIComponent(key)}&x=${encodeURIComponent(extra)}&e=${e}&s=${s}`; }
  verify(q) {
    const op = q.get("op"), key = q.get("k"), extra = q.get("x") || "", e = Number(q.get("e")), s = q.get("s") || "";
    const want = crypto.createHmac("sha256", this.secret).update(`${op}|${key}|${extra}|${e}`).digest("hex");
    if (!(e > Date.now()) || s.length !== want.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want))) return null;
    checkKey(key); return { op, key, extra };
  }
  async createMultipart(key) { const id = crypto.randomBytes(12).toString("hex"); await fs.promises.mkdir(this.file(key) + ".parts-" + id, { recursive: true }); return id; }
  async presignPart(key, uploadId, n) { return this.sign("put", key, `${uploadId}:${Number(n)}`); }
  async completeMultipart(key, uploadId, parts) {
    const dir = this.file(key) + ".parts-" + uploadId;
    const out = fs.createWriteStream(this.file(key) + ".tmp");
    for (const p of parts.slice().sort((a, b) => a.n - b.n)) {
      const f = path.join(dir, String(Number(p.n)));
      const etag = '"' + crypto.createHash("md5").update(await fs.promises.readFile(f)).digest("hex") + '"';
      if (etag !== p.etag) throw new Error("storage complete InvalidPart");
      await new Promise((res, rej) => fs.createReadStream(f).on("error", rej).on("end", res).pipe(out, { end: false }));
    }
    await new Promise(r => out.end(r));
    await fs.promises.rename(this.file(key) + ".tmp", this.file(key));
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
  async abortMultipart(key, uploadId) { await fs.promises.rm(this.file(key) + ".parts-" + uploadId, { recursive: true, force: true }); }
  async presignGet(key, filename) { return this.sign("get", key, filename || ""); }
  // Serves the signed local URLs. Returns true when handled.
  async serve(req, res, url) {
    let v; try { v = this.verify(url.searchParams); } catch (e) { v = null; }
    if (!v) { res.writeHead(403).end(); return; }
    if (v.op === "put" && req.method === "PUT") {
      const [id, n] = v.extra.split(":");
      const dir = this.file(v.key) + ".parts-" + id;
      if (!fs.existsSync(dir)) { res.writeHead(404).end(); return; }
      const md5 = crypto.createHash("md5"); const f = path.join(dir, String(Number(n)));
      const out = fs.createWriteStream(f);
      let size = 0;
      for await (const c of req) { size += c.length; if (size > 64 * 1024 * 1024) { out.destroy(); res.writeHead(413).end(); return; } md5.update(c); if (!out.write(c)) await new Promise(r => out.once("drain", r)); }
      await new Promise(r => out.end(r));
      res.writeHead(200, { etag: '"' + md5.digest("hex") + '"', "access-control-expose-headers": "ETag" }).end();
      return;
    }
    if (v.op === "get" && req.method === "GET") {
      const f = this.file(v.key);
      if (!fs.existsSync(f)) { res.writeHead(404).end(); return; }
      const h = { "content-type": "application/octet-stream", "content-length": fs.statSync(f).size };
      if (v.extra) h["content-disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(v.extra)}`;
      res.writeHead(200, h); fs.createReadStream(f).pipe(res); return;
    }
    res.writeHead(405).end();
  }
}

/* ---------------- Pool of S3-compatible backends (v103) ----------------
 * Backend "1" is the primary (S3_* vars, also holds all pendrive metadata). Extra backends: S3_<n>_NAME, _ENDPOINT, _REGION,
 * _BUCKET, _ACCESS_KEY_ID, _SECRET_ACCESS_KEY (n = 2..6), optional _ADDRESSING=path|virtual and _CAP_BYTES.
 * A backend with any required var missing is skipped. Default caps stay under each provider's free tier. */
const GiB = 1024 ** 3;
export const DEFAULT_CAPS = { b2: 9 * GiB, coritan: 9 * GiB, tigris: 4.5 * GiB, vatora: 4.5 * GiB, internetport: 9 * GiB, filebase: 4.5 * GiB };
export const OTHER_CAP = 4 * GiB;
const capFor = (name, override) => { const o = Number(override); return o > 0 ? o : (DEFAULT_CAPS[String(name).toLowerCase()] ?? OTHER_CAP); };
export function backendConfigs(env) {
  const out = [];
  const c1 = s3Config(env);
  if (c1) { const name = (env.S3_NAME || c1.provider).toLowerCase(); out.push({ id: "1", name, cfg: c1, cap: capFor(name, env.S3_CAP_BYTES) }); }
  for (let n = 2; n <= 6; n++) {
    const g = k => env[`S3_${n}_${k}`];
    if (!(g("NAME") && g("ENDPOINT") && g("BUCKET") && g("ACCESS_KEY_ID") && g("SECRET_ACCESS_KEY"))) continue;
    const name = g("NAME").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20) || `s3_${n}`;
    const endpoint = g("ENDPOINT").replace(/\/+$/, "");
    out.push({ id: String(n), name, cap: capFor(name, g("CAP_BYTES")), cfg: { provider: name, endpoint, region: g("REGION") || "auto", bucket: g("BUCKET"), ak: g("ACCESS_KEY_ID"), sk: g("SECRET_ACCESS_KEY"), addressing: g("ADDRESSING") === "virtual" ? "virtual" : "path" } });
  }
  return out;
}
export function makePool(env, secret) {
  if (env.PENDRIVE_STORAGE === "local") { const st = new LocalStorage(env.PENDRIVE_LOCAL_DIR || "/tmp/pendrive-local", secret); return [{ id: "1", name: "local", st, cap: capFor("local", env.S3_CAP_BYTES) }]; }
  const list = [];
  for (const b of backendConfigs(env)) { try { list.push({ id: b.id, name: b.name, cap: b.cap, st: new S3Storage(b.cfg) }); } catch (e) { console.warn(`storage backend ${b.id} skipped: ${e.message}`); } }
  return list;
}
export function makeStorage(env, secret) {
  if (env.PENDRIVE_STORAGE === "local") return new LocalStorage(env.PENDRIVE_LOCAL_DIR || "/tmp/pendrive-local", secret);
  if (s3Config(env)) return new S3Storage(env);
  return null;
}
