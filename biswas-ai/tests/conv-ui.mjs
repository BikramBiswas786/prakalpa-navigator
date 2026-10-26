// Answer panel contrast (light + dark), edit in place, revise with AI (AI=1), conversations (save/list/open/rename/delete). zz-test pendrive only.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-conv-live", AI = process.env.AI === "1";
fs.mkdirSync(SH, { recursive: true }); const DL = SH + "/dl"; fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 240000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
const errs = []; p.on("pageerror", e => errs.push(String(e)));
p.on("dialog", d => { d.type() === "prompt" ? d.accept(globalThis.PROMPT || d.defaultValue()) : d.accept(); });
const cdp = await b.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
const shot = (n, full) => p.screenshot({ path: `${SH}/${n}.png`, fullPage: !!full });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-conv-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(1200);
ok(await p.$eval("#pd-convs", e => !!e.offsetParent && /Conversations · 0/.test(e.innerText)), "1 Conversations bar above the branches home (0 saved)");
await p.click('.pd-bgo[data-pd-br=""]'); await sl(500);
const MD = "# Expense report\n\nOffice expenses for **October** [1].\n\n## Items\n\n| Item | Amount |\n| --- | --- |\n| Electricity | 1200 |\n| Water | 300 |\n\n- Paid on time\n- Receipts kept\n\n1. Check bills\n2. File them";
const inject = md => p.evaluate((md) => { $("#pd-q").value = "Make an expense report"; pdOutAdd(md, ["kharcha.txt"], [{ n: 1, path: "kharcha.txt", id: "x", quote: "Electricity: 1200" }]); }, md);
if (!AI) await inject(MD);
else {
  fs.writeFileSync("/tmp/kharcha.txt", "Office expenses October\nElectricity: 1200\nWater: 300\nStationery: 850\nTea: 400\n");
  await (await p.$("#pd-file-in")).uploadFile("/tmp/kharcha.txt"); await sl(800);
  if (await p.$("#pd-confirm:not([hidden]) [data-pd-sum-go]")) await p.click("[data-pd-sum-go]");
  for (let i = 0; i < 60; i++) { await sl(2000); const r = await p.evaluate(async () => (await pdApi("list", {})).files.some(f => f.text)).catch(() => false); if (r) break; }
  await p.evaluate(() => pdRefresh()); await sl(800);
  await p.$eval("#pd-q", e => { e.value = ""; }); await p.type("#pd-q", "Make a table of each expense item and its amount from kharcha.txt");
  await p.click("#pd-ask"); await p.waitForFunction(() => !$("#pd-out").hidden && pd.outs.length, { timeout: 180000 }); await sl(2500);
}
await sl(800);
// contrast in both themes
const contrast = () => p.evaluate(() => {
  const rgb = s => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const bgOf = el => { const st = []; for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.a > 0) { st.push(c); if (c.a >= 1) break; } } let out = { r: 255, g: 255, b: 255 }; for (const c of st.reverse()) out = { r: c.r * c.a + out.r * (1 - c.a), g: c.g * c.a + out.g * (1 - c.a), b: c.b * c.a + out.b * (1 - c.a) }; return out; };
  const bad = []; let n = 0;
  for (const el of document.querySelectorAll("#pd-out *, #pd-convs *")) {
    if (!el.offsetParent || ![...el.childNodes].some(c => c.nodeType === 3 && c.nodeValue.trim())) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden") continue; const fg = rgb(cs.color), bg = bgOf(el);
    const a = lum(fg), c = lum(bg), r = (Math.max(a, c) + .05) / (Math.min(a, c) + .05); n++;
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.6 && Number(cs.fontWeight) >= 700);
    if (r < (big ? 3 : 4.5) && !el.disabled && !el.closest("[disabled]")) bad.push(el.tagName + "." + el.className + " " + r.toFixed(2) + " '" + el.textContent.trim().slice(0, 20) + "'");
  }
  return { n, bad };
});
for (const th of ["light", "dark"]) {
  await p.evaluate(th => document.documentElement.setAttribute("data-theme", th), th); await sl(400);
  const c = await contrast(); ok(c.n > 10 && !c.bad.length, `2 ${th}: all ${c.n} text items in the answer panel + conversations meet WCAG AA` + (c.bad.length ? " BAD: " + c.bad.slice(0, 6).join(" | ") : ""));
  await p.$eval("#pd-out", e => e.scrollIntoView()); await shot(`answer-${th}`);
}
await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
// edit in place
await p.click("#pd-edit-btn"); await sl(300);
ok(await p.$eval("#pd-out-doc", e => e.isContentEditable) && await p.$eval("#pd-edit-bar", e => !e.hidden), "3 Edit makes the answer editable with Save/Cancel");
await p.evaluate(() => { const h = $("#pd-out-doc").querySelector("h1, h2, p"); h.textContent = "Edited heading ZZQ"; });
await shot("edit-dark");
await p.click('[data-pd-ed="cancel"]'); await sl(300);
ok(await p.$eval("#pd-out-doc", e => !e.isContentEditable && !/ZZQ/.test(e.innerText)), "4 Cancel drops the edit");
await p.click("#pd-edit-btn"); await sl(300);
await p.evaluate(() => { const h = $("#pd-out-doc").querySelector("h1, h2, p"); h.textContent = "Edited heading ZZQ"; });
await p.click('[data-pd-ed="save"]'); await sl(500);
const st = await p.evaluate(() => ({ n: pd.outs.length, k: pd.outs[0].kind, md: pd.outs[0].md, prev: pd.outs[1] && pd.outs[1].md }));
ok(st.k === "edit" && /ZZQ/.test(st.md) && !/ZZQ/.test(st.prev) && /\|/.test(st.md), "5 Save keeps the edit as a new step (earlier version kept, table kept): " + st.md.slice(0, 60).replace(/\n/g, " "));
await p.click('[data-pd-out="md"]').catch(() => {}); // md is in More; use the function directly
await p.evaluate(() => pdOutAct("md")); await sl(1500);
const mdf = fs.readdirSync(DL).find(f => f.endsWith(".md")); ok(!!mdf && /ZZQ/.test(fs.readFileSync(DL + "/" + mdf, "utf8")), "6 downloads use the edited text");
// revise with AI
if (AI) {
  await p.type("#pd-rev-q", "Add a Total row to the table"); await p.click("#pd-rev-go");
  await p.waitForFunction(() => pd.outs[0].kind === "revise", { timeout: 180000 }).catch(() => {}); await sl(1500);
  const rv = await p.evaluate(() => ({ k: pd.outs[0].kind, md: pd.outs[0].md, n: pd.outs.length }));
  ok(rv.k === "revise" && /total/i.test(rv.md) && rv.n >= 3, "7 Revise with AI adds a revised step below, earlier steps kept: " + rv.md.slice(0, 80).replace(/\n/g, " "));
  await p.$eval("#pd-out", e => e.scrollIntoView()); await shot("revised-dark", true);
} else console.log("SKIP 7 revise (AI=1 to run)");
// thread shows every step
ok(await p.$eval("#pd-out-list", e => e.querySelectorAll("li").length) >= 2, "8 thread lists the earlier versions");
// save to conversation
await p.click('[data-pd-out="conv"]'); await sl(1500);
let convs = await p.evaluate(async () => (await pdApi("conv/list")).convs);
ok(convs.length === 1 && convs[0].n >= 2 && convs[0].branch === "", "9 Save to conversation stores it on the pendrive: " + JSON.stringify(convs.map(c => [c.title, c.n, c.branch])));
// new conversation clears; reopen restores
await p.$eval("#pd-convs", d => d.open = true); await p.click("[data-pd-cv-new]"); await sl(400);
ok(await p.evaluate(() => !pd.outs.length && $("#pd-out").hidden), "10 + New conversation starts empty");
await p.evaluate(() => { pd.home = true; pdCd(PD_HOME); }); await sl(400);
await p.$eval("#pd-convs", d => d.open = true); await sl(200); await shot("conversations-dark");
await p.evaluate(() => document.documentElement.setAttribute("data-theme", "light")); await sl(200); await shot("conversations-light");
await p.evaluate(() => { localStorage.clear(); }); // prove it comes from the server
await p.click("[data-pd-cv-open]"); await sl(1500);
const re = await p.evaluate(() => ({ n: pd.outs.length, doc: $("#pd-out-doc").innerText, vis: !$("#pd-out").hidden, list: $("#pd-out-list").querySelectorAll("li").length, work: !!$("#pd-work").offsetParent }));
ok(re.vis && re.work && re.n >= 2 && /ZZQ|Total/i.test(re.doc) && re.list === re.n, "11 Open restores the thread from the server (" + re.n + " steps)");
await p.$eval("#pd-out", e => e.scrollIntoView()); await shot("reopened-light");
const cards = await p.$$eval("#pd-out .ba-att", a => a.length); console.log("  file rows after reopen:", cards);
// rename + delete
globalThis.PROMPT = "ZZ renamed conv"; await p.$eval("#pd-convs", d => d.open = true); await p.evaluate(() => document.querySelector(".pd-conv-row details").open = true); await p.click("[data-pd-cv-ren]"); await sl(1000);
convs = await p.evaluate(async () => (await pdApi("conv/list")).convs); ok(convs[0].title === "ZZ renamed conv", "12 rename");
await p.evaluate(() => document.querySelector(".pd-conv-row details").open = true); await p.click("[data-pd-cv-del]"); await sl(1000);
convs = await p.evaluate(async () => (await pdApi("conv/list")).convs); ok(!convs.length && await p.$eval("#pd-convs", e => /Conversations · 0/.test(e.innerText)), "13 delete");
// mobile
await p.setViewport({ width: 390, height: 844, isMobile: true }); await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await sl(400); await shot("mobile-dark", true);
ok(!errs.length, "14 no page errors " + errs.join(" | "));
await b.close(); console.log(fails ? "FAILED " + fails : "ALL PASS"); process.exit(fails ? 1 : 0);
