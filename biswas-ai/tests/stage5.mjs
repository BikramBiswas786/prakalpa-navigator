// Stage 5: AI panel under each editor, Save to conversation (always new rows), New page, Conversations strip, attachments + format mirroring, Undo.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-stage5";
fs.mkdirSync(SH, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 300000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
p.on("pageerror", e => console.log("PAGEERR", String(e)));
let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
const gate = async () => { for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); } };
await gate(); await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-s5-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(800);
const waitRows = (k, n) => p.waitForFunction((k, n) => document.querySelectorAll(`#ea-cvlist-${k} .ea-cvrow`).length === n, { timeout: 20000 }, k, n).catch(() => {});
const rowsN = k => p.$$eval(`#ea-cvlist-${k} .ea-cvrow`, r => r.length);
const ask = async (k, q, files = []) => {
  if (files.length) { const inp = await p.$("#ea-file-" + k); await inp.uploadFile(...files); await p.waitForFunction(k => BA_ED.ai.S[k].atts.length && BA_ED.ai.S[k].atts.every(a => !a.busy), { timeout: 180000 }, k); }
  await p.$eval("#ea-q-" + k, (e, v) => { e.value = v; }, q); const n = await p.evaluate(k => BA_ED.ai.S[k].thread.length, k);
  await p.click("#ea-go-" + k); await p.waitForFunction((k, n) => BA_ED.ai.S[k].thread.length > n || /AI error/.test(document.getElementById("ea-st-" + k).textContent), { timeout: 120000 }, k, n); await sl(300);
  return p.evaluate(k => ({ st: document.getElementById("ea-st-" + k).textContent, last: (BA_ED.ai.S[k].thread.slice(-1)[0] || {}).a || "" }), k);
};
// ---------- Word basics ----------
for (const k of ["excel", "image", "note", "word"]) { await p.click("#ed-tab-" + k); await sl(500); }
ok(await p.evaluate(() => !document.querySelector("[data-ed=ask]") && ["word", "excel", "image", "note"].every(k => !document.querySelector(`#ed-${k} [data-ed=conv]`) && document.querySelector(`#ed-${k} [data-ed=newpage]`))), "S1 no Ask AI button, no Save to conversation button; New page present");
ok(await p.evaluate(() => { const pan = document.getElementById("ea-word"), body = BA_ED.st.word.body; return !!pan && !!(body.compareDocumentPosition(pan) & Node.DOCUMENT_POSITION_FOLLOWING) && document.getElementById("ea-q-word").placeholder === "Write what to edit or change in this file…" && !pan.querySelector(".chip,.chips"); }), "S2 AI panel below the editor, placeholder right, no example chips");
await p.evaluate(() => { BA_ED.kinds.word.page().innerHTML = "<h1>Report</h1><p>The budget is low.</p>"; BA_ED.kinds.word.page().dispatchEvent(new Event("input", { bubbles: true })); });
await p.evaluate(() => BA_ED.ai.save("word")); await waitRows("word", 1); await p.evaluate(() => BA_ED.ai.save("word")); await waitRows("word", 2);
ok(await rowsN("word") === 2, "S3 (internal save used by New page) twice → 2 rows: " + await rowsN("word"));
ok(await p.$$eval("#ea-cvlist-word .ea-cvrow", r => new Set(r.map(x => x.dataset.eaRow)).size === 2 && r.every(x => /^word-[0-9a-f]{16}$/.test(x.dataset.eaRow) && /Untitled\.docx · \d{4}-/.test(x.textContent))), "S4 rows have unique area-tagged ids and file name + time titles");
await p.$eval("#ea-cv-word", d => { d.open = true; }); await shot("s01-two-rows");
// AI edit + undo
let r = await ask("word", 'replace "low" with "high"');
ok(await p.evaluate(() => /budget is high/.test(BA_ED.kinds.word.page().innerText)) && /Applied 1/.test(r.last), "S5 AI instruction applied to the open file: " + r.last);
ok(await p.$eval("#ea-res-word", e => !e.hidden), "S6 Apply / Undo shown"); await shot("s02-ai-applied");
await p.click("#ea-undo-word"); await sl(500);
ok(await p.evaluate(() => /budget is low/.test(BA_ED.kinds.word.page().innerText)), "S7 Undo restores the document");
r = await ask("word", "What is this file about?");
ok(/MOCK answer|\S/.test(r.last) && await p.evaluate(() => /budget is low/.test(BA_ED.kinds.word.page().innerText)), "S8 question answered without changing the file");
ok(await p.$$eval("#ea-thread-word .ea-turn", t => t.length) === 3, "S9 per-document thread shows the exchanges");
// New page
await p.evaluate(() => { const pg = BA_ED.kinds.word.page(); pg.querySelector("h1").textContent = "Report v2"; pg.dispatchEvent(new Event("input", { bubbles: true })); });
await p.click("#ed-word [data-ed=newpage]"); await waitRows("word", 3); await p.waitForFunction(() => !BA_ED.kinds.word.page().innerText.trim(), { timeout: 15000 }).catch(() => {});
ok(await rowsN("word") === 3 && await p.evaluate(() => !BA_ED.kinds.word.page().innerText.trim() && !BA_ED.ai.S.word.thread.length), "S10 New page auto-saves the old document then leaves a blank one");
await shot("s03-newpage");
await p.click("#ed-word [data-ed=newpage]"); await sl(800);
ok(await rowsN("word") === 3, "S11 New page on an empty document does not save a row");
// open row restores doc + thread
await p.$eval("#ea-cv-word", d => { d.open = true; }); const first = await p.$eval("#ea-cvlist-word .ea-cvrow", e => e.dataset.eaRow);
await p.click(`[data-ea-open="${first}"]`); await sl(1500);
ok(await p.evaluate(() => /Report v2/.test(BA_ED.kinds.word.page().innerText) && BA_ED.ai.S.word.thread.length === 3), "S12 opening a row restores the document and its thread");
await shot("s04-row-restored");
PROMPT = "My renamed report"; await p.$eval("#ea-cv-word", d => { d.open = true; }); await p.click(`[data-ea-ren="${first}"]`); await p.waitForFunction(f => (document.querySelector(`[data-ea-row="${f}"] .ea-cvt`) || {}).textContent === "My renamed report", { timeout: 15000 }, first).catch(() => {}); await sl(2500);
ok(await p.$eval(`[data-ea-row="${first}"] .ea-cvt`, e => e.textContent) === "My renamed report", "S13 rename row");
await p.click(`[data-ea-del="${first}"]`); await waitRows("word", 2); ok(await rowsN("word") === 2, "S14 delete row");
ok(await p.evaluate(async () => (await pdApi("edconv/list", { area: "excel" })).rows.length === 0), "S15 conversations are separate per editor");
// ---------- Government memo format ----------
const memo = await p.evaluate(async () => {
  const html = `<p style="text-align:center"><b>GOVERNMENT OF WEST BENGAL</b></p><p style="text-align:center">Office of the District Magistrate</p><p>Memo No. 123/DM/2026</p><p style="text-align:right">Date: 01.10.2026</p><p>Subject: Old subject</p>
   <table><tr><td><b>Sl</b></td><td><b>Item</b></td><td><b>Remarks</b></td></tr><tr><td>1</td><td>Old item</td><td>—</td></tr></table><p style="text-align:right">Sd/- District Magistrate</p>`;
  const d = document.createElement("div"); d.innerHTML = html; const blob = await BA_ED.htmlToDocx(d, {}); const u = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (const x of u) s += String.fromCharCode(x); return btoa(s); });
