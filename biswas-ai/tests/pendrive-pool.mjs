// v103 storage pool test. Server: primary S3_* (cap 40 MB) + S3_2 "coritan" (cap 60 MB) + S3_3 "tigris" pointing at a DEAD port (cap 100 MB),
// ADMIN_TOKEN=test-admin, PORT=3997. Optional DIRS="name=/posix/dir/bucket,..." to check where the bytes really landed.
import crypto from "node:crypto"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3997", ADMIN = process.env.ADMIN || "test-admin";
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
let tok = "";
const api = async (op, body = {}, q = "", hdr = {}) => { const r = await fetch(`${B}/api/pd/${op}${q}`, { method: "POST", headers: { "content-type": "application/json", origin: B, ...(tok ? { authorization: "Bearer " + tok } : {}), ...hdr }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (j.token) tok = j.token; return { status: r.status, j }; };
async function upload(path, bytes, force) {
  const init = await api("upload/init", { path, size: bytes.length }, force ? `?backend=${force}` : "", force ? { "x-admin-token": ADMIN } : {});
  if (init.status !== 200) return init;
  const { fileId, uploadId, partSize, parts, urls } = init.j; const done = [];
  for (let n = 1; n <= parts; n++) { const u = urls[n].startsWith("http") ? urls[n] : B + urls[n]; const r = await fetch(u, { method: "PUT", body: bytes.subarray((n - 1) * partSize, n * partSize) }); if (!r.ok) return { status: r.status, j: { error: "put " + r.status } }; done.push({ n, etag: r.headers.get("etag") }); }
  const c = await api("upload/complete", { fileId, uploadId, parts: done }); c.j.fileId = fileId; c.j.backend = init.j.backend; return c;
}
const MB = 1024 * 1024;
let h = await (await fetch(B + "/healthz/pendrive")).json();
console.log("  healthz/pendrive:", JSON.stringify(h));
ok(h.backends && h.backends.map(b => b.name).join(",") === (process.env.NAMES || "s3,coritan,tigris"), "healthz lists every backend: " + (h.backends || []).map(b => b.name).join(","));
ok(!/secret|testkey|pdtest|bucket/i.test(JSON.stringify(h)), "healthz has no keys or bucket names");
ok(h.cap === h.backends.reduce((a, b) => a + b.cap, 0), "total cap = sum of backend caps: " + h.cap);
await api("create", { name: "zz pool " + Date.now(), pin: "482915" }); ok(!!tok, "create pendrive");
// 1) auto placement: tigris (dead, biggest) is tried first -> marked unhealthy -> falls back to coritan (60 MB free > 40 MB)
const a = crypto.randomBytes(3 * MB + 7);
let r = await upload("auto/a.bin", a); ok(r.status === 200, `auto upload with a dead backend in the pool still works (${r.status} ${r.j.error || ""})`);
h = await (await fetch(B + "/healthz/pendrive")).json();
const by = n => h.backends.find(b => b.name === n);
ok(by("tigris") && by("tigris").placement === false && by("tigris").cors === "failed", "backend whose CORS couldn't be set is left out of placement: " + JSON.stringify(by("tigris")));
ok(by("coritan").used === a.length, `file placed on the backend with most free room (coritan used ${by("coritan").used})`);
// 1b) a backend that dies after boot: marked unhealthy for 10 min, upload falls back to the next one
let extra = 0;
if (process.env.KILL) {
  const { execSync } = await import("node:child_process"); execSync(process.env.KILL);
  const b2 = crypto.randomBytes(2 * MB); r = await upload("auto/b.bin", b2); extra = 1;
  h = await (await fetch(B + "/healthz/pendrive")).json();
  ok(r.status === 200 && by("coritan").healthy === false && by("s3").used >= b2.length, `dead backend marked unhealthy, upload fell back to s3 (${r.status}, coritan healthy=${by("coritan").healthy}, s3 used ${by("s3").used})`);
  execSync(process.env.REVIVE); await new Promise(r => setTimeout(r, 2000));
}
// 2) forced placement (admin only)
const forced = await api("upload/init", { path: "x.bin", size: 10 }, "?backend=s3"); ok(forced.status === 403, "?backend= without admin token refused: " + forced.status);
const files = {};
for (const n of (process.env.FORCE || "s3,coritan").split(",")) {
  const bytes = crypto.randomBytes(12 * MB + 3); r = await upload(`forced/${n}.bin`, bytes, n);
  ok(r.status === 200 && r.j.backend === n, `forced upload to ${n}: ${r.status} ${r.j.backend || r.j.error}`); files[n] = { id: r.j.id, fid: r.j.fileId, sha: sha(bytes), len: bytes.length };
}
// 3) downloads come from the file's own backend, byte-identical
const list = (await api("list")).j.files; ok(list.length === 1 + extra + Object.keys(files).length, "list shows all files: " + list.length);
for (const [n, f] of Object.entries(files)) {
  const d = await api("download", { id: f.id }); const u = d.j.url.startsWith("http") ? d.j.url : B + d.j.url;
  const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
  ok(sha(buf) === f.sha, `download from ${n}: sha256 matches (${buf.length} bytes)`);
}
const dirs = Object.fromEntries((process.env.DIRS || "").split(",").filter(Boolean).map(s => s.split("=")));
for (const [n, f] of Object.entries(files)) if (dirs[n]) { const hit = fs.readdirSync(dirs[n] + "/pendrives").some(p => fs.existsSync(`${dirs[n]}/pendrives/${p}/f/${f.fid}`)); ok(hit, `bytes for ${n} file are really in the ${n} bucket`); }
// 4) rename/move + text + AI on a file from a non-primary backend
const cf = list.find(f => f.path === "auto/a.bin");
r = await api("rename", { id: cf.id, name: "renamed.bin" }); ok(r.status === 200, "rename a coritan file");
r = await api("text", { id: cf.id, text: "Ramesh Das land case hearing on 12 November at Barasat court." }); ok(r.status === 200, "save text for a coritan file");
const ai = await fetch(`${B}/api/pd/ai`, { method: "POST", headers: { "content-type": "application/json", origin: B, authorization: "Bearer " + tok }, body: JSON.stringify({ question: "When is the Ramesh Das hearing?" }) });
const aiText = await ai.text(); ok(ai.status === 200 && /answer/.test(aiText), "AI question over the pool works: " + aiText.split("\n").filter(Boolean).pop().slice(0, 140));
r = await api("download", { id: cf.id }); ok(r.status === 200 && r.j.url, "download after rename still points at coritan");
// 5) delete everything; backend counters back to 0 and bytes gone
r = await api("delete", { confirm: true, ids: (await api("list")).j.files.map(f => f.id) }); ok(r.status === 200, "delete all");
h = await (await fetch(B + "/healthz/pendrive")).json(); console.log("  after delete:", JSON.stringify(h.backends));
ok(h.backends.every(b => b.used === 0 || b.name === "tigris"), "per-backend usage back to 0");
for (const [n, f] of Object.entries(files)) if (dirs[n]) { const left = fs.existsSync(dirs[n] + "/pendrives") && fs.readdirSync(dirs[n] + "/pendrives").some(p => fs.existsSync(`${dirs[n]}/pendrives/${p}/f/${f.fid}`)); ok(!left, `bytes deleted from ${n}`); }
