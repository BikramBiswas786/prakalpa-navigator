// v115 headless: real files through the real browser extraction (pdf.js pages, docx worker headings, SheetJS rows),
// cited answers with [n] chips that open the preview at the page / sheet rows / section with the passage highlighted,
// strict "not found", scanned-PDF marking, and the same on a share link.
import puppeteer from "puppeteer-core"; import fs from "node:fs"; import path from "node:path";
const B = process.env.BASE || "http://localhost:3997", SHOT = process.env.SHOT || "/workspace/v115-shots/r", SRC = process.env.SRC || "/tmp/fx/rag";
fs.mkdirSync(path.dirname(SHOT), { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"], protocolTimeout: 120000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
const bad = []; let step = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const page = async () => { const p = await b.newPage(); await p.setViewport({ width: 1360, height: 900 });
  p.on("pageerror", e => bad.push(e.message)); p.on("console", m => { if (m.type() === "error" && !/status of 4\d\d|status of 503/.test(m.text())) bad.push(m.text()); }); p.on("dialog", d => d.accept(d.type() === "prompt" ? d.defaultValue() : undefined)); return p; };
const shot = async (p, n) => { const f = `${SHOT}-${String(++step).padStart(2, "0")}-${n}.png`; await p.screenshot({ path: f }); console.log("  shot", f); };
const p = await page();
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "Tester"); await p.$eval("#gate form, #gate-form", f => f.requestSubmit ? f.requestSubmit() : f.submit()); await sl(400); } }
await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-v115-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true }); await sl(800); console.log("pendrive " + name); ok(true, "1 zz-test pendrive created");
await (await p.$("#pd-folder-in")).uploadFile(SRC); await p.waitForSelector("#pd-confirm:not([hidden])", { timeout: 20000 }); await p.click("[data-pd-sum-go]");
await p.waitForFunction(() => pd.files.length >= 4 && !pd.ups.some(u => !["done", "fail", "skip", "cancel"].includes(u.state)) && !pd.textLeft, { timeout: 240000, polling: 500 }).catch(() => {});
await sl(3000); await p.evaluate(() => pdRefresh && pdRefresh()); await sl(1500);
const files = await p.evaluate(() => pd.files.map(f => ({ path: f.path, text: f.text, note: f.note })));
ok(files.length === 4 && files.filter(f => f.text).length === 3, `2 uploaded 4 files, 3 with text (${files.map(f => f.path.split("/").pop() + (f.text ? "✓" : "·" + (f.note || ""))).join(" ")})`);
ok(files.find(f => /scan\.pdf$/.test(f.path))?.note === "scanned", "3 image-only PDF marked scanned");
await p.evaluate(() => pdCd("rag/Docs")); await sl(800);
const rowText = await p.$$eval("#pd-rows tr", t => t.map(x => x.innerText).join("\n")); ok(/scanned, no text/.test(rowText), "4 file list shows \"scanned, no text\""); await shot(p, "list-scanned");
const askQ = async q => { await p.$eval("#pd-q", e => { e.value = ""; }); await p.type("#pd-q", q); await p.evaluate(() => { pd.aiSel && pd.aiSel.clear(); });
  await p.$eval("#pd-ai-form", f => f.requestSubmit()); await p.waitForFunction(() => !document.querySelector("#pd-ai-progress")?.textContent && document.querySelector("#pd-answer")?.innerHTML, { timeout: 120000, polling: 300 }).catch(() => {}); await sl(800);
  return p.evaluate(() => ({ ans: document.querySelector("#pd-answer").innerText, doc: document.querySelector("#pd-out-doc")?.innerText || "", chips: [...document.querySelectorAll("#pd-answer [data-pd-cite]")].map(b => b.textContent), inline: document.querySelectorAll("#pd-out-doc [data-pd-cite]").length, cites: pd.cites })); };
const openCite = async (n, inline) => { await p.click(inline ? `#pd-out-doc [data-pd-cite="${n}"]` : `#pd-answer [data-pd-cite="${n}"]`); await p.waitForFunction(() => { const x = document.querySelector("#pd-preview"); return x && !x.hidden && !/^…$/.test(x.querySelector("p.hint")?.textContent || "") && (x.querySelector("canvas,table,pre,img")); }, { timeout: 30000 }).catch(() => {}); await sl(1500); };
// 5 total sales in March (xlsx aggregate)
let a = await askQ("What is the total sales in March?"); console.log("   ", a.doc.slice(0, 120).replace(/\n/g, " "), "|", a.chips.join(" "));
const cx = (a.cites || []).find(c => /sales\.xlsx$/.test(c.path));
ok(/4200|4,200|৪২০০/.test(a.doc) && cx && cx.loc.sheet === "Sales" && (cx.loc.rows || []).join() === "3,4,5", "5 total sales in March = 4200, cited to sales.xlsx › Sales rows 3–5");
ok(a.inline >= 1, `6 [n] in the answer text became chips (${a.inline})`);
await openCite(cx.n, false); const hl = await p.$$eval("#pd-preview .pd-hl-row th", t => t.map(x => x.textContent));
ok(hl.join() === "3,4,5", `7 chip opens the sheet with rows 3–5 highlighted (${hl})`); await shot(p, "xlsx-cite");
// 8 pdf page cite
a = await askQ("How many days of casual leave are allowed per year?"); console.log("   ", a.doc.slice(0, 120).replace(/\n/g, " "), "|", a.chips.join(" "));
const cpd = (a.cites || []).find(c => /manual4\.pdf$/.test(c.path));
ok(cpd && cpd.loc.page === 2 && /casual leave/i.test(cpd.quote || ""), "8 leave answer cites manual4.pdf p. 2 with the passage");
ok(!(a.cites || []).some(c => /ACME Block Office Manual|Page \d of 4/.test(c.quote || "")), "9 page header/footer not in the cited passage");
if (cpd) { await openCite(cpd.n, false); const v = await p.evaluate(() => ({ pages: [...document.querySelectorAll("#pd-preview canvas")].map(c => c.dataset.page), hl: !!document.querySelector("#pd-preview canvas.pd-hl-page"), box: document.querySelector("#pd-cite-box")?.innerText }));
  ok(v.pages.join() === "2" && v.hl && /casual leave/i.test(v.box || ""), `10 chip opens page 2 with the passage highlighted (${JSON.stringify(v).slice(0, 120)})`); await shot(p, "pdf-cite"); }
