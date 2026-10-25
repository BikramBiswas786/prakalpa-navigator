const B = process.env.BASE || "http://localhost:3997";
let tok = "";
const api = async (op, body = {}, raw) => {
  const r = await fetch(`${B}/api/pd/${op}`, { method: "POST", headers: { "content-type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) });
  if (raw) return r;
  return { status: r.status, j: await r.json().catch(() => ({})) };
};
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
// v109: batch-init / single PUT / batch-complete / text-batch / hosts
const MB = 1024 * 1024;
let r = await api("create", { name: "zz-test-v109-" + Date.now(), pin: "482915" }); tok = r.j.token;
const put = async (url, bytes) => { const res = await fetch(url.startsWith("http") ? url : B + url, { method: "PUT", body: bytes }); return res.headers.get("etag"); };
const small = Array.from({ length: 30 }, (_, i) => ({ path: `docs/f${i}.txt`, bytes: new TextEncoder().encode(`ফাইল ${i} `.repeat(200 + i)) }));
const big = { path: "big/b.bin", bytes: new Uint8Array(40 * MB).map((_, i) => i % 251) };
const t0 = Date.now();
r = await api("upload/batch-init", { files: [...small, big].map(f => ({ path: f.path, size: f.bytes.length, type: "text/plain" })) });
const plans = r.j.files || [];
ok(r.status === 200 && plans.length === 31 && plans.slice(0, 30).every(p => p.single && p.parts === 1 && p.urls[1]), `batch-init: 30 small files each get one presigned PUT (${plans.filter(p => p.single).length})`);
const bp = plans[30];
ok(bp && !bp.single && bp.partSize === 16 * MB && bp.parts === 3, `40 MB file: multipart with 16 MB parts (${bp && bp.partSize / MB} MB × ${bp && bp.parts})`);
r = await api("upload/batch-init", { files: [{ path: "docs/f0.txt", size: 5 }, { path: "docs/new.txt", size: 5 }] });
ok(r.j.files[0].error === "exists" ? true : r.j.files[0].fileId, `per-file result in a batch (${JSON.stringify(r.j.files.map(f => f.error || "ok"))})`);
for (const f of r.j.files) if (f.fileId) await api("upload/abort", { fileId: f.fileId, uploadId: f.uploadId });
const items = await Promise.all(small.map(async (f, i) => ({ fileId: plans[i].fileId, uploadId: plans[i].uploadId, parts: [{ n: 1, etag: await put(plans[i].urls[1], f.bytes) }], text: new TextDecoder().decode(f.bytes) })));
const bparts = []; for (let n = 1; n <= bp.parts; n++) { const u = bp.urls[n] || (await api("upload/parts", { fileId: bp.fileId, uploadId: bp.uploadId, parts: [n] })).j.urls[n]; bparts.push({ n, etag: await put(u, big.bytes.subarray((n - 1) * bp.partSize, n * bp.partSize)) }); }
r = await api("upload/batch-complete", { items: [...items, { fileId: bp.fileId, uploadId: bp.uploadId, parts: bparts }] });
if (r.status !== 200) console.log(r.status, JSON.stringify(r.j));
ok(r.status === 200 && r.j.files.length === 31 && r.j.files.every(f => f.id && !f.error), `batch-complete: 31 files committed in one call (${r.j.files.filter(f => f.error).map(f => f.error)})`);
const l = (await api("list")).j.files;
ok(l.length === 31 && l.filter(f => f.text).length === 30 && l.find(f => f.path === "big/b.bin").size === 40 * MB, `index: 31 files, 30 with AI text, big file 40 MB (${l.length}, ${l.filter(f => f.text).length})`);
ok(r.j.used === 40 * MB + small.reduce((a, f) => a + f.bytes.length, 0), `usage counted once per file (${r.j.used})`);
r = await api("ai", { question: "ফাইল 7", scope: {} }, true); const ans = (await r.text()).split("\n").filter(Boolean).map(JSON.parse).find(e => e.type === "answer");
ok(ans && ans.sources.length > 0, `AI can read batch-committed text (${ans && ans.sources.length} sources)`);
// old single-file API still works (now one PUT for a small file)
r = await api("upload/init", { path: "one.txt", size: 11 }); const one = r.j;
const et = await put(one.urls[1], new TextEncoder().encode("hello world"));
r = await api("upload/complete", { fileId: one.fileId, uploadId: one.uploadId, parts: [{ n: 1, etag: et }] });
ok(one.single && r.status === 200 && r.j.path === "one.txt", "old init/complete with a single PUT");
r = await api("text-batch", { items: [{ id: r.j.id, text: "hello world" }] }); ok(r.j.n === 1, "text-batch");
r = await api("upload/batch-complete", { items: [{ fileId: "nope", uploadId: "x" }] }); ok(r.j.files[0].error === "no_upload", "unknown upload in a batch → per-item error");
r = await api("hosts"); ok(r.status === 200 && Array.isArray(r.j.hosts), `hosts op (${JSON.stringify(r.j.hosts)})`);
console.log(`elapsed ${Date.now() - t0} ms`);
// v112: deleting many files in one call is fast and leaves nothing behind
const td = Date.now();
r = await api("delete", { confirm: true, ids: l.map(f => f.id), folders: ["docs", "big"] });
const after = (await api("list")).j.files;
ok(r.status === 200 && r.j.deleted >= 31 && after.length <= 1 && r.j.used <= 20, `bulk delete of 31 files in one call (${r.status}, ${Date.now() - td} ms, ${after.length} left)`);
