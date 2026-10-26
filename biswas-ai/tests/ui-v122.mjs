// v122 live UI: one answer panel (hidden until a run), plain questions get no file cards,
// file requests get Download rows that save valid files, no viewer pops up. Uses a zz-test pendrive only.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "https://biswas-ai-for-office.onrender.com", SH = process.env.SH || "/workspace/v122-live", TAG = process.env.TAG || "after";
const DL = SH + "/dl-" + TAG; fs.mkdirSync(DL, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 240000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
async function page(w = 1366, h = 768) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: h }); p.on("dialog", d => d.accept());
  p.on("pageerror", e => console.log("  pageerror", String(e).slice(0, 200)));
  const s = await b.target().createCDPSession(); await s.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
  await p.goto(B + "/", { waitUntil: "networkidle0" });
  for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(500); }
  await p.evaluate(() => { try { BA.setSkill("auto"); } catch (e) {} });
  return p;
}
const shot = (p, n, full) => p.screenshot({ path: `${SH}/${TAG}-${n}.png`, fullPage: !!full });
const viewerOpen = p => p.evaluate(() => { const v = document.querySelector("#ba-viewer"); return !!(v && !v.hidden); });
const waitFile = async (re, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { const f = fs.readdirSync(DL).find(x => re.test(x) && !x.endsWith(".crdownload")); if (f) return DL + "/" + f; await sl(500); } return null; };
const magic = f => { const u = fs.readFileSync(f); return u.slice(0, 4).toString("latin1"); };
async function pdAskWait(p, q) {
  await p.$eval("#pd-q", e => { e.value = ""; }); await p.type("#pd-q", q);
  const n0 = await p.evaluate(() => pd.outs.length);
  await p.$eval("#pd-ai-form", f => f.requestSubmit()); await sl(1500);
  await shot(p, "pd-loading");
  await p.waitForFunction(n => pd.outs.length > n && !document.querySelector("#pd-ai-progress")?.textContent, { timeout: 240000, polling: 500 }, n0).catch(() => {});
  await sl(6000);
}
// ---------- AI Pendrive ----------
const p = await page(); await p.click("#sec-pendrive"); await sl(500);
await p.type("#pd-c-name", "zz-test-v122-" + Date.now().toString(36)); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 });
if (await p.$(".pd-bgo[data-pd-br=\"\"]")) { await p.click(".pd-bgo[data-pd-br=\"\"]"); await sl(500); } // branches home (v123+): open Main
fs.writeFileSync("/tmp/kharcha.txt", "Office expenses October\nElectricity: 1200\nWater: 300\nStationery: 850\nTea: 400\n");
await (await p.$("#pd-file-in")).uploadFile("/tmp/kharcha.txt"); await sl(800);
if (await p.$("#pd-confirm:not([hidden]) [data-pd-sum-go]")) await p.click("[data-pd-sum-go]");
for (let i = 0; i < 60; i++) { await sl(2000); const idx = await p.evaluate(async () => { const l = await pdApi("list", {}); return l.files.map(f => !!f.text); }).catch(() => null); if (idx && idx.length && idx.every(Boolean)) break; }
await p.evaluate(() => pdRefresh && pdRefresh()); await sl(1500);
const pre = await p.evaluate(() => ({ outHidden: !!document.querySelector("#pd-out")?.hidden, saveBox: !!document.querySelector(".pd-act") }));
ok(pre.outHidden, "pendrive: no output panel before the first run"); await shot(p, "pd-empty");
await pdAskWait(p, "What is the electricity expense in kharcha.txt?");
const a = await p.evaluate(() => ({ cards: [...document.querySelectorAll(".ba-att")].filter(e => e.offsetParent).length, panels: [...document.querySelectorAll("#pd-out, .pd-out")].filter(e => e.offsetParent).length, saveBox: !!document.querySelector(".pd-act"), text: document.querySelector("#pd-out-doc")?.innerText.slice(0, 200) }));
ok(a.cards === 0, `pendrive plain question: no attachment cards (${a.cards})`); ok(a.panels === 1, `pendrive: one output area (${a.panels})`); ok(!a.saveBox, "pendrive: no save-to-pendrive box"); ok(!(await viewerOpen(p)), "pendrive: viewer not opened");
console.log("  answer:", (a.text || "").replace(/\s+/g, " ")); await shot(p, "pd-plain");
await pdAskWait(p, "Make a Word and PDF report of the expenses in kharcha.txt with a table and total.");
await p.waitForFunction(() => document.querySelectorAll('.ba-att[data-type="docx"]').length && document.querySelectorAll('.ba-att[data-type="pdf"]').length, { timeout: 60000 }).catch(() => {});
const c = await p.evaluate(() => [...document.querySelectorAll(".ba-att")].filter(e => e.offsetParent).map(e => ({ type: e.dataset.type, name: e.querySelector("b")?.textContent, dl: !!e.querySelector('[data-ba="dl"]'), size: e.querySelector("small")?.textContent })));
console.log("  cards:", JSON.stringify(c));
ok(c.some(x => x.type === "docx" && x.dl) && c.some(x => x.type === "pdf" && x.dl), "pendrive report: Word + PDF rows with Download");
for (const ty of ["docx", "pdf"]) { const btn = await p.$(`.ba-att[data-type="${ty}"] [data-ba="dl"]`); if (!btn) continue; await btn.click(); const f = await waitFile(new RegExp("\\." + ty + "$")); ok(f && (ty === "docx" ? magic(f).startsWith("PK") : magic(f) === "%PDF"), `pendrive ${ty} download valid (${f ? fs.statSync(f).size + " B" : "missing"})`); }
ok(!(await viewerOpen(p)), "pendrive report: viewer not opened");
const tb = await p.$('[data-pd-out="docx"]'); if (tb) { await tb.click(); const f = await waitFile(/^ai-output.*\.docx$/); ok(f && magic(f).startsWith("PK"), "pendrive toolbar ⬇ Word valid"); }
await p.evaluate(() => document.querySelector("#pd-out")?.scrollIntoView()); await sl(400); await shot(p, "pd-report");
await shot(p, "pd-report-full", true);
// mobile
await p.setViewport({ width: 390, height: 844 }); await sl(800); await p.evaluate(() => document.querySelector("#pd-out")?.scrollIntoView()); await sl(400); await shot(p, "pd-mobile");
await p.close();
// ---------- Office chat ----------
async function chat(q, name) {
  const p = await page(); await p.evaluate(() => go("office", "chat")); await sl(800);
  await p.click("#q"); await p.type("#q", q); await p.keyboard.press("Enter");
  await p.waitForFunction(() => { const m = [...document.querySelectorAll(".msg.ai")].pop(); return m && m.querySelector(".actions"); }, { timeout: 240000, polling: 1000 }).catch(() => {});
  await sl(8000);
  const r = await p.evaluate(() => { const m = [...document.querySelectorAll(".msg.ai")].pop(); return { cards: m ? [...m.parentElement.querySelectorAll(".ba-att")].filter(e => e.offsetParent).map(e => e.dataset.type) : [] }; });
  r.viewer = await viewerOpen(p); await shot(p, name); return { p, r };
}
let { p: q1, r: r1 } = await chat("What is the full form of BDO?", "office-plain");
ok(r1.cards.length === 0, `office plain: no attachment cards (${r1.cards})`); ok(!r1.viewer, "office plain: viewer not opened"); await q1.close();
let { p: q2, r: r2 } = await chat("Write a short letter to the BDO asking for a new computer. Give Word and PDF files.", "office-report");
ok(r2.cards.includes("docx") && r2.cards.includes("pdf"), `office file request: Word + PDF rows (${r2.cards})`); ok(!r2.viewer, "office: viewer not opened");
const db = await q2.$('.ba-att[data-type="pdf"] [data-ba="dl"]'); if (db) { await db.click(); const f = await waitFile(/\.pdf$/); ok(f && magic(f) === "%PDF", "office PDF download valid"); }
await q2.close();
await b.close(); console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exitCode = fails ? 1 : 0;
