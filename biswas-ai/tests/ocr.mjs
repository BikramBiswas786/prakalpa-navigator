// OCR hotfix: pictures and scanned PDFs get their text read (vision model or Tesseract), the AI cites "image text",
// and "write it on a black background image" returns a PNG with Download / Open in Drafting Image.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-ocr-live", FX = "/tmp/ocrfx";
fs.mkdirSync(SH, { recursive: true }); fs.mkdirSync(FX, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 300000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
// fixtures: a "screenshot" with English + Bengali text, and an image-only (scanned) PDF
const fx = await b.newPage(); await fx.setViewport({ width: 900, height: 420 });
const HTML = `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;700&display=swap"></head><body style="margin:0;padding:30px;background:#fff;font:28px 'Noto Sans Bengali',Arial"><h2 style="margin:0 0 16px">Office Notice 2026</h2><div>Electricity bill amount is 4520 rupees</div><div>Water bill amount is 780 rupees</div><div style="margin-top:14px">বিদ্যুৎ বিল জমা দিতে হবে</div><div>অফিস সভা সোমবার</div></body></html>`;
await fx.setContent(HTML, { waitUntil: "networkidle0" }); await sl(800);
await fx.screenshot({ path: FX + "/notice-screenshot.png" });
const png64 = fs.readFileSync(FX + "/notice-screenshot.png").toString("base64");
await fx.setContent(`<html><body style="margin:0"><img src="data:image/png;base64,${png64}" style="width:100%"></body></html>`, { waitUntil: "load" });
await fx.pdf({ path: FX + "/scanned-letter.pdf", format: "A4", printBackground: true }); await fx.close();
fs.copyFileSync(FX + "/notice-screenshot.png", FX + "/Untitled.png");

const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
const errs = []; p.on("pageerror", e => errs.push(String(e)));
p.on("dialog", d => d.accept());
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-ocr-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(1200);
if (await p.$('.pd-bgo[data-pd-br=""]')) { await p.click('.pd-bgo[data-pd-br=""]'); await sl(500); }
const up = async f => { await (await p.$("#pd-file-in")).uploadFile(f); await sl(800); if (await p.$("#pd-confirm:not([hidden]) [data-pd-sum-go]")) await p.click("[data-pd-sum-go]"); };
const fileOf = async n => p.evaluate(async n => (await pdApi("list", {})).files.find(f => f.path.endsWith(n)) || null, n);
const waitText = async n => { for (let i = 0; i < 120; i++) { const f = await fileOf(n); if (f && (f.text || f.note)) return f; await sl(2000); } return fileOf(n); };
const ask = async q => {
  await p.evaluate(() => { pd.outs.length = 0; $("#pd-answer").innerHTML = ""; }); await p.$eval("#pd-q", e => { e.value = ""; }); await p.type("#pd-q", q);
  await p.click("#pd-ask"); await p.waitForFunction(() => pd.outs.length > 0 || /error|Could not/i.test($("#pd-ai-progress").innerText), { timeout: 240000 }); await sl(1500);
  return p.evaluate(() => ({ text: (pd.outs[0] || {}).md || "", cites: [...document.querySelectorAll("#pd-answer .pd-cite")].map(b => b.textContent), err: $("#pd-ai-progress").innerText, actions: pd.actions }));
};

/* O1–O4 screenshot (English + Bengali) */
const t0 = Date.now(); await up(FX + "/Untitled.png");
let f = await waitText("Untitled.png");
ok(f && f.text && /^ocr/.test(f.note || ""), `O1 Untitled.png text read on upload by ${f && f.note} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await p.evaluate(() => pdRefresh()); await sl(1000);
const row = await p.evaluate(() => { const r = [...document.querySelectorAll("#pd-rows tr")].find(t => /Untitled\.png/.test(t.innerText)); return r ? r.innerText : ""; });
ok(/Text read by OCR/.test(row) && !/OCR not supported/.test(row), "O2 row says 🔍 Text read by OCR: " + row.replace(/\s+/g, " ").slice(0, 120));
const ocrText = await p.evaluate(async n => { const f = pd.files.find(x => x.path.endsWith(n)); const j = await pdApi("download-urls", { ids: [f.id] }); const bl = await (await fetch(j.urls[f.id])).blob(); return (await BA_OCR.read(bl, n)).text; }, "Untitled.png");
ok(/Electricity/i.test(ocrText) && /4520/.test(ocrText), "O3 English text read: " + ocrText.split("\n").slice(0, 3).join(" / "));
ok(/[\u0980-\u09FF]{3,}/.test(ocrText), "O4 Bengali text read: " + (ocrText.match(/[\u0980-\u09FF][\u0980-\u09FF\s]+/g) || []).slice(0, 2).join(" / "));
await shot("o01-ocr-row");

/* O5 AI answers from the OCR text with an "image text" citation */
await p.evaluate(n => { const f = pd.files.find(x => x.path.endsWith(n)); pd.aiSel.clear(); pd.aiSel.add("f:" + f.id); pdAiSave(); renderPdList(); }, "Untitled.png"); await sl(400);
let a = await ask("What is the electricity bill amount?");
ok(a.cites.some(c => /image text/.test(c)) && /Untitled\.png/.test(a.cites.join(" ")), "O5 answer cites the picture as image text: " + a.cites.join(" | ") + " — " + a.text.slice(0, 120).replace(/\n/g, " "));
await shot("o02-answer-cites-image-text");

/* O6–O9 Bikram's exact request → a black PNG with the text */
a = await ask("Cut down everything… just write down all the text of this screenshot in a single blank black background image");
const img = a.actions.find(x => x.type === "image");
ok(!!img && img.bg === "#000000" && /^#fff/i.test(img.fg) && /4520/.test(img.text) && /[\u0980-\u09FF]{3}/.test(img.text), "O6 answer carries an image of ALL the screenshot text (black bg, white text): " + JSON.stringify(img && { bg: img.bg, fg: img.fg, n: img.text.length, head: img.text.slice(0, 60) }));
await p.waitForSelector(".pd-imgact[data-ready='1'] img", { timeout: 20000 }).catch(() => {});
const pix = await p.evaluate(async () => { const im = document.querySelector(".pd-imgact img"); if (!im) return null; await im.decode(); const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext("2d"); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let white = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) white++; return { w: c.width, h: c.height, corner: [...g.getImageData(2, 2, 1, 1).data], white }; });
ok(pix && pix.corner[0] === 0 && pix.corner[1] === 0 && pix.corner[2] === 0 && pix.white > 500, "O7 the PNG is black with white text: " + JSON.stringify(pix));
ok(!!(await p.$(".pd-imgact [data-pd-imgdl]")) && !!(await p.$(".pd-imgact [data-pd-imgopen]")), "O8 ⬇ Download PNG and Open in Drafting Image buttons");
await p.$eval(".pd-imgact", e => e.scrollIntoView({ block: "center" })).catch(() => {}); await sl(400); await shot("o03-black-image-answer");
await p.click(".pd-imgact [data-pd-imgopen]"); await sl(2000);
const ed = await p.evaluate(() => ({ tab: BA_ED.tab, W: BA_ED.kinds.image._api().W, name: BA_ED.st.image.name }));
ok(ed.tab === "image" && pix && ed.W === pix.w, "O9 opened in Drafting Image: " + JSON.stringify(ed));
await shot("o04-open-in-drafting-image");
await p.click("#ed-tab-files"); await sl(600);

/* O10–O11 scanned PDF */
await up(FX + "/scanned-letter.pdf");
f = await waitText("scanned-letter.pdf");
await p.evaluate(() => pdRefresh()); await sl(1200);
ok(f && f.text && /^ocr/.test(f.note || ""), "O10 scanned PDF read by OCR: " + JSON.stringify(f && { text: f.text, note: f.note }));
await p.evaluate(n => { const f = pd.files.find(x => x.path.endsWith(n)); pd.aiSel.clear(); pd.aiSel.add("f:" + f.id); pdAiSave(); renderPdList(); }, "scanned-letter.pdf"); await sl(400);
a = await ask("What is the water bill amount in the scanned letter?");
ok(a.cites.some(c => /scanned-letter\.pdf/.test(c) && /image text/.test(c)), "O11 answer about the scanned PDF cites it: " + a.cites.join(" | ") + " — " + a.text.slice(0, 120).replace(/\n/g, " "));
await shot("o05-scanned-pdf-answer");

/* O12 on-demand Read text (OCR) button */
await p.evaluate(() => { pd.aiSel.clear(); pdAiSave(); pdRefresh(); }); await sl(1200);
const btn = await p.evaluateHandle(() => [...document.querySelectorAll("#pd-rows tr")].find(t => /Untitled\.png/.test(t.innerText)).querySelector("[data-pd-ocr]"));
ok(!!(await btn.asElement()), "O12a row has a Read text (OCR) action");
if (await btn.asElement()) { await btn.asElement().click(); await p.waitForFunction(() => /Read \d+ characters/.test(document.body.innerText), { timeout: 240000 }).catch(() => {}); }
ok(await p.evaluate(() => /Read \d+ characters/.test(document.body.innerText)), "O12b Read text (OCR) re-reads the picture");
await shot("o06-read-text-action");

/* O13 no "OCR not supported" anywhere */
const page = await (await fetch(B + "/")).text();
ok(!/OCR not supported|OCR এখনও নেই|isn't supported yet/.test(page), "O13 no 'OCR not supported' text left in the app");
ok(!errs.length, "O14 no page errors " + errs.slice(0, 3).join(" | "));
await p.evaluate(async () => { try { await pdApi("delete-pendrive", {}); } catch (e) { /* ignore */ } });
await b.close();
console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
