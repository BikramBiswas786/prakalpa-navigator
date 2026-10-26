/* AI panel under each Drafting Desk editor (Word, Excel, Image, Notepad):
   instruction box + attachments (📎, drag, paste) → structured edit operations applied to the open file, with Undo;
   a thread per document; "Save to conversation" / "New page"; a separate Conversations list per editor (stored in the pendrive). */
(() => {
"use strict";
const ED = window.BA_ED; if (!ED) return;
const { h, T } = ED;
ED.addTX({
  en: { a_ph: "Write what to edit or change in this file…", a_send: "Send", a_fast: "⚡ Fast", a_attach: "📎 Attach", a_frompd: "📂 From pendrive", a_working: "Working…",
    a_reading: "Reading {0}…", a_applied: "Applied {0} change(s).", a_curpic: "the picture", a_copy: "Copy", a_copied: "Copied", a_tonote: "To Notepad", a_toword: "To Word", a_undo: "↶ Undo", a_keep: "✓ Apply", a_undone: "Undone.", a_kept: "Kept.",
    a_failed: "{0} change(s) could not be applied.", a_ocr: "Only the OCR text of {0} was used (no vision model).", a_vision: "Text of {0} read by the vision model.", a_fmt: "Loaded the format of {0}; the AI filled in the new content.",
    a_err: "AI error: {0}", a_drop: "Drop files here to attach", a_cv: "Conversations", a_open: "Open", a_ren: "Rename", a_del: "Delete", a_dl: "Download", a_none: "No saved conversations yet.",
    a_saved: "Saved to Conversations: {0}", a_empty: "Nothing to save: the page is empty or unchanged.", a_newdone: "New blank page.", a_delq: "Delete “{0}”?", a_renq: "New name:",
    a_hist: "History", a_xdiff: "Changed {0} cell(s) (Keep or Undo):", a_lost: "Open this saved conversation? Unsaved changes in the editor will be lost.", a_pick: "Attach a file from the pendrive", a_filter: "Filter…", a_cancel: "Cancel", a_you: "You", a_ai: "AI",
    a_tables: "Tables: {0}", a_totals: "Formulas recalculated: {0}", a_errs: "Formula errors: {0}", a_badtype: "Can't attach this file type: {0}" },
  bn: { a_ph: "এই ফাইলে কী বদলাতে বা লিখতে চান লিখুন…", a_send: "পাঠান", a_fast: "⚡ দ্রুত", a_attach: "📎 সংযুক্ত", a_frompd: "📂 পেনড্রাইভ থেকে", a_working: "কাজ চলছে…",
    a_reading: "{0} পড়া হচ্ছে…", a_applied: "{0}টি পরিবর্তন করা হল।", a_curpic: "ছবিটি", a_copy: "কপি", a_copied: "কপি হল", a_tonote: "নোটপ্যাডে", a_toword: "ওয়ার্ডে", a_undo: "↶ আগের মতো", a_keep: "✓ রাখুন", a_undone: "আগের মতো করা হল।", a_kept: "রাখা হল।",
    a_failed: "{0}টি পরিবর্তন করা গেল না।", a_ocr: "{0}: শুধু OCR-এ পড়া লেখা ব্যবহার হয়েছে (ভিশন মডেল নেই)।", a_vision: "{0}: ভিশন মডেলে লেখা পড়া হয়েছে।", a_fmt: "{0}-এর ফরম্যাট লোড করে AI নতুন বিষয় বসিয়েছে।",
    a_err: "AI ত্রুটি: {0}", a_drop: "সংযুক্ত করতে ফাইল এখানে ছাড়ুন", a_cv: "কথোপকথন", a_open: "খুলুন", a_ren: "নাম বদল", a_del: "মুছুন", a_dl: "ডাউনলোড", a_none: "এখনও কোনো কথোপকথন রাখা হয়নি।",
    a_saved: "কথোপকথনে রাখা হল: {0}", a_empty: "রাখার কিছু নেই: পাতা ফাঁকা বা বদলায়নি।", a_newdone: "নতুন ফাঁকা পাতা।", a_delq: "“{0}” মুছবেন?", a_renq: "নতুন নাম:",
    a_hist: "ইতিহাস", a_xdiff: "{0}টি ঘর বদলেছে (রাখুন বা Undo):", a_lost: "এই কথোপকথন খুলবেন? এডিটরের সেভ না করা বদল হারাবে।", a_pick: "পেনড্রাইভ থেকে ফাইল সংযুক্ত করুন", a_filter: "খুঁজুন…", a_cancel: "বাতিল", a_you: "আপনি", a_ai: "AI",
    a_tables: "টেবিল: {0}", a_totals: "সূত্র আবার হিসাব হল: {0}", a_errs: "সূত্রে ত্রুটি: {0}", a_badtype: "এই ধরনের ফাইল সংযুক্ত করা যায় না: {0}" }
});
const DEFEXT = { word: "docx", excel: "xlsx", image: "png", note: "txt" };
const DEFNAME = { word: "Untitled.docx", excel: "Untitled.xlsx", image: "Untitled.png", note: "Untitled.txt" };
const ACCEPT = ".docx,.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.gif,.txt,.md";
const S = {}; // per kind: { thread, atts, undo, lastSig, rows, el:{} }
const ext = n => (/\.([a-z0-9]+)$/i.exec(n || "") || [, ""])[1].toLowerCase();
const pad = n => String(n).padStart(2, "0");
const stamp = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const lang = () => (typeof settings !== "undefined" && settings.lang === "bn") ? "bn" : "en";
const b64of = async blob => { const u = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const bufOf = b64 => { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
const toastT = () => { /* no pop-ups in the editors: status stays inline */ };
const A1 = (r, c) => { let s = "", n = c + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s + (r + 1); };
const RC = ref => { const m = /^([A-Z]+)(\d+)$/i.exec(String(ref || "").trim()); if (!m) return null; let c = 0; for (const ch of m[1].toUpperCase()) c = c * 26 + ch.charCodeAt(0) - 64; return { r: +m[2] - 1, c: c - 1 }; };

/* ---------- structure of the open document (what the AI sees) ---------- */
const wordPage = () => ED.kinds.word.page();
const noteTa = () => document.getElementById("np-ta");
let wdSel = null; // last non-empty selection inside the Word page (kept when focus moves to the AI box)
document.addEventListener("selectionchange", () => { const sl = getSelection(); if (!sl || !sl.rangeCount) return; const pg = document.querySelector("#ed-word .wd-page, #ed-word [contenteditable=true]");
  const r = sl.getRangeAt(0); if (pg && pg.contains(r.commonAncestorContainer)) wdSel = r.collapsed ? null : r.cloneRange(); });
function wordBlocks() {
  const page = wordPage(), map = new Map(); let nb = 0, nt = 0; const lines = [];
  const walk = el => {
    for (const n of [...el.children]) {
      if (n.classList && (n.classList.contains("wd-pb-gap") || n.classList.contains("wd-hdr") || n.classList.contains("wd-ftr"))) continue;
      if (n.tagName === "TABLE") { const id = "t" + (++nt); map.set(id, n); const rows = [...n.rows]; lines.push(`${id} TABLE ${rows.length}×${rows[0] ? rows[0].cells.length : 0}`); rows.slice(0, 60).forEach((r, i) => lines.push(`  r${i}: ` + [...r.cells].map(c => c.innerText.replace(/\s+/g, " ").trim().slice(0, 80)).join(" | "))); continue; }
      if (/^(UL|OL|DIV|SECTION|BLOCKQUOTE)$/.test(n.tagName) && n.children.length && !n.classList.contains("wd-pb")) { walk(n); continue; }
      const id = "b" + (++nb); map.set(id, n); const cs = getComputedStyle(n);
      const st = [n.tagName.toLowerCase(), cs.textAlign !== "start" && cs.textAlign !== "left" ? cs.textAlign : "", parseInt(cs.fontWeight) >= 700 ? "bold" : "", Math.round(parseFloat(cs.fontSize)) + "px"].filter(Boolean).join(" ");
      lines.push(`${id} [${st}${wdSel && wdSel.intersectsNode(n) ? " SELECTED" : ""}] ${n.innerText.replace(/\s+/g, " ").trim().slice(0, 600)}`);
    }
  };
  walk(page); return { text: lines.join("\n"), map, tables: nt };
}
function excelStruct() {
  const a = ED.kinds.excel._api(); const out = []; let n = 0;
  a.book.sheets.forEach((s, si) => { let mr = 0, mc = 0; for (const kk of s.cells.keys()) { const [r, c] = kk.split(",").map(Number); mr = Math.max(mr, r); mc = Math.max(mc, c); }
    const hdr = []; for (let c = 0; c <= Math.min(mc, 30); c++) { const v = s.cells.get("0," + c); if (v != null && v !== "") hdr.push(A1(0, c) + "=" + String(v).slice(0, 40)); }
    out.push(`SHEET ${s.name} (used ${s.cells.size ? "A1:" + A1(mr, mc) : "empty"}; row-1 headers: ${hdr.join(" | ") || "none"})`);
    const keys = [...s.cells.keys()].map(k => k.split(",").map(Number)).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    for (const [r, c] of keys) { if (++n > 2500) break; const raw = s.cells.get(r + "," + c); const f = s.fmt.get(r + "," + c) || {};
      const sty = [f.b && "b", f.bg && "bg=" + f.bg, f.nf && "nf=" + f.nf, f.al && "al=" + f.al].filter(Boolean).join(",");
      let v = ""; if (String(raw)[0] === "=") { try { v = " → " + a.show(a.val(r, c, si), f); } catch (e) { /* ignore */ } }
      out.push(`${A1(r, c)} = ${String(raw).slice(0, 200)}${v}${sty ? "  {" + sty + "}" : ""}`); } });
  return out.join("\n");
}
function excelDiff(before) { // cells the AI changed: "Sheet!A1: old → new" (shown with Keep/Undo so nothing changes unseen)
  if (!before || !before.snap || !before.snap.sheets) return [];
  const a = ED.kinds.excel._api(), out = []; let n = 0;
  a.book.sheets.forEach((s, si) => { const o = before.snap.sheets[si] || { cells: new Map() }; const keys = new Set([...s.cells.keys(), ...o.cells.keys()]);
    for (const kk of keys) { const x = o.cells.get(kk), y = s.cells.get(kk); if (String(x ?? "") === String(y ?? "")) continue; n++;
      if (out.length < 12) { const [r, c] = kk.split(",").map(Number); out.push(`${a.book.sheets.length > 1 ? s.name + "!" : ""}${A1(r, c)}: ${x == null || x === "" ? "(empty)" : String(x).slice(0, 40)} → ${y == null || y === "" ? "(cleared)" : String(y).slice(0, 40)}`); } } });
  if (!n) return []; return [T("a_xdiff", n), ...out, ...(n > out.length ? ["… +" + (n - out.length)] : [])];
}
function noteStruct() { return (noteTa().value || "").split("\n").slice(0, 3000).map((l, i) => `${i + 1}| ${l}`).join("\n"); }
function imageStruct() { const a = ED.kinds.image._api(); return `Picture ${a.W}×${a.H} px, ${a.layers().length} layer(s).`; }
const struct = k => k === "word" ? wordBlocks().text : k === "excel" ? excelStruct() : k === "note" ? noteStruct() : imageStruct();
function isEmpty(k) {
  if (k === "word") { const p = wordPage(); return !p.innerText.trim() && !p.querySelector("table,img"); }
  if (k === "excel") return ED.kinds.excel._api().book.sheets.every(s => !s.cells.size);
  if (k === "note") return !(noteTa().value || "").trim();
  const a = ED.kinds.image._api(); return !ED.st.image.file && !ED.st.image.dirty && a.undoN() === 0;
}
const sig = k => k === "image" ? (() => { try { return ED.kinds.image._api().flat().toDataURL("image/jpeg", 0.3).length + ":" + ED.kinds.image._api().undoN(); } catch (e) { return ""; } })() : struct(k);

/* ---------- snapshots (Undo) ---------- */
async function snapshot(k) {
  if (k === "word") return { html: wordPage().innerHTML, pg: JSON.parse(JSON.stringify(ED.kinds.word.pg)) };
  if (k === "excel") return { sheets: structuredClone(ED.kinds.excel._api().book.sheets) };
  if (k === "note") return { text: noteTa().value };
  const c = ED.kinds.image._api().flat(); return { img: await new Promise(r => c.toBlob(r, "image/png")) };
}
async function restore(k, s) {
  if (k === "word") { Object.assign(ED.kinds.word.pg, s.pg); wordPage().innerHTML = s.html; wordRelayout(); }
  else if (k === "excel") ED.kinds.excel._api().aiEdit(({ book }) => { book.sheets = s.sheets; });
  else if (k === "note") { const ta = noteTa(); ta.value = s.text; ta.dispatchEvent(new Event("input", { bubbles: true })); }
  else await ED.kinds.image.load(await s.img.arrayBuffer(), "png", ED.st.image.name);
  ED.dirty(k);
}
function wordRelayout() { try { ED.kinds.word.layout(); } catch (e) { /* ignore */ } wordPage().dispatchEvent(new Event("input", { bubbles: true })); }

/* ---------- applying operations ---------- */
function setText(el, text) { // keep the first run's formatting
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  if (!nodes.length) { el.textContent = text; return; }
  nodes[0].nodeValue = text; for (const n of nodes.slice(1)) n.nodeValue = "";
  el.querySelectorAll("br").forEach(b => { if (b !== el.lastChild) b.remove(); });
}
function replaceAll(root, find, rep) {
  if (!find) return 0; let n = 0; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const t of nodes) if (t.nodeValue.includes(find)) { n += t.nodeValue.split(find).length - 1; t.nodeValue = t.nodeValue.split(find).join(rep); }
  if (!n) { for (const el of root.querySelectorAll("p,h1,h2,h3,h4,li,td,th")) { if (el.querySelector("p,h1,h2,h3,li,td")) continue; const s = el.textContent; if (s.includes(find)) { setText(el, s.split(find).join(rep)); n++; } } }
  return n;
}
const clean = html => { const d = new DOMParser().parseFromString(String(html || ""), "text/html"); d.querySelectorAll("script,style,iframe,object,link,meta").forEach(n => n.remove()); d.querySelectorAll("*").forEach(n => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) n.removeAttribute(a.name); }); d.querySelectorAll("table").forEach(t => t.classList.add("wd-tbl")); return d.body.innerHTML; };
const CLR = c => /^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : /^[a-z]{3,20}$/i.test(String(c || "")) ? c : "#000000";
const CSSOK = /^(color|background(-color)?|font-(size|weight|style|family)|text-(align|transform|decoration)|letter-spacing|line-height|margin(-(top|bottom|left|right))?|padding(-(top|bottom|left|right))?|border(-(top|bottom|left|right))?(-(width|style|color))?)$/i;
function safeCss(el, css) { for (const d of String(css || "").split(";")) { const i = d.indexOf(":"); if (i < 0) continue; const k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim(); if (CSSOK.test(k) && !/url\(|expression|javascript/i.test(v)) el.style.setProperty(k, v); } }
function fitOne(page) { const W = ED.kinds.word._ai, g = W.pg;
  for (let i = 0; i < 14 && W.pages() > 1; i++) {
    if (i < 4) for (const k of ["mt", "mb", "ml", "mr"]) g[k] = Math.max(12.7, g[k] - 3);
    for (const x of page.querySelectorAll("p,h1,h2,h3,h4,li,td,th")) { const cs = getComputedStyle(x); x.style.marginTop = Math.max(0, parseFloat(cs.marginTop) * .7) + "px"; x.style.marginBottom = Math.max(0, parseFloat(cs.marginBottom) * .7) + "px"; if (i >= 2) x.style.fontSize = Math.max(7, parseFloat(cs.fontSize) * .93) + "px"; if (i >= 2 && !x.style.lineHeight) x.style.lineHeight = "1.1"; }
    for (const pb of page.querySelectorAll("hr.ed-pb")) pb.remove();
    W.applyGeo(); } }
function applyWord(ops) {
  const { map } = wordBlocks(); let ok = 0, bad = 0; const page = wordPage();
  for (const o of ops) { try {
    const el = map.get(o.id);
    if (o.op === "text" && el) { setText(el, String(o.text ?? "")); ok++; }
    else if (o.op === "replace") { replaceAll(page, String(o.find || ""), String(o.with ?? "")) ? ok++ : bad++; }
    else if (o.op === "insert_after" && el) { const tag = /^(p|h1|h2|h3|li)$/.test(o.tag) ? o.tag : "p"; let n;
      if (el.tagName.toLowerCase() === tag) { n = el.cloneNode(true); setText(n, String(o.text ?? "")); } else { n = document.createElement(tag); n.textContent = String(o.text ?? ""); }
      if (o.align) n.style.textAlign = o.align; if (tag === "li" && el.tagName !== "LI") { const ul = document.createElement("ul"); ul.append(n); n = ul; }
      el.after(n); ok++; }
    else if (o.op === "delete" && el) { el.remove(); ok++; }
    else if (o.op === "cell" && el && el.rows[o.r] && el.rows[o.r].cells[o.c]) { const c = el.rows[o.r].cells[o.c]; const p = c.querySelector("p,h1,h2,h3,li") || c; setText(p, String(o.text ?? "")); ok++; }
    else if (o.op === "row_add" && el && el.rows.length) { const src = el.rows[Math.min(el.rows.length - 1, Math.max(0, o.after ?? el.rows.length - 1))]; const n = src.cloneNode(true);
      [...n.cells].forEach((c, i) => { const p = c.querySelector("p,h1,h2,h3,li") || c; setText(p, String((o.cells || [])[i] ?? "")); }); src.after(n); ok++; }
    else if (o.op === "row_del" && el && el.rows[o.r]) { el.rows[o.r].remove(); ok++; }
    else if (o.op === "html") { page.innerHTML = clean(o.html) || "<p><br></p>"; ok++; }
    else if (o.op === "style") { const els = o.id === "all" ? [...page.querySelectorAll("p,h1,h2,h3,h4,li")] : el ? [el] : []; if (!els.length) { bad++; continue; } for (const x of els) safeCss(x, o.css); ok++; }
    else if (o.op === "rule") { if (!el) { bad++; continue; } const side = o.side === "top" ? "Top" : "Bottom", w = Math.max(.5, Math.min(12, +o.weight || 2)); el.style["border" + side] = `${w}pt ${o.style === "double" ? "double" : "solid"} ${CLR(o.color)}`; el.style["padding" + side] = "3pt"; ok++; }
    else if (o.op === "page") { const W = ED.kinds.word._ai, g = W.pg, mm = v => Math.max(5, Math.min(60, +v));
      for (const k of ["mt", "mb", "ml", "mr"]) if (o[k] != null && isFinite(+o[k])) g[k] = mm(o[k]);
      if (o.border != null) g.pbd = o.border === "left" || o.border === "box" ? o.border : ""; if (o.border_weight) g.pbw = Math.max(.5, Math.min(6, +o.border_weight)); if (o.border_color) g.pbc = CLR(o.border_color);
      if (o.font) g.font = String(o.font).slice(0, 60); if (o.size) g.size = Math.max(6, Math.min(36, +o.size)); W.applyGeo(); ok++; }
    else if (o.op === "fit_one_page") { fitOne(page); ok++; }
    else if (o.op === "insert_html") { const frag = document.createElement("div"); frag.innerHTML = clean(o.html); const nodes = [...frag.childNodes]; if (!nodes.length) { bad++; continue; }
      const at = o.after === "start" ? null : o.after === "end" || !map.get(o.after) ? "end" : map.get(o.after);
      if (at === null) page.prepend(...nodes); else if (at === "end") page.append(...nodes); else at.after(...nodes); ok++; }
    else if (o.op === "table_cols" && el && el.rows && Array.isArray(o.widths)) { const tot = o.widths.reduce((a, b) => a + (+b || 0), 0) || 1; let cg = el.querySelector("colgroup"); if (cg) cg.remove(); cg = document.createElement("colgroup"); o.widths.forEach(w => { const c = document.createElement("col"); c.style.width = (100 * (+w || 0) / tot).toFixed(1) + "%"; cg.append(c); }); el.prepend(cg); el.style.width = (o.table_width ? Math.max(20, Math.min(100, +o.table_width)) : 100) + "%"; ok++; }
    else bad++;
  } catch (e) { bad++; } }
  wordRelayout(); return { ok, bad };
}
// AI values like "1,20,000", "₹ 500", "Rs. 45", "১২০" become plain numbers so formulas/totals don't read them as 0
function xlVal(v) {
  if (typeof v === "number") return String(v); let t = String(v ?? ""); if (t[0] === "=") return t;
  const d = t.replace(/[০-৯]/g, ch => String(ch.charCodeAt(0) - 0x9E6)).trim();
  const m = d.replace(/^(₹|rs\.?|inr)\s*/i, "").replace(/\s*(\/-|\/–)$/, "").replace(/,/g, "");
  return /^[+-]?(\d+\.?\d*|\.\d+)%?$/.test(m) && /\d/.test(d) && (m !== d.replace(/,/g, "") || /[০-৯,]/.test(t)) ? m : t;
}
function applyExcel(ops) {
  const a = ED.kinds.excel._api(); let ok = 0, bad = 0;
  a.aiEdit(({ book, putRaw, setFmt, newSheet }) => {
    const sh = n => book.sheets.find(s => s.name === n) || book.sheets[a.si()] || book.sheets[0];
    const grow = (s, r, c) => { s.nr = Math.max(s.nr, r + 2); s.nc = Math.max(s.nc, c + 1); };
    const rng = (s, ref) => { const [x, y] = String(ref || "").split(":"); const p = RC(x), q = RC(y || x); return p && q ? { r1: Math.min(p.r, q.r), c1: Math.min(p.c, q.c), r2: Math.max(p.r, q.r), c2: Math.max(p.c, q.c) } : null; };
    for (const o of ops) { try {
      if (o.op === "add_sheet") { if (!book.sheets.some(s => s.name === o.name)) book.sheets.push(newSheet(String(o.name || "Sheet" + (book.sheets.length + 1)).slice(0, 31))); ok++; continue; }
      const s = sh(o.sheet);
      if (o.op === "set") { const p = RC(o.cell); if (!p) { bad++; continue; } putRaw(s, p.r, p.c, xlVal(o.v)); grow(s, p.r, p.c); ok++; }
      else if (o.op === "set_range") { const p = RC(o.from); if (!p || !Array.isArray(o.rows)) { bad++; continue; } o.rows.slice(0, 2000).forEach((row, i) => (Array.isArray(row) ? row : [row]).forEach((v, j) => { putRaw(s, p.r + i, p.c + j, xlVal(v)); grow(s, p.r + i, p.c + j); })); ok++; }
      else if (o.op === "style") { const R = rng(s, o.range); if (!R) { bad++; continue; } const patch = {}; if (o.b != null) patch.b = !!o.b; if (o.bg) patch.bg = o.bg; if (o.nf) patch.nf = o.nf; if (o.al) patch.al = o.al; if (o.color) patch.color = o.color;
        for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) setFmt(s, r, c, patch); ok++; }
      else if (o.op === "clear") { const R = rng(s, o.range); if (!R) { bad++; continue; } for (let r = R.r1; r <= R.r2; r++) for (let c = R.c1; c <= R.c2; c++) putRaw(s, r, c, ""); ok++; }
      else bad++;
    } catch (e) { bad++; } }
  });
  return { ok, bad };
}
function applyNote(ops) {
  const ta = noteTa(); let lines = ta.value.split("\n"), text = ta.value, ok = 0, bad = 0;
  // line operations refer to the ORIGINAL numbering: apply from the bottom up
  const lineOps = ops.filter(o => o.op === "insert_after_line" || o.op === "delete_lines").sort((x, y) => (y.line ?? y.from) - (x.line ?? x.from));
  for (const o of ops) { if (o.op === "set_text") { text = String(o.text ?? ""); lines = text.split("\n"); ok++; } }
  for (const o of lineOps) { if (o.op === "insert_after_line") { const i = Math.max(0, Math.min(lines.length, +o.line || 0)); lines.splice(i, 0, ...String(o.text ?? "").split("\n")); ok++; } else { const f = Math.max(1, +o.from), t = Math.max(f, +o.to || f); lines.splice(f - 1, t - f + 1); ok++; } }
  text = lines.join("\n");
  for (const o of ops) if (o.op === "replace") { if (o.find && text.includes(o.find)) { text = text.split(o.find).join(String(o.with ?? "")); ok++; } else bad++; }
  for (const o of ops) if (!["set_text", "insert_after_line", "delete_lines", "replace"].includes(o.op)) bad++;
  ta.value = text; ta.dispatchEvent(new Event("input", { bubbles: true })); return { ok, bad };
}
async function applyImage(ops, atts) {
  const a = ED.kinds.image._api(); let ok = 0, bad = 0;
  for (const o of ops) { try {
    if (o.op === "filter" && ["grey", "invert", "soft", "sharpen"].includes(o.kind)) { a.filt(o.kind); ok++; }
    else if (o.op === "rotate") { a.rotate(o.dir < 0 ? -1 : 1); ok++; }
    else if (o.op === "flip") { a.flip(o.h !== false); ok++; }
    else if (o.op === "resize" && o.w > 0 && o.h > 0) { a.resizeTo(Math.min(10000, +o.w), Math.min(10000, +o.h)); ok++; }
    else if (o.op === "picture") { const pic = window.BA_IMG && String(o.prompt || "").trim() ? await window.BA_IMG.gen(String(o.prompt), a.W, a.H) : null; if (!pic) { bad++; continue; }
      a.aiEdit(({ g, W, H, L }) => { const k = Math.max(W / pic.bm.width, H / pic.bm.height), dw = pic.bm.width * k, dh = pic.bm.height * k; g.drawImage(pic.bm, (W - dw) / 2 - L.x, (H - dh) / 2 - L.y, dw, dh); }); ok++; }
    else if (o.op === "overlay") { const at = atts.filter(x => x.blob && x.isImg)[+o.att || 0]; if (!at) { bad++; continue; } const bm = await createImageBitmap(at.blob);
      a.aiEdit(({ g, L }) => { g.save(); g.globalAlpha = Math.max(0.05, Math.min(1, +o.opacity || 1)); g.drawImage(bm, (+o.x || 0) - L.x, (+o.y || 0) - L.y, +o.w || bm.width, +o.h || bm.height); g.restore(); }); ok++; }
    else if (o.op === "background" || o.op === "rect" || o.op === "text") {
      if (o.op === "text") { try { await document.fonts.load(`${+o.size || 32}px 'Noto Sans Bengali'`, "অ"); } catch (e) { /* ignore */ } }
      a.aiEdit(({ g, W, H, L }) => { g.save(); g.translate(-L.x, -L.y);
        if (o.op === "background") { g.fillStyle = o.color || "#ffffff"; g.fillRect(0, 0, W, H); }
        else if (o.op === "rect") { g.fillStyle = g.strokeStyle = o.color || "#000"; g.lineWidth = 4; o.fill === false ? g.strokeRect(+o.x || 0, +o.y || 0, +o.w || 100, +o.h || 50) : g.fillRect(+o.x || 0, +o.y || 0, +o.w || 100, +o.h || 50); }
        else { const sz = +o.size || 32; g.font = `${o.bold ? "bold " : ""}${sz}px 'Noto Sans Bengali','Noto Sans',sans-serif`; g.fillStyle = o.color || "#000"; g.textBaseline = "top"; g.textAlign = o.align === "center" ? "center" : "left";
          const x = o.align === "center" ? W / 2 : (+o.x || 0); let y = +o.y || 0; const maxW = W - (o.align === "center" ? 40 : x + 20);
          for (const para of String(o.text || "").split("\n")) { let line = ""; for (const w of para.split(" ")) { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += sz * 1.4; line = w; } else line = t; } g.fillText(line, x, y); y += sz * 1.4; } }
        g.restore(); }); ok++; }
    else bad++;
  } catch (e) { bad++; } }
  return { ok, bad };
}
function verify(k, before) {
  const notes = [];
  if (k === "word") { const t = wordPage().querySelectorAll("table").length; if (t || before.tables) notes.push(T("a_tables", t)); }
  if (k === "excel") { const a = ED.kinds.excel._api(); const tot = [], errs = [];
    a.book.sheets.forEach((s, si) => { for (const [kk, raw] of s.cells) if (String(raw)[0] === "=") { const [r, c] = kk.split(",").map(Number); const v = a.show(a.val(r, c, si), s.fmt.get(kk)); (/^#/.test(v) ? errs : tot).push(`${A1(r, c)}=${v}`); } });
    if (tot.length) notes.push(T("a_totals", tot.slice(0, 6).join(", ") + (tot.length > 6 ? "…" : ""))); if (errs.length) notes.push(T("a_errs", errs.slice(0, 6).join(", "))); }
  return notes;
}

/* ---------- attachments ---------- */
async function readAtt(file, k) {
  const e = ext(file.name), at = { name: file.name, blob: file, e, text: "", how: "" };
  if (e === "docx") { await load("mammoth"); at.text = String((await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value || ""); }
  else if (["xlsx", "xls", "csv"].includes(e)) { await load("xlsx"); const wb = e === "csv" ? XLSX.read(await file.text(), { type: "string" }) : XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellFormula: true });
    at.text = wb.SheetNames.slice(0, 6).map(n => "SHEET " + n + "\n" + XLSX.utils.sheet_to_csv(wb.Sheets[n]).slice(0, 8000)).join("\n\n"); }
  else if (e === "pdf") { await load("pdfworker"); await load("pdfjs"); const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; let t = "";
    for (let p = 1; p <= Math.min(pdf.numPages, 30); p++) { const c = await (await pdf.getPage(p)).getTextContent(); t += c.items.map(x => x.str + (x.hasEOL ? "\n" : " ")).join("") + "\n"; }
    if (t.replace(/\s/g, "").length > 40) at.text = t; else if (window.BA_OCR) { const r = await BA_OCR.read(file, file.name); at.text = r.text; at.how = r.how; } }
  else if (/^(png|jpe?g|webp|gif|bmp)$/.test(e) || (file.type || "").startsWith("image/")) { at.isImg = true; if (window.BA_OCR) { const r = await BA_OCR.read(file, file.name || "image.png"); at.text = r.text; at.how = r.how; } }
  else if (["txt", "md", "json", "log"].includes(e) || (file.type || "").startsWith("text/")) at.text = (await file.text()).slice(0, 60000);
  else throw new Error(T("a_badtype", file.name));
  at.text = String(at.text || "").slice(0, 30000); void k; return at;
}
async function addFiles(k, files) {
  const s = S[k];
  for (let f of files) {
    if (!f.name || f.name === "image.png") f = new File([f], `screenshot-${stamp().replace(/[-: ]/g, "")}.${(f.type.split("/")[1] || "png").replace("jpeg", "jpg")}`, { type: f.type });
    const chip = { name: f.name, busy: true }; s.atts.push(chip); chips(k); say(k, T("a_reading", f.name));
    try { Object.assign(chip, await readAtt(f, k), { busy: false }); say(k, chip.how === "tesseract" ? T("a_ocr", f.name) : chip.how === "vision" ? T("a_vision", f.name) : ""); }
    catch (e) { s.atts.splice(s.atts.indexOf(chip), 1); say(k, (e && e.message) || String(e)); }
    chips(k);
  }
}
function chips(k) {
  const s = S[k], box = s.el.chips; box.textContent = "";
  s.atts.forEach((a, i) => box.append(h("span", { class: "ea-chip", "data-ea-chip": String(i), title: a.name }, (a.isImg ? "🖼 " : "📄 ") + a.name + (a.busy ? " ⏳" : a.how === "tesseract" ? " · OCR" : ""),
    h("button", { type: "button", class: "ea-x", "aria-label": "Remove " + a.name, onclick: () => { s.atts.splice(i, 1); chips(k); } }, "×"))));
  box.hidden = !s.atts.length;
}
function pickFromPendrive(k) {
  const files = (typeof pd !== "undefined" && pd.files || []).filter(f => new RegExp("\\.(" + ACCEPT.replace(/\./g, "").split(",").join("|") + ")$", "i").test(f.path) && !f.path.startsWith("⎇/"));
  const list = h("div", { class: "ea-pklist" }); const fil = h("input", { type: "search", placeholder: T("a_filter"), class: "ea-pkf" });
  const dlg = h("dialog", { class: "ed-pick ea-pick" }, h("b", {}, T("a_pick")), fil, list, h("div", { class: "ed-pk-act" }, h("button", { type: "button", class: "btn", onclick: () => { dlg.close(); dlg.remove(); } }, T("a_cancel"))));
  const draw = () => { list.textContent = ""; for (const f of files.filter(f => f.path.toLowerCase().includes(fil.value.toLowerCase())).slice(0, 200)) list.append(h("button", { type: "button", class: "ea-pkrow", "data-ea-pk": f.path, onclick: async () => { dlg.close(); dlg.remove(); try { const buf = await ED.io.fetchFile(f); await addFiles(k, [new File([buf], f.path.split("/").pop(), { type: f.type || ED.MIME[ext(f.path)] || "" })]); } catch (e) { say(k, e.message); } } }, "📄 " + f.path)); };
  fil.addEventListener("input", draw); draw(); document.body.append(dlg); dlg.showModal();
}

/* ---------- the AI turn ---------- */
const FORMAT_RE = /format|template|layout|like this|same (style|way|as)|exactly|mirror|copy the (style|design)|in this (style|form)|fill (this|the|it)|ফরম্যাট|ছক|মতো|মত করে|একই|এইভাবে|পূরণ/i;
const fmtMatch = (k, a) => k === "word" ? a.e === "docx" : k === "excel" ? ["xlsx", "xls", "csv"].includes(a.e) : k === "note" ? ["txt", "md"].includes(a.e) : false;
async function send(k) {
  const s = S[k], q = s.el.q.value.trim(); if (!q || s.busy) return;
  if (s.atts.some(a => a.busy)) { say(k, T("a_working")); return; }
  s.busy = true; s.el.go.disabled = true; say(k, T("a_working")); const t0 = performance.now();
  const before = { snap: await snapshot(k), name: ED.st[k].name, file: ED.st[k].file, dirty: ED.st[k].dirty, tables: k === "word" ? wordPage().querySelectorAll("table").length : 0 };
  const notes = [];
  try {
    const atts = s.atts.slice();
    const fmtAtt = FORMAT_RE.test(q) ? atts.find(a => fmtMatch(k, a)) : null;
    if (fmtAtt) { // load the attachment's exact layout into the editor, then let the AI change only the content
      if (k === "note") { const ta = noteTa(); ta.value = await fmtAtt.blob.text(); ta.dispatchEvent(new Event("input", { bubbles: true })); }
      else await ED.kinds[k].load(await fmtAtt.blob.arrayBuffer(), fmtAtt.e, fmtAtt.name);
      ED.st[k].file = null; ED.st[k].name = "New " + fmtAtt.name.replace(/\.[^.]+$/, "") + "." + (k === "excel" && fmtAtt.e === "csv" ? "xlsx" : fmtAtt.e); ED.dirty(k); ED.label(k);
      notes.push(T("a_fmt", fmtAtt.name)); before.tables = k === "word" ? wordPage().querySelectorAll("table").length : 0;
    }
    const memo0 = fmtAtt && (k === "word" || k === "note") ? memoLines(k).map(x => x.text) : null;
    for (const a of atts) if (a.how === "tesseract") notes.push(T("a_ocr", a.name)); else if (a.how === "vision") notes.push(T("a_vision", a.name));
    // the AI always sees what is open: for a picture, the text on the canvas is read (vision model first, OCR fallback) and kept for follow-ups
    const extra = []; s.mem = s.mem || [];
    if (k === "image" && window.BA_OCR) { try { const cur = sig(k); if (s.picSig !== cur) { say(k, T("a_reading", T("a_curpic")));
          const c = ED.kinds.image._api().flat(), sc = Math.min(1, 1600 / Math.max(c.width, c.height)); const d = document.createElement("canvas"); d.width = Math.round(c.width * sc); d.height = Math.round(c.height * sc); d.getContext("2d").drawImage(c, 0, 0, d.width, d.height);
          const blob = await new Promise(r => d.toBlob(r, "image/png")); const o = await BA_OCR.read(blob, "canvas.png"); s.picSig = cur; s.picText = String(o.text || "").trim(); s.picHow = o.how; say(k, T("a_working")); }
        extra.push({ name: "CURRENT PICTURE ON THE CANVAS (its text, read just now" + (s.picHow === "tesseract" ? " by OCR" : " by the vision model") + ")", text: s.picText || "(no readable text on the picture now)", how: s.picHow, image: true, current: true });
        if (s.picText && !s.mem.some(m => m.text === s.picText)) s.mem.push({ name: "Picture text read earlier in this chat", text: s.picText }); } catch (e) { /* the request still goes ahead */ } }
    for (const a of atts) if (a.text && !s.mem.some(m => m.text === a.text)) s.mem.push({ name: "Earlier attachment " + a.name, text: a.text });
    if (s.mem.length > 6) s.mem = s.mem.slice(-6);
    const earlier = s.mem.filter(m => !(k === "image" && m.text === s.picText) && !atts.some(a => a.text === m.text)).map(m => ({ name: m.name, text: m.text, how: "", earlier: true }));
    const r = await pdApi("ed-ai", { kind: k, q, name: ED.st[k].name, doc: struct(k), fast: s.el.fast.checked, lang: lang(),
      thread: s.thread.slice(-12).map(t => ({ q: t.q, a: t.a })), attachments: [...extra, ...atts.map(a => ({ name: a.name, text: a.text, how: a.how, format: a === fmtAtt, image: !!a.isImg })), ...earlier].slice(0, 8) });
    const ops = r.ops || []; let res = { ok: 0, bad: 0 };
    if (ops.length) res = k === "word" ? applyWord(ops) : k === "excel" ? applyExcel(ops) : k === "note" ? applyNote(ops) : await applyImage(ops, atts);
    if (memo0) { const n = memoFix(k, q, memo0); if (n) res.ok += n; }
    if (ops.length || fmtAtt) { ED.dirty(k); s.undo = before; }
    if (k === "excel" && ops.length) notes.push(...excelDiff(before));
    notes.push(...verify(k, before));
    const msg = [r.reply || "", ops.length ? T("a_applied", res.ok) : "", res.bad ? T("a_failed", res.bad) : "", ...notes].filter(Boolean).join("\n");
    if (k === "word") wdSel = null;
    s.thread.push({ q, a: msg, at: Date.now(), atts: atts.map(a => a.name), ops: ops.length });
    s.el.q.value = ""; s.atts = []; chips(k); thread(k);
    s.el.res.hidden = !s.undo; say(k, `${((performance.now() - t0) / 1000).toFixed(1)} s`);
  } catch (e) { say(k, T("a_err", (e && e.message) || String(e))); try { if (before.snap) { /* nothing applied */ } } catch (x) { /* ignore */ } }
  finally { s.busy = false; s.el.go.disabled = false; }
}
/* Format copy: the copied letter's own Memo No. / Date must not survive. Lines the AI left unchanged get the new number (from the request, else a blank to fill) and today's date. */
const MEMO_RE = /(memo\s*no\.?|memo\s*number|no\.|স্মারক\s*নং|মেমো\s*নং)\s*[:.]?\s*/i, DATE_RE = /(date[d]?|তারিখ)\s*[:.\-]?\s*/i;
function memoLines(k) {
  if (k === "note") return noteTa().value.split("\n").map((text, i) => ({ text, i })).filter(x => MEMO_RE.test(x.text) && /\d/.test(x.text) || /^\s*(date|তারিখ)\b/i.test(x.text));
  return [...wordPage().querySelectorAll("p,td,th,h1,h2,h3,div:not(:has(p,td,div))")].filter(e => e.childElementCount < 40 && e.textContent.length < 300 && ((MEMO_RE.test(e.textContent) && /\d/.test(e.textContent)) || /(^|\s)(date|তারিখ)\s*[:.\-]/i.test(e.textContent))).map(el => ({ el, text: el.textContent }));
}
function memoFix(k, q, old) {
  const d = new Date(), two = n => String(n).padStart(2, "0"), today = `${two(d.getDate())}.${two(d.getMonth() + 1)}.${d.getFullYear()}`;
  const wantNo = (q.match(/(?:memo\s*no\.?|memo\s*number|স্মারক\s*নং|মেমো\s*নং)\s*[:.]?\s*([^\s,;]+(?:\s*\/\s*[^\s,;]+)*)/i) || [])[1];
  const wantDate = (q.match(/(?:date[d]?|তারিখ)\s*[:.]?\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i) || [])[1] || today;
  const DT = /\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}(st|nd|rd|th)?\s+[A-Za-z]{3,9},?\s+\d{4}/g;
  const fix = t => { let x = t;
    if (MEMO_RE.test(x)) x = x.replace(new RegExp(MEMO_RE.source + "([^\\s,;]*(?:\\s*\\/\\s*[^\\s,;]+)*)", "i"), (m, lab) => m.slice(0, m.length - (m.match(/[^\s,;]*(?:\s*\/\s*[^\s,;]+)*$/) || [""])[0].length) + (wantNo || "______"));
    x = x.replace(new RegExp("(" + DATE_RE.source + ")(" + DT.source + ")", "i"), (m, lab) => lab + wantDate);
    return x; };
  let n = 0;
  for (const x of memoLines(k)) { if (!old.includes(x.text)) continue; const nt = fix(x.text); if (nt === x.text) continue; n++;
    if (k === "note") { const ta = noteTa(), L = ta.value.split("\n"); L[x.i] = nt; ta.value = L.join("\n"); ta.dispatchEvent(new Event("input", { bubbles: true })); }
    else { const w = document.createTreeWalker(x.el, NodeFilter.SHOW_TEXT); const ts = []; while (w.nextNode()) ts.push(w.currentNode); if (!ts.length) continue;
      let all = ts.map(t => t.nodeValue).join(""); const fixed = fix(all); // put the new text back keeping the first run's formatting for changed parts
      let i = 0; while (i < all.length && all[i] === fixed[i]) i++; let j = 0; while (j < all.length - i && all[all.length - 1 - j] === fixed[fixed.length - 1 - j]) j++;
      const mid = fixed.slice(i, fixed.length - j); let pos = 0, put = false;
      for (const t of ts) { const a = pos, b = pos + t.nodeValue.length; pos = b; const s0 = Math.max(a, i), e0 = Math.min(b, all.length - j);
        if (b <= i || a >= all.length - j) { if (!put && a >= all.length - j && a === i) { t.nodeValue = mid + t.nodeValue; put = true; } continue; }
        const v = t.nodeValue; t.nodeValue = v.slice(0, s0 - a) + (put ? "" : mid) + v.slice(e0 - a); put = true; }
      if (!put) ts[ts.length - 1].nodeValue += mid; } }
  if (n && k === "word") wordRelayout();
  return n;
}
async function undo(k) { const s = S[k]; if (!s.undo) return; const b = s.undo; s.undo = null; await restore(k, b.snap); ED.st[k].name = b.name; ED.st[k].file = b.file; ED.st[k].dirty = b.dirty; ED.label(k); s.el.res.hidden = true; s.thread.push({ q: "↶", a: T("a_undone"), at: Date.now() }); thread(k); say(k, T("a_undone")); }
function keep(k) { S[k].undo = null; S[k].el.res.hidden = true; say(k, T("a_kept")); }
function thread(k) {
  // Latest reply only, as a compact normal line (no selection look); older turns in a closed "History (n)" toggle. Never overlays the document.
  const s = S[k], box = s.el.thread; box.textContent = "";
  const turn = t => h("div", { class: "ea-turn" }, h("div", { class: "ea-you" }, h("b", {}, T("a_you") + ": "), t.q + (t.atts && t.atts.length ? "  📎 " + t.atts.join(", ") : "")), h("div", { class: "ea-ai" }, h("b", {}, T("a_ai") + ": "), t.a), t.a && t.a.length > 160 ? h("div", { class: "ea-row" },
    h("button", { type: "button", class: "btn small ea-copy", onclick: e => { navigator.clipboard && navigator.clipboard.writeText(t.a).catch(() => {}); e.target.textContent = "✓ " + T("a_copied"); } }, "📋 " + T("a_copy")),
    k !== "note" ? h("button", { type: "button", class: "btn small ea-tonote", onclick: () => { ED.show("note"); const ta = noteTa(); ta.value = (ta.value ? ta.value.replace(/\s*$/, "\n\n") : "") + t.a; ta.dispatchEvent(new Event("input", { bubbles: true })); } }, "🗒 " + T("a_tonote")) : null,
    k !== "word" ? h("button", { type: "button", class: "btn small ea-toword", onclick: () => { ED.show("word"); const pg = wordPage(); for (const line of t.a.split("\n")) { const p = document.createElement("p"); p.textContent = line; pg.append(p); } wordRelayout(); ED.dirty("word"); } }, "📄 " + T("a_toword")) : null) : null);
  const all = s.thread, last = all[all.length - 1];
  if (all.length > 1) { const d = h("details", { class: "ea-hist", id: "ea-hist-" + k }, h("summary", {}, T("a_hist") + " (" + (all.length - 1) + ")")); for (const t of all.slice(0, -1)) d.append(turn(t)); box.append(d); }
  if (last) { const el = turn(last); el.classList.add("ea-last"); box.append(el); }
  box.hidden = !all.length;
}
const say = (k, m) => { S[k].el.st.textContent = m || ""; };

/* ---------- conversations (per editor) ---------- */
async function exportBlob(k) {
  const st = ED.st[k]; const e = k === "excel" ? "xlsx" : k === "word" ? "docx" : k === "note" ? (ext(st.name) && ED.TYPES.note.includes(ext(st.name)) ? ext(st.name) : "txt") : "png";
  let { blob } = await ED.kinds[k].export(e); let ee = e;
  if (k === "image" && blob.size > 3.8 * 1024 * 1024) { const c = ED.kinds.image._api().flat(); const sc = Math.min(1, 2400 / Math.max(c.width, c.height)); const o = document.createElement("canvas"); o.width = Math.round(c.width * sc); o.height = Math.round(c.height * sc); const g = o.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, o.width, o.height); g.drawImage(c, 0, 0, o.width, o.height); blob = await new Promise(r => o.toBlob(r, "image/jpeg", 0.85)); ee = "jpg"; }
  return { blob, e: ee };
}
async function save(k, quiet) {
  const s = S[k], st = ED.st[k];
  if (isEmpty(k) && !s.thread.length) { if (!quiet) say(k, T("a_empty")); return null; }
  const { blob, e } = await exportBlob(k);
  const name = st.file ? st.file.path.split("/").pop() : st.name;
  const row = await pdApi("edconv/save", { area: k, title: `${name} · ${stamp()}`, name: name.replace(/\.[^.]+$/, "") + "." + e, ext: e, mime: blob.type, data: await b64of(blob), thread: s.thread.map(t => ({ q: t.q, a: t.a, at: t.at })) });
  s.lastSig = sig(k); s.rows.unshift(row); rows(k); toastT(T("a_saved", row.title)); say(k, T("a_saved", row.title)); return row;
}
async function newPage(k) {
  const s = S[k], st = ED.st[k];
  const unchanged = s.lastSig != null && s.lastSig === sig(k);
  if (isEmpty(k) || unchanged) say(k, T("a_empty"));
  else { try { await save(k, true); } catch (e) { say(k, T("a_err", e.message)); return; } }
  if (k === "note" && ED.kinds.note._api) { ED.kinds.note.blank(); } else ED.kinds[k].blank();
  st.file = null; st.name = DEFNAME[k]; st.dirty = false; ED.label(k); s.thread = []; s.undo = null; s.atts = []; s.lastSig = null; s.mem = []; s.picSig = null; chips(k); thread(k); s.el.res.hidden = true; say(k, T("a_newdone"));
  if (k === "note") { const ta = noteTa(); if (ta.value) { ta.value = ""; ta.dispatchEvent(new Event("input", { bubbles: true })); ED.st.note.dirty = false; ED.label("note"); } }
}
async function openRow(k, id) {
  if (ED.st[k].dirty && !confirm(T("a_lost"))) return;
  const r = await pdApi("edconv/get", { area: k, rid: id });
  await ED.kinds[k].load(bufOf(r.data), r.ext, r.name);
  const st = ED.st[k]; st.file = null; st.name = r.name; st.dirty = false; ED.label(k);
  S[k].thread = (r.thread || []).slice(); S[k].undo = null; S[k].el.res.hidden = true; thread(k); S[k].lastSig = sig(k);
  if (k === "image") requestAnimationFrame(() => ED.kinds.image.fit && ED.kinds.image.fit());
  S[k].el.cv.open = false; say(k, "📂 " + r.title);
}
async function dlRow(k, id) { const r = await pdApi("edconv/get", { area: k, rid: id }); const b = new Blob([bufOf(r.data)], { type: r.mime || ED.MIME[r.ext] || "" }); const a = h("a", { href: URL.createObjectURL(b), download: r.name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
function rows(k) {
  const s = S[k], ul = s.el.cvList; ul.textContent = "";
  s.el.cvSum.textContent = `💬 ${T("a_cv")} · ${s.rows.length}`;
  if (!s.rows.length) { ul.append(h("li", { class: "hint" }, T("a_none"))); return; }
  for (const r of s.rows) ul.append(h("li", { class: "ea-cvrow", "data-ea-row": r.id },
    h("span", { class: "ea-cvt" }, r.title), h("small", {}, ` ${r.n ? r.n + " AI · " : ""}${Math.max(1, Math.round(r.size * 0.75 / 1024))} KB`),
    h("span", { class: "ea-cvb" },
      h("button", { type: "button", class: "btn small", "data-ea-open": r.id, onclick: () => openRow(k, r.id).catch(e => say(k, e.message)) }, T("a_open")),
      h("button", { type: "button", class: "btn small", "data-ea-ren": r.id, onclick: async () => { const n = prompt(T("a_renq"), r.title); if (!n || !n.trim()) return; const old = r.title; r.title = n.trim(); rows(k); try { const x = await pdApi("edconv/rename", { area: k, rid: r.id, title: n.trim() }); r.title = x.title || r.title; } catch (e) { r.title = old; say(k, T("a_err", (e && e.message) || String(e))); } rows(k); } }, T("a_ren")),
      h("button", { type: "button", class: "btn small", "data-ea-dl": r.id, onclick: () => dlRow(k, r.id).catch(e => say(k, e.message)) }, "⬇"),
      h("button", { type: "button", class: "btn small", "data-ea-del": r.id, onclick: async () => { if (!confirm(T("a_delq", r.title))) return; await pdApi("edconv/delete", { area: k, rid: r.id }); s.rows = s.rows.filter(x => x.id !== r.id); rows(k); } }, T("a_del")))));
}
async function loadRows(k) { try { S[k].rows = (await pdApi("edconv/list", { area: k })).rows || []; } catch (e) { S[k].rows = []; } rows(k); }

/* ---------- mount ---------- */
function mount(k) {
  const st = ED.st[k]; if (!st.sec || S[k]) return;
  const s = S[k] = { thread: [], atts: [], undo: null, lastSig: null, rows: [], el: {} };
  const fin = h("input", { type: "file", multiple: true, accept: ACCEPT, hidden: true, id: "ea-file-" + k, onchange: e => { addFiles(k, [...e.target.files]); e.target.value = ""; } });
  s.el.q = h("textarea", { class: "ea-q", id: "ea-q-" + k, rows: "3", placeholder: T("a_ph"), autocomplete: "off", "aria-label": T("a_ph") });
  s.el.q.addEventListener("keydown", e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(k); } });
  s.el.q.addEventListener("paste", e => { const fs = [...(e.clipboardData && e.clipboardData.files || [])]; if (fs.length) { e.preventDefault(); e.stopPropagation(); addFiles(k, fs); } });
  s.el.fast = h("input", { type: "checkbox", id: "ea-fast-" + k, checked: true });
  s.el.go = h("button", { type: "button", class: "btn primary", id: "ea-go-" + k, onclick: () => send(k) }, T("a_send"));
  s.el.chips = h("div", { class: "ea-chips", id: "ea-chips-" + k, hidden: true });
  s.el.thread = h("div", { class: "ea-thread", id: "ea-thread-" + k, hidden: true, "aria-live": "polite" });
  s.el.st = h("span", { class: "hint ea-st", id: "ea-st-" + k, role: "status" });
  s.el.res = h("div", { class: "ea-res", id: "ea-res-" + k, hidden: true },
    h("button", { type: "button", class: "btn small primary", id: "ea-keep-" + k, onclick: () => keep(k) }, T("a_keep")),
    h("button", { type: "button", class: "btn small", id: "ea-undo-" + k, onclick: () => undo(k).catch(e => say(k, e.message)) }, T("a_undo")));
  const panel = h("div", { class: "ea-panel", id: "ea-" + k },
    s.el.thread, s.el.res, s.el.chips, s.el.q,
    h("div", { class: "ea-row" },
      h("button", { type: "button", class: "btn small", id: "ea-att-" + k, onclick: () => fin.click() }, T("a_attach")),
      h("button", { type: "button", class: "btn small", id: "ea-pd-" + k, onclick: () => pickFromPendrive(k) }, T("a_frompd")),
      h("label", { class: "ea-fastl" }, s.el.fast, " " + T("a_fast")), s.el.st, h("span", { class: "ea-sp" }), s.el.go), fin);
  for (const ev of ["dragenter", "dragover"]) panel.addEventListener(ev, e => { if ([...(e.dataTransfer && e.dataTransfer.types || [])].includes("Files")) { e.preventDefault(); panel.classList.add("ea-drag"); } });
  panel.addEventListener("dragleave", () => panel.classList.remove("ea-drag"));
  panel.addEventListener("drop", e => { panel.classList.remove("ea-drag"); const fs = [...(e.dataTransfer && e.dataTransfer.files || [])]; if (fs.length) { e.preventDefault(); e.stopPropagation(); addFiles(k, fs); } });
  s.el.cvSum = h("summary", {}, "💬 " + T("a_cv"));
  s.el.cvList = h("ul", { class: "ea-cvlist", id: "ea-cvlist-" + k });
  s.el.cv = h("details", { class: "ea-cv", id: "ea-cv-" + k }, s.el.cvSum, s.el.cvList);
  st.sec.querySelector(".ed-head").after(s.el.cv);
  st.body.after(panel);
  loadRows(k);
}
// pendrive closed: forget everything
const main = document.getElementById("pd-main");
if (main) new MutationObserver(() => { if (main.hidden) for (const k of Object.keys(S)) { const s = S[k]; s.thread = []; s.atts = []; s.undo = null; s.rows = []; s.lastSig = null; s.mem = []; s.picSig = null; chips(k); thread(k); rows(k); s.el.res.hidden = true; } else for (const k of Object.keys(S)) loadRows(k); }).observe(main, { attributes: true, attributeFilter: ["hidden"] });
document.head.append(h("style", { id: "ea-css" }, `
.ea-panel { margin-top: 10px; border: 1px solid var(--line); border-radius: 10px; padding: 8px; display: grid; gap: 6px; background: var(--surface); }
.ea-panel.ea-drag { outline: 2px dashed var(--accent); }
.ea-q { width: 100%; min-height: 70px; resize: vertical; font: inherit; padding: 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg, #fff); color: inherit; box-sizing: border-box; }
.ea-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; } .ea-sp { flex: 1; } .ea-fastl { font-size: .85rem; display: inline-flex; gap: 4px; align-items: center; }
.ea-chips { display: flex; gap: 6px; flex-wrap: wrap; } .ea-chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 4px 2px 8px; border: 1px solid var(--accent); border-radius: 999px; font-size: .8rem; }
.ea-x { border: 0; background: none; cursor: pointer; font-size: 1rem; line-height: 1; color: inherit; padding: 0 4px; }
.ea-thread { position: static; max-height: 160px; overflow: auto; display: grid; gap: 4px; font-size: .85rem; } .ea-turn { padding: 2px 6px; white-space: pre-wrap; background: none; color: inherit; } .ea-turn ::selection { background: var(--accent-soft); }
.ea-last .ea-you { display: none; } .ea-last .ea-ai { color: inherit; } .ea-hist summary { cursor: pointer; font-size: .82rem; color: var(--muted); } .ea-hist .ea-turn { border-left: 2px solid var(--line); margin: 2px 0; }
.ea-ai { color: var(--muted); } .ea-res { display: flex; gap: 6px; }
.ea-cv { margin: 6px 0; border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; } .ea-cv summary { cursor: pointer; font-weight: 600; font-size: .88rem; }
.ea-cvlist { list-style: none; margin: 6px 0; padding: 0; display: grid; gap: 4px; max-height: 220px; overflow: auto; }
.ea-cvrow { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: .85rem; } .ea-cvt { font-weight: 600; } .ea-cvb { margin-left: auto; display: inline-flex; gap: 4px; }
.ea-pklist { display: grid; gap: 2px; max-height: 50vh; overflow: auto; min-width: 360px; margin: 6px 0; } .ea-pkrow { text-align: left; border: 0; background: none; padding: 4px; cursor: pointer; color: inherit; } .ea-pkrow:hover { background: var(--accent-soft); }
`));
ED.ai = { mount, save: k => save(k).catch(e => say(k, T("a_err", e.message))), newPage: k => newPage(k), send, undo, S, struct };
for (const k of ["word", "excel", "image", "note"]) if (ED.st[k] && ED.st[k].ready) mount(k);
})();
