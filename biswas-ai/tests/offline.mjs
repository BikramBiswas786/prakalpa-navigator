// Pendrive always opens: every bucket refuses (local: fault 403 on all buckets; live: ADMIN_TOKEN offline flag on a zz-test pendrive).
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3997", AT = process.env.ADMIN_TOKEN || "test-admin", PIN = process.env.PIN || "482915";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const sl = ms => new Promise(r => setTimeout(r, ms)); let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 }); let perr = 0; p.on("pageerror", e => { perr++; console.log("PAGEERR", String(e)); });
p.on("dialog", d => d.accept());
const admin = async q => { const r = await fetch(B + "/api/admin/meta?" + q, { headers: { "x-admin-token": AT } }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate form", f => f.requestSubmit()).catch(() => {}); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
const NAME = process.env.PD || "zz-test-off-" + Date.now().toString(36);
if (process.env.PD) { await p.type("#pd-o-name", NAME); await p.type("#pd-o-pin", PIN); await p.$eval("#pd-open-form", f => f.requestSubmit()); }
else { await p.type("#pd-c-name", NAME); await p.type("#pd-c-pin", PIN); await p.type("#pd-c-pin2", PIN); await p.$eval("#pd-create-form", f => f.requestSubmit()); }
await p.waitForSelector("#pd-main", { visible: true, timeout: 30000 }); await sl(1500);
const tag = "OFF" + Date.now().toString(36);
// a file that is in storage and was viewed on this device
await p.evaluate(t => pdQueue([{ file: new File([t + " hello"], t + "-seen.txt", { type: "text/plain" }), path: t + "-seen.txt", text: t + " hello" }]), tag);
await p.waitForFunction(t => (pd.files || []).some(f => f.path === t + "-seen.txt"), { timeout: 90000 }, tag).catch(() => {});
await p.evaluate(() => pdRefresh()); await sl(500);
const seen = await p.evaluate(async t => { const f = pd.files.find(x => x.path === t + "-seen.txt"); return new TextDecoder().decode(await BA_ED.io.fetchFile(f)); }, tag).catch(e => "ERR " + e.message);
ok(seen.includes("hello"), "file viewed while storage is up");
// re-open normally so this device holds a ticket
await p.click("#pd-close"); await sl(600); await p.type("#pd-o-name", NAME); await p.type("#pd-o-pin", PIN); await p.$eval("#pd-open-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 30000 }); await sl(1500);
ok(await p.evaluate(n => !!PDO.ticket(n), NAME), "browser holds a signed open ticket");
// storage down
if (process.env.FAULT) { const st = await admin("do=status"); const names = (st.j.replicas || st.j.buckets || []).map(x => x.name || x); for (const n of (names.length ? names : ["filebase", "tigris", "b2", "coritan", "s3"])) await admin(`do=fault&b=${n}&code=403`); console.log("faulted", names.join(",")); }
else { const r = await admin(`do=offline&pd=${encodeURIComponent(NAME)}&on=1`); ok(r.s === 200, "offline test flag set (" + r.s + ")"); }
await p.click("#pd-close"); await sl(600);
// wrong PIN still refused
await p.type("#pd-o-name", NAME); await p.type("#pd-o-pin", "111999"); await p.$eval("#pd-open-form", f => f.requestSubmit()); await sl(3000);
ok(await p.$eval("#pd-main", m => m.hidden), "wrong PIN refused while storage is down");
await p.$eval("#pd-o-name", e => e.value = ""); await p.$eval("#pd-o-pin", e => e.value = "");
const t0 = Date.now(); await p.type("#pd-o-name", NAME); await p.type("#pd-o-pin", PIN); await p.$eval("#pd-open-form", f => f.requestSubmit());
const opened = await p.waitForSelector("#pd-main", { visible: true, timeout: 30000 }).then(() => true, () => false); await sl(2500);
ok(opened, `pendrive opens with every bucket down (${Date.now() - t0} ms)`);
const ban = await p.$eval("#pd-limited", e => e.textContent).catch(() => "");
ok(/Storage is resting, your files are safe/.test(ban), "banner: " + ban.slice(0, 90));
ok(await p.evaluate(t => (pd.files || []).some(f => f.path === t + "-seen.txt"), tag), "last saved list shown");
const seen2 = await p.evaluate(async t => { const f = pd.files.find(x => x.path === t + "-seen.txt"); return new TextDecoder().decode(await BA_ED.io.fetchFile(f)); }, tag).catch(e => "ERR " + e.message);
ok(seen2.includes("hello"), "viewed file opens from this device");
const ea = await p.evaluate(async () => { try { await pdApi("ed-ai", {}); return "200"; } catch (e) { return String(e.status); } });
ok(ea !== "503", "Office AI endpoint still answers (" + ea + ")");
const chat = await p.evaluate(async () => (await fetch("/healthz")).status); ok(chat === 200, "app healthy");
// new work while down
await p.evaluate(t => pdQueue([{ file: new File([t + " up"], t + "-up.txt", { type: "text/plain" }), path: t + "-up.txt", text: t + " up" }]), tag);
const np = await p.evaluate(async t => { const r = await BA_ED.io.upload(t + "-note.txt", new Blob([t + " note"], { type: "text/plain" })); return r && r.queued; }, tag).catch(e => "ERR " + e.message);
ok(np === true, "editor save kept on this device");
await sl(1500); const ban2 = await p.$eval("#pd-limited", e => e.textContent).catch(() => "");
ok(/2 waiting to sync/.test(ban2), "badge: " + ban2.slice(-20));
ok(!(await p.evaluate(() => document.body.innerText)).match(/Internal Server Error|Something went wrong/), "no error page");
// storage back
if (process.env.FAULT) { for (const n of ["filebase", "tigris", "b2", "coritan", "s3"]) await admin(`do=fault&b=${n}&code=0`); } else await admin(`do=offline&pd=${encodeURIComponent(NAME)}&on=0`);
const synced = await p.waitForFunction(t => !document.getElementById("pd-limited") && ["-up.txt", "-note.txt"].every(s => (pd.files || []).some(f => f.path === t + s)), { timeout: 150000, polling: 1000 }, tag).then(() => true, () => false);
ok(synced, "back online: banner gone, both waiting files synced");
ok(perr === 0, "no page errors"); console.log(fails ? fails + " FAILED" : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