fs.writeFileSync("/tmp/s5-memo.docx", Buffer.from(memo, "base64"));
await p.click("#ed-word [data-ed=newpage]"); await sl(1200);
r = await ask("word", "make a new memo in exactly this format about Flood relief camps", ["/tmp/s5-memo.docx"]);
const m = await p.evaluate(() => { const pg = BA_ED.kinds.word.page(); const ps = [...pg.querySelectorAll("p")]; const t = pg.querySelector("table");
  return { text: pg.innerText, tables: pg.querySelectorAll("table").length, cols: t ? t.rows[0].cells.length : 0, cell: t ? t.rows[1].cells[1].innerText.trim() : "", center: ps.some(p => /GOVERNMENT/.test(p.innerText) && getComputedStyle(p).textAlign === "center"), right: ps.some(p => /Date:/.test(p.innerText) && getComputedStyle(p).textAlign === "right"), name: BA_ED.st.word.name }; });
ok(m.tables === 1 && m.cols === 3 && /Flood relief/.test(m.cell) && /Subject: Flood relief/.test(m.text) && /GOVERNMENT OF WEST BENGAL/.test(m.text) && m.center && m.right, "S16 memo format mirrored (heading centred, date right, 3-col table, new subject): " + JSON.stringify({ ...m, text: m.text.slice(0, 80) }));
ok(/format of s5-memo/.test(r.last) && /Tables: 1/.test(r.last), "S17 reply says format loaded and verifies table count");
await shot("s05-memo-format");
// ---------- Excel format fill ----------
await p.click("#ed-tab-excel"); await sl(600);
const xb = await p.evaluate(async () => { await load("xlsx"); const ws = XLSX.utils.aoa_to_sheet([["Item", "Amount"], ["Rice", 0], ["Dal", 0], ["Oil", 0], ["Total", { f: "SUM(B2:B4)" }]]); ws.B5 = { t: "n", f: "SUM(B2:B4)", v: 0 }; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Budget"); return XLSX.write(wb, { type: "base64", bookType: "xlsx" }); });
fs.writeFileSync("/tmp/s5-budget.xlsx", Buffer.from(xb, "base64"));
r = await ask("excel", "fill this format with these numbers 100 250 50", ["/tmp/s5-budget.xlsx"]);
const x = await p.evaluate(() => { const a = BA_ED.kinds.excel._api(); return { sheet: a.book.sheets[0].name, a1: a.book.sheets[0].cells.get("0,0"), b5: a.show(a.val(4, 1, 0)), f: a.book.sheets[0].cells.get("4,1") }; });
ok(x.sheet === "Budget" && x.a1 === "Item" && String(x.f).startsWith("=") && x.b5 === "400" && /B5=400/.test(r.last), "S18 xlsx format filled, total recalculated: " + JSON.stringify(x) + " / " + r.last.replace(/\n/g, " | "));
await shot("s06-excel-format");
// ---------- screenshot → Word ----------
await p.click("#ed-tab-word"); await sl(400); await p.click("#ed-word [data-ed=newpage]"); await sl(1000);
const png = await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 900; c.height = 200; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 900, 200); g.fillStyle = "#000"; g.font = "bold 44px sans-serif"; g.fillText("Meeting at ten today", 30, 80); g.fillText("Bring the files", 30, 150); return c.toDataURL("image/png").split(",")[1]; });
fs.writeFileSync("/tmp/s5-shot.png", Buffer.from(png, "base64"));
r = await ask("word", "type this into Word", ["/tmp/s5-shot.png"]);
const wt = await p.evaluate(() => BA_ED.kinds.word.page().innerText);
ok(/Meeting at ten/i.test(wt) && /Bring the files/i.test(wt), "S19 screenshot typed into Word: " + wt.replace(/\n/g, " | ").slice(0, 80));
ok(/OCR|vision/.test(r.last), "S20 says how the image text was read: " + r.last.replace(/\n/g, " | ").slice(-120));
const lng = await ask("word", "What is this file about?"); ok(!/[\u0980-\u09FF]/.test(lng.last), "S19b reply in English when the screen is English: " + lng.last.slice(0, 80));
await shot("s07-screenshot-word");
// ---------- Notepad / Image quick ----------
await p.click("#ed-tab-note"); await sl(500);
await p.evaluate(() => { const t = document.getElementById("np-ta"); t.value = "alpha\nbeta"; t.dispatchEvent(new Event("input", { bubbles: true })); });
r = await ask("note", 'replace "beta" with "gamma"'); ok(await p.$eval("#np-ta", e => e.value) === "alpha\ngamma", "S21 Notepad AI edit");
await p.click("#ea-undo-note"); await sl(300); ok(await p.$eval("#np-ta", e => e.value) === "alpha\nbeta", "S22 Notepad undo");
await p.click("#ed-note [data-ed=newpage]"); await waitRows("note", 1); ok(await rowsN("note") === 1, "S23 Notepad conversation row");
await p.click("#ed-tab-image"); await sl(600);
r = await ask("image", 'make a poster "Hello Stage 5"'); let px = await p.evaluate(() => { const c = BA_ED.kinds.image._api().flat(); const d = c.getContext("2d").getImageData(2, 2, 1, 1).data; return [...d].slice(0, 3); });
const MOCK = process.env.MOCK === "1"; ok(MOCK ? px.join() === "0,0,0" : px.join() !== "255,255,255", "S24 Image AI edit (black background + text): " + px + " " + r.st + " " + r.last.slice(0, 120));
await p.click("#ea-undo-image"); await sl(800); const px2 = await p.evaluate(() => [...BA_ED.kinds.image._api().flat().getContext("2d").getImageData(2, 2, 1, 1).data].slice(0, 4));
ok(px2.join() !== "0,0,0,255", "S26 Image undo: " + px2);
r = await ask("image", 'make a poster "Hello Stage 5"'); px = await p.evaluate(() => [...BA_ED.kinds.image._api().flat().getContext("2d").getImageData(2, 2, 1, 1).data].slice(0, 3)); await p.click("#ed-image [data-ed=newpage]"); await waitRows("image", 1); ok(await rowsN("image") === 1, "S25 Image conversation row");
await p.$eval("#ea-cv-image", d => { d.open = true; }); const ir = await p.$eval("#ea-cvlist-image .ea-cvrow", e => e.dataset.eaRow); await p.click(`[data-ea-open="${ir}"]`); await sl(1500);
const px3 = await p.evaluate(() => [...BA_ED.kinds.image._api().flat().getContext("2d").getImageData(2, 2, 1, 1).data].slice(0, 4));
ok(px3.slice(0, 3).join() === px.join() && px3[3] === 255, "S27 Image row reopens the saved picture: " + px3);
await shot("s08-image");
// paste a file onto the AI box
await p.click("#ed-tab-note"); await sl(300);
await p.evaluate(() => { const dt = new DataTransfer(); dt.items.add(new File(["pasted text"], "p.txt", { type: "text/plain" })); const e = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }); document.getElementById("ea-q-note").dispatchEvent(e); });
await sl(800); ok(await p.$$eval("#ea-chips-note .ea-chip", c => c.length === 1 && /p\.txt/.test(c[0].textContent)), "S28 paste a file onto the AI box adds a removable chip");
await p.click("#ea-chips-note .ea-x"); await sl(200); ok(await p.$$eval("#ea-chips-note .ea-chip", c => c.length) === 0, "S29 chip removed");
console.log(fails ? `${fails} FAILED` : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
