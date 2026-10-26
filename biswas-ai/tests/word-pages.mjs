// Drafting Desk Word (stage 1): real pages, Word fonts, formatting toggles, WordArt/shapes/text box, page setup, header/footer, find/replace, zoom, docx round trip.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-editors2-live", FX = process.env.FX || "/tmp/fx-w2";
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
const name = "zz-test-w2-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(1000);
await p.evaluate(async () => { await pdApi("mkdir", { path: "Docs" }); await pdRefresh(); });
const b64 = fs.readFileSync(FX + "/fonts.docx").toString("base64");
await p.evaluate(async (b64) => { const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await BA_ED.io.upload("Docs/fonts.docx", new Blob([bytes])); await pdRefresh(); }, b64);
const save = async () => { await p.click(`#ed-word [data-ed=save]`); await p.waitForSelector("#ed-confirm-go"); await p.click("#ed-confirm-go"); await p.waitForFunction(() => /^Saved/.test(BA_ED.st.word.msg.textContent) || /Could not/.test(BA_ED.st.word.msg.textContent), { timeout: 60000 }); return p.evaluate(() => BA_ED.st.word.msg.textContent); };
const download = async fname => { for (const f of fs.readdirSync(DL)) if (f === fname) fs.rmSync(DL + "/" + f); await p.click(`#ed-word [data-ed=dl]`); for (let i = 0; i < 40 && !fs.existsSync(DL + "/" + fname); i++) await sl(250); await sl(300); return fs.existsSync(DL + "/" + fname); };
const pages = () => p.$$eval("#ed-word .wd-bg", a => a.length);
const selText = (needle) => p.evaluate(n => { const pg = $("#wd-page"); const it = document.createNodeIterator(pg, NodeFilter.SHOW_TEXT); let t; while ((t = it.nextNode())) { const i = t.nodeValue.indexOf(n); if (i >= 0) { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + n.length); const s = getSelection(); pg.focus(); s.removeAllRanges(); s.addRange(r); return true; } } return false; }, needle);

/* open */
await p.evaluate(() => { window.$$ = s => [...document.querySelectorAll(s)]; });
await p.click("#ed-tab-word"); await sl(300);
await p.evaluate(async () => { const f = pd.files.find(x => x.path === "Docs/fonts.docx"); await BA_ED.open("word", f); }); await p.waitForFunction(() => BA_ED.st.word.file && !BA_ED.st.word.msg.textContent, { timeout: 30000 }); await sl(1500);
const imp = await p.evaluate(() => { const W = BA_ED.kinds.word, pg = W.pg, page = $("#wd-page"); const span = t => { const it = document.createNodeIterator(page, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) if (n.nodeValue.includes(t)) return getComputedStyle(n.parentElement); return null; };
  const cal = span("Calibri line"), ari = span("Arial red"), geo = span("Georgia struck"), bn = span("বাংলা লেখা");
  const ind = [...page.querySelectorAll("p")].find(p => /Indented one/.test(p.textContent)); const ra = [...page.querySelectorAll("p")].find(p => /Right aligned/.test(p.textContent)); const after = [...page.querySelectorAll("p")].find(p => /AFTER BREAK/.test(p.textContent));
  const step = parseFloat($(".wd-bg").style.height) + 24;
  return { font: pg.font, size: pg.size, mt: pg.mt, ml: pg.ml, header: pg.header, pnum: pg.pnum, cal: cal && cal.fontFamily + "|" + cal.fontSize + "|" + cal.color, ari: ari && ari.fontFamily + "|" + ari.backgroundColor, geo: geo && geo.fontFamily, bn: bn && bn.fontFamily,
    ind: ind && ind.style.marginLeft + "|" + ind.style.lineHeight, ra: ra && ra.style.textAlign, afterTop: after && (after.offsetTop % step), afterPage: after && Math.floor(after.offsetTop / step) + 1, pb: !!page.querySelector("hr.ed-pb") }; });
