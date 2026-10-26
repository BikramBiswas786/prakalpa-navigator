// Word round 2: comments, track changes (accept/reject), columns, table of contents, footnotes, watermark; docx keeps them.
import puppeteer from "puppeteer-core"; import fs from "node:fs"; import { execSync } from "node:child_process";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-word-r2";
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
await p.evaluate(() => { const pg = BA_ED.kinds.word.page(); pg.innerHTML = "<h1>Annual Report</h1><p>The budget is low this year.</p><h2>Details</h2><p>Funds came late.</p><p>Second para.</p>"; pg.dispatchEvent(new Event("input", { bubbles: true })); });
const selectText = (sel, a, z) => p.evaluate((sel, a, z) => { const el = document.querySelector("#wd-page " + sel), t = el.firstChild; const r = document.createRange(); r.setStart(t, a); r.setEnd(t, z); const s = getSelection(); s.removeAllRanges(); s.addRange(r); BA_ED.kinds.word.page().focus(); s.removeAllRanges(); s.addRange(r); }, sel, a, z);
// comment
await selectText("p", 4, 10); PROMPT = "Check the figure"; await p.click("#wd-cmtb"); await sl(400);
ok(await p.evaluate(() => { const c = document.querySelector("#wd-page span.wd-cmt"); return c && c.textContent === "budget" && c.dataset.c === "Check the figure"; }), "R1 comment added on the selected text");
ok(await p.$eval("#wd-cmts", e => !e.hidden && /Check the figure/.test(e.textContent)), "R2 comments list shows it under the toolbar (inline, no pop-up)");
// track changes
await p.click("#wd-track"); ok(await p.$eval("#wd-track", e => e.getAttribute("aria-pressed") === "true"), "R3 track changes on");
await p.evaluate(() => { const t = document.querySelectorAll("#wd-page p")[1].firstChild; const r = document.createRange(); r.setStart(t, t.length); r.collapse(true); BA_ED.kinds.word.page().focus(); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
await p.keyboard.type(" Very late"); await p.keyboard.press("Backspace"); await p.keyboard.press("Backspace");
ok(await p.evaluate(() => (document.querySelector("#wd-page ins.wd-ins") || {}).textContent === " Very la"), "R4 typed text is marked as inserted: " + await p.evaluate(() => (document.querySelector("#wd-page ins.wd-ins") || {}).textContent));
await selectText("h2", 0, 7); await p.keyboard.press("Backspace");
ok(await p.evaluate(() => (document.querySelector("#wd-page del.wd-del") || {}).textContent === "Details" && /Details/.test(document.querySelector("#wd-page h2").textContent)), "R5 deleted text stays, struck through");
await shot("r2-01-track-comment");
const html0 = await p.evaluate(() => BA_ED.kinds.word.page().innerHTML);
await p.click("#wd-rej"); ok(await p.evaluate(() => !document.querySelector("#wd-page ins,#wd-page del") && document.querySelector("#wd-page h2").textContent === "Details" && /Funds came late\.$/.test(document.querySelectorAll("#wd-page p")[1].textContent)), "R6 reject all restores the original");
await p.evaluate(h => { BA_ED.kinds.word.page().innerHTML = h; }, html0); await p.click("#wd-acc");
ok(await p.evaluate(() => !document.querySelector("#wd-page ins,#wd-page del") && document.querySelector("#wd-page h2").textContent === "" && /late\. Very la$/.test(document.querySelectorAll("#wd-page p")[1].textContent)), "R7 accept all keeps the edits: " + await p.evaluate(() => JSON.stringify([document.querySelector("#wd-page h2") && document.querySelector("#wd-page h2").outerHTML, document.querySelectorAll("#wd-page p")[1].textContent])));
await p.click("#wd-track");
// put back a tracked change for export
await p.evaluate(() => { const p2 = document.querySelectorAll("#wd-page p")[2]; p2.innerHTML = 'Second <ins class="wd-ins" data-a="zz tester">new </ins><del class="wd-del" data-a="zz tester">old </del>para.'; document.querySelector("#wd-page h2").textContent = "Details"; });
// columns
await selectText("p:nth-of-type(3)", 0, 3); await p.select("#wd-cols", "2"); await sl(300);
ok(await p.evaluate(() => { const c = document.querySelector("#wd-page .wd-cols"); return c && c.dataset.n === "2" && getComputedStyle(c).columnCount === "2"; }), "R8 two columns on the selected paragraph");
// TOC
await p.click("#wd-tocb"); await sl(300);
ok(await p.evaluate(() => { const t = document.querySelector("#wd-page .wd-toc"); return t && t === BA_ED.kinds.word.page().firstElementChild && t.querySelectorAll("a").length === 2 && /Annual Report/.test(t.textContent); }), "R9 table of contents built from the headings");
// footnote
await selectText("h1", 0, 6); PROMPT = "Source: finance dept"; await p.click("#wd-fnb"); await sl(300);
ok(await p.evaluate(() => { const f = document.querySelector("#wd-page sup.wd-fn"); return f && f.dataset.fn === "Source: finance dept" && f.textContent === "1"; }), "R10 footnote inserted and numbered");
// watermark
PROMPT = "DRAFT"; await p.click("#wd-wmb"); await sl(400);
ok(await p.evaluate(() => [...document.querySelectorAll(".wd-bg .wd-wm")].length >= 1 && document.querySelector(".wd-bg .wd-wm").textContent === "DRAFT"), "R11 watermark on every page");
await shot("r2-02-cols-toc-wm");
// export
const b64 = await p.evaluate(async () => { const { blob } = await BA_ED.kinds.word.export(); const u = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (const x of u) s += String.fromCharCode(x); return btoa(s); });
fs.writeFileSync(SH + "/r2.docx", Buffer.from(b64, "base64"));
const py = execSync(`python3 - <<'PY'
import zipfile,re
z=zipfile.ZipFile("${SH}/r2.docx"); n=z.namelist(); d=z.read("word/document.xml").decode(); h=z.read("word/header1.xml").decode() if "word/header1.xml" in n else ""
ct=z.read("[Content_Types].xml").decode(); rel=z.read("word/_rels/document.xml.rels").decode()
print("CMT", "word/comments.xml" in n and "Check the figure" in z.read("word/comments.xml").decode() and "commentReference" in d and "comments.xml" in rel and "comments+xml" in ct)
print("INS", "<w:ins " in d and "<w:del " in d and "<w:delText" in d)
print("COLS", 'w:cols w:num="2"' in d)
print("FN", "word/footnotes.xml" in n and "finance dept" in z.read("word/footnotes.xml").decode() and "footnoteReference" in d)
print("WM", 'string="DRAFT"' in h)
print("TOC", "Annual Report" in d)
from xml.dom import minidom
for f in n:
  if f.endswith(".xml") or f.endswith(".rels"): minidom.parseString(z.read(f))
print("XMLOK", True)
PY`).toString(); console.log(py.trim().replace(/\n/g, " | "));
for (const k of ["CMT", "INS", "COLS", "FN", "WM", "TOC", "XMLOK"]) ok(new RegExp(k + " True").test(py), "R12 docx keeps " + k);
try { const o = execSync(`cd ${SH} && timeout 120 soffice --headless --convert-to pdf r2.docx >/dev/null 2>&1; pdftotext r2.pdf - | head -40`).toString(); ok(/Annual Report/.test(o) && /finance dept/.test(o), "R13 LibreOffice opens the docx (text + footnote): " + o.replace(/\s+/g, " ").slice(0, 120)); } catch (e) { console.log("SKIP R13 soffice", e.message.slice(0, 80)); }
ok(!perr, "R14 no page errors");
console.log(fails ? `${fails} FAILED` : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
