/* Drafting Image (Paint): pencil, brushes, eraser, fill, colour picker, primary/secondary colours, shapes with outline/fill,
   text with fonts, rectangle and free-form select (move/copy/cut/paste/delete), crop, resize/skew, rotate/flip, canvas size,
   zoom, gridlines, ruler, layers, blur/redact, greyscale/sharpen/invert, 60-step undo, and paste a screenshot with Ctrl+V. */
(() => {
"use strict";
const ED = window.BA_ED; if (!ED) return;
const { h, T } = ED;
ED.addTX({
  en: { i_paste: "Paste image", i_paste_hint: "Tip: press Print Screen, then Ctrl+V here to paste the screenshot.", i_pasted: "Pasted as a new layer — drag to move it, then Flatten or keep layers.", i_pasted_new: "Screenshot pasted. Save will suggest {0}.",
    i_noclip: "No image on the clipboard. Press Print Screen (or Win+Shift+S), then Ctrl+V here.", i_clipblock: "The browser blocked reading the clipboard — press Ctrl+V instead.",
    i_select: "Select", i_lasso: "Free-form select", i_move: "Move layer", i_pencil: "Pencil", i_brush: "Brush", i_eraser: "Eraser", i_fill: "Fill with colour", i_picker: "Colour picker",
    i_line: "Line", i_curve: "Curve", i_rect: "Rectangle", i_rrect: "Rounded rectangle", i_ellipse: "Ellipse", i_tri: "Triangle", i_star: "Star", i_callout: "Callout", i_blur: "Blur area", i_redact: "Redact (black box)",
    i_outline: "Outline only", i_filled: "Fill only", i_both: "Outline + fill", i_c1: "Colour 1 (primary)", i_c2: "Colour 2 (secondary)", i_swap: "Swap colours", i_size: "Size",
    i_b_round: "Round brush", i_b_marker: "Marker", i_b_spray: "Airbrush", i_b_calli: "Calligraphy", i_b_hl: "Highlighter",
    i_copy: "Copy", i_cut: "Cut", i_del: "Delete selection", i_selall: "Select all", i_tosel: "Crop to selection", i_flipH: "Flip horizontal", i_flipV: "Flip vertical", i_rot180: "Rotate 180°",
    i_skew: "Skew", i_skewx: "Skew horizontal (degrees)", i_skewy: "Skew vertical (degrees)", i_canvas: "Canvas size", i_pct: "Resize %", i_grey: "Greyscale", i_sharpen: "Sharpen", i_invert: "Invert colours", i_softblur: "Soften",
    i_zoom: "Zoom", i_fit: "Fit", i_grid: "Gridlines", i_ruler: "Ruler", i_layers: "Layers", i_addl: "New layer", i_dell: "Delete layer", i_up: "Move layer up", i_down: "Move layer down", i_merge: "Merge down", i_flat: "Flatten",
    i_opacity: "Opacity", i_bg: "Background", i_layer: "Layer", i_font: "Font", i_bold: "Bold", i_italic: "Italic", i_curvehint: "Now drag to bend the curve.", i_curvetip: "Curve: drag a line, then drag again to bend it.", i_cropsel: "Select the area, then Apply crop.", i_bgonly: "Can't delete the background layer.",
    i_sel_none: "Select an area first.", i_tolerance: "Fill tolerance", i_rmbg: "Remove background", i_transp: "Transparent" },
  bn: { i_paste: "ছবি পেস্ট", i_paste_hint: "টিপ: Print Screen চাপুন, তারপর এখানে Ctrl+V দিয়ে স্ক্রিনশট পেস্ট করুন।", i_pasted: "নতুন স্তর হিসেবে পেস্ট হয়েছে — টেনে সরান, তারপর এক করুন বা রেখে দিন।", i_pasted_new: "স্ক্রিনশট পেস্ট হয়েছে। সেভ করলে নাম হবে {0}।",
    i_noclip: "ক্লিপবোর্ডে কোনো ছবি নেই। Print Screen (বা Win+Shift+S) চাপুন, তারপর এখানে Ctrl+V।", i_clipblock: "ব্রাউজার ক্লিপবোর্ড পড়তে দেয়নি — Ctrl+V চাপুন।",
    i_select: "বাছাই", i_lasso: "মুক্ত-হাতে বাছাই", i_move: "স্তর সরান", i_pencil: "পেনসিল", i_brush: "তুলি", i_eraser: "রবার", i_fill: "রং ভরুন", i_picker: "রং তুলুন",
    i_line: "রেখা", i_curve: "বাঁকা রেখা", i_rect: "আয়তক্ষেত্র", i_rrect: "গোল-কোণ আয়ত", i_ellipse: "উপবৃত্ত", i_tri: "ত্রিভুজ", i_star: "তারা", i_callout: "কথার বাক্স", i_blur: "ঝাপসা করুন", i_redact: "কালো করে ঢাকুন",
    i_outline: "শুধু রেখা", i_filled: "শুধু ভরাট", i_both: "রেখা + ভরাট", i_c1: "রং ১ (মূল)", i_c2: "রং ২ (দ্বিতীয়)", i_swap: "রং অদলবদল", i_size: "মাপ",
    i_b_round: "গোল তুলি", i_b_marker: "মার্কার", i_b_spray: "স্প্রে", i_b_calli: "ক্যালিগ্রাফি", i_b_hl: "হাইলাইটার",
    i_copy: "কপি", i_cut: "কাট", i_del: "বাছাই মুছুন", i_selall: "সব বাছুন", i_tosel: "বাছাই অংশে কাটুন", i_flipH: "আড়াআড়ি উল্টান", i_flipV: "খাড়াখাড়ি উল্টান", i_rot180: "১৮০° ঘোরান",
    i_skew: "হেলান", i_skewx: "আড়াআড়ি হেলান (ডিগ্রি)", i_skewy: "খাড়া হেলান (ডিগ্রি)", i_canvas: "ক্যানভাসের মাপ", i_pct: "মাপ %", i_grey: "সাদা-কালো", i_sharpen: "ধারালো", i_invert: "রং উল্টান", i_softblur: "নরম",
    i_zoom: "জুম", i_fit: "মানানসই", i_grid: "গ্রিড", i_ruler: "রুলার", i_layers: "স্তর", i_addl: "নতুন স্তর", i_dell: "স্তর মুছুন", i_up: "স্তর ওপরে", i_down: "স্তর নিচে", i_merge: "নিচে মেশান", i_flat: "সব এক করুন",
    i_opacity: "অস্বচ্ছতা", i_bg: "পটভূমি", i_layer: "স্তর", i_font: "ফন্ট", i_bold: "মোটা", i_italic: "বাঁকা", i_curvehint: "এবার টেনে রেখাটা বাঁকান।", i_curvetip: "বাঁকা রেখা: আগে রেখা টানুন, তারপর আবার টেনে বাঁকান।", i_cropsel: "অংশ বাছুন, তারপর কাটা প্রয়োগ।", i_bgonly: "পটভূমি স্তর মোছা যায় না।",
    i_sel_none: "আগে একটা অংশ বাছুন।", i_tolerance: "রং ভরার সহনশীলতা", i_rmbg: "পটভূমি সরান", i_transp: "স্বচ্ছ" }
});
const fmt = (s, ...a) => s.replace(/\{(\d)\}/g, (m, i) => a[i]);
const mk = (w, hh) => { const c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, hh); return c; };
const g2 = c => c.getContext("2d", { willReadFrequently: true });
const clone = c => { const n = mk(c.width, c.height); g2(n).drawImage(c, 0, 0); return n; };
const pad = n => String(n).padStart(2, "0");
const shotName = () => { const d = new Date(); return `screenshot-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`; };
const hex2 = (r, g, b) => "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
const PALETTE = ["#000000", "#7f7f7f", "#880015", "#ed1c24", "#ff7f27", "#fff200", "#22b14c", "#00a2e8", "#3f48cc", "#a349a4", "#ffffff", "#c3c3c3", "#b97a57", "#ffaec9", "#ffc90e", "#efe4b0", "#b5e61d", "#99d9ea", "#7092be", "#c8bfe7"];
ED.kinds.image = (() => {
  let W = 1200, H = 800, layers = [], act = 0, cv, ctx, ov, octx, stage, box, gridEl, rT, rL, layerBox, statEl;
  let tool = "brush", brush = "round", mode = "outline", c1, c2, lw, tol, fontSel, fsz, fB, fI, zoomSel, gridChk, rulerChk, bri, con, rw, rh, keep, pctIn, ac;
  let zoom = "fit", scale = 1, sel = null, drag = null, curve = null, undo = [], redo = [], curExt = "png", clip = null, lastXY = null;
  const say = m => ED.say("image", m);
  const AL = () => layers[act];
  const LG = () => g2(AL().c);
  const dirty = () => ED.dirty("image");
  const newLayer = (name, w, hh, x = 0, y = 0) => ({ name, c: mk(w, hh), x, y, vis: true, op: 1 });
  /* ----- undo: whole document snapshots (layers cloned) ----- */
  const state = () => ({ W, H, act, layers: layers.map(L => ({ ...L, c: clone(L.c) })) });
  function snap() { undo.push(state()); if (undo.length > 60) undo.shift(); redo = []; }
  function put(s) { W = s.W; H = s.H; act = Math.min(s.act, s.layers.length - 1); layers = s.layers.map(L => ({ ...L, c: clone(L.c) })); sel = null; curve = null; sizeAll(); }
  function doUndo() { if (!undo.length) return; redo.push(state()); put(undo.pop()); dirty(); }
  function doRedo() { if (!redo.length) return; undo.push(state()); put(redo.pop()); dirty(); }
  /* ----- drawing the document ----- */
  function flat(withBg = true) { const f = mk(W, H), g = g2(f); for (const L of layers) if (L.vis) { g.globalAlpha = L.op; g.drawImage(L.c, L.x, L.y); } g.globalAlpha = 1; return f; }
  function render() { ctx.clearRect(0, 0, W, H); for (const L of layers) if (L.vis) { ctx.globalAlpha = L.op; ctx.drawImage(L.c, L.x, L.y); } ctx.globalAlpha = 1; over(); }
  function selPath(g, s, dx = 0, dy = 0) { g.beginPath(); if (s.path) { s.path.forEach((q, i) => i ? g.lineTo(q.x - dx, q.y - dy) : g.moveTo(q.x - dx, q.y - dy)); g.closePath(); } else g.rect(s.x - dx, s.y - dy, s.w, s.h); }
  function over(prev) { octx.clearRect(0, 0, W, H); if (prev) prev(octx);
    if (sel) { const lwid = Math.max(1, 1 / scale); octx.save(); octx.lineWidth = lwid; octx.setLineDash([5 * lwid, 4 * lwid]); octx.strokeStyle = "#000"; selPath(octx, sel); octx.stroke(); octx.lineDashOffset = 5 * lwid; octx.strokeStyle = "#fff"; selPath(octx, sel); octx.stroke(); octx.restore(); }
    if (tool === "move" && AL() && act > 0) { const L = AL(); octx.save(); octx.setLineDash([4, 3]); octx.strokeStyle = "#2563eb"; octx.lineWidth = Math.max(1, 1 / scale); octx.strokeRect(L.x, L.y, L.c.width, L.c.height); octx.restore(); }
    status(); }
  function sizeAll() { cv.width = ov.width = W; cv.height = ov.height = H; ctx = g2(cv); octx = ov.getContext("2d"); rw.value = W; rh.value = H; applyZoom(); render(); layersUI(); }
  function setDoc(w, hh, draw) { W = Math.max(1, Math.min(10000, Math.round(w))); H = Math.max(1, Math.min(10000, Math.round(hh))); const L = newLayer(T("i_bg"), W, H); if (draw) draw(g2(L.c)); layers = [L]; act = 0; sel = null; curve = null; sizeAll(); }
  function fitScale() { const r = stage.getBoundingClientRect(); const mw = Math.max(200, r.width - 40), mh = Math.max(200, window.innerHeight - r.top - 60); return Math.min(1, mw / W, mh / H); }
  function applyZoom() { if (!stage) return; scale = zoom === "fit" ? fitScale() : +zoom; const dw = Math.max(1, Math.round(W * scale)), dh = Math.max(1, Math.round(H * scale));
    for (const c of [cv, ov]) { c.style.width = dw + "px"; c.style.height = dh + "px"; } box.style.width = dw + "px"; box.style.height = dh + "px";
    cv.style.imageRendering = ov.style.imageRendering = scale >= 3 ? "pixelated" : "auto";
    const step = scale >= 6 ? 1 : scale >= 1.5 ? 10 : scale >= 0.4 ? 50 : 100; gridEl.style.backgroundSize = `${step * scale}px ${step * scale}px`; gridEl.hidden = !gridChk.checked; rulers(); }
  function rulers() { const on = rulerChk.checked; rT.hidden = rL.hidden = !on; stage.classList.toggle("im-ruled", on); if (!on) return;
    const dw = Math.round(W * scale), dh = Math.round(H * scale); const nice = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find(s => s * scale >= 40) || 5000;
    for (const [c, len, horiz] of [[rT, dw, true], [rL, dh, false]]) { c.width = horiz ? len : 18; c.height = horiz ? 18 : len; c.style.width = c.width + "px"; c.style.height = c.height + "px";
      const g = c.getContext("2d"); g.fillStyle = "#f5f6f8"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = "#555"; g.strokeStyle = "#888"; g.font = "9px sans-serif"; g.beginPath();
      for (let v = 0; v <= (horiz ? W : H); v += nice / 5) { const q = Math.round(v * scale) + .5; const major = Math.round(v) % nice === 0; const t = major ? 10 : 5;
        if (horiz) { g.moveTo(q, 18); g.lineTo(q, 18 - t); if (major) g.fillText(String(Math.round(v)), q + 2, 9); } else { g.moveTo(18, q); g.lineTo(18 - t, q); if (major) { g.save(); g.translate(9, q + 2); g.rotate(Math.PI / 2); g.fillText(String(Math.round(v)), 0, 0); g.restore(); } } }
      g.stroke(); } }
  function status() { if (!statEl) return; const p = lastXY ? `${Math.round(lastXY.x)}, ${Math.round(lastXY.y)} px` : ""; const s = sel ? ` · ⬚ ${Math.round(sel.w)}×${Math.round(sel.h)}` : "";
    statEl.textContent = `${p}${s} · ${W}×${H} px · ${Math.round(scale * 100)}% · ${T("i_layer")} ${act + 1}/${layers.length}`; }
  /* ----- layers panel ----- */
  function layersUI() { if (!layerBox) return; layerBox.textContent = "";
    for (let i = layers.length - 1; i >= 0; i--) { const L = layers[i];
      const vis = h("input", { type: "checkbox", checked: L.vis, title: "Show", "aria-label": "Show " + L.name, onchange: () => { L.vis = vis.checked; render(); dirty(); } });
      const row = h("div", { class: "im-lrow" + (i === act ? " on" : ""), "data-li": String(i), role: "button", tabindex: "0", onclick: e => { if (e.target === vis) return; act = i; layersUI(); over(); } }, vis, h("span", {}, L.name));
      layerBox.append(row); }
    const op = h("input", { type: "range", min: "5", max: "100", value: String(Math.round(AL().op * 100)), id: "im-op", "aria-label": T("i_opacity"), oninput: () => { AL().op = op.value / 100; render(); }, onchange: () => dirty() });
    layerBox.append(h("label", { class: "ed-chk" }, T("i_opacity") + " ", op)); }
  function addLayer() { snap(); layers.splice(act + 1, 0, newLayer(T("i_layer") + " " + (layers.length + 1), W, H)); act++; layersUI(); render(); dirty(); }
  function delLayer() { if (act === 0) { say(T("i_bgonly")); return; } snap(); layers.splice(act, 1); act--; layersUI(); render(); dirty(); }
  function moveLayer(d) { const j = act + d; if (j < 1 || j >= layers.length || act === 0) return; snap(); [layers[act], layers[j]] = [layers[j], layers[act]]; act = j; layersUI(); render(); dirty(); }
  function mergeDown(noSnap) { if (act === 0) return; if (!noSnap) snap(); const L = layers[act], B = layers[act - 1]; const g = g2(B.c); g.globalAlpha = L.op; if (L.vis) g.drawImage(L.c, L.x - B.x, L.y - B.y); g.globalAlpha = 1; layers.splice(act, 1); act--; layersUI(); render(); dirty(); }
  function flatten(noSnap) { if (layers.length === 1 && !layers[0].x && !layers[0].y) return; if (!noSnap) snap(); const f = flat(); const L = newLayer(T("i_bg"), W, H); g2(L.c).drawImage(f, 0, 0); layers = [L]; act = 0; layersUI(); render(); }
  /* ----- shapes ----- */
  function shapePath(g, k, a, b, ctrl) { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), hh = Math.abs(b.y - a.y); g.beginPath();
    if (k === "line") { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
    else if (k === "curve") { g.moveTo(a.x, a.y); if (ctrl) g.quadraticCurveTo(2 * ctrl.x - (a.x + b.x) / 2, 2 * ctrl.y - (a.y + b.y) / 2, b.x, b.y); else g.lineTo(b.x, b.y); }
    else if (k === "rect" || k === "box" || k === "blur" || k === "redact" || k === "select" || k === "crop") g.rect(x, y, w, hh);
    else if (k === "rrect") { const r = Math.min(w, hh) * .18; g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh); }
    else if (k === "ellipse") g.ellipse(x + w / 2, y + hh / 2, w / 2, hh / 2, 0, 0, Math.PI * 2);
    else if (k === "tri") { g.moveTo(x + w / 2, y); g.lineTo(x + w, y + hh); g.lineTo(x, y + hh); g.closePath(); }
    else if (k === "star") { const cx = x + w / 2, cy = y + hh / 2; for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? .4 : 1; const px = cx + Math.cos(ang) * w / 2 * rr, py = cy + Math.sin(ang) * hh / 2 * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); }
    else if (k === "callout") { const bh = hh * .75, r = Math.min(w, bh) * .15; g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + bh - r); g.quadraticCurveTo(x + w, y + bh, x + w - r, y + bh);
      g.lineTo(x + w * .45, y + bh); g.lineTo(x + w * .2, y + hh); g.lineTo(x + w * .3, y + bh); g.lineTo(x + r, y + bh); g.quadraticCurveTo(x, y + bh, x, y + bh - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
    else if (k === "arrow") { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); } }
  const OPEN = new Set(["line", "curve", "arrow"]);
  function drawShape(g, k, a, b, ctrl, alt) { const w = +lw.value || 4; g.save(); g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; const sc = alt ? c2.value : c1.value, fc = alt ? c1.value : c2.value;
    g.strokeStyle = sc; g.fillStyle = mode === "filled" ? sc : fc; shapePath(g, k, a, b, ctrl);
    if (!OPEN.has(k) && mode !== "outline") g.fill(); if (OPEN.has(k) || mode !== "filled") g.stroke();
    if (k === "arrow") { const ang = Math.atan2(b.y - a.y, b.x - a.x), hl = Math.max(12, w * 4); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x - hl * Math.cos(ang - .45), b.y - hl * Math.sin(ang - .45)); g.lineTo(b.x - hl * Math.cos(ang + .45), b.y - hl * Math.sin(ang + .45)); g.closePath(); g.fillStyle = sc; g.fill(); }
    g.restore(); }
  /* ----- brushes ----- */
  function stroke(g, a, b, alt) { const L = AL(); a = { x: a.x - L.x, y: a.y - L.y }; b = { x: b.x - L.x, y: b.y - L.y }; const w = +lw.value || 4, col = alt ? c2.value : c1.value; g.save();
    if (tool === "pencil") { g.lineWidth = 1; g.strokeStyle = col; g.lineCap = "square"; g.beginPath(); g.moveTo(Math.floor(a.x) + .5, Math.floor(a.y) + .5); g.lineTo(Math.floor(b.x) + .5, Math.floor(b.y) + .5); g.stroke(); }
    else if (tool === "eraser") { const ew = w * 2; if (act === 0 && !transp.checked) { g.strokeStyle = alt ? c1.value : c2.value; } else { g.globalCompositeOperation = "destination-out"; g.strokeStyle = "#000"; } g.lineWidth = ew; g.lineCap = "square"; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    else if (brush === "spray") { g.fillStyle = col; const r = w * 2.5; for (let i = 0; i < 12 + w * 2; i++) { const t = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r; g.fillRect(b.x + Math.cos(t) * d, b.y + Math.sin(t) * d, 1, 1); } }
    else if (brush === "calli") { g.fillStyle = col; const o = w / 2; g.beginPath(); g.moveTo(a.x - o, a.y + o); g.lineTo(a.x + o, a.y - o); g.lineTo(b.x + o, b.y - o); g.lineTo(b.x - o, b.y + o); g.closePath(); g.fill(); }
    else { g.strokeStyle = col; g.lineWidth = brush === "marker" ? w * 1.6 : w; g.lineCap = brush === "marker" ? "square" : "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    g.restore(); }
  /* ----- flood fill on the active layer ----- */
  function flood(p, col) { const L = AL(), x0 = Math.floor(p.x - L.x), y0 = Math.floor(p.y - L.y), w = L.c.width, hh = L.c.height; if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= hh) return false;
    const g = LG(), im = g.getImageData(0, 0, w, hh), d = im.data, i0 = (y0 * w + x0) * 4, t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]];
    const n = parseInt(col.slice(1), 16), R = n >> 16 & 255, G = n >> 8 & 255, Bl = n & 255, k = (+tol.value || 0) * 4;
    if (Math.abs(t[0] - R) + Math.abs(t[1] - G) + Math.abs(t[2] - Bl) + Math.abs(t[3] - 255) === 0) return false;
    const same = i => Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) + Math.abs(d[i + 3] - t[3]) <= k;
    const seen = new Uint8Array(w * hh), st = [x0, y0];
    while (st.length) { const y = st.pop(), x = st.pop(); let l = x; while (l >= 0 && !seen[y * w + l] && same((y * w + l) * 4)) l--; l++; let r = x; while (r < w && !seen[y * w + r] && same((y * w + r) * 4)) r++;
      for (let i = l; i < r; i++) { const j = y * w + i; seen[j] = 1; d[j * 4] = R; d[j * 4 + 1] = G; d[j * 4 + 2] = Bl; d[j * 4 + 3] = 255;
        if (y > 0 && !seen[j - w] && same((j - w) * 4)) st.push(i, y - 1); if (y < hh - 1 && !seen[j + w] && same((j + w) * 4)) st.push(i, y + 1); } }
    g.putImageData(im, 0, 0); return true; }
  /* ----- selection helpers ----- */
  function region(s) { const r = mk(Math.round(s.w), Math.round(s.h)), g = g2(r); g.save(); selPath(g, s, s.x, s.y); g.clip(); g.drawImage(flat(), -s.x, -s.y); g.restore(); return r; }
  function clearSel(s) { const L = AL(), g = LG(); g.save(); selPath(g, s, L.x, L.y); if (act === 0 && !transp.checked) { g.fillStyle = c2.value; g.fill(); } else { g.clip(); g.clearRect(0, 0, L.c.width, L.c.height); } g.restore(); }
  function lift() { // turn the selected pixels of the active layer into their own movable layer
    const L = AL(), s = sel; const piece = newLayer(T("i_layer") + " " + (layers.length + 1), Math.round(s.w), Math.round(s.h), Math.round(s.x), Math.round(s.y));
    const g = g2(piece.c); g.save(); selPath(g, s, s.x, s.y); g.clip(); g.drawImage(L.c, L.x - s.x, L.y - s.y); g.restore(); clearSel(s); layers.splice(act + 1, 0, piece); act++; layersUI(); }
  async function copySel() { if (!sel) { say(T("i_sel_none")); return false; } clip = region(sel);
    try { const blob = await new Promise(r => clip.toBlob(r, "image/png")); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); } catch (e) {} return true; }
  async function cutSel() { if (!(await copySel())) return; snap(); clearSel(sel); render(); dirty(); }
  function delSel() { if (!sel) return; snap(); clearSel(sel); sel = null; render(); dirty(); }
  function selAll() { setTool("select"); sel = { x: 0, y: 0, w: W, h: H }; over(); ac.disabled = false; }
  function cropTo() { const s = sel; if (!s || s.w < 2 || s.h < 2) { say(T("i_cropsel")); return; } snap(); const x = Math.round(s.x), y = Math.round(s.y); W = Math.round(s.w); H = Math.round(s.h);
    for (const L of layers) { L.x -= x; L.y -= y; } const B = layers[0]; if (B.x || B.y || B.c.width !== W || B.c.height !== H) { const n = mk(W, H); g2(n).drawImage(B.c, B.x, B.y); B.c = n; B.x = B.y = 0; }
    sel = null; ac.disabled = true; sizeAll(); dirty(); if (tool === "crop") say(""); }
  /* ----- pointer ----- */
  const pt = e => { const r = ov.getBoundingClientRect(); return { x: Math.max(-1e4, (e.clientX - r.left) * W / r.width), y: (e.clientY - r.top) * H / r.height }; };
  const inSel = p => { if (!sel) return false; if (!sel.path) return p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h; selPath(octx, sel); return octx.isPointInPath(p.x, p.y); };
  const SHAPES = new Set(["line", "rect", "box", "rrect", "ellipse", "tri", "star", "callout", "arrow", "blur", "redact"]);
  function down(e) { if (e.button > 2) return; e.preventDefault(); const p = pt(e), alt = e.button === 2; ov.setPointerCapture(e.pointerId); stage.focus({ preventScroll: true });
    if (tool === "picker") { const d = g2(flat()).getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data; (alt ? c2 : c1).value = hex2(d[0], d[1], d[2]); swatch(); return; }
    if (tool === "fill") { snap(); if (flood(p, alt ? c2.value : c1.value)) { render(); dirty(); } else undo.pop(); return; }
    if (tool === "text") { const s = prompt(T("typetext"), ""); if (!s) return; snap(); const L = AL(), g = LG(), sz = +fsz.value || 32; g.save(); g.fillStyle = alt ? c2.value : c1.value; g.textBaseline = "top";
      g.font = `${fI.getAttribute("aria-pressed") === "true" ? "italic " : ""}${fB.getAttribute("aria-pressed") === "true" ? "bold " : ""}${sz}px ${fontCss()}`; s.split("\\n").forEach((ln, i) => g.fillText(ln, p.x - L.x, p.y - L.y + i * sz * 1.25)); g.restore(); render(); dirty(); return; }
    if (tool === "move") { snap(); drag = { p, ox: AL().x, oy: AL().y, sx: sel && sel.x, sy: sel && sel.y }; return; }
    if (tool === "select" || tool === "lasso") { if (sel && inSel(p)) { snap(); lift(); drag = { mv: true, p, ox: AL().x, oy: AL().y, s0: { ...sel, path: sel.path && sel.path.map(q => ({ ...q })) } }; render(); return; }
      sel = null; ac.disabled = true; drag = { a: p, b: p, pts: [p] }; return; }
    if (tool === "crop") { sel = null; drag = { a: p, b: p }; return; }
    if (tool === "curve") { if (curve) { drag = { ctrl: p, alt }; return; } drag = { a: p, b: p, alt }; return; }
    if (SHAPES.has(tool)) { drag = { a: p, b: p, alt }; return; }
    snap(); drag = { last: p, alt }; stroke(LG(), p, { x: p.x + .01, y: p.y + .01 }, alt); render(); }
  function move(e) { const p = pt(e); lastXY = p; if (!drag) { status(); return; }
    if (drag.last) { stroke(LG(), drag.last, p, drag.alt); drag.last = p; render(); return; }
    if (tool === "move" || drag.mv) { const L = AL(), dx = Math.round(p.x - drag.p.x), dy = Math.round(p.y - drag.p.y); L.x = drag.ox + dx; L.y = drag.oy + dy;
      if (drag.mv) sel = { ...drag.s0, x: drag.s0.x + dx, y: drag.s0.y + dy, path: drag.s0.path && drag.s0.path.map(q => ({ x: q.x + dx, y: q.y + dy })) }; else if (sel && drag.sx != null) { sel.x = drag.sx + dx; sel.y = drag.sy + dy; } render(); return; }
    if (drag.ctrl) { drag.ctrl = p; over(g => drawShape(g, "curve", curve.a, curve.b, p, curve.alt)); return; }
    drag.b = p; if (drag.pts) drag.pts.push(p);
    if (tool === "lasso") { over(g => { g.save(); g.setLineDash([4, 3]); g.strokeStyle = "#000"; g.lineWidth = 1 / scale; g.beginPath(); drag.pts.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.stroke(); g.restore(); }); return; }
    if (tool === "select" || tool === "crop" || tool === "blur" || tool === "redact") { over(g => { g.save(); g.setLineDash([5, 4]); g.lineWidth = Math.max(1, 1 / scale); g.strokeStyle = tool === "redact" ? "#000" : "#2563eb"; if (tool === "redact") { g.fillStyle = "rgba(0,0,0,.5)"; shapePath(g, "rect", drag.a, p); g.fill(); } shapePath(g, "rect", drag.a, p); g.stroke(); g.restore(); }); return; }
    over(g => drawShape(g, tool, drag.a, p, null, drag.alt)); }
  function up() { const d = drag; drag = null; if (!d) return;
    if (d.last || tool === "move" || d.mv) { dirty(); over(); return; }
    if (d.ctrl) { snap(); const L = AL(), g = LG(); g.save(); g.translate(-L.x, -L.y); drawShape(g, "curve", curve.a, curve.b, d.ctrl, curve.alt); g.restore(); curve = null; render(); dirty(); say(""); return; }
    const a = d.a, b = d.b, x = Math.max(0, Math.round(Math.min(a.x, b.x))), y = Math.max(0, Math.round(Math.min(a.y, b.y))), w = Math.round(Math.min(W, Math.max(a.x, b.x)) - x), hh = Math.round(Math.min(H, Math.max(a.y, b.y)) - y);
    if (tool === "lasso") { if (d.pts.length > 2) { const xs = d.pts.map(q => q.x), ys = d.pts.map(q => q.y); const x1 = Math.max(0, Math.min(...xs)), y1 = Math.max(0, Math.min(...ys)); sel = { x: Math.floor(x1), y: Math.floor(y1), w: Math.ceil(Math.min(W, Math.max(...xs)) - x1), h: Math.ceil(Math.min(H, Math.max(...ys)) - y1), path: d.pts }; ac.disabled = false; } over(); return; }
    if (tool === "select" || tool === "crop") { if (w >= 2 && hh >= 2) { sel = { x, y, w, h: hh }; ac.disabled = false; } over(); return; }
    if (tool === "curve") { if (Math.hypot(b.x - a.x, b.y - a.y) < 2) { over(); return; } curve = { a, b, alt: d.alt }; over(g => drawShape(g, "curve", a, b, null, d.alt)); say(T("i_curvehint")); return; }
    if ((tool === "blur" || tool === "redact") && (w < 2 || hh < 2)) { over(); return; }
    snap(); const L = AL(), g = LG(); g.save(); g.translate(-L.x, -L.y);
    if (tool === "redact") { g.fillStyle = "#000"; g.fillRect(x, y, w, hh); }
    else if (tool === "blur") { const f = flat(), sm = mk(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(hh / 12))); g2(sm).drawImage(f, x, y, w, hh, 0, 0, sm.width, sm.height); g.save(); g.beginPath(); g.rect(x, y, w, hh); g.clip(); g.filter = "blur(3px)"; g.imageSmoothingEnabled = true; g.drawImage(sm, x - 6, y - 6, w + 12, hh + 12); g.restore(); }
    else drawShape(g, tool, a, b, null, d.alt);
    g.restore(); render(); dirty(); }
  /* ----- whole-image transforms (layers are flattened first) ----- */
  function xform(nw, nh, fn) { snap(); const f = flat(); W = Math.max(1, Math.round(nw)); H = Math.max(1, Math.round(nh)); const L = newLayer(T("i_bg"), W, H), g = g2(L.c); fn(g, f); layers = [L]; act = 0; sel = null; sizeAll(); dirty(); }
  const rotate = dir => xform(H, W, (g, f) => { g.translate(dir > 0 ? f.height : 0, dir > 0 ? 0 : f.width); g.rotate(dir * Math.PI / 2); g.drawImage(f, 0, 0); });
  const rot180 = () => xform(W, H, (g, f) => { g.translate(f.width, f.height); g.rotate(Math.PI); g.drawImage(f, 0, 0); });
  const flip = hz => xform(W, H, (g, f) => { g.translate(hz ? f.width : 0, hz ? 0 : f.height); g.scale(hz ? -1 : 1, hz ? 1 : -1); g.drawImage(f, 0, 0); });
  function resize() { const w = Math.max(1, Math.min(10000, parseInt(rw.value) || 0)), hh = Math.max(1, Math.min(10000, parseInt(rh.value) || 0)); if (w === W && hh === H) return; xform(w, hh, (g, f) => { g.imageSmoothingQuality = "high"; g.drawImage(f, 0, 0, w, hh); }); }
  function skew() { const ax = (parseFloat(prompt(T("i_skewx"), "0")) || 0) * Math.PI / 180, ay = (parseFloat(prompt(T("i_skewy"), "0")) || 0) * Math.PI / 180; if (!ax && !ay) return;
    const tx = Math.tan(Math.max(-1.4, Math.min(1.4, ax))), ty = Math.tan(Math.max(-1.4, Math.min(1.4, ay))); const nw = W + Math.abs(tx) * H, nh = H + Math.abs(ty) * W;
    xform(nw, nh, (g, f) => { g.fillStyle = c2.value; g.fillRect(0, 0, nw, nh); g.setTransform(1, ty, tx, 1, tx < 0 ? -tx * f.height : 0, ty < 0 ? -ty * f.width : 0); g.drawImage(f, 0, 0); }); }
  function canvasSize() { const w = parseInt(prompt(T("width"), String(W))), hh = parseInt(prompt(T("height"), String(H))); if (!(w > 0 && hh > 0) || (w === W && hh === H)) return; snap();
    W = Math.min(10000, w); H = Math.min(10000, hh); const B = layers[0], n = mk(W, H), g = g2(n); if (!transp.checked) { g.fillStyle = c2.value; g.fillRect(0, 0, W, H); } g.clearRect(B.x, B.y, B.c.width, B.c.height); g.drawImage(B.c, B.x, B.y); B.c = n; B.x = B.y = 0; sel = null; sizeAll(); dirty(); }
  /* ----- filters on the active layer (inside the selection when there is one) ----- */
  function filt(kind) { snap(); const L = AL(), g = LG(), w = L.c.width, hh = L.c.height, src = clone(L.c), out = mk(w, hh), og = g2(out);
    if (kind === "soft") { og.filter = "blur(2px)"; og.drawImage(src, 0, 0); }
    else { const im = g2(src).getImageData(0, 0, w, hh), d = im.data;
      if (kind === "grey") for (let i = 0; i < d.length; i += 4) { const v = Math.round(d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114); d[i] = d[i + 1] = d[i + 2] = v; }
      else if (kind === "invert") for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; }
      else if (kind === "sharpen") { const s = new Uint8ClampedArray(d); for (let y = 1; y < hh - 1; y++) for (let x = 1; x < w - 1; x++) { const i = (y * w + x) * 4; for (let c = 0; c < 3; c++) d[i + c] = 5 * s[i + c] - s[i - 4 + c] - s[i + 4 + c] - s[i - w * 4 + c] - s[i + w * 4 + c]; } }
      og.putImageData(im, 0, 0); }
    g.save(); if (sel) { selPath(g, sel, L.x, L.y); g.clip(); } g.clearRect(0, 0, w, hh); g.drawImage(out, 0, 0); g.restore(); render(); dirty(); }
  /* remove a plain background: flood from the four corners to transparent (on the active layer) */
  function removeBg() { snap(); const L = AL(), g = LG(), w = L.c.width, hh = L.c.height, im = g.getImageData(0, 0, w, hh), d = im.data, k = Math.max(24, +tol.value || 0) * 4, seen = new Uint8Array(w * hh); let n = 0;
    for (const [sx, sy] of [[0, 0], [w - 1, 0], [0, hh - 1], [w - 1, hh - 1]]) { const i0 = (sy * w + sx) * 4; if (seen[sy * w + sx] || d[i0 + 3] === 0) continue; const t = [d[i0], d[i0 + 1], d[i0 + 2]]; const st = [sx, sy];
      while (st.length) { const y = st.pop(), x = st.pop(); if (x < 0 || y < 0 || x >= w || y >= hh) continue; const j = y * w + x; if (seen[j]) continue; const i = j * 4;
        if (Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) > k || d[i + 3] === 0) continue; seen[j] = 1; d[i + 3] = 0; n++; st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1); } }
    if (!n) { undo.pop(); return; } g.putImageData(im, 0, 0); render(); dirty(); }
  function preview() { cv.style.filter = (+bri.value !== 100 || +con.value !== 100) ? `brightness(${bri.value}%) contrast(${con.value}%)` : ""; }
  function applyAdj() { if (+bri.value === 100 && +con.value === 100) return; snap(); for (const L of layers) { const s = clone(L.c), g = g2(L.c); g.clearRect(0, 0, L.c.width, L.c.height); g.filter = `brightness(${bri.value}%) contrast(${con.value}%)`; g.drawImage(s, 0, 0); g.filter = "none"; } bri.value = con.value = 100; preview(); render(); dirty(); }
  /* ----- paste ----- */
  async function pasteSrc(src) { const st = ED.st.image; const fresh = !st.file && !st.dirty && layers.length === 1 && !undo.length;
    if (fresh) { setDoc(src.width, src.height, g => g.drawImage(src, 0, 0)); st.name = shotName(); ED.label("image"); dirty(); say(fmt(T("i_pasted_new"), st.name)); setTool("select"); return; }
    snap(); if (src.width > W || src.height > H) { const nw = Math.max(W, src.width), nh = Math.max(H, src.height); const B = layers[0], n = mk(nw, nh), g = g2(n); g.fillStyle = c2.value; g.fillRect(0, 0, nw, nh); g.drawImage(B.c, B.x, B.y); B.c = n; B.x = B.y = 0; W = nw; H = nh; }
    const sc = stage.getBoundingClientRect(), br = ov.getBoundingClientRect(); const vx = Math.max(0, Math.round((sc.left - br.left) / scale)), vy = Math.max(0, Math.round((sc.top - br.top) / scale));
    const L = newLayer(T("i_paste") + " " + layers.length, src.width, src.height, Math.min(vx, W - src.width), Math.min(vy, H - src.height)); g2(L.c).drawImage(src, 0, 0); layers.push(L); act = layers.length - 1;
    sizeAll(); setTool("move"); sel = { x: L.x, y: L.y, w: src.width, h: src.height }; over(); dirty(); say(T("i_pasted")); }
  async function pasteBlob(b) { const bmp = await createImageBitmap(b); await pasteSrc(bmp); }
  async function pasteBtn() { try { const items = await navigator.clipboard.read(); for (const it of items) { const ty = it.types.find(t => t.startsWith("image/")); if (ty) { await pasteBlob(await it.getType(ty)); return; } } if (clip) { await pasteSrc(clip); return; } say(T("i_noclip")); }
    catch (e) { if (clip) await pasteSrc(clip); else say(T("i_clipblock")); } }
  function onPaste(e) { if (ED.tab !== "image" || !stage || stage.closest("[hidden]")) return; const t = e.target; if (t && t.closest && t.closest("input,textarea,select,[contenteditable=true]")) return;
    const it = [...(e.clipboardData ? e.clipboardData.items : [])].find(i => i.kind === "file" && i.type.startsWith("image/")); e.preventDefault();
    if (it) pasteBlob(it.getAsFile()); else if (clip) pasteSrc(clip); else say(T("i_noclip")); }
  /* ----- tools ----- */
  function setTool(t) { if (t === "box") t = "rect"; if (t === "pen") t = "brush"; tool = t; curve = null; for (const b of document.querySelectorAll("[data-im-tool]")) b.setAttribute("aria-pressed", String(b.dataset.imTool === t || (t === "rect" && b.dataset.imTool === "box") || (t === "brush" && b.dataset.imTool === "pen")));
    if (t !== "select" && t !== "lasso" && t !== "crop" && t !== "move") { sel = null; ac.disabled = true; } if (t === "crop") { sel = null; ac.disabled = true; }
    ov.style.cursor = t === "move" ? "move" : t === "picker" ? "copy" : t === "text" ? "text" : "crosshair";
    say(t === "crop" ? T("i_cropsel") : t === "curve" ? T("i_curvetip") : ""); over(); }
  const fontCss = () => { const f = (ED.FONTS || []).find(x => x[0] === fontSel.value); return f ? f[1] : fontSel.value + ", sans-serif"; };
  function swatch() { const s = document.getElementById("im-sw"); if (s) { s.style.setProperty("--c1", c1.value); s.style.setProperty("--c2", c2.value); } }
  let transp;
  const B = (id, label, title, fn, extra = {}) => h("button", { type: "button", class: "wd-b", id, title, "aria-label": title, onmousedown: e => e.preventDefault(), onclick: fn, ...extra }, label);
  const TB = (k, ic, key) => B("im-t-" + k, ic, T(key), () => setTool(k), { "data-im-tool": k, "aria-pressed": "false" });
  const sep = () => h("span", { class: "sep" });
  const pick = (id, title, opts, fn) => { const s = h("select", { id, title, "aria-label": title, class: "wd-sel" }, ...opts.map(([v, l]) => h("option", { value: v }, l))); s.addEventListener("change", () => fn(s.value, s)); return s; };
  function key(e) { if (ED.tab !== "image" || !stage || stage.closest("[hidden]")) return; const t = e.target; if (t && t.closest && t.closest("input,textarea,select,[contenteditable=true],dialog")) return;
    const c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (c && k === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); } else if (c && k === "y") { e.preventDefault(); doRedo(); }
    else if (c && k === "c") { if (sel) { e.preventDefault(); copySel(); } } else if (c && k === "x") { if (sel) { e.preventDefault(); cutSel(); } }
    else if (c && k === "a") { e.preventDefault(); selAll(); } else if ((k === "delete" || k === "backspace") && sel) { e.preventDefault(); delSel(); }
    else if (k === "escape") { sel = null; curve = null; drag = null; ac.disabled = true; over(); }
    else if (c && (k === "=" || k === "+")) { e.preventDefault(); zoomTo(scale * 1.25); } else if (c && k === "-") { e.preventDefault(); zoomTo(scale / 1.25); } }
  function zoomTo(s) { zoom = String(Math.max(.1, Math.min(8, s))); zoomSel.value = Math.round(+zoom * 100); applyZoom(); over(); }
  return {
    init(body) {
      c1 = h("input", { type: "color", id: "im-color", value: "#e11d48", title: T("i_c1"), "aria-label": T("i_c1"), oninput: swatch }); c2 = h("input", { type: "color", id: "im-color2", value: "#ffffff", title: T("i_c2"), "aria-label": T("i_c2"), oninput: swatch });
      lw = h("input", { type: "number", id: "im-lw", min: "1", max: "100", value: "4", title: T("i_size"), "aria-label": T("i_size"), class: "im-num" });
      tol = h("input", { type: "range", id: "im-tol", min: "0", max: "120", value: "24", title: T("i_tolerance"), "aria-label": T("i_tolerance") });
      fontSel = pick("im-font", T("i_font"), (ED.FONTS || [["Arial"]]).map(f => [f[0], f[0]]), () => {}); fontSel.value = "Arial";
      fsz = h("input", { type: "number", id: "im-fsz", min: "6", max: "400", value: "32", class: "im-num", title: T("i_size"), "aria-label": T("i_font") + " " + T("i_size") });
      fB = B("im-fb", "B", T("i_bold"), () => fB.setAttribute("aria-pressed", String(fB.getAttribute("aria-pressed") !== "true")), { "aria-pressed": "false", style: "font-weight:700" });
      fI = B("im-fi", "I", T("i_italic"), () => fI.setAttribute("aria-pressed", String(fI.getAttribute("aria-pressed") !== "true")), { "aria-pressed": "false", style: "font-style:italic" });
      bri = h("input", { type: "range", id: "im-bri", min: "20", max: "200", value: "100", oninput: preview, "aria-label": T("bright") }); con = h("input", { type: "range", id: "im-con", min: "20", max: "200", value: "100", oninput: preview, "aria-label": T("contrast") });
      rw = h("input", { type: "number", id: "im-w", class: "im-num", min: "1", "aria-label": T("width") }); rh = h("input", { type: "number", id: "im-h", class: "im-num", min: "1", "aria-label": T("height") }); keep = h("input", { type: "checkbox", id: "im-keep", checked: true, title: "Keep ratio" });
      pctIn = h("input", { type: "number", id: "im-pct", class: "im-num", min: "1", max: "1000", value: "100", title: T("i_pct"), "aria-label": T("i_pct") });
      rw.addEventListener("input", () => { if (keep.checked) rh.value = Math.round(rw.value * H / W); }); rh.addEventListener("input", () => { if (keep.checked) rw.value = Math.round(rh.value * W / H); });
      pctIn.addEventListener("input", () => { rw.value = Math.max(1, Math.round(W * pctIn.value / 100)); rh.value = Math.max(1, Math.round(H * pctIn.value / 100)); });
      transp = h("input", { type: "checkbox", id: "im-transp", title: "Transparent" });
      ac = B("im-applycrop", "✂ " + T("applycrop"), T("applycrop"), cropTo, { disabled: true });
      const brushSel = pick("im-brush", T("i_brush"), [["round", "🖌 " + T("i_b_round")], ["marker", "▮ " + T("i_b_marker")], ["calli", "✒ " + T("i_b_calli")], ["spray", "∴ " + T("i_b_spray")]], v => { brush = v; setTool("brush"); });
      const modeSel = pick("im-mode", T("i_outline"), [["outline", "▢ " + T("i_outline")], ["filled", "■ " + T("i_filled")], ["both", "▣ " + T("i_both")]], v => { mode = v; });
      const pal = h("div", { class: "im-pal", role: "group", "aria-label": "Palette" }, ...PALETTE.map(c => h("button", { type: "button", class: "im-pc", style: "background:" + c, title: c, "aria-label": c, "data-c": c, onmousedown: e => e.preventDefault(), onclick: () => { c1.value = c; swatch(); }, oncontextmenu: e => { e.preventDefault(); c2.value = c; swatch(); } })));
      zoomSel = h("input", { type: "range", id: "im-zoom", min: "10", max: "800", value: "100", title: T("i_zoom"), "aria-label": T("i_zoom"), oninput: () => { zoom = String(zoomSel.value / 100); applyZoom(); over(); } });
      gridChk = h("input", { type: "checkbox", id: "im-grid", onchange: () => applyZoom() }); rulerChk = h("input", { type: "checkbox", id: "im-ruler", onchange: () => applyZoom() });
      const r1 = h("div", { class: "ed-tool", role: "toolbar", "aria-label": "Edit" },
        B("im-undo", "↶", T("undo"), doUndo), B("im-redo", "↷", T("redo"), doRedo), sep(),
        B("im-paste", "📋 " + T("i_paste"), T("i_paste") + " (Ctrl+V)", pasteBtn), B("im-copy", "⧉", T("i_copy"), copySel), B("im-cut", "✂", T("i_cut"), cutSel), B("im-del", "⌫", T("i_del"), delSel), B("im-selall", "⬚*", T("i_selall"), selAll), sep(),
        TB("select", "⬚", "i_select"), TB("lasso", "➰", "i_lasso"), TB("move", "✥", "i_move"), TB("crop", "⛶ " + T("crop"), "crop"), ac, sep(),
        TB("pencil", "✏", "i_pencil"), B("im-t-pen", "🖌 " + T("pen"), T("i_brush"), () => setTool("brush"), { "data-im-tool": "pen", "aria-pressed": "true" }), brushSel, TB("eraser", "▱", "i_eraser"), TB("fill", "🪣", "i_fill"), TB("picker", "💧", "i_picker"),
        TB("text", "T " + T("text"), "text"), fontSel, fsz, fB, fI);
      const r2 = h("div", { class: "ed-tool", role: "toolbar", "aria-label": "Shapes" },
        TB("line", "╱", "i_line"), TB("curve", "∿", "i_curve"), B("im-t-box", "▭ " + T("box"), T("i_rect"), () => setTool("rect"), { "data-im-tool": "box", "aria-pressed": "false" }), TB("rrect", "▢", "i_rrect"), TB("ellipse", "◯", "i_ellipse"), TB("tri", "△", "i_tri"),
        TB("arrow", "➚ " + T("arrow"), "arrow"), TB("star", "☆", "i_star"), TB("callout", "💬", "i_callout"), modeSel, sep(),
        h("span", { class: "im-sw", id: "im-sw", title: T("i_c1") + " / " + T("i_c2") }), c1, c2, B("im-swap", "⇄", T("i_swap"), () => { [c1.value, c2.value] = [c2.value, c1.value]; swatch(); }), pal, sep(),
        h("label", { class: "ed-chk", for: "im-lw" }, T("i_size")), lw, h("label", { class: "ed-chk", for: "im-tol", title: T("i_tolerance") }, "🪣±"), tol);
      const r3 = h("div", { class: "ed-tool", role: "toolbar", "aria-label": "Image" },
        B("im-rotl", "⟲", T("rotl"), () => rotate(-1)), B("im-rotr", "⟳", T("rotr"), () => rotate(1)), B("im-rot180", "↻180", T("i_rot180"), rot180), B("im-fliph", "⇋", T("i_flipH"), () => flip(true)), B("im-flipv", "⇵", T("i_flipV"), () => flip(false)), sep(),
        h("label", { class: "ed-chk" }, T("resize") + " "), rw, "×", rh, h("label", { class: "ed-chk", title: "Keep ratio" }, keep, "🔗"), pctIn, "%", B("im-resize", T("apply"), T("resize"), resize), B("im-skew", "⧄ " + T("i_skew"), T("i_skew"), skew), B("im-canvas", "⬒ " + T("i_canvas"), T("i_canvas"), canvasSize), sep(),
        B("im-grey", "◑", T("i_grey"), () => filt("grey")), B("im-sharpen", "◆", T("i_sharpen"), () => filt("sharpen")), B("im-soft", "◌", T("i_softblur"), () => filt("soft")), B("im-invert", "◐", T("i_invert"), () => filt("invert")),
        B("im-rmbg", "✂🖼 " + T("i_rmbg"), T("i_rmbg"), removeBg), TB("blur", "▦ " + T("i_blur"), "i_blur"), TB("redact", "■ " + T("i_redact"), "i_redact"), sep(),
        h("label", { class: "ed-chk", for: "im-bri" }, "☀"), bri, h("label", { class: "ed-chk", for: "im-con" }, "◐"), con, B("im-adj", T("apply"), T("apply"), applyAdj), h("label", { class: "ed-chk", title: T("i_transp") }, transp, " " + T("i_transp")));
      statEl = h("span", { class: "im-stat", id: "im-stat", role: "status" });
      const r4 = h("div", { class: "ed-tool im-view", "aria-label": "View" }, h("label", { class: "ed-chk", for: "im-zoom" }, "🔍 " + T("i_zoom")), zoomSel, B("im-fit", T("i_fit"), T("i_fit"), () => { zoom = "fit"; applyZoom(); zoomSel.value = Math.round(scale * 100); over(); }),
        B("im-z100", "100%", "100%", () => zoomTo(1)), h("label", { class: "ed-chk" }, gridChk, " " + T("i_grid")), h("label", { class: "ed-chk" }, rulerChk, " " + T("i_ruler")), statEl, h("span", { class: "im-hint" }, T("i_paste_hint")));
      cv = h("canvas", { class: "im-cv", id: "im-cv" }); ov = h("canvas", { class: "im-ov", id: "im-ov" }); gridEl = h("div", { class: "im-gridl", hidden: true });
      ov.addEventListener("pointerdown", down); ov.addEventListener("pointermove", move); ov.addEventListener("pointerup", up); ov.addEventListener("pointercancel", up); ov.addEventListener("contextmenu", e => e.preventDefault());
      ov.addEventListener("pointerleave", () => { lastXY = null; status(); }); ov.addEventListener("wheel", e => { if (e.ctrlKey) { e.preventDefault(); zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); } }, { passive: false });
      box = h("div", { class: "im-box" }, cv, ov, gridEl); rT = h("canvas", { class: "im-rt", hidden: true }); rL = h("canvas", { class: "im-rl", hidden: true });
      stage = h("div", { class: "im-stage", tabindex: "0", "aria-label": T("image") }, h("div", { class: "im-grid2" }, h("span", {}), rT, rL, box));
      layerBox = h("div", { class: "im-layers", id: "im-layers" });
      const side = h("aside", { class: "im-side", "aria-label": T("i_layers") }, h("b", {}, T("i_layers")), h("div", { class: "im-lbtn" }, B("im-addl", "＋", T("i_addl"), addLayer), B("im-dell", "🗑", T("i_dell"), delLayer), B("im-lup", "▲", T("i_up"), () => moveLayer(1)), B("im-ldn", "▼", T("i_down"), () => moveLayer(-1)), B("im-merge", "⤓", T("i_merge"), () => mergeDown()), B("im-flat", "▤", T("i_flat"), () => flatten())), layerBox);
      body.append(r1, r2, r3, r4, h("div", { class: "im-work" }, stage, side));
      ctx = g2(cv); octx = ov.getContext("2d");
      document.addEventListener("paste", onPaste); document.addEventListener("keydown", key);
      window.addEventListener("resize", () => { if (ED.tab === "image" && zoom === "fit") { applyZoom(); over(); } }); swatch(); css();
    },
    blank() { undo = []; redo = []; curExt = "png"; bri.value = con.value = 100; setDoc(1200, 800, g => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1200, 800); }); preview(); zoom = "fit"; setTool("brush"); },
    async load(buf, e) { const bmp = await createImageBitmap(new Blob([buf], { type: ED.MIME[e] || "image/png" })); undo = []; redo = []; curExt = e === "jpeg" ? "jpeg" : e; bri.value = con.value = 100; zoom = "fit"; setDoc(bmp.width, bmp.height, g => g.drawImage(bmp, 0, 0)); preview(); setTool("brush"); requestAnimationFrame(() => { applyZoom(); over(); }); },
    async export(e) { if (+bri.value !== 100 || +con.value !== 100) applyAdj(); let src = flat(); const mime = e === "jpg" || e === "jpeg" ? "image/jpeg" : e === "webp" ? "image/webp" : "image/png";
      if (mime === "image/jpeg") { const j = mk(W, H), g = g2(j); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.drawImage(src, 0, 0); src = j; }
      return { blob: await new Promise(r => src.toBlob(r, mime, 0.92)) }; },
    exts: () => [curExt, "png", "jpg", "jpeg", "webp"],
    fit: () => { if (zoom === "fit") { applyZoom(); over(); } },
    _api: () => ({ get W() { return W; }, get H() { return H; }, layers: () => layers, act: () => act, sel: () => sel, setSel: s => { sel = s; ac.disabled = !s; over(); }, flat, tool: () => tool, scale: () => scale, undoN: () => undo.length, pasteSrc })
  };
  function css() { if (document.getElementById("im-css")) return; document.head.append(h("style", { id: "im-css" }, `
.im-work { display: flex; gap: 8px; align-items: flex-start; }
.im-stage { flex: 1; min-width: 0; max-height: calc(100vh - 120px); min-height: 320px; overflow: auto; background: repeating-conic-gradient(#d9dce3 0 25%, #f3f4f7 0 50%) 0 0 / 20px 20px; border-radius: 8px; padding: 12px; outline: none; display: block; }
.im-stage:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
.im-grid2 { display: grid; grid-template-columns: auto auto; width: max-content; margin: 0 auto; }
.im-stage:not(.im-ruled) .im-grid2 > span { display: none; }
.im-stage:not(.im-ruled) .im-grid2 { grid-template-columns: auto; }
.im-box { position: relative; line-height: 0; } .im-box canvas.im-cv { display: block; box-shadow: 0 1px 4px rgba(0,0,0,.3); background: repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%) 0 0 / 16px 16px; }
.im-ov { position: absolute; left: 0; top: 0; cursor: crosshair; touch-action: none; }
.im-gridl { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(to right, rgba(0,0,0,.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.18) 1px, transparent 1px); }
.im-rt, .im-rl { display: block; }
.im-side { width: 170px; flex: none; border: 1px solid var(--line, #d0d5dd); border-radius: 8px; padding: 6px; font-size: 13px; display: flex; flex-direction: column; gap: 4px; }
.im-lbtn { display: flex; flex-wrap: wrap; gap: 2px; } .im-lbtn .wd-b { min-width: 24px; padding: 2px 4px; }
.im-lrow { display: flex; align-items: center; gap: 4px; padding: 3px 4px; border-radius: 4px; cursor: pointer; border: 1px solid transparent; } .im-lrow.on { background: color-mix(in srgb, var(--accent) 15%, transparent); border-color: var(--accent); }
.im-lrow span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.im-pal { display: grid; grid-template-columns: repeat(10, 14px); gap: 2px; } .im-pc { width: 14px; height: 14px; padding: 0; border: 1px solid #888; border-radius: 2px; cursor: pointer; }
.im-sw { position: relative; width: 28px; height: 26px; display: inline-block; } .im-sw::before, .im-sw::after { content: ""; position: absolute; width: 16px; height: 16px; border: 1px solid #555; }
.im-sw::after { left: 0; top: 0; background: var(--c1); z-index: 1; } .im-sw::before { right: 0; bottom: 0; background: var(--c2); }
#im-color, #im-color2 { width: 30px; height: 26px; padding: 0 2px; } #im-zoom { width: 140px; } #im-tol { width: 70px; }
.im-stat { font-size: 12px; color: var(--muted, #666); margin-left: 8px; font-variant-numeric: tabular-nums; } .im-hint { font-size: 12px; color: var(--muted, #666); margin-left: auto; }
[data-theme=dark] .im-stage { background: repeating-conic-gradient(#2a2f3a 0 25%, #1f232b 0 50%) 0 0 / 20px 20px; }
[data-theme=dark] .im-side { border-color: #3a4150; } [data-theme=dark] .im-gridl { background-image: linear-gradient(to right, rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.2) 1px, transparent 1px); }
@media (max-width: 900px) { .im-work { flex-direction: column; } .im-side { width: auto; } .im-hint { display: none; } }
`)); }
})();
})();
