// v113 headless: owner shares a folder → receiver previews/downloads/asks; password; revoke; upload-request link.
import puppeteer from "puppeteer-core"; import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const B = process.env.BASE || "http://localhost:3997", SHOT = process.env.SHOT || "/workspace/v113-shots/s", DL = process.env.DLDIR || "/tmp/v113-dl", SRC = process.env.SRC || "/tmp/fx/share";
fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true }); fs.mkdirSync(path.dirname(SHOT), { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"], protocolTimeout: 90000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
const bad = []; let step = 0; const res = [];
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); res.push([c, m]); if (!c) process.exitCode = 1; };
const page = async () => { const p = await b.newPage(); await p.setViewport({ width: 1360, height: 900 }); const c = await p.target().createCDPSession(); await c.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
  p.on("pageerror", e => bad.push(e.message)); p.on("console", m => { if (m.type() === "error" && !/status of 4\d\d|status of 503/.test(m.text())) bad.push(m.text()); }); p.on("dialog", d => d.accept(d.type() === "prompt" ? d.defaultValue() : undefined)); return p; };
const shot = async (p, n) => { const f = `${SHOT}-${String(++step).padStart(2, "0")}-${n}.png`; await p.screenshot({ path: f }); console.log("  shot", f); };
const waitFile = async (re, ms = 60000) => { for (let i = 0; i < ms / 300; i++) { const f = fs.readdirSync(DL).find(n => re.test(n) && !n.endsWith(".crdownload")); if (f) { await sl(400); return path.join(DL, f); } await sl(300); } return null; };
const p = await page();
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "Tester"); await p.$eval("#gate form, #gate-form", f => f.requestSubmit ? f.requestSubmit() : f.submit()).catch(() => {}); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
const name = process.env.PDNAME || "zz-test-v113-" + Date.now().toString(36);
if (process.env.PDNAME) { await p.type("#pd-o-name", name).catch(() => {}); }
if (!(await p.$("#pd-main:not([hidden])"))) { await p.type("#pd-c-name", name); await p.type("#pd-c-pin", process.env.PDPIN || "482915"); await p.type("#pd-c-pin2", process.env.PDPIN || "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit()); }
await p.waitForSelector("#pd-main", { visible: true }); await sl(800); ok(true, "1 zz-test pendrive " + name);
const idle = async () => { for (let i = 0; i < 300; i++) { await sl(500); if (!(await p.evaluate(() => (pd.textLeft || pd.ups.some(u => !["done", "fail", "skip", "cancel"].includes(u.state)))))) return; } };
await (await p.$("#pd-folder-in")).uploadFile(SRC); await p.waitForSelector("#pd-confirm:not([hidden])", { timeout: 20000 }); await p.click("[data-pd-sum-go]"); await idle(); await sl(1500);
const n0 = await p.evaluate(() => pd.files.length); ok(n0 === 5, `2 uploaded 5 fixture files (${n0})`);
// 3 share the folder with AI on
await p.$$eval("#pd-rows tr", trs => trs.find(t => t.dataset.pdKey === "d:share").querySelector("[data-pd-sel]").click());
await p.click("#pd-share"); await p.waitForSelector("#pd-sharebox:not([hidden])"); await p.type("#pd-sh-title", "Q1 pack"); await p.click("#pd-sh-ai"); await shot(p, "owner-share-form");
await p.click("[data-pd-sh-go]"); await p.waitForSelector("#pd-sh-url"); const url = await p.$eval("#pd-sh-url", e => e.textContent.trim());
ok(/\/s\/[a-f0-9]{32}$/.test(url), "3 share link created " + url.replace(/[a-f0-9]{24}$/, "…")); await shot(p, "owner-link");
// 4 receiver
const r = await page(); await r.goto(url, { waitUntil: "networkidle0" }); await r.waitForSelector("#s-tree", { timeout: 15000 });
const tree = await r.$$eval("#s-tree li[data-path]", ls => ls.map(l => l.dataset.path).sort());
ok(tree.length === 5 && tree.includes("share/Reports/2026/sales.xlsx") && await r.$$eval("#s-tree li.dir", l => l.length) === 3, `4 receiver tree keeps structure (${tree.join(", ")})`);
const robots = await r.$eval('meta[name=robots]', m => m.content); ok(/noindex/.test(robots), "noindex meta"); await shot(r, "receiver-tree");
const pv = async (file, sel, check, label) => { await r.$$eval("#s-tree li[data-path]", (ls, f) => ls.find(l => l.dataset.path.endsWith(f)).querySelector("[data-act=pv]").click(), file);
  try { await r.waitForSelector(sel, { timeout: 20000 }); await sl(1200); const v = await r.$eval(sel, check); ok(!!v, `${label} (${String(v).slice(0, 60)})`); } catch (e) { ok(false, label + " " + e.message.slice(0, 80) + " " + (await r.$eval("#pv", x => x.innerText).catch(() => ""))); } await shot(r, "pv-" + file.replace(/\W+/g, "-")); };
await pv("notes.txt", "#pv-text", e => e.textContent.includes("মার্চে") && e.textContent, "5 text preview");
await pv("report.docx", "#pv-doc", e => e.querySelector("h2") && e.querySelector("h4") && e.querySelector("table") && e.innerText.includes("Kolkata") && e.querySelector("h2").textContent, "6 docx preview with headings + table");
await pv("sales.xlsx", "#pv-sheet", e => e.querySelectorAll("tr").length >= 6 && document.querySelectorAll("#pv-tabs button").length === 2 && e.innerText, "7 xlsx preview, 2 sheet tabs");
await pv("manual.pdf", "#pv-frame", e => e.src.length > 10 && e.src.slice(0, 30), "8 pdf preview iframe");
await pv("photo.jpg", "#pv-img", e => e.complete && e.naturalWidth > 0 && e.naturalWidth, "9 image preview");
// 10 single download
await r.$$eval("#s-tree li[data-path]", ls => ls.find(l => l.dataset.path.endsWith("notes.txt")).querySelector("[data-act=dl]").click());
const f1 = await waitFile(/notes.*\.txt$/); ok(!!f1 && fs.readFileSync(f1, "utf8").includes("মার্চে"), "10 single-file download " + (f1 ? path.basename(f1) : "(none)"));
// 11 ZIP of everything (blob mode headless)
await r.evaluate(() => { window.PD_DL_MODE = "blob"; }); await r.click("#s-zip"); await r.waitForFunction(() => document.querySelector("#s-zipst") && /✅|⚠|wrong/.test(document.querySelector("#s-zipst").innerText), { timeout: 60000 }).catch(() => {});
const zf = await waitFile(/\.zip$/); let zl = "";
try { zl = execSync(`python3 -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(z.testzip() or 'OK'); print(len([n for n in z.namelist() if not n.endswith('/')]))" "${zf}"`).toString().trim(); } catch (e) { zl = "ERR"; }
ok(/^OK\s+5$/.test(zl), `11 ZIP download: ${zf ? path.basename(zf) : "(none)"} ${zl.replace(/\s+/g, " ")}`); await shot(r, "receiver-zip");
// 12 AI box
await r.type("#s-q", "What were the March sales?"); await r.click("#s-aiform button"); await r.waitForFunction(() => { const a = document.querySelector("#s-ans"); return a && a.innerText.length > 20 && !/Searching|খোঁজা/.test(a.innerText); }, { timeout: 90000 }).catch(() => {});
const ai = await r.$eval("#s-ans", e => e.innerText); ok(ai.length > 20 && !/zz-test/.test(ai), "12 AI answer on the share page: " + ai.slice(0, 80).replace(/\s+/g, " ")); await shot(r, "receiver-ai");
// 13 password link: create via owner UI on a single file
await p.bringToFront(); await p.click("[data-pd-sh-close]"); await p.evaluate(() => pdCd("share/Reports")); await sl(800);
await p.$$eval("#pd-rows tr", trs => trs.find(t => t.innerText.includes("manual.pdf")).querySelector("[data-pd-sel]").click());
await p.click("#pd-share"); await p.waitForSelector("#pd-sh-pw"); await p.type("#pd-sh-pw", "tiger-77"); await p.select("#pd-sh-exp", "1d"); await p.click("[data-pd-sh-go]"); await p.waitForSelector("#pd-sh-url");
const url2 = await p.$eval("#pd-sh-url", e => e.textContent.trim());
const r2 = await page(); await r2.goto(url2, { waitUntil: "networkidle0" }); await r2.waitForSelector("#s-pass"); await shot(r2, "receiver-password");
await r2.bringToFront(); await r2.type("#s-pass", "wrong"); await r2.click("#s-pw button"); await r2.waitForSelector("#s-msg"); const m1 = await r2.$eval("#s-msg", e => e.innerText);
await r2.type("#s-pass", "tiger-77"); await r2.click("#s-pw button"); await r2.waitForSelector("#s-tree", { timeout: 15000 }).catch(() => {});
const one = await r2.$$eval("#s-tree li[data-path]", ls => ls.map(l => l.dataset.path)).catch(() => []);
ok(/4/.test(m1) && one.length === 1 && one[0] === "manual.pdf", `13 password link: wrong → "${m1}", right → ${one}`); await shot(r2, "receiver-password-ok");
// 14 owner links panel + revoke the password link
await p.bringToFront(); await p.click("#pd-links"); await p.waitForSelector("#pd-sh-table"); await p.$$eval("#pd-sh-table details", d => d.forEach(x => { x.open = true; })); const rows = await p.$$eval("#pd-sh-table .pd-sh-item", t => t.length); await shot(p, "owner-links");
const firstEv = await p.$eval("#pd-sh-table", t => t.innerText);
ok(rows === 2 && /Downloaded/.test(firstEv), `14 links panel: ${rows} links, activity shows Downloaded`);
const sid2 = url2.split("/").pop(); await p.click(`[data-pd-sh-revoke="${sid2}"]`); await sl(1200);
await r2.bringToFront(); await r2.reload({ waitUntil: "networkidle0" }); await r2.waitForSelector("#s-msg"); const m2 = await r2.$eval("#s-msg", e => e.innerText);
ok(/turned off|বন্ধ/.test(m2), `15 revoked link shows: ${m2}`); await shot(r2, "receiver-revoked");
// 16 upload-request link
await p.bringToFront(); await p.click("[data-pd-sh-close]").catch(() => {}); await p.click("#pd-request"); await p.waitForSelector("#pd-sh-folder"); await p.$eval("#pd-sh-folder", e => { e.value = "Received"; }); await p.click("[data-pd-sh-go]"); await p.waitForSelector("#pd-sh-url");
const url3 = await p.$eval("#pd-sh-url", e => e.textContent.trim());
const r3 = await page(); await r3.goto(url3, { waitUntil: "networkidle0" }); await r3.waitForSelector("#s-file"); await shot(r3, "receiver-upload");
fs.writeFileSync("/tmp/v113-big.bin", Buffer.alloc(17 * 1024 * 1024, 7)); fs.writeFileSync("/tmp/v113-hello.txt", "hello from a client");
await r3.bringToFront(); await (await r3.$("#s-file")).uploadFile("/tmp/v113-hello.txt", "/tmp/v113-big.bin");
await r3.waitForFunction(() => document.querySelectorAll("#s-ups .row[data-done]").length === 2 || document.querySelector("#s-ups .row[data-err]"), { timeout: 120000 }).catch(() => {});
const done = await r3.$$eval("#s-ups .row", rs => rs.map(x => x.dataset.done || ("ERR " + x.dataset.err))); await shot(r3, "receiver-uploaded");
await p.bringToFront(); const inbox = await p.evaluate(async () => (await pdApi("list", {})).files.filter(f => f.path.startsWith("Received/")).map(f => f.path + ":" + f.size).sort());
ok(done.length === 2 && done.every(d => !/^ERR/.test(d)) && inbox.length === 2 && inbox.some(x => x === "Received/v113-big.bin:" + 17 * 1024 * 1024), `16 upload-request: ${done} → ${inbox}`);
await p.click("#pd-links"); await p.waitForSelector("#pd-sh-table"); await p.$$eval("#pd-sh-table details", d => d.forEach(x => { x.open = true; })); await sl(400); const ev3 = await p.$eval("#pd-sh-table", t => t.innerText); ok(/2 files received/.test(ev3) && /Uploaded/.test(ev3), "17 owner sees received files + Uploaded events"); await shot(p, "owner-links-final");
ok(bad.length === 0, `18 no page/console errors (${bad.slice(0, 3).join(" | ")})`);
console.log(`${res.filter(x => x[0]).length}/${res.length} passed`);
await b.close();
