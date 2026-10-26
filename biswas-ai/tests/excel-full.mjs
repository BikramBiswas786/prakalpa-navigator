// Drafting Desk Excel (stage 2): sheets, formatting, number formats, merge, sort/filter, copy/paste, fill/autofill, freeze, find, undo, functions, charts, xlsx round trip.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-editors2-live", FX = process.env.FX || "/tmp/fx-x2";
fs.mkdirSync(SH, { recursive: true }); const DL = SH + "/dl"; fs.mkdirSync(DL, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 240000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const ctx = b.defaultBrowserContext(); await ctx.overridePermissions(B, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
const errs = []; p.on("pageerror", e => errs.push(String(e))); const bad = []; p.on("response", r => { if (r.status() >= 400) { const u = new URL(r.url()); bad.push(r.status() + " " + u.host + u.pathname.slice(0, 40)); } });
let BA_ED_DBG; let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const cdp = await b.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-x2-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(1000);
await p.evaluate(async () => { await pdApi("mkdir", { path: "Docs" }); await pdRefresh(); });
const b64 = fs.readFileSync(FX + "/styled.xlsx").toString("base64");
await p.evaluate(async (b64) => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await BA_ED.io.upload("Docs/styled.xlsx", new Blob([bytes])); await pdRefresh(); }, b64);
await p.evaluate(() => { window.$$ = s => [...document.querySelectorAll(s)]; });
const td = (r, c) => `#xs-grid td[data-r="${r}"][data-c="${c}"]`;
const cell = (r, c) => p.$eval(td(r, c), e => e.textContent).catch(() => null);
const cst = (r, c) => p.$eval(td(r, c), e => { const s = getComputedStyle(e); return { fw: s.fontWeight, bg: s.backgroundColor, color: s.color, ff: s.fontFamily, al: s.textAlign, bt: s.borderTopStyle, cs: e.colSpan, fs: s.fontSize, pos: s.position }; });
const click = async (r, c, o = {}) => { if (o.shift) await p.keyboard.down("Shift"); await p.click(td(r, c)); if (o.shift) await p.keyboard.up("Shift"); await sl(60); };
const type = async (r, c, s) => { await click(r, c); await p.keyboard.type(s); await p.keyboard.press("Enter"); await sl(120); };
const fxOf = async (r, c) => { await click(r, c); return p.$eval("#xs-fx", e => e.value); };
const api = () => "BA_ED.kinds.excel._api()";

/* open the styled workbook */
await p.click("#ed-tab-excel"); await sl(300);
await p.evaluate(async () => { const f = pd.files.find(x => x.path === "Docs/styled.xlsx"); await BA_ED.open("excel", f); }); await p.waitForFunction(() => BA_ED.st.excel.file && !BA_ED.st.excel.msg.textContent, { timeout: 30000 }); await sl(800);
let a1 = await cst(0, 0);
ok(a1.fw === "700" && /31, 78, 121/.test(a1.bg) && /255, 255, 255/.test(a1.color) && /Arial/.test(a1.ff) && a1.al === "center", "X1 header style kept (bold, white on blue, Arial, centred): " + JSON.stringify(a1));
ok(await cell(1, 2) === "₹1,23,456.00" && await cell(3, 2) === "₹45,000.50", "X2 ₹ Indian number format: " + await cell(1, 2) + " / " + await cell(3, 2));
ok(await cell(1, 3) === "01-04-2026" && await cell(1, 4) === "25%", "X3 date and percent formats: " + await cell(1, 3) + " " + await cell(1, 4));
ok(await cell(5, 2) === "₹3,42,456.50", "X4 SUM formula with ₹ format: " + await cell(5, 2));
const m8 = await cst(7, 0); ok(m8.cs === 3 && /192, 0, 0/.test(m8.color) && m8.fs === "18.6667px", "X5 merged A8:C8 kept with font size/colour: " + JSON.stringify(m8));
ok((await cst(1, 1)).bt === "solid", "X6 borders kept");
ok(await p.$eval(td(0, 1), e => getComputedStyle(e).position) === "sticky", "X7 frozen top row from the file");
ok(JSON.stringify(await p.$$eval(".xs-tab", t => t.map(x => x.textContent))) === '["Budget","Data Q1"]', "X8 both sheet tabs");
await shot("x01-open-styled");

/* typing with automatic number formats */
await click(10, 0); await p.$eval("#xs-fx", e => { e.focus(); e.value = "₹2,500"; e.dispatchEvent(new Event("input", { bubbles: true })); }); await p.keyboard.press("Enter"); await sl(120); await type(11, 0, "12.5%"); await type(12, 0, "26-10-2026"); await type(13, 0, "1,50,000");
ok(await cell(10, 0) === "₹2,500.00" && await cell(11, 0) === "12.50%" && await cell(12, 0) === "26-10-2026" && await cell(13, 0) === "1,50,000", "X9 typed ₹, %, date, Indian grouping: " + [await cell(10, 0), await cell(11, 0), await cell(12, 0), await cell(13, 0)].join(" | "));
ok(await fxOf(12, 0) === "46321", "X10 date stored as a real date serial (" + await fxOf(12, 0) + ")");

/* functions */
const F = [
  ["=VLOOKUP(\"PMAY\",A2:E5,3,FALSE)", "98000"], ["=HLOOKUP(\"Block\",A1:E5,3,FALSE)", "Gaighata"], ["=XLOOKUP(\"SBM\",A2:A5,B2:B5,\"none\")", "Bongaon"], ["=XLOOKUP(\"XYZ\",A2:A5,B2:B5,\"none\")", "none"],
  ["=INDEX(C2:C5,MATCH(\"Jal Jeevan\",A2:A5,0))", "45000.5"], ["=SUMIF(B2:B5,\"Habra\",C2:C5)", "168456.5"], ["=SUMIFS(C2:C5,B2:B5,\"Habra\",C2:C5,\">50000\")", "123456"], ["=COUNTIF(C2:C5,\">50000\")", "3"],
  ["=COUNTIFS(B2:B5,\"Habra\",E2:E5,\"<0.2\")", "1"], ["=AVERAGEIF(B2:B5,\"Habra\",C2:C5)", "84228.25"], ["=ROUND(C4,0)", "45001"], ["=IFERROR(VLOOKUP(\"X\",A2:C5,2,FALSE),\"missing\")", "missing"],
  ["=TEXT(C2,\"#,##,##0\")", "1,23,456"], ["=TEXT(D2,\"dd mmm yyyy\")", "01 Apr 2026"], ["=DATE(2026,10,26)-D2", "208"], ["=TODAY()>D2", "TRUE"], ["=LEFT(A2,3)&\"-\"&RIGHT(A3,2)&\"-\"&MID(A4,5,6)", "MGN-AY-Jeevan"],
  ["='Data Q1'!B3*2", "40"], ["=SUM('Data Q1'!B2:B4)", "60"], ["=YEAR(D3)&\"/\"&MONTH(D3)", "2026/5"], ["=IF(C2>100000,\"High\",\"Low\")", "High"], ["=VLOOKUP(\"PMAY\",A2:C5,3,FALSE)/0", "#DIV/0!"]
];
await p.evaluate(a => { const A = eval(a); }, api());
for (let i = 0; i < F.length; i++) await type(20 + i, 6, F[i][0]);
const got = []; for (let i = 0; i < F.length; i++) got.push(await cell(20 + i, 6));
const wrong = F.map((f, i) => got[i] === f[1] ? null : `${f[0]} → ${got[i]} (want ${f[1]})`).filter(Boolean);
ok(!wrong.length, `X11 ${F.length} formulas (lookups, *IF(S), IFERROR, TEXT, DATE, TODAY, text, cross-sheet)` + (wrong.length ? ": " + wrong.join("; ") : ""));
await p.evaluate(() => { document.querySelector(".xs-wrap").scrollTop = 0; });

/* formatting a range by drag */
await p.hover(td(1, 0)); await p.mouse.down(); await p.hover(td(3, 1)); await p.mouse.up(); await sl(100);
ok(await p.$$eval("#xs-grid td.rng", a => a.length) === 6 && /A2:B4/.test(await p.$eval("#xs-addr", e => e.textContent)), "X12 drag selects A2:B4");
ok(/Count: 6/.test(await p.$eval("#xs-stat", e => e.textContent)), "X13 status bar count: " + await p.$eval("#xs-stat", e => e.textContent));
await p.click("#xs-b"); await p.$eval("#xs-fill", e => { e.value = "#ffff00"; }); await p.click("#xs-fillb"); await p.select("#xs-bd", "all"); await p.select("#xs-font", "Times New Roman"); await p.select("#xs-size", "14"); await sl(150); await click(9, 9);
const f22 = await cst(2, 1); ok(f22.fw === "700" && /255, 255, 0/.test(f22.bg) && /Times New Roman/.test(f22.ff) && f22.fs === "18.6667px" && f22.bt === "solid", "X14 bold + fill + borders + font + size on range: " + JSON.stringify(f22));
await click(2, 1); ok(await p.$eval("#xs-b", e => e.getAttribute("aria-pressed")) === "true", "X15 bold button shows pressed");
await click(1, 6); await click(2, 7, { shift: true }); await p.click("#xs-merge"); await sl(150);
ok((await cst(1, 6)).cs === 2 && await p.$(td(2, 7)) === null, "X16 merge G2:H3");
await p.click("#xs-unmerge"); await sl(100); ok((await cst(1, 6)).cs === 1, "X17 unmerge");
await click(30, 0); await p.keyboard.type("0.4567"); await p.keyboard.press("Enter"); await click(30, 0); await p.click("#xs-pct"); await p.click("#xs-decup"); await p.click("#xs-decup"); await sl(100);
ok(await cell(30, 0) === "45.67%", "X18 % button + more decimals: " + await cell(30, 0));
await shot("x02-formatting");

/* undo / redo */
await p.click("#xs-undo"); await sl(100); const u1 = await cell(30, 0); await p.click("#xs-redo"); await sl(100);
ok(u1 === "45.7%" && await cell(30, 0) === "45.67%", "X19 undo/redo: " + u1 + " → " + await cell(30, 0));
await p.focus(".xs-wrap"); await click(30, 0); await p.keyboard.down("Control"); await p.keyboard.press("z"); await p.keyboard.up("Control"); await sl(100); ok(await cell(30, 0) === "45.7%", "X20 Ctrl+Z");

/* copy / paste range with formula shift */
await type(40, 0, "1"); await type(41, 0, "2"); await type(40, 1, "=A41*10"); await type(41, 1, "=A42*10");
await click(40, 0); await click(41, 1, { shift: true }); await p.keyboard.down("Control"); await p.keyboard.press("c"); await p.keyboard.up("Control"); await sl(150);
await click(44, 3); await p.keyboard.down("Control"); await p.keyboard.press("v"); await p.keyboard.up("Control"); await sl(200);
ok(await cell(44, 3) === "1" && await cell(45, 4) === "20" && await fxOf(45, 4) === "=D46*10", "X21 Ctrl+C / Ctrl+V range, formula refs shift (" + await fxOf(45, 4) + ")");
await click(44, 3); await click(45, 4, { shift: true }); await p.keyboard.down("Control"); await p.keyboard.press("x"); await p.keyboard.up("Control"); await click(48, 3); await p.keyboard.down("Control"); await p.keyboard.press("v"); await p.keyboard.up("Control"); await sl(200);
ok(await cell(44, 3) === "" && await cell(48, 3) === "1" && await fxOf(49, 4) === "=D46*10", "X22 cut/paste moves cells");

/* fill down and autofill */
await type(50, 0, "5"); await type(50, 1, "=A51*2"); await click(50, 0); await click(54, 1, { shift: true }); await p.keyboard.down("Control"); await p.keyboard.press("d"); await p.keyboard.up("Control"); await sl(150);
ok(await cell(54, 0) === "5" && await fxOf(54, 1) === "=A55*2", "X23 Ctrl+D fill down (" + await fxOf(54, 1) + ")");
await type(56, 0, "1"); await type(57, 0, "2"); await type(56, 1, "Mon"); await type(57, 1, "Tue"); await type(56, 2, "Item 1"); await type(57, 2, "Item 2");
await p.$eval(td(62, 1), e => e.scrollIntoView({ block: "center" })); await click(56, 0); await click(57, 2, { shift: true }); await sl(100);
const fhb = await p.$eval("#xs-fh", e => { const r = e.getBoundingClientRect(); return { x: r.x + 4, y: r.y + 4 }; });
await p.mouse.move(fhb.x, fhb.y); await p.mouse.down(); const tgt = await p.$eval(td(61, 1), e => { const r = e.getBoundingClientRect(); return { x: r.x + 10, y: r.y + 10 }; }); await p.mouse.move(tgt.x, tgt.y, { steps: 6 }); await p.mouse.up(); await sl(200);
ok([await cell(61, 0), await cell(61, 1), await cell(61, 2)].join("|") === "6|Sat|Item 6", "X24 autofill handle: numbers, weekdays, Item N: " + [await cell(58, 0), await cell(61, 0), await cell(61, 1), await cell(61, 2)].join("|"));

/* sort and filter on Budget A1:E5 */
await click(1, 2); await click(4, 2, { shift: true }); await p.click("#xs-sortza"); await sl(150);
ok(await cell(1, 0) === "MGNREGA" && await cell(4, 0) === "Jal Jeevan", "X25 sort Z→A on selected rows by Amount: " + await cell(1, 0) + " … " + await cell(4, 0));
await click(1, 0); await click(4, 1, { shift: true }); await click(1, 1); await click(0, 0); await click(4, 4, { shift: true }); await p.click("#xs-filter"); await sl(150);
ok(await p.$$eval("#xs-grid .xs-fb", a => a.length) === 5, "X26 filter arrows on header");
await p.$$eval("#xs-grid .xs-fb", a => a[1].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))); await p.waitForSelector(".xs-fpop[open]");
await p.$$eval(".xs-fpop .xs-flist input", a => a.forEach(i => { if (i.value === "Habra") i.click(); })); await p.click("#xs-fok"); await sl(200);
const hiddenN = await p.$$eval("#xs-grid tbody tr[hidden]", a => a.length);
ok(hiddenN === 2, "X27 filter hides the 2 Habra rows: " + hiddenN);
await shot("x03-filter");
await p.click("#xs-filter"); await sl(100); ok(await p.$$eval("#xs-grid tbody tr[hidden]", a => a.length) === 0, "X28 clear filter");

