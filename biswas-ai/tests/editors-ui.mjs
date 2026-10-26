// Drafting Desk editors (Word / Excel / Image / Notepad): open via the Branch → Folder → File picker, edit, Save (same path, old version kept),
// Save as (other branch/folder), reopen, Download. zz-test pendrive only. Fixtures: $FX (made by python-docx/openpyxl/PIL).
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-editors-live", FX = process.env.FX || SH + "/fx";
fs.mkdirSync(SH, { recursive: true }); const DL = SH + "/dl"; fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 240000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
const errs = []; p.on("pageerror", e => errs.push(String(e))); const bad = []; p.on("response", r => { if (r.status() >= 400) { const u = new URL(r.url()); bad.push(r.status() + " " + u.host + u.pathname.slice(0, 40)); } });
let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const cdp = await b.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-ed-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(1000);
// seed: Main/Docs, branch Office with Office/Reports
await p.evaluate(async () => { for (const f of ["Docs", "⎇/Office", "⎇/Office/Reports"]) await pdApi("mkdir", { path: f }); await pdRefresh(); });
const put = async (file, path) => { const b64 = fs.readFileSync(FX + "/" + file).toString("base64"); await p.evaluate(async (b64, path) => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await BA_ED.io.upload(path, new Blob([bytes])); }, b64, path); };
for (const [f, path] of [["sample.docx", "Docs/sample.docx"], ["sample.xlsx", "Docs/sample.xlsx"], ["photo.png", "Docs/photo.png"], ["notes.txt", "Docs/notes.txt"], ["data.csv", "Docs/data.csv"]]) await put(f, path);
ok(await p.evaluate(() => pd.files.length) === 5, "0 five fixture files uploaded to Main/Docs");
// tabs
const tabs = await p.$$eval("#ed-tabs [role=tab]", a => a.map(x => x.innerText.trim()));
ok(tabs.join("|").includes("Drafting Desk Word") && tabs.join("|").includes("Drafting Desk Excel") && tabs.join("|").includes("Drafting Image") && tabs.join("|").includes("Notepad"), "1 headline tabs: " + tabs.join(" | "));
ok(await p.evaluate(() => { const t = $("#ed-tabs"), c = $("#pd-convs"); return !!(t.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); }), "1b tabs sit above Conversations/Branches");
await shot("00-files-tab");
const openVia = async (tab, folderPath, fileName, branchVal = "") => {
  await p.click("#ed-tab-" + tab); await sl(300); await p.click(`#ed-${tab} [data-ed=open]`); await p.waitForSelector("dialog.ed-pick[open]");
  await p.select("#ed-pk-br", branchVal); await sl(100);
  for (const seg of folderPath) { await p.click(`dialog.ed-pick .ed-pk-folder[data-path$="${seg}"]`); await sl(100); }
  await p.click(`dialog.ed-pick .ed-pk-file[data-path$="/${fileName}"]`);
  await p.waitForFunction(t => BA_ED.st[t].file && !BA_ED.st[t].msg.textContent, { timeout: 30000 }, tab); await sl(400);
};
const save = async tab => { await p.click(`#ed-${tab} [data-ed=save]`); await p.waitForSelector("#ed-confirm-go"); await p.click("#ed-confirm-go"); await p.waitForFunction(t => /^Saved/.test(BA_ED.st[t].msg.textContent) || /Could not/.test(BA_ED.st[t].msg.textContent), { timeout: 60000 }, tab); return p.evaluate(t => BA_ED.st[t].msg.textContent, tab); };
const saveAs = async (tab, branch, folders, fname) => { await p.click(`#ed-${tab} [data-ed=saveas]`); await p.waitForSelector("dialog.ed-pick[open] #ed-pk-name"); await p.select("#ed-pk-br", branch); await sl(100);
  for (const seg of folders) { await p.click(`dialog.ed-pick .ed-pk-folder[data-path$="${seg}"]`); await sl(100); }
  await p.$eval("#ed-pk-name", (e, v) => { e.value = v; }, fname); await p.click("#ed-pk-go");
  await p.waitForFunction(t => /^Saved/.test(BA_ED.st[t].msg.textContent) || /Could not/.test(BA_ED.st[t].msg.textContent), { timeout: 60000 }, tab); return p.evaluate(t => BA_ED.st[t].msg.textContent, tab); };
