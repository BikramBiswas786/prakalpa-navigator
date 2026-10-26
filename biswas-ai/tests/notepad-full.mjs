// Notepad 2026: tabs, session restore, wrap, font/zoom, go to line, find (regex/whole word), encodings + EOL round trip, counts, Markdown, CSV/JSON, line tools.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-editors2-live";
fs.mkdirSync(SH, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 240000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
const errs = []; p.on("pageerror", e => { errs.push(String(e)); console.log("PAGEERR", String(e)); });
let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
const gate = async () => { for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); } };
await gate(); await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-np-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(800);
// fixtures: UTF-16 LE with CRLF, Windows-1252, JSON, CSV, Markdown
await p.evaluate(async () => {
  const u16 = s => { const o = new Uint8Array(2 + s.length * 2); o[0] = 0xff; o[1] = 0xfe; for (let i = 0; i < s.length; i++) { o[2 + 2 * i] = s.charCodeAt(i) & 255; o[3 + 2 * i] = s.charCodeAt(i) >> 8; } return o; };
  await pdApi("mkdir", { path: "N" });
  await BA_ED.io.upload("N/u16.txt", new Blob([u16("Line one ₹\r\nদুই\r\nthree")]));
  await BA_ED.io.upload("N/ansi.txt", new Blob([new Uint8Array([0x43, 0x61, 0x66, 0xe9, 0x20, 0x80, 0x35])])); // "Café €5"
  await BA_ED.io.upload("N/data.json", new Blob(['{"a":1,"b":[true,null,"x"]}']));
  await BA_ED.io.upload("N/t.csv", new Blob(['Name,Amount\n"Das, R",100\nSen,250\n']));
  await pdRefresh(); });
await p.click("#ed-tab-note"); await sl(500);
const open = async path => { await p.evaluate(async path => { await pdRefresh(); const f = pd.files.find(x => x.path === path); await BA_ED.open("note", f); }, path); await sl(600); };
const val = () => p.$eval("#np-ta", e => e.value);
const A = () => p.evaluate(() => { const a = BA_ED.kinds.note._api(); return { n: a.tabs().length, cur: a.cur(), enc: a.enc(), eol: a.eol(), zoom: a.zoom(), names: a.tabs().map(t => t.file ? t.file.path : t.name) }; });
const typeIn = async s => { await p.click("#np-ta"); await p.keyboard.type(s); await sl(100); };
const saveAs = async fname => { await p.click("#ed-note [data-ed=saveas]"); await p.waitForSelector("dialog.ed-pick[open] #ed-pk-name"); await p.$eval("#ed-pk-name", (e, v) => { e.value = v; }, fname); await p.click("#ed-pk-go");
  await p.waitForFunction(() => /^Saved|Could not/.test(BA_ED.st.note.msg.textContent), { timeout: 60000 }); return p.evaluate(() => BA_ED.st.note.msg.textContent); };
const bytesOf = path => p.evaluate(async path => { await pdRefresh(); const f = pd.files.find(x => x.path === path || x.path.endsWith("/" + path) || x.path === path); const r = await BA_ED.io.fetchFile(f); return [...new Uint8Array(r)]; }, path).catch(e => "ERR " + e.message);

