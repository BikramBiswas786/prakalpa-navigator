// Drafting Image (stage 3): Ctrl+V screenshot paste, Paint tools, layers, filters, background removal, PNG alpha round trip.
import puppeteer from "puppeteer-core"; import fs from "node:fs";
const B = process.env.BASE || "http://localhost:3998", SH = process.env.SH || "/workspace/v-editors2-live";
fs.mkdirSync(SH, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"], protocolTimeout: 240000 });
const sl = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
await b.defaultBrowserContext().overridePermissions(B, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
const p = await b.newPage(); await p.setViewport({ width: 1366, height: 768 });
const errs = []; p.on("pageerror", e => errs.push(String(e)));
let PROMPT = null; p.on("dialog", d => { d.type() === "prompt" ? d.accept(PROMPT ?? d.defaultValue()) : d.accept(); });
const shot = n => p.screenshot({ path: `${SH}/${n}.png` });
await p.goto(B + "/", { waitUntil: "networkidle0" });
for (let i = 0; i < 2; i++) { if (await p.$eval("#langpick", d => d.open).catch(() => false)) await p.click('[data-pick-lang="en"]'); if (await p.$eval("#gate", g => !g.hidden).catch(() => false)) { await p.type("#gate-name", "zz tester"); await p.$eval("#gate-form", f => f.requestSubmit()); } await sl(400); }
await p.click("#sec-pendrive"); await sl(500);
const name = "zz-test-im-" + Date.now().toString(36);
await p.type("#pd-c-name", name); await p.type("#pd-c-pin", "482915"); await p.type("#pd-c-pin2", "482915"); await p.$eval("#pd-create-form", f => f.requestSubmit());
await p.waitForSelector("#pd-main", { visible: true, timeout: 20000 }); await sl(800);
await p.click("#ed-tab-image"); await sl(600);
const A = "BA_ED.kinds.image._api()";
const api = f => p.evaluate(new Function("return (" + f + ")(" + A + ")")); // eslint-disable-line no-new-func
const px = (x, y) => p.evaluate((x, y) => [...BA_ED.kinds.image._api().flat().getContext("2d").getImageData(x, y, 1, 1).data], x, y);
const tool = async t => { await p.click("#im-t-" + t); await sl(80); };
const color = async (id, v) => { await p.$eval(id, (e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }, v); };
const pt = async (x, y) => p.evaluate((x, y) => { const c = document.getElementById("im-cv"), r = c.getBoundingClientRect(), a = BA_ED.kinds.image._api(); return [r.left + x * r.width / a.W, r.top + y * r.height / a.H]; }, x, y);
const drag = async (x1, y1, x2, y2) => { const [a, bb] = await pt(x1, y1), [c, d] = await pt(x2, y2); await p.mouse.move(a, bb); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(a + (c - a) * i / 8, bb + (d - bb) * i / 8); await p.mouse.up(); await sl(120); };
const clickAt = async (x, y) => { const [a, bb] = await pt(x, y); await p.mouse.click(a, bb); await sl(150); };
const fresh = () => p.evaluate(() => { BA_ED.kinds.image.blank(); const s = BA_ED.st.image; s.file = null; s.dirty = false; });
const near = (a, e, t = 40) => e.every((v, i) => Math.abs(a[i] - v) <= t);

/* P1–P3 synthetic Ctrl+V of a Print Screen on a fresh canvas */
await fresh();
const pasteEvt = (w, h, col) => p.evaluate(async (w, h, col) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = "#000"; g.fillRect(10, 10, 20, 20);
  const blob = await new Promise(r => c.toBlob(r, "image/png")); const dt = new DataTransfer(); dt.items.add(new File([blob], "image.png", { type: "image/png" }));
  document.body.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); }, w, h, col);
