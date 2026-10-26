// Word round 2: comments, track changes (accept/reject), columns, table of contents, footnotes, watermark; docx keeps them.
import puppeteer from "puppeteer-core"; import fs from "node:fs"; import { execSync } from "node:child_process";
const B = process.env.BASE || "http://localhost:3997", SH = process.env.SH || "/workspace/v-word-r2";
fs.mkdirSync(SH, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const sl = ms => new Promise(r => setTimeout(r, ms)); let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 }); let perr = 0; p.on("pageerror", e => { perr++; console.log("PAGEERR", String(e)); });
let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
// 💾 Save to conversation in all 4 editors: each click = a NEW row, count goes up at once, row reopens the same document. Reuses one pendrive (PD/PIN) or creates zz-test.
await p.click("#sec-pendrive"); await sl(500);
if (process.env.PD) { await p.type("#pd-o-name", process.env.PD); await p.type("#pd-o-pin", process.env.PIN || "482915"); await p.$eval("#pd-open-form", f => f.requestSubmit()); }
else { await p.type("#pd-c-name", "zz-test-cv-" + Date.now().toString(36)); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit()); }
await p.waitForSelector("#pd-main", { visible: true, timeout: 30000 }); await sl(800);
const tag = "CV" + Date.now().toString(36);
const fill = {
  word: () => p.evaluate(t => { const pg = BA_ED.kinds.word.page(); pg.innerHTML = `<p>${t} word</p>`; pg.dispatchEvent(new Event("input", { bubbles: true })); }, tag),
  note: () => p.evaluate(t => { const ta = document.querySelector("#np-ta"); ta.value = t + " note"; ta.dispatchEvent(new Event("input", { bubbles: true })); }, tag),
  excel: () => p.evaluate(t => { BA_ED.kinds.excel._api().aiEdit(({ book, putRaw }) => putRaw(book.sheets[0], 0, 0, t + " excel")); }, tag),
  image: () => p.evaluate(() => { const a = BA_ED.kinds.image._api(); const L = a.layers()[0]; const g = L.c.getContext("2d"); g.fillStyle = "#ff0000"; g.fillRect(10, 10, 40, 40); BA_ED.st.image.dirty = true; }),
};
const check = { word: () => p.evaluate(() => BA_ED.kinds.word.page().innerText), note: () => p.$eval("#np-ta", e => e.value), excel: () => p.evaluate(() => String(BA_ED.kinds.excel._api().val(0, 0, 0))), image: () => p.evaluate(t => { const d = BA_ED.kinds.image._api().flat().getContext("2d").getImageData(20, 20, 1, 1).data; return d[0] > 200 && d[1] < 60 ? t + " image red" : "pixel " + [...d].join(","); }, tag) };
for (const k of ["word", "excel", "image", "note"]) {
  await p.click("#ed-tab-" + k); await sl(900); await fill[k]();
  await sl(3000); const ids0 = await p.evaluate(k => BA_ED.ai.S[k].rows.map(r => r.id), k); const msgs = [];
  for (let i = 0; i < 2; i++) { await p.$eval("#ea-st-" + k, x => x.textContent = ""); await p.click("#ed-conv-" + k);
    await p.waitForFunction(k => /✓ Saved to Conversations|Could not save|Nothing to save/.test(document.getElementById("ea-st-" + k).textContent), { timeout: 90000 }, k); msgs.push(await p.$eval("#ea-st-" + k, x => x.textContent)); }
  const rws = await p.evaluate(k => BA_ED.ai.S[k].rows.map(r => r.id), k); const sum = await p.$eval("#ea-cv-" + k + " summary", e => e.textContent);
  const fresh = rws.filter(x => !ids0.includes(x));
  ok(fresh.length === 2 && new Set(rws).size === rws.length && sum.includes("· " + rws.length) && ids0.every(x => rws.includes(x)), `${k}: 2 clicks = 2 new rows (${ids0.length}→${rws.length}), summary "${sum}", msgs ${JSON.stringify(msgs)}`);
  { await p.evaluate(k => { if (k === "image") { const g = BA_ED.kinds.image._api().layers()[0].c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 100, 100); } }, k); await p.evaluate(k => { BA_ED.st[k].dirty = false; }, k);
    await p.$eval(`[data-ea-open="${fresh[0]}"]`, e => e.click()); await sl(2500); const v = await check[k](); ok(v.includes(tag), `${k}: row reopens the document (${v.slice(0, 40)})`); }
}
ok(perr === 0, "no page errors"); console.log(fails ? fails + " FAILED" : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
