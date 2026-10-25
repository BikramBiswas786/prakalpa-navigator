// v107: browser can't reach one backend (requests to it fail) → uploads move to another backend.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3997", BLOCK = process.env.BLOCK || "127.0.0.1:9101", MODE = process.env.MODE || "abort";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 900 }); 
let blocked = 0; p.on("requestfailed", r => { if (r.url().includes(BLOCK)) blocked++; }); p.on("xrequest", r => { if (!r.isInterceptResolutionHandled || !p._icpt) return; if (r.url().includes(BLOCK)) { blocked++; if (MODE === "abort") r.abort("connectionrefused"); /* else: never answer (hang) */ } else r.continue(); });
p.on("dialog", d => d.accept()); p.on("requestfailed", r => console.log("  reqfail", r.method(), r.url().slice(0, 90), r.failure()?.errorText)); p.on("console", m => { if (m.type() === "error") console.log("  console", m.text().replace(/\?X-Amz[^ ']*/, "?…")); });
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const sl = ms => new Promise(r => setTimeout(r, ms));
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="bn"]'); if (await p.$eval("#gate", g => !g.hidden)) { await p.type("#gate-name", "Tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(500); }
await p.click("#sec-pendrive"); await sl(400);
await p.type("#pd-c-name", "zz v107 " + Date.now()); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 8000 }).catch(async () => { await p.screenshot({ path: "/tmp/u107.png" }); console.log(await p.$eval("#pd-start-msg", e => e.innerText)); process.exit(1); }); await sl(500);
fs.mkdirSync("/tmp/pd107", { recursive: true }); for (const n of ["a", "b", "c"]) fs.writeFileSync(`/tmp/pd107/${n}.txt`, n.repeat(1000));
const cdp = await p.target().createCDPSession(); await cdp.send("Network.enable"); await cdp.send("Network.setBlockedURLs", { urls: ["*" + BLOCK + "*"] });
const t0 = Date.now();
await (await p.$("#pd-file-in")).uploadFile("/tmp/pd107/a.txt", "/tmp/pd107/b.txt", "/tmp/pd107/c.txt"); await sl(800);
if (await p.$("#pd-confirm:not([hidden]) [data-pd-sum-go]")) await p.click("[data-pd-sum-go]");
for (let i = 0; i < 300; i++) { await sl(500); if (!(await p.evaluate(() => (pd.textLeft || pd.ups.some(u => !["done", "fail", "skip", "cancel"].includes(u.state)))))) break; }
const st = await p.evaluate(() => ({ done: pd.ups.filter(u => u.state === "done").length, avoid: [...pdAvoid] }));
const hosts = await p.evaluate(async () => { const l = await pdApi("list", {}); return Promise.all(l.files.map(async f => new URL((await pdApi("download", { id: f.id, inline: true })).url, location.href).host)); });
ok(blocked > 0, `blocked requests to ${BLOCK}: ${blocked} (${MODE})`);
ok(st.done === 3 && st.avoid.includes(BLOCK) && hosts.length === 3 && hosts.every(h => h !== BLOCK), `3/3 uploaded on other backend(s) ${JSON.stringify(hosts)}, avoid ${JSON.stringify(st.avoid)}, done=${st.done} ${JSON.stringify(await p.evaluate(()=>pd.ups.map(u=>u.state+":"+(u.err||""))))}, ${(Date.now() - t0) / 1000}s`);
await b.close();
