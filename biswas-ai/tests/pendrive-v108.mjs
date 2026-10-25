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
// v108: table requests always get a markdown table (server re-asks when the model answers in prose)
const name = "zz-test-v108-" + Date.now();
let r = await api("create", { name, pin: "1234" }); tok = r.j.token;
const u = await upload("অফিস/a.txt", new TextEncoder().encode("বাজেট ২০২৫"), "বাজেট ২০২৫ বিল");
const ask = async (question, format, mode = "ask") => { const t = await (await api("ai", { question, format, mode, scope: {} }, true)).text(); return t.trim().split("\n").map(l => JSON.parse(l)).find(e => e.type === "answer"); };
const hasT = s => /^\s*\|.*\|\s*\n\s*\|?\s*:?-{2,}/m.test(s || "");
let a = await ask("prose table please", "auto"); ok(hasT(a.text) && /পুনর্গঠিত/.test(a.text), "prose answer to a table question is reshaped into a table");
a = await ask("prose সারণি দাও", "auto", "analyse"); ok(hasT(a.text), "Bengali সারণি (analyse/map-reduce) gets a table");
a = await ask("prose summary", "table"); ok(hasT(a.text), "format=table forces a table");
a = await ask("prose summary", "auto"); ok(!hasT(a.text), "plain question left alone");
a = await ask("prose তালিকা", "letter"); ok(!/পুনর্গঠিত/.test(a.text), "letter format does not force a table");
await api("delete", { confirm: true, ids: [u.j.id], folders: ["অফিস"] });