// 11 docx heading path
a = await askQ("Which office drove the March sales?"); console.log("   ", a.doc.slice(0, 120).replace(/\n/g, " "), "|", a.chips.join(" "));
const cd = (a.cites || []).find(c => /report\.docx$/.test(c.path));
ok(cd && cd.loc.h === "Annual Report › Sales › March", `11 docx cite carries the heading path (${cd && cd.loc.h})`);
if (cd) { await openCite(cd.n, false); const m = await p.$eval("#pd-preview mark#pd-hl", e => e.textContent).catch(() => ""); ok(/Kolkata/.test(m), "12 docx chip highlights the passage (" + m.slice(0, 50) + ")"); await shot(p, "docx-cite"); }
// 13 strict not found
a = await askQ("What is the population of Mars?");
ok(/not found in your files/i.test(a.ans) && !(a.cites || []).length, "13 unrelated question → strict \"Not found in your files\""); await shot(p, "not-found");
// 14 share link with AI: chips on the receiver page
await p.evaluate(() => pdCd("rag")); await sl(800);
await p.$$eval("#pd-rows tr", trs => trs.find(t => t.dataset.pdKey === "d:rag/Docs").querySelector("[data-pd-sel]").click());
await p.click("#pd-share"); await p.waitForSelector("#pd-sharebox:not([hidden])"); await p.click("#pd-sh-ai"); await p.click("[data-pd-sh-go]"); await p.waitForSelector("#pd-sh-url");
const url = await p.$eval("#pd-sh-url", e => e.textContent.trim()); ok(/\/s\/[a-f0-9]{32}$/.test(url), "14 share link with AI");
const r = await page(); await r.goto(url, { waitUntil: "networkidle0" }); await r.waitForSelector("#s-q", { timeout: 20000 });
await r.$$eval("[data-lang]", bs => { const e = bs.find(b => b.dataset.lang === "en"); if (e) e.click(); }).catch(() => {});
await r.type("#s-q", "What is the total sales in March?"); await r.$eval("#s-aiform", f => f.requestSubmit());
await r.waitForSelector("#s-ans [data-cite]", { timeout: 120000 }).catch(() => {}); await sl(600);
const sa = await r.evaluate(() => ({ t: document.querySelector("#s-ans").innerText, chips: [...document.querySelectorAll("#s-ans [data-cite]")].map(x => x.textContent) }));
console.log("   share:", sa.t.slice(0, 140).replace(/\n/g, " "));
ok(/4200|4,200|৪২০০/.test(sa.t) && sa.chips.some(c => /sales\.xlsx/.test(c)), "15 share page: cited answer with chips"); await shot(r, "share-answer");
await r.$$eval("#s-cites [data-cite]", bs => bs.find(x => /sales\.xlsx/.test(x.textContent)).click()); await r.waitForSelector("#pv-sheet tr.hl-row", { timeout: 30000 }).catch(() => {}); await sl(800);
const shl = await r.$$eval("#pv-sheet tr.hl-row", t => t.length); ok(shl === 3 && await r.$("#pv-cite"), `16 share chip opens sheet with 3 rows highlighted (${shl})`); await shot(r, "share-xlsx-cite");
await r.type("#s-q", " "); await r.$eval("#s-q", e => { e.value = "What is the population of Mars?"; }); await r.$eval("#s-aiform", f => f.requestSubmit());
await r.waitForFunction(() => /not found|পাওয়া যায়নি/i.test(document.querySelector("#s-ans").innerText), { timeout: 60000 }).catch(() => {});
ok(!!(await r.$("#s-notfound")), "17 share page: strict not found"); await shot(r, "share-notfound");
// 18 cleanup through the UI's API
const left = await p.evaluate(async () => { const l = await pdApi("share/list", {}); for (const x of l.links || l.items || []) await pdApi("share/revoke", { sid: x.sid }).catch(() => {}); const ids = pd.files.map(f => f.id); await pdApi("delete", { ids, confirm: true }); const j = await pdApi("list", {}); return j.files.length; });
ok(left === 0, "18 cleanup: files deleted, links revoked");
const errs = bad.filter(e => !/favicon/.test(e)); ok(!errs.length, "19 no page errors / CSP errors " + errs.slice(0, 3).join(" | "));
await b.close();
