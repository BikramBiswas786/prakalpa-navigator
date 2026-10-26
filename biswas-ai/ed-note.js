/* Notepad (2026): tabs, session restore, word wrap, fonts and zoom, go to line, find/replace with regex and whole word,
   encoding (UTF-8 / UTF-8 BOM / UTF-16 LE / Windows-1252) and line endings, status bar with counts, spellcheck,
   Markdown toolbar and preview, CSV table preview, JSON format/minify/validate, syntax colouring, line tools, print. */
(() => {
"use strict";
const ED = window.BA_ED; if (!ED) return;
const { h, T } = ED;
ED.addTX({
  en: { n_wrap: "Word wrap", n_font: "Font", n_size: "Size", n_zin: "Zoom in", n_zout: "Zoom out", n_goto: "Go to line", n_gotoq: "Line number (1–{0}):", n_time: "Time/Date",
    n_spell: "Spellcheck", n_prev: "Preview", n_hl: "Colours", n_enc: "Encoding", n_eol: "Line endings", n_regex: "Regex", n_word: "Whole word", n_prevb: "Previous",
    n_ln: "Ln {0}, Col {1}", n_cnt: "{0} characters · {1} words · {2} lines", n_selc: "{0} selected", n_fmt: "Format JSON", n_min: "Minify", n_valid: "JSON is valid.", n_bad: "JSON error: {0}",
    n_tools: "Line tools…", n_up: "UPPERCASE", n_low: "lowercase", n_title: "Title Case", n_sort: "Sort lines", n_dedup: "Remove duplicate lines", n_trim: "Trim trailing spaces",
    n_print: "Print", n_close: "Close tab", n_newtab: "New tab", n_lost: "“{0}” has unsaved changes. Close it anyway?", n_restored: "Restored {0} tab(s) from your last session.",
    n_bold: "Bold", n_ital: "Italic", n_h: "Heading", n_list: "List", n_num: "Numbered list", n_link: "Link", n_code: "Code", n_quote: "Quote", n_table: "Table", n_untitled: "Untitled",
    n_badre: "Bad pattern: {0}", n_csv: "CSV preview" },
  bn: { n_wrap: "শব্দ মোড়ানো", n_font: "ফন্ট", n_size: "আকার", n_zin: "বড় করুন", n_zout: "ছোট করুন", n_goto: "লাইনে যান", n_gotoq: "লাইন নম্বর (১–{0}):", n_time: "সময়/তারিখ",
    n_spell: "বানান যাচাই", n_prev: "প্রিভিউ", n_hl: "রঙ", n_enc: "এনকোডিং", n_eol: "লাইনের শেষ", n_regex: "রেজেক্স", n_word: "পুরো শব্দ", n_prevb: "আগের",
    n_ln: "লাইন {0}, কলাম {1}", n_cnt: "{0} অক্ষর · {1} শব্দ · {2} লাইন", n_selc: "{0} নির্বাচিত", n_fmt: "JSON সাজান", n_min: "ছোট করুন", n_valid: "JSON ঠিক আছে।", n_bad: "JSON ভুল: {0}",
    n_tools: "লাইন টুল…", n_up: "বড় হাতের", n_low: "ছোট হাতের", n_title: "শিরোনাম রূপ", n_sort: "লাইন সাজান", n_dedup: "একই লাইন বাদ দিন", n_trim: "শেষের ফাঁকা বাদ দিন",
    n_print: "প্রিন্ট", n_close: "ট্যাব বন্ধ", n_newtab: "নতুন ট্যাব", n_lost: "“{0}”-এ না-সেভ করা পরিবর্তন আছে। তবুও বন্ধ করবেন?", n_restored: "আগের সেশনের {0}টি ট্যাব ফিরিয়ে আনা হল।",
    n_bold: "মোটা", n_ital: "বাঁকা", n_h: "শিরোনাম", n_list: "তালিকা", n_num: "নম্বর তালিকা", n_link: "লিঙ্ক", n_code: "কোড", n_quote: "উদ্ধৃতি", n_table: "টেবিল", n_untitled: "নামহীন",
    n_badre: "ভুল প্যাটার্ন: {0}", n_csv: "CSV প্রিভিউ" }
});
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const CODE = new Set(["js", "mjs", "ts", "py", "java", "c", "cpp", "h", "go", "rs", "php", "rb", "sh", "sql", "css", "bat"]);
const KW = /\b(?:function|return|const|let|var|if|else|for|while|do|switch|case|break|continue|class|new|this|import|export|from|default|async|await|try|catch|finally|throw|def|elif|lambda|None|True|False|self|pass|in|is|not|and|or|public|private|static|void|int|char|float|double|struct|func|package|fn|mut|impl|use|select|insert|update|delete|where|join|create|table|null|true|false|undefined|typeof|echo|then|fi|done)\b/;
function hlCode(s, ext) {
  const re = ext === "py" || ext === "sh" || ext === "rb" ? /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g
    : ext === "sql" ? /(--[^\n]*)|('(?:[^'\n]|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g
    : /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;
  let o = "", i = 0, m;
  while ((m = re.exec(s))) { o += esc(s.slice(i, m.index)); i = re.lastIndex;
    if (m[1]) o += `<i class="np-c">${esc(m[1])}</i>`; else if (m[2]) o += `<i class="np-s">${esc(m[2])}</i>`; else if (m[3]) o += `<i class="np-n">${m[3]}</i>`;
    else o += KW.test(m[4]) && (ext !== "sql" || true) ? `<i class="np-k">${m[4]}</i>` : esc(m[4]);
    if (m[0] === "") re.lastIndex++; }
  return o + esc(s.slice(i));
}
function hlJson(s) { return s.replace(/("(?:[^"\\\n]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b|([&<>])/g, (m, str, colon, num, lit, ch) =>
  str ? `<i class="${colon ? "np-k" : "np-s"}">${esc(str)}</i>${colon || ""}` : num ? `<i class="np-n">${num}</i>` : lit ? `<i class="np-l">${lit}</i>` : esc(ch)); }
function csvRows(s, sep) { const rows = []; let row = [], f = "", q = false; for (let i = 0; i < s.length; i++) { const c = s[i];
  if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
  else if (c === '"') q = true; else if (c === sep) { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c !== "\r") f += c; }
  if (f || row.length) { row.push(f); rows.push(row); } return rows; }
function hlCsv(s, sep) { let col = 0, q = false, o = '<i class="np-c0">'; for (const c of s) { if (c === '"') q = !q;
  if (!q && c === sep) { col++; o += `</i>${esc(c)}<i class="np-c${col % 4}">`; } else if (!q && c === "\n") { col = 0; o += `</i>\n<i class="np-c0">`; } else o += esc(c); } return o + "</i>"; }
function hlMd(s) { return s.split("\n").map(l => /^#{1,6}\s/.test(l) ? `<i class="np-k">${esc(l)}</i>` : /^\s*```/.test(l) ? `<i class="np-c">${esc(l)}</i>` : /^>\s?/.test(l) ? `<i class="np-c">${esc(l)}</i>`
  : esc(l).replace(/(\*\*[^*\n]+\*\*)/g, '<i class="np-n">$1</i>').replace(/(`[^`\n]+`)/g, '<i class="np-s">$1</i>').replace(/^(\s*(?:[-*+]|\d+\.)\s)/, '<i class="np-l">$1</i>')).join("\n"); }
function inlineMd(s) { return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
  .replace(/~~([^~]+)~~/g, "<del>$1</del>").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); }
function mdHtml(src) {
  const L = src.replace(/\r/g, "").split("\n"); let o = "", i = 0;
  while (i < L.length) { const l = L[i];
    if (/^\s*```/.test(l)) { const b = []; i++; while (i < L.length && !/^\s*```/.test(L[i])) b.push(L[i++]); i++; o += `<pre><code>${esc(b.join("\n"))}</code></pre>`; continue; }
    let m;
    if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { o += `<h${m[1].length}>${inlineMd(m[2])}</h${m[1].length}>`; i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { o += "<hr>"; i++; continue; }
    if (/^\s*>/.test(l)) { const b = []; while (i < L.length && /^\s*>/.test(L[i])) b.push(L[i++].replace(/^\s*>\s?/, "")); o += `<blockquote>${mdHtml(b.join("\n"))}</blockquote>`; continue; }
    if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < L.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(L[i + 1]) && L[i + 1].includes("-")) {
      const cells = x => x.trim().replace(/^\||\|$/g, "").split("|").map(c => inlineMd(c.trim()));
      o += "<table><thead><tr>" + cells(l).map(c => `<th>${c}</th>`).join("") + "</tr></thead><tbody>"; i += 2;
      while (i < L.length && /^\s*\|.*\|\s*$/.test(L[i])) o += "<tr>" + cells(L[i++]).map(c => `<td>${c}</td>`).join("") + "</tr>"; o += "</tbody></table>"; continue; }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(l)) { const ol = /^\s*\d+\./.test(l); o += ol ? "<ol>" : "<ul>";
      while (i < L.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(L[i])) { const t = L[i++].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ""); const ck = /^\[([ xX])\]\s+/.exec(t);
        o += "<li>" + (ck ? `<input type="checkbox" disabled${ck[1] !== " " ? " checked" : ""}> ` + inlineMd(t.slice(ck[0].length)) : inlineMd(t)) + "</li>"; }
      o += ol ? "</ol>" : "</ul>"; continue; }
    if (!l.trim()) { i++; continue; }
    const b = []; while (i < L.length && L[i].trim() && !/^(#{1,6}\s|\s*```|\s*>|\s*(?:[-*+]|\d+\.)\s)/.test(L[i])) b.push(L[i++]); if (!b.length) b.push(L[i++]);
    o += `<p>${b.map(inlineMd).join("<br>")}</p>`; }
  return o;
}
const W1252 = (() => { const d = new TextDecoder("windows-1252"), m = new Map(); for (let i = 0; i < 256; i++) m.set(d.decode(new Uint8Array([i])), i); return m; })();
function decode(buf) { const u = new Uint8Array(buf);
  if (u[0] === 0xff && u[1] === 0xfe) return { s: new TextDecoder("utf-16le").decode(u.subarray(2)), enc: "utf-16le" };
  if (u[0] === 0xfe && u[1] === 0xff) return { s: new TextDecoder("utf-16be").decode(u.subarray(2)), enc: "utf-16be" };
  if (u[0] === 0xef && u[1] === 0xbb && u[2] === 0xbf) return { s: new TextDecoder("utf-8").decode(u.subarray(3)), enc: "utf-8-bom" };
  try { return { s: new TextDecoder("utf-8", { fatal: true }).decode(u), enc: "utf-8" }; } catch (e) { return { s: new TextDecoder("windows-1252").decode(u), enc: "windows-1252" }; } }
function encode(s, enc) {
  if (enc === "utf-16le" || enc === "utf-16be") { const le = enc === "utf-16le", out = new Uint8Array(2 + s.length * 2); out[0] = le ? 0xff : 0xfe; out[1] = le ? 0xfe : 0xff;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); out[2 + i * 2 + (le ? 0 : 1)] = c & 255; out[2 + i * 2 + (le ? 1 : 0)] = c >> 8; } return out; }
  if (enc === "windows-1252") { const out = new Uint8Array(s.length); let j = 0; for (const ch of s) out[j++] = W1252.has(ch) ? W1252.get(ch) : 63; return out.subarray(0, j); }
  const b = new TextEncoder().encode(s); if (enc !== "utf-8-bom") return b; const o = new Uint8Array(b.length + 3); o.set([0xef, 0xbb, 0xbf]); o.set(b, 3); return o; }
