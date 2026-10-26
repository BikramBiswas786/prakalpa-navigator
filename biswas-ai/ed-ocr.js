/* Reading text out of pictures and scans (OCR), and drawing AI answers as PNG images.
   OCR: a vision model on the server first (op "ocr"); when none is configured, Tesseract.js (Bengali + English) runs in a worker in the browser. */
(() => {
"use strict";
const TESS = { src: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js", sri: "sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F",
  worker: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js", core: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1", lang: "https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0" };
const IMG_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i;
const en = () => typeof settings === "undefined" || settings.lang === "en";
const L = (e, b) => en() ? e : b;
let tessP = null, tessW = null, visionOff = false;
function loadTess() {
  if (window.Tesseract) return Promise.resolve();
  return tessP || (tessP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = TESS.src; s.integrity = TESS.sri; s.crossOrigin = "anonymous"; s.onload = res; s.onerror = () => { tessP = null; rej(new Error("ocr_load")); }; document.head.append(s); }));
}
async function tessWorker(onProg) {
  await loadTess();
  if (!tessW) tessW = window.Tesseract.createWorker(["ben", "eng"], 1, { workerPath: TESS.worker, corePath: TESS.core, langPath: TESS.lang, logger: m => { if (onProg && m && m.status) onProg(m.status + (m.progress ? " " + Math.round(m.progress * 100) + "%" : "")); } }).catch(e => { tessW = null; throw e; });
  return tessW;
}
const canOcr = name => IMG_EXT.test(name || "") || /\.pdf$/i.test(name || "");
// file -> canvases (one per page), longest side <= max
async function pages(blob, name, max = 2000, maxPages = 60) {
  const out = [];
  const fit = (w, h, m) => { const k = Math.min(1, m / Math.max(w, h)); return [Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))]; };
  if (/\.pdf$/i.test(name) || blob.type === "application/pdf") {
    await load("pdfworker"); await load("pdfjs");
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    for (let p = 1; p <= Math.min(pdf.numPages, maxPages); p++) {
      const pg = await pdf.getPage(p); const v0 = pg.getViewport({ scale: 1 }); const sc = Math.min(3, max / Math.max(v0.width, v0.height));
      const vp = pg.getViewport({ scale: sc }); const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: vp }).promise; out.push(c);
    }
    out.total = pdf.numPages; return out;
  }
  const bm = await createImageBitmap(blob); const [w, h] = fit(bm.width, bm.height, max);
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(bm, 0, 0, w, h); out.push(c); out.total = 1; return out;
}
const b64 = c => c.toDataURL("image/jpeg", 0.85).split(",")[1];
// returns { text, how: "vision" | "tesseract", pages, total }
async function read(blob, name, onProg = () => {}) {
  onProg(L("Preparing pages…", "পাতা তৈরি হচ্ছে…"));
  const cs = await pages(blob, name);
  const multi = cs.length > 1; let text = "", how = "";
  if (!visionOff && typeof pdApi === "function") {
    try {
      for (let i = 0; i < cs.length; i += 4) {
        onProg(L("Reading text with the vision model…", "ভিশন মডেল দিয়ে লেখা পড়া হচ্ছে…") + (multi ? ` ${L("pages", "পাতা")} ${i + 1}–${Math.min(i + 4, cs.length)} / ${cs.length}` : ""));
        const r = await pdApi("ocr", { images: cs.slice(i, i + 4).map(c => ({ mime: "image/jpeg", data: b64(c) })) });
        text += (text ? "\n\n" : "") + (multi && !/\[Page \d+\]/.test(r.text || "") ? `[Page ${i + 1}]\n` : "") + (r.text || "");
      }
      how = "vision";
    } catch (e) { if (e.status === 422 || /no_vision|no_provider/.test(e.message)) visionOff = true; text = ""; how = ""; }
  }
  if (!how) {
    onProg(L("Loading the OCR reader (first time ~10 MB)…", "OCR রিডার লোড হচ্ছে (প্রথমবার ~১০ MB)…"));
    const w = await tessWorker(m => onProg("OCR: " + m));
    for (let i = 0; i < cs.length; i++) {
      onProg(L("Reading text (OCR)", "লেখা পড়া হচ্ছে (OCR)") + (multi ? ` ${i + 1}/${cs.length}` : "") + "…");
      const r = await w.recognize(cs[i]);
      const t = String((r && r.data && r.data.text) || "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (t) text += (text ? "\n\n" : "") + (multi ? `[Page ${i + 1}]\n` : "") + t;
    }
    how = "tesseract";
  }
  text = text.trim();
  if (cs.total > cs.length) text += `\n\n(${cs.total - cs.length} more pages not read by OCR)`;
  return { text, how, pages: cs.length, total: cs.total };
}

/* ---------- AI answer -> PNG ---------- */
const FONT = "'Noto Sans Bengali','Hind Siliguri','Noto Sans',system-ui,sans-serif";
function wrap(g, text, maxW) {
  const lines = [];
  for (const para of String(text).replace(/\r/g, "").split("\n")) {
    if (!para.trim()) { lines.push(""); continue; }
    let cur = "";
    for (const word of para.split(/(\s+)/)) {
      const nxt = cur + word;
      if (g.measureText(nxt).width <= maxW || !cur.trim()) {
        if (g.measureText(nxt).width > maxW) { // one very long word: break by characters
          let piece = ""; for (const ch of [...nxt]) { if (g.measureText(piece + ch).width > maxW && piece) { lines.push(piece); piece = ch; } else piece += ch; } cur = piece;
        } else cur = nxt;
      } else { lines.push(cur.trimEnd()); cur = word.trimStart(); }
    }
    lines.push(cur.trimEnd());
  }
  return lines;
}
/* real picture from the server's image model (free providers first); null when none answers */
async function genPicture(prompt, w = 1216, h = 832) {
  try {
    const r = await fetch("/api/imagegen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, w, h }) });
    if (!r.ok) return null; const j = await r.json(); if (!j.b64) return null;
    const bin = Uint8Array.from(atob(j.b64), ch => ch.charCodeAt(0));
    return { bm: await createImageBitmap(new Blob([bin], { type: j.mime || "image/png" })), provider: j.provider };
  } catch (e) { return null; }
}
// cover-fit the picture, then write the title/text on dark bands so Bengali and English stay exact
async function drawScene(a) {
  const W = 1216, H = 832, pic = await genPicture(a.scene, W, H); if (!pic) return null;
  try { await document.fonts.load(`bold 56px ${FONT}`, "অআ abc"); await document.fonts.load(`30px ${FONT}`, "অআ abc"); } catch (e) { /* system fonts */ }
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const k = Math.max(W / pic.bm.width, H / pic.bm.height), dw = pic.bm.width * k, dh = pic.bm.height * k;
  g.drawImage(pic.bm, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const P = 48; g.textAlign = "center"; g.textBaseline = "top";
  const band = (y0, y1, top) => { const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(top ? 0 : 1, "rgba(0,0,0,0.78)"); gr.addColorStop(top ? 1 : 0, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); };
  if (a.title) {
    let sz = 64, tl; for (;;) { g.font = `bold ${sz}px ${FONT}`; tl = wrap(g, a.title, W - 2 * P); if (tl.length * sz * 1.3 <= H * 0.32 || sz <= 28) break; sz -= 4; }
    const th = tl.length * sz * 1.3 + P; band(0, th + 60, true);
    g.fillStyle = "#ffffff"; g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 6; let y = P * 0.7; for (const l of tl) { g.fillText(l, W / 2, y); y += sz * 1.3; } g.shadowBlur = 0;
  }
  if (a.text && a.text.trim()) {
    let sz = 34, tl; for (;;) { g.font = `${sz}px ${FONT}`; tl = wrap(g, a.text, W - 2 * P); if (tl.length * sz * 1.45 <= H * 0.4 || sz <= 16) break; sz -= 2; }
    const bh = tl.length * sz * 1.45 + P; band(H - bh - 60, H, false);
    g.fillStyle = "#ffffff"; g.shadowColor = "rgba(0,0,0,.6)"; g.shadowBlur = 5; let y = H - bh + P * 0.4; for (const l of tl) { g.fillText(l, W / 2, y); y += sz * 1.45; } g.shadowBlur = 0;
  }
  c.dataset.provider = pic.provider || ""; return c;
}
async function draw(a) {
  if (a.scene && a.kind !== "chart") { const c = await drawScene(a); if (c) return c; a.genFailed = true; if (a.kind === "picture" && !(a.title || a.text)) a.text = a.scene; }
  try { await document.fonts.load(`32px ${FONT}`, "অআ abc"); await document.fonts.load(`bold 48px ${FONT}`, "অআ abc"); } catch (e) { /* fall back to system fonts */ }
  const W = a.kind === "poster" ? 1240 : 1200, P = 64;
  const c = document.createElement("canvas"); let g = c.getContext("2d");
  const bg = a.bg || "#ffffff", fg = a.fg || "#111111", ac = a.accent || fg;
  if (a.kind === "chart" && a.chart) {
    c.width = 1200; c.height = 760; g = c.getContext("2d"); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textBaseline = "top";
    g.font = `bold 34px ${FONT}`; g.textAlign = "center"; g.fillText(a.title || "", 600, 28);
    const { type, labels, values } = a.chart; const max = Math.max(1, ...values.map(v => Math.abs(v))); const pal = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
    if (type === "pie") {
      const tot = values.reduce((s, v) => s + Math.max(0, v), 0) || 1; let ang = -Math.PI / 2;
      values.forEach((v, i) => { const a2 = ang + Math.max(0, v) / tot * Math.PI * 2; g.beginPath(); g.moveTo(420, 410); g.arc(420, 410, 280, ang, a2); g.closePath(); g.fillStyle = pal[i % 8]; g.fill(); ang = a2; });
      g.textAlign = "left"; g.font = `24px ${FONT}`; labels.forEach((l, i) => { g.fillStyle = pal[i % 8]; g.fillRect(780, 150 + i * 40, 24, 24); g.fillStyle = fg; g.fillText(`${l}: ${values[i]}`, 816, 150 + i * 40); });
    } else {
      const x0 = 110, y0 = 660, w = 1040, h = 520, n = values.length || 1, bw = w / n;
      g.strokeStyle = fg; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 - h); g.lineTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke();
      g.font = `20px ${FONT}`; g.textAlign = "right"; for (let k = 0; k <= 4; k++) { const v = max * k / 4; g.fillStyle = fg; g.fillText(String(+v.toFixed(2)), x0 - 10, y0 - h * k / 4 - 10); }
      g.textAlign = "center";
      if (type === "line") { g.strokeStyle = pal[0]; g.lineWidth = 4; g.beginPath(); values.forEach((v, i) => { const x = x0 + bw * (i + 0.5), y = y0 - h * Math.max(0, v) / max; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
      values.forEach((v, i) => { const x = x0 + bw * i, bh = h * Math.max(0, v) / max;
        if (type !== "line") { g.fillStyle = pal[i % 8]; g.fillRect(x + bw * 0.15, y0 - bh, bw * 0.7, bh); }
        g.fillStyle = fg; g.fillText(String(v), x + bw / 2, y0 - bh - 28); g.fillText(String(labels[i]).slice(0, 14), x + bw / 2, y0 + 12); });
    }
    return c;
  }
  const poster = a.kind === "poster";
  let size = poster ? 34 : 30; let titleLines = [], lines = [], lh, th;
  for (;;) {
    lh = Math.round(size * 1.55); g.font = `bold ${Math.round(size * 1.6)}px ${FONT}`; titleLines = a.title ? wrap(g, a.title, W - 2 * P) : []; th = titleLines.length * Math.round(size * 2.3);
    g.font = `${size}px ${FONT}`; lines = wrap(g, a.text || "", W - 2 * P);
    if (P * 2 + th + lines.length * lh <= 12000 || size <= 14) break; size -= 2;
  }
  c.width = W; c.height = Math.max(poster ? 800 : 200, Math.min(16000, P * 2 + th + (th ? 20 : 0) + lines.length * lh)); g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.textBaseline = "top";
  if (poster) { g.strokeStyle = ac; g.lineWidth = 8; g.strokeRect(20, 20, c.width - 40, c.height - 40); }
  const center = poster || a.align === "center"; g.textAlign = center ? "center" : "left"; const x = center ? W / 2 : P;
  let y = P + (poster && !a.title ? Math.max(0, (c.height - 2 * P - lines.length * lh) / 2) : 0);
  g.fillStyle = poster ? ac : fg; g.font = `bold ${Math.round(size * 1.6)}px ${FONT}`;
  for (const l of titleLines) { g.fillText(l, x, y); y += Math.round(size * 2.3); }
  if (th) y += 20;
  g.fillStyle = fg; g.font = `${size}px ${FONT}`;
  for (const l of lines) { g.fillText(l, x, y); y += lh; }
  return c;
}
const toBlob = c => new Promise(r => c.toBlob(r, "image/png"));
const imgs = new Map(); // action index -> blob
async function cards(out, actions) {
  imgs.clear();
  const list = (actions || []).map((a, i) => [a, i]).filter(([a]) => a.type === "image");
  if (!list.length || !out) return;
  for (const [a, i] of list) {
    const box = document.createElement("div"); box.className = "pd-act pd-imgact"; box.dataset.pdImg = i;
    box.innerHTML = `<b>🖼 ${esc(a.path.split("/").pop())}</b><img alt="" style="max-width:100%;max-height:420px;object-fit:contain;border:1px solid var(--line,#ccc);border-radius:8px;background:#888"><div class="actions">`
      + `<button type="button" class="btn small" data-pd-imgdl="${i}">⬇ ${esc(L("Download PNG", "PNG ডাউনলোড"))}</button>`
      + `<button type="button" class="btn small" data-pd-imgopen="${i}">🎨 ${esc(L("Open in Drafting Image", "ড্রাফটিং ইমেজে খুলুন"))}</button>`
      + `<button type="button" class="btn small" data-pd-imgsave="${i}">💾 ${esc(L("Save to pendrive", "পেনড্রাইভে রাখুন"))}</button></div>`;
    out.append(box);
    const c = await draw(a); const blob = await toBlob(c); imgs.set(i, { blob, a });
    box.querySelector("img").src = URL.createObjectURL(blob); box.dataset.ready = "1"; box.dataset.w = c.width; box.dataset.h = c.height;
    if (c.dataset.provider) { box.dataset.gen = c.dataset.provider; const n = document.createElement("small"); n.className = "muted"; n.textContent = L("Picture made by an AI image model; the text is written on top by the app.", "ছবিটি এআই ইমেজ মডেলে তৈরি; লেখা অ্যাপ নিজে বসিয়েছে।"); box.querySelector("img").after(n); }
    else if (a.genFailed) { box.dataset.gen = "failed"; const n = document.createElement("small"); n.className = "muted"; n.textContent = L("The picture service is busy, so a text-only image was made. Ask again in a minute for a picture.", "ছবি তৈরির পরিষেবা ব্যস্ত, তাই শুধু লেখার ছবি দেওয়া হল। এক মিনিট পরে আবার চাইলে ছবি পাবেন।"); box.querySelector("img").after(n); }
  }
}
async function openInImage(blob, name) {
  const ED = window.BA_ED; if (!ED) return;
  const st = ED.st.image; if (st && st.dirty && !confirm(L("Discard the unsaved image in Drafting Image?", "ড্রাফটিং ইমেজের সেভ না করা ছবি বাদ দেবেন?"))) return;
  ED.show("image"); for (let k = 0; k < 40 && !(ED.st.image && ED.st.image.ready); k++) await new Promise(r => setTimeout(r, 50));
  await ED.kinds.image.load(await blob.arrayBuffer(), "png", name);
  ED.st.image.file = null; ED.st.image.name = name; ED.st.image.dirty = true; ED.label("image"); requestAnimationFrame(() => ED.kinds.image.fit && ED.kinds.image.fit());
}
document.addEventListener("click", async e => {
  const b = e.target.closest && e.target.closest("[data-pd-imgdl],[data-pd-imgopen],[data-pd-imgsave]"); if (!b) return;
  const i = Number(b.dataset.pdImgdl ?? b.dataset.pdImgopen ?? b.dataset.pdImgsave); const it = imgs.get(i); if (!it) return;
  const name = it.a.path.split("/").pop();
  if (b.dataset.pdImgdl != null) { const u = URL.createObjectURL(it.blob); const x = document.createElement("a"); x.href = u; x.download = name; document.body.append(x); x.click(); x.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); return; }
  if (b.dataset.pdImgopen != null) return openInImage(it.blob, name);
  let path = it.a.path; if (!path.includes("/") && typeof pd !== "undefined" && pd.cwd) path = pd.cwd + "/" + path;
  pdQueue([{ file: new File([it.blob], name, { type: "image/png" }), path, text: it.a.text || "" }]); toast(t("pd_saved", path));
});
window.BA_IMG = { gen: genPicture };
window.BA_OCR = { read, canOcr, draw, cards, openInImage, _state: () => ({ visionOff, tess: !!window.Tesseract }) };
})();
