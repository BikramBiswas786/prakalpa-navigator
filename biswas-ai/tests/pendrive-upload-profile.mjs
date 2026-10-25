// upload profiler: 100 small docs + one 200 MB file on a fresh zz-test pendrive
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3997", TAG = process.env.TAG || "run";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 950 });
p.on("dialog", d => d.accept());
const sl = ms => new Promise(r => setTimeout(r, ms));
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="bn"]'); if (await p.$eval("#gate", g => !g.hidden)) { await p.type("#gate-name", "Tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(500); }
await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-up-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true }); await sl(1500);
await p.evaluate(() => { performance.setResourceTimingBufferSize(100000); performance.clearResourceTimings(); });
const files = fs.readdirSync((process.env.UPDIR || "/tmp/up100")).map(f => (process.env.UPDIR || "/tmp/up100") + "/" + f).concat(process.env.NOBIG ? [] : [(process.env.BIG || "/tmp/big200.bin")]);
const t0 = Date.now(); let tSmall = 0;
await (await p.$("#pd-file-in")).uploadFile(...files); await sl(300);
for (let i = 0; i < 40 && !(await p.$("#pd-confirm:not([hidden]) [data-pd-sum-go]")); i++) await sl(250);
if (await p.$("#pd-confirm:not([hidden]) [data-pd-sum-go]")) await p.click("[data-pd-sum-go]");
let shotDone = false;
for (let i = 0; i < 2400; i++) {
  await sl(500);
  const s = await p.evaluate(() => ({ small: pd.ups.filter(u => u.file.size < 16e6 && ["done", "fail", "skip"].includes(u.state)).length, nSmall: pd.ups.filter(u => u.file.size < 16e6).length, busy: (pd.textLeft || pd.ups.some(u => !["done", "fail", "skip", "cancel"].includes(u.state))), bar: (document.querySelector("#pd-ups, #pd-uploads, .pd-ups") || {}).innerText || "" }));
  if (!tSmall && s.nSmall && s.small === s.nSmall) tSmall = Date.now() - t0;
  if (!shotDone && i === 20) { await p.screenshot({ path: `/workspace/up-${TAG}-progress.png` }); shotDone = true; }
  if (!s.busy && i > 2) break;
}
const total = Date.now() - t0;
const st = await p.evaluate(() => ({ done: pd.ups.filter(u => u.state === "done").length, fail: pd.ups.filter(u => u.state === "fail").map(u => u.path + ": " + u.err).slice(0, 5), n: pd.ups.length, server: 0 }));
st.server = await p.evaluate(async () => { const l = (await pdApi("list", {})).files; return { files: l.length, withText: l.filter(f => f.text).length, bytes: l.reduce((a, f) => a + f.size, 0) }; });
const rt = await p.evaluate(() => { const o = {}; for (const e of performance.getEntriesByType("resource")) { const u = new URL(e.name); const k = u.pathname.startsWith("/api/pd/") ? u.pathname.slice(8) : (e.initiatorType === "xmlhttprequest" ? "PUT " + u.host : null); if (!k) continue; (o[k] = o[k] || []).push(e.duration); } return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { n: v.length, avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), max: Math.round(Math.max(...v)) }])); });
console.log(JSON.stringify({ TAG, name, files: files.length, smallDoneMs: tSmall, totalMs: total, ...st, requests: rt }, null, 1));
if (process.env.CLEAN !== "0") await p.evaluate(async () => { const f = (await pdApi("list", {})).files; await pdApi("delete", { confirm: true, ids: f.map(x => x.id), folders: pd.folders }); });
await b.close();