/* freeze at selection, find */
await click(2, 1); await p.select("#xs-freeze", "sel"); await sl(150);
ok(await p.$eval(td(5, 0), e => getComputedStyle(e).position) === "sticky" && await p.$eval(td(0, 3), e => getComputedStyle(e).position) === "sticky" && await p.$eval(td(5, 3), e => getComputedStyle(e).position) !== "sticky", "X29 freeze panes at B3 (rows 1-2, column A)");
await p.click("#xs-find"); await p.type("#xs-fi", "Bongaon"); await p.keyboard.press("Enter"); await sl(100);
ok(/^B\d+$/.test(await p.$eval("#xs-addr", e => e.textContent)) && await p.$eval("#xs-grid td.sel", e => e.textContent) === "Bongaon", "X30 find selects the cell: " + await p.$eval("#xs-addr", e => e.textContent));
await p.click("#xs-fclose");

/* chart */
await click(0, 0); await click(4, 0, { shift: true }); await click(0, 0); await p.keyboard.down("Shift"); await p.click(td(4, 2)); await p.keyboard.up("Shift");
await p.evaluate(() => { const A = BA_ED.kinds.excel._api(); A.setSel({ r: 0, c: 0 }, { r: 4, c: 0 }); }); 
await p.evaluate(() => { const A = BA_ED.kinds.excel._api(); const b = A.book.sheets[0]; for (let r = 0; r < 5; r++) b.cells.set(r + ",9", b.cells.get(r + ",2") === undefined ? "" : (r ? b.cells.get(r + ",2") : "Amount")); b.cells.set("0,8", "Scheme"); for (let r = 1; r < 5; r++) b.cells.set(r + ",8", b.cells.get(r + ",0")); A.render(); A.setSel({ r: 0, c: 8 }, { r: 4, c: 9 }); });
await p.select("#xs-chart", "bar"); await sl(200); await p.select("#xs-chart", "pie"); await sl(200);
ok(await p.$$eval("#xs-charts canvas", a => a.length) === 2, "X31 column + pie charts drawn");
await p.evaluate(() => document.querySelector("#xs-charts").scrollIntoView()); await sl(200); await shot("x04-charts");
await p.evaluate(() => document.querySelector(".xs-wrap").scrollIntoView()); 

