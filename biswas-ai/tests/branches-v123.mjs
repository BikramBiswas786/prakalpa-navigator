// v123 branches: home lists branches, create/open/back, own root (folder import, upload, new folder), breadcrumb starts at the branch,
// AI scoped to the branch, whole-branch zip, rename, delete with confirm. zz-test pendrive only.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v123-live", AI = process.env.AI === "1";
const DL = SH + "/dl"; fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 240000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
const errs = []; p.on("pageerror", e => errs.push(String(e))); let lastDialog = "";
p.on("dialog", d => { lastDialog = d.message(); d.type() === "prompt" ? d.accept(globalThis.PROMPT || d.defaultValue()) : d.accept(); });
const cdp = await b.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(500); }
await p.click("#sec-pendrive"); await sl(500);
await p.type("#pd-c-name", "zz-test-v123-" + Date.now().toString(36)); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(1200);
const vis = s => p.$eval(s, e => !!e.offsetParent).catch(() => false);
const idle = async () => { for (let i = 0; i < 120; i++) { await sl(500); if (!(await p.evaluate(() => pd.textLeft || pd.ups.some(u => !["done", "fail", "skip", "cancel"].includes(u.state))))) break; } await sl(1000); await p.evaluate(() => pdRefresh()); await sl(800); };
ok(await vis("#pd-home") && !(await vis("#pd-work")), "1 opening a pendrive shows the Branches home");
ok(await p.$eval("#pd-home", e => /Main/.test(e.innerText) && e.querySelectorAll(".pd-bcard[data-pd-br]").length === 1), "2 home lists only Main (no preset names)");
// Main: put one file there
await p.click('.pd-bgo[data-pd-br=""]'); await sl(500);
ok(await vis("#pd-work") && await p.$eval("#pd-crumbs", e => /Main/.test(e.innerText)), "3 Main opens, breadcrumb starts at Main");
await (await p.$("#pd-file-in")).uploadFile("/tmp/fx/main.txt"); await sl(600); if (await p.$("#pd-confirm:not([hidden]) [data-pd-sum-go]")) await p.click("[data-pd-sum-go]"); await idle();
await p.click("[data-pd-home]"); await sl(500);
ok(await vis("#pd-home"), "4 ← All branches returns home");
// create branch
await p.click(".pd-home-head [data-pd-br-new]"); await sl(300); await p.type("#pd-br-name", "Land Records"); await shot("01-new-branch"); await p.keyboard.press("Enter"); await sl(1500);
ok(await p.$eval("#pd-home", e => e.querySelectorAll(".pd-bcard[data-pd-br]").length === 2 && /Land Records/.test(e.innerText)), "5 new branch card appears");
await p.click('.pd-bgo[data-pd-br="Land Records"]'); await sl(600);
ok(await p.$eval("#pd-crumbs", e => /Land Records/.test(e.innerText) && !/⎇\s*›|Main/.test(e.innerText)), "6 breadcrumb starts at the branch name");
ok(await p.$$eval("#pd-rows tr", r => !r.some(x => /main\.txt/.test(x.innerText))), "7 branch does not show Main's files");
await (await p.$("#pd-folder-in")).uploadFile("/tmp/fx/brdir"); await p.waitForSelector("#pd-confirm:not([hidden])", { timeout: 20000 }).catch(() => {}); if (await p.$("[data-pd-sum-go]")) await p.click("[data-pd-sum-go]"); await idle();
const paths = await p.evaluate(() => pd.files.map(f => f.path));
ok(paths.includes("⎇/Land Records/brdir/land.txt") && paths.includes("⎇/Land Records/brdir/Sub/note.txt") && paths.includes("main.txt"), "8 folder import lands inside the branch; Main file untouched (" + paths.join(", ") + ")");
await p.evaluate(() => pdCd(pdBrRoot() + "/brdir")); await sl(400); await p.evaluate(() => pdCd(pdBrRoot() + "/brdir/Sub")); await sl(400);
ok(await p.$eval("#pd-crumbs", e => e.innerText.replace(/\s+/g, " ")).then(t => /Land Records.*brdir.*Sub/.test(t)), "9 breadcrumb Land Records › brdir › Sub"); await shot("02-inside-branch");
await p.keyboard.down("Alt"); await p.keyboard.press("ArrowLeft"); await p.keyboard.up("Alt"); await sl(500);
ok(await p.evaluate(() => pd.cwd === pdBrRoot() + "/brdir"), "10 Alt+← goes back a folder");
await p.goBack(); await sl(500); await p.goBack(); await sl(500);
ok(await vis("#pd-home"), "11 browser Back returns to the Branches home"); await p.goForward(); await sl(500);
ok(await p.evaluate(() => pdBranch() === "Land Records" && !pd.home), "12 browser Forward re-opens the branch");
await p.evaluate(() => pdCd(pdBrRoot())); await sl(300);
// new folder inside branch via API path the UI uses
globalThis.PROMPT = "Mutation"; await p.click("#pd-mkdir"); await sl(800); await p.evaluate(() => pdRefresh()); await sl(600);
ok(await p.evaluate(() => pd.folders.includes("⎇/Land Records/Mutation")), "13 New folder is created inside the branch");
ok(await p.$eval("#pd-chips", e => /\(?2 files?\)?|2 file/.test(e.innerText)), "14 AI picker says it will read the 2 branch files");
// whole-branch zip
await p.evaluate(() => { window.PD_DL_MODE = "blob"; }); await p.click("[data-pd-br-zip]"); let z = null; for (let i = 0; i < 180 && !z; i++) { await sl(500); z = fs.readdirSync(DL).find(f => f.endsWith(".zip")); }
if (!z) console.log("  dl box:", await p.evaluate(() => (document.querySelector("#pd-dl")||{}).innerText + " | " + [...document.querySelectorAll(".toast, #toast")].map(x=>x.innerText).join(" ")), fs.readdirSync(DL));
const zb = z ? fs.readFileSync(DL + "/" + z) : Buffer.alloc(0);
ok(zb.slice(0, 2).toString() === "PK" && zb.includes("land.txt") && !zb.includes("main.txt"), `15 whole-branch zip (${z}, ${zb.length} B) has branch files only`);
if (AI) {
  await p.$eval("#pd-q", e => { e.value = ""; }); await p.type("#pd-q", "What is the mutation fee and who owns plot 12?");
  await p.$eval("#pd-ai-form", f => f.requestSubmit()); await p.waitForFunction(() => pd.outs.length && !document.querySelector("#pd-ai-progress")?.textContent, { timeout: 240000, polling: 500 }).catch(() => {}); await sl(3000);
  const used = await p.$eval("#pd-answer", e => e.innerText).catch(() => "");
  ok(/note\.txt|land\.txt/.test(used) && !/main\.txt/.test(used), "16 AI answer uses only this branch's files: " + used.replace(/\s+/g, " ").slice(0, 160));
  await p.evaluate(() => document.querySelector("#pd-out")?.scrollIntoView()); await sl(300); await shot("03-branch-ai");
}
// rename from card menu
await p.click("[data-pd-home]"); await sl(500);
globalThis.PROMPT = "Land"; await p.click('.pd-bcard[data-pd-br="Land Records"] .pd-br-more summary'); await sl(200); await shot("04-card-menu"); await p.click('[data-pd-br-ren="Land Records"]'); await sl(1500);
ok(await p.evaluate(() => pdBranches().join() === "Land" && pd.files.some(f => f.path === "⎇/Land/brdir/land.txt")), "17 rename keeps the files");
await shot("05-home");
await p.click('.pd-bcard[data-pd-br="Land"] .pd-br-more summary'); await sl(200); await p.click('[data-pd-br-del="Land"]'); await sl(1500);
ok(/2 file/.test(lastDialog) && /for good/.test(lastDialog), "18 delete asks a clear confirm: " + lastDialog);
ok(await p.evaluate(() => !pdBranches().length && pd.files.map(f => f.path).join() === "main.txt"), "19 branch deleted, Main file kept");
await p.setViewport({ width: 390, height: 844 }); await sl(500); await shot("06-home-mobile");
ok(!errs.length, "20 no page errors " + errs.join(" | ").slice(0, 200));
await b.close(); console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exitCode = fails ? 1 : 0;