await pasteEvt(640, 360, "#ff0000"); await sl(800);
let st = await api(a => ({ W: a.W, H: a.H, n: a.layers().length, name: BA_ED.st.image.name }));
ok(st.W === 640 && st.H === 360 && st.n === 1, "P1 Ctrl+V screenshot became the picture 640×360: " + JSON.stringify(st));
ok(/^screenshot-\d{8}-\d{4}\.png$/.test(st.name), "P2 suggested name " + st.name);
ok(near(await px(300, 200), [255, 0, 0, 255]) && near(await px(15, 15), [0, 0, 0, 255]), "P3 pasted pixels are right");
await shot("i01-pasted-screenshot");
await p.click("#ed-image [data-ed=saveas]"); await p.waitForSelector("dialog.ed-pick[open] #ed-pk-name");
const sug = await p.$eval("#ed-pk-name", e => e.value); ok(sug === st.name, "P4 Save as suggests " + sug);
await p.click("#ed-pk-go"); await p.waitForFunction(() => /^Saved|Could not/.test(BA_ED.st.image.msg.textContent), { timeout: 60000 });
ok(await p.evaluate(n => pd.files.some(f => f.path.endsWith(n)), sug), "P5 screenshot saved to the pendrive as " + sug);

/* P6–P8 paste on an existing picture → movable layer */
await pasteEvt(100, 80, "#00ff00"); await sl(800);
st = await api(a => ({ n: a.layers().length, t: a.tool(), x: a.layers()[1] && a.layers()[1].x }));
ok(st.n === 2 && st.t === "move", "P6 second paste is a new layer with Move tool: " + JSON.stringify(st));
const x0 = st.x; await drag(st.x + 50, 40, st.x + 50 - 120, 40 + 60);
st = await api(a => ({ x: a.layers()[1].x, y: a.layers()[1].y })); ok(st.x !== x0, "P7 layer dragged to " + JSON.stringify(st));
await p.click("#im-flat"); await sl(200); ok(await api(a => a.layers().length) === 1, "P8 flatten → one layer");
/* clipboard API button */
await p.evaluate(async () => { const c = document.createElement("canvas"); c.width = 50; c.height = 50; c.getContext("2d").fillStyle = "#0000ff"; c.getContext("2d").fillRect(0, 0, 50, 50); const bl = await new Promise(r => c.toBlob(r, "image/png")); await navigator.clipboard.write([new ClipboardItem({ "image/png": bl })]); });
await p.click("#im-paste"); await sl(1000); ok(await api(a => a.layers().length) === 2, "P9 Paste button reads the system clipboard");
await p.click("#im-flat"); await sl(200);

