// Round 5: Excel charts inside .xlsx (write + read back), Word page border + vertical line read back from .docx, Word grammar check.
import puppeteer from "puppeteer-core"; import fs from "node:fs"; import { execSync } from "node:child_process";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/tmp/v-r5";
fs.mkdirSync(SH, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const sl = ms => new Promise(r => setTimeout(r, ms)); let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 }); let perr = 0; p.on("pageerror", e => { perr++; console.log("PAGEERR", String(e)); });
let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
if (process.env.PD) { await p.type("#pd-o-name", process.env.PD); await p.type("#pd-o-pin", process.env.PIN || "482915"); await p.$eval("#pd-open-form", f => f.requestSubmit()); }
else { await p.type("#pd-c-name", "zz-test-cv-" + Date.now().toString(36)); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit()); }
await p.waitForSelector("#pd-main", { visible: true, timeout: 30000 }); await sl(800);
// Excel: data + column chart + line chart -> .xlsx has real chart parts -> reopened, the charts come back
await p.click("#ed-tab-excel"); await sl(900);
const x = await p.evaluate(async () => { const X = BA_ED.kinds.excel, a = X._api();
  a.aiEdit(({ book, putRaw }) => { const s = book.sheets[0]; [["Month", "Sales", "Cost"], ["Jan", 10, 4], ["Feb", 20, 9], ["Mar", 15, 7]].forEach((row, r) => row.forEach((v, c) => putRaw(s, r, c, String(v)))); s.charts = [{ type: "bar", r1: 0, c1: 0, r2: 3, c2: 2, title: "Sales" }, { type: "line", r1: 0, c1: 0, r2: 3, c2: 1, title: "Trend" }, { type: "pie", r1: 0, c1: 0, r2: 3, c2: 1, title: "Share" }]; });
  const { blob } = await X.export("xlsx"); const buf = await blob.arrayBuffer(); const z = await JSZip.loadAsync(buf); const names = Object.keys(z.files);
  const c1 = await z.file("xl/charts/chart1.xml").async("string"); const ct = await z.file("[Content_Types].xml").async("string");
  const ok1 = !new DOMParser().parseFromString(c1, "application/xml").querySelector("parsererror");
  a.aiEdit(({ book }) => { book.sheets[0].charts = []; }); await X.load(buf, "xlsx"); const back = X._api().book.sheets[0].charts || [];
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return { names: names.filter(n => /chart|drawing/.test(n)), barCol: /<c:barDir val="col"\/>/.test(c1) && /Sheet1|'!\$B\$2:\$B\$4/.test(c1), ok1, ct: /drawingml\.chart\+xml/.test(ct), back: back.map(c => [c.type, c.r1, c.c1, c.r2, c.c2, c.title]), b64 }; });
fs.writeFileSync("/tmp/r5-charts.xlsx", Buffer.from(x.b64, "base64"));
ok(x.names.includes("xl/charts/chart1.xml") && x.names.includes("xl/charts/chart3.xml") && x.names.includes("xl/drawings/drawing1.xml") && x.ct && x.ok1 && x.barCol, "X1 .xlsx holds 3 real charts (chart parts, drawing, content types, valid XML, ranges): " + x.names.join(","));
ok(JSON.stringify(x.back) === JSON.stringify([["bar", 0, 0, 3, 2, "Sales"], ["line", 0, 0, 3, 1, "Trend"], ["pie", 0, 0, 3, 1, "Share"]]), "X2 reopened .xlsx shows the same charts: " + JSON.stringify(x.back));
let py = ""; try { py = execSync(`python3 -c "import zipfile,re;z=zipfile.ZipFile('/tmp/r5-charts.xlsx');import openpyxl;openpyxl.load_workbook('/tmp/r5-charts.xlsx');print(len([n for n in z.namelist() if n.startswith('xl/charts/chart')]))"`).toString().trim(); } catch (e) { py = "ERR " + e.message.slice(0, 200); }
ok(py === "3", "X3 openpyxl opens the file; 3 chart parts: " + py);
let lo = ""; try { execSync("cd /tmp && rm -f r5-charts.pdf && timeout 90 soffice --headless --convert-to pdf r5-charts.xlsx >/dev/null 2>&1"); lo = fs.statSync("/tmp/r5-charts.pdf").size > 5000 ? "ok" : "small"; } catch (e) { lo = "ERR"; }
ok(lo === "ok", "X4 LibreOffice renders the workbook with charts: " + lo);
// Word: page border (box) + vertical line survive save -> reopen
await p.click("#ed-tab-word"); await sl(800);
const w = await p.evaluate(async () => { const W = BA_ED.kinds.word, pg = W.page(); pg.innerHTML = '<p>Top line</p><div class="wd-vline" contenteditable="false" style="height: 120px; margin-left: 40px; border-left: 3px solid rgb(255, 0, 0);"></div><p>After the line</p>';
  W.pg.pbd = "box"; W.pg.pbw = 2; W.pg.pbc = "#0000ff"; const { blob } = await W.export(); const buf = await blob.arrayBuffer();
  W.pg.pbd = ""; pg.innerHTML = "<p>x</p>"; await W.load(buf); const v = W.page().querySelector(".wd-vline");
  return { pbd: W.pg.pbd, pbw: W.pg.pbw, pbc: String(W.pg.pbc).toLowerCase(), v: v ? [Math.round(parseFloat(v.style.height)), Math.round(parseFloat(v.style.marginLeft)), v.style.borderLeftColor, (v.nextElementSibling || {}).textContent] : null, shown: !!document.querySelector(".wd-pbd") }; });
ok(w.pbd === "box" && w.pbw === 2 && w.pbc === "#0000ff" && w.shown, "W1 page border read back from .docx: " + JSON.stringify([w.pbd, w.pbw, w.pbc, w.shown]));
ok(w.v && Math.abs(w.v[0] - 120) <= 2 && Math.abs(w.v[1] - 40) <= 2 && /255, 0, 0|ff0000/i.test(w.v[2]) && w.v[3] === "After the line", "W2 vertical line read back (height, position, colour, place): " + JSON.stringify(w.v));
// Word grammar check
await p.evaluate(() => { BA_ED.kinds.word.page().innerHTML = "<p>This are a simple sentence with a speling mistake.</p>"; });
await p.click("#wd-gramb"); await p.waitForFunction(() => /issue|No grammar|unavailable/.test(document.querySelector("#wd-gram").textContent), { timeout: 30000 });
const g = await p.$eval("#wd-gram", e => ({ t: e.textContent.slice(0, 200), fixes: e.querySelectorAll(".wd-gram-fix").length }));
ok(/issue/.test(g.t) && g.fixes > 0, "G1 grammar check lists issues with fixes: " + g.t);
await p.$eval(".wd-gram-fix", b => b.click()); await sl(300);
const t1 = await p.evaluate(() => BA_ED.kinds.word.page().innerText.trim());
ok(t1 !== "This are a simple sentence with a speling mistake." && /sentence/.test(t1), "G2 one click fixes the text in place: " + t1);
ok(perr === 0, "no page errors"); console.log(fails ? fails + " FAILED" : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