const reopen = async (tab, path) => { await p.evaluate(async (t, path) => { BA_ED.st[t].dirty = false; const f = pd.files.find(x => x.path === path); await BA_ED.open(t, f); }, tab, path); await sl(500); };
const download = async (tab, fname) => { for (const f of fs.readdirSync(DL)) if (f === fname) fs.rmSync(DL + "/" + f); await p.click(`#ed-${tab} [data-ed=dl]`); for (let i = 0; i < 40 && !fs.existsSync(DL + "/" + fname); i++) await sl(250); await sl(300); return fs.existsSync(DL + "/" + fname); };

/* ---- Word ---- */
await openVia("word", ["Docs"], "sample.docx");
const w = await p.$eval("#wd-page", e => ({ h1: e.querySelectorAll("h1").length, h2: e.querySelectorAll("h2").length, tbl: e.querySelectorAll("table td").length, ul: e.querySelectorAll("ul li").length, ol: e.querySelectorAll("ol li").length, b: e.querySelectorAll("strong,b").length, img: e.querySelectorAll("img").length, bn: /বাংলা/.test(e.innerText) }));
ok(w.h1 === 1 && w.h2 === 1 && w.tbl === 6 && w.ul === 2 && w.ol === 2 && w.b >= 1 && w.img === 1 && w.bn, "2 docx import keeps headings, table, lists, bold, picture, Bengali " + JSON.stringify(w));
await shot("01-word-open");
await p.click("#wd-page"); await p.evaluate(() => { const pg = $("#wd-page"); const p = document.createElement("p"); p.textContent = "ZZ নতুন অনুচ্ছেদ added in the editor"; pg.querySelector("h2").before(p); const s = document.getSelection(); s.selectAllChildren(p); });
await p.click("#wd-b"); await p.click("#wd-ac"); await p.evaluate(() => BA_ED.dirty("word"));
ok(await p.$eval("#ed-word .ed-dirty", e => !e.hidden), "3 unsaved marker shows after an edit");
let m = await save("word"); ok(/^Saved/.test(m), "4 Word Save (same path, keep old): " + m);
const vers = await p.evaluate(() => pd.files.filter(f => f.path.startsWith("Docs/Old versions/")).map(f => f.path));
ok(vers.length === 1 && /sample \(old \d{8}-\d{6}\)\.docx$/.test(vers[0]), "5 old version kept: " + vers.join(","));
await reopen("word", "Docs/sample.docx");
const w2 = await p.$eval("#wd-page", e => ({ edit: /ZZ নতুন অনুচ্ছেদ/.test(e.innerText), tbl: e.querySelectorAll("table td").length, img: e.querySelectorAll("img").length, h1: e.querySelectorAll("h1").length, ol: e.querySelectorAll("ol li").length }));
ok(w2.edit && w2.tbl === 6 && w2.img === 1 && w2.h1 === 1 && w2.ol === 2, "6 reopened docx has the edit + table + picture + headings + lists " + JSON.stringify(w2));
ok(await download("word", "sample.docx"), "7 Word Download"); if (fs.existsSync(DL + "/sample.docx")) fs.copyFileSync(DL + "/sample.docx", SH + "/word-saved.docx");
m = await saveAs("word", "Office", ["Reports"], "report-copy.docx"); ok(/^Saved/.test(m) && await p.evaluate(() => pd.files.some(f => f.path === "⎇/Office/Reports/report-copy.docx")), "8 Word Save as → branch Office / Reports: " + m);
ok(await p.$eval("#ed-word .ed-where", e => /Office/.test(e.textContent) && /Reports/.test(e.textContent)), "8b title now points at Office › Reports");
await shot("02-word-saved");
// toolbar: table + page break + new blank
await p.click("#ed-word [data-ed=new]"); await sl(200); await p.click("#wd-page");
await p.keyboard.type("Blank doc ZZ"); PROMPT = "2"; await p.click("#wd-tbl"); PROMPT = null; await p.click("#wd-pb");
ok(await p.$eval("#wd-page", e => e.querySelectorAll("table td").length === 4 && !!e.querySelector("hr.ed-pb")), "9 New blank + insert table (2×2) + page break");
await shot("03-word-blank");