const ENCS = [["utf-8", "UTF-8"], ["utf-8-bom", "UTF-8 with BOM"], ["utf-16le", "UTF-16 LE"], ["utf-16be", "UTF-16 BE"], ["windows-1252", "ANSI (Windows-1252)"]];
const FONTS = ["'Noto Sans Mono', ui-monospace, Consolas, 'Noto Sans Bengali', monospace", "Consolas, 'Cascadia Mono', monospace", "'Courier New', monospace", "'Lucida Console', monospace", "Arial, sans-serif", "'Times New Roman', serif", "'Noto Sans Bengali', 'Nirmala UI', sans-serif"];
const HL_MAX = 200000;

ED.kinds.note = (() => {
  let ta, pre, gut, edBox, prev, fi, ri, mc, rx, ww, cnt, stat, encSel, eolSel, tabsEl, mdBar, jsonBar, wrapChk, spellChk, hlChk, prevChk, fontSel, sizeIn;
  let tabs = [], cur = 0, curExt = "txt", enc = "utf-8", eol = "lf", zoom = 100, seq = 1, firstBlank = true, sessKey = "", saveT = 0, nl = -1;
  const st = () => ED.st.note;
  const lang = () => (window.settings && settings.lang === "bn") ? "bn" : "en";
  const isEmpty = t => !t.file && !t.dirty && !t.text;
  const untitled = () => T("n_untitled") + (seq++ > 1 ? " " + (seq - 1) : "") + ".txt";
  function stash() { const t = tabs[cur]; if (!t || !ta) return; const s = st(); Object.assign(t, { text: ta.value, ext: curExt, enc, eol, file: s.file, name: s.name, dirty: s.dirty, ss: ta.selectionStart, se: ta.selectionEnd, top: ta.scrollTop }); }
  function apply(i) { cur = i; const t = tabs[i], s = st(); ta.value = t.text || ""; curExt = t.ext || "txt"; enc = t.enc || "utf-8"; eol = t.eol || "lf"; s.file = t.file || null; s.name = t.name; s.dirty = !!t.dirty;
    ED.label("note"); refresh(true); try { ta.setSelectionRange(t.ss || 0, t.se || 0); } catch (e) {} ta.scrollTop = t.top || 0; sync(); drawTabs(); }
  const mkTab = () => ({ name: untitled(), file: null, dirty: false, text: "", ext: "txt", enc: "utf-8", eol: "lf" });
  function newTab(force) { stash(); if (!force && isEmpty(tabs[cur])) return; tabs.push(mkTab()); apply(tabs.length - 1); persist(); if (force) ta.focus(); }
  function findTab(path) { stash(); const i = tabs.findIndex(t => t.file && t.file.path === path); if (i < 0) return false; if (i !== cur) apply(i); return true; }
  function closeTab(i) { stash(); const t = tabs[i]; if (t.dirty && !confirm(T("n_lost", t.name))) return; tabs.splice(i, 1); if (!tabs.length) tabs.push(mkTab()); apply(Math.min(i <= cur ? Math.max(0, cur - (i < cur ? 1 : 0)) : cur, tabs.length - 1)); persist(); }
  function drawTabs() { if (!tabsEl) return; stash(); tabsEl.textContent = "";
    tabs.forEach((t, i) => tabsEl.append(h("span", { class: "np-tab" + (i === cur ? " on" : ""), role: "tab", "aria-selected": String(i === cur) },
      h("button", { type: "button", class: "np-tn", "data-i": i, title: t.file ? t.file.path : t.name, onclick: () => { if (i !== cur) { stash(); apply(i); persist(); } } }, (t.dirty ? "● " : "") + (t.file ? ED.base(t.file.path) : t.name)),
      h("button", { type: "button", class: "np-x", title: T("n_close"), "aria-label": T("n_close"), onclick: () => closeTab(i) }, "×"))));
    tabsEl.append(h("button", { type: "button", class: "np-plus", id: "np-newtab", title: T("n_newtab"), "aria-label": T("n_newtab"), onclick: () => { newTab(true); ED.say("note", ""); } }, "＋")); }
  function persist() { clearTimeout(saveT); saveT = setTimeout(() => { saveT = 0; const mm = document.getElementById("pd-main"); if (!mm || mm.hidden) return; stash(); const k = (typeof pd !== "undefined" && pd.name) ? "np:sess:" + pd.name : ""; if (!k) return; sessKey = k;
    const data = JSON.stringify({ cur, tabs: tabs.map(t => ({ name: t.name, file: t.file, dirty: t.dirty, text: t.text, ext: t.ext, enc: t.enc, eol: t.eol })) });
    try { if (data.length < 3e6) sessionStorage.setItem(k, data); } catch (e) { /* full */ } }, 500); }
  function restore() { const k = (typeof pd !== "undefined" && pd.name) ? "np:sess:" + pd.name : ""; if (!k) return false; let d; try { d = JSON.parse(sessionStorage.getItem(k) || "null"); } catch (e) { d = null; }
    if (!d || !Array.isArray(d.tabs) || !d.tabs.length || d.tabs.every(isEmpty)) return false; sessKey = k; tabs = d.tabs; seq = tabs.length + 1; apply(Math.min(d.cur || 0, tabs.length - 1));
    setTimeout(() => ED.say("note", T("n_restored", tabs.length)), 0); return true; }
  function mode() { return curExt === "json" ? "json" : curExt === "csv" || curExt === "tsv" ? "csv" : curExt === "md" ? "md" : CODE.has(curExt) || ["html", "htm", "xml", "yml", "yaml", "toml", "ini"].includes(curExt) ? "code" : ""; }
  function paint() { const m = mode(), on = hlChk.checked && m && ta.value.length <= HL_MAX; edBox.classList.toggle("hl", !!on); pre.hidden = !on; if (!on) return;
    const s = ta.value; pre.innerHTML = (m === "json" ? hlJson(s) : m === "csv" ? hlCsv(s, curExt === "tsv" ? "\t" : ",") : m === "md" ? hlMd(s) : hlCode(s, curExt)) + "\n "; sync(); }
  function preview() { const m = mode(), on = prevChk.checked && (m === "md" || m === "csv"); prev.hidden = !on; edBox.parentNode.parentNode.classList.toggle("split", on); if (!on) return;
    if (m === "md") prev.innerHTML = mdHtml(ta.value);
    else { const rows = csvRows(ta.value, curExt === "tsv" ? "\t" : ",").slice(0, 500); prev.innerHTML = "<table><tbody>" + rows.map((r, i) => "<tr>" + r.map(c => (i ? "<td>" : "<th>") + esc(c) + (i ? "</td>" : "</th>")).join("") + "</tr>").join("") + "</tbody></table>"; } }
  function lines() { const n = ta.value.split("\n").length; if (nl !== n) { nl = n; gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n") + "\n"; } }
  function sync() { gut.scrollTop = ta.scrollTop; pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; }
  function status() { const v = ta.value, p = ta.selectionStart, before = v.slice(0, p), ln = before.split("\n").length, col = p - before.lastIndexOf("\n");
    const words = (v.match(/[^\s]+/g) || []).length, sel = Math.abs(ta.selectionEnd - ta.selectionStart);
    stat.textContent = T("n_ln", ln, col) + " · " + T("n_cnt", [...v].length, words, v.split("\n").length) + (sel ? " · " + T("n_selc", sel) : "") + " · " + zoom + "%"; }
  function refresh(full) { if (full) nl = -1; lines(); paint(); preview(); status(); encSel.value = enc; eolSel.value = eol;
    mdBar.hidden = mode() !== "md"; jsonBar.hidden = mode() !== "json"; }
  function look() { const fs = (+sizeIn.value || 15) * zoom / 100; for (const e of [ta, pre, gut]) { e.style.fontSize = fs + "px"; e.style.fontFamily = fontSel.value; }
    const w = wrapChk.checked; ta.wrap = w ? "soft" : "off"; ta.style.whiteSpace = w ? "pre-wrap" : "pre"; pre.style.whiteSpace = w ? "pre-wrap" : "pre"; gut.hidden = w; ta.style.overflowX = w ? "hidden" : "auto"; status(); }
  let rT = 0; const changed = () => { ED.dirty("note"); lines(); status(); clearTimeout(rT); rT = setTimeout(() => { paint(); preview(); }, ta.value.length > 50000 ? 250 : 30); persist(); };
  function edit(fn) { ta.focus(); const a = ta.selectionStart, b = ta.selectionEnd, r = fn(ta.value.slice(a, b), a, b); if (r == null) return;
    // execCommand keeps the browser's own undo stack
    if (!document.execCommand("insertText", false, r.text)) ta.setRangeText(r.text, a, b, "end");
    if (r.sel) ta.setSelectionRange(a + r.sel[0], a + r.sel[1]); changed(); }
  const wrapSel = (l, r2, ph) => edit(s => { const t = s || ph; return { text: l + t + r2, sel: [l.length, l.length + t.length] }; });
  const linePrefix = fn => { const v = ta.value; let a = v.lastIndexOf("\n", ta.selectionStart - 1) + 1, b = v.indexOf("\n", ta.selectionEnd); if (b < 0) b = v.length; ta.setSelectionRange(a, b);
    edit(s => ({ text: s.split("\n").map(fn).join("\n") })); };
  function wholeText(fn) { ta.focus(); const has = ta.selectionEnd > ta.selectionStart; if (!has) ta.select(); edit(s => ({ text: fn(s) })); }
  function pattern() { const q = fi.value; if (!q) return null; let src = rx.checked ? q : q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); if (ww.checked) src = "\\b" + src + "\\b";
    try { return new RegExp(src, "g" + (mc.checked ? "" : "i") + "mu"); } catch (e) { cnt.textContent = T("n_badre", e.message); return null; } }
  function count(re) { let n = 0; for (const m of ta.value.matchAll(re)) { if (m[0] === "" ) break; n++; } return n; }
  function find(back) { const re = pattern(); if (!re) return false; const v = ta.value, all = [...v.matchAll(re)].filter(m => m[0] !== "");
    if (!all.length) { cnt.textContent = T("nomatch"); return false; }
    let m = back ? [...all].reverse().find(x => x.index < ta.selectionStart) || all[all.length - 1] : all.find(x => x.index >= ta.selectionEnd) || all[0];
    ta.focus(); ta.setSelectionRange(m.index, m.index + m[0].length); const ln = v.slice(0, m.index).split("\n").length; ta.scrollTop = Math.max(0, (ln - 5) * parseFloat(getComputedStyle(ta).lineHeight || 20));
    cnt.textContent = (all.indexOf(m) + 1) + " / " + all.length; status(); return true; }
  function replOne() { const re = pattern(); if (!re) return; const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd); const one = new RegExp("^(?:" + re.source + ")$", re.flags.replace("g", ""));
    if (sel && one.test(sel)) edit(s => ({ text: rx.checked ? s.replace(one, ri.value) : ri.value })); find(false); }
  function replAll() { const re = pattern(); if (!re) return; const n = count(re); if (!n) { cnt.textContent = T("nomatch"); return; } const keep = ta.scrollTop;
    ta.focus(); ta.select(); edit(s => ({ text: s.replace(re, rx.checked ? ri.value : () => ri.value) })); ta.setSelectionRange(0, 0); ta.scrollTop = keep; cnt.textContent = T("found", n); }
  function gotoLine() { const n = ta.value.split("\n").length, v = prompt(T("n_gotoq", n), ""); const k = parseInt(v, 10); if (!k || k < 1) return;
    const L = ta.value.split("\n"), ln = Math.min(k, n); let p = 0; for (let i = 0; i < ln - 1; i++) p += L[i].length + 1; ta.focus(); ta.setSelectionRange(p, p);
    ta.scrollTop = Math.max(0, (ln - 3) * parseFloat(getComputedStyle(ta).lineHeight || 20)); sync(); status(); }
  function timeDate() { const d = new Date(), p2 = x => String(x).padStart(2, "0"); edit(() => ({ text: `${p2(d.getHours())}:${p2(d.getMinutes())} ${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}` })); }
  function jsonDo(min) { try { const o = JSON.parse(ta.value); wholeText(() => min ? JSON.stringify(o) : JSON.stringify(o, null, 2)); ED.say("note", T("n_valid")); } catch (e) { ED.say("note", T("n_bad", e.message)); } }
  function tool(k) { if (!k) return; const tc = s => s.toLowerCase().replace(/(^|[\s\-_(])(\p{L})/gu, (m, a, c) => a + c.toUpperCase());
    if (k === "up") wholeText(s => s.toUpperCase()); else if (k === "low") wholeText(s => s.toLowerCase()); else if (k === "title") wholeText(tc);
    else if (k === "sort") wholeText(s => s.split("\n").sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join("\n"));
    else if (k === "dedup") wholeText(s => [...new Set(s.split("\n"))].join("\n")); else if (k === "trim") wholeText(s => s.replace(/[ \t]+$/gm, "")); }
  function print() { const f = h("iframe", { style: "position:fixed;width:0;height:0;border:0;right:0;bottom:0" }); document.body.append(f);
    const d = f.contentDocument; d.open(); d.write(`<!doctype html><title>${esc(st().name)}</title><pre style="white-space:pre-wrap;font:12pt Consolas,monospace">${esc(ta.value)}</pre>`); d.close();
    setTimeout(() => { try { f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 1000); }, 100); }
  function setZoom(z) { zoom = Math.max(50, Math.min(300, z)); look(); }
  const btn = (id, label, title, fn) => h("button", { type: "button", class: "btn small", id, title, "aria-label": title, onmousedown: e => e.preventDefault(), onclick: fn }, label);
  const chk = (id, label, on, fn) => { const c = h("input", { type: "checkbox", id }); c.checked = on; c.addEventListener("change", fn); return [c, h("label", { class: "ed-chk", for: id }, c, " " + label)]; };
  return {
    exts: () => [curExt, ...ED.TYPES.note], newTab, findTab, _api: () => ({ tabs: () => (stash(), tabs), cur: () => cur, enc: () => enc, eol: () => eol, zoom: () => zoom, mode }),
    init(body) {
      fi = h("input", { id: "np-find", placeholder: T("find"), "aria-label": T("find") }); ri = h("input", { id: "np-repl", placeholder: T("repl"), "aria-label": T("repl") });
      let mcL, rxL, wwL; [mc, mcL] = chk("np-mc", T("mcase"), false, () => {}); [rx, rxL] = chk("np-re", T("n_regex"), false, () => {}); [ww, wwL] = chk("np-ww", T("n_word"), false, () => {});
      cnt = h("span", { class: "hint", role: "status", id: "np-cnt" });
      fi.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); find(e.shiftKey); } });
      let wL, sL, hL, pL; [wrapChk, wL] = chk("np-wrap", T("n_wrap"), false, look); [spellChk, sL] = chk("np-spell", T("n_spell"), false, () => { ta.spellcheck = spellChk.checked; ta.lang = lang() === "bn" ? "bn-IN" : "en-IN"; ta.blur(); ta.focus(); });
      [hlChk, hL] = chk("np-hl", T("n_hl"), true, paint); [prevChk, pL] = chk("np-prev", T("n_prev"), true, preview);
      fontSel = h("select", { id: "np-font", "aria-label": T("n_font"), onchange: look }, ...FONTS.map(f => h("option", { value: f }, f.split(",")[0].replace(/'/g, ""))));
      sizeIn = h("input", { type: "number", id: "np-size", min: "8", max: "48", value: "15", "aria-label": T("n_size"), style: "width:4.2em", oninput: look });
      const toolsSel = h("select", { id: "np-tools", "aria-label": T("n_tools"), onchange: e => { tool(e.target.value); e.target.value = ""; } }, h("option", { value: "" }, T("n_tools")),
        ...[["up", "n_up"], ["low", "n_low"], ["title", "n_title"], ["sort", "n_sort"], ["dedup", "n_dedup"], ["trim", "n_trim"]].map(([v, k]) => h("option", { value: v }, T(k))));
      const row1 = h("div", { class: "ed-tool" }, fi, btn("np-prevb", "↑", T("n_prevb"), () => find(true)), btn("np-next", T("next"), T("next"), () => find(false)), ri,
        btn("np-rone", T("rone"), T("rone"), replOne), btn("np-rall", T("rall"), T("rall"), replAll), mcL, wwL, rxL, cnt);
      const row2 = h("div", { class: "ed-tool" }, wL, fontSel, sizeIn, btn("np-zout", "A−", T("n_zout"), () => setZoom(zoom - 10)), btn("np-zin", "A+", T("n_zin"), () => setZoom(zoom + 10)),
        btn("np-goto", "↧ " + T("n_goto"), T("n_goto") + " (Ctrl+G)", gotoLine), btn("np-time", "🕒", T("n_time") + " (F5)", timeDate), toolsSel, sL, hL, pL, btn("np-print", "🖨", T("n_print"), print));
      mdBar = h("div", { class: "ed-tool np-md", id: "np-mdbar" }, btn("np-b", "B", T("n_bold"), () => wrapSel("**", "**", T("n_bold"))), btn("np-i", "I", T("n_ital"), () => wrapSel("*", "*", T("n_ital"))),
        btn("np-h", "H", T("n_h"), () => linePrefix(l => /^#{1,5}\s/.test(l) ? "#" + l : /^#{6}\s/.test(l) ? l.replace(/^#+\s/, "") : "# " + l)),
        btn("np-ul", "•", T("n_list"), () => linePrefix(l => /^- /.test(l) ? l.slice(2) : "- " + l)), btn("np-ol", "1.", T("n_num"), () => { let k = 0; linePrefix(l => (++k) + ". " + l.replace(/^\d+\.\s/, "")); }),
        btn("np-q", "❝", T("n_quote"), () => linePrefix(l => "> " + l)), btn("np-code", "</>", T("n_code"), () => wrapSel("`", "`", "code")),
        btn("np-link", "🔗", T("n_link"), () => wrapSel("[", "](https://)", T("n_link"))), btn("np-tbl", "▦", T("n_table"), () => edit(() => ({ text: "\n| A | B |\n|---|---|\n|   |   |\n" }))));
      jsonBar = h("div", { class: "ed-tool", id: "np-jsonbar" }, btn("np-fmt", "{ } " + T("n_fmt"), T("n_fmt"), () => jsonDo(false)), btn("np-min", T("n_min"), T("n_min"), () => jsonDo(true)));
      tabsEl = h("div", { class: "np-tabs", id: "np-tabs", role: "tablist" });
      gut = h("pre", { class: "np-gut", "aria-hidden": "true" }); pre = h("pre", { class: "np-hl", "aria-hidden": "true", hidden: true });
      ta = h("textarea", { class: "np-ta", id: "np-ta", spellcheck: "false", wrap: "off", "aria-label": T("note") });
      edBox = h("div", { class: "np-ed" }, pre, ta); prev = h("div", { class: "np-prev", id: "np-preview", hidden: true, "aria-label": T("n_prev") });
      encSel = h("select", { id: "np-enc", "aria-label": T("n_enc"), title: T("n_enc"), onchange: () => { enc = encSel.value; ED.dirty("note"); persist(); } }, ...ENCS.map(([v, l]) => h("option", { value: v }, l)));
      eolSel = h("select", { id: "np-eol", "aria-label": T("n_eol"), title: T("n_eol"), onchange: () => { eol = eolSel.value; ED.dirty("note"); persist(); } }, h("option", { value: "lf" }, "Unix (LF)"), h("option", { value: "crlf" }, "Windows (CRLF)"));
      stat = h("span", { id: "np-stat", class: "np-st", role: "status" });
      ta.addEventListener("input", changed); ta.addEventListener("scroll", sync);
      for (const ev of ["keyup", "click", "select"]) ta.addEventListener(ev, status);
      ta.addEventListener("wheel", e => { if (e.ctrlKey) { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 10 : -10)); } }, { passive: false });
      ta.addEventListener("keydown", e => { const k = e.key.toLowerCase(), c = e.ctrlKey || e.metaKey;
        if (e.key === "Tab") { e.preventDefault(); edit(() => ({ text: "\t" })); }
        else if (c && k === "f") { e.preventDefault(); fi.focus(); fi.select(); } else if (c && k === "h") { e.preventDefault(); ri.focus(); } else if (c && k === "g") { e.preventDefault(); gotoLine(); }
        else if (e.key === "F3") { e.preventDefault(); find(e.shiftKey); } else if (e.key === "F5") { e.preventDefault(); timeDate(); }
        else if (c && (k === "=" || k === "+")) { e.preventDefault(); setZoom(zoom + 10); } else if (c && k === "-") { e.preventDefault(); setZoom(zoom - 10); } else if (c && k === "0") { e.preventDefault(); setZoom(100); }
        else if (c && mode() === "md" && k === "b") { e.preventDefault(); wrapSel("**", "**", T("n_bold")); } else if (c && mode() === "md" && k === "i") { e.preventDefault(); wrapSel("*", "*", T("n_ital")); } });
      body.append(tabsEl, row1, row2, mdBar, jsonBar, h("div", { class: "np-split" }, h("div", { class: "np-wrap" }, gut, edBox), prev), h("div", { class: "np-bar" }, stat, h("span", { class: "np-sp" }), eolSel, encSel));
      if (!document.getElementById("np-css")) document.head.append(h("style", { id: "np-css" }, CSS));
      look();
      const sec = ED.st.note.sec; if (sec) { let dT = 0; new MutationObserver(() => { clearTimeout(dT); dT = setTimeout(drawTabs, 30); }).observe(sec.querySelector(".ed-fname").parentNode, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden"] }); }
    },
    blank() { const main = document.getElementById("pd-main"), closing = !main || main.hidden;
      clearTimeout(saveT); if (closing && sessKey) { try { sessionStorage.removeItem(sessKey); } catch (e) {} } if (closing) sessKey = "";
      seq = 1; tabs = [mkTab()]; cur = 0; apply(0); if (!closing) restore();
      if (main && !main._npObs) { main._npObs = true; new MutationObserver(() => { if (!main.hidden && tabs.every(isEmpty)) setTimeout(restore, 50); }).observe(main, { attributes: true, attributeFilter: ["hidden"] }); } },
    async load(buf, e) { const d = decode(buf); let s = d.s; eol = /\r\n/.test(s) ? "crlf" : "lf"; s = s.replace(/\r\n?/g, "\n"); enc = d.enc; curExt = e || "txt";
      ta.value = s; ta.setSelectionRange(0, 0); refresh(true); ta.scrollTop = 0; sync();
      setTimeout(() => { stash(); drawTabs(); persist(); }, 0); },
    async export(e) { if (e) { curExt = e; setTimeout(() => { refresh(); stash(); drawTabs(); persist(); }, 0); }
      const s = eol === "crlf" ? ta.value.replace(/\n/g, "\r\n") : ta.value; const bytes = encode(s, enc);
      return { blob: new Blob([bytes], { type: (ED.MIME[e] || "text/plain") + (enc.startsWith("utf-8") ? ";charset=utf-8" : "") }), text: ta.value }; }
  };
})();
const CSS = `
.np-tabs { display: flex; gap: 2px; align-items: flex-end; overflow-x: auto; border-bottom: 1px solid var(--line, #ddd); margin-bottom: 6px; }
.np-tab { display: inline-flex; align-items: center; border: 1px solid var(--line, #ddd); border-bottom: 0; border-radius: 8px 8px 0 0; background: var(--surface-2, #f3f4f6); max-width: 220px; }
.np-tab.on { background: var(--surface, #fff); font-weight: 600; box-shadow: 0 -2px 0 var(--accent, #4338ca) inset; }
.np-tab .np-tn { border: 0; background: none; padding: 5px 8px; cursor: pointer; color: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px; font: inherit; }
.np-tab .np-x { border: 0; background: none; cursor: pointer; padding: 2px 6px; color: inherit; opacity: .6; } .np-tab .np-x:hover { opacity: 1; }
.np-plus { border: 0; background: none; cursor: pointer; padding: 4px 8px; font-size: 1rem; color: inherit; }
.np-split { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; } .np-split.split { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
@media (max-width: 760px) { .np-split.split { grid-template-columns: minmax(0, 1fr); } }
.np-wrap { display: flex; border: 1px solid var(--line, #ddd); border-radius: 8px; overflow: hidden; height: 60vh; min-height: 260px; background: var(--surface, #fff); }
.np-gut { margin: 0; padding: 8px 6px; text-align: right; color: #9ca3af; background: var(--surface-2, #f9fafb); overflow: hidden; user-select: none; line-height: 1.5; min-width: 2.5em; }
.np-ed { position: relative; flex: 1; min-width: 0; }
.np-ed .np-ta, .np-ed .np-hl { position: absolute; inset: 0; margin: 0; padding: 8px 10px; border: 0; line-height: 1.5; tab-size: 4; box-sizing: border-box; width: 100%; height: 100%; letter-spacing: 0; }
.np-ed .np-ta { resize: none; outline: none; background: transparent; color: var(--ink, #111); z-index: 1; overflow: auto; }
.np-ed .np-hl { overflow: hidden; color: var(--ink, #111); pointer-events: none; }
.np-ed.hl .np-ta { color: transparent; caret-color: var(--ink, #111); } .np-ed.hl .np-ta::selection { background: rgba(59,130,246,.35); color: transparent; }
.np-hl i { font-style: normal; } .np-k { color: #7c3aed; } .np-s { color: #047857; } .np-n { color: #b45309; } .np-c { color: #6b7280; } .np-l { color: #2563eb; }
.np-c0 { color: #1d4ed8; } .np-c1 { color: #047857; } .np-c2 { color: #b45309; } .np-c3 { color: #be185d; }
[data-theme="dark"] .np-k { color: #c4b5fd; } [data-theme="dark"] .np-s { color: #6ee7b7; } [data-theme="dark"] .np-n { color: #fcd34d; } [data-theme="dark"] .np-c { color: #9ca3af; } [data-theme="dark"] .np-l { color: #93c5fd; }
[data-theme="dark"] .np-c0 { color: #93c5fd; } [data-theme="dark"] .np-c1 { color: #6ee7b7; } [data-theme="dark"] .np-c2 { color: #fcd34d; } [data-theme="dark"] .np-c3 { color: #f9a8d4; }
.np-prev { border: 1px solid var(--line, #ddd); border-radius: 8px; padding: 10px 14px; height: 60vh; min-height: 260px; overflow: auto; background: var(--surface, #fff); line-height: 1.5; box-sizing: border-box; }
.np-prev table { border-collapse: collapse; font-size: .9rem; } .np-prev th, .np-prev td { border: 1px solid var(--line, #ddd); padding: 3px 8px; text-align: left; } .np-prev th { background: var(--surface-2, #f3f4f6); }
.np-prev pre { background: var(--surface-2, #f3f4f6); padding: 8px; border-radius: 6px; overflow: auto; } .np-prev code { font-family: Consolas, monospace; } .np-prev blockquote { border-left: 3px solid var(--line, #ccc); margin: 0; padding-left: 10px; color: #6b7280; }
.np-bar { display: flex; align-items: center; gap: 8px; font-size: .82rem; padding: 4px 2px; color: var(--muted); flex-wrap: wrap; } .np-sp { flex: 1; } .np-bar select { font-size: .8rem; }
.np-md .btn, #np-jsonbar .btn { min-width: 2.2em; }
`;
})();
