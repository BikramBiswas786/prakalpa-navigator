// Run: PENDRIVE_STORAGE=local (or S3_* vars + PENDRIVE_LOCAL_DIR=<versitygw posix dir>/<bucket> for this script) PENDRIVE_MOCK_AI=1 PORT=3997 node server.js, then node tests/pendrive-e2e.mjs
// End-to-end API test for AI Pendrive (simulates the browser).
const B = process.env.BASE || "http://localhost:3997";
let tok = "";
const api = async (op, body = {}, raw) => {
  const r = await fetch(`${B}/api/pd/${op}`, { method: "POST", headers: { "content-type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) });
  if (raw) return r;
  return { status: r.status, j: await r.json().catch(() => ({})) };
};
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const md5 = async b => (await import("node:crypto")).createHash("md5").update(b).digest("hex");
async function upload(path, bytes, text, extra = {}) {
  const init = await api("upload/init", { path, size: bytes.length, type: "application/octet-stream", ...extra });
  if (init.status !== 200) return init;
  const { fileId, uploadId, partSize, parts } = init.j;
  const ns = Array.from({ length: parts }, (_, i) => i + 1);
  const { j: { urls } } = await api("upload/parts", { fileId, uploadId, parts: ns });
  const done = [];
  for (const n of ns) {
    const u = urls[n].startsWith("http") ? urls[n] : B + urls[n];
    const r = await fetch(u, { method: "PUT", body: bytes.subarray((n - 1) * partSize, n * partSize) });
    done.push({ n, etag: r.headers.get("etag") });
  }
  const c = await api("upload/complete", { fileId, uploadId, parts: done });
  if (c.status === 200 && text != null) await api("text", { id: c.j.id, text });
  return c;
}
const name = "Test Office " + Date.now();
let r = await api("create", { name, pin: "1234" });
ok(r.status === 200 && r.j.token, `create pendrive (status ${r.status}, quota ${r.j.quota})`);
r = await api("create", { name: name.toUpperCase(), pin: "5555" });
ok(r.status === 409, `duplicate name (case-insensitive) rejected: ${r.status} ${r.j.error}`);
tok = "";
for (let i = 1; i <= 5; i++) { r = await api("open", { name, pin: "0000" }); console.log(`  wrong PIN try ${i}: ${r.status} ${r.j.error} ${r.j.left ?? ""}`); }
ok(r.status === 423, "5 wrong PINs lock it");
r = await api("open", { name, pin: "1234" });
ok(r.status === 423 && r.j.retryAfter > 800, `right PIN refused while locked (retryAfter ${r.j.retryAfter}s)`);
// test hook: clear the lock by editing meta on local disk
const fs = await import("node:fs"); const path = await import("node:path");
const dir = process.env.PENDRIVE_LOCAL_DIR || "/tmp/pendrive-local";
for (const id of fs.readdirSync(path.join(dir, "pendrives"))) { const f = path.join(dir, "pendrives", id, "meta.json"); const m = JSON.parse(fs.readFileSync(f)); if (m.name === name) { m.lockUntil = Date.now() - 1; fs.writeFileSync(f, JSON.stringify(m)); } }
r = await api("open", { name: name.toLowerCase(), pin: "1234" });
ok(r.status === 200, "after the lock ends, right PIN (name in other case) unlocks");
tok = r.j.token;
r = await api("list", {}); ok(r.status === 200 && r.j.files.length === 0, "empty list");
const tokSave = tok; tok = "bogus.sig"; r = await api("list"); ok(r.status === 401, `bad token rejected: ${r.status}`); tok = tokSave;
const files = [
  ["Cases/2025/Ramesh Das case.pdf", "Case file of Ramesh Das. Land dispute at Barasat mouza 112. Hearing on 12 March 2026."],
  ["Cases/2025/notes.docx", "Notesheet: forwarded the Barasat land file to SDO for enquiry."],
  ["Accounts/budget.xlsx", "[Sheet: Budget]\nItem\tAmount\nComputers\t250000\nFurniture\t75000"],
  ["Accounts/readme.txt", "Accounts folder for the 2026 financial year."],
  ["বাংলা/বিদ্যালয় নোটিশ.txt", "বিদ্যালয়ের মিড ডে মিল প্রকল্পের নোটিশ। রান্নার গ্যাস সিলিন্ডার সরবরাহ নিয়ে অভিযোগ।"],
  ["Scans/photo.jpg", null]
];
for (const [p, text] of files) { const c = await upload(p, Buffer.from("BYTES of " + p + " ".repeat(300)), text); ok(c.status === 200, `upload ${p}`); }
r = await api("list"); ok(r.j.files.length === 6 && r.j.folders.includes("Cases/2025") && r.j.folders.includes("বাংলা"), `list: ${r.j.files.length} files, folders ${JSON.stringify(r.j.folders)}, used ${r.j.used}`);
const byPath = p => r.j.files.find(f => f.path === p);
// multi-part file (3 parts of 10 MB) with bytes check via presigned GET
const big = Buffer.alloc(25 * 1024 * 1024 + 123, 7); big.write("HEAD-MARK"); big.write("TAIL", big.length - 4);
let c = await upload("Big/big.bin", big, null); ok(c.status === 200, "25 MB multi-part upload (3 parts)");
const dl = await api("download", { id: c.j.id }); const got = Buffer.from(await (await fetch(dl.j.url.startsWith("http") ? dl.j.url : B + dl.j.url)).arrayBuffer());
ok(got.length === big.length && await md5(got) === await md5(big), `presigned download matches (${got.length} bytes)`);
// rename / move / mkdir / delete
const txt = byPath("Accounts/readme.txt");
r = await api("rename", { id: txt.id, name: "README 2026.txt" }); ok(r.status === 200, "rename file");
r = await api("mkdir", { path: "Archive" }); ok(r.status === 200, "new folder");
r = await api("move", { ids: [txt.id], to: "Archive" }); ok(r.status === 200, "move file");
r = await api("rename", { folder: "Cases", name: "Court Cases" }); ok(r.status === 200, "rename folder");
r = await api("move", { folders: ["Court Cases"], to: "Court Cases/2025" }); ok(r.status === 400, `move folder into itself refused: ${r.j.error}`);
r = await api("upload/init", { path: "../../etc/passwd", size: 1 }); ok(r.status === 400, `path traversal refused: ${r.j.error}`);
r = await api("list"); ok(r.j.files.some(f => f.path === "Archive/README 2026.txt") && r.j.files.some(f => f.path === "Court Cases/2025/Ramesh Das case.pdf"), "list after rename/move shows new paths");
r = await api("delete", { folders: ["Big"] }); ok(r.status === 400, "delete without confirm refused");
r = await api("delete", { folders: ["Big"], confirm: true }); ok(r.status === 200 && r.j.deleted === 1, `delete folder (freed; used now ${r.j.used})`);
// quota: default 2 GB; ask for more than is left
r = await api("upload/init", { path: "huge.iso", size: 2 * 1024 ** 3 }); ok(r.status === 413 && r.j.error === "quota", `quota enforced: ${r.status} ${r.j.error}`);
r = await api("upload/init", { path: "huge.iso", size: 3 * 1024 ** 3 }); ok(r.status === 413, `over max file size: ${r.j.error}`);
r = await api("upload/init", { path: "Court Cases/2025/notes.docx", size: 5 }); ok(r.status === 409, "same path without overwrite -> 409 exists (UI asks to confirm)");
// AI
const ask = async (question, extra = {}) => { const res = await api("ai", { question, lang: "en", ...extra }, true); const lines = (await res.text()).trim().split("\n").map(l => JSON.parse(l)); return lines; };
let L = await ask("When is the hearing in the Barasat land dispute?");
let a = L.at(-1); console.log("  AI:", a.text, "| sources:", a.sources);
ok(a.type === "answer" && a.sources[0] === "Court Cases/2025/Ramesh Das case.pdf", "AI question retrieves the right file first");
L = await ask("রান্নার গ্যাস নিয়ে অভিযোগ কোথায়?"); a = L.at(-1); console.log("  AI(bn):", a.sources);
ok(a.sources[0] === "বাংলা/বিদ্যালয় নোটিশ.txt", "Bengali question retrieves the Bengali file");
L = await ask("Summarise every file and write a report", { mode: "analyse" }); a = L.at(-1);
console.log("  progress:", L.filter(x => x.type === "progress").map(x => x.msg).join(" | "));
ok(a.actions.length === 1 && a.actions[0].path === "Reports/summary.md", `analyse (map-reduce) returns a write action: ${JSON.stringify(a.actions[0] && a.actions[0].path)}; noText=${JSON.stringify(a.noText)}`);
c = await upload(a.actions[0].path, Buffer.from(a.actions[0].content), a.actions[0].content);
r = await api("list"); ok(c.status === 200 && r.j.files.some(f => f.path === "Reports/summary.md"), "AI-written file saved and listed");
L = await ask("what is this", { scope: { ids: [byPath("Scans/photo.jpg").id] } }); ok(/OCR/.test(L.at(-1).text), "scanned image only: says OCR isn't supported");
L = await ask("budget", { scope: { folder: "Accounts" } }); ok(L.at(-1).sources.every(s => s.startsWith("Accounts/")), `folder scope: ${L.at(-1).sources}`);