/* ---- Excel ---- */
await openVia("excel", ["Docs"], "sample.xlsx");
const cell = (r, c) => p.$eval(`#xs-grid td[data-r="${r}"][data-c="${c}"]`, e => e.textContent);
ok(await cell(1, 3) === "4000" && await cell(5, 3) === "13250" && await cell(6, 3) === String(+(13250 / 3).toPrecision(10)), "10 xlsx formulas calculated: D2=" + await cell(1, 3) + " D6=" + await cell(5, 3) + " D7=" + await cell(6, 3));
await shot("04-excel-open");
await p.click('#xs-grid td[data-r="1"][data-c="1"]'); await p.keyboard.type("20"); await p.keyboard.press("Enter"); await sl(200);
ok(await cell(1, 3) === "8000" && await cell(5, 3) === "17250", "11 edit B2=20 recalculates D2 and SUM: " + await cell(1, 3) + " / " + await cell(5, 3));
await p.click('#xs-grid td[data-r="7"][data-c="3"]'); await p.keyboard.type("=D6*2+ROUND(D7,0)"); await p.keyboard.press("Enter"); await sl(200);
ok(await cell(7, 3) === String(17250 * 2 + Math.round(17250 / 3)), "12 new formula =D6*2+ROUND(D7,0) → " + await cell(7, 3));
await p.click('#xs-grid td[data-r="2"][data-c="0"]'); await p.click("#xs-insr"); await sl(200);
ok(await p.evaluate(() => BA_ED.kinds && $("#xs-grid td[data-r='6'][data-c='3']").textContent) === "17250" && await p.evaluate(() => { const td = $("#xs-grid td[data-r='6'][data-c='3']"); td.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); return $("#xs-fx").value; }) === "=SUM(D2:D5)", "13 insert row shifts cells and formula refs (=SUM(D2:D5))");
await p.click('#xs-grid td[data-r="2"][data-c="0"]'); await p.click("#xs-delr"); await sl(200);
m = await save("excel"); ok(/^Saved/.test(m), "14 Excel Save: " + m);
await reopen("excel", "Docs/sample.xlsx");
ok(await cell(1, 1) === "20" && await cell(5, 3) === "17250" && await p.evaluate(() => { $("#xs-grid td[data-r='7'][data-c='3']").dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); return $("#xs-fx").value; }) === "=D6*2+ROUND(D7,0)", "15 reopened xlsx keeps value + formulas");
await p.click('.xs-tab[data-si="1"]'); await sl(200); ok(await cell(0, 1) === "8625", "16 second sheet cross-sheet formula =Budget!D6/2 → " + await cell(0, 1));
await p.click('.xs-tab[data-si="0"]'); await sl(100);
ok(await download("excel", "sample.xlsx"), "17 Excel Download"); if (fs.existsSync(DL + "/sample.xlsx")) fs.copyFileSync(DL + "/sample.xlsx", SH + "/excel-saved.xlsx");
m = await saveAs("excel", "", ["Docs"], "sample-copy.csv"); ok(/^Saved/.test(m) && await p.evaluate(() => pd.files.some(f => f.path === "Docs/sample-copy.csv")), "18 Excel Save as CSV: " + m);
await shot("05-excel-saved");

