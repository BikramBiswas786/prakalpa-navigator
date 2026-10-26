/* Drafting Desk Word: real pages (A4 / Letter / Legal, portrait or landscape) that the text flows across, Word fonts,
   full Home / Insert / Layout / Review tools, WordArt, shapes and text boxes, and a docx round trip that keeps
   fonts, sizes, colours, alignment, spacing, page setup, headers, footers and page breaks. Extends editors.js (window.BA_ED). */
(() => {
"use strict";
const ED = window.BA_ED; if (!ED || !ED.h) return;
const { h, T } = ED; const XE = ED.XE;
ED.addTX({
  en: { w_tsize: "Drag to resize the table", w_del: "Delete", w_cmt: "Comment", w_cmtq: "Comment on the selected text:", w_cmts: "Comments", w_track: "Track changes", w_acc: "Accept all changes", w_rej: "Reject all changes", w_cols: "Columns", w_col1: "One column", w_col2: "Two columns", w_col3: "Three columns", w_toc: "Table of contents", w_tocT: "Contents", w_selfirst: "Select some text first.", w_trackon: "Track changes is on: new text is green, deleted text is struck out.", w_trackoff: "Track changes is off.", w_nohead: "Add Heading 1–3 paragraphs first, then insert the contents.", w_wm: "Watermark", w_wmq: "Watermark text (empty to remove):", w_fn: "Footnote", w_fnq: "Footnote text:", w_fns: "Footnotes",
    w_font: "Font", w_size: "Size", w_style: "Style", w_grow: "Bigger text", w_shrink: "Smaller text", w_strike: "Strikethrough", w_sup: "Superscript", w_sub: "Subscript",
    w_hl: "Highlight", w_color: "Font colour", w_clear: "Clear formatting", w_case: "Change case", w_upper: "UPPER CASE", w_lower: "lower case", w_title: "Title Case",
    w_out: "Decrease indent", w_in: "Increase indent", w_ls: "Line spacing", w_border: "Paragraph border", w_hr: "Horizontal line", w_vl: "Vertical line", w_shape: "Shapes", w_tbox: "Text box",
    w_wa: "WordArt", w_link: "Link", w_sym: "Symbol", w_date: "Date", w_addpg: "+ Add page", w_setup: "Page setup", w_hf: "Header & footer", w_findr: "Find & replace",
    w_zoom: "Zoom", w_print: "Print", w_painter: "Format painter", w_painter_on: "Select text to paint the copied format onto it.", w_url: "Link address (https://…):",
    w_pgof: "Page {0} of {1}", w_words: "{0} words", w_chars: "{0} characters", w_pgsize: "Paper size", w_orient: "Orientation", w_port: "Portrait", w_land: "Landscape",
    w_margins: "Margins", w_normal: "Normal (2.54 cm)", w_narrow: "Narrow (1.27 cm)", w_moderate: "Moderate", w_wide: "Wide", w_custom: "Custom", w_top: "Top (mm)", w_bottom: "Bottom (mm)",
    w_left: "Left (mm)", w_right: "Right (mm)", w_header: "Header text", w_footer: "Footer text", w_pnum: "Page numbers", w_pnone: "None", w_pbot: "Bottom", w_ptop: "Top",
    w_palign: "Number position", w_ok: "OK", w_kind: "Shape", w_outline: "Outline", w_fill: "Fill", w_nofill: "No fill", w_lw: "Line width", w_text: "Text", w_preset: "Style",
    w_edit_obj: "Double-click a shape or WordArt to change it.", w_fit: "Page width", w_textin: "Text inside (callouts)", w_find_n: "{0} found", w_blank: "Blank page" },
  bn: { w_tsize: "টেবিলের মাপ বদলাতে টানুন", w_del: "মুছুন", w_cmt: "মন্তব্য", w_cmtq: "বাছাই করা লেখায় মন্তব্য:", w_cmts: "মন্তব্য", w_track: "পরিবর্তন ট্র্যাক", w_acc: "সব পরিবর্তন মেনে নিন", w_rej: "সব পরিবর্তন বাতিল", w_cols: "কলাম", w_col1: "এক কলাম", w_col2: "দুই কলাম", w_col3: "তিন কলাম", w_toc: "সূচিপত্র", w_tocT: "সূচিপত্র", w_selfirst: "আগে কিছু লেখা বাছুন।", w_trackon: "ট্র্যাক চালু: নতুন লেখা সবুজ, মোছা লেখা কাটা দাগে।", w_trackoff: "ট্র্যাক বন্ধ।", w_nohead: "আগে Heading 1–3 অনুচ্ছেদ দিন, তারপর সূচিপত্র।", w_wm: "জলছাপ", w_wmq: "জলছাপের লেখা (মুছতে ফাঁকা রাখুন):", w_fn: "পাদটীকা", w_fnq: "পাদটীকার লেখা:", w_fns: "পাদটীকা",
    w_font: "ফন্ট", w_size: "আকার", w_style: "শৈলী", w_grow: "লেখা বড়", w_shrink: "লেখা ছোট", w_strike: "কাটা দাগ", w_sup: "উপরে ছোট লেখা", w_sub: "নিচে ছোট লেখা",
    w_hl: "হাইলাইট", w_color: "লেখার রং", w_clear: "ফরম্যাট মুছুন", w_case: "অক্ষরের ধরন", w_upper: "বড় হাতের", w_lower: "ছোট হাতের", w_title: "প্রথম অক্ষর বড়",
    w_out: "ইনডেন্ট কমান", w_in: "ইনডেন্ট বাড়ান", w_ls: "লাইনের ফাঁক", w_border: "অনুচ্ছেদের বর্ডার", w_hr: "আনুভূমিক রেখা", w_vl: "খাড়া লাইন", w_shape: "আকৃতি", w_tbox: "টেক্সট বক্স",
    w_wa: "ওয়ার্ডআর্ট", w_link: "লিংক", w_sym: "চিহ্ন", w_date: "তারিখ", w_addpg: "+ পাতা যোগ", w_setup: "পাতার সেটআপ", w_hf: "হেডার ও ফুটার", w_findr: "খুঁজুন ও বদলান",
    w_zoom: "জুম", w_print: "প্রিন্ট", w_painter: "ফরম্যাট পেইন্টার", w_painter_on: "যে লেখায় ফরম্যাট বসাতে চান সেটি সিলেক্ট করুন।", w_url: "লিংকের ঠিকানা (https://…):",
    w_pgof: "পাতা {0} / {1}", w_words: "{0} শব্দ", w_chars: "{0} অক্ষর", w_pgsize: "কাগজের মাপ", w_orient: "দিক", w_port: "লম্বালম্বি", w_land: "আড়াআড়ি",
    w_margins: "মার্জিন", w_normal: "সাধারণ (২.৫৪ সেমি)", w_narrow: "সরু (১.২৭ সেমি)", w_moderate: "মাঝারি", w_wide: "চওড়া", w_custom: "নিজের মাপ", w_top: "উপরে (মিমি)", w_bottom: "নিচে (মিমি)",
    w_left: "বাঁয়ে (মিমি)", w_right: "ডাইনে (মিমি)", w_header: "হেডারের লেখা", w_footer: "ফুটারের লেখা", w_pnum: "পৃষ্ঠা নম্বর", w_pnone: "নেই", w_pbot: "নিচে", w_ptop: "উপরে",
    w_palign: "নম্বরের অবস্থান", w_ok: "ঠিক আছে", w_kind: "আকৃতি", w_outline: "রেখার রং", w_fill: "ভরাট", w_nofill: "ভরাট নয়", w_lw: "রেখার পুরুত্ব", w_text: "লেখা", w_preset: "শৈলী",
    w_edit_obj: "আকৃতি বা ওয়ার্ডআর্ট বদলাতে তাতে ডাবল-ক্লিক করুন।", w_fit: "পাতার প্রস্থ", w_textin: "ভেতরের লেখা (কলআউট)", w_find_n: "{0}টি পাওয়া গেছে", w_blank: "ফাঁকা পাতা" }
});

const FONTS = [["Calibri", "Calibri, Carlito, sans-serif"], ["Cambria", "Cambria, Caladea, serif"], ["Times New Roman", "'Times New Roman', Tinos, serif"], ["Arial", "Arial, Arimo, sans-serif"],
  ["Georgia", "Georgia, Gelasio, serif"], ["Verdana", "Verdana, 'DejaVu Sans', Arimo, sans-serif"], ["Courier New", "'Courier New', Cousine, monospace"],
  ["Noto Serif Bengali", "'Noto Serif Bengali', serif"], ["Noto Sans Bengali", "'Noto Sans Bengali', sans-serif"], ["Hind Siliguri", "'Hind Siliguri', sans-serif"], ["Tiro Bangla", "'Tiro Bangla', serif"],
  ["Kalpurush", "Kalpurush, 'Noto Serif Bengali', serif"], ["SolaimanLipi", "SolaimanLipi, 'Noto Sans Bengali', sans-serif"]];
const stackOf = name => { const f = FONTS.find(x => x[0].toLowerCase() === String(name).toLowerCase()); return f ? f[1] : `'${String(name).replace(/['"\\]/g, "")}', 'Noto Serif Bengali', serif`; };
const firstFont = css => String(css || "").split(",")[0].replace(/["']/g, "").trim();
if (!document.getElementById("wd-fonts")) document.head.append(h("link", { id: "wd-fonts", rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&family=Caladea:ital,wght@0,400;0,700;1,400;1,700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&family=Arimo:ital,wght@0,400;0,700;1,400;1,700&family=Gelasio:ital,wght@0,400;0,700;1,400;1,700&family=Cousine:wght@400;700&family=Noto+Sans+Bengali:wght@400;700&family=Noto+Serif+Bengali:wght@400;700&family=Hind+Siliguri:wght@400;700&family=Tiro+Bangla&display=swap" }));

const SIZES = { A4: [210, 297], Letter: [215.9, 279.4], Legal: [215.9, 355.6] };
const MARG = { normal: [25.4, 25.4, 25.4, 25.4], narrow: [12.7, 12.7, 12.7, 12.7], moderate: [25.4, 19.05, 25.4, 19.05], wide: [25.4, 50.8, 25.4, 50.8] };
const PX = mm => mm * 96 / 25.4, GAP = 24;
const DEF = { w: 210, h: 297, mt: 25.4, mr: 25.4, mb: 25.4, ml: 25.4, header: "", footer: "", pnum: false, pnumPos: "bottom", pnumAlign: "center", font: "Calibri", size: 11, line: 0, wm: "", pbd: "", pbw: 1.5, pbc: "#000000" };
const pg = { ...DEF };
const geo = () => ({ W: PX(pg.w), H: PX(pg.h), mt: PX(pg.mt), mr: PX(pg.mr), mb: PX(pg.mb), ml: PX(pg.ml) });

const css = `
.wd-tool { flex-wrap: wrap; row-gap: 6px; }
.wd-tool select { height: 30px; } .wd-tool .wd-grp { display: inline-flex; gap: 3px; align-items: center; }
.wd-tool input[type=color] { width: 30px; height: 30px; padding: 1px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); }
.wd-desk { position: relative; }
.wd-zoomw { margin: 0 auto; position: relative; }
.wd-stack { position: relative; transform-origin: 0 0; }
.wd-bg { position: absolute; left: 0; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.25); pointer-events: none; }
.wd-bg .wd-hd, .wd-bg .wd-ft { position: absolute; font: 9pt Calibri, Carlito, sans-serif; color: #555; white-space: pre; overflow: hidden; display: flex; gap: 12px; }
.wd-bg .wd-hd span, .wd-bg .wd-ft span { flex: 1; }
.wd-bg .wd-wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font: bold 96px Calibri, Carlito, sans-serif; color: rgba(150,150,150,.22); transform: rotate(-35deg); white-space: nowrap; overflow: hidden; }
.wd-page span.wd-cmt { background: #fff2a8; border-bottom: 2px solid #e0b800; }
.wd-page ins.wd-ins { color: #1a7f37; text-decoration: underline; } .wd-page del.wd-del { color: #c00000; text-decoration: line-through; }
.wd-page .wd-cols { column-rule: 1px solid transparent; } .wd-page .wd-toc { border-bottom: 1px solid #ccc; margin-bottom: .6em; } .wd-page .wd-toc p { margin: 0 0 .2em; }
.wd-page sup.wd-fn { color: #1f3864; font-weight: bold; }
.wd-cmts { margin: 6px 0; padding: 8px 10px; border: 1px solid var(--line, #ccc); border-radius: 8px; font-size: 13px; display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow: auto; }
.wd-cmts[hidden] { display: none; } .wd-cmtrow { display: flex; gap: 6px; align-items: baseline; } .wd-cmtq { font-style: italic; opacity: .8; }
#wd-track[aria-pressed="true"] { background: #1a7f37; color: #fff; }
.wd-desk .wd-page { position: relative; width: auto; max-width: none; min-height: 0; margin: 0; background: transparent; box-shadow: none; box-sizing: border-box; line-height: 1.15; }
.wd-page p { margin: 0 0 8pt; } .wd-page li { margin: 0; }
.wd-page div.wd-vline { width: 0; height: 160px; border-left: 2px solid #000; margin: 4pt 0; padding: 0 4px 0 0; cursor: move; }
.wd-page hr.wd-hr { border: 0; border-top: 1.5px solid #000; margin: 4pt 0 8pt; padding: 3px 0; background-clip: content-box; cursor: move; }
.wd-selbox { position: absolute; border: 1px dashed #1f6feb; z-index: 6; cursor: move; box-sizing: border-box; }
.wd-hnd { position: absolute; width: 9px; height: 9px; background: #fff; border: 1.5px solid #1f6feb; border-radius: 2px; }
.wd-hd-nw { left: -5px; top: -5px; cursor: nwse-resize; } .wd-hd-n { left: calc(50% - 5px); top: -5px; cursor: ns-resize; } .wd-hd-ne { right: -5px; top: -5px; cursor: nesw-resize; }
.wd-hd-e { right: -5px; top: calc(50% - 5px); cursor: ew-resize; } .wd-hd-se { right: -5px; bottom: -5px; cursor: nwse-resize; } .wd-hd-s { left: calc(50% - 5px); bottom: -5px; cursor: ns-resize; }
.wd-hd-sw { left: -5px; bottom: -5px; cursor: nesw-resize; } .wd-hd-w { left: -5px; top: calc(50% - 5px); cursor: ew-resize; }
.wd-objbar { position: absolute; left: 0; top: -38px; display: flex; gap: 4px; align-items: center; background: #fff; color: #111; border: 1px solid #bbb; border-radius: 6px; padding: 3px 6px; font-size: 12px; white-space: nowrap; cursor: default; box-shadow: 0 2px 6px rgba(0,0,0,.15); }
.wd-thnd { position: absolute; width: 9px; height: 9px; background: #1f6feb; z-index: 6; cursor: nwse-resize; }
.wd-page img { cursor: move; }
.wd-page hr.ed-pb { margin: 6px 0; }
.wd-page .wd-tbox { display: block; border: 1.5px solid #333; padding: 6px 10px; margin: 0 0 8pt; width: 60%; min-height: 2em; }
.wd-page img.wd-obj { cursor: pointer; vertical-align: middle; } .wd-page img.wd-obj:hover { outline: 2px dashed var(--accent, #2563eb); }
.wd-page a { color: #0563c1; }
.wd-status { display: flex; gap: 16px; font-size: .8rem; color: var(--muted, #555); padding: 4px 2px 0; flex-wrap: wrap; }
.wd-find { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 4px 0; } .wd-find[hidden] { display: none; }
dialog.wd-dlg { border: 1px solid var(--line); border-radius: 10px; padding: 16px; background: var(--surface, #fff); color: var(--ink, #111); max-width: 520px; }
dialog.wd-dlg label { display: grid; grid-template-columns: 150px 1fr; gap: 8px; align-items: center; margin: 6px 0; font-size: .9rem; }
dialog.wd-dlg .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
.wd-pop { position: absolute; z-index: 30; background: var(--surface, #fff); border: 1px solid var(--line); border-radius: 8px; padding: 6px; display: grid; grid-template-columns: repeat(10, 28px); gap: 3px; box-shadow: 0 4px 14px rgba(0,0,0,.18); }
.wd-pop button { height: 28px; border: 1px solid var(--line); background: var(--surface); border-radius: 4px; cursor: pointer; font-size: 15px; }`;
document.head.append(h("style", { id: "wd-css" }, css));

/* ---- WordArt and shapes are drawn as pictures, so Word shows them exactly as here ---- */
const WA = { gradient: "Gradient", outline: "Outline", shadow: "Shadow", gold: "Gold", "3d": "3-D", arcup: "Arch up", arcdown: "Arch down", wave: "Wave" };
function drawWordArt(o) {
  const S = 2, fs = Math.max(12, Math.min(160, +o.size || 48)), font = `bold ${fs * S}px ${stackOf(o.font || "Arial")}`;
  const c = document.createElement("canvas"), g = c.getContext("2d"); g.font = font;
  const text = String(o.text || "WordArt").slice(0, 200), tw = g.measureText(text).width, pad = fs * S * 0.4;
  const curve = o.preset === "arcup" || o.preset === "arcdown", wave = o.preset === "wave";
  c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(fs * S * (curve ? 2.1 : wave ? 1.9 : 1.5) + pad);
  g.font = font; g.textBaseline = "middle"; g.textAlign = "center"; g.lineJoin = "round";
  const c1 = o.c1 || "#1f6feb", c2 = o.c2 || "#9b2fe0"; let fill = c1;
  if (o.preset === "gradient" || curve || wave) { const gr = g.createLinearGradient(0, 0, c.width, c.height); gr.addColorStop(0, c1); gr.addColorStop(1, c2); fill = gr; }
  if (o.preset === "gold") { const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, "#fff2b0"); gr.addColorStop(.45, "#d4a017"); gr.addColorStop(.55, "#a87400"); gr.addColorStop(1, "#ffe27a"); fill = gr; }
  const paint = (ch, x, y) => {
    if (o.preset === "shadow") { g.shadowColor = "rgba(0,0,0,.45)"; g.shadowBlur = 6 * S; g.shadowOffsetX = 4 * S; g.shadowOffsetY = 4 * S; }
    if (o.preset === "3d") { g.fillStyle = c2; for (let i = 6; i > 0; i--) g.fillText(ch, x + i * S, y + i * S); }
    g.fillStyle = o.preset === "outline" ? "#ffffff" : fill; g.fillText(ch, x, y); g.shadowColor = "transparent";
    if (o.preset === "outline" || o.preset === "gold") { g.lineWidth = (o.preset === "gold" ? 1.2 : 2.5) * S; g.strokeStyle = o.preset === "gold" ? "#7a5200" : c1; g.strokeText(ch, x, y); }
  };
  if (curve || wave) {
    let x = pad;
    for (const ch of [...text]) { const w = g.measureText(ch).width, mid = x + w / 2, t = (mid - pad) / tw - .5;
      const y = curve ? c.height / 2 + (o.preset === "arcup" ? 1 : -1) * (t * t * 4 - .5) * fs * S * .55 : c.height / 2 + Math.sin(t * Math.PI * 2) * fs * S * .3;
      const ang = curve ? (o.preset === "arcup" ? 1 : -1) * t * 1.1 : Math.cos(t * Math.PI * 2) * .35;
      g.save(); g.translate(mid, y); g.rotate(ang); paint(ch, 0, 0); g.restore(); x += w; }
  } else paint(text, c.width / 2, c.height / 2);
  return { url: c.toDataURL("image/png"), w: Math.round(c.width / S), h: Math.round(c.height / S) };
}
const SHAPES = { rect: "Rectangle", round: "Rounded rectangle", ellipse: "Ellipse / circle", triangle: "Triangle", diamond: "Diamond", line: "Line", arrow: "Arrow", dblarrow: "Double arrow", star: "Star", callout: "Callout" };
function drawShape(o) {
  const S = 2, w = Math.max(10, Math.min(700, +o.w || 160)), hh = Math.max(4, Math.min(900, +o.h || 100)), lw = Math.max(0, Math.min(20, +o.lw || 0));
  const c = document.createElement("canvas"); c.width = (w + lw * 2 + 4) * S; c.height = (hh + lw * 2 + 4) * S; const g = c.getContext("2d"); g.scale(S, S); g.translate(lw + 2, lw + 2);
  g.lineWidth = lw; g.strokeStyle = o.stroke || "#1f3864"; g.fillStyle = o.fill && o.fill !== "none" ? o.fill : "transparent"; g.lineJoin = "round"; g.lineCap = "round";
  const done = () => { if (o.fill && o.fill !== "none") g.fill(); if (lw) g.stroke(); };
  const head = (x1, y1, x2, y2) => { const a = Math.atan2(y2 - y1, x2 - x1), L = Math.max(10, lw * 4); g.moveTo(x2, y2); g.lineTo(x2 - L * Math.cos(a - .45), y2 - L * Math.sin(a - .45)); g.moveTo(x2, y2); g.lineTo(x2 - L * Math.cos(a + .45), y2 - L * Math.sin(a + .45)); };
  const label = (bh) => { if (!o.text || /line|arrow/.test(o.kind)) return; g.fillStyle = o.stroke || "#1f3864"; g.font = `${Math.max(10, Math.min(28, bh / 3.2))}px ${stackOf(o.font || "Calibri")}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(o.text).slice(0, 80), w / 2, bh / 2, w - 12); };
  g.beginPath(); if (!lw && /line|arrow/.test(o.kind)) g.lineWidth = 2;
  switch (o.kind) {
    case "round": g.roundRect(0, 0, w, hh, Math.min(w, hh) * .18); done(); break;
    case "ellipse": g.ellipse(w / 2, hh / 2, w / 2, hh / 2, 0, 0, Math.PI * 2); done(); break;
    case "triangle": g.moveTo(w / 2, 0); g.lineTo(w, hh); g.lineTo(0, hh); g.closePath(); done(); break;
    case "diamond": g.moveTo(w / 2, 0); g.lineTo(w, hh / 2); g.lineTo(w / 2, hh); g.lineTo(0, hh / 2); g.closePath(); done(); break;
    case "line": g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); g.stroke(); break;
    case "arrow": g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); head(0, hh / 2, w, hh / 2); g.stroke(); break;
    case "dblarrow": g.moveTo(0, hh / 2); g.lineTo(w, hh / 2); head(0, hh / 2, w, hh / 2); head(w, hh / 2, 0, hh / 2); g.stroke(); break;
    case "star": for (let i = 0; i < 10; i++) { const r = i % 2 ? .4 : 1, a = -Math.PI / 2 + i * Math.PI / 5; g[i ? "lineTo" : "moveTo"](w / 2 + Math.cos(a) * w / 2 * r, hh / 2 + 2 + Math.sin(a) * hh / 2 * r); } g.closePath(); done(); break;
    case "callout": { const bh = hh * .75, r = Math.min(w, bh) * .15; g.moveTo(r, 0); g.arcTo(w, 0, w, bh, r); g.arcTo(w, bh, 0, bh, r); g.lineTo(w * .35, bh); g.lineTo(w * .18, hh); g.lineTo(w * .22, bh); g.arcTo(0, bh, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.closePath(); done(); label(bh); break; }
    default: g.rect(0, 0, w, hh); done();
  }
  if (o.kind !== "callout") label(hh);
  return { url: c.toDataURL("image/png"), w: Math.round(c.width / S), h: Math.round(c.height / S) };
}
ED.drawShape = drawShape; ED.drawWordArt = drawWordArt; ED.stackOf = stackOf; ED.FONTS = FONTS;

ED.kinds.word = (() => {
  let page, stack, bgs, zw, desk, fontSel, sizeSel, blockSel, imgIn, status, findBar, zoomSel, painter = null, zoom = 1, layoutT = 0;
  const dirty = () => { ED.dirty("word"); sched(); };
  const focusPage = () => { if (!page.contains(document.getSelection().anchorNode)) page.focus(); };
  const cmd = (c, v = null, css = false) => { focusPage(); document.execCommand("styleWithCSS", false, css); document.execCommand(c, false, v); dirty(); sync(); };
  const B = (id, label, title, fn, extra = {}) => h("button", { type: "button", class: "wd-b", id, title, "aria-label": title, onmousedown: e => e.preventDefault(), onclick: fn, ...extra }, label);
  const sep = () => h("span", { class: "sep" });
  let saved = null;
  const save = () => { const s = document.getSelection(); if (s.rangeCount && page.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
  const restore = () => { page.focus(); if (!saved) return; const s = document.getSelection(); s.removeAllRanges(); s.addRange(saved); };
  function selBlocks() {
    const s = document.getSelection(); if (!s.rangeCount || !page.contains(s.anchorNode)) return [];
    const r = s.getRangeAt(0);
    let list = [...page.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,blockquote,div.wd-tbox,pre")].filter(b => !(b.matches("blockquote,div.wd-tbox") && b.querySelector("p,h1,h2,h3,li")) && r.intersectsNode(b));
    if (!list.length) { document.execCommand("formatBlock", false, "<p>"); const n = document.getSelection().anchorNode; const b = n && (n.nodeType === 1 ? n : n.parentElement).closest("p,h1,h2,h3,h4,h5,h6,li"); if (b) list = [b]; }
    return list;
  }
  function setSize(pt) { focusPage(); document.execCommand("styleWithCSS", false, false); document.execCommand("fontSize", false, "7");
    for (const f of page.querySelectorAll('font[size="7"]')) { const s = document.createElement("span"); s.style.fontSize = pt + "pt"; while (f.firstChild) s.append(f.firstChild); f.replaceWith(s); } dirty(); }
  const curEl = () => { const n = document.getSelection().anchorNode; const el = n && (n.nodeType === 1 ? n : n.parentElement); return el && page.contains(el) ? el : null; };
  const curPt = () => { const el = curEl(); return el ? Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.75 * 2) / 2 : pg.size; };
  const STEPS = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
  function grow(d) { const p = curPt(); const n = d > 0 ? STEPS.find(s => s > p) || p + 4 : [...STEPS].reverse().find(s => s < p) || Math.max(1, p - 1); setSize(n); sync(); }
  function sync() {
    try { const v = (document.queryCommandValue("formatBlock") || "p").toLowerCase().replace(/[<>]/g, ""); blockSel.value = [...blockSel.options].some(o => o.value === v) ? v : "p"; } catch (e) {}
    for (const [b, c] of [["wd-b", "bold"], ["wd-i", "italic"], ["wd-u", "underline"], ["wd-s", "strikeThrough"], ["wd-sup", "superscript"], ["wd-sub", "subscript"], ["wd-ul", "insertUnorderedList"], ["wd-ol", "insertOrderedList"], ["wd-al", "justifyLeft"], ["wd-ac", "justifyCenter"], ["wd-ar", "justifyRight"], ["wd-aj", "justifyFull"]]) {
      const el = document.getElementById(b); if (el) { let v = false; try { v = document.queryCommandState(c); } catch (e) {} el.setAttribute("aria-pressed", String(!!v)); } }
    const el = curEl(); if (el) { const f = firstFont(getComputedStyle(el).fontFamily); const hit = FONTS.find(x => x[0].toLowerCase() === f.toLowerCase());
      if (hit) fontSel.value = hit[0]; else if (f) { if (![...fontSel.options].some(o => o.value === f)) fontSel.append(h("option", { value: f }, f)); fontSel.value = f; } }
    const p = curPt(); if (![...sizeSel.options].some(o => +o.value === p)) sizeSel.append(h("option", { value: p }, String(p))); sizeSel.value = String(p);
  }
  function insertHTML(html) { focusPage(); document.execCommand("styleWithCSS", false, false); document.execCommand("insertHTML", false, html); dirty(); }
  function insertBlock(el) { const n = (curEl() || page.lastElementChild); let top = n; while (top && top.parentElement !== page) top = top.parentElement;
    const after = h("p", {}, h("br")); if (top) top.after(el, after); else page.append(el, after);
    const r = document.createRange(); const tgt = el.querySelector("p") || after; r.selectNodeContents(tgt); if (tgt === after) r.collapse(true); const s = document.getSelection(); page.focus(); s.removeAllRanges(); s.addRange(r); dirty(); }
  function insTable() { const r = Math.max(1, Math.min(50, parseInt(prompt(T("trows"), "3")) || 0)), c = Math.max(1, Math.min(12, parseInt(prompt(T("tcols"), "3")) || 0)); if (!r || !c) return;
    insertHTML(`<table class="wd-tbl"><tbody>${Array.from({ length: r }, () => `<tr>${"<td><br></td>".repeat(c)}</tr>`).join("")}</tbody></table><p><br></p>`); }
  function indent(d) { const bl = selBlocks(); if (!bl.length) return; if (bl[0].tagName === "LI") return cmd(d > 0 ? "indent" : "outdent");
    for (const b of bl) { const v = Math.max(0, (parseFloat(b.style.marginLeft) || 0) + d * 48); b.style.marginLeft = v ? v + "px" : ""; } dirty(); }
  function lineSpace(v) { for (const b of selBlocks()) b.style.lineHeight = v; dirty(); }
  function border() { const bl = selBlocks(); if (!bl.length) return; const on = bl[0].style.borderTopStyle !== "solid";
    for (const b of bl) { b.style.border = on ? "1px solid #000" : ""; b.style.padding = on ? "4px 6px" : ""; } dirty(); }
  function changeCase(mode) { const s = document.getSelection(); if (!s.rangeCount || s.isCollapsed) return; const r = s.getRangeAt(0);
    const root = r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentNode : r.commonAncestorContainer;
    const it = document.createNodeIterator(root, NodeFilter.SHOW_TEXT); let n; const nodes = []; while ((n = it.nextNode())) if (r.intersectsNode(n)) nodes.push(n);
    const sc = r.startContainer, so = r.startOffset, ec = r.endContainer, eo = r.endOffset;
    for (const t of nodes) { const a = t === sc ? so : 0, b = t === ec ? eo : t.length; const mid = t.nodeValue.slice(a, b);
      const out = mode === "upper" ? mid.toUpperCase() : mode === "lower" ? mid.toLowerCase() : mid.toLowerCase().replace(/(^|\s)(\S)/g, (m, sp, ch) => sp + ch.toUpperCase());
      t.nodeValue = t.nodeValue.slice(0, a) + out + t.nodeValue.slice(b); }
    try { const r2 = document.createRange(); r2.setStart(sc, so); r2.setEnd(ec, eo); s.removeAllRanges(); s.addRange(r2); } catch (e) {}
    dirty(); }
  function startPainter() { const el = curEl(); if (!el) return; const cs = getComputedStyle(el);
    painter = { font: firstFont(cs.fontFamily), size: Math.round(parseFloat(cs.fontSize) * .75 * 2) / 2, b: document.queryCommandState("bold"), i: document.queryCommandState("italic"), u: document.queryCommandState("underline"), color: cs.color };
    document.getElementById("wd-fp").setAttribute("aria-pressed", "true"); ED.say("word", T("w_painter_on")); }
  function applyPainter() { if (document.getSelection().isCollapsed) return; const p = painter; painter = null; document.getElementById("wd-fp").setAttribute("aria-pressed", "false"); ED.say("word", "");
    document.execCommand("removeFormat"); document.execCommand("styleWithCSS", false, true); document.execCommand("fontName", false, stackOf(p.font)); document.execCommand("foreColor", false, p.color);
    document.execCommand("styleWithCSS", false, false); for (const [k, c] of [["b", "bold"], ["i", "italic"], ["u", "underline"]]) if (p[k] !== document.queryCommandState(c)) document.execCommand(c);
    setSize(p.size); sync(); }

  function dialog(title, fields, onOk) {
    const d = h("dialog", { class: "wd-dlg" }, h("h3", { style: "margin:0 0 8px" }, title), ...fields,
      h("div", { class: "row" }, h("button", { type: "button", class: "btn ghost", onclick: () => d.close() }, T("cancel")), h("button", { type: "button", class: "btn", id: "wd-dlg-ok", onclick: () => { d.close(); onOk(); } }, T("w_ok"))));
    d.addEventListener("close", () => d.remove()); document.body.append(d); d.showModal(); return d; }
  const L = (label, el) => h("label", {}, h("span", {}, label), el);
  const sel = (id, opts, v) => h("select", { id }, ...Object.entries(opts).map(([k, t]) => h("option", { value: k, selected: k === String(v) }, t)));
  const num = (id, v, step = "0.1") => h("input", { id, type: "number", step, value: String(+(+v).toFixed(2)), style: "width:110px" });
  function pageSetup() {
    const cur = Object.keys(SIZES).find(k => { const [a, b] = SIZES[k]; return (Math.abs(a - pg.w) < 1 && Math.abs(b - pg.h) < 1) || (Math.abs(b - pg.w) < 1 && Math.abs(a - pg.h) < 1); }) || "A4";
    const mk = Object.keys(MARG).find(k => MARG[k].every((v, i) => Math.abs(v - [pg.mt, pg.mr, pg.mb, pg.ml][i]) < .2)) || "custom";
    const fs = sel("wd-ps-size", { A4: "A4 (210 × 297 mm)", Letter: "Letter (8.5 × 11 in)", Legal: "Legal (8.5 × 14 in)" }, cur), fo = sel("wd-ps-or", { portrait: T("w_port"), landscape: T("w_land") }, pg.w > pg.h ? "landscape" : "portrait");
    const fm = sel("wd-ps-mar", { normal: T("w_normal"), narrow: T("w_narrow"), moderate: T("w_moderate"), wide: T("w_wide"), custom: T("w_custom") }, mk);
    const mt = num("wd-ps-mt", pg.mt), mb = num("wd-ps-mb", pg.mb), ml = num("wd-ps-ml", pg.ml), mr = num("wd-ps-mr", pg.mr);
    fm.onchange = () => { const m = MARG[fm.value]; if (m) [mt.value, mr.value, mb.value, ml.value] = m; };
    const fh = h("input", { id: "wd-ps-hd", value: pg.header, maxlength: 200 }), ff = h("input", { id: "wd-ps-ft", value: pg.footer, maxlength: 200 });
    const fp = sel("wd-ps-pn", { none: T("w_pnone"), bottom: T("w_pbot"), top: T("w_ptop") }, pg.pnum ? pg.pnumPos : "none"), fa = sel("wd-ps-pa", { left: "Left", center: "Centre", right: "Right" }, pg.pnumAlign);
    dialog(T("w_setup"), [L(T("w_pgsize"), fs), L(T("w_orient"), fo), L(T("w_margins"), fm), L(T("w_top"), mt), L(T("w_bottom"), mb), L(T("w_left"), ml), L(T("w_right"), mr), L(T("w_header"), fh), L(T("w_footer"), ff), L(T("w_pnum"), fp), L(T("w_palign"), fa)], () => {
      const [a, b] = SIZES[fs.value]; const land = fo.value === "landscape"; pg.w = land ? b : a; pg.h = land ? a : b;
      const c = (v, d) => Math.max(0, Math.min(100, isFinite(+v) && v !== "" ? +v : d)); pg.mt = c(mt.value, 25.4); pg.mb = c(mb.value, 25.4); pg.ml = c(ml.value, 25.4); pg.mr = c(mr.value, 25.4);
      pg.header = fh.value; pg.footer = ff.value; pg.pnum = fp.value !== "none"; if (pg.pnum) pg.pnumPos = fp.value; pg.pnumAlign = fa.value; applyGeo(); dirty(); });
  }
  /* ---- manual editing with the mouse: table column/row borders, table size, and objects (pictures, shapes, WordArt, text boxes, lines) ---- */
  let selObj = null, selBox = null, tHandle = null;
  const zr = () => stack.getBoundingClientRect();
  const relRect = el => { const a = el.getBoundingClientRect(), s = zr(); return { x: (a.left - s.left) / zoom, y: (a.top - s.top) / zoom, w: a.width / zoom, h: a.height / zoom }; };
  function drag(e, move, done) { e.preventDefault(); e.stopPropagation(); const x0 = e.clientX, y0 = e.clientY;
    const mm = ev => move((ev.clientX - x0) / zoom, (ev.clientY - y0) / zoom); const up = () => { removeEventListener("mousemove", mm); removeEventListener("mouseup", up); if (done) done(); dirty(); placeSel(); };
    addEventListener("mousemove", mm); addEventListener("mouseup", up); }
  const isObj = el => el && el.nodeType === 1 && (el.matches("img") || el.matches("hr.wd-hr") || el.matches("div.wd-vline") || el.matches(".wd-tbox"));
  function selectObj(el) { selObj = el; if (!selBox) { selBox = h("div", { class: "wd-selbox", id: "wd-selbox" }); stack.append(selBox); } placeSel(); }
  function unselect() { selObj = null; if (selBox) { selBox.remove(); selBox = null; } }
  function placeSel() { if (!selObj || !selObj.isConnected) { unselect(); return; } const r = relRect(selObj), line = selObj.matches("hr"), vl = selObj.matches(".wd-vline");
    selBox.style.cssText = `left:${r.x - 3 - (vl ? 5 : 0)}px;top:${r.y - 3 - (line ? 5 : 0)}px;width:${r.w + 6 + (vl ? 10 : 0)}px;height:${r.h + 6 + (line ? 10 : 0)}px`;
    selBox.replaceChildren(...(line ? ["w", "e"] : vl ? ["n", "s"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"]).map(d => h("div", { class: "wd-hd-" + d + " wd-hnd", "data-d": d, onmousedown: e => resizeObj(e, d) })), objBar()); }
  function objBar() { const el = selObj, vl = el.matches(".wd-vline"), line = el.matches("hr") || vl, box = el.matches(".wd-tbox"); const cs = getComputedStyle(el);
    const set = fn => { fn(); dirty(); placeSel(); };
    const wIn = h("input", { type: "number", id: "wd-ob-w", title: T("width"), value: Math.round(relRect(el).w), style: "width:62px", onchange: e => set(() => { const v = Math.max(10, +e.target.value); if (el.tagName === "IMG") { const k = el.height / el.width; el.width = v; if (!e.shiftKey) el.height = Math.round(v * k); } else el.style.width = v + "px"; }) });
    const kids = [h("span", {}, "↔"), wIn];
    if (el.tagName === "IMG") kids.push(h("span", {}, "↕"), h("input", { type: "number", id: "wd-ob-h", title: T("height"), value: el.height, style: "width:62px", onchange: e => set(() => { el.height = Math.max(5, +e.target.value); }) }));
    if (line || box) { const side = vl ? "borderLeft" : line ? "borderTop" : "border"; kids.push(h("span", {}, "▬"), h("input", { type: "number", id: "wd-ob-t", title: T("w_lw"), min: "0.5", step: "0.5", value: parseFloat(cs[vl ? "borderLeftWidth" : "borderTopWidth"]) || 1.5, style: "width:52px", onchange: e => set(() => { el.style[side + "Width"] = Math.max(.5, +e.target.value) + "px"; if (!el.style[side + "Style"]) el.style[side + "Style"] = "solid"; }) }),
      h("input", { type: "color", id: "wd-ob-c", title: T("w_outline"), value: rgbHex(vl ? cs.borderLeftColor : cs.borderTopColor), onchange: e => set(() => { el.style[side + "Color"] = e.target.value; if (!el.style[side + "Style"]) el.style[side + "Style"] = "solid"; }) })); }
    if (el.dataset.obj) kids.push(h("button", { type: "button", class: "wd-b", title: T("w_edit_obj"), onclick: () => { try { objDialog(el.dataset.obj, JSON.parse(el.dataset.o), el); } catch (x) {} } }, "✎"));
    kids.push(h("button", { type: "button", class: "wd-b", id: "wd-ob-del", title: T("w_del"), onclick: () => { el.remove(); unselect(); dirty(); } }, "🗑"));
    return h("div", { class: "wd-objbar", onmousedown: e => e.stopPropagation() }, ...kids); }
  const rgbHex = c => { const m = String(c).match(/\d+/g); return m ? "#" + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, "0")).join("") : "#000000"; };
  function resizeObj(e, d) { const el = selObj, r0 = relRect(el), img = el.tagName === "IMG", ml0 = parseFloat(el.style.marginLeft) || 0;
    drag(e, (dx, dy) => { let w = r0.w + (/e/.test(d) ? dx : /w/.test(d) ? -dx : 0), hh = r0.h + (/s/.test(d) ? dy : /n/.test(d) ? -dy : 0); w = Math.max(12, w); hh = Math.max(4, hh);
      if (img) { if (d.length === 2 && !e.shiftKey) hh = w * r0.h / r0.w; el.width = Math.round(w); el.height = Math.round(hh); } else if (el.matches(".wd-vline")) { el.style.height = Math.round(hh) + "px"; if (/n/.test(d)) el.style.marginTop = Math.max(0, (parseFloat(el.style.marginTop) || 0) + 0) + "px"; } else { el.style.width = Math.round(w) + "px"; if (!el.matches("hr")) el.style.minHeight = Math.round(hh) + "px"; }
      if (/w/.test(d)) el.style.marginLeft = Math.max(0, ml0 + dx) + "px"; placeSel(); }); }
  function moveObj(e) { const el = selObj; const host = el.tagName === "IMG" && el.parentElement !== page && el.parentElement.textContent.trim() === "" && el.parentElement.querySelectorAll("img").length === 1 ? el.parentElement : el;
    const ml0 = parseFloat(host.style.marginLeft) || 0, mt0 = parseFloat(host.style.marginTop) || 0; if (host === el && el.tagName === "IMG") el.style.display = "block";
    drag(e, (dx, dy) => { host.style.marginLeft = Math.max(0, ml0 + dx) + "px"; host.style.marginTop = Math.max(0, mt0 + dy) + "px"; placeSel(); }); }
  function tableEdge(e) { const td = e.target.closest && e.target.closest("td,th"); if (!td || !page.contains(td)) return null; const r = td.getBoundingClientRect(), z = 5;
    if (r.right - e.clientX <= z) return { td, kind: "col" }; if (e.clientX - r.left <= z && td.cellIndex > 0) return { td: td.parentElement.cells[td.cellIndex - 1], kind: "col" };
    if (r.bottom - e.clientY <= z) return { td, kind: "row" }; return null; }
  function colgroup(t) { let cg = t.querySelector(":scope > colgroup"); const first = t.rows[0]; const n = [...first.cells].reduce((a, c) => a + (c.colSpan || 1), 0);
    const ws = []; for (const c of first.cells) { const w = c.getBoundingClientRect().width / zoom / (c.colSpan || 1); for (let i = 0; i < (c.colSpan || 1); i++) ws.push(w); }
    if (!cg || cg.children.length !== n || [...cg.children].some(c => !/px$/.test(c.style.width))) { if (cg) cg.remove(); cg = h("colgroup", {}, ...ws.map(w => h("col", { style: `width:${Math.round(w)}px` }))); t.prepend(cg); }
    t.style.tableLayout = "fixed"; if (!/px$/.test(t.style.width)) t.style.width = Math.round(ws.reduce((a, b) => a + b, 0)) + "px"; return [...cg.children]; }
  function startTable(e, ed) { const t = ed.td.closest("table");
    if (ed.kind === "col") { const cols = colgroup(t); let i = 0; for (const c of ed.td.parentElement.cells) { i += c.colSpan || 1; if (c === ed.td) break; } i--;
      const a = cols[i], b = cols[i + 1], wa = parseFloat(a.style.width), wb = b ? parseFloat(b.style.width) : 0, tw = parseFloat(t.style.width);
      drag(e, dx => { if (b) { const d = Math.max(20 - wa, Math.min(wb - 20, dx)); a.style.width = wa + d + "px"; b.style.width = wb - d + "px"; } else { const nw = Math.max(20, wa + dx); a.style.width = nw + "px"; t.style.width = tw + (nw - wa) + "px"; } }); }
    else { const tr = ed.td.parentElement, h0 = tr.getBoundingClientRect().height / zoom; drag(e, (dx, dy) => { tr.style.height = Math.max(14, Math.round(h0 + dy)) + "px"; }); } }
  function tableHandle(t) { if (!tHandle) { tHandle = h("div", { class: "wd-thnd", id: "wd-thnd", title: T("w_tsize"), onmousedown: e => { const tb = tHandle._t; colgroup(tb); const cols = [...tb.querySelector(":scope > colgroup").children], w0 = cols.map(c => parseFloat(c.style.width)), tw = w0.reduce((a, b) => a + b, 0);
        drag(e, dx => { const k = Math.max(60, tw + dx) / tw; cols.forEach((c, i) => { c.style.width = Math.round(w0[i] * k) + "px"; }); tb.style.width = Math.round(tw * k) + "px"; tableHandle(tb); }); } }); stack.append(tHandle); }
    tHandle._t = t; const r = relRect(t); tHandle.style.cssText = `left:${r.x + r.w - 4}px;top:${r.y + r.h - 4}px`; }
  function installManual() {
    page.addEventListener("mousemove", e => { if (e.buttons) return; const ed = tableEdge(e); page.style.cursor = ed ? (ed.kind === "col" ? "col-resize" : "row-resize") : ""; const t = e.target.closest && e.target.closest("table"); if (t && page.contains(t)) tableHandle(t); });
    page.addEventListener("mousedown", e => { const ed = tableEdge(e); if (ed) { startTable(e, ed); return; }
      const o = e.target.closest && e.target.closest("img,hr.wd-hr,div.wd-vline,.wd-tbox"); if (o && page.contains(o) && isObj(o)) { if (o.matches(".wd-tbox") && selObj !== o) { selectObj(o); return; } if (o.matches(".wd-tbox")) return; selectObj(o); moveObj(e); return; }
      unselect(); }, true);
    page.addEventListener("keydown", e => { if (selObj && (e.key === "Delete" || e.key === "Backspace") && document.activeElement === page && !page.contains(document.getSelection().anchorNode === selObj ? null : null)) { if (selObj.matches("img,hr,div.wd-vline")) { e.preventDefault(); selObj.remove(); unselect(); dirty(); } } });
    selBoxMove(); }
  function selBoxMove() { stack.addEventListener("mousedown", e => { if (selBox && e.target === selBox) moveObj(e); }); }
  function objDialog(kind, o, target) {
    o = o || (kind === "wa" ? { text: "WordArt", font: "Arial", size: 48, preset: "gradient", c1: "#1f6feb", c2: "#9b2fe0" } : { kind: "rect", w: 160, h: 100, stroke: "#1f3864", fill: "#dbe7ff", lw: 2, text: "" });
    if (kind === "wa") { const t = h("input", { id: "wd-wa-text", value: o.text, maxlength: 200 }), fo = sel("wd-wa-font", Object.fromEntries(FONTS.map(x => [x[0], x[0]])), o.font), sz = num("wd-wa-size", o.size, "1"), pr = sel("wd-wa-preset", WA, o.preset), c1 = h("input", { type: "color", id: "wd-wa-c1", value: o.c1 }), c2 = h("input", { type: "color", id: "wd-wa-c2", value: o.c2 });
      dialog(T("w_wa"), [L(T("w_text"), t), L(T("w_font"), fo), L(T("w_size"), sz), L(T("w_preset"), pr), L("Colour 1", c1), L("Colour 2", c2)], () => placeObj("wa", { text: t.value || "WordArt", font: fo.value, size: +sz.value || 48, preset: pr.value, c1: c1.value, c2: c2.value }, target)); }
    else { const k = sel("wd-sh-kind", SHAPES, o.kind), w = num("wd-sh-w", o.w, "1"), hh = num("wd-sh-h", o.h, "1"), st = h("input", { type: "color", id: "wd-sh-st", value: o.stroke }), fi = h("input", { type: "color", id: "wd-sh-fi", value: o.fill === "none" ? "#ffffff" : o.fill }),
        nf = h("input", { type: "checkbox", id: "wd-sh-nf", checked: o.fill === "none" }), lw = num("wd-sh-lw", o.lw, "1"), tx = h("input", { id: "wd-sh-tx", value: o.text || "", maxlength: 80 });
      dialog(T("w_shape"), [L(T("w_kind"), k), L(T("width"), w), L(T("height"), hh), L(T("w_outline"), st), L(T("w_fill"), fi), L(T("w_nofill"), nf), L(T("w_lw"), lw), L(T("w_textin"), tx)],
        () => placeObj("shape", { kind: k.value, w: +w.value || 160, h: +hh.value || 100, stroke: st.value, fill: nf.checked ? "none" : fi.value, lw: +lw.value, text: tx.value }, target)); }
  }
  function placeObj(kind, o, target) {
    const r = kind === "wa" ? drawWordArt(o) : drawShape(o);
    const img = h("img", { class: "wd-obj", src: r.url, width: r.w, height: r.h, alt: kind === "wa" ? o.text : (SHAPES[o.kind] || "Shape"), "data-obj": kind, "data-o": JSON.stringify(o), title: T("w_edit_obj") });
    if (target) { target.replaceWith(img); dirty(); return; }
    restore(); insertHTML(img.outerHTML + "&nbsp;"); ED.say("word", T("w_edit_obj"));
  }
  function symbols(btn) {
    const old = document.getElementById("wd-sympop"); if (old) { old.remove(); return; } save();
    const SY = "₹ € £ $ ¥ © ® ™ § ¶ ° ± × ÷ ≠ ≤ ≥ ∞ √ ∑ π µ ½ ¼ ¾ • … – — “ ” ‘ ’ « » ← → ↑ ↓ ✓ ✗ ★ ☎ ✉ ৳ ।".split(" ");
    const pop = h("div", { class: "wd-pop", id: "wd-sympop" }, ...SY.map(s => h("button", { type: "button", onmousedown: e => e.preventDefault(), onclick: () => { pop.remove(); restore(); document.execCommand("insertText", false, s); dirty(); } }, s)));
    const host = desk.parentElement; host.style.position = host.style.position || "relative"; const r = btn.getBoundingClientRect(), hr = host.getBoundingClientRect(); pop.style.left = (r.left - hr.left) + "px"; pop.style.top = (r.bottom - hr.top + 4) + "px"; host.append(pop);
    setTimeout(() => document.addEventListener("mousedown", function off(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener("mousedown", off); } }), 0);
  }

  let fi, ri, mc, fcnt;
  function textNodes() { const it = document.createNodeIterator(page, NodeFilter.SHOW_TEXT); const a = []; let n; while ((n = it.nextNode())) a.push(n); return a; }
  const fnorm = s => mc.checked ? s : s.toLowerCase();
  function findNext() { const q = fi.value; if (!q) return false; const nodes = textNodes(); if (!nodes.length) return false; const s = document.getSelection();
    let startN = null, startO = 0; if (s.rangeCount && page.contains(s.focusNode)) { const r = s.getRangeAt(0); startN = r.endContainer; startO = r.endOffset; }
    let pass = startN && startN.nodeType === 3 ? nodes.indexOf(startN) : 0; if (pass < 0) pass = 0;
    for (let k = 0; k <= nodes.length; k++) { const n = nodes[(pass + k) % nodes.length]; const from = k === 0 && n === startN ? startO : 0; const at = fnorm(n.nodeValue).indexOf(fnorm(q), from);
      if (at >= 0) { const r = document.createRange(); r.setStart(n, at); r.setEnd(n, at + q.length); s.removeAllRanges(); s.addRange(r); n.parentElement.scrollIntoView({ block: "center" }); fcnt.textContent = ""; return true; } }
    fcnt.textContent = T("nomatch"); return false; }
  function replOne() { const s = document.getSelection(); const q = fi.value; if (q && s.rangeCount && page.contains(s.anchorNode) && fnorm(s.toString()) === fnorm(q)) { document.execCommand("insertText", false, ri.value); dirty(); } findNext(); }
  function replAll() { const q = fi.value; if (!q) return; const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), mc.checked ? "g" : "gi"); let n = 0;
    for (const t of textNodes()) { const v = t.nodeValue.replace(re, () => { n++; return ri.value; }); if (v !== t.nodeValue) t.nodeValue = v; } fcnt.textContent = T("found", n); if (n) dirty(); }
  function countFound() { const q = fi.value; if (!q) { fcnt.textContent = ""; return; } const na = fnorm(page.innerText), nq = fnorm(q); let n = 0, i = 0; while ((i = na.indexOf(nq, i)) >= 0) { n++; i += nq.length; } fcnt.textContent = T("w_find_n", n); }

  /* --- pages: the text flows from one page to the next --- */
  function applyGeo() { const g = geo(); page.style.width = g.W + "px"; page.style.padding = `${g.mt}px ${g.mr}px ${g.mb}px ${g.ml}px`; page.style.fontFamily = stackOf(pg.font); page.style.fontSize = pg.size + "pt"; page.style.lineHeight = pg.line ? String(pg.line) : ""; layout(); }
  function sched() { clearTimeout(layoutT); layoutT = setTimeout(layout, 60); }
  function unpush(root) { for (const el of root.querySelectorAll("[data-push]")) { el.style.marginTop = el.dataset.m0 || ""; if (!el.getAttribute("style")) el.removeAttribute("style"); el.removeAttribute("data-push"); el.removeAttribute("data-m0"); } }
  function layout() {
    if (!page || !page.isConnected || page.offsetParent === null) return;
    const g = geo(), step = g.H + GAP; unpush(page);
    const items = []; for (const c of page.children) { if (/^(UL|OL)$/.test(c.tagName)) items.push(...[...c.children].filter(x => x.tagName === "LI")); else items.push(c); }
    let minTop = 0, bottom = 0, trailingBreak = false;
    for (const el of items) {
      if (el.matches("hr.ed-pb")) { const t = el.offsetTop; minTop = Math.max(minTop, (Math.floor(t / step) + 1) * step + g.mt); bottom = Math.max(bottom, t + el.offsetHeight); trailingBreak = true; continue; }
      trailingBreak = false;
      let top = el.offsetTop; const hh = el.offsetHeight; let target = null;
      if (top < minTop - .5) target = minTop;
      else { const pi = Math.floor(top / step), start = pi * step + g.mt, end = pi * step + g.H - g.mb;
        if (top > end - 1) target = (pi + 1) * step + g.mt;
        else if (top < start - .5) target = start;
        else if (top + hh > end + .5 && top > start + 2 && hh <= g.H - g.mt - g.mb) target = (pi + 1) * step + g.mt; }
      if (target != null && target > top) { el.dataset.m0 = el.style.marginTop; el.setAttribute("data-push", "");
        const cs = parseFloat(getComputedStyle(el).marginTop) || 0; el.style.marginTop = (cs + target - top) + "px"; const d = target - el.offsetTop; if (Math.abs(d) > .5) el.style.marginTop = (parseFloat(el.style.marginTop) + d) + "px"; top = el.offsetTop; }
      bottom = Math.max(bottom, top + hh);
    }
    let n = Math.max(1, Math.floor(Math.max(0, bottom - 1) / step) + 1, +page.dataset.minPages || 1);
    if (trailingBreak) n = Math.max(n, Math.floor(minTop / step) + 1);
    const total = n * step - GAP; page.style.minHeight = total + "px";
    const al = { left: "flex-start", center: "center", right: "flex-end" }[pg.pnumAlign] || "center";
    bgs.replaceChildren(...Array.from({ length: n }, (_, i) => {
      const bg = h("div", { class: "wd-bg", style: `top:${i * step}px;width:${g.W}px;height:${g.H}px` });
      const hd = h("div", { class: "wd-hd", style: `left:${g.ml}px;right:${g.mr}px;top:${Math.max(6, g.mt / 2 - 8)}px` }), ft = h("div", { class: "wd-ft", style: `left:${g.ml}px;right:${g.mr}px;bottom:${Math.max(6, g.mb / 2 - 8)}px` });
      if (pg.header) hd.append(h("span", { style: "text-align:center" }, pg.header)); if (pg.footer) ft.append(h("span", { style: "text-align:center" }, pg.footer));
      if (pg.pnum) (pg.pnumPos === "top" ? hd : ft).append(h("span", { class: "wd-pn", style: `text-align:${pg.pnumAlign};justify-content:${al}` }, String(i + 1)));
      if (pg.wm) bg.append(h("div", { class: "wd-wm" }, pg.wm));
      if (pg.pbd) { const bw = `${Math.max(.5, +pg.pbw || 1.5) * 4 / 3}px solid ${pg.pbc || "#000"}`, o = 12; bg.append(h("div", { class: "wd-pbd", style: `position:absolute;pointer-events:none;left:${g.ml - o}px;top:${g.mt - o}px;height:${g.H - g.mt - g.mb + 2 * o}px;width:${g.W - g.ml - g.mr + 2 * o}px;` + (pg.pbd === "box" ? `border:${bw};` : `border-left:${bw};`) })); }
      bg.append(hd, ft); return bg; }));
    stack.style.width = g.W + "px"; stack.style.height = total + "px";
    zw.style.width = g.W * zoom + "px"; zw.style.height = total * zoom + "px"; stack.style.transform = zoom === 1 ? "" : `scale(${zoom})`;
    stats();
  }
  const sizeName = () => Object.keys(SIZES).find(k => Math.abs(SIZES[k][0] - Math.min(pg.w, pg.h)) < 1 && Math.abs(SIZES[k][1] - Math.max(pg.w, pg.h)) < 1) || Math.round(pg.w) + "×" + Math.round(pg.h) + " mm";
  function stats() { if (!status) return; const step = geo().H + GAP, n = bgs.children.length; let cur = 1; const s = document.getSelection();
    if (s.rangeCount && page.contains(s.anchorNode)) { const rr = s.getRangeAt(0).getClientRects()[0] || (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement).getBoundingClientRect(); cur = Math.min(n, Math.max(1, Math.floor((rr.top - stack.getBoundingClientRect().top) / zoom / step) + 1)); }
    const txt = page.innerText; const words = (txt.match(/\S+/g) || []).length;
    status.replaceChildren(h("span", { id: "wd-pgno" }, T("w_pgof", cur, n)), h("span", { id: "wd-wc" }, T("w_words", words)), h("span", {}, T("w_chars", txt.replace(/\s/g, "").length)), h("span", {}, pg.font + " " + pg.size + " pt"), h("span", { id: "wd-pginfo" }, sizeName() + " · " + (pg.w > pg.h ? T("w_land") : T("w_port")))); }
  function setZoom(v) { zoom = v === "fit" ? Math.max(.25, Math.min(3, (desk.clientWidth - 24) / geo().W)) : (+v || 1); layout(); }
  function addPage() { const p = h("p", {}, h("br")); page.append(h("hr", { class: "ed-pb" }), p); layout();
    const r = document.createRange(); r.setStart(p, 0); r.collapse(true); const s = document.getSelection(); page.focus(); s.removeAllRanges(); s.addRange(r); p.scrollIntoView({ block: "center" }); dirty(); }
  function clean() { const c = page.cloneNode(true); unpush(c); c.removeAttribute("style"); return c; }
  function printDoc() {
    const f = h("iframe", { style: "position:fixed;right:0;bottom:0;width:0;height:0;border:0", title: "print" }); document.body.append(f);
    const d = f.contentDocument, pa = pg.pnumAlign || "center", F = "font: 9pt Calibri, Carlito, sans-serif; color: #555;";
    const box = pos => { const txt = pos === "top" ? pg.header : pg.footer, pn = pg.pnum && (pg.pnumPos === "top") === (pos === "top"); let x = "";
      if (txt) x += `@${pos}-center { content: ${JSON.stringify(txt)}${pn && pa === "center" ? ' "  " counter(page)' : ""}; ${F} }`;
      if (pn && (pa !== "center" || !txt)) x += `@${pos}-${pa === "left" ? "left" : pa === "right" ? "right" : "center"} { content: counter(page); ${F} }`; return x; };
    d.open(); d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${XE(ED.st.word.name || "Document")}</title>${document.getElementById("wd-fonts").outerHTML}<style>@page { size: ${pg.w}mm ${pg.h}mm; margin: ${pg.mt}mm ${pg.mr}mm ${pg.mb}mm ${pg.ml}mm; ${box("top")} ${box("bottom")} }
      body { margin: 0; font-family: ${stackOf(pg.font)}; font-size: ${pg.size}pt; line-height: ${pg.line || 1.15}; color: #111; } p { margin: 0 0 8pt; } table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #808080; padding: 4px 6px; vertical-align: top; }
      hr.ed-pb { break-after: page; border: 0; margin: 0; } hr.wd-hr { border: 0; border-top: 1.5px solid #000; } div.wd-vline { width: 0; height: 160px; border-left: 2px solid #000; } .wd-tbox { border: 1.5px solid #333; padding: 6px 10px; width: 60%; } img { max-width: 100%; } h1,h2,h3 { color: #1f3864; }</style></head><body>${clean().innerHTML}</body></html>`); d.close();
    setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); }, 600);
  }

  /* --- docx import details mammoth drops: fonts, sizes, colours, spacing, borders, page setup, header/footer, breaks --- */
  const HL = { yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff", red: "#ff0000", darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000", darkMagenta: "#800080", darkRed: "#800000", darkYellow: "#808000", darkGray: "#808080", lightGray: "#c0c0c0", black: "#000000" };
  async function enrich(buf) {
    await load("jszip"); const z = await JSZip.loadAsync(buf); const rd = async n => n && z.file(n) ? await z.file(n).async("string") : "";
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const P = s => new DOMParser().parseFromString(s || "<x/>", "application/xml");
    const ch = (el, n) => el ? [...el.childNodes].filter(x => x.localName === n) : []; const one = (el, n) => ch(el, n)[0] || null;
    const at = (el, n) => el ? (el.getAttributeNS(W, n) || el.getAttribute("w:" + n)) : null;
    const theme = P(await rd("word/theme/theme1.xml")); const tf = k => { const e = theme.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/main", k)[0]; const l = e && [...e.childNodes].find(x => x.localName === "latin"); return l ? l.getAttribute("typeface") : ""; };
    const TH = { minor: tf("minorFont"), major: tf("majorFont") };
    const rp = rPr => { const o = {}; if (!rPr) return o; const f = one(rPr, "rFonts");
      if (f) { const a = at(f, "ascii") || at(f, "hAnsi"), th = at(f, "asciiTheme") || at(f, "hAnsiTheme"); if (a) o.font = a; else if (th && TH.minor) o.font = TH[/major/i.test(th) ? "major" : "minor"];
        const cs = at(f, "cs"), cst = at(f, "cstheme"); if (cs) o.cs = cs; else if (cst && TH.minor) o.cs = TH[/major/i.test(cst) ? "major" : "minor"]; }
      const sz = one(rPr, "sz"); if (sz) o.sz = +at(sz, "val") / 2; const szc = one(rPr, "szCs"); if (szc) o.szCs = +at(szc, "val") / 2;
      const c = one(rPr, "color"); if (c && at(c, "val") && at(c, "val") !== "auto") o.color = "#" + at(c, "val");
      const hl = one(rPr, "highlight"); if (hl && HL[at(hl, "val")]) o.hl = HL[at(hl, "val")]; const shd = one(rPr, "shd"); if (!o.hl && shd && at(shd, "fill") && !/auto|FFFFFF/i.test(at(shd, "fill"))) o.hl = "#" + at(shd, "fill");
      return o; };
    const styles = P(await rd("word/styles.xml")); const S = {};
    for (const s of styles.getElementsByTagNameNS(W, "style")) S[at(s, "styleId")] = { based: at(one(s, "basedOn"), "val"), r: rp(one(s, "rPr")), p: one(s, "pPr"), def: at(s, "default") === "1" && at(s, "type") === "paragraph" };
    const chainR = id => { const seen = new Set(), out = []; while (id && S[id] && !seen.has(id)) { seen.add(id); out.unshift(S[id].r); id = S[id].based; } return Object.assign({}, ...out); };
    const chainP = (id, name) => { const seen = new Set(); while (id && S[id] && !seen.has(id)) { seen.add(id); const e = S[id].p && one(S[id].p, name); if (e) return e; id = S[id].based; } return null; };
    const dd = styles.getElementsByTagNameNS(W, "rPrDefault")[0]; const base = rp(dd && one(dd, "rPr"));
    const normalId = (Object.entries(S).find(([, v]) => v.def) || ["Normal"])[0]; const norm = { ...base, ...chainR(normalId) };
    pg.font = norm.font || (TH.minor || "Calibri"); pg.size = norm.sz || (dd ? 10 : 11);
    const ddp = styles.getElementsByTagNameNS(W, "pPrDefault")[0]; const dsp = ddp && ddp.getElementsByTagNameNS(W, "spacing")[0]; const nsp = chainP(normalId, "spacing") || dsp;
    pg.line = nsp && at(nsp, "line") && (at(nsp, "lineRule") || "auto") === "auto" ? Math.round(+at(nsp, "line") / 240 * 100) / 100 : 0;
    const doc = P(await rd("word/document.xml")); const body = doc.getElementsByTagNameNS(W, "body")[0];
    const sp = body && one(body, "sectPr");
    if (sp) { const sz = one(sp, "pgSz"), m = one(sp, "pgMar"); const mm = v => Math.round(+v / 1440 * 25.4 * 10) / 10;
      if (sz && at(sz, "w")) { pg.w = mm(at(sz, "w")); pg.h = mm(at(sz, "h")); if (at(sz, "orient") === "landscape" && pg.w < pg.h) [pg.w, pg.h] = [pg.h, pg.w]; }
      if (m) for (const [k, a] of [["mt", "top"], ["mr", "right"], ["mb", "bottom"], ["ml", "left"]]) if (at(m, a) != null) pg[k] = Math.max(0, Math.abs(mm(at(m, a))));
      const rels = P(await rd("word/_rels/document.xml.rels")); const tgt = id => { const r = [...rels.getElementsByTagName("Relationship")].find(x => x.getAttribute("Id") === id); return r ? "word/" + r.getAttribute("Target").replace(/^\/?word\//, "") : ""; };
      const hfText = async (ref, key) => { const r = ch(sp, ref).find(x => (at(x, "type") || "default") === "default"); if (!r) return; const x = P(await rd(tgt(r.getAttributeNS(RNS, "id") || r.getAttribute("r:id"))));
        const paras = []; let hasPage = false, align = "";
        for (const p of x.getElementsByTagNameNS(W, "p")) { let t = "", skip = false; const jc = at(one(one(p, "pPr"), "jc"), "val");
          for (const n of p.getElementsByTagNameNS(W, "*")) {
            if ((n.localName === "fldSimple" && /\bPAGE\b/.test(at(n, "instr") || "")) || (n.localName === "instrText" && /\bPAGE\b/.test(n.textContent))) { hasPage = true; align = jc || "center"; }
            if (n.localName === "fldChar") { const ty = at(n, "fldCharType"); if (ty === "separate") skip = true; if (ty === "end") skip = false; }
            if (n.localName === "t" && !skip && !(n.parentNode && n.parentNode.parentNode && n.parentNode.parentNode.localName === "fldSimple")) t += n.textContent; }
          if (t.trim()) paras.push(t.trim()); }
        pg[key] = paras.join("  ").replace(/\s*(Page|পৃষ্ঠা)\s*$/i, "").trim();
        if (hasPage) { pg.pnum = true; pg.pnumPos = key === "header" ? "top" : "bottom"; pg.pnumAlign = { both: "center", end: "right", start: "left", left: "left", right: "right" }[align] || "center"; } };
      await hfText("headerReference", "header"); await hfText("footerReference", "footer"); }
    const blocks = [...page.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li")]; const strip = s => s.replace(/\s+/g, ""); let k = 0, pending = [];
    const bn = /[\u0980-\u09FF]/;
    const putBefore = (el, kind) => { const a = el.tagName === "LI" ? (el.parentElement && el === el.parentElement.firstElementChild ? el.parentElement : null) : el; if (a) a.before(h("hr", { class: kind === "pb" ? "ed-pb" : "wd-hr" })); };
    for (const wp of doc.getElementsByTagNameNS(W, "p")) {
      if (wp.parentNode && /txbxContent/.test(wp.parentNode.localName)) continue;
      const pPr = one(wp, "pPr"), sid = at(one(pPr, "pStyle"), "val") || normalId; const sr = { ...base, ...chainR(sid) };
      const runs = []; let brAfter = false, brBefore = false, seen = false;
      for (const r of wp.getElementsByTagNameNS(W, "r")) { const o = { ...sr, ...chainR(at(one(one(r, "rPr"), "rStyle"), "val")), ...rp(one(r, "rPr")) }; let t = "";
        for (const n of r.childNodes) { if (n.localName === "t") t += n.textContent; else if (n.localName === "tab") t += "\t"; else if (n.localName === "br" && at(n, "type") === "page") { if (seen || t) brAfter = true; else brBefore = true; } }
        if (t) { seen = true; runs.push({ t, o }); } }
      if (pPr && one(pPr, "pageBreakBefore")) brBefore = true;
      const text = runs.map(r => r.t).join(""); const pBdr = pPr && one(pPr, "pBdr");
      if (!strip(text)) { if (brBefore || brAfter) pending.push("pb"); else if (pBdr && one(pBdr, "bottom") && at(one(pBdr, "bottom"), "val") !== "nil") pending.push("hr"); continue; }
      let j = k; while (j < blocks.length && j < k + 60 && strip(blocks[j].textContent) !== strip(text)) j++;
      if (j >= blocks.length || j >= k + 60) continue; k = j + 1; const el = blocks[j];
      for (const x of pending) putBefore(el, x); pending = []; if (brBefore) putBefore(el, "pb"); if (brAfter) pending.push("pb");
      const jc = at(one(pPr, "jc") || chainP(sid, "jc"), "val"); const al = { center: "center", right: "right", end: "right", both: "justify", distribute: "justify" }[jc]; if (al) el.style.textAlign = al;
      const ind = one(pPr, "ind") || (el.tagName !== "LI" ? chainP(sid, "ind") : null);
      if (ind && el.tagName !== "LI") { const l = +(at(ind, "left") || at(ind, "start") || 0), fl = +(at(ind, "firstLine") || 0), hg = +(at(ind, "hanging") || 0); if (l > 0) el.style.marginLeft = Math.round(l / 15) + "px"; if (fl) el.style.textIndent = Math.round(fl / 15) + "px"; else if (hg) el.style.textIndent = -Math.round(hg / 15) + "px"; }
      const spc = one(pPr, "spacing"); if (spc && at(spc, "line") && (at(spc, "lineRule") || "auto") === "auto") { const v = Math.round(+at(spc, "line") / 240 * 100) / 100; if (v !== pg.line) el.style.lineHeight = String(v); }
      if (pBdr && one(pBdr, "top") && one(pBdr, "left")) { const c = at(one(pBdr, "top"), "color"); el.style.border = `1px solid ${c && c !== "auto" ? "#" + c : "#000"}`; el.style.padding = "4px 6px"; }
      else if (pBdr && one(pBdr, "bottom") && !one(pBdr, "top") && at(one(pBdr, "bottom"), "val") !== "nil") pending.push("hr");
      const isH = /^H\d$/.test(el.tagName);
      const want = runs.map(r => { const o = r.o, isBn = bn.test(r.t); const f = isBn && o.cs ? o.cs : o.font, sz = isBn && o.szCs ? o.szCs : o.sz; const s = {};
        if (f && f !== pg.font) s.fontFamily = stackOf(f); if (sz && (sz !== pg.size || isH)) s.fontSize = sz + "pt"; if (o.color && o.color.toLowerCase() !== "#000000") s.color = o.color; if (o.hl) s.backgroundColor = o.hl; return s; });
      if (want.every(w => !Object.keys(w).length)) continue;
      if (!isH && want.every(w => JSON.stringify(w) === JSON.stringify(want[0]))) { Object.assign(el.style, want[0]); continue; }
      const pos = []; { const it = document.createNodeIterator(el, NodeFilter.SHOW_TEXT); let n; while ((n = it.nextNode())) for (let i = 0; i < n.nodeValue.length; i++) if (!/\s/.test(n.nodeValue[i])) pos.push([n, i]); }
      let ci = 0; const ranges = [];
      for (let r = 0; r < runs.length; r++) { const ns = runs[r].t.replace(/\s/g, "").length; if (!ns) continue; const a = pos[ci], b = pos[ci + ns - 1]; ci += ns; if (a && b && Object.keys(want[r]).length) ranges.push({ a, b, s: want[r] }); }
      for (const g of ranges.reverse()) { try {
        const rg = document.createRange(); rg.setStart(g.a[0], g.a[1]); rg.setEnd(g.b[0], g.b[1] + 1);
        const txt = []; const it2 = document.createNodeIterator(el, NodeFilter.SHOW_TEXT); let q; while ((q = it2.nextNode())) if (rg.intersectsNode(q)) txt.push(q);
        for (const t of txt.reverse()) { const s0 = t === g.a[0] ? g.a[1] : 0, e0 = t === g.b[0] ? g.b[1] + 1 : t.length; if (e0 <= s0) continue;
          let mid = t; if (s0 > 0) mid = t.splitText(s0); if (e0 - s0 < mid.length) mid.splitText(e0 - s0);
          const span = document.createElement("span"); Object.assign(span.style, g.s); mid.replaceWith(span); span.append(mid); } } catch (e) {} }
    }
    if (pending.length) { for (const x of pending) page.append(h("hr", { class: x === "pb" ? "ed-pb" : "wd-hr" })); page.append(h("p", {}, h("br"))); }
  }

  /* ---- Review: comments, track changes; Layout: columns; References: contents, footnotes; Design: watermark ---- */
  let tracking = false, cmtPane = null, trackBtn = null;
  const author = () => (window.settings && settings.name) || "User";
  function selRange() { const s = document.getSelection(); return s.rangeCount && page.contains(s.anchorNode) ? s.getRangeAt(0) : null; }
  function addComment() {
    const r = saved && !saved.collapsed ? saved : selRange(); if (!r || r.collapsed) { ED.say("word", T("w_selfirst")); return; }
    const txt = (prompt(T("w_cmtq"), "") || "").trim(); if (!txt) return;
    const sp = h("span", { class: "wd-cmt", "data-c": txt, "data-a": author(), "data-t": new Date().toISOString() });
    try { sp.append(r.extractContents()); r.insertNode(sp); } catch (e) { return; } dirty(); comments();
  }
  function comments() {
    if (!cmtPane) return; const list = [...page.querySelectorAll("span.wd-cmt")], fns = [...page.querySelectorAll("sup.wd-fn")];
    cmtPane.textContent = ""; cmtPane.hidden = !list.length && !fns.length;
    if (list.length) cmtPane.append(h("b", {}, "💬 " + T("w_cmts") + " · " + list.length));
    list.forEach((c, i) => cmtPane.append(h("div", { class: "wd-cmtrow", "data-cmt": String(i) },
      h("span", { class: "wd-cmtq" }, "“" + c.textContent.slice(0, 40) + "”"), " ", h("span", {}, c.dataset.c), h("small", { class: "muted" }, " — " + (c.dataset.a || "")),
      h("button", { type: "button", class: "btn small", title: T("w_del"), "aria-label": T("w_del"), "data-cmt-del": String(i), onclick: () => { c.replaceWith(...c.childNodes); dirty(); comments(); } }, "✕"))));
    if (fns.length) { cmtPane.append(h("b", {}, T("w_fns"))); fns.forEach((f, i) => { f.textContent = String(i + 1); cmtPane.append(h("div", { class: "wd-cmtrow" }, h("sup", {}, String(i + 1)), " " + f.dataset.fn,
      h("button", { type: "button", class: "btn small", "aria-label": T("w_del"), onclick: () => { f.remove(); dirty(); comments(); } }, "✕"))); }); }
  }
  function setTrack(on) { tracking = on; trackBtn.setAttribute("aria-pressed", String(on)); page.dataset.track = on ? "1" : ""; ED.say("word", T(on ? "w_trackon" : "w_trackoff")); }
  const insEl = () => h("ins", { class: "wd-ins", "data-a": author(), "data-t": new Date().toISOString() });
  function markDeleted(r) {
    const an = r.commonAncestorContainer, ae = an.nodeType === 1 ? an : an.parentElement;
    if (ae && ae.closest("ins.wd-ins")) { r.deleteContents(); return null; } // own new text: just remove it
    if (ae && ae.closest("del.wd-del")) return ae.closest("del.wd-del");
    const frag = r.extractContents();
    // text the user typed in this session (inside ins) disappears; anything else is struck through
    const tmp = h("div"); tmp.append(frag); tmp.querySelectorAll("ins.wd-ins").forEach(n => n.remove());
    if (!tmp.textContent) return null;
    const d = h("del", { class: "wd-del", "data-a": author(), "data-t": new Date().toISOString() }); d.append(...tmp.childNodes); r.insertNode(d); return d;
  }
  function onBeforeInput(e) {
    if (!tracking) return; const t = e.inputType; const s = document.getSelection(); if (!s.rangeCount) return;
    if (t === "insertText" || t === "insertReplacementText") {
      const txt = e.data ?? (e.dataTransfer && e.dataTransfer.getData("text/plain")) ?? ""; if (!txt) return;
      e.preventDefault(); let r = s.getRangeAt(0);
      if (!r.collapsed) { const d = markDeleted(r); r = document.createRange(); if (d) r.setStartAfter(d); else r.setStart(s.anchorNode, s.anchorOffset); r.collapse(true); }
      const n = r.startContainer, el = n.nodeType === 1 ? n : n.parentElement; const inIns = el && el.closest("ins.wd-ins");
      if (inIns && !el.closest("del")) { const tn = document.createTextNode(txt); r.insertNode(tn); r.setStartAfter(tn); }
      else { const ins = insEl(); ins.textContent = txt; const de = el && el.closest("del.wd-del"); if (de) r.setStartAfter(de), r.collapse(true); r.insertNode(ins); r = document.createRange(); r.setStart(ins.firstChild, txt.length); }
      r.collapse(true); s.removeAllRanges(); s.addRange(r); dirty(); return;
    }
    if (/^delete/.test(t)) {
      e.preventDefault(); if (s.isCollapsed) s.modify("extend", t === "deleteContentForward" || t === "deleteWordForward" ? "forward" : "backward", /Word/.test(t) ? "word" : "character");
      const r = s.getRangeAt(0); if (r.collapsed) return; const back = /Backward/.test(t);
      const d = markDeleted(r); const nr = document.createRange(); if (d) { back ? nr.setStartBefore(d) : nr.setStartAfter(d); } else nr.setStart(r.startContainer, r.startOffset); nr.collapse(true); s.removeAllRanges(); s.addRange(nr); dirty();
    }
  }
  function acceptAll(yes) {
    for (const n of page.querySelectorAll(yes ? "del.wd-del" : "ins.wd-ins")) n.remove();
    for (const n of page.querySelectorAll(yes ? "ins.wd-ins" : "del.wd-del")) n.replaceWith(...n.childNodes);
    page.normalize(); dirty();
  }
  function columns(n) {
    n = +n; const r = selRange(); const tops = []; const top = el => { while (el && el.parentElement !== page && el !== page) el = el.parentElement; return el; };
    if (r && !r.collapsed) { for (const c of page.children) if (r.intersectsNode(c)) tops.push(c); }
    else { const cur = r && top(r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement); if (cur && cur.classList && cur.classList.contains("wd-cols")) tops.push(cur); else tops.push(...page.children); }
    const flat = []; for (const c of tops) { if (c.classList.contains("wd-cols")) flat.push(...c.children), c.replaceWith(...c.childNodes); else flat.push(c); }
    if (n > 1 && flat.length) { const w = h("div", { class: "wd-cols", "data-n": String(n), style: `column-count:${n};column-gap:12.7mm` }); flat[0].before(w); w.append(...flat); }
    dirty();
  }
  function toc() {
    const hs = [...page.querySelectorAll("h1,h2,h3")].filter(x => !x.closest(".wd-toc") && x.textContent.trim()); if (!hs.length) { ED.say("word", T("w_nohead")); return; }
    page.querySelectorAll("div.wd-toc").forEach(x => x.remove());
    hs.forEach((x, i) => { if (!x.id) x.id = "wd-h-" + Date.now().toString(36) + i; });
    const box = h("div", { class: "wd-toc" }, h("p", { class: "wd-toct" }, h("b", {}, T("w_tocT"))),
      ...hs.map(x => h("p", { class: "wd-tocl", style: `margin-left:${(+x.tagName[1] - 1) * 18}px` }, h("a", { href: "#" + x.id }, x.textContent.trim()))));
    page.prepend(box); dirty();
  }
  function footnote() { const r = saved || selRange(); if (!r) { page.focus(); } const txt = (prompt(T("w_fnq"), "") || "").trim(); if (!txt) return; restore(); const rr = selRange(); if (!rr) return; rr.collapse(false);
    const f = h("sup", { class: "wd-fn", "data-fn": txt, contenteditable: "false" }, "*"); rr.insertNode(f); dirty(); comments(); }
  function watermark() { const v = prompt(T("w_wmq"), pg.wm || "DRAFT"); if (v == null) return; pg.wm = v.trim(); layout(); ED.dirty("word"); }
  return {
    _ai: { pg, applyGeo, pages: () => { layout(); return bgs.children.length; } },
    exts: () => ["docx"],
    init(body) {
      fontSel = h("select", { id: "wd-font", "aria-label": T("w_font"), title: T("w_font"), onchange: () => { restore(); cmd("fontName", stackOf(fontSel.value), true); } }, ...FONTS.map(f => h("option", { value: f[0], style: `font-family:${f[1]}` }, f[0])));
      sizeSel = h("select", { id: "wd-size", "aria-label": T("w_size"), title: T("w_size"), onchange: () => { restore(); setSize(sizeSel.value); } }, ...STEPS.map(s => h("option", { value: s, selected: s === 11 }, String(s))));
      blockSel = h("select", { id: "wd-block", "aria-label": T("w_style"), title: T("w_style"), onchange: () => { restore(); cmd("formatBlock", "<" + blockSel.value + ">"); } }, h("option", { value: "p" }, "Normal"), h("option", { value: "h1" }, "Heading 1"), h("option", { value: "h2" }, "Heading 2"), h("option", { value: "h3" }, "Heading 3"), h("option", { value: "blockquote" }, "Quote"), h("option", { value: "pre" }, "Code"));
      for (const s of [fontSel, sizeSel, blockSel]) s.addEventListener("mousedown", save);
      const color = h("input", { type: "color", id: "wd-color", value: "#c00000", title: T("w_color"), "aria-label": T("w_color"), onmousedown: save, onchange: e => { restore(); cmd("foreColor", e.target.value, true); } });
      const hl = h("input", { type: "color", id: "wd-hlc", value: "#ffff00", title: T("w_hl"), "aria-label": T("w_hl"), onmousedown: save, onchange: e => { restore(); cmd("hiliteColor", e.target.value, true); } });
      const caseSel = h("select", { id: "wd-case", title: T("w_case"), "aria-label": T("w_case"), onchange: () => { restore(); if (caseSel.value) changeCase(caseSel.value); caseSel.value = ""; } }, h("option", { value: "" }, "Aa"), h("option", { value: "upper" }, T("w_upper")), h("option", { value: "lower" }, T("w_lower")), h("option", { value: "title" }, T("w_title")));
      const ls = h("select", { id: "wd-ls", title: T("w_ls"), "aria-label": T("w_ls"), onchange: () => { restore(); if (ls.value) lineSpace(ls.value); ls.value = ""; } }, h("option", { value: "" }, "↕"), ...["1", "1.15", "1.5", "2", "2.5", "3"].map(v => h("option", { value: v }, v)));
      for (const s of [caseSel, ls]) s.addEventListener("mousedown", save);
      zoomSel = h("select", { id: "wd-zoom", title: T("w_zoom"), "aria-label": T("w_zoom"), onchange: () => setZoom(zoomSel.value) }, ...[[".5", "50%"], [".75", "75%"], ["1", "100%"], ["1.25", "125%"], ["1.5", "150%"], ["2", "200%"], ["fit", T("w_fit")]].map(([v, t]) => h("option", { value: v, selected: v === "1" }, t)));
      imgIn = h("input", { type: "file", accept: "image/png,image/jpeg,image/gif,image/webp", hidden: true, onchange: () => { const f = imgIn.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { restore(); insertHTML(`<img src="${r.result}" style="max-width:100%">`); }; r.readAsDataURL(f); imgIn.value = ""; } });
      const colSel = h("select", { id: "wd-cols", title: T("w_cols"), "aria-label": T("w_cols"), onmousedown: save, onchange: () => { restore(); if (colSel.value) columns(colSel.value); colSel.value = ""; } }, h("option", { value: "" }, "▥ " + T("w_cols")), h("option", { value: "1" }, T("w_col1")), h("option", { value: "2" }, T("w_col2")), h("option", { value: "3" }, T("w_col3")));
      trackBtn = B("wd-track", "✎ " + T("w_track"), T("w_track"), () => setTrack(!tracking), { "aria-pressed": "false" });
      const dateStr = () => new Date().toLocaleDateString(window.settings && settings.lang === "bn" ? "bn-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" });
      const tb = h("div", { class: "ed-tool wd-tool", role: "toolbar", "aria-label": "Formatting" },
        B("wd-undo", "↶", T("undo") + " (Ctrl+Z)", () => cmd("undo")), B("wd-redo", "↷", T("redo") + " (Ctrl+Y)", () => cmd("redo")), sep(),
        blockSel, fontSel, sizeSel, B("wd-grow", "A⁺", T("w_grow"), () => grow(1)), B("wd-shrink", "A⁻", T("w_shrink"), () => grow(-1)), sep(),
        B("wd-b", h("b", {}, "B"), "Bold (Ctrl+B)", () => cmd("bold")), B("wd-i", h("i", {}, "I"), "Italic (Ctrl+I)", () => cmd("italic")), B("wd-u", h("u", {}, "U"), "Underline (Ctrl+U)", () => cmd("underline")),
        B("wd-s", h("s", {}, "ab"), T("w_strike"), () => cmd("strikeThrough")), B("wd-sup", h("span", {}, "x", h("sup", {}, "2")), T("w_sup"), () => cmd("superscript")), B("wd-sub", h("span", {}, "x", h("sub", {}, "2")), T("w_sub"), () => cmd("subscript")),
        h("span", { class: "wd-grp", title: T("w_hl") }, "🖍", hl), h("span", { class: "wd-grp", title: T("w_color") }, h("b", { style: "color:#c00000" }, "A"), color), B("wd-clear", "⌫A", T("w_clear"), () => cmd("removeFormat")), caseSel,
        B("wd-fp", "🖌", T("w_painter"), () => { if (painter) { painter = null; document.getElementById("wd-fp").setAttribute("aria-pressed", "false"); ED.say("word", ""); } else startPainter(); }, { "aria-pressed": "false" }), sep(),
        B("wd-al", "⯇≡", "Align left", () => cmd("justifyLeft")), B("wd-ac", "≡", "Centre", () => cmd("justifyCenter")), B("wd-ar", "≡⯈", "Align right", () => cmd("justifyRight")), B("wd-aj", "☰", "Justify", () => cmd("justifyFull")),
        B("wd-ul", "• ≡", "Bullets", () => cmd("insertUnorderedList")), B("wd-ol", "1. ≡", "Numbering", () => cmd("insertOrderedList")), B("wd-out", "⇤", T("w_out"), () => indent(-1)), B("wd-in", "⇥", T("w_in"), () => indent(1)), ls,
        B("wd-bdr", "▭", T("w_border"), border), B("wd-hr", "―", T("w_hr"), () => insertHTML('<hr class="wd-hr"><p><br></p>')), B("wd-vl", "│", T("w_vl"), () => insertHTML('<div class="wd-vline" contenteditable="false"></div><p><br></p>')), sep(),
        B("wd-tbl", "▦ " + T("tbl"), T("tbl"), insTable), B("wd-img", "🖼 " + T("img"), T("img"), () => { save(); imgIn.click(); }), B("wd-shape", "◆ " + T("w_shape"), T("w_shape"), () => { save(); objDialog("shape"); }),
        B("wd-tbox", "▤ " + T("w_tbox"), T("w_tbox"), () => insertBlock(h("div", { class: "wd-tbox" }, h("p", {}, T("w_text"))))), B("wd-wa", "𝒜 " + T("w_wa"), T("w_wa"), () => { save(); objDialog("wa"); }),
        B("wd-link", "🔗", T("w_link"), () => { save(); const u = (prompt(T("w_url"), "https://") || "").trim(); restore(); if (/^(https?:\/\/|mailto:)\S+$/i.test(u)) { if (document.getSelection().isCollapsed) insertHTML(`<a href="${XE(u)}">${XE(u)}</a>`); else cmd("createLink", u); } }),
        B("wd-sym", "Ω", T("w_sym"), e => symbols(e.currentTarget)), B("wd-date", "📅", T("w_date"), () => { focusPage(); document.execCommand("insertText", false, dateStr()); dirty(); }), sep(),
        B("wd-pb", "⤓ " + T("pb"), T("pb") + " (Ctrl+Enter)", () => insertHTML('<hr class="ed-pb"><p><br></p>')), B("wd-addpg", T("w_addpg"), T("w_blank"), addPage), B("wd-setup", "📄 " + T("w_setup"), T("w_setup"), pageSetup), B("wd-hf", "▔▁ " + T("w_hf"), T("w_hf"), pageSetup), sep(),
        B("wd-findbtn", "🔍", T("w_findr") + " (Ctrl+H)", () => { findBar.hidden = !findBar.hidden; if (!findBar.hidden) { const s = document.getSelection().toString(); if (s && s.length < 80) fi.value = s; fi.focus(); countFound(); } }), zoomSel, B("wd-print", "🖨", T("w_print") + " (Ctrl+P)", printDoc), sep(),
        colSel, B("wd-tocb", "📑 " + T("w_toc"), T("w_toc"), toc), B("wd-fnb", "¹ " + T("w_fn"), T("w_fn"), () => { save(); footnote(); }), B("wd-wmb", "💧 " + T("w_wm"), T("w_wm"), watermark), sep(),
        B("wd-cmtb", "💬 " + T("w_cmt"), T("w_cmt"), () => { save(); addComment(); }), trackBtn, B("wd-acc", "✓ " + T("w_acc"), T("w_acc"), () => acceptAll(true)), B("wd-rej", "✗ " + T("w_rej"), T("w_rej"), () => acceptAll(false)), imgIn);
      fi = h("input", { id: "wd-fi", placeholder: T("find"), "aria-label": T("find"), oninput: () => countFound(), onkeydown: e => { if (e.key === "Enter") { e.preventDefault(); findNext(); } } });
      ri = h("input", { id: "wd-ri", placeholder: T("repl"), "aria-label": T("repl") }); mc = h("input", { type: "checkbox", id: "wd-mc", onchange: () => countFound() }); fcnt = h("span", { id: "wd-fcnt", class: "muted" });
      const FB = (id, t, fn) => h("button", { type: "button", class: "wd-b", id, onmousedown: e => e.preventDefault(), onclick: fn }, t);
      findBar = h("div", { class: "wd-find", id: "wd-findbar", hidden: true }, fi, ri, h("label", {}, mc, " " + T("mcase")), FB("wd-fnext", T("next"), findNext), FB("wd-rone", T("rone"), replOne), FB("wd-rall", T("rall"), replAll), fcnt);
      page = h("div", { class: "wd-page", id: "wd-page", contenteditable: "true", spellcheck: "true", role: "textbox", "aria-multiline": "true", "aria-label": T("word") });
      bgs = h("div", { class: "wd-bgs", "aria-hidden": "true" }); stack = h("div", { class: "wd-stack" }, bgs, page); zw = h("div", { class: "wd-zoomw" }, stack);
      desk = h("div", { class: "wd-desk" }, zw); status = h("div", { class: "wd-status", id: "wd-status" });
      page.addEventListener("input", () => { dirty(); if (page.querySelector("span.wd-cmt,sup.wd-fn") || (cmtPane && !cmtPane.hidden)) comments(); });
      page.addEventListener("beforeinput", onBeforeInput); installManual();
      cmtPane = h("div", { class: "wd-cmts", id: "wd-cmts", hidden: true });
      page.addEventListener("keydown", e => { const k = e.key.toLowerCase(), m = e.ctrlKey || e.metaKey; if (!m) return;
        if (k === "h" || k === "f") { e.preventDefault(); findBar.hidden = false; fi.focus(); } else if (k === "p") { e.preventDefault(); printDoc(); } else if (e.key === "Enter") { e.preventDefault(); insertHTML('<hr class="ed-pb"><p><br></p>'); } });
      page.addEventListener("mouseup", () => { if (painter) setTimeout(applyPainter, 0); });
      page.addEventListener("dblclick", e => { const o = e.target.closest && e.target.closest("img.wd-obj"); if (!o) return; try { objDialog(o.dataset.obj, JSON.parse(o.dataset.o), o); } catch (x) {} });
      document.addEventListener("selectionchange", () => { if (ED.tab === "word" && page.contains(document.getSelection().anchorNode)) { sync(); stats(); } });
      page.addEventListener("paste", e => { const html = e.clipboardData.getData("text/html"); if (!html) return; e.preventDefault(); const d = new DOMParser().parseFromString(html, "text/html"); d.querySelectorAll("script,style,meta,link,iframe,object,title").forEach(n => n.remove()); d.querySelectorAll("*").forEach(n => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || (a.name === "href" && /^\s*javascript:/i.test(a.value)) || (a.name === "class" && /^Mso/.test(a.value))) n.removeAttribute(a.name); }); insertHTML(d.body.innerHTML); });
      new ResizeObserver(() => sched()).observe(page); window.addEventListener("resize", () => { if (zoomSel.value === "fit") setZoom("fit"); });
      if (document.fonts) document.fonts.addEventListener("loadingdone", sched);
      body.append(tb, findBar, cmtPane, desk, status);
      try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}
      applyGeo();
    },
    blank() { Object.assign(pg, DEF); pg.wm = ""; setTimeout(comments, 0); delete page.dataset.minPages; page.innerHTML = "<p><br></p>"; applyGeo(); fontSel.value = pg.font; sizeSel.value = String(pg.size); },
    async load(buf) {
      await load("mammoth");
      const r = await mammoth.convertToHtml({ arrayBuffer: buf }, { styleMap: ["u => u", "strike => s", "p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh"], includeDefaultStyleMap: true });
      const d = new DOMParser().parseFromString(r.value, "text/html"); d.querySelectorAll("script,style,iframe,object").forEach(n => n.remove()); d.querySelectorAll("*").forEach(n => { for (const a of [...n.attributes]) if (/^on/i.test(a.name)) n.removeAttribute(a.name); });
      d.querySelectorAll("table").forEach(t => t.classList.add("wd-tbl"));
      Object.assign(pg, DEF); delete page.dataset.minPages; page.innerHTML = d.body.innerHTML || "<p><br></p>";
      try { await enrich(buf); } catch (e) { console.warn("docx details", e); }
      applyGeo(); if ([...fontSel.options].some(o => o.value === pg.font)) fontSel.value = pg.font; comments();
    },
    async export() { return { blob: await ED.htmlToDocx(clean(), { page: { ...pg }, font: pg.font, size: pg.size, line: pg.line, header: pg.header, footer: pg.footer, pnum: pg.pnum, pnumPos: pg.pnumPos, pnumAlign: pg.pnumAlign, wm: pg.wm, pbd: pg.pbd, pbw: pg.pbw, pbc: pg.pbc }) }; },
    comments, columns, toc, acceptAll, setTrack, tracking: () => tracking,
    layout, pg, page: () => page, setZoom
  };
})();
})();
