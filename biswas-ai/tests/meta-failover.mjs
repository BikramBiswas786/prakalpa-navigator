// Metadata replication + automatic failover: simulate 403 on each bucket in turn (admin fault hook), every op must still work.
const B = process.env.BASE || "http://localhost:3996", ADM = process.env.ADMIN || "test-admin", pin = "482915";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const api = async (op, body, tok) => { const r = await fetch(B + "/api/pd/" + op, { method: "POST", headers: { "content-type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const adm = async q => (await fetch(B + "/api/admin/meta?" + q, { headers: { "x-admin-token": ADM } })).json();
const fault = async (b, code) => adm(`do=fault&b=${b}&code=${code}`);
const clear = async () => { for (const b of ["b2", "filebase", "tigris"]) await fault(b, 0); };
const nm = s => `zz-test-meta-${s}-${Date.now().toString(36)}`;
const upload = async (tok, path) => { const body = "hello " + path; const i = await api("upload/init", { path, size: body.length, type: "text/plain" }, tok); if (i.s !== 200) return i;
  const u = i.j.urls[1]; const put = await fetch(u.startsWith("http") ? u : B + u, { method: "PUT", body, headers: { "content-type": "text/plain" } }); if (!put.ok) return { s: put.status, j: { error: "put" } };
  return api("upload/complete", { fileId: i.j.fileId, uploadId: i.j.uploadId, parts: [{ n: 1, etag: (put.headers.get("etag") || "").replace(/"/g, "") }] }, tok); };
const flow = async (tag, name) => { const c = await api("create", { name, pin }); ok(c.s === 200, `${tag} create ${c.s} ${c.j.error || ""}`); const o = await api("open", { name, pin }); ok(o.s === 200, `${tag} open ${o.s} ${o.j.error || ""}`);
  const up = await upload(o.j.token, "a.txt"); ok(up.s === 200, `${tag} upload ${up.s} ${up.j.error || ""}`); const l = await api("list", {}, o.j.token); ok(l.s === 200 && l.j.files.some(f => f.path === "a.txt"), `${tag} list shows the file`);
  const e = await api("edconv/save", { area: "note", title: "t", name: "a.txt", ext: "txt", mime: "text/plain", data: Buffer.from("x").toString("base64"), thread: [] }, o.j.token); ok(e.s === 200, `${tag} New page row saved ${e.s}`); return name; };
await clear();
const n0 = await flow("M0 all healthy:", nm("a"));
for (const b of ["b2", "filebase", "tigris"]) { await clear(); await fault(b, 403); await flow(`M ${b} 403:`, nm(b)); const o = await api("open", { name: n0, pin }); ok(o.s === 200, `M ${b} 403: older pendrive still opens ${o.s}`); }
await clear(); await fault("filebase", 403); await fault("tigris", 403); const nb = await flow("M only b2:", nm("onlyb2"));
await clear(); const o1 = await api("open", { name: nb, pin }); ok(o1.s === 200, "M b2-only pendrive opens when all are back (repairs replicas)"); await new Promise(r => setTimeout(r, 1500));
await fault("b2", 403); const o2 = await api("open", { name: nb, pin }); ok(o2.s === 200, "M repaired pendrive opens with b2 down " + o2.s);
await clear(); await fault("filebase", 429); await fault("tigris", 503); const o3 = await api("open", { name: n0, pin }); ok(o3.s === 200, "M 429 + 503 on two replicas: open still works " + o3.s);
await clear(); await fault("filebase", 403); await fault("tigris", 403); const nc = nm("reset"); await api("create", { name: nc, pin }); await clear(); await fault("b2", 403);
const o4 = await api("open", { name: nc, pin }); ok(o4.s === 503 && o4.j.error === "storage_reset", `M pendrive only on a resting bucket: clear storage_reset, not 500 (${o4.s} ${o4.j.error})`);
await clear(); const st = await adm("do=status"); ok(st.replicas && st.replicas.length === 3, "M status lists 3 replicas; log: " + (st.log || []).map(x => x.m).slice(0, 2).join(" | "));
const sy = await adm("do=sync&b=b2"); ok(sy.checked > 0, `M admin sync from b2: ${sy.copied} copied of ${sy.checked}`);
console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
