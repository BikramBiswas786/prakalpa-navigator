// AI Pendrive full-width layout: no sidebar in the pendrive section, name + pendrive info + Change PIN in the header, ☰ opens sections.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-fullwidth-live", TAG = process.env.TAG || "after", CHECK = process.env.CHECK !== "0";
fs.mkdirSync(SH, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { if (!CHECK) return; console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
const errs = []; p.on("pageerror", e => errs.push(String(e)));
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "Bikram Biswas"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-office"); await sl(400); await p.screenshot({ path: `${SH}/${TAG}-office-1366.png` });
ok(await p.$eval("#rail", e => e.getBoundingClientRect().left >= 0 && e.offsetWidth > 200), "F1 other sections keep the sidebar");
await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-fw-" + Date.now().toString(36), PIN = "482915", PIN2 = "739204";
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", PIN); await p.type("#pd-c-pin2", PIN); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(1200);
await p.screenshot({ path: `${SH}/${TAG}-pendrive-1366.png` });
ok(await p.$eval("#rail", e => e.getBoundingClientRect().right <= 0), "F2 sidebar hidden in AI Pendrive");
const ww = await p.$eval("#pd-main", e => e.getBoundingClientRect().width); ok(ww > 1250, "F3 pendrive content uses full width: " + Math.round(ww) + "px");
ok(await p.$eval("header.top", h => { const t = h.querySelector("#pd-top-real"); return !!t && !t.hidden && t.offsetWidth > 0 && h.querySelector("#pd-name").textContent.length > 3 && !!h.querySelector("#pd-bar") && !!h.querySelector("#pd-close"); }), "F4 pendrive name, usage bar, Close in the header");
ok(await p.$eval("#hdr-who-name", e => e.textContent === "Bikram Biswas" && e.offsetWidth > 0) && await p.$eval("#hdr-switch-user", e => e.offsetWidth > 0), "F5 user name + Change name in the header");
ok(await p.$eval("header.top", h => h.getBoundingClientRect().height < 110), "F6 header stays compact: " + await p.$eval("header.top", h => Math.round(h.getBoundingClientRect().height)));
await p.click("#nav-open"); await sl(300); ok(await p.$eval("#rail", e => e.getBoundingClientRect().left >= 0), "F7 ☰ opens the sections drawer"); await p.screenshot({ path: `${SH}/${TAG}-pendrive-drawer.png` });
await p.click("#scrim").catch(() => {}); await sl(300); ok(await p.$eval("#rail", e => e.getBoundingClientRect().right <= 0), "F8 drawer closes");
await p.click("#ed-tab-word"); await sl(600); await p.screenshot({ path: `${SH}/${TAG}-word-1366.png` });
ok(await p.$eval("#ed-word", e => e.getBoundingClientRect().width) > 1250, "F9 Word editor full width");
await p.click("#ed-tab-files"); await sl(300);
await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await sl(200); await p.screenshot({ path: `${SH}/${TAG}-pendrive-dark.png` }); await p.evaluate(() => document.documentElement.removeAttribute("data-theme"));
/* Change PIN */
if (CHECK) {
  await p.click("#pd-chpin"); await p.waitForSelector("#pd-pin-dlg[open]"); await p.type("#pp-old", "111111"); await p.type("#pp-new", PIN2); await p.type("#pp-new2", PIN2); await p.click("#pp-go"); await sl(1500);
  ok(/wrong/i.test(await p.$eval("#pp-msg", e => e.textContent)), "F10 wrong current PIN refused: " + await p.$eval("#pp-msg", e => e.textContent));
  await p.$eval("#pp-old", e => e.value = ""); await p.type("#pp-old", PIN); await p.screenshot({ path: `${SH}/${TAG}-change-pin.png` }); await p.click("#pp-go"); await sl(2000);
  ok(!(await p.$("#pd-pin-dlg")), "F11 PIN changed");
  await p.click("#pd-close"); await sl(800);
  await p.evaluate(() => { const f = document.querySelector("#pd-open-form") || document.querySelector("form[id*=open]"); return !!f; });
  const openWith = async pin => { if (await p.$eval("#pd-main", e => !e.hidden)) { await p.click("#pd-close"); await sl(800); } await p.$eval("#pd-o-name", (e, n) => e.value = n, name); await p.$eval("#pd-o-pin", (e, v) => e.value = v, pin); await p.$eval("#pd-open-form", f => f.requestSubmit()); await sl(2500); const r = await p.$eval("#pd-main", e => !e.hidden); console.log("  open with " + (pin === PIN ? "old" : "new") + " PIN → " + (r ? "opened" : await p.$eval("#pd-start-msg", e => e.textContent))); return r; };
  ok(!(await openWith(PIN)), "F12 old PIN no longer opens"); ok(await openWith(PIN2), "F13 new PIN opens");
}
/* mobile */
await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await sl(800);
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "Bikram Biswas"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
if (await p.$eval("#pd-main", e => e.hidden)) { await p.evaluate(() => document.getElementById("sec-pendrive").click()); await sl(500); if (CHECK) { await p.$eval("#pd-o-name", (e, n) => e.value = n, name); await p.$eval("#pd-o-pin", (e, v) => e.value = v, PIN2); await p.$eval("#pd-open-form", f => f.requestSubmit()); await sl(2500); } } await p.screenshot({ path: `${SH}/${TAG}-pendrive-mobile.png` });
ok(await p.$eval("#pd-main", e => e.getBoundingClientRect().width) > 340 && await p.$eval("#rail", e => e.getBoundingClientRect().right <= 0), "F14 mobile: full width, no sidebar");
ok(await p.evaluate(() => document.documentElement.scrollWidth <= 392), "F15 mobile: no sideways scroll (" + await p.evaluate(() => document.documentElement.scrollWidth) + ")");
await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await sl(200); await p.screenshot({ path: `${SH}/${TAG}-pendrive-mobile-dark.png` });
ok(!errs.length, "F16 no page errors " + errs.join(" | "));
console.log(fails ? fails + " FAILED" : "ALL PASS"); await b.close(); process.exit(fails ? 1 : 0);