/* ---- Image ---- */
await openVia("image", ["Docs"], "photo.png");
ok(await p.$eval("#im-cv", c => c.width === 800 && c.height === 600), "19 image opened 800×600");
await p.click("#im-t-crop"); const r = await p.$eval("#im-ov", e => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
await p.mouse.move(r.x + r.w * 0.125, r.y + r.h * (100 / 600)); await p.mouse.down(); await p.mouse.move(r.x + r.w * 0.5, r.y + r.h * 0.5, { steps: 6 }); await p.mouse.move(r.x + r.w * (500 / 800), r.y + r.h * (400 / 600), { steps: 6 }); await p.mouse.up();
await shot("06-image-crop-select"); await p.click("#im-applycrop"); await sl(200);
const dims = await p.$eval("#im-cv", c => [c.width, c.height]); ok(Math.abs(dims[0] - 400) <= 4 && Math.abs(dims[1] - 300) <= 4, "20 crop → " + dims.join("×"));
await p.click("#im-t-box"); const r2 = await p.$eval("#im-ov", e => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
await p.mouse.move(r2.x + 20, r2.y + 20); await p.mouse.down(); await p.mouse.move(r2.x + r2.w * .6, r2.y + r2.h * .6, { steps: 5 }); await p.mouse.up();
await p.click("#im-t-arrow"); await p.mouse.move(r2.x + r2.w * .9, r2.y + r2.h * .9); await p.mouse.down(); await p.mouse.move(r2.x + r2.w * .65, r2.y + r2.h * .65, { steps: 5 }); await p.mouse.up();
PROMPT = "ছাদ ZZ"; await p.click("#im-t-text"); await p.mouse.click(r2.x + 30, r2.y + r2.h * .75); PROMPT = null;
await p.click("#im-t-pen"); await p.mouse.move(r2.x + r2.w * .3, r2.y + r2.h * .2); await p.mouse.down(); await p.mouse.move(r2.x + r2.w * .5, r2.y + r2.h * .35, { steps: 8 }); await p.mouse.up();
await p.$eval("#im-bri", e => { e.value = 130; e.dispatchEvent(new Event("input")); }); await p.click("#im-adj");
await shot("07-image-annotated");
m = await save("image"); ok(/^Saved/.test(m), "21 Image Save: " + m);
await reopen("image", "Docs/photo.png"); ok(await p.$eval("#im-cv", c => Math.abs(c.width - 400) <= 4 && Math.abs(c.height - 300) <= 4), "22 reopened PNG is the cropped size");
await p.click("#im-rotr"); ok(await p.$eval("#im-cv", c => Math.abs(c.width - 300) <= 4), "23 rotate right swaps width/height");
await p.$eval("#im-w", e => { e.value = 150; e.dispatchEvent(new Event("input")); }); await p.click("#im-resize"); ok(await p.$eval("#im-cv", c => c.width === 150 && Math.abs(c.height - 200) <= 3), "24 resize keeps ratio");
m = await saveAs("image", "Office", [], "photo-small.jpg"); ok(/^Saved/.test(m) && await p.evaluate(() => pd.files.some(f => f.path === "⎇/Office/photo-small.jpg")), "25 Image Save as JPG to branch Office root: " + m);
ok(await download("image", "photo-small.jpg"), "26 Image Download"); if (fs.existsSync(DL + "/photo-small.jpg")) fs.copyFileSync(DL + "/photo-small.jpg", SH + "/image-saved.jpg");

/* ---- Notepad ---- */
await openVia("note", ["Docs"], "notes.txt");
ok(await p.$eval("#np-ta", e => /আমার সোনার বাংলা/.test(e.value)) && await p.$eval(".np-gut", e => e.textContent.split("\n").length >= 3), "27 Notepad UTF-8 Bengali + line numbers");
await p.type("#np-find", "apple"); await p.type("#np-repl", "আম"); await p.click("#np-rall"); ok(await p.$eval("#np-ta", e => !/apple/.test(e.value) && (e.value.match(/আম/g) || []).length >= 3), "28 find / replace all");
await shot("08-notepad");
m = await save("note"); ok(/^Saved/.test(m), "29 Notepad Save: " + m);
await reopen("note", "Docs/notes.txt"); ok(await p.$eval("#np-ta", e => /Second line with আম/.test(e.value)), "30 reopened text has the replacement");
// Ask AI
await p.click("#ed-note [data-ed=ask]"); await sl(400); ok(await p.evaluate(() => !$("#pd-main").classList.contains("ed-on") && /notes\.txt/.test($("#pd-q").value)), "31 Ask AI about this file goes to the AI box with the file named");
// dark theme + 1366 fit
await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await p.click("#ed-tab-excel"); await sl(300); await shot("09-excel-dark");
await p.click("#ed-tab-word"); await sl(300); await shot("10-word-dark");
const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); ok(!over, "32 no horizontal page overflow at 1366×768");
// picker screenshot
await p.click("#ed-word [data-ed=open]"); await p.waitForSelector("dialog.ed-pick[open]"); await p.select("#ed-pk-br", "Office"); await sl(150); await shot("11-picker"); await p.keyboard.press("Escape");
ok(!errs.length, "33 no page errors " + errs.slice(0, 3).join(" | ")); console.log("http errors seen (info):", [...new Set(bad)].join(" | ") || "none");
const listing = await p.evaluate(() => pd.files.map(f => f.path).sort()); fs.writeFileSync(SH + "/listing.json", JSON.stringify(listing, null, 1));
await b.close(); console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
