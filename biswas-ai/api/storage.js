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
const SAFE_KEY = /^pendrives\/[a-f0-9]{24}\/[a-z0-9._\/-]{1,200}$|^names\/[a-f0-9]{64}\.json$/;
function checkKey(key) { if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error("bad key"); return key; }

/* ---------------- Cloudflare R2 (any S3-compatible endpoint) ---------------- */
export class R2Storage {
  constructor(env) {
    this.bucket = env.R2_BUCKET;
    this.ak = env.R2_ACCESS_KEY_ID;
    this.sk = env.R2_SECRET_ACCESS_KEY;
    this.region = env.R2_REGION || "auto";
    // R2_ENDPOINT is only for testing against MinIO; production builds it from the account id.
    this.endpoint = (env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/+$/, "");
    this.origin = new URL(this.endpoint).origin;
    this.host = new URL(this.endpoint).host;
  }
  scope(date) { return `${date.slice(0, 8)}/${this.region}/s3/aws4_request`; }
  signingKey(date) {
    let k = hmac("AWS4" + this.sk, date.slice(0, 8));
    k = hmac(k, this.region); k = hmac(k, "s3"); return hmac(k, "aws4_request");
  }
  static amzDate(d = new Date()) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  canonicalQuery(q) { return Object.keys(q).sort().map(k => `${enc(k)}=${enc(String(q[k]))}`).join("&"); }
  uri(key) { return `/${enc(this.bucket)}/${encPath(checkKey(key))}`; }

  presign(method, key, query = {}, expires = 3600) {
    const date = R2Storage.amzDate();
    const q = { ...query, "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${this.ak}/${this.scope(date)}`, "X-Amz-Date": date, "X-Amz-Expires": String(expires), "X-Amz-SignedHeaders": "host" };
    const cq = this.canonicalQuery(q);
    const creq = [method, this.uri(key), cq, `host:${this.host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
    const sts = ["AWS4-HMAC-SHA256", date, this.scope(date), sha256hex(creq)].join("\n");
    const sig = crypto.createHmac("sha256", this.signingKey(date)).update(sts).digest("hex");
    return `${this.endpoint}${this.uri(key)}?${cq}&X-Amz-Signature=${sig}`;
  }
  async request(method, key, query = {}, body = null, headers = {}) {
    const date = R2Storage.amzDate();
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
  async presignGet(key, filename) {
    const q = filename ? { "response-content-disposition": `attachment; filename*=UTF-8''${enc(filename)}` } : {};
    return this.presign("GET", key, q, 900);
  }
}

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

export function makeStorage(env, secret) {
  if (env.PENDRIVE_STORAGE === "local") return new LocalStorage(env.PENDRIVE_LOCAL_DIR || "/tmp/pendrive-local", secret);
  if (env.R2_BUCKET && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && (env.R2_ACCOUNT_ID || env.R2_ENDPOINT)) return new R2Storage(env);
  return null;
}
