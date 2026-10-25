// v113: share links + upload-request links, API lifecycle (run against a local server; budgets via SHARE_EGRESS_LOCAL)
const B = process.env.BASE || "http://localhost:3997";
let tok = "";
const post = async (path, body = {}, h = {}) => { const r = await fetch(B + path, { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify(body) }); return { status: r.status, j: await r.json().catch(() => ({})), r }; };
const api = (op, body) => post("/api/pd/" + op, body, tok ? { authorization: "Bearer " + tok } : {});
const s = (op, body) => post("/api/s/" + op, body, { "x-forwarded-for": process.env.IP || "10.9.8." + (Date.now() % 200) });
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const put = async (url, bytes) => (await fetch(url.startsWith("http") ? url : B + url, { method: "PUT", body: bytes })).headers.get("etag");
const up = async (path, text) => { const b = new TextEncoder().encode(text); const i = (await api("upload/init", { path, size: b.length, type: "text/plain" })).j; const r = await api("upload/complete", { fileId: i.fileId, uploadId: i.uploadId, parts: [{ n: 1, etag: await put(i.urls[1], b) }] }); await api("text-batch", { items: [{ id: r.j.id, text }] }); return r.j; };

let r = await api("create", { name: "zz-test-share-" + Date.now(), pin: "482915" }); tok = r.j.token;
const a = await up("Reports/2026/march.txt", "March sales total 4200 taka. গোপন নয়।");
await up("Reports/2026/april.txt", "April sales 3100");
await up("Reports/notes.md", "# notes\nhello");
const secret = await up("Private/salary.txt", "SECRET salary list");

// --- share a folder + one loose file
r = await api("share/create", { kind: "share", folders: ["Reports"], ids: [secret.id === a.id ? "" : ""].filter(Boolean), expiry: "7d", maxDl: 3, title: "Q1 reports" });
ok(r.status === 200 && /^\/s\/[a-f0-9]{32}$/.test(r.j.url), `create folder share (${r.status} ${r.j.url})`);
const sid = r.j.sid;
r = await fetch(B + "/s/" + sid); const html = await r.text();
ok(r.status === 200 && /noindex/.test(r.headers.get("x-robots-tag") || "") && r.headers.get("referrer-policy") === "no-referrer" && /share\.js/.test(html), "receiver page: noindex, no-referrer, loads share.js");
ok(/frame-ancestors 'none'/.test(r.headers.get("content-security-policy") || ""), "receiver page has its own CSP");
r = await fetch(B + "/pd-zip.js"); const zjs = await r.text(); ok(r.status === 200 && /class PdZip/.test(zjs) && /pdZipSink/.test(zjs), `/pd-zip.js serves the v106 ZIP writer (${zjs.length} bytes)`);
r = await s("tree", { sid }); ok(r.status === 401, "tree without token → 401");
r = await s("open", { sid }); const T = r.j.token;
ok(r.status === 200 && T && r.j.files.length === 3 && r.j.files.every(f => !/Private|salary/.test(f.path)), `open: 3 files, nothing outside the folder (${(r.j.files || []).map(f => f.path)})`);
ok(r.j.files.some(f => f.path === "Reports/2026/march.txt") && r.j.folders.includes("Reports/2026"), "tree keeps the folder structure");
ok(!JSON.stringify(r.j).includes("zz-test-share"), "receiver never sees the pendrive name");
const fm = r.j.files.find(f => f.path.endsWith("march.txt"));
r = await s("url", { sid, token: T, id: secret.id }); ok(r.status === 404, "file outside the link → 404");
r = await s("url", { sid, token: T, id: fm.id, inline: 1 }); let body = await (await fetch(B + r.j.url)).text();
ok(r.status === 200 && body.includes("March sales"), "inline preview url works");
r = await api("share/get", { sid }); ok(r.j.dl === 0, "preview doesn't count as a download");
r = await s("url", { sid, token: T, id: fm.id }); const dres = await fetch(B + r.j.url);
ok(r.status === 200 && /attachment/.test(dres.headers.get("content-disposition") || ""), "download url (attachment)");
r = await s("zip", { sid, token: T }); ok(r.status === 200 && Object.keys(r.j.urls).length === 3, "zip: urls for all 3 files");
r = await api("share/get", { sid }); ok(r.j.dl === 2 && r.j.events.filter(e => e.a === "download" || e.a === "zip").length === 2, `stats: 2 downloads + activity events (${r.j.dl})`);
r = await s("ai", { sid, token: T, question: "total sales in March?" }); ok(r.status === 403, "AI off by default → 403");
await s("url", { sid, token: T, id: fm.id });
r = await s("url", { sid, token: T, id: fm.id }); ok(r.status === 410 && r.j.error === "limit", `max downloads reached → 410 limit (${r.status} ${r.j.error})`);
r = await api("share/list"); ok(r.j.shares.length === 1 && r.j.egress, "owner list + egress status");

