// v105: AI scope is limited to the selected file ids. Server: PENDRIVE_MOCK_AI=1 (any storage), PORT=3997.
const B = process.env.BASE || "http://localhost:3997";
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
let tok = "";
const api = async (op, body = {}) => { const r = await fetch(`${B}/api/pd/${op}`, { method: "POST", headers: { "content-type": "application/json", origin: B, ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (j.token) tok = j.token; return { status: r.status, j }; };
async function put(path, text) {
  const bytes = Buffer.from(text); const i = await api("upload/init", { path, size: bytes.length });
  const u = i.j.urls[1].startsWith("http") ? i.j.urls[1] : B + i.j.urls[1]; const r = await fetch(u, { method: "PUT", body: bytes });
  const c = await api("upload/complete", { fileId: i.j.fileId, uploadId: i.j.uploadId, parts: [{ n: 1, etag: r.headers.get("etag") }] });
  await api("text", { id: c.j.id, text }); return c.j.id;
}
const ask = async (question, scope) => { const r = await fetch(`${B}/api/pd/ai`, { method: "POST", headers: { "content-type": "application/json", origin: B, authorization: "Bearer " + tok }, body: JSON.stringify({ question, scope }) }); return JSON.parse((await r.text()).split("\n").filter(Boolean).pop()); };
await api("create", { name: "zz v105 " + Date.now(), pin: "482915" });
const ids = {};
for (const p of ["Accounts/2025/bill.txt", "Accounts/2025/budget.txt", "Accounts/notes.txt", "Cases/ramesh.txt", "readme.txt"]) ids[p] = await put(p, `${p}: budget electricity bill hearing Ramesh 2025 office`);
const acc = Object.keys(ids).filter(p => p.startsWith("Accounts/")).map(p => ids[p]);
let a = await ask("budget bill hearing Ramesh office", { ids: acc });
ok(a.sources.length > 0 && a.sources.every(s => s.startsWith("Accounts/")), "folder selection: sources only from Accounts/: " + a.sources.join(", "));
a = await ask("budget bill hearing Ramesh office", { ids: [ids["Cases/ramesh.txt"], ids["readme.txt"]] });
ok(a.sources.length && a.sources.every(s => s === "Cases/ramesh.txt" || s === "readme.txt"), "file selection: sources only the two files: " + a.sources.join(", "));
a = await ask("budget bill hearing Ramesh office", { mode: "x", ids: acc }); 
const an = await (await fetch(`${B}/api/pd/ai`, { method: "POST", headers: { "content-type": "application/json", origin: B, authorization: "Bearer " + tok }, body: JSON.stringify({ question: "budget office", mode: "analyse", scope: { ids: acc } }) })).text();
const last = JSON.parse(an.split("\n").filter(Boolean).pop()); ok(last.sources.length === 3 && last.sources.every(s => s.startsWith("Accounts/")), "analyse mode: reads exactly the 3 Accounts files: " + last.sources.join(", "));
a = await ask("budget", { ids: ["ffffffffffffffffffffffff"] }); ok(!a.sources.length, "unknown ids: nothing from other files is read");
a = await ask("budget bill hearing Ramesh office", {}); ok(a.sources.some(s => !s.startsWith("Accounts/")), "no selection: whole pendrive: " + a.sources.length + " sources");
await api("delete", { confirm: true, ids: Object.values(ids) });
