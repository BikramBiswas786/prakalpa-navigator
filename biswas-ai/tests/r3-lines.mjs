// Word round 2: comments, track changes (accept/reject), columns, table of contents, footnotes, watermark; docx keeps them.
import puppeteer from "puppeteer-core"; import fs from "node:fs"; import { execSync } from "node:child_process";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/tmp/r3";
fs.mkdirSync(SH, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const sl = ms => new Promise(r => setTimeout(r, ms)); let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 }); let perr = 0; p.on("pageerror", e => { perr++; console.log("PAGEERR", String(e)); });
let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
await p.type("#pd-c-name", "zz-test-w2r-" + Date.now().toString(36)); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 30000 }); await sl(800);
await p.click("#ed-tab-word"); await sl(800);
await p.evaluate(() => { const pg = BA_ED.kinds.word.page(); pg.innerHTML = "<p>Top</p><table><tr><td>a</td><td>b</td></tr></table><p>End</p>"; pg.focus(); const r = document.createRange(); r.selectNodeContents(pg.firstChild); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
await p.click("#wd-vl"); await sl(300); await p.click("#wd-hr"); await sl(300);
ok(await p.$("#wd-page div.wd-vline") && await p.$("#wd-page hr.wd-hr"), "V1 vertical + horizontal line inserted");
const vb = await p.$eval("#wd-page div.wd-vline", e => { const r = e.getBoundingClientRect(); return { x: r.left + 1, y: r.top + 20, b: r.bottom }; });
await p.mouse.click(vb.x, vb.y); await sl(300);
ok(await p.evaluate(() => document.querySelectorAll("#wd-selbox .wd-hnd").length === 2 && !!document.querySelector("#wd-ob-t") && !!document.querySelector("#wd-ob-c")), "V2 selected: 2 length handles + thickness/colour");
const hs = await p.$eval("#wd-selbox .wd-hd-s", e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const h0 = await p.$eval("#wd-page div.wd-vline", e => e.getBoundingClientRect().height);
await p.mouse.move(hs.x, hs.y); await p.mouse.down(); await p.mouse.move(hs.x, hs.y + 60, { steps: 5 }); await p.mouse.up(); await sl(200);
const h1 = await p.$eval("#wd-page div.wd-vline", e => e.getBoundingClientRect().height); ok(h1 > h0 + 30, `V3 drag lengthens ${h0}→${h1}`);
await p.$eval("#wd-ob-t", e => { e.value = "4"; e.dispatchEvent(new Event("change")); }); await p.$eval("#wd-ob-c", e => { e.value = "#ff0000"; e.dispatchEvent(new Event("change")); });
ok(await p.$eval("#wd-page div.wd-vline", e => getComputedStyle(e).borderLeftWidth === "4px" && /255, 0, 0/.test(getComputedStyle(e).borderLeftColor)), "V4 thickness 4 + red");
const b64 = await p.evaluate(async () => { const { blob } = await BA_ED.kinds.word.export(); const u = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (const x of u) s += String.fromCharCode(x); return btoa(s); });
fs.writeFileSync("/tmp/r3.docx", Buffer.from(b64, "base64")); const d = execSync(`unzip -p /tmp/r3.docx word/document.xml`).toString();
ok(/<v:line[^>]*strokecolor="#ff0000"[^>]*strokeweight="3\.0pt"/i.test(d) && /w:pBdr><w:bottom/.test(d), "V5 docx has the vertical (VML) and horizontal lines");
await p.click("#ed-tab-note"); await sl(600);
for (const q of ['add line one', 'add line two', 'add line three']) { await p.$eval("#ea-q-note", (e, v) => { e.value = v; }, q); const n = await p.evaluate(() => BA_ED.ai.S.note.thread.length); await p.click("#ea-go-note"); await p.waitForFunction(n => BA_ED.ai.S.note.thread.length > n, { timeout: 60000 }, n); }
ok(await p.evaluate(() => { const d = document.querySelector("#ea-hist-note"); return d && !d.open && /\(2\)/.test(d.querySelector("summary").textContent) && document.querySelectorAll("#ea-thread-note > .ea-last").length === 1 && getComputedStyle(document.querySelector("#ea-thread-note")).position === "static"; }), "A1 only the latest reply shown; History (2) closed");
ok(perr === 0, "no page errors"); console.log(fails ? fails + " FAILED" : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
