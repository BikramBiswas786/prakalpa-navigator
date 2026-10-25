// v113: a delete must succeed (and clean up later) when one storage backend is down. Needs the local pool from tests (startpool/revive).
import { execSync } from "node:child_process"; import fs from "node:fs";
const B = "http://localhost:3997"; let tok = "";
const api = async (op, body = {}, q = "") => { const r = await fetch(`${B}/api/pd/${op}${q}`, { method: "POST", headers: { "content-type": "application/json", "x-admin-token": "test-admin", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) }); return { status: r.status, j: await r.json().catch(() => ({})) }; };
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
tok = (await api("create", { name: "zz-test-del-" + Date.now(), pin: "482915" })).j.token;
const ids = [];
for (let i = 0; i < 12; i++) { const b = new TextEncoder().encode("file " + i); const r = (await api("upload/init", { path: `d/f${i}.txt`, size: b.length }, "?backend=coritan")).j;
  const et = (await fetch(r.urls[1].startsWith("http") ? r.urls[1] : B + r.urls[1], { method: "PUT", body: b })).headers.get("etag");
  const c = await api("upload/complete", { fileId: r.fileId, uploadId: r.uploadId, parts: [{ n: 1, etag: et }] }); ids.push(c.j.id); }
const on = () => execSync("ls -R /tmp/s3b/pdtwo 2>/dev/null | grep -c '^[a-f0-9]\\{8,\\}' || true").toString().trim();
console.log("objects on coritan:", on());
execSync("pkill -f '[p]ort 127.0.0.1:9101'; true"); await new Promise(r => setTimeout(r, 800));
const t0 = Date.now(); let r = await api("delete", { confirm: true, ids: ids.slice(0, 8), folders: [] });
ok(r.status === 200 && r.j.deleted === 8, `delete 8 files while their backend is down → ${r.status} ${r.j.error || ""} (${Date.now() - t0} ms)`);
const l = (await api("list")).j.files; ok(l.length === 4, `index updated anyway (${l.length} left)`);
execSync("bash /tmp/revive.sh"); await new Promise(r => setTimeout(r, 2500));
r = await api("delete", { confirm: true, ids: ids.slice(8), folders: ["d"] });
ok(r.status === 200, "next delete after the backend is back"); console.log("objects on coritan after:", on());