/* sheets: add, rename (formula follows), duplicate, move, delete */
PROMPT = "Data 2026"; await p.click('.xs-tab[data-si="1"]'); await sl(100); await p.click("#xs-rensheet"); await sl(150); PROMPT = null;
await p.click('.xs-tab[data-si="0"]'); await sl(100);
ok(await fxOf(37, 6) === "='Data 2026'!B3*2" && await cell(37, 6) === "40", "X32 rename sheet, formulas follow: " + await fxOf(37, 6));
await p.click("#xs-addsheet"); await sl(100); ok(JSON.stringify(await p.$$eval(".xs-tab", t => t.map(x => x.textContent))) === '["Budget","Sheet3","Data 2026"]', "X33 add sheet after current");
await p.click("#xs-mvr"); await sl(100); ok(JSON.stringify(await p.$$eval(".xs-tab", t => t.map(x => x.textContent))) === '["Budget","Data 2026","Sheet3"]', "X34 move sheet right");
await p.click('.xs-tab[data-si="1"]'); await p.click("#xs-dupsheet"); await sl(100);
ok(JSON.stringify(await p.$$eval(".xs-tab", t => t.map(x => x.textContent))) === '["Budget","Data 2026","Data 2026 (2)","Sheet3"]' && await cell(2, 1) === "20", "X35 duplicate sheet");
await p.click('.xs-tab[data-si="3"]'); await p.click("#xs-delsheet2"); await sl(150); ok(await p.$$eval(".xs-tab", t => t.length) === 3, "X36 delete sheet");
await p.click('.xs-tab[data-si="0"]'); await sl(100);
await click(60, 0); await p.click("#xs-cf"); await sl(200);
ok(await p.evaluate(() => BA_ED.kinds.excel._api().book.sheets[0].cf.length) === 1, "X37 highlight rule added");

