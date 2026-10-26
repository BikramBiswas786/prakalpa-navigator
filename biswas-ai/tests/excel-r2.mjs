// Excel round 2: cell notes, data validation (list + number), pivot table, named ranges, remove duplicates; xlsx keeps them.
import puppeteer from "puppeteer-core"; import fs from "node:fs"; import { execSync } from "node:child_process";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-excel-r2";
fs.mkdirSync(SH, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const sl = ms => new Promise(r => setTimeout(r, ms)); let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 }); p.on("pageerror", e => { fails++; console.log("FAIL PAGEERR", String(e)); });
let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()).catch(() => {}); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
await p.type("#pd-c-name", "zz-test-x2r-" + Date.now().toString(36)); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 30000 }); await sl(800);
await p.click("#ed-tab-excel"); await sl(600);
const td = (r, c) => `#xs-grid td[data-r="${r}"][data-c="${c}"]`;
const click = async (r, c, shift) => { if (shift) await p.keyboard.down("Shift"); await p.click(td(r, c)); if (shift) await p.keyboard.up("Shift"); await sl(80); };
const type = async (r, c, s) => { await click(r, c); await p.keyboard.type(s); await p.keyboard.press("Enter"); await sl(120); };
const cell = (r, c) => p.$eval(td(r, c), e => e.textContent).catch(() => null);
const data = [["Region", "Item", "Amount"], ["East", "Pen", "10"], ["West", "Pen", "20"], ["East", "Book", "5"], ["West", "Book", "7"], ["East", "Pen", "10"]];
await p.evaluate(d => BA_ED.kinds.excel._api().aiEdit(({ book, putRaw }) => d.forEach((row, r) => row.forEach((v, c) => putRaw(book.sheets[0], r, c, v)))), data); await sl(300);
// note
await click(1, 2); PROMPT = "Checked by audit"; await p.click("#xs-noteb"); await sl(300);
ok(await p.$eval(td(1, 2), e => e.classList.contains("xs-hasnote")), "E1 note marker (red corner) on the cell");
ok(await p.$eval("#xs-notebox", e => !e.hidden && /Checked by audit/.test(e.textContent)), "E2 note shown inline under the formula bar (no pop-up)");
await click(2, 2); ok(await p.$eval("#xs-notebox", e => e.hidden), "E3 inline note hidden on a cell without a note");
// remove duplicates (row 6 = row 2)
await click(0, 0); await click(5, 2, true); await p.click("#xs-dupb"); await sl(300);
ok(await cell(5, 0) === "" && await cell(4, 0) === "West" && /1 duplicate/.test(await p.$eval("#ed-excel-msg, .ed-msg", e => e.textContent).catch(() => "")) || (await cell(5, 0) === "" && await cell(4, 2) === "7"), "E4 duplicate row removed: row6=" + await cell(5, 0));
// validation list
await click(1, 0); await click(4, 0, true); await p.click("#xs-dvb"); await sl(300);
await p.select("#xs-dv-type", "list"); await p.type("#xs-dv-list", "East, West, North"); await p.click("#xs-dlg-ok"); await sl(300);
await type(2, 0, "South"); ok(await cell(2, 0) === "West", "E5 list validation rejects a value not in the list: " + await cell(2, 0));
ok(/Not allowed/.test(await p.evaluate(() => document.body.innerText)), "E6 inline message says why");
await type(2, 0, "north"); ok(await cell(2, 0) === "North", "E7 list value accepted (case fixed): " + await cell(2, 0));
await click(3, 0); ok(await p.$("#xs-dvpick") != null, "E8 dropdown offered for list cells");
await p.select("#xs-dvpick", "West"); await sl(300); ok(await cell(3, 0) === "West", "E9 picking from dropdown sets the cell");
// validation number
await click(1, 2); await click(4, 2, true); await p.click("#xs-dvb"); await sl(300);
await p.select("#xs-dv-type", "whole"); await p.type("#xs-dv-min", "0"); await p.type("#xs-dv-max", "100"); await p.click("#xs-dlg-ok"); await sl(300);
await type(2, 2, "500"); ok(await cell(2, 2) === "20", "E10 number rule rejects 500");
await type(2, 2, "30"); ok(await cell(2, 2) === "30", "E11 number rule accepts 30");
await shot("x2-01-note-dv");
// named range
await click(1, 2); await click(4, 2, true); PROMPT = "Amt"; await p.click("#xs-nameb"); await sl(300);
await type(7, 0, "=SUM(Amt)"); const tot = await p.evaluate(() => { const a = BA_ED.kinds.excel._api(); return a.val(1, 2) + a.val(2, 2) + a.val(3, 2) + a.val(4, 2); });
ok(+await cell(7, 0) === tot, "E12 =SUM(Amt) uses the named range: " + await cell(7, 0) + " vs " + tot);
await type(7, 0, "");
// pivot
await click(0, 0); await click(4, 2, true); await p.click("#xs-pivotb"); await sl(300);
await p.select("#xs-pv-row", "0"); await p.select("#xs-pv-val", "2"); await p.select("#xs-pv-agg", "SUM"); await p.click("#xs-dlg-ok"); await sl(500);
const pv = await p.evaluate(() => { const a = BA_ED.kinds.excel._api(), s = a.book.sheets[a.si()]; const o = []; for (let r = 0; r < 6; r++) o.push([0, 1].map(c => a.show(a.val(r, c)))); return { name: s.name, o }; });
console.log(JSON.stringify(pv));
const exp = await p.evaluate(() => { const a = BA_ED.kinds.excel._api(); const m = {}; for (let r = 1; r <= 4; r++) { const k = a.val(r, 0, 0); m[k] = (m[k] || 0) + a.val(r, 2, 0); } return m; });
ok(pv.name === "Pivot1" && pv.o.slice(2, 2 + Object.keys(exp).length).every(([k, v]) => +v === exp[k]), "E13 pivot sheet sums by Region " + JSON.stringify(exp));
ok(pv.o.some(r => /Grand Total/.test(r[0]) && +r[1] === Object.values(exp).reduce((a, b) => a + b, 0)), "E14 grand total");
await shot("x2-02-pivot");
await p.evaluate(() => BA_ED.kinds.excel._api().aiEdit(({ book, putRaw }) => putRaw(book.sheets[0], 1, 2, "99"))); await sl(300);
const pv2 = await p.evaluate(() => { const a = BA_ED.kinds.excel._api(); const o = []; for (let r = 2; r < 6; r++) o.push([a.show(a.val(r, 0)), a.val(r, 1)]); return o; });
ok(pv2.some(([k, v]) => k === "East" && v === 99 + (exp.East - 10)), "E15 pivot updates when data changes " + JSON.stringify(pv2));
// export + reimport
const b64 = await p.evaluate(async () => { const { blob } = await BA_ED.kinds.excel.export("xlsx"); const u = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (const x of u) s += String.fromCharCode(x); return btoa(s); });
fs.writeFileSync(SH + "/r2.xlsx", Buffer.from(b64, "base64"));
const py = execSync(`python3 - <<'PY'
import zipfile
z=zipfile.ZipFile("${SH}/r2.xlsx"); n=z.namelist(); s1=z.read("xl/worksheets/sheet1.xml").decode(); wb=z.read("xl/workbook.xml").decode()
print("DV", '<dataValidation type="list"' in s1 and "East,West,North" in s1 and 'type="whole"' in s1)
print("NOTE", any("comments" in x and "Checked by audit" in z.read(x).decode() for x in n))
print("NAME", "definedName" in wb and "Amt" in wb)
print("PIVF", "SUMIFS" in z.read("xl/worksheets/sheet2.xml").decode())
PY`).toString(); console.log(py.trim());
ok(/DV True/.test(py), "E16 xlsx has data validation"); ok(/NOTE True/.test(py), "E17 xlsx has the cell note"); ok(/NAME True/.test(py), "E18 xlsx has the defined name"); ok(/PIVF True/.test(py), "E19 pivot sheet keeps live SUMIFS formulas");
await p.evaluate(async b64 => { const u = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); await BA_ED.kinds.excel.load(u.buffer, "xlsx"); }, b64); await sl(400);
const re = await p.evaluate(() => { const a = BA_ED.kinds.excel._api(), s = a.book.sheets[0]; return { note: s.notes.get("1,2"), dv: s.dv.map(v => v.type).join(","), names: Object.keys(a.book.names || {}).join(",") }; });
ok(re.note === "Checked by audit" && /list/.test(re.dv) && /whole/.test(re.dv) && re.names === "Amt", "E20 reopened xlsx keeps note, validation and name " + JSON.stringify(re));
try { execSync(`cd ${SH} && timeout 90 soffice --headless --convert-to pdf r2.xlsx >/dev/null 2>&1 && pdftoppm -png -r 50 -f 1 -l 1 r2.pdf x2-lo`); ok(fs.existsSync(SH + "/x2-lo-1.png"), "E21 LibreOffice opens the xlsx"); } catch (e) { ok(false, "E21 LibreOffice " + e.message); }
console.log(fails ? fails + " FAILED" : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