await open("N/u16.txt");
let a = await A(); ok(a.enc === "utf-16le" && a.eol === "crlf" && (await val()) === "Line one ₹\nদুই\nthree", "N1 UTF-16 LE + CRLF read: " + JSON.stringify(a));
ok(await p.$eval("#np-enc", e => e.value) === "utf-16le" && await p.$eval("#np-eol", e => e.value) === "crlf", "N2 status bar shows encoding and line endings");
await open("N/ansi.txt"); a = await A(); ok(a.enc === "windows-1252" && (await val()) === "Café €5" && a.n === 2, "N3 ANSI file opens in a 2nd tab: " + await val() + " " + a.n);
await open("N/data.json"); await open("N/t.csv"); a = await A(); ok(a.n === 4 && a.cur === 3, "N4 four tabs open: " + a.names.join(", "));
await open("N/u16.txt"); a = await A(); ok(a.n === 4 && a.cur === 0, "N5 opening an already open file switches to its tab");
// CSV preview + colours
await p.click('.np-tab .np-tn[data-i="3"]'); await sl(300);
ok(await p.$eval("#np-preview", e => !e.hidden && e.querySelectorAll("tr").length === 3 && /Das, R/.test(e.textContent)), "N6 CSV table preview (quoted comma kept)");
ok(await p.$eval(".np-hl", e => !e.hidden && e.querySelectorAll(".np-c1").length >= 2), "N7 CSV column colours");
await shot("n01-csv-tabs");
// JSON
await p.click('.np-tab .np-tn[data-i="2"]'); await sl(300);
ok(await p.$eval(".np-hl", e => e.querySelectorAll(".np-k").length === 2 && e.querySelectorAll(".np-l").length === 2), "N8 JSON syntax colours");
await p.click("#np-fmt"); await sl(200); ok((await val()).includes('\n  "a": 1,'), "N9 Format JSON");
await p.click("#np-min"); await sl(200); ok((await val()) === '{"a":1,"b":[true,null,"x"]}', "N10 Minify JSON");
await p.$eval("#np-ta", e => { e.value = '{"a":1,}'; e.dispatchEvent(new Event("input")); }); await p.click("#np-fmt"); await sl(200);
ok(/JSON error/.test(await p.evaluate(() => BA_ED.st.note.msg.textContent)), "N11 JSON validation error shown");
await shot("n02-json");
// close dirty tab (confirm accepted)
await p.click('.np-tab.on .np-x'); await sl(300); a = await A(); ok(a.n === 3, "N12 close tab: " + a.n);
// new tab + markdown
await p.click("#ed-note [data-ed=new]"); await sl(300); a = await A(); ok(a.n === 4 && a.cur === 3 && !(await val()), "N13 New makes a new empty tab");
await typeIn("Title"); await p.evaluate(() => { const t = document.getElementById("np-ta"); t.setSelectionRange(0, 5); });
const m1 = await saveAs("plan.md"); await sl(200); ok(/^Saved/.test(m1) && await p.$eval(".np-tab.on .np-tn", e => e.textContent) === "plan.md", "N14 save as .md, tab renamed: " + m1);
ok(await p.$eval("#np-mdbar", e => !e.hidden), "N15 Markdown toolbar for .md");
await p.evaluate(() => document.getElementById("np-ta").setSelectionRange(0, 5)); await p.click("#np-h"); await sl(100);
await p.evaluate(() => { const t = document.getElementById("np-ta"); t.setSelectionRange(t.value.length, t.value.length); }); await p.keyboard.press("Enter"); await p.keyboard.type("bold");
await p.evaluate(() => { const t = document.getElementById("np-ta"); t.setSelectionRange(t.value.length - 4, t.value.length); }); await p.click("#np-b"); await sl(100);
await p.evaluate(() => { const t = document.getElementById("np-ta"); t.setSelectionRange(t.value.length, t.value.length); }); await p.keyboard.press("Enter"); await p.keyboard.type("one"); await p.click("#np-ul"); await sl(100);
await p.click("#np-tbl"); await sl(200);
const md = await val(); ok(md.startsWith("# Title\n**bold**\n- one") && md.includes("| A | B |"), "N16 heading/bold/list/table buttons: " + JSON.stringify(md.slice(0, 40)));
ok(await p.$eval("#np-preview", e => !e.hidden && e.parentNode.classList.contains("split") && !!e.querySelector("h1") && !!e.querySelector("strong") && !!e.querySelector("li") && !!e.querySelector("table")), "N17 Markdown live preview");
await p.keyboard.down("Control"); await p.keyboard.press("z"); await p.keyboard.up("Control"); await sl(200); ok(!(await val()).includes("| A | B |"), "N18 Ctrl+Z undoes a toolbar edit");
await shot("n03-markdown");
// find: regex, whole word, prev/next count
await p.$eval("#np-ta", e => { e.value = "cat catalog cat\nDog 12 dog 345"; e.dispatchEvent(new Event("input")); e.setSelectionRange(0, 0); });
await p.$eval("#np-find", e => e.value = ""); await p.type("#np-find", "cat"); await p.click("#np-ww"); await p.click("#np-next"); await sl(100);
ok(/\/ 2$/.test(await p.$eval("#np-cnt", e => e.textContent)), "N19 whole word finds 2: " + await p.$eval("#np-cnt", e => e.textContent));
await p.click("#np-ww"); await p.click("#np-re"); await p.$eval("#np-find", e => e.value = "\\d+"); await p.$eval("#np-repl", e => e.value = "#"); await p.click("#np-rall"); await sl(150);
ok((await val()) === "cat catalog cat\nDog # dog #", "N20 regex replace all: " + JSON.stringify(await val()));
await p.$eval("#np-find", e => e.value = "dog"); await p.click("#np-re"); await p.click("#np-mc"); await p.click("#np-next"); await sl(100);
ok(/1 \/ 1/.test(await p.$eval("#np-cnt", e => e.textContent)), "N21 match case");
// go to line, counts, wrap, zoom, font, time, tools
await p.$eval("#np-ta", e => { e.value = Array.from({ length: 50 }, (_, i) => "row " + (i + 1)).join("\n"); e.dispatchEvent(new Event("input")); });
PROMPT = "30"; await p.click("#np-goto"); PROMPT = null; await sl(200);
ok(/^Ln 30, Col 1/.test(await p.$eval("#np-stat", e => e.textContent)), "N22 go to line: " + await p.$eval("#np-stat", e => e.textContent));
ok(/\d+ characters · 100 words · 50 lines/.test(await p.$eval("#np-stat", e => e.textContent)), "N23 character/word/line count");
await p.click("#np-wrap"); ok(await p.$eval("#np-ta", e => e.wrap === "soft" && getComputedStyle(e).whiteSpace === "pre-wrap"), "N24 word wrap on"); await p.click("#np-wrap");
const fs0 = await p.$eval("#np-ta", e => parseFloat(e.style.fontSize)); await p.click("#np-zin"); await p.click("#np-zin");
ok((await A()).zoom === 120 && await p.$eval("#np-ta", e => parseFloat(e.style.fontSize)) > fs0, "N25 zoom 120%");
await p.select("#np-font", await p.$eval("#np-font", e => e.options[2].value)); ok(/Courier/.test(await p.$eval("#np-ta", e => e.style.fontFamily)), "N26 font change");
await p.select("#np-tools", "sort"); await sl(100); ok((await val()).split("\n")[1] === "row 2" && (await val()).split("\n")[49] === "row 50", "N27 natural sort lines");
await p.$eval("#np-ta", e => { e.value = "b  \na\nb  \n"; e.dispatchEvent(new Event("input")); }); await p.select("#np-tools", "trim"); await p.select("#np-tools", "dedup"); await sl(100);
ok((await val()) === "b\na\n", "N28 trim + remove duplicates: " + JSON.stringify(await val()));
await p.select("#np-tools", "up"); ok((await val()) === "B\nA\n", "N29 UPPERCASE");
await p.click("#np-ta"); await p.keyboard.press("F5"); ok(/\d\d:\d\d \d\d-\d\d-\d{4}/.test(await val()), "N30 F5 time/date");
await p.click("#np-spell"); ok(await p.$eval("#np-ta", e => e.spellcheck === true), "N31 spellcheck toggle");
// encodings round trip
await p.$eval("#np-ta", e => { e.value = "A₹\nদুই"; e.dispatchEvent(new Event("input")); });
await p.select("#np-enc", "utf-16le"); await p.select("#np-eol", "crlf"); await saveAs("u16out.txt");
let by = await bytesOf("u16out.txt"); ok(Array.isArray(by) && by[0] === 0xff && by[1] === 0xfe && by[2] === 65 && by[4] === 0xb9 && by[5] === 0x20 && by[6] === 13 && by[8] === 10, "N32 saved as UTF-16 LE with CRLF: " + (Array.isArray(by) ? by.slice(0, 10) : by));
await p.select("#np-enc", "utf-8-bom"); await p.select("#np-eol", "lf"); await saveAs("bom.txt"); by = await bytesOf("bom.txt");
ok(Array.isArray(by) && by[0] === 0xef && by[1] === 0xbb && by[2] === 0xbf && by[3] === 65, "N33 UTF-8 with BOM");
await p.$eval("#np-ta", e => { e.value = "Café €5"; e.dispatchEvent(new Event("input")); }); await p.select("#np-enc", "windows-1252"); await saveAs("ansi2.txt"); by = await bytesOf("ansi2.txt");
ok(Array.isArray(by) && by.join(",") === "67,97,102,233,32,128,53", "N34 ANSI (Windows-1252) bytes");
await open((await p.evaluate(() => pd.files.find(x => x.path.endsWith("u16out.txt")).path))); ok((await val()) === "A₹\nদুই", "N35 UTF-16 file reopens identical");
// session restore after reload
const before = (await A()).names; await sl(900); 
await p.reload({ waitUntil: "networkidle0" }); await gate(); await sl(800);
if (await p.$eval("#pd-main", e => e.hidden)) { await p.evaluate(() => document.getElementById("sec-pendrive").click()); await sl(500); await p.$eval("#pd-o-name", (e, n) => e.value = n, name); await p.$eval("#pd-o-pin", e => e.value = "482915"); await p.$eval("#pd-open-form", f => f.requestSubmit()); await sl(2500); }
await p.click("#ed-tab-note"); await sl(800); a = await A();
ok(a.n === before.length && a.names.join("|") === before.join("|"), "N36 tabs restored after reload: " + a.names.join(", "));
await shot("n04-restored");
await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await sl(200); await p.click('.np-tab .np-tn[data-i="1"]').catch(() => {}); await sl(200); await shot("n05-dark"); await p.evaluate(() => document.documentElement.removeAttribute("data-theme"));
await p.click("#pd-close"); await sl(800); ok(await p.evaluate(n => !sessionStorage.getItem("np:sess:" + n), name), "N37 Close pendrive clears the saved Notepad session");
ok(!errs.length, "N38 no page errors " + errs.slice(0, 3).join(" | "));
await b.close(); console.log(fails ? fails + " FAILED" : "ALL PASS"); process.exit(fails ? 1 : 0);