/* save + reopen */
const save = async () => { await p.click(`#ed-excel [data-ed=save]`); await p.waitForSelector("#ed-confirm-go"); await p.click("#ed-confirm-go"); await p.waitForFunction(() => /^Saved|Could not/.test(BA_ED.st.excel.msg.textContent), { timeout: 60000 }); return p.evaluate(() => BA_ED.st.excel.msg.textContent); };
const pre = []; for (let i = 0; i < F.length; i++) pre.push(await cell(20 + i, 6));
let m = await save(); ok(/^Saved/.test(m), "X38 save: " + m);
for (const f of fs.readdirSync(DL)) if (f === "styled.xlsx") fs.rmSync(DL + "/" + f);
await p.click("#ed-excel [data-ed=dl]"); for (let i = 0; i < 40 && !fs.existsSync(DL + "/styled.xlsx"); i++) await sl(250); await sl(400);
if (fs.existsSync(DL + "/styled.xlsx")) fs.copyFileSync(DL + "/styled.xlsx", SH + "/excel2-saved.xlsx"); ok(fs.existsSync(SH + "/excel2-saved.xlsx"), "X39 download");
await p.evaluate(async () => { BA_ED.st.excel.dirty = false; await pdRefresh(); const f = pd.files.find(x => x.path === "Docs/styled.xlsx"); await BA_ED.open("excel", f); }); await sl(1200);
a1 = await cst(0, 0); const f2 = await cst(2, 1);
ok(a1.fw === "700" && /31, 78, 121/.test(a1.bg) && await cell(1, 2) === "₹1,23,456.00" && await cell(10, 0) === "₹2,500.00" && await cell(12, 0) === "26-10-2026" && /255, 255, 0/.test(f2.bg) && /Times New Roman/.test(f2.ff) && (await cst(7, 0)).cs === 3, "X40 reopened: styles, ₹, dates, fill, font, merge kept");
ok(await p.$eval(td(1, 0), e => getComputedStyle(e).position) === "sticky" && JSON.stringify(await p.$$eval(".xs-tab", t => t.map(x => x.textContent))) === '["Budget","Data 2026","Data 2026 (2)"]', "X41 reopened: freeze + sheets kept");
const got2 = []; for (let i = 0; i < F.length; i++) got2.push(await cell(20 + i, 6)); ok(JSON.stringify(got2) === JSON.stringify(pre), "X42 reopened formulas still compute");
await shot("x05-reopened");
await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await sl(200); await shot("x06-dark"); await p.evaluate(() => document.documentElement.removeAttribute("data-theme"));
ok(!errs.length, "X43 no page errors " + errs.join(" | "));
console.log("http errors seen (info): " + (bad.join(", ") || "none"));
console.log(fails ? fails + " FAILED" : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
