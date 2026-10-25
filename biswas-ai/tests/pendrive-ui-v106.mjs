// v106 end-to-end: upload, sha256, file + folder ZIP download, navigation, AI scope, output panel, exports, save to pendrive.
import puppeteer from "puppeteer-core"; import fs from "node:fs"; import crypto from "node:crypto"; import { execSync } from "node:child_process"; import path from "node:path";
const B = process.env.BASE || "http://localhost:3997", SHOT = process.env.SHOT || "/workspace/pd-v106", DL = process.env.DLDIR || "/tmp/pd106-dl", SRC = "/tmp/pd106";
fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 950 });
const cdp = await p.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
const bad = []; p.on("pageerror", e => bad.push(e.message)); p.on("console", m => { if (m.type() === "error") bad.push(m.text()); });
p.on("dialog", d => d.accept(d.type() === "prompt" ? d.defaultValue() : undefined));
const res = []; let step = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); res.push([c, m]); if (!c) process.exitCode = 1; };
const shot = async n => { const f = `${SHOT}-${String(++step).padStart(2, "0")}-${n}.png`; await p.screenshot({ path: f }); console.log("  shot", f); };
const sl = ms => new Promise(r => setTimeout(r, ms));
const sha = buf => crypto.createHash("sha256").update(buf).digest("hex");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const waitFile = async (re, ms = 60000) => { for (let i = 0; i < ms / 300; i++) { const f = fs.readdirSync(DL).find(n => re.test(n) && !n.endsWith(".crdownload")); if (f) { await sl(300); return path.join(DL, f); } await sl(300); } return null; };
const gate = async () => { for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="bn"]'); if (await p.$eval("#gate", g => !g.hidden)) { await p.type("#gate-name", "Tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(500); } };
await p.goto(B + "/", { waitUntil: "networkidle0" }); await gate(); await p.click("#sec-pendrive"); await sl(500);
// 1 create
const name = process.env.PDNAME || "zz-test-v106-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true }); await sl(800); ok(true, "1 create zz-test pendrive " + name); await shot("created");
// 2 upload folder + loose files
const idle = async () => { for (let i = 0; i < 240; i++) { await sl(500); if (!(await p.evaluate(() => (pd.textLeft || pd.ups.some(u => !["done", "fail", "skip", "cancel"].includes(u.state)))))) return; } };
await (await p.$("#pd-folder-in")).uploadFile(SRC + "/অফিস");
await p.waitForSelector("#pd-confirm:not([hidden])", { timeout: 20000 }); await shot("folder-summary"); await p.click("[data-pd-sum-go]"); await idle();
await (await p.$("#pd-file-in")).uploadFile(SRC + "/loose/notice.txt", SRC + "/loose/photo.jpg"); await sl(800);
if (await p.$("#pd-confirm:not([hidden]) [data-pd-sum-go]")) await p.click("[data-pd-sum-go]"); await idle(); await sl(1200);
const local = Object.fromEntries([...walk(SRC + "/অফিস").map(f => ["অফিস/" + path.relative(SRC + "/অফিস", f), f]), ["notice.txt", SRC + "/loose/notice.txt"], ["photo.jpg", SRC + "/loose/photo.jpg"]]);
const server = await p.evaluate(async () => { const l = await pdApi("list", {}); const o = {}; for (const f of l.files) { const { url } = await pdApi("download", { id: f.id, inline: true }); o[f.path] = new URL(url, location.href).href; } return o; });
let hashOk = 0; for (const [rel, f] of Object.entries(local)) { const r = await fetch(server[rel] || "about:blank").catch(() => null); if (r && r.ok && sha(Buffer.from(await r.arrayBuffer())) === sha(fs.readFileSync(f))) hashOk++; else console.log("   mismatch", rel); }
ok(hashOk === Object.keys(local).length && Object.keys(server).length === hashOk, `2 upload nested folder + files: ${hashOk}/${Object.keys(local).length} sha256 match`); await shot("uploaded");
// 3 single file download (row ⬇)
await p.$$eval("#pd-rows tr", trs => trs.find(t => t.innerText.includes("notice.txt")).querySelector("[data-pd-dlrow]").click());
const f1 = await waitFile(/notice.*\.txt$/); ok(!!f1 && sha(fs.readFileSync(f1)) === sha(fs.readFileSync(local["notice.txt"])), "3 single-file download via row ⬇: sha256 match " + (f1 ? path.basename(f1) : "(none)")); await shot("file-download");
// 4 folder ZIP (row ⬇) — service-worker stream; then blob mode for a subfolder
const zipCheck = async (zf, prefix, label) => {
  const out = DL + "/x-" + label; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
  let good = 0, want = 0, test = "";
  try { test = execSync(`python3 -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(z.testzip() or 'OK'); z.extractall(sys.argv[2])" "${zf}" "${out}"`).toString().trim(); } catch (e) { test = "ERR " + e.message.slice(0, 200); }
  for (const [rel, f] of Object.entries(local)) { if (!rel.startsWith(prefix)) continue; want++; const g = path.join(out, rel.slice(prefix.length - pdBase(prefix).length - 1 < 0 ? 0 : 0)); }
  const got = fs.existsSync(out) ? walk(out).map(f => path.relative(out, f)) : [];
  for (const [rel, f] of Object.entries(local)) if (rel.startsWith(prefix)) { const r = rel.slice(prefix.lastIndexOf("/", prefix.length - 2) + 1); if (got.includes(r) && sha(fs.readFileSync(path.join(out, r))) === sha(fs.readFileSync(f))) good++; }
  return { test, good, want, got };
};
function pdBase(x) { return x; }
await p.evaluate(() => { window.PD_DL_MODE = "sw"; });
await p.$$eval("#pd-rows tr", trs => trs.find(t => t.innerText.includes("অফিস")).querySelector("[data-pd-dlrow]").click()); await sl(700); await shot("zip-progress");
const z1 = await waitFile(/\.zip$/, 90000);
const c1 = z1 ? await zipCheck(z1, "অফিস/", "sw") : { test: "no file" };
ok(c1.test === "OK" && c1.good === c1.want && c1.want === 7 && c1.got.every(g => g.startsWith("অফিস/")), `4a folder ZIP (service-worker stream) ${z1 ? path.basename(z1) : ""}: testzip ${c1.test}, ${c1.good}/${c1.want} sha256, structure ${JSON.stringify(c1.got && c1.got.sort())}`);
const empty = c1.test === "OK" ? fs.existsSync(DL + "/x-sw/অফিস/Cases/old") : false; ok(empty, "4b subfolder structure kept (অফিস/Cases/old/)");
await shot("zip-done");
// multi-select ZIP (checkboxes) in blob mode
await p.evaluate(() => { window.PD_DL_MODE = "blob"; });
for (const n of ["অফিস", "notice.txt"]) await p.$$eval("#pd-rows tr", (trs, n) => trs.find(t => t.innerText.includes(n)).querySelector("[data-pd-sel]").click(), n);
fs.readdirSync(DL).filter(n => n.endsWith(".zip")).forEach(n => fs.renameSync(path.join(DL, n), path.join(DL, "old-" + n + ".bak")));
await p.click("#pd-download"); const z2 = await waitFile(/\.zip$/, 90000);
let ok2 = false; if (z2) { const out = DL + "/x-multi"; fs.mkdirSync(out, { recursive: true }); try { execSync(`python3 -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])" "${z2}" "${out}"`); ok2 = sha(fs.readFileSync(out + "/notice.txt")) === sha(fs.readFileSync(local["notice.txt"])) && sha(fs.readFileSync(out + "/অফিস/Cases/scan.bin")) === sha(fs.readFileSync(local["অফিস/Cases/scan.bin"])); } catch (e) { console.log(e.message.slice(0, 200)); } }
ok(ok2, "4c 'Download selected' (folder + file, Blob mode) → one ZIP, sha256 match " + (z2 ? path.basename(z2) : "")); await shot("multi-zip");
await p.evaluate(() => { pd.sel.clear(); renderPdList(); });
// right-click menu
await p.$$eval("#pd-rows tr", trs => { const t = trs.find(t => t.innerText.includes("অফিস")); t.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 400, clientY: 400 })); });
await sl(300); const menu = await p.$eval("#pd-menu", m => m.innerText).catch(() => ""); ok(/ZIP/.test(menu), "4d right-click menu: " + menu.replace(/\s+/g, " ")); await shot("context-menu"); await p.keyboard.press("Escape");
// 5 navigation
const cwd = () => p.evaluate(() => pd.cwd); const cd = async n => { await p.$$eval("#pd-rows [data-pd-cd]", (bs, n) => bs.find(b => b.textContent.includes(n)).click(), n); await sl(400); };
await cd("অফিস"); await cd("Accounts"); await cd("২০২৫"); const c0 = await cwd(); await shot("nested");
await p.$$eval("#pd-crumbs button", bs => bs.find(b => b.textContent.includes("Accounts")).click()); await sl(300); const c1n = await cwd();
await p.click("#pd-up"); await sl(300); const c2 = await cwd(); await p.goBack(); await sl(500); const c3 = await cwd(); await p.goBack(); await sl(500); const c4 = await cwd();
ok(c0 === "অফিস/Accounts/২০২৫" && c1n === "অফিস/Accounts" && c2 === "অফিস" && c3 === "অফিস/Accounts" && c4 === "অফিস/Accounts/২০২৫", `5 nav: ${c0} → crumb ${c1n} → Up ${c2} → Back ${c3} → Back ${c4}`);
await p.evaluate(() => pdCd("")); await sl(400); await shot("root");
// 6 AI on folder + file
await p.$$eval("[data-pd-ai]", bs => bs.find(b => b.closest("tr").innerText.includes("অফিস")).click()); await sl(200);
await p.$$eval("[data-pd-ai]", bs => bs.find(b => b.closest("tr").innerText.includes("notice.txt")).click()); await sl(200);
const chips = await p.$eval("#pd-chips", e => e.innerText.replace(/\s+/g, " ")); ok(/অফিস/.test(chips) && /notice/.test(chips), "6a chips: " + chips); await shot("ai-selected");
await p.$eval("#pd-q", e => { e.value = ""; }); await p.type("#pd-q", process.env.Q || "সব ফাইলের সারসংক্ষেপ একটা টেবিল করে দিন (summary table)"); await p.click("#pd-ask");
await p.waitForFunction(() => pd.outs.length && document.querySelector("#pd-out-doc table, #pd-out-doc p"), { timeout: 120000 }); await sl(500);
const outInfo = await p.evaluate(() => ({ html: document.querySelector("#pd-out-doc").innerText, table: !!document.querySelector("#pd-out-doc table"), used: [...document.querySelectorAll("#pd-out-doc .pd-used")].map(e => e.innerText).join(" ") }));
const usedPaths = [...outInfo.used.matchAll(/📄 ([^·\n]+)/g)].map(m => m[1].trim());
ok(outInfo.table, "6b output panel shows a formatted table: " + outInfo.html.replace(/\s+/g, " ").slice(0, 140));
ok(usedPaths.length > 0 && usedPaths.every(x => x.startsWith("অফিস/") || x === "notice.txt"), "6c AI used only selected files: " + usedPaths.join(", ")); await shot("output-panel");
const bnWord = (outInfo.html.match(/[\u0980-\u09FF]{3,}/) || [""])[0];
// 7 exports
for (const n of fs.readdirSync(DL)) if (/^ai-output/.test(n)) fs.rmSync(path.join(DL, n));
await p.click('[data-pd-out="docx"]'); const dx = await waitFile(/^ai-output.*\.docx$/);
let dxOk = false, dxInfo = ""; if (dx) { try { const xml = execSync(`python3 -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(z.read('word/document.xml').decode())" "${dx}"`).toString(); dxOk = xml.includes(bnWord) && /<w:tbl>/.test(xml); dxInfo = `document.xml ${xml.length} chars, table ${/<w:tbl>/.test(xml)}, has "${bnWord}" ${xml.includes(bnWord)}`; fs.copyFileSync(dx, "/workspace/pd-v106-sample.docx"); } catch (e) { dxInfo = e.message.slice(0, 200); } }
ok(dxOk, "7a Word export valid: " + dxInfo);
const csvF = (await p.click('[data-pd-out="csv"]'), await waitFile(/^ai-output.*\.csv$/)); const csv = csvF ? fs.readFileSync(csvF, "utf8") : ""; ok(csv.startsWith("\ufeff") && /[\u0980-\u09FF]/.test(csv) && csv.includes(","), "7b CSV export: BOM + Bengali header: " + csv.slice(1, 60).replace(/\r?\n/g, " ⏎ "));
const txtF = (await p.click('[data-pd-out="txt"]'), await waitFile(/^ai-output.*\.txt$/)); const txt = txtF ? fs.readFileSync(txtF, "utf8") : ""; ok(txt.includes(bnWord), `7c TXT export contains "${bnWord}" (${txt.length} chars)`);
// PDF: capture the print document the PDF button builds, render it as Chrome's print would
const srcdoc = await p.evaluate(() => new Promise(r => { const orig = document.body.append.bind(document.body); document.body.append = n => { if (n.tagName === "IFRAME" && n.srcdoc) { document.body.append = orig; r(n.srcdoc); return; } orig(n); }; document.querySelector('[data-pd-out="pdf"]').click(); }));
const pp = await b.newPage(); await pp.setContent(srcdoc, { waitUntil: "networkidle0" }); await pp.evaluate(() => document.fonts.ready); await pp.pdf({ path: "/workspace/pd-v106-sample.pdf", format: "A4" }); await pp.close();
let pdfTxt = ""; try { pdfTxt = execSync("pdftotext /workspace/pd-v106-sample.pdf -").toString(); } catch (e) { pdfTxt = "ERR"; }
const pdfFonts = execSync("pdffonts /workspace/pd-v106-sample.pdf || true").toString();
ok(/Bengali/i.test(pdfFonts) && /[\u0980-\u09FF]/.test(pdfTxt) && pdfTxt.includes(bnWord), "7d PDF (print stylesheet) has Bengali font + text: fonts " + (pdfFonts.match(/\S*Bengali\S*/g) || []).slice(0, 2).join(",") + " · text " + pdfTxt.replace(/\s+/g, " ").slice(0, 90));
await shot("exports");
// 8 save to pendrive
const before = await p.evaluate(() => pd.files.length);
await p.click('[data-pd-out="save"]'); await sl(1000); await idle(); await sl(1500); await p.evaluate(() => pdRefresh()); await sl(1000);
const saved = await p.evaluate(() => pd.files.filter(f => /ai-output-.*\.docx$/.test(f.path)).map(f => f.path));
ok(saved.length === 1 && (await p.evaluate(() => pd.files.length)) === before + 1, "8 save to pendrive → " + saved.join(", ")); await shot("saved");
// 390 px
await p.setViewport({ width: 390, height: 844 }); await sl(500);
ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && await p.$eval("#pd-rows [data-pd-dlrow]", e => e.getBoundingClientRect().width > 20), "9 390px: no sideways scroll, ⬇ visible"); await shot("mobile");
await p.evaluate(() => document.querySelector("#pd-out").scrollIntoView()); await sl(300); await shot("mobile-output");
await p.setViewport({ width: 1440, height: 950 });
ok(!bad.filter(x => !/favicon/.test(x)).length, "10 no page errors " + bad.join(" | ").slice(0, 300));
if (process.env.CLEAN !== "0") await p.evaluate(async () => { const f = (await pdApi("list", {})).files; await pdApi("delete", { confirm: true, ids: f.map(x => x.id), folders: pd.folders }); });
console.log(`RESULT ${res.filter(r => r[0]).length}/${res.length}`);
await b.close();