const np = await pages();
ok(imp.font === "Times New Roman" && imp.size === 12, "W1 document font read: " + imp.font + " " + imp.size + "pt");
ok(/Calibri/.test(imp.cal || "") && /18.6|18.66/.test(imp.cal) && /31, 78, 121/.test(imp.cal), "W2 Calibri 14pt blue run kept: " + imp.cal);
ok(/Arial/.test(imp.ari || "") && /255, 255, 0/.test(imp.ari), "W3 Arial + yellow highlight kept: " + imp.ari);
ok(/Georgia/.test(imp.geo || "") && /Kalpurush/.test(imp.bn || ""), "W4 Georgia and Kalpurush (Bengali) kept: " + imp.geo + " / " + imp.bn);
ok(imp.ind === "48px|1.5" && imp.ra === "right", "W5 indent, 1.5 line spacing, right alignment kept: " + imp.ind + " " + imp.ra);
ok(Math.abs(imp.mt - 20) < .2 && Math.abs(imp.ml - 22) < .2 && /BDO/.test(imp.header) && imp.pnum, "W6 margins, header text and page-number footer read: " + JSON.stringify([imp.mt, imp.ml, imp.header, imp.pnum]));
ok(np >= 3 && imp.pb && imp.afterPage === np && Math.abs(imp.afterTop - 20 * 96 / 25.4) < 3, `W7 real pages: ${np} pages, text after the page break starts at the top of page ${imp.afterPage}`);
ok(await p.$$eval("#ed-word .wd-ft .wd-pn", a => a.map(x => x.textContent).join(",")) === Array.from({ length: np }, (_, i) => i + 1).join(","), "W8 page numbers drawn on every page");
await p.evaluate(() => $("#ed-word .ed-body").scrollIntoView()); await p.$eval(".wd-desk", d => d.scrollTop = 0); await sl(300); await shot("w01-open-pages");
// scroll so the page gap shows
await p.$eval(".wd-desk", d => { const step = parseFloat($(".wd-bg").style.height) + 24; d.scrollTop = step - 300; }); await sl(300); await shot("w02-page-boundary");
/* typing flows onto the next page */
const before = await pages();
await p.evaluate(() => { const ps = [...$("#wd-page").querySelectorAll("p")]; const last = ps.find(p => /Body paragraph 45/.test(p.textContent)); for (let i = 0; i < 25; i++) { const n = document.createElement("p"); n.textContent = "Added line " + i + " to push the text over the page end."; last.after(n); } BA_ED.dirty("word"); BA_ED.kinds.word.layout(); });
await sl(300); ok(await pages() >= before + (await p.evaluate(() => { const step = parseFloat($(".wd-bg").style.height) + 24; const after = [...$("#wd-page").querySelectorAll("p")].find(p => /AFTER BREAK/.test(p.textContent)); return Math.floor(after.offsetTop / step) + 1 === $$(".wd-bg").length ? 0 : 99; })), "W9 added text flows on, the page-break text stays at the top of the last page (" + before + " → " + await pages() + " pages)");
/* formatting toggles */
await p.$eval(".wd-desk", d => d.scrollTop = 0);
await selText("Body paragraph 1:"); await p.click("#wd-b"); const bOn = await p.$eval("#wd-b", e => e.getAttribute("aria-pressed")); await p.click("#wd-b"); const bOff = await p.$eval("#wd-b", e => e.getAttribute("aria-pressed"));
ok(bOn === "true" && bOff === "false", "W10 Bold toggles on and off (button shows state)");
await selText("Body paragraph 2:"); await p.click("#wd-s"); ok(await p.$eval("#wd-s", e => e.getAttribute("aria-pressed")) === "true", "W11 Strikethrough on");
await selText("Body paragraph 3"); await p.click("#wd-u"); await p.click("#wd-i");
await selText("district"); await p.click("#wd-sup"); ok(await p.evaluate(() => !!$("#wd-page sup") && /district/.test($("#wd-page sup").textContent)), "W12 Superscript");
await selText("scheme progress"); await p.evaluate(() => { const s = $("#wd-font"); s.dispatchEvent(new MouseEvent("mousedown")); s.value = "Verdana"; s.dispatchEvent(new Event("change")); });
await selText("scheme progress"); ok(await p.$eval("#wd-font", s => s.value) === "Verdana", "W13 Font picker applies Verdana and shows it");
await selText("block development"); await p.evaluate(() => { const s = $("#wd-hlc"); s.dispatchEvent(new MouseEvent("mousedown")); s.value = "#00ff00"; s.dispatchEvent(new Event("change")); });
await selText("Body paragraph 4"); await p.click("#wd-bdr"); await p.click("#wd-in");
ok(await p.evaluate(() => { const p4 = [...$("#wd-page").querySelectorAll("p")].find(p => /Body paragraph 4:/.test(p.textContent)); return p4.style.borderTopStyle === "solid" && p4.style.marginLeft === "48px"; }), "W14 Paragraph border + indent");
/* insert: WordArt, shape, text box, horizontal line, symbol */
await selText("Fonts Test Memo"); await p.evaluate(() => { const s = getSelection(); s.collapseToEnd(); });
await p.click("#wd-wa"); await p.waitForSelector("dialog.wd-dlg[open]"); await p.$eval("#wd-wa-text", e => e.value = "Annual Report"); await p.select("#wd-wa-preset", "arcup"); await p.click("#wd-dlg-ok"); await sl(200);
await selText("Calibri line"); await p.evaluate(() => getSelection().collapseToEnd());
await p.click("#wd-shape"); await p.waitForSelector("dialog.wd-dlg[open]"); await p.select("#wd-sh-kind", "star"); await p.click("#wd-dlg-ok"); await sl(200);
await p.click("#wd-shape"); await p.waitForSelector("dialog.wd-dlg[open]"); await p.select("#wd-sh-kind", "callout"); await p.$eval("#wd-sh-tx", e => e.value = "Note!"); await p.click("#wd-dlg-ok"); await sl(200);
await selText("Right aligned"); await p.evaluate(() => getSelection().collapseToEnd()); await p.click("#wd-tbox"); await sl(100); await p.click("#wd-hr"); await sl(100);
await p.click("#wd-sym"); await p.waitForSelector("#wd-sympop"); await p.evaluate(() => [...$$("#wd-sympop button")].find(b => b.textContent === "₹").click());
const ins = await p.evaluate(() => ({ wa: $$("#wd-page img.wd-obj[data-obj=wa]").length, sh: $$("#wd-page img.wd-obj[data-obj=shape]").length, tb: $$("#wd-page .wd-tbox").length, hr: $$("#wd-page hr.wd-hr").length, rs: /₹/.test($("#wd-page").innerText) }));
ok(ins.wa === 1 && ins.sh === 2 && ins.tb === 1 && ins.hr >= 1 && ins.rs, "W15 WordArt, 2 shapes, text box, horizontal line, ₹ symbol inserted " + JSON.stringify(ins));
await p.$eval(".wd-desk", d => d.scrollTop = 0); await sl(300); await shot("w03-wordart-shapes");
/* find & replace */
await p.click("#wd-findbtn"); await p.$eval("#wd-fi", e => { e.value = "deadline"; e.dispatchEvent(new Event("input")); }); await p.$eval("#wd-ri", e => e.value = "due date");
const cnt = await p.$eval("#wd-fcnt", e => e.textContent); await p.click("#wd-rall"); await sl(100);
ok(/45 found/.test(cnt) && await p.evaluate(() => !/deadline/.test($("#wd-page").innerText) && ($("#wd-page").innerText.match(/due date/g) || []).length === 45), "W16 Find counts (" + cnt + ") and Replace all works");
await shot("w04-find-replace"); await p.click("#wd-findbtn");
/* page setup: Letter landscape, narrow margins, page numbers bottom right */
await p.click("#wd-setup"); await p.waitForSelector("dialog.wd-dlg[open]"); await p.select("#wd-ps-size", "Letter"); await p.select("#wd-ps-or", "landscape"); await p.select("#wd-ps-mar", "narrow"); await p.select("#wd-ps-pa", "right"); await p.select("#wd-ps-pn", "bottom");
await p.$eval("#wd-ps-ft", e => e.value = "Confidential"); await shot("w05-page-setup"); await p.click("#wd-dlg-ok"); await sl(500);
const g2 = await p.evaluate(() => ({ w: parseFloat($(".wd-bg").style.width), h: parseFloat($(".wd-bg").style.height), info: $("#wd-pginfo").textContent, ft: $(".wd-bg .wd-ft").textContent }));
ok(Math.abs(g2.w - 1056) < 2 && Math.abs(g2.h - 816) < 2 && /Letter/.test(g2.info) && /Landscape/.test(g2.info) && /Confidential/.test(g2.ft), "W17 Page setup → Letter landscape with footer: " + JSON.stringify(g2));
/* zoom + add page + status */
await p.select("#wd-zoom", ".75"); await sl(300); await shot("w06-zoom75"); ok(await p.$eval(".wd-stack", e => /scale\(0.75\)/.test(e.style.transform)), "W18 Zoom 75%");
await p.select("#wd-zoom", "1"); const pn0 = await pages(); await p.click("#wd-addpg"); await sl(300); ok(await pages() === pn0 + 1, "W19 + Add page adds a blank page (" + pn0 + " → " + (pn0 + 1) + ")");
await p.keyboard.type("Last page typed text");
ok(await p.$eval("#wd-status", e => /Page \d+ of \d+/.test(e.textContent) && /\d+ words/.test(e.textContent)), "W20 Status bar: " + await p.$eval("#wd-status", e => e.textContent));
/* save, download, reopen */
let m = await save(); ok(/^Saved/.test(m), "W21 Save: " + m);
ok(await download("fonts.docx"), "W22 Download"); if (fs.existsSync(DL + "/fonts.docx")) fs.copyFileSync(DL + "/fonts.docx", SH + "/word2-saved.docx");
await p.evaluate(async () => { BA_ED.st.word.dirty = false; const f = pd.files.find(x => x.path === "Docs/fonts.docx"); await BA_ED.open("word", f); }); await sl(1500);
const re = await p.evaluate(() => { const pg = BA_ED.kinds.word.pg, page = $("#wd-page"); const st = t => { const it = document.createNodeIterator(page, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) if (n.nodeValue.includes(t)) return getComputedStyle(n.parentElement).fontFamily; return ""; };
  return { w: pg.w, h: pg.h, ft: pg.footer, pnum: pg.pnum, al: pg.pnumAlign, cal: st("Calibri line"), ver: st("scheme progress"), imgs: page.querySelectorAll("img").length, last: /Last page typed text/.test(page.innerText), pages: $$(".wd-bg").length, pb: page.querySelectorAll("hr.ed-pb").length, sup: !!page.querySelector("sup") }; });
ok(Math.abs(re.w - 279.4) < 1 && Math.abs(re.h - 215.9) < 1 && re.ft === "Confidential" && re.pnum && re.al === "right", "W23 reopened: page setup + footer + page number position survive " + JSON.stringify([re.w, re.h, re.ft, re.al]));
ok(/Calibri/.test(re.cal) && /Verdana/.test(re.ver) && re.imgs === 3 && re.last && re.pb >= 2 && re.sup, "W24 reopened: fonts, WordArt/shapes (as pictures), breaks, superscript survive " + JSON.stringify(re));
await shot("w07-reopened");
/* new blank document */
await p.click("#ed-word [data-ed=new]"); await sl(300); ok(await pages() === 1 && await p.$eval("#wd-font", s => s.value) === "Calibri", "W25 New blank: 1 A4 page, Calibri");
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "W26 no horizontal page overflow at 1366×768");
ok(!errs.length, "W27 no page errors " + errs.join(" | "));
console.log("http errors seen (info): " + (bad.join(", ") || "none"));
await b.close(); console.log(fails ? fails + " FAILED" : "ALL PASS"); process.exit(fails ? 1 : 0);