/* tools on a fresh white canvas */
await fresh(); await sl(300);
await color("#im-color", "#0000ff"); await tool("pencil"); await drag(100, 100, 300, 100);
ok(near(await px(200, 100), [0, 0, 255, 255], 60), "P10 pencil draws blue: " + await px(200, 100));
await color("#im-color", "#ff0000"); await tool("pen"); await drag(100, 160, 300, 160);
ok(near(await px(200, 160), [255, 0, 0, 255], 60), "P11 brush draws red");
await tool("eraser"); await drag(150, 160, 250, 160);
const er = await px(200, 160); ok(near(er, [255, 255, 255, 255], 40) || er[3] === 0, "P12 eraser clears: " + er);
await color("#im-color", "#00aa00"); await p.$eval("#im-mode", e => { e.value = "filled"; e.dispatchEvent(new Event("change", { bubbles: true })); }).catch(() => {});
await tool("box"); await drag(400, 100, 600, 250);
ok(near(await px(500, 175), [0, 170, 0, 255], 60), "P13 filled rectangle: " + await px(500, 175));
await tool("ellipse"); await drag(700, 100, 900, 250); ok(near(await px(800, 175), [0, 170, 0, 255], 60), "P14 filled ellipse");
await color("#im-color", "#ffaa00"); await tool("fill"); await clickAt(50, 600);
ok(near(await px(50, 600), [255, 170, 0, 255], 30) && near(await px(500, 175), [0, 170, 0, 255], 60), "P15 bucket fill fills the background only");
await color("#im-color", "#000000"); await tool("picker"); await clickAt(500, 175);
ok(/^#00a[a-f0-9]00$/i.test(await p.$eval("#im-color", e => e.value)) || (await p.$eval("#im-color", e => e.value)).toLowerCase() === "#00aa00", "P16 colour picker: " + await p.$eval("#im-color", e => e.value));
await color("#im-color", "#111111"); PROMPT = "Hello"; await tool("text"); await clickAt(100, 400); PROMPT = null;
const txt = await p.evaluate(() => { const d = BA_ED.kinds.image._api().flat().getContext("2d").getImageData(100, 400, 120, 50).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 80 && d[i + 1] < 80) n++; return n; });
ok(txt > 50, "P17 text tool wrote text (" + txt + " dark px)");
for (const t of ["line", "arrow", "star", "tri", "rrect", "callout"]) { await tool(t); await drag(950, 300, 1150, 450); }
ok(await api(a => a.undoN()) >= 10, "P18 line/arrow/star/triangle/rounded/callout drawn, undo depth " + await api(a => a.undoN()));
await tool("redact"); await drag(400, 500, 600, 600); ok(near(await px(500, 550), [0, 0, 0, 255], 30), "P19 redact blacks out an area");
await shot("i02-tools");
const u0 = await api(a => a.undoN()); await p.click("#im-undo"); await sl(150);
ok(!near(await px(500, 550), [0, 0, 0, 255], 30) && await api(a => a.undoN()) === u0 - 1, "P20 undo removes the redaction"); await p.click("#im-redo"); await sl(150);
await p.click("#im-rotr"); await sl(200); st = await api(a => [a.W, a.H]); ok(st[0] === 800 && st[1] === 1200, "P21 rotate right " + st); await p.click("#im-rotl"); await sl(200);
const before = await px(100, 100); await p.click("#im-fliph"); await sl(150); ok(near(await px(1099, 100), before, 60), "P22 flip horizontal"); await p.click("#im-fliph"); await sl(150);
await p.click("#im-grey"); await sl(300); const gp = await px(500, 175); ok(Math.abs(gp[0] - gp[1]) < 6 && Math.abs(gp[1] - gp[2]) < 6, "P23 greyscale " + gp); await p.click("#im-undo"); await sl(200);
/* layers, zoom, grid, ruler */
await p.click("#im-addl"); await sl(150); ok(await api(a => a.layers().length) === 2 && (await p.$$("#im-layers > *")).length >= 2, "P24 add layer + layers panel");
await p.$eval("#im-op", e => { e.value = 50; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }); ok(Math.abs(await api(a => a.layers()[a.act()].op) - .5) < .02, "P25 layer opacity 50%");
await p.click("#im-dell"); await sl(150);
await p.$eval("#im-zoom", e => { e.value = 200; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }); await sl(200);
ok(Math.abs(await api(a => a.scale()) - 2) < .05, "P26 zoom slider 200%: " + await api(a => a.scale()));
await p.click("#im-fit"); await sl(200);
await p.click("#im-grid"); await p.click("#im-ruler"); await sl(200);
ok(await p.evaluate(() => [...document.querySelectorAll(".im-gridl")].some(e => !e.hidden && e.offsetWidth > 0)), "P27 gridlines shown"); await shot("i03-grid-ruler");
await p.click("#im-grid"); await p.click("#im-ruler");
/* background removal + PNG alpha round trip */
await fresh(); await sl(200); await color("#im-color", "#cc0000"); await p.$eval("#im-mode", e => { e.value = "filled"; e.dispatchEvent(new Event("change", { bubbles: true })); }).catch(() => {}); await tool("ellipse"); await drag(400, 200, 800, 600);
await p.click("#im-rmbg"); await sl(800);
ok((await px(5, 5))[3] === 0 && (await px(600, 400))[3] === 255, "P28 remove background → transparent corners, subject kept");
await shot("i04-remove-bg");
await p.click("#ed-image [data-ed=saveas]"); await p.waitForSelector("dialog.ed-pick[open] #ed-pk-name"); await p.$eval("#ed-pk-name", e => { e.value = "cutout.png"; }); await p.click("#ed-pk-go");
await p.waitForFunction(() => /^Saved|Could not/.test(BA_ED.st.image.msg.textContent), { timeout: 60000 });
await p.evaluate(async () => { BA_ED.st.image.dirty = false; await pdRefresh(); const f = pd.files.find(x => x.path.endsWith("cutout.png")); await BA_ED.open("image", f); }); await sl(1500);
ok((await px(5, 5))[3] === 0 && near(await px(600, 400), [204, 0, 0, 255], 20), "P29 PNG transparency survives save and reopen");
await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark")); await sl(200); await shot("i05-dark"); await p.evaluate(() => document.documentElement.removeAttribute("data-theme"));
ok(!errs.length, "P30 no page errors " + errs.slice(0, 3).join(" | "));
await b.close(); console.log(fails ? fails + " FAILED" : "ALL PASS"); process.exit(fails ? 1 : 0);