// --- password + lockout + AI
r = await api("share/create", { kind: "share", ids: [a.id], expiry: "1d", password: "tiger-77", ai: true });
const sid2 = r.j.sid;
r = await s("open", { sid: sid2 }); ok(r.j.need === "password" && !r.j.token, "password link: needs password");
r = await s("open", { sid: sid2, password: "nope" }); ok(r.status === 401 && r.j.left === 4, `wrong password → 401, 4 left (${r.j.left})`);
r = await s("open", { sid: sid2, password: "tiger-77" }); const T2 = r.j.token; ok(r.status === 200 && T2 && r.j.files.length === 1 && r.j.files[0].path === "march.txt", "right password → token, single file at root");
r = await s("tree", { sid, token: T2 }); ok(r.status === 401 || r.status === 410, "token is bound to its link");
r = await fetch(B + "/api/s/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid: sid2, token: T2, question: "March sales total?" }) });
const ev = (await r.text()).split("\n").filter(Boolean).map(l => JSON.parse(l)); const ans = ev.find(e => e.type === "answer");
ok(r.status === 200 && ans && (ans.actions || []).length === 0 && (ans.sources || []).every(p => p === "march.txt") && !JSON.stringify(ev).includes("Reports/2026"), `AI over shared files only, no actions, relative paths (${ans && ans.sources})`);
for (let i = 0; i < 5; i++) r = await s("open", { sid: sid2, password: "bad" + i }); // a good login resets the counter
ok(r.status === 423 && r.j.error === "locked", `5 wrong passwords → locked (${r.status})`);
r = await s("open", { sid: sid2, password: "tiger-77" }); ok(r.status === 423, "locked even with the right password");

// --- expiry + revoke
r = await api("share/create", { kind: "share", ids: [a.id], expiry: "never" }); const sid3 = r.j.sid; ok(r.j.expires === 0 || r.j.expires == null, "never expires");
const T3 = (await s("open", { sid: sid3 })).j.token;
r = await api("share/revoke", { sid: sid3 }); ok(r.j.state === "revoked", "revoke");
r = await s("url", { sid: sid3, token: T3, id: a.id }); ok(r.status === 410 && r.j.error === "revoked", "revoked link → 410 revoked");
r = await fetch(B + "/s/" + "0".repeat(32)); ok(r.status === 200, "page for unknown id still renders (API says not_found)");
r = await s("open", { sid: "0".repeat(32) }); ok(r.status === 404, "unknown link → 404");
r = await s("open", { sid: "../../etc" }); ok(r.status === 404, "bad link id → 404");

// --- budget: tiny egress cap for the local backend → busy
if (process.env.SHARE_EGRESS_LOCAL) {
  r = await api("share/create", { kind: "share", ids: [a.id] }); const sb = r.j.sid; const tb = (await s("open", { sid: sb })).j.token;
  let last; for (let i = 0; i < 40; i++) { last = await s("url", { sid: sb, token: tb, id: a.id }); if (last.status !== 200) break; }
  ok(last.status === 503 && last.j.error === "busy", `daily egress budget hit → 503 busy (${last.status} ${last.j.error})`);
}

// --- upload-request link
r = await api("share/create", { kind: "upload", folder: "Inbox", maxFiles: 2, maxBytes: 20 * 1024 * 1024, password: "drop-it" });
const us = r.j.sid; ok(r.status === 200 && r.j.up && r.j.up.folder === "Inbox", "create upload-request link");
const UT = (await s("open", { sid: us, password: "drop-it" })).j.token;
r = await s("tree", { sid: us, token: UT }); ok(r.j.kind === "upload" && r.j.up.left === 2 && !r.j.files, "upload page info (no file list)");
r = await s("up-init", { sid: us, token: UT, name: "big.bin", size: 21 * 1024 * 1024 }); ok(r.status === 413, "too big → 413");
r = await s("up-init", { sid: us, token: UT, name: "../../Private/x.txt", size: 5 }); const i1 = r.j;
r = await s("up-complete", { sid: us, token: UT, fileId: i1.fileId, uploadId: i1.uploadId, parts: [{ n: 1, etag: await put(i1.urls[1], new TextEncoder().encode("hello")) }] });
ok(r.status === 200 && !/\//.test(r.j.path), `path traversal flattened inside Inbox (${r.j.path})`);
// resumable multipart: init, send part 1, "reload", ask for part 2 again, finish
const big = new Uint8Array(17 * 1024 * 1024).map((_, i) => i % 7);
r = await s("up-init", { sid: us, token: UT, name: "scan.bin", size: big.length }); const m = r.j;
ok(!m.single && m.parts === 2, `≥16 MB → resumable multipart (${m.parts} parts)`);
const e1 = await put(m.urls[1] || (await s("up-parts", { sid: us, token: UT, fileId: m.fileId, uploadId: m.uploadId, parts: [1] })).j.urls[1], big.slice(0, m.partSize));
r = await s("up-parts", { sid: us, token: UT, fileId: m.fileId, uploadId: m.uploadId, parts: [2] }); ok(r.status === 200 && r.j.urls[2], "resume: fresh URL for the missing part");
const e2 = await put(r.j.urls[2], big.slice(m.partSize));
r = await s("up-complete", { sid: us, token: UT, fileId: m.fileId, uploadId: m.uploadId, parts: [{ n: 1, etag: e1 }, { n: 2, etag: e2 }] }); ok(r.status === 200, "multipart upload completed");
r = await s("up-init", { sid: us, token: UT, name: "third.txt", size: 3 }); ok(r.status === 409 && r.j.error === "upload_limit", "file-count limit → 409");
r = await s("up-parts", { sid: us, token: UT, fileId: secret.id, uploadId: "x", parts: [1] }); ok(r.status === 404, "can't touch uploads that aren't this link's");
const l = (await api("list")).j.files.filter(f => f.path.startsWith("Inbox/")).map(f => f.path).sort();
ok(l.length === 2 && l.includes("Inbox/scan.bin"), `files landed in Inbox (${l})`);
r = await api("share/get", { sid: us }); ok(r.j.up.count === 2 && r.j.events.filter(e => e.a === "upload").length === 2, "upload stats + events");
r = await s("url", { sid: us, token: UT, id: l[0] }); ok(r.status >= 400, "upload link can't download");
r = await post("/api/s/open", { sid }, { origin: "https://evil.example" }); ok(r.status === 403, "cross-origin POST blocked");
