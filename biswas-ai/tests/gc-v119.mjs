// v119: start a local server with PENDRIVE_TEST_GC_DELAY_MS=6000 PENDRIVE_TEST_GC_AGE_MS=0, then run this.
// Checks: zz-test-* pendrives are emptied by the server GC, other pendrives are untouched; rightmost XFF hop keys rate limits.
const B = process.env.BASE || "http://localhost:3997";
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); c ? pass++ : fail++; };
const post = async (op, body, tok, h = {}) => { const r = await fetch(`${B}/api/pd/${op}`, { method: "POST", headers: { "content-type": "application/json", ...h, ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const up = async (tok, path, text) => { const i = (await post("upload/init", { path, size: text.length, type: "text/plain" }, tok)).j;
  const u0 = i.urls[1].url || i.urls[1]; const r = await fetch(new URL(u0, B), { method: "PUT", body: text }); const etag = r.headers.get("etag");
  return post("upload/complete", { fileId: i.fileId, uploadId: i.uploadId, parts: [{ n: 1, etag }] }, tok); };
const t = Date.now().toString(36), names = ["zz-test-gc-" + t, "keep-gc-" + t];
const tok = {};
for (const n of names) { const c = await post("create", { name: n, pin: "482915" }); tok[n] = c.j.token || (await post("open", { name: n, pin: "482915" })).j.token; await up(tok[n], "a.txt", "hello " + n); }
for (const n of names) ok((await post("list", {}, tok[n])).j.files.length === 1, n + " has 1 file before GC");
await new Promise(r => setTimeout(r, 9000));
const a = (await post("list", {}, tok[names[0]])).j, b = (await post("list", {}, tok[names[1]])).j;
ok(a.files.length === 0 && a.used === 0, "zz-test pendrive emptied by GC (used " + a.used + ")");
ok(b.files.length === 1 && b.used > 0, "non-test pendrive untouched");
// rate limit: 8 failed opens with spoofed first hop but same rightmost hop must still hit the per-IP limit
let codes = [];
for (let i = 0; i < 25; i++) codes.push((await post("open", { name: "nobody-" + t, pin: "0000" }, null, { "x-forwarded-for": `10.0.0.${i}, 203.0.113.9` })).s);
ok(codes.includes(429), "spoofed left XFF entries do not dodge the rate limit (" + [...new Set(codes)].join(",") + ")");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
