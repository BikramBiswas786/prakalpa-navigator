// v102 checks: global cap (run the server with PENDRIVE_TOTAL_CAP_BYTES=52428800), init URLs, resume status, part count.
const B = process.env.BASE || "http://localhost:3997";
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const mk = () => { let tok = ""; const api = async (op, body = {}) => { const r = await fetch(`${B}/api/pd/${op}`, { method: "POST", headers: { "content-type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (j.token) tok = j.token; return { status: r.status, j }; }; return api; };
const A = mk(), Bp = mk(), MB = 1024 * 1024;
await A("create", { name: "cap A " + Date.now(), pin: "482915" }); await Bp("create", { name: "cap B " + Date.now(), pin: "482915" });
let a = await A("upload/init", { path: "x/a.bin", size: 30 * MB });
ok(a.status === 200 && a.j.parts === 3 && Object.keys(a.j.urls).length === 3, `init returns presigned URLs for the first parts (${a.j.parts} parts, ${Object.keys(a.j.urls || {}).length} urls)`);
let b = await Bp("upload/init", { path: "b.bin", size: 30 * MB });
ok(b.status === 507 && b.j.error === "total_cap", `global cap across pendrives: second pendrive refused ${b.status} ${b.j.error} (cap ${b.j.cap})`);
let s = await A("upload/status", { fileId: a.j.fileId, uploadId: a.j.uploadId, size: 30 * MB }); ok(s.j.ok === true, "upload/status: resumable");
s = await A("upload/status", { fileId: a.j.fileId, uploadId: a.j.uploadId, size: 1 }); ok(s.j.ok === false, "upload/status: wrong size not resumable");
s = await Bp("upload/status", { fileId: a.j.fileId, uploadId: a.j.uploadId, size: 30 * MB }); ok(s.j.ok === false, "upload/status: other pendrive can't see it");
await A("upload/abort", { fileId: a.j.fileId, uploadId: a.j.uploadId });
b = await Bp("upload/init", { path: "b.bin", size: 30 * MB }); ok(b.status === 200, `after abort, the space is free again: ${b.status}`);
await Bp("upload/abort", { fileId: b.j.fileId, uploadId: b.j.uploadId });
const big = await A("upload/init", { path: "five.iso", size: 5 * 1024 ** 3 }); ok(big.status === 507 || big.status === 413, `5 GB file under a 50 MB cap refused: ${big.status} ${big.j.error}`);
ok(Math.ceil(5 * 1024 ** 3 / (10 * MB)) === 512, "5 GB / 10 MB parts = 512 parts (< 10,000)");
