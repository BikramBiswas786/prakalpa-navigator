/* Drafting Desk Excel: sheets (add, rename, delete, reorder, duplicate), cell formatting and number formats (₹, %, dates), merge,
   sort and filter, range copy/cut/paste, fill down/right and autofill, freeze panes, find/replace, undo/redo, charts, print,
   many more functions (lookups, *IF(S), dates, text), and xlsx round trip that keeps formatting (own styles.xml reader/writer). */
(() => {
"use strict";
const ED = window.BA_ED; if (!ED || !ED.xl) return;
const { h, T, MIME } = ED; const { xEngine, colName, colNum, shiftRefs, XErr } = ED.xl;
ED.addTX({
  en: { x_note: "Note", x_noteq: "Note for this cell (empty to remove):", x_dv: "Data validation", x_dv_type: "Allow", x_dv_list: "List", x_dv_whole: "Whole number", x_dv_dec: "Decimal", x_dv_none: "Any value (remove)", x_dv_items: "List items (comma separated)", x_dv_min: "Minimum", x_dv_max: "Maximum", x_dv_bad: "Not allowed in {0}: {1}", x_name: "Define name", x_nameq: "Name for the selected cells (e.g. Budget):", x_namebad: "Use letters, numbers and _ only; it cannot look like a cell (A1).", x_named: "Name {0} = {1}. Use it in formulas, e.g. =SUM({0}).", x_dup: "Remove duplicates", x_dups: "{0} duplicate row(s) removed.", x_pivot: "Pivot table", x_pv_rows: "Rows", x_pv_cols: "Columns", x_pv_vals: "Values", x_pv_agg: "Summarise by", x_pv_sum: "Sum", x_pv_count: "Count", x_pv_avg: "Average", x_pv_total: "Grand Total", x_pv_done: "Pivot table made on sheet {0} ({1} rows). It updates when the data changes.",
    x_b: "Bold", x_i: "Italic", x_u: "Underline", x_s: "Strikethrough", x_font: "Font", x_size: "Size", x_color: "Font colour", x_fill: "Fill colour", x_al: "Align left", x_ac: "Centre", x_ar: "Align right",
    x_wrap: "Wrap text", x_bd: "Borders", x_bd_all: "All borders", x_bd_out: "Outside border", x_bd_none: "No border", x_bd_bot: "Bottom border", x_merge: "Merge & centre", x_unmerge: "Unmerge", x_clearf: "Clear formatting",
    x_nf: "Number format", nf_gen: "General", nf_num: "Number 0.00", nf_int: "Number 1,234", nf_inr: "₹ Rupees", nf_pct: "Percent %", nf_pct2: "Percent 0.00%", nf_date: "Date dd-mm-yyyy", nf_ldate: "Date 26 Oct 2026", nf_text: "Text",
    x_dec_up: "More decimals", x_dec_dn: "Fewer decimals", x_sort_az: "Sort A→Z", x_sort_za: "Sort Z→A", x_filter: "Filter", x_filter_off: "Clear filter", x_copy: "Copy", x_cut: "Cut", x_paste: "Paste", x_filld: "Fill down", x_fillr: "Fill right",
    x_frz: "Freeze", frz_none: "No freeze", frz_row: "Top row", frz_col: "First column", frz_sel: "At selected cell", x_find: "Find & replace", x_chart: "Chart", x_chart_bar: "Column chart", x_chart_line: "Line chart", x_chart_pie: "Pie chart", x_chart_hbar: "Bar chart",
    x_sum: "AutoSum", x_fn: "Insert function", x_dup: "Duplicate sheet", x_left: "Move sheet left", x_right: "Move sheet right", x_ren: "Rename", x_del: "Delete", x_print: "Print", x_zoom: "Zoom", x_sel_sum: "Sum", x_sel_avg: "Average", x_sel_cnt: "Count",
    x_chart_need: "Select a range first: labels in the first column, numbers next to them.", x_chart_dl: "Download PNG", x_chart_rm: "Remove chart", x_all: "(Select all)", x_ok: "OK", x_cancel: "Cancel", x_merge_lose: "Merging keeps only the top-left value. Continue?",
    x_hide: "Hide columns/rows", x_cf: "Highlight rule", x_cf_ask: "Highlight cells where value is (e.g. >1000, <0, =Pending):", x_cf_clear: "Clear highlight rules", x_tbl_hint: "Charts are shown here and can be downloaded as PNG; they are not stored inside the .xlsx." },
  bn: { x_note: "নোট", x_noteq: "এই ঘরের নোট (মুছতে ফাঁকা রাখুন):", x_dv: "ডেটা যাচাই", x_dv_type: "অনুমতি", x_dv_list: "তালিকা", x_dv_whole: "পূর্ণ সংখ্যা", x_dv_dec: "দশমিক", x_dv_none: "যেকোনো (মুছুন)", x_dv_items: "তালিকার জিনিস (কমা দিয়ে)", x_dv_min: "সর্বনিম্ন", x_dv_max: "সর্বোচ্চ", x_dv_bad: "{0}-এ চলবে না: {1}", x_name: "নাম দিন", x_nameq: "বাছাই করা ঘরগুলির নাম (যেমন Budget):", x_namebad: "শুধু অক্ষর, সংখ্যা ও _; ঘরের ঠিকানার মতো (A1) হবে না।", x_named: "নাম {0} = {1}। সূত্রে লিখুন, যেমন =SUM({0})।", x_dup: "একই সারি বাদ", x_dups: "{0}টি একই সারি বাদ গেল।", x_pivot: "পিভট টেবিল", x_pv_rows: "সারি", x_pv_cols: "কলাম", x_pv_vals: "মান", x_pv_agg: "হিসাব", x_pv_sum: "যোগফল", x_pv_count: "গণনা", x_pv_avg: "গড়", x_pv_total: "মোট", x_pv_done: "{0} শিটে পিভট টেবিল হল ({1} সারি)। ডেটা বদলালে নিজে বদলাবে।",
    x_b: "মোটা", x_i: "বাঁকা", x_u: "নিচে দাগ", x_s: "কাটা দাগ", x_font: "ফন্ট", x_size: "মাপ", x_color: "লেখার রং", x_fill: "ঘরের রং", x_al: "বাঁয়ে", x_ac: "মাঝে", x_ar: "ডানে",
    x_wrap: "লেখা মোড়ানো", x_bd: "বর্ডার", x_bd_all: "সব বর্ডার", x_bd_out: "বাইরের বর্ডার", x_bd_none: "বর্ডার নেই", x_bd_bot: "নিচের বর্ডার", x_merge: "মিলিয়ে মাঝে", x_unmerge: "আলাদা করুন", x_clearf: "ফরম্যাট মুছুন",
    x_nf: "সংখ্যার ধরন", nf_gen: "সাধারণ", nf_num: "সংখ্যা 0.00", nf_int: "সংখ্যা 1,234", nf_inr: "₹ টাকা", nf_pct: "শতাংশ %", nf_pct2: "শতাংশ 0.00%", nf_date: "তারিখ dd-mm-yyyy", nf_ldate: "তারিখ 26 Oct 2026", nf_text: "লেখা",
    x_dec_up: "দশমিক বাড়ান", x_dec_dn: "দশমিক কমান", x_sort_az: "সাজান A→Z", x_sort_za: "সাজান Z→A", x_filter: "ফিল্টার", x_filter_off: "ফিল্টার তুলুন", x_copy: "কপি", x_cut: "কাট", x_paste: "পেস্ট", x_filld: "নিচে ভরুন", x_fillr: "ডানে ভরুন",
    x_frz: "আটকান", frz_none: "আটকানো নেই", frz_row: "উপরের সারি", frz_col: "প্রথম কলাম", frz_sel: "বাছা ঘর পর্যন্ত", x_find: "খুঁজুন ও বদলান", x_chart: "চার্ট", x_chart_bar: "কলাম চার্ট", x_chart_line: "লাইন চার্ট", x_chart_pie: "পাই চার্ট", x_chart_hbar: "বার চার্ট",
    x_sum: "যোগফল", x_fn: "ফাংশন বসান", x_dup: "শিটের কপি", x_left: "শিট বাঁয়ে", x_right: "শিট ডানে", x_ren: "নাম বদল", x_del: "মুছুন", x_print: "প্রিন্ট", x_zoom: "জুম", x_sel_sum: "যোগফল", x_sel_avg: "গড়", x_sel_cnt: "সংখ্যা",
    x_chart_need: "আগে একটি রেঞ্জ বাছুন: প্রথম কলামে নাম, পাশে সংখ্যা।", x_chart_dl: "PNG ডাউনলোড", x_chart_rm: "চার্ট সরান", x_all: "(সব বাছুন)", x_ok: "ঠিক আছে", x_cancel: "বাতিল", x_merge_lose: "মেলালে শুধু উপরের-বাঁয়ের মান থাকবে। এগোবেন?",
    x_hide: "লুকান", x_cf: "রং-নিয়ম", x_cf_ask: "কোন মানের ঘর রঙিন হবে (যেমন >1000, <0, =Pending):", x_cf_clear: "রং-নিয়ম মুছুন", x_tbl_hint: "চার্ট এখানে দেখা যায় ও PNG ডাউনলোড করা যায়; .xlsx-এর ভিতরে রাখা হয় না।" }
});
/* ---------- dates and number formats ---------- */
const EPOCH = Date.UTC(1899, 11, 30), DAY = 864e5;
const toSerial = (y, m, d) => (Date.UTC(y, m - 1, d) - EPOCH) / DAY;
const fromSerial = n => { const d = new Date(EPOCH + Math.floor(n) * DAY); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay(), frac: n - Math.floor(n) }; };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], WDL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const z2 = n => String(n).padStart(2, "0");
function group(intStr, indian) { if (!indian) return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ","); if (intStr.length <= 3) return intStr; const last = intStr.slice(-3), rest = intStr.slice(0, -3); return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last; }
function fmtDate(n, code) {
  const t = fromSerial(n); let s = code.replace(/\[[^\]]*\]/g, "").replace(/\\(.)/g, "$1").replace(/"([^"]*)"/g, "$1");
  const secs = Math.round(t.frac * 86400), H = Math.floor(secs / 3600), Mi = Math.floor(secs / 60) % 60, Se = secs % 60, ampm = /am\/pm/i.test(s);
  return s.replace(/yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|am\/pm/gi, (k, off, all) => { const lk = k.toLowerCase();
    if (lk === "yyyy") return t.y; if (lk === "yy") return z2(t.y % 100); if (lk === "mmmm") return MONL[t.m - 1]; if (lk === "mmm") return MON[t.m - 1];
    if (lk === "mm" || lk === "m") { const prev = all.slice(0, off), isMin = /h[^a-z]*$/i.test(prev) || /^[^a-z]*s/i.test(all.slice(off + k.length)); if (isMin) return lk === "mm" ? z2(Mi) : Mi; return lk === "mm" ? z2(t.m) : t.m; }
    if (lk === "dddd") return WDL[t.wd]; if (lk === "ddd") return WD[t.wd]; if (lk === "dd") return z2(t.d); if (lk === "d") return t.d;
    if (lk === "hh" || lk === "h") { const hh = ampm ? ((H + 11) % 12) + 1 : H; return lk === "hh" ? z2(hh) : hh; } if (lk === "ss" || lk === "s") return lk === "ss" ? z2(Se) : Se; if (lk === "am/pm") return H < 12 ? "AM" : "PM"; return k; });
}
const isDateFmt = code => !!code && /[dy]|(^|[^h])m{3,}/i.test(code.replace(/"[^"]*"|\[[^\]]*\]/g, "")) && !/0|#/.test(code.replace(/"[^"]*"/g, ""));
function fmtNum(v, code) {
  if (typeof v !== "number" || !code || code === "General") return null;
  if (code === "@") return String(v);
  const secs = code.split(";"); let sec = secs[0]; if (v < 0 && secs[1]) { sec = secs[1]; v = -v; } else if (v === 0 && secs[2]) sec = secs[2];
  if (isDateFmt(sec)) return fmtDate(v, sec);
  const clean = sec.replace(/\[[^\]]*\]/g, "").replace(/_.|\*./g, "");
  const m = /([#0,]*0[#0,]*|#[#,]*)(\.(0+|#+))?/.exec(clean); if (!m) return clean.replace(/"([^"]*)"/g, "$1");
  const pct = /%/.test(clean.replace(/"[^"]*"/g, "")), dec = m[3] ? m[3].length : 0, grp = /,/.test(m[1]), indian = /#,##,##0/.test(m[1]);
  let x = pct ? v * 100 : v; const neg = x < 0; x = Math.abs(x);
  let [ip, fp] = x.toFixed(dec).split("."); if (grp) ip = group(ip, indian); if (m[1] && /^#+$/.test(m[1].replace(/,/g, "")) && ip === "0") ip = "";
  const numS = (neg && !secs[1] ? "-" : "") + ip + (dec ? "." + fp : "");
  return (clean.slice(0, m.index) + "\u0001" + clean.slice(m.index + m[0].length)).replace(/"([^"]*)"/g, "$1").replace(/\\(.)/g, "$1").replace("\u0001", numS);
}
const NF = { gen: "General", num: "0.00", int: "#,##0", inr: '"₹"#,##,##0.00', pct: "0%", pct2: "0.00%", date: "dd-mm-yyyy", ldate: "d mmm yyyy", text: "@" };
/* parse what the user typed: ₹1,200 → 1200 with ₹ format, 12% → 0.12, 26-10-2026 → a date */
function parseEntry(s) {
  const t = s.trim(); let m;
  if ((m = /^(₹|rs\.?|inr)\s*(-?[\d,]+(\.\d+)?)$/i.exec(t))) return { raw: String(+m[2].replace(/,/g, "")), nf: NF.inr };
  if ((m = /^(-?\d{1,3}(,\d{2,3})+(\.\d+)?)$/.exec(t))) return { raw: String(+m[1].replace(/,/g, "")), nf: /,\d{2},/.test(m[1]) ? "#,##,##0" + (m[3] ? ".00" : "") : "#,##0" + (m[3] ? ".00" : "") };
  if ((m = /^(-?\d+(\.\d+)?)\s*%$/.exec(t))) return { raw: String(+m[1] / 100), nf: m[2] ? NF.pct2 : NF.pct };
  if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t)) && +m[2] <= 12 && +m[1] <= 31) return { raw: String(toSerial(+m[3], +m[2], +m[1])), nf: NF.date };
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t)) && +m[2] <= 12) return { raw: String(toSerial(+m[1], +m[2], +m[3])), nf: "yyyy-mm-dd" };
  if ((m = /^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-](\d{4})$/.exec(t)) && MON.findIndex(x => x.toLowerCase() === m[2].toLowerCase()) >= 0) return { raw: String(toSerial(+m[3], MON.findIndex(x => x.toLowerCase() === m[2].toLowerCase()) + 1, +m[1])), nf: NF.ldate };
  return null;
}
/* ---------- more worksheet functions (plugged into the shared formula engine) ---------- */
xEngine.ext = ({ flat, nums, num, str, cellVal, ERR, book }) => {
  const isR = a => a && a.range;
  const dims = a => isR(a) ? { r: a.range[3] - a.range[1] + 1, c: a.range[4] - a.range[2] + 1 } : { r: 1, c: 1 };
  const at = (a, r, c) => { if (!isR(a)) return a; const [si, r1, c1] = a.range; try { return cellVal(si, r1 + r, c1 + c); } catch (e) { return e; } };
  const cells = a => { const o = []; const d = dims(a); for (let r = 0; r < d.r; r++) for (let c = 0; c < d.c; c++) o.push(at(a, r, c)); return o; };
  const one = a => isR(a) ? at(a, 0, 0) : a;
  const eq = (x, y) => { if (typeof x === "number" && typeof y === "number") return x === y; return String(x ?? "").toLowerCase() === String(y ?? "").toLowerCase(); };
  const wild = p => new RegExp("^" + String(p).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/~\*/g, "\u0001").replace(/~\?/g, "\u0002").replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\u0001/g, "\\*").replace(/\u0002/g, "\\?") + "$", "i");
  function crit(c) {
    c = one(c); if (typeof c === "number") return v => typeof v === "number" ? v === c : String(v) === String(c);
    if (typeof c === "boolean") return v => v === c;
    const m = /^(<=|>=|<>|=|<|>)?(.*)$/s.exec(String(c ?? "")); const op = m[1] || "=", rhs = m[2]; const n = rhs !== "" && !isNaN(+rhs) ? +rhs : null;
    if (n != null) return v => { const x = typeof v === "number" ? v : (v != null && v !== "" && !isNaN(+v) ? +v : null); if (x == null) return op === "<>"; return op === "=" ? x === n : op === "<>" ? x !== n : op === "<" ? x < n : op === ">" ? x > n : op === "<=" ? x <= n : x >= n; };
    if (op === "=" || op === "<>") { const re = /[*?]/.test(rhs) ? wild(rhs) : null; const test = v => rhs === "" ? (v == null || v === "") : re ? re.test(String(v ?? "")) : String(v ?? "").toLowerCase() === rhs.toLowerCase(); return op === "=" ? test : v => !test(v); }
    return v => { const a = String(v ?? "").toLowerCase(), b = rhs.toLowerCase(); return op === "<" ? a < b : op === ">" ? a > b : op === "<=" ? a <= b : a >= b; };
  }
  function ifs(a, sumIx) { // pairs (range, criteria) starting at index 1 if sumIx===0 else 0
    const pairs = []; for (let i = sumIx === 0 ? 1 : 0; i + 1 < a.length; i += 2) pairs.push([cells(a[i]), crit(a[i + 1])]);
    const n = pairs.length ? pairs[0][0].length : 0; const ok = []; for (let k = 0; k < n; k++) ok.push(pairs.every(([vals, f]) => f(vals[k] instanceof XErr ? null : vals[k])));
    return ok;
  }
  const numOf = v => typeof v === "number" ? v : typeof v === "boolean" ? null : (v != null && v !== "" && !isNaN(+v) ? +v : null);
  const NA = () => ERR("#N/A");
  function match(look, arr, type = 1) {
    if (type === 0) { const re = typeof look === "string" && /[*?]/.test(look) ? wild(look) : null; for (let i = 0; i < arr.length; i++) if (re ? re.test(String(arr[i] ?? "")) : eq(arr[i], look)) return i; return -1; }
    let best = -1; for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (v == null || v instanceof XErr) continue; const c = typeof look === "number" ? (typeof v === "number" ? v - look : null) : (String(v).toLowerCase() < String(look).toLowerCase() ? -1 : String(v).toLowerCase() > String(look).toLowerCase() ? 1 : 0); if (c == null) continue; if (type === 1 ? c <= 0 : c >= 0) best = i; else break; } return best;
  }
  const col = (a, c) => { const d = dims(a); return Array.from({ length: d.r }, (_, r) => at(a, r, c)); };
  const row = (a, r) => { const d = dims(a); return Array.from({ length: d.c }, (_, c) => at(a, r, c)); };
  const today = () => { const d = new Date(); return toSerial(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
  const dateOf = v => { v = one(v); if (typeof v === "number") return v; const p = parseEntry(String(v ?? "")); if (p && /[dy]/.test(p.nf)) return +p.raw; ERR("#VALUE!"); };
  const rnd = (x, d, f) => { const p = Math.pow(10, d); return f(Math.abs(x) * p) / p * Math.sign(x); };
  return {
    VLOOKUP: a => { const t = a[1], d = dims(t), k = num(a[2]) - 1; if (k < 0 || k >= d.c) ERR("#REF!"); const approx = a[3] == null ? true : !!one(a[3]); const i = match(one(a[0]), col(t, 0), approx ? 1 : 0); if (i < 0) NA(); return at(t, i, k); },
    HLOOKUP: a => { const t = a[1], d = dims(t), k = num(a[2]) - 1; if (k < 0 || k >= d.r) ERR("#REF!"); const approx = a[3] == null ? true : !!one(a[3]); const i = match(one(a[0]), row(t, 0), approx ? 1 : 0); if (i < 0) NA(); return at(t, k, i); },
    XLOOKUP: a => { const arr = cells(a[1]), ret = a[2], d = dims(ret), i = match(one(a[0]), arr, 0); if (i < 0) { if (a[3] != null) return one(a[3]); NA(); } return dims(a[1]).r > 1 ? at(ret, i, 0) : at(ret, 0, i); },
    MATCH: a => { const i = match(one(a[0]), cells(a[1]), a[2] == null ? 1 : num(a[2])); if (i < 0) NA(); return i + 1; },
    INDEX: a => { const d = dims(a[0]); let r = num(a[1] ?? 1), c = a[2] == null ? 1 : num(a[2]); if (d.r === 1 && a[2] == null) { c = r; r = 1; } if (r < 1 || c < 1 || r > d.r || c > d.c) ERR("#REF!"); return at(a[0], r - 1, c - 1); },
    CHOOSE: a => { const i = num(a[0]); if (i < 1 || i >= a.length) ERR("#VALUE!"); return one(a[i]); },
    SUMIF: a => { const vals = cells(a[0]), f = crit(a[1]), s = a[2] ? cells(a[2]) : vals; let t = 0; vals.forEach((v, k) => { if (f(v instanceof XErr ? null : v)) { const n = numOf(s[k]); if (n != null) t += n; } }); return t; },
    SUMIFS: a => { const s = cells(a[0]), ok = ifs(a, 0); return s.reduce((t, v, k) => t + (ok[k] && numOf(v) != null ? numOf(v) : 0), 0); },
    COUNTIF: a => cells(a[0]).filter(v => crit(a[1])(v instanceof XErr ? null : v)).length,
    COUNTIFS: a => ifs(a, -1).filter(Boolean).length,
    AVERAGEIF: a => { const vals = cells(a[0]), f = crit(a[1]), s = a[2] ? cells(a[2]) : vals; const n = []; vals.forEach((v, k) => { if (f(v) && numOf(s[k]) != null) n.push(numOf(s[k])); }); if (!n.length) ERR("#DIV/0!"); return n.reduce((x, y) => x + y, 0) / n.length; },
    AVERAGEIFS: a => { const s = cells(a[0]), ok = ifs(a, 0); const n = s.filter((v, k) => ok[k] && numOf(v) != null).map(numOf); if (!n.length) ERR("#DIV/0!"); return n.reduce((x, y) => x + y, 0) / n.length; },
    MAXIFS: a => { const s = cells(a[0]), ok = ifs(a, 0); const n = s.filter((v, k) => ok[k] && numOf(v) != null).map(numOf); return n.length ? Math.max(...n) : 0; },
    MINIFS: a => { const s = cells(a[0]), ok = ifs(a, 0); const n = s.filter((v, k) => ok[k] && numOf(v) != null).map(numOf); return n.length ? Math.min(...n) : 0; },
    SUMPRODUCT: a => { const L = a.map(cells); const n = L[0].length; let t = 0; for (let k = 0; k < n; k++) t += L.reduce((p, l) => p * (numOf(l[k]) || 0), 1); return t; },
    IFERROR: a => a[0] instanceof XErr ? (a[1] ?? "") : (isR(a[0]) ? one(a[0]) : a[0]),
    IFNA: a => a[0] instanceof XErr && a[0].c === "#N/A" ? (a[1] ?? "") : (isR(a[0]) ? one(a[0]) : a[0]),
    ISERROR: a => { const v = isR(a[0]) ? one(a[0]) : a[0]; return v instanceof XErr; }, ISERR: a => { const v = isR(a[0]) ? one(a[0]) : a[0]; return v instanceof XErr && v.c !== "#N/A"; }, ISNA: a => { const v = isR(a[0]) ? one(a[0]) : a[0]; return v instanceof XErr && v.c === "#N/A"; },
    ISBLANK: a => { const v = one(a[0]); return v == null || v === ""; }, ISNUMBER: a => typeof one(a[0]) === "number", ISTEXT: a => typeof one(a[0]) === "string" && one(a[0]) !== "",
    ROUNDUP: a => rnd(num(a[0]), num(a[1] ?? 0), Math.ceil), ROUNDDOWN: a => rnd(num(a[0]), num(a[1] ?? 0), Math.floor),
    CEILING: a => { const s = num(a[1] ?? 1); return s ? Math.ceil(num(a[0]) / s) * s : 0; }, FLOOR: a => { const s = num(a[1] ?? 1); return s ? Math.floor(num(a[0]) / s) * s : 0; },
    POWER: a => Math.pow(num(a[0]), num(a[1])), PI: () => Math.PI, SIGN: a => Math.sign(num(a[0])), TRUNC: a => rnd(num(a[0]), num(a[1] ?? 0), Math.floor),
    MEDIAN: a => { const n = nums(a).sort((x, y) => x - y); if (!n.length) ERR("#NUM!"); const m = n.length >> 1; return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2; },
    LARGE: a => { const n = nums([a[0]]).sort((x, y) => y - x), k = num(a[1]); if (k < 1 || k > n.length) ERR("#NUM!"); return n[k - 1]; },
    SMALL: a => { const n = nums([a[0]]).sort((x, y) => x - y), k = num(a[1]); if (k < 1 || k > n.length) ERR("#NUM!"); return n[k - 1]; },
    RANK: a => { const v = num(a[0]), n = nums([a[1]]); if (!n.includes(v)) NA(); return (a[2] && num(a[2]) ? n.filter(x => x < v) : n.filter(x => x > v)).length + 1; },
    COUNTBLANK: a => cells(a[0]).filter(v => v == null || v === "").length,
    LEFT: a => [...str(a[0])].slice(0, a[1] == null ? 1 : num(a[1])).join(""), RIGHT: a => { const s = [...str(a[0])], n = a[1] == null ? 1 : num(a[1]); return n ? s.slice(-n).join("") : ""; },
    MID: a => [...str(a[0])].slice(num(a[1]) - 1, num(a[1]) - 1 + num(a[2])).join(""),
    FIND: a => { const i = str(a[1]).indexOf(str(a[0]), (a[2] == null ? 1 : num(a[2])) - 1); if (i < 0) ERR("#VALUE!"); return i + 1; },
    SEARCH: a => { const i = str(a[1]).toLowerCase().indexOf(str(a[0]).toLowerCase(), (a[2] == null ? 1 : num(a[2])) - 1); if (i < 0) ERR("#VALUE!"); return i + 1; },
    SUBSTITUTE: a => { const s = str(a[0]), o = str(a[1]), n = str(a[2]); if (!o) return s; if (a[3] == null) return s.split(o).join(n); let k = num(a[3]), i = -1; while (k-- > 0) { i = s.indexOf(o, i + 1); if (i < 0) return s; } return s.slice(0, i) + n + s.slice(i + o.length); },
    REPLACE: a => { const s = [...str(a[0])], st = num(a[1]) - 1; s.splice(st, num(a[2]), str(a[3])); return s.join(""); },
    PROPER: a => str(a[0]).toLowerCase().replace(/(^|[^a-z\u0980-\u09ff])([a-z])/g, (m, p, c) => p + c.toUpperCase()), REPT: a => str(a[0]).repeat(Math.max(0, num(a[1]))), EXACT: a => str(a[0]) === str(a[1]),
    VALUE: a => { const v = one(a[0]); if (typeof v === "number") return v; const p = parseEntry(String(v)); if (p) return +p.raw; const n = +String(v).replace(/,/g, ""); if (isNaN(n)) ERR("#VALUE!"); return n; },
    TEXT: a => { const v = one(a[0]); const f = str(a[1]); const n = typeof v === "number" ? v : numOf(v); return n == null ? str(v) : (fmtNum(n, f) ?? String(n)); },
    TEXTJOIN: a => { const d = str(a[0]), skip = !!one(a[1]); return a.slice(2).flatMap(x => isR(x) ? cells(x) : [x]).map(v => v == null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v)).filter(v => !skip || v !== "").join(d); },
    DATE: a => { let y = num(a[0]), m = num(a[1]), d = num(a[2]); if (y < 1900) y += 1900; return (Date.UTC(y, m - 1, d) - EPOCH) / DAY; },
    TODAY: () => today(), NOW: () => { const d = new Date(); return today() + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400; },
    YEAR: a => fromSerial(dateOf(a[0])).y, MONTH: a => fromSerial(dateOf(a[0])).m, DAY: a => fromSerial(dateOf(a[0])).d, WEEKDAY: a => fromSerial(dateOf(a[0])).wd + 1,
    EDATE: a => { const t = fromSerial(dateOf(a[0])); return (Date.UTC(t.y, t.m - 1 + num(a[1]), t.d) - EPOCH) / DAY; },
    EOMONTH: a => { const t = fromSerial(dateOf(a[0])); return (Date.UTC(t.y, t.m + num(a[1]), 0) - EPOCH) / DAY; },
    DAYS: a => Math.floor(dateOf(a[0])) - Math.floor(dateOf(a[1])),
    DATEDIF: a => { const s = fromSerial(dateOf(a[0])), e = fromSerial(dateOf(a[1])), u = str(a[2]).toUpperCase(); let mo = (e.y - s.y) * 12 + e.m - s.m - (e.d < s.d ? 1 : 0);
      if (u === "D") return Math.floor(dateOf(a[1])) - Math.floor(dateOf(a[0])); if (u === "M") return mo; if (u === "Y") return Math.floor(mo / 12); if (u === "YM") return mo % 12; ERR("#NUM!"); },
    NETWORKDAYS: a => { let s = Math.floor(dateOf(a[0])), e = Math.floor(dateOf(a[1])), sg = 1; if (s > e) { [s, e] = [e, s]; sg = -1; } const hol = new Set(a[2] ? cells(a[2]).filter(v => typeof v === "number").map(Math.floor) : []); let n = 0; for (let d = s; d <= e; d++) { const w = fromSerial(d).wd; if (w && w !== 6 && !hol.has(d)) n++; } return n * sg; },
    AND: a => flat(a).every(x => !!x.v), OR: a => flat(a).some(x => !!x.v), XOR: a => flat(a).filter(x => !!x.v).length % 2 === 1,
    SUMSQ: a => nums(a).reduce((t, x) => t + x * x, 0), STDEV: a => { const n = nums(a); if (n.length < 2) ERR("#DIV/0!"); const m = n.reduce((x, y) => x + y, 0) / n.length; return Math.sqrt(n.reduce((t, x) => t + (x - m) ** 2, 0) / (n.length - 1)); },
    COUNTA: a => a.flatMap(x => isR(x) ? cells(x) : [x]).filter(v => v != null && v !== "").length
  };
};
/* ---------- the editor ---------- */
ED.kinds.excel = (() => {
  const MAXR = 2000;
  let noteBox = null; let book, eng, si = 0, sel = { r: 0, c: 0 }, anc = { r: 0, c: 0 }, wrap, inner, tbl, fx, addr, tabs, frzSel, nfSel, fontSel, sizeSel, stat, fh, findBar, charts, curExt = "xlsx", editing = false, zoom = 1;
  let undo = [], redo = [], clip = null, mdrag = false, fdrag = null;
  const S = () => book.sheets[si];
  const K = (r, c) => r + "," + c;
  const R = () => ({ r1: Math.min(sel.r, anc.r), c1: Math.min(sel.c, anc.c), r2: Math.max(sel.r, anc.r), c2: Math.max(sel.c, anc.c) });
  const gen = v => v == null ? "" : v instanceof XErr ? v.c : typeof v === "number" ? (Number.isInteger(v) ? String(v) : String(+v.toPrecision(10))) : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v);
  const show = (v, f) => (f && f.nf && typeof v === "number" ? fmtNum(v, f.nf) : null) ?? gen(v);
  const used = s => { let r = 0, c = 0; for (const k of s.cells.keys()) { const [a, b] = k.split(",").map(Number); r = Math.max(r, a + 1); c = Math.max(c, b + 1); } for (const k of s.fmt.keys()) { const [a, b] = k.split(",").map(Number); r = Math.max(r, a + 1); c = Math.max(c, b + 1); } return { r, c }; };
  function newSheet(name) { return { name, cells: new Map(), fmt: new Map(), merges: [], colW: [], nr: 50, nc: 12, frz: { r: 0, c: 0 }, filter: null, cf: [], charts: [], notes: new Map(), dv: [] }; }
  const val = (r, c, s = si) => { const raw = book.sheets[s].cells.get(K(r, c)); return raw == null || raw === "" ? null : eng.get(s, r, c); };
  /* undo / redo: whole-book snapshots (structuredClone keeps Maps and Sets) */
  const snapBook = () => ({ sheets: structuredClone(book.sheets), si, names: { ...(book.names || {}) } });
  function snap() { undo.push(snapBook()); if (undo.length > 100) undo.shift(); redo = []; }
  function undoDo(back) { const from = back ? undo : redo, to = back ? redo : undo; if (!from.length) return; to.push(snapBook()); const s = from.pop(); book.sheets = s.sheets; book.names = s.names || {}; si = Math.min(s.si, book.sheets.length - 1); eng = xEngine(book); ED.dirty("excel"); render(); }
  function edit(fn) { snap(); fn(); ED.dirty("excel"); render(); }
  /* ---------- cell styling ---------- */
  // cells with their own fill keep the file's text colour (or dark/white for contrast), whatever the app theme
  const lum = c => { const m = /^#?([0-9a-f]{6})$/i.exec(String(c || "").trim()); if (!m) return null; const v = [0, 2, 4].map(i => { const x = parseInt(m[1].slice(i, i + 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const inkOn = (bg, fg) => { const lb = lum(bg); if (lb == null) return fg || "#000000"; const ink = lb > 0.18 ? "#000000" : "#ffffff"; if (!fg) return ink; const lf = lum(fg); if (lf == null) return fg; const cr = (Math.max(lb, lf) + 0.05) / (Math.min(lb, lf) + 0.05); return cr < 2.2 ? ink : fg; };
  const fontStack = n => (ED.FONTS && ED.FONTS[n]) || `"${n}", sans-serif`;
  function cssOf(f, v) {
    let s = ""; if (!f) return s;
    if (f.b) s += "font-weight:700;"; if (f.i) s += "font-style:italic;"; const dec = [f.u && "underline", f.s && "line-through"].filter(Boolean).join(" "); if (dec) s += `text-decoration:${dec};`;
    if (f.font) s += `font-family:${fontStack(f.font)};`; if (f.sz) s += `font-size:${f.sz}pt;`; if (f.bg) { s += `background:${f.bg};color:${inkOn(f.bg, f.color)};`; } else if (f.color) s += `color:${f.color};`;
    if (f.al) s += `text-align:${f.al};`; if (f.wrap) s += "white-space:normal;word-break:break-word;";
    if (f.bd) { const B = "1px solid #222"; if (f.bd.t) s += `border-top:${B};`; if (f.bd.b) s += `border-bottom:${B};`; if (f.bd.l) s += `border-left:${B};`; if (f.bd.r) s += `border-right:${B};`; }
    return s;
  }
  function cfHit(s, r, c, v) { for (const rule of s.cf || []) { if (r < rule.r1 || r > rule.r2 || c < rule.c1 || c > rule.c2) continue; const n = typeof v === "number" ? v : null, x = isNaN(+rule.val) ? null : +rule.val;
      const ok = rule.op === ">" ? n != null && x != null && n > x : rule.op === "<" ? n != null && x != null && n < x : rule.op === ">=" ? n != null && n >= x : rule.op === "<=" ? n != null && n <= x : rule.op === "<>" ? String(v ?? "").toLowerCase() !== String(rule.val).toLowerCase() : (x != null && n != null ? n === x : String(v ?? "").toLowerCase() === String(rule.val).toLowerCase());
      if (ok) return rule; } return null; }
  function hiddenRows(s) { const hide = new Set(); const F = s.filter; if (!F) return hide; const u = used(s);
    for (let r = F.r + 1; r < u.r; r++) for (const c of Object.keys(F.hide)) { const set = F.hide[c]; if (set && set.size && set.has(show(val(r, +c), s.fmt.get(K(r, +c))))) { hide.add(r); break; } } return hide; }
  /* ---------- render ---------- */
  function render() {
    const s = S(); const u = used(s); s.nr = Math.max(s.nr, u.r + 10, 30); s.nc = Math.max(s.nc, u.c + 2, 10);
    const nr = Math.min(s.nr, MAXR); eng.reset();
    const cover = new Set(), span = new Map();
    for (const m of s.merges) { span.set(K(m.r1, m.c1), m); for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) if (r !== m.r1 || c !== m.c1) cover.add(K(r, c)); }
    const hid = hiddenRows(s); const F = s.filter;
    const cg = `<colgroup><col style="width:46px">${Array.from({ length: s.nc }, (_, c) => `<col style="width:${s.colW[c] || 90}px">`).join("")}</colgroup>`;
    const th = `<thead><tr><th class="xs-corner" data-all="1"></th>${Array.from({ length: s.nc }, (_, c) => `<th scope="col" data-c="${c}">${colName(c)}<span class="xs-rz" data-rz="${c}"></span></th>`).join("")}</tr></thead>`;
    let body = "";
    for (let r = 0; r < nr; r++) {
      body += `<tr data-row="${r}"${hid.has(r) ? ' hidden' : ""}${s.rowH && s.rowH[r] ? ` style="height:${s.rowH[r]}px"` : ""}><th scope="row" data-r="${r}">${r + 1}</th>`;
      for (let c = 0; c < s.nc; c++) { const k = K(r, c); if (cover.has(k)) continue; const raw = s.cells.get(k); const f = s.fmt.get(k); const v = raw == null || raw === "" ? null : eng.get(si, r, c);
        const m = span.get(k); const hit = cfHit(s, r, c, v); const cls = (typeof v === "number" ? "n" : v instanceof XErr ? "e" : "") + (s.notes && s.notes.has(k) ? " xs-hasnote" : "") + (s.dv && s.dv.length && dvAt(s, r, c) && dvAt(s, r, c).type === "list" ? " xs-hasdv" : "") + (F && r === F.r && c >= F.c1 && c <= F.c2 ? " xs-fh-on" + (F.hide[c] && F.hide[c].size ? " xs-fon" : "") : "");
        body += `<td data-r="${r}" data-c="${c}"${cls.trim() ? ` class="${cls.trim()}"` : ""}${m ? ` rowspan="${m.r2 - m.r1 + 1}" colspan="${m.c2 - m.c1 + 1}"` : ""}${f || hit ? ` style="${esc(cssOf(f) + (hit ? `background:${hit.bg};color:${hit.fg || "#9c0006"};` : ""))}"` : ""}>${esc(show(v, f))}</td>`; }
      body += "</tr>"; }
    tbl.innerHTML = cg + th + `<tbody>${body}</tbody>`; tbl.style.width = (46 + Array.from({ length: s.nc }, (_, c) => s.colW[c] || 90).reduce((a, b) => a + b, 0)) + "px";
    tbl.style.zoom = zoom; tbl.classList.remove("frz");
    if (F) for (const td of tbl.querySelectorAll("td.xs-fh-on")) td.append(h("span", { class: "xs-fb", "data-fc": td.dataset.c, role: "button", "aria-label": T("x_filter") + " " + colName(+td.dataset.c) }));
    drawTabs(); frzSel.value = s.frz.r === 1 && !s.frz.c ? "row" : !s.frz.r && s.frz.c === 1 ? "col" : s.frz.r || s.frz.c ? "sel" : "none";
    if (nr < s.nr) ED.st.excel.msg.textContent = T("big", MAXR);
    freeze(); paintSel(); drawCharts();
  }
  function freeze() {
    const s = S(); const fr = s.frz || { r: 0, c: 0 }; if (!fr.r && !fr.c) return;
    const headH = tbl.tHead.rows[0].offsetHeight; let top = headH; const rows = tbl.tBodies[0].rows;
    const lefts = [46]; for (let c = 0; c < fr.c; c++) lefts.push(lefts[c] + (s.colW[c] || 90));
    for (let r = 0; r < rows.length; r++) { const tr = rows[r]; const isF = r < fr.r;
      for (const cell of tr.cells) { const c = cell.tagName === "TH" ? -1 : +cell.dataset.c; const fc = c >= 0 && c < fr.c;
        if (isF || fc) { cell.style.position = "sticky"; if (isF) cell.style.top = top + "px"; if (fc) cell.style.left = lefts[c] + "px"; cell.style.zIndex = isF && (fc || c < 0) ? 3 : 2; if (!cell.style.background) cell.style.background = "var(--surface)"; cell.classList.add("xs-fz"); }
        if (c < 0 && isF) { cell.style.top = top + "px"; cell.style.zIndex = 3; } }
      if (isF) top += tr.offsetHeight; }
    for (const th of tbl.tHead.rows[0].cells) { const c = th.dataset.c == null ? -1 : +th.dataset.c; if (c >= 0 && c < fr.c) { th.style.left = lefts[c] + "px"; th.style.zIndex = 4; } }
  }
  const cellTd = (r, c) => tbl.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
  function anchorOf(r, c) { for (const m of S().merges) if (r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2) return { r: m.r1, c: m.c1 }; return { r, c }; }
  function paintSel(scroll = true) {
    for (const o of tbl.querySelectorAll("td.sel, td.rng")) o.classList.remove("sel", "rng");
    const g = R(), multi = g.r1 !== g.r2 || g.c1 !== g.c2;
    if (multi) for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 600); r++) for (const td of tbl.querySelectorAll(`tr[data-row="${r}"] td`)) { const c = +td.dataset.c; if (c >= g.c1 && c <= g.c2) td.classList.add("rng"); }
    const a = anchorOf(sel.r, sel.c); const td = cellTd(a.r, a.c); if (td) { td.classList.add("sel"); if (scroll) td.scrollIntoView({ block: "nearest", inline: "nearest" }); }
    addr.textContent = multi ? colName(g.c1) + (g.r1 + 1) + ":" + colName(g.c2) + (g.r2 + 1) : colName(sel.c) + (sel.r + 1);
    if (!editing) fx.value = S().cells.get(K(a.r, a.c)) || "";
    const f = S().fmt.get(K(a.r, a.c)) || {};
    for (const [id, k] of [["xs-b", "b"], ["xs-i", "i"], ["xs-u", "u"], ["xs-s", "s"], ["xs-wrap", "wrap"]]) { const b = document.getElementById(id); if (b) b.setAttribute("aria-pressed", String(!!f[k])); }
    for (const [id, k] of [["xs-al", "left"], ["xs-ac", "center"], ["xs-ar", "right"]]) { const b = document.getElementById(id); if (b) b.setAttribute("aria-pressed", String(f.al === k)); }
    nfSel.value = Object.entries(NF).find(([, c]) => c === (f.nf || "General"))?.[0] || "";
    fontSel.value = f.font || "Calibri"; sizeSel.value = String(f.sz || 11);
    // status bar: sum / average / count of the selection
    let n = 0, cnt = 0, sum = 0; if (multi) for (let r = g.r1; r <= Math.min(g.r2, g.r1 + 5000); r++) for (let c = g.c1; c <= g.c2; c++) { const v = val(r, c); if (v != null && v !== "") cnt++; if (typeof v === "number") { n++; sum += v; } }
    noteLine(); stat.textContent = multi && cnt ? `${T("x_sel_sum")}: ${gen(+sum.toPrecision(12))}   ${T("x_sel_avg")}: ${n ? gen(+(sum / n).toPrecision(10)) : "—"}   ${T("x_sel_cnt")}: ${cnt}` : "";
    placeFh();
  }
  function placeFh() { const g = R(); const a = anchorOf(g.r2, g.c2); let td = cellTd(a.r, a.c); if (!td) { fh.hidden = true; return; } const m = S().merges.find(m => m.r1 === a.r && m.c1 === a.c); if (m && (m.r2 > g.r2 || m.c2 > g.c2)) {} fh.hidden = false; fh.style.left = (tbl.offsetLeft + (td.offsetLeft + td.offsetWidth) * zoom - 4) + "px"; fh.style.top = (tbl.offsetTop + (td.offsetTop + td.offsetHeight) * zoom - 4) + "px"; }
  function refresh() { render(); }
  /* ---------- editing ---------- */
  function putRaw(s, r, c, raw) { const k = K(r, c); if (raw === "" || raw == null) s.cells.delete(k); else s.cells.set(k, raw); }
  function setFmt(s, r, c, patch) { const k = K(r, c); const f = { ...(s.fmt.get(k) || {}), ...patch }; for (const x of Object.keys(f)) if (f[x] == null || f[x] === false || f[x] === "") delete f[x]; if (f.nf === "General") delete f.nf; if (Object.keys(f).length) s.fmt.set(k, f); else s.fmt.delete(k); }
  function setCell(r, c, raw) {
    const s = S(); const a = anchorOf(r, c); r = a.r; c = a.c; const k = K(r, c); const old = s.cells.get(k) || "";
    let nf = null; const f = s.fmt.get(k) || {};
    if (raw && raw[0] !== "=" && f.nf !== "@") { const p = parseEntry(raw); if (p) { raw = p.raw; if (!f.nf || (isDateFmt(p.nf) !== isDateFmt(f.nf))) nf = p.nf; } }
    const rule = dvAt(s, r, c); if (raw && raw[0] !== "=" && !dvOk(rule, raw)) { ED.st.excel.msg.textContent = T("x_dv_bad", colName(c) + (r + 1), dvText(rule)); render(); return; }
    if (rule && rule.type === "list" && raw) raw = rule.list.find(x => x.toLowerCase() === String(raw).toLowerCase()) || raw;
    if (old === raw && !nf) return; snap(); putRaw(s, r, c, raw); if (nf) setFmt(s, r, c, { nf }); ED.dirty("excel"); render();
  }
  function move(dr, dc, extend = false) { const s = S(); let r = sel.r, c = sel.c; const m = S().merges.find(m => r >= m.r1 && r <= m.r2 && c >= m.c1 && c <= m.c2); if (m && !extend) { if (dr > 0) r = m.r2; if (dc > 0) c = m.c2; }
    const hid = hiddenRows(s); r += dr; while (dr && hid.has(r) && r > 0 && r < MAXR) r += dr;
    sel = { r: Math.max(0, Math.min(Math.min(s.nr, MAXR) - 1, r)), c: Math.max(0, Math.min(s.nc - 1, c + dc)) }; if (!extend) anc = { ...sel };
    if (sel.r >= s.nr - 2 || sel.c >= s.nc - 1) { s.nr += sel.r >= s.nr - 2 ? 20 : 0; s.nc += sel.c >= s.nc - 1 ? 3 : 0; render(); } else paintSel(); }
  function commit(dr = 1, dc = 0) { if (!editing) return; editing = false; setCell(sel.r, sel.c, fx.value); move(dr, dc); wrap.focus(); }
  const forRange = fn => { const g = R(), s = S(); for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) fn(s, r, c, g); };
  function fmtRange(patch) { edit(() => forRange((s, r, c) => setFmt(s, r, c, typeof patch === "function" ? patch(s.fmt.get(K(r, c)) || {}, r, c) : patch))); }
  function toggle(k) { const a = anchorOf(sel.r, sel.c); const on = !(S().fmt.get(K(a.r, a.c)) || {})[k]; fmtRange({ [k]: on }); }
  function borders(kind) { const g = R(); edit(() => forRange((s, r, c) => { const f = s.fmt.get(K(r, c)) || {}; let bd = { ...(f.bd || {}) };
    if (kind === "none") bd = null; else if (kind === "all") bd = { t: 1, b: 1, l: 1, r: 1 }; else if (kind === "out") { if (r === g.r1) bd.t = 1; if (r === g.r2) bd.b = 1; if (c === g.c1) bd.l = 1; if (c === g.c2) bd.r = 1; } else if (kind === "bot" && r === g.r2) bd.b = 1;
    setFmt(s, r, c, { bd: bd && Object.keys(bd).length ? bd : null }); })); }
  function decimals(d) { fmtRange(f => { const nf = f.nf || "General"; if (isDateFmt(nf)) return {}; const m = /(#,##,##0|#,##0|0)(\.(0+))?/.exec(nf); if (!m) return { nf: d > 0 ? "0.0" : "0" }; const n = Math.max(0, (m[3] ? m[3].length : 0) + d); return { nf: nf.replace(m[0], m[1] + (n ? "." + "0".repeat(n) : "")) }; }); }
  function merge(on) {
    const g = R(), s = S();
    if (!on) { edit(() => { s.merges = s.merges.filter(m => m.r2 < g.r1 || m.r1 > g.r2 || m.c2 < g.c1 || m.c1 > g.c2); }); return; }
    if (g.r1 === g.r2 && g.c1 === g.c2) return; let extra = false; forRange((s, r, c) => { if ((r !== g.r1 || c !== g.c1) && s.cells.get(K(r, c))) extra = true; });
    if (extra && !confirm(T("x_merge_lose"))) return;
    edit(() => { s.merges = s.merges.filter(m => m.r2 < g.r1 || m.r1 > g.r2 || m.c2 < g.c1 || m.c1 > g.c2); forRange((s, r, c) => { if (r !== g.r1 || c !== g.c1) putRaw(s, r, c, ""); }); s.merges.push({ ...g }); setFmt(s, g.r1, g.c1, { al: "center" }); });
    sel = { r: g.r1, c: g.c1 }; anc = { ...sel }; paintSel();
  }
  /* formulas: move relative references by (dr, dc) like Excel does on copy, fill and sort */
  function shiftF(f, dr, dc) {
    if (!f || f[0] !== "=" || (!dr && !dc)) return f;
    return f.split(/("(?:[^"]|"")*"|'[^']+'!)/).map((part, k) => k % 2 ? part : part.replace(/(?<![\w.$])(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\w(])/g, (all, d1, col, d2, row) => {
      let c = colNum(col), r = +row - 1; if (!d1) c += dc; if (!d2) r += dr; if (c < 0 || r < 0) return "#REF!"; return d1 + colName(c) + d2 + (r + 1); })).join("");
  }
  /* copy / cut / paste */
  function grab(cut) { const g = R(), s = S(); const rows = []; for (let r = g.r1; r <= g.r2; r++) { const row = []; for (let c = g.c1; c <= g.c2; c++) row.push({ raw: s.cells.get(K(r, c)) || "", f: s.fmt.get(K(r, c)) || null, show: show(val(r, c), s.fmt.get(K(r, c))) }); rows.push(row); }
    clip = { rows, g, si, cut, tsv: rows.map(r => r.map(x => x.show.replace(/[\t\n]/g, " ")).join("\t")).join("\n") }; for (const td of tbl.querySelectorAll("td.cpy")) td.classList.remove("cpy"); forRange((s, r, c) => { const td = cellTd(r, c); if (td) td.classList.add("cpy"); }); return clip.tsv; }
  function pasteInternal() {
    if (!clip) return; const s = S(), src = book.sheets[clip.si]; const dr = sel.r - clip.g.r1, dc = sel.c - clip.g.c1; const g = R();
    const reps = clip.rows.length === 1 && clip.rows[0].length === 1 ? { r: g.r2 - g.r1 + 1, c: g.c2 - g.c1 + 1 } : { r: clip.rows.length, c: clip.rows[0].length };
    edit(() => { if (clip.cut && src) for (let r = clip.g.r1; r <= clip.g.r2; r++) for (let c = clip.g.c1; c <= clip.g.c2; c++) { putRaw(src, r, c, ""); src.fmt.delete(K(r, c)); }
      const r0 = Math.min(sel.r, anc.r), c0 = Math.min(sel.c, anc.c);
      for (let i = 0; i < reps.r; i++) for (let j = 0; j < reps.c; j++) { const x = clip.rows[i % clip.rows.length][j % clip.rows[0].length]; const r = r0 + i, c = c0 + j;
        putRaw(s, r, c, clip.cut ? x.raw : shiftF(x.raw, r - (clip.g.r1 + i % clip.rows.length), c - (clip.g.c1 + j % clip.rows[0].length))); if (x.f) s.fmt.set(K(r, c), structuredClone(x.f)); else s.fmt.delete(K(r, c)); } });
    if (clip.cut) clip = null; anc = { r: Math.min(sel.r, anc.r), c: Math.min(sel.c, anc.c) }; sel = { r: anc.r + reps.r - 1, c: anc.c + reps.c - 1 }; paintSel();
  }
  function pasteText(t) {
    if (clip && t.replace(/\r/g, "").trim() === clip.tsv.trim()) return pasteInternal();
    const rows = t.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map(l => l.split("\t")); const s = S();
    edit(() => rows.forEach((row, i) => row.forEach((v, j) => { const r = sel.r + i, c = sel.c + j; const p = v && v[0] !== "=" ? parseEntry(v) : null; putRaw(s, r, c, p ? p.raw : v); if (p) setFmt(s, r, c, { nf: p.nf }); })));
  }
  function clearRange() { edit(() => forRange((s, r, c) => putRaw(s, r, c, ""))); }
  /* fill down / right and the autofill handle */
  const SER = [MON, MONL, WD, WDL];
  function series(src, n) { // src: [{raw,f}] in order; returns n new raws continuing the pattern
    const lit = src.map(x => x.raw), out = [];
    const nums = lit.every(x => x !== "" && x[0] !== "=" && !isNaN(+x)) ? lit.map(Number) : null;
    if (nums && (nums.length > 1 || (src[0].f && isDateFmt(src[0].f.nf)))) { const step = nums.length > 1 ? nums[nums.length - 1] - nums[nums.length - 2] : 1; for (let k = 1; k <= n; k++) out.push(String(+(nums[nums.length - 1] + step * k).toPrecision(15))); return out; }
    for (const L of SER) { const ix = lit.map(x => L.findIndex(m => m.toLowerCase() === x.toLowerCase())); if (ix.every(i => i >= 0)) { const step = ix.length > 1 ? ix[ix.length - 1] - ix[ix.length - 2] : 1; for (let k = 1; k <= n; k++) out.push(L[(((ix[ix.length - 1] + step * k) % L.length) + L.length) % L.length]); return out; } }
    const tm = lit.map(x => /^(.*?)(\d+)$/.exec(x)); if (lit.length && tm.every(m => m && m[1] === tm[0][1] && x0(m[1]))) { const ns = tm.map(m => +m[2]); const step = ns.length > 1 ? ns[ns.length - 1] - ns[ns.length - 2] : 1; for (let k = 1; k <= n; k++) out.push(tm[0][1] + (ns[ns.length - 1] + step * k)); return out; }
    return null;
  }
  const x0 = p => p === "" || /\D$/.test(p);
  function fillTo(g2) { // extend R() to the box g2 (down or right)
    const g = R(), s = S(); const down = g2.r2 > g.r2, right = g2.c2 > g.c2, up = g2.r1 < g.r1, left = g2.c1 < g.c1; if (!down && !right && !up && !left) return;
    edit(() => {
      if (down || up) for (let c = g.c1; c <= g.c2; c++) { const src = []; for (let r = g.r1; r <= g.r2; r++) src.push({ raw: s.cells.get(K(r, c)) || "", f: s.fmt.get(K(r, c)) });
        const n = down ? g2.r2 - g.r2 : g.r1 - g2.r1; const ser = down ? series(src, n) : null;
        for (let k = 1; k <= n; k++) { const r = down ? g.r2 + k : g.r1 - k; const ix = down ? (k - 1) % src.length : src.length - 1 - ((k - 1) % src.length); const x = src[ix]; const sr = g.r1 + ix;
          putRaw(s, r, c, ser ? ser[k - 1] : shiftF(x.raw, r - sr, 0)); if (x.f) s.fmt.set(K(r, c), structuredClone(x.f)); else s.fmt.delete(K(r, c)); } }
      if (right || left) for (let r = g.r1; r <= g.r2; r++) { const src = []; for (let c = g.c1; c <= g.c2; c++) src.push({ raw: s.cells.get(K(r, c)) || "", f: s.fmt.get(K(r, c)) });
        const n = right ? g2.c2 - g.c2 : g.c1 - g2.c1; const ser = right ? series(src, n) : null;
        for (let k = 1; k <= n; k++) { const c = right ? g.c2 + k : g.c1 - k; const ix = right ? (k - 1) % src.length : src.length - 1 - ((k - 1) % src.length); const x = src[ix]; const sc = g.c1 + ix;
          putRaw(s, r, c, ser ? ser[k - 1] : shiftF(x.raw, 0, c - sc)); if (x.f) s.fmt.set(K(r, c), structuredClone(x.f)); else s.fmt.delete(K(r, c)); } }
    });
    anc = { r: Math.min(g.r1, g2.r1), c: Math.min(g.c1, g2.c1) }; sel = { r: Math.max(g.r2, g2.r2), c: Math.max(g.c2, g2.c2) }; paintSel();
  }
  function fillDown() { const g = R(), s = S(); if (g.r1 === g.r2) return; edit(() => { for (let c = g.c1; c <= g.c2; c++) { const raw = s.cells.get(K(g.r1, c)) || "", f = s.fmt.get(K(g.r1, c)); for (let r = g.r1 + 1; r <= g.r2; r++) { putRaw(s, r, c, shiftF(raw, r - g.r1, 0)); if (f) s.fmt.set(K(r, c), structuredClone(f)); else s.fmt.delete(K(r, c)); } } }); }
  function fillRight() { const g = R(), s = S(); if (g.c1 === g.c2) return; edit(() => { for (let r = g.r1; r <= g.r2; r++) { const raw = s.cells.get(K(r, g.c1)) || "", f = s.fmt.get(K(r, g.c1)); for (let c = g.c1 + 1; c <= g.c2; c++) { putRaw(s, r, c, shiftF(raw, 0, c - g.c1)); if (f) s.fmt.set(K(r, c), structuredClone(f)); else s.fmt.delete(K(r, c)); } } }); }
  /* sort and filter */
  const sortKey = v => v == null || v === "" ? [2, ""] : typeof v === "number" ? [0, v] : [1, String(v).toLowerCase()];
  function region() { const g = R(), s = S(), u = used(s); if (g.r2 > g.r1) return { r1: g.r1, r2: g.r2, c1: g.c2 > g.c1 ? g.c1 : 0, c2: g.c2 > g.c1 ? g.c2 : Math.max(0, u.c - 1) };
    const head = [...Array(Math.max(1, u.c)).keys()].some(c => typeof val(0, c) === "string") && [...Array(Math.max(1, u.c)).keys()].every(c => typeof val(0, c) !== "number"); return { r1: s.filter ? s.filter.r + 1 : head ? 1 : 0, r2: u.r - 1, c1: 0, c2: Math.max(0, u.c - 1) }; }
  function sortBy(desc, col = sel.c, g = region()) {
    const s = S(); if (g.r2 <= g.r1) return; const rows = [];
    for (let r = g.r1; r <= g.r2; r++) { const cells = []; for (let c = g.c1; c <= g.c2; c++) cells.push({ raw: s.cells.get(K(r, c)) || "", f: s.fmt.get(K(r, c)) }); rows.push({ r, key: sortKey(val(r, col)), cells }); }
    rows.sort((a, b) => a.key[0] - b.key[0] || (a.key[0] === 2 ? 0 : (a.key[1] < b.key[1] ? -1 : a.key[1] > b.key[1] ? 1 : 0) * (desc ? -1 : 1)));
    edit(() => rows.forEach((row, i) => { const r = g.r1 + i; row.cells.forEach((x, j) => { const c = g.c1 + j; putRaw(s, r, c, shiftF(x.raw, r - row.r, 0)); if (x.f) s.fmt.set(K(r, c), x.f); else s.fmt.delete(K(r, c)); }); }));
  }
  function toggleFilter() { const s = S(); if (s.filter) { edit(() => { s.filter = null; }); return; } const g = R(), u = used(s); edit(() => { s.filter = { r: g.r2 > g.r1 ? g.r1 : 0, c1: g.c2 > g.c1 ? g.c1 : 0, c2: g.c2 > g.c1 ? g.c2 : Math.max(0, u.c - 1), hide: {} }; }); }
  function filterPop(c, anchorEl) {
    const s = S(), F = s.filter, u = used(s); const vals = new Map(); for (let r = F.r + 1; r < u.r; r++) { const v = show(val(r, c), s.fmt.get(K(r, c))); vals.set(v, (vals.get(v) || 0) + 1); }
    const hide = new Set(F.hide[c] || []); const list = [...vals.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const boxes = list.map(v => h("label", { class: "xs-fl" }, h("input", { type: "checkbox", value: v, checked: !hide.has(v) }), " " + (v === "" ? "(blank)" : v)));
    const all = h("input", { type: "checkbox", checked: !hide.size, onchange: e => boxes.forEach(b => { b.firstChild.checked = e.target.checked; }) });
    const d = h("dialog", { class: "wd-dlg xs-fpop", "aria-label": T("x_filter") },
      h("div", { class: "ed-tool" }, h("button", { type: "button", class: "btn small", onclick: () => { d.close(); d.remove(); sortBy(false, c, { r1: F.r + 1, r2: u.r - 1, c1: F.c1, c2: F.c2 }); } }, T("x_sort_az")), h("button", { type: "button", class: "btn small", onclick: () => { d.close(); d.remove(); sortBy(true, c, { r1: F.r + 1, r2: u.r - 1, c1: F.c1, c2: F.c2 }); } }, T("x_sort_za"))),
      h("label", { class: "xs-fl" }, all, " " + T("x_all")), h("div", { class: "xs-flist" }, ...boxes),
      h("div", { class: "ed-pk-act" }, h("button", { type: "button", class: "btn", onclick: () => { d.close(); d.remove(); } }, T("x_cancel")),
        h("button", { type: "button", class: "btn primary", id: "xs-fok", onclick: () => { const hs = new Set(boxes.filter(b => !b.firstChild.checked).map(b => b.firstChild.value)); d.close(); d.remove(); edit(() => { F.hide[c] = hs; }); } }, T("x_ok"))));
    document.body.append(d); d.showModal();
  }
  /* ---- round 2: notes, data validation, pivot tables, named ranges, remove duplicates ---- */
  const A1r = g => colName(g.c1) + (g.r1 + 1) + (g.r2 > g.r1 || g.c2 > g.c1 ? ":" + colName(g.c2) + (g.r2 + 1) : "");
  const qn = n => /^[A-Za-z_][A-Za-z0-9_]*$/.test(n) ? n : "'" + n.replace(/'/g, "''") + "'";
  function dlg(title, fields, onOk) {
    const d = h("dialog", { class: "wd-dlg", "aria-label": title }, h("h3", {}, title), ...fields.map(([l, el]) => h("label", { class: "xs-fl" }, h("span", {}, l + " "), el)),
      h("div", { class: "ed-pk-act" }, h("button", { type: "button", class: "btn", onclick: () => { d.close(); d.remove(); } }, T("x_cancel")),
        h("button", { type: "button", class: "btn primary", id: "xs-dlg-ok", onclick: () => { if (onOk() !== false) { d.close(); d.remove(); } } }, T("x_ok"))));
    document.body.append(d); d.showModal(); return d;
  }
  function setNote() { const s = S(), k = K(sel.r, sel.c); if (!s.notes) s.notes = new Map(); const t = prompt(T("x_noteq"), s.notes.get(k) || ""); if (t == null) return;
    edit(() => { if (t.trim()) s.notes.set(k, t.trim()); else s.notes.delete(k); }); }
  const dvAt = (s, r, c) => (s.dv || []).find(v => r >= v.r1 && r <= v.r2 && c >= v.c1 && c <= v.c2);
  function dvOk(rule, raw) { if (!rule || raw === "" || raw == null) return true; const t = String(raw);
    if (rule.type === "list") return rule.list.some(x => x.toLowerCase() === t.toLowerCase());
    const n = Number(t.replace(/[,₹\s]/g, "")); if (!isFinite(n)) return false; if (rule.type === "whole" && !Number.isInteger(n)) return false;
    return (rule.min === "" || rule.min == null || n >= +rule.min) && (rule.max === "" || rule.max == null || n <= +rule.max); }
  const dvText = v => v.type === "list" ? T("x_dv_list") + ": " + v.list.join(", ") : (v.type === "whole" ? T("x_dv_whole") : T("x_dv_dec")) + (v.min !== "" ? " ≥ " + v.min : "") + (v.max !== "" ? " ≤ " + v.max : "");
  function addValidation() {
    const g = R(); const ty = h("select", { id: "xs-dv-type" }, h("option", { value: "list" }, T("x_dv_list")), h("option", { value: "whole" }, T("x_dv_whole")), h("option", { value: "decimal" }, T("x_dv_dec")), h("option", { value: "none" }, T("x_dv_none")));
    const li = h("input", { id: "xs-dv-list", placeholder: "Yes, No", value: "" }), mn = h("input", { id: "xs-dv-min", type: "number" }), mx = h("input", { id: "xs-dv-max", type: "number" });
    dlg(T("x_dv") + " · " + A1r(g), [[T("x_dv_type"), ty], [T("x_dv_items"), li], [T("x_dv_min"), mn], [T("x_dv_max"), mx]], () => {
      const s = S(); edit(() => { s.dv = (s.dv || []).filter(v => v.r2 < g.r1 || v.r1 > g.r2 || v.c2 < g.c1 || v.c1 > g.c2);
        if (ty.value === "list") { const list = li.value.split(",").map(x => x.trim()).filter(Boolean); if (list.length) s.dv.push({ ...g, type: "list", list }); }
        else if (ty.value !== "none") s.dv.push({ ...g, type: ty.value, min: mn.value, max: mx.value }); }); });
  }
  function noteLine() { if (!noteBox) return; const s = S(), k = K(sel.r, sel.c); const n = s.notes && s.notes.get(k), v = dvAt(s, sel.r, sel.c); noteBox.textContent = "";
    if (n) noteBox.append(h("span", { id: "xs-note-text" }, "💬 " + n));
    if (v) { noteBox.append(h("span", { class: "muted" }, " ✔ " + dvText(v)));
      if (v.type === "list") { const cur = s.cells.get(k) || ""; noteBox.append(h("select", { id: "xs-dvpick", "aria-label": T("x_dv_list"), onchange: e => { if (e.target.value !== "") setCell(sel.r, sel.c, e.target.value); } }, h("option", { value: "" }, "▾"), ...v.list.map(x => h("option", { value: x, selected: x === cur }, x)))); } }
    noteBox.hidden = !n && !v; }
  function defineName() { const g = R(); const n = (prompt(T("x_nameq"), "") || "").trim(); if (!n) return; if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(n) || /^[A-Z]{1,3}\d+$/i.test(n)) { ED.st.excel.msg.textContent = T("x_namebad"); return; }
    edit(() => { book.names = book.names || {}; book.names[n] = qn(S().name) + "!$" + colName(g.c1) + "$" + (g.r1 + 1) + ":$" + colName(g.c2) + "$" + (g.r2 + 1); eng = xEngine(book); }); ED.st.excel.msg.textContent = T("x_named", n, A1r(g)); }
  function removeDup() { const g = region(), s = S(); let removed = 0; edit(() => { const seen = new Set(), keep = [];
      for (let r = g.r1 + 1; r <= g.r2; r++) { const row = []; for (let c = g.c1; c <= g.c2; c++) row.push(s.cells.get(K(r, c)) ?? ""); const key = JSON.stringify(row.map(x => String(x).trim().toLowerCase())); if (seen.has(key)) { removed++; continue; } seen.add(key); keep.push(row); }
      for (let r = g.r1 + 1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) putRaw(s, r, c, "");
      keep.forEach((row, i) => row.forEach((v, j) => putRaw(s, g.r1 + 1 + i, g.c1 + j, v))); });
    ED.st.excel.msg.textContent = T("x_dups", removed); }
  function pivot() {
    const g = region(), s = S(); if (g.r2 <= g.r1) { ED.st.excel.msg.textContent = T("x_chart_need"); return; }
    const heads = []; for (let c = g.c1; c <= g.c2; c++) heads.push([c, show(val(g.r1, c), s.fmt.get(K(g.r1, c))) || colName(c)]);
    const opt = (id, sel0) => h("select", { id }, ...heads.map(([c, t], i) => h("option", { value: String(c), selected: i === sel0 }, t)));
    const rowF = opt("xs-pv-row", 0), colF = h("select", { id: "xs-pv-col" }, h("option", { value: "" }, "—"), ...heads.map(([c, t]) => h("option", { value: String(c) }, t))), valF = opt("xs-pv-val", Math.min(1, heads.length - 1));
    const agg = h("select", { id: "xs-pv-agg" }, ...[["SUM", T("x_pv_sum")], ["COUNT", T("x_pv_count")], ["AVERAGE", T("x_pv_avg")], ["MAX", "Max"], ["MIN", "Min"]].map(([v, t]) => h("option", { value: v }, t)));
    dlg(T("x_pivot") + " · " + A1r(g), [[T("x_pv_rows"), rowF], [T("x_pv_cols"), colF], [T("x_pv_vals"), valF], [T("x_pv_agg"), agg]], () => {
      const rc = +rowF.value, cc = colF.value === "" ? null : +colF.value, vc = +valF.value, A = agg.value, src = qn(s.name) + "!";
      const rng = c => `${src}$${colName(c)}$${g.r1 + 2}:$${colName(c)}$${g.r2 + 1}`;
      const uniq = c => { const m = new Map(); for (let r = g.r1 + 1; r <= g.r2; r++) { const raw = s.cells.get(K(r, c)); if (raw == null || raw === "") continue; const v = val(r, c); const key = String(v); if (!m.has(key)) m.set(key, raw[0] === "=" ? (typeof v === "number" ? String(v) : String(v)) : raw); } return [...m.values()].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })); };
      const rows = uniq(rc), cols = cc == null ? [null] : uniq(cc);
      const crit = (c, ref) => `${rng(c)},${ref}`;
      const F = (rRef, cRef) => { const conds = [crit(rc, rRef)].concat(cRef ? [crit(cc, cRef)] : []);
        if (A === "SUM") return `=SUMIFS(${rng(vc)},${conds.join(",")})`; if (A === "COUNT") return `=COUNTIFS(${conds.join(",")})`; if (A === "AVERAGE") return `=IFERROR(AVERAGEIFS(${rng(vc)},${conds.join(",")}),"")`;
        return `=${A}IFS(${rng(vc)},${conds.join(",")})`; };
      let n = 1; while (book.sheets.some(x => x.name === "Pivot" + n)) n++; const ps = newSheet("Pivot" + n);
      const lbl = { SUM: T("x_pv_sum"), COUNT: T("x_pv_count"), AVERAGE: T("x_pv_avg"), MAX: "Max", MIN: "Min" }[A] + " — " + heads.find(x => x[0] === vc)[1];
      ps.cells.set(K(0, 0), lbl); ps.fmt.set(K(0, 0), { b: true });
      ps.cells.set(K(1, 0), heads.find(x => x[0] === rc)[1]); ps.fmt.set(K(1, 0), { b: true, bg: "#dde7f3" });
      cols.forEach((cv, j) => { ps.cells.set(K(1, 1 + j), cv == null ? lbl.split(" — ")[0] : String(cv)); ps.fmt.set(K(1, 1 + j), { b: true, bg: "#dde7f3" }); });
      const tc = 1 + cols.length; if (cols.length > 1) { ps.cells.set(K(1, tc), T("x_pv_total")); ps.fmt.set(K(1, tc), { b: true, bg: "#dde7f3" }); }
      rows.forEach((rv, i) => { const r = 2 + i; ps.cells.set(K(r, 0), String(rv)); cols.forEach((cv, j) => ps.cells.set(K(r, 1 + j), F(`$A${r + 1}`, cv == null ? null : `${colName(1 + j)}$2`)));
        if (cols.length > 1 && A !== "AVERAGE") ps.cells.set(K(r, tc), `=${A === "COUNT" || A === "SUM" ? "SUM" : A}(B${r + 1}:${colName(tc - 1)}${r + 1})`); });
      const tr = 2 + rows.length; ps.cells.set(K(tr, 0), T("x_pv_total")); ps.fmt.set(K(tr, 0), { b: true });
      if (A === "SUM" || A === "COUNT") for (let c = 1; c <= (cols.length > 1 ? tc : 1); c++) { ps.cells.set(K(tr, c), `=SUM(${colName(c)}3:${colName(c)}${tr})`); ps.fmt.set(K(tr, c), { b: true }); }
      ps.colW[0] = 140; edit(() => { book.sheets.splice(si + 1, 0, ps); si++; eng = xEngine(book); });
      ED.st.excel.msg.textContent = T("x_pv_done", ps.name, rows.length); });
  }
  /* insert / delete rows and columns (cells, formats, merges, widths and formulas all shift) */
  function structural(axis, d) {
    const s = S(), at = axis === "r" ? sel.r : sel.c;
    const remap = map => { const nm = new Map(); for (const [k, v] of map) { let [r, c] = k.split(",").map(Number); const p = axis === "r" ? r : c; if (d < 0 && p === at) continue; if (p >= at + (d < 0 ? 1 : 0)) { if (axis === "r") r += d; else c += d; } nm.set(K(r, c), v); } return nm; };
    const mv = x => x >= at + (d < 0 ? 1 : 0) ? x + d : x;
    edit(() => { s.cells = remap(s.cells); s.fmt = remap(s.fmt);
      s.merges = s.merges.map(m => axis === "r" ? { ...m, r1: mv(m.r1), r2: d < 0 && m.r2 === at && m.r1 !== at ? m.r2 - 1 : mv(m.r2) } : { ...m, c1: mv(m.c1), c2: d < 0 && m.c2 === at && m.c1 !== at ? m.c2 - 1 : mv(m.c2) }).filter(m => m.r2 >= m.r1 && m.c2 >= m.c1 && (m.r2 > m.r1 || m.c2 > m.c1));
      if (axis === "c") { if (d > 0) s.colW.splice(at, 0, undefined); else s.colW.splice(at, 1); s.nc = Math.max(1, s.nc + d); } else s.nr = Math.max(1, s.nr + d);
      book.sheets.forEach((sh, i) => { for (const [k, v] of sh.cells) if (v && v[0] === "=") sh.cells.set(k, shiftRefs(v, i === si, s.name, axis, at, d)); }); });
  }
  function delSpan(axis) {
    const g = R();
    const n = axis === "r" ? (g.r2 - g.r1 + 1) : (g.c2 - g.c1 + 1);
    const at = axis === "r" ? g.r1 : g.c1;
    for (let i = 0; i < Math.min(n, 200); i++) {
      if (axis === "r") { sel = { r: at, c: 0 }; anc = { r: at, c: 0 }; }
      else { sel = { r: 0, c: at }; anc = { r: 0, c: at }; }
      structural(axis, -1);
    }
  }
  /* sheets */
  const uniq = base => { let n = base, k = 2; while (book.sheets.some(s => s.name.toLowerCase() === n.toLowerCase())) n = base.replace(/ \(\d+\)$/, "") + ` (${k++})`; return n.slice(0, 31); };
  function addSheet() { let n = book.sheets.length + 1; while (book.sheets.some(s => s.name === "Sheet" + n)) n++; edit(() => { book.sheets.splice(si + 1, 0, newSheet("Sheet" + n)); si++; sel = { r: 0, c: 0 }; anc = { ...sel }; }); }
  function dupSheet() { edit(() => { const c = structuredClone(S()); c.name = uniq(S().name + " (2)"); book.sheets.splice(si + 1, 0, c); si++; }); }
  function moveSheet(d) { const j = si + d; if (j < 0 || j >= book.sheets.length) return; edit(() => { const [x] = book.sheets.splice(si, 1); book.sheets.splice(j, 0, x); si = j; }); }
  function renameSheet(i = si) {
    const old = book.sheets[i].name; const n = (prompt(T("sheetname"), old) || "").trim().slice(0, 31);
    if (!n || n === old || /[\\\/?*\[\]:]/.test(n) || book.sheets.some((s, j) => j !== i && s.name.toLowerCase() === n.toLowerCase())) return;
    const q = x => /^[A-Za-z_][\w.]*$/.test(x) ? x : "'" + x + "'"; const re = new RegExp("(^|[^\\w'])(" + ("'" + old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "'|" + old.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) + ")!", "gi");
    edit(() => { book.sheets[i].name = n; for (const sh of book.sheets) for (const [k, v] of sh.cells) if (v && v[0] === "=") sh.cells.set(k, v.split(/("(?:[^"]|"")*")/).map((p, j) => j % 2 ? p : p.replace(re, (m, a) => a + q(n) + "!")).join("")); });
  }
  function delSheet() { if (book.sheets.length < 2) return; if (!confirm(T("delsheet") + ": " + S().name + "?")) return; edit(() => { book.sheets.splice(si, 1); si = Math.max(0, si - 1); sel = { r: 0, c: 0 }; anc = { ...sel }; }); }
  let dragTab = null;
  function drawTabs() {
    tabs.innerHTML = "";
    book.sheets.forEach((sh, i) => tabs.append(h("button", { type: "button", class: "xs-tab", role: "tab", draggable: "true", "aria-selected": String(i === si), "data-si": i, title: T("rensheet"),
      onclick: () => { if (i === si) return; if (editing) commit(0, 0); si = i; sel = { r: 0, c: 0 }; anc = { ...sel }; render(); }, ondblclick: () => renameSheet(i),
      ondragstart: e => { dragTab = i; e.dataTransfer.effectAllowed = "move"; }, ondragover: e => e.preventDefault(),
      ondrop: e => { e.preventDefault(); if (dragTab == null || dragTab === i) return; const from = dragTab; dragTab = null; edit(() => { const cur = book.sheets[si]; const [x] = book.sheets.splice(from, 1); book.sheets.splice(i, 0, x); si = book.sheets.indexOf(cur); }); } }, sh.name)));
    const B = (id, t, l, fn) => h("button", { type: "button", class: "btn small", id, title: t, "aria-label": t, onclick: fn }, l);
    tabs.append(B("xs-addsheet", T("addsheet"), T("addsheet"), addSheet), B("xs-dupsheet", T("x_dup"), "⧉", dupSheet), B("xs-mvl", T("x_left"), "◀", () => moveSheet(-1)), B("xs-mvr", T("x_right"), "▶", () => moveSheet(1)),
      B("xs-rensheet", T("x_ren"), "✎", () => renameSheet()), B("xs-delsheet2", T("delsheet"), "🗑", delSheet));
  }
  /* find & replace */
  function findNext(q, rep, all) {
    const s = S(), u = used(s); if (!q) return 0; const lq = q.toLowerCase(); let n = 0;
    if (all) { edit(() => { for (const [k, raw] of [...s.cells]) { if (raw.toLowerCase().includes(lq)) { const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); s.cells.set(k, raw.replace(re, () => { n++; return rep; })); } } }); return n; }
    const total = u.r * u.c; let r = sel.r, c = sel.c;
    for (let k = 0; k < total; k++) { c++; if (c >= u.c) { c = 0; r++; if (r >= u.r) r = 0; } const raw = s.cells.get(K(r, c)) || ""; const disp = show(val(r, c), s.fmt.get(K(r, c)));
      if (raw.toLowerCase().includes(lq) || disp.toLowerCase().includes(lq)) { sel = { r, c }; anc = { ...sel }; paintSel(); return 1; } }
    return 0;
  }
  /* AutoSum */
  function autoSum() { const g = R(), s = S();
    if (g.r1 === g.r2 && g.c1 === g.c2) { let r = sel.r - 1; while (r >= 0 && typeof val(r, sel.c) === "number") r--; if (r === sel.r - 1) { let c = sel.c - 1; while (c >= 0 && typeof val(sel.r, c) === "number") c--; if (c === sel.c - 1) { fx.value = "=SUM()"; editing = true; fx.focus(); fx.setSelectionRange(5, 5); return; } setCell(sel.r, sel.c, `=SUM(${colName(c + 1)}${sel.r + 1}:${colName(sel.c - 1)}${sel.r + 1})`); return; }
      setCell(sel.r, sel.c, `=SUM(${colName(sel.c)}${r + 2}:${colName(sel.c)}${sel.r})`); return; }
    edit(() => { for (let c = g.c1; c <= g.c2; c++) putRaw(s, g.r2 + 1, c, `=SUM(${colName(c)}${g.r1 + 1}:${colName(c)}${g.r2 + 1})`); }); }
  /* conditional highlight */
  function addRule() { const t = (prompt(T("x_cf_ask"), ">1000") || "").trim(); if (!t) return; const m = /^(>=|<=|<>|>|<|=)?\s*(.*)$/.exec(t); const g = R(); const u = used(S());
    const rg = g.r1 === g.r2 && g.c1 === g.c2 ? { r1: 0, c1: g.c1, r2: Math.max(0, u.r - 1), c2: g.c1 } : g;
    edit(() => { (S().cf = S().cf || []).push({ ...rg, op: m[1] || "=", val: m[2], bg: "#ffc7ce", fg: "#9c0006" }); }); }
  /* charts (drawn on canvas; kept with the sheet while editing; download as PNG) */
  const PAL = ["#2563eb", "#f97316", "#16a34a", "#dc2626", "#9333ea", "#0891b2", "#ca8a04", "#db2777"];
  function chartData(ch) { const s = book.sheets[ch.si ?? si] || S(); const { r1, c1, r2, c2 } = ch; const head = c2 > c1 && typeof val(r1, c1 + 1, book.sheets.indexOf(s)) === "string";
    const ix = book.sheets.indexOf(s); const rows = []; for (let r = head ? r1 + 1 : r1; r <= r2; r++) rows.push(r);
    const series = []; for (let c = c1 + (c2 > c1 ? 1 : 0); c <= c2; c++) series.push({ name: head ? String(val(r1, c, ix)) : colName(c), vals: rows.map(r => { const v = val(r, c, ix); return typeof v === "number" ? v : 0; }) });
    return { head, labels: rows.map(r => c2 > c1 ? show(val(r, c1, ix), s.fmt.get(K(r, c1))) : String(r + 1)), series }; }
  function drawChart(cv, ch) {
    const g = cv.getContext("2d"), W = cv.width, H = cv.height, d = chartData(ch); g.clearRect(0, 0, W, H); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.font = "13px Calibri, Carlito, 'Noto Sans Bengali', sans-serif"; g.fillStyle = "#111";
    g.textAlign = "center"; g.font = "bold 15px Calibri, Carlito, 'Noto Sans Bengali', sans-serif"; g.fillText(ch.title || "", W / 2, 20); g.font = "12px Calibri, Carlito, 'Noto Sans Bengali', sans-serif";
    if (ch.type === "pie") { const v = d.series[0] ? d.series[0].vals.map(x => Math.max(0, x)) : []; const tot = v.reduce((a, b) => a + b, 0) || 1; let a0 = -Math.PI / 2; const cx = W * 0.38, cy = H / 2 + 10, rad = Math.min(W, H) / 2 - 40;
      v.forEach((x, i) => { const a1 = a0 + x / tot * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, rad, a0, a1); g.closePath(); g.fillStyle = PAL[i % PAL.length]; g.fill(); g.strokeStyle = "#fff"; g.stroke(); a0 = a1; });
      g.textAlign = "left"; d.labels.forEach((l, i) => { g.fillStyle = PAL[i % PAL.length]; g.fillRect(W * 0.72, 40 + i * 20, 12, 12); g.fillStyle = "#111"; g.fillText(`${l} (${Math.round(v[i] / tot * 100)}%)`, W * 0.72 + 18, 50 + i * 20); }); return; }
    const all = d.series.flatMap(s => s.vals); let mx = Math.max(0, ...all), mn = Math.min(0, ...all); if (mx === mn) mx = mn + 1;
    const L = 60, Rr = W - 130, T0 = 34, B0 = H - 40; const n = d.labels.length || 1, hb = ch.type === "hbar";
    const pos = v => hb ? L + (v - mn) / (mx - mn) * (Rr - L) : B0 - (v - mn) / (mx - mn) * (B0 - T0);
    g.strokeStyle = "#ddd"; g.fillStyle = "#555"; g.textAlign = hb ? "center" : "right";
    for (let k = 0; k <= 5; k++) { const v = mn + (mx - mn) * k / 5, p = pos(v); g.beginPath(); if (hb) { g.moveTo(p, T0); g.lineTo(p, B0); } else { g.moveTo(L, p); g.lineTo(Rr, p); } g.stroke(); const lab = Math.abs(v) >= 1e5 ? (v / 1e5).toFixed(1) + "L" : String(+v.toPrecision(4)); if (hb) g.fillText(lab, p, B0 + 14); else g.fillText(lab, L - 6, p + 4); }
    const band = (hb ? B0 - T0 : Rr - L) / n, sw = band * 0.7 / Math.max(1, d.series.length);
    d.series.forEach((s, j) => { g.fillStyle = g.strokeStyle = PAL[j % PAL.length]; g.lineWidth = 2;
      if (ch.type === "line") { g.beginPath(); s.vals.forEach((v, i) => { const x = L + band * (i + 0.5), y = pos(v); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); s.vals.forEach((v, i) => { g.beginPath(); g.arc(L + band * (i + 0.5), pos(v), 3, 0, 7); g.fill(); }); }
      else s.vals.forEach((v, i) => { const o = band * 0.15 + sw * j + band * i; if (hb) { const x0 = pos(Math.max(mn, 0)); g.fillRect(Math.min(x0, pos(v)), T0 + o, Math.abs(pos(v) - x0), sw - 1); } else { const y0 = pos(Math.max(mn, 0)); g.fillRect(L + o, Math.min(y0, pos(v)), sw - 1, Math.abs(pos(v) - y0)); } }); });
    g.fillStyle = "#333"; g.textAlign = hb ? "right" : "center"; d.labels.forEach((l, i) => { const t = l.length > 12 ? l.slice(0, 11) + "…" : l; if (hb) g.fillText(t, L - 4, T0 + band * (i + 0.5) + 4); else g.fillText(t, L + band * (i + 0.5), B0 + 14); });
    g.textAlign = "left"; d.series.forEach((s, j) => { g.fillStyle = PAL[j % PAL.length]; g.fillRect(Rr + 14, 40 + j * 20, 12, 12); g.fillStyle = "#111"; g.fillText(s.name.slice(0, 16), Rr + 30, 50 + j * 20); });
  }
  function addChart(type) { const g = R(); if (g.r1 === g.r2 && g.c1 === g.c2) { ED.st.excel.msg.textContent = T("x_chart_need"); return; }
    const head = g.c2 > g.c1 && typeof val(g.r1, g.c1 + 1) === "string"; edit(() => { S().charts.push({ type, ...g, title: head && g.c2 === g.c1 + 1 ? String(val(g.r1, g.c1 + 1)) : S().name }); }); ED.st.excel.msg.textContent = T("x_tbl_hint"); }
  function drawCharts() { charts.innerHTML = ""; S().charts.forEach((ch, i) => { const cv = h("canvas", { width: "560", height: "300", class: "xs-chart", "data-chart": ch.type, "aria-label": T("x_chart") + " " + (ch.title || "") });
    drawChart(cv, ch); charts.append(h("figure", { class: "xs-chartbox" }, cv, h("figcaption", {}, h("button", { type: "button", class: "btn small", onclick: () => { const a = h("a", { href: cv.toDataURL("image/png"), download: (ch.title || "chart").replace(/[\\/:*?"<>|]/g, "_") + ".png" }); document.body.append(a); a.click(); a.remove(); } }, "⬇ " + T("x_chart_dl")),
      h("button", { type: "button", class: "btn small", onclick: () => edit(() => S().charts.splice(i, 1)) }, "✕ " + T("x_chart_rm"))))); }); }
  /* print the used range */
  function printSheet() { const s = S(), u = used(s); eng.reset(); const cover = new Set(), span = new Map(); for (const m of s.merges) { span.set(K(m.r1, m.c1), m); for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) if (r !== m.r1 || c !== m.c1) cover.add(K(r, c)); }
    const hid = hiddenRows(s); let x = ""; for (let r = 0; r < u.r; r++) { if (hid.has(r)) continue; x += "<tr>"; for (let c = 0; c < u.c; c++) { const k = K(r, c); if (cover.has(k)) continue; const m = span.get(k); const f = s.fmt.get(k); const v = val(r, c); x += `<td${m ? ` rowspan="${m.r2 - m.r1 + 1}" colspan="${m.c2 - m.c1 + 1}"` : ""} style="${esc(cssOf(f) + (typeof v === "number" && !(f && f.al) ? "text-align:right;" : ""))}">${esc(show(v, f))}</td>`; } x += "</tr>"; }
    const imgs = [...charts.querySelectorAll("canvas")].map(c => `<p><img src="${c.toDataURL()}" style="max-width:100%"></p>`).join("");
    const fr = h("iframe", { style: "position:fixed;width:0;height:0;border:0" }); document.body.append(fr);
    fr.contentDocument.write(`<!doctype html><title>${esc(s.name)}</title><style>@page{size:A4 landscape;margin:12mm}body{font:11pt Calibri,Carlito,'Noto Sans Bengali',sans-serif}table{border-collapse:collapse}td{border:1px solid #bbb;padding:2px 6px;white-space:nowrap}</style><h3>${esc(s.name)}</h3><table>${x}</table>${imgs}`); fr.contentDocument.close();
    setTimeout(() => { fr.contentWindow.focus(); fr.contentWindow.print(); setTimeout(() => fr.remove(), 1500); }, 300); }
  /* ---------- xlsx formatting: our own styles.xml reader and writer (the free SheetJS build skips styles) ---------- */
  const BUILTIN = { 0: "General", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 11: "0.00E+00", 12: "# ?/?", 14: "dd-mm-yyyy", 15: "d-mmm-yy", 16: "d-mmm", 17: "mmm-yy", 18: "h:mm AM/PM", 19: "h:mm:ss AM/PM", 20: "h:mm", 21: "h:mm:ss", 22: "dd-mm-yyyy h:mm", 37: "#,##0 ;(#,##0)", 38: "#,##0 ;[Red](#,##0)", 39: "#,##0.00;(#,##0.00)", 40: "#,##0.00;[Red](#,##0.00)", 45: "mm:ss", 46: "[h]:mm:ss", 47: "mmss.0", 48: "##0.0E+0", 49: "@" };
  const els = (n, t) => n ? [...n.getElementsByTagNameNS("*", t)] : [];
  const kid = (n, t) => n ? [...n.children].find(c => c.localName === t) : null;
  const THEMEC = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];
  const tintC = (hex, t) => "#" + [0, 2, 4].map(i => { let x = parseInt(hex.slice(i, i + 2), 16); x = t < 0 ? x * (1 + t) : x + (255 - x) * t; return Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0"); }).join("").toUpperCase();
  const rgb = n => { const th = n && n.getAttribute("theme"); if (th != null && !n.getAttribute("rgb") && THEMEC[+th]) return tintC(THEMEC[+th], +(n.getAttribute("tint") || 0)); const v = n && n.getAttribute("rgb"); return v && /^[0-9a-f]{8}$/i.test(v) ? "#" + v.slice(2).toUpperCase() : v && /^[0-9a-f]{6}$/i.test(v) ? "#" + v.toUpperCase() : null; };
  const onAttr = n => n && n.getAttribute("val") !== "0" && n.getAttribute("val") !== "false";
  async function readStyles(buf) {
    await load("jszip"); const z = await JSZip.loadAsync(buf); const P = s => new DOMParser().parseFromString(s, "application/xml"); const out = {};
    const sx = z.file("xl/styles.xml") ? P(await z.file("xl/styles.xml").async("string")) : null;
    const nf = { ...BUILTIN }; for (const n of els(sx, "numFmt")) nf[n.getAttribute("numFmtId")] = n.getAttribute("formatCode");
    const fonts = els(kid(sx && sx.documentElement, "fonts"), "font").map(f => ({ b: onAttr(kid(f, "b")), i: onAttr(kid(f, "i")), u: !!kid(f, "u") && kid(f, "u").getAttribute("val") !== "none", s: onAttr(kid(f, "strike")), sz: kid(f, "sz") ? +kid(f, "sz").getAttribute("val") : 11, font: kid(f, "name") ? kid(f, "name").getAttribute("val") : "Calibri", color: rgb(kid(f, "color")) }));
    const fills = els(kid(sx && sx.documentElement, "fills"), "fill").map(f => { const p = kid(f, "patternFill"); return p && p.getAttribute("patternType") === "solid" ? rgb(kid(p, "fgColor")) : null; });
    const bds = els(kid(sx && sx.documentElement, "borders"), "border").map(b => { const o = {}; for (const [t, k] of [["top", "t"], ["bottom", "b"], ["left", "l"], ["right", "r"]]) { const e = kid(b, t); if (e && e.getAttribute("style") && e.getAttribute("style") !== "none") o[k] = 1; } return Object.keys(o).length ? o : null; });
    const f0 = fonts[0] || { font: "Calibri", sz: 11 };
    const xfs = els(kid(sx && sx.documentElement, "cellXfs"), "xf").map(x => { const f = {}; const ft = fonts[+x.getAttribute("fontId") || 0];
      if (ft) { for (const k of ["b", "i", "u", "s"]) if (ft[k]) f[k] = true; if (ft.font && ft.font !== f0.font) f.font = ft.font; if (ft.sz && ft.sz !== f0.sz) f.sz = ft.sz; if (ft.color && ft.color !== "#000000") f.color = ft.color; }
      const bg = fills[+x.getAttribute("fillId") || 0]; if (bg) f.bg = bg; const bd = bds[+x.getAttribute("borderId") || 0]; if (bd) f.bd = bd;
      const code = nf[x.getAttribute("numFmtId") || "0"]; if (code && code !== "General") f.nf = code;
      const al = kid(x, "alignment"); if (al) { const hz = al.getAttribute("horizontal"); if (/^(left|center|right)$/.test(hz)) f.al = hz; if (onAttr(al) && al.getAttribute("wrapText") && al.getAttribute("wrapText") !== "0") f.wrap = true; }
      return Object.keys(f).length ? f : null; });
    out.defFont = f0.font; out.defSize = f0.sz;
    const wb = z.file("xl/workbook.xml") ? P(await z.file("xl/workbook.xml").async("string")) : null; const rels = z.file("xl/_rels/workbook.xml.rels") ? P(await z.file("xl/_rels/workbook.xml.rels").async("string")) : null;
    const tgt = {}; for (const r of els(rels, "Relationship")) tgt[r.getAttribute("Id")] = r.getAttribute("Target");
    out.sheets = {};
    for (const sh of els(wb, "sheet")) { const id = sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || sh.getAttribute("r:id"); let t = tgt[id]; if (!t) continue; t = t.replace(/^\/?xl\//, "").replace(/^\//, ""); const f = z.file("xl/" + t); if (!f) continue;
      const x = P(await f.async("string")); const cells = new Map(); for (const c of els(x, "c")) { const s = c.getAttribute("s"); if (s && xfs[+s]) { const d = XLSX.utils.decode_cell(c.getAttribute("r")); cells.set(d.r + "," + d.c, xfs[+s]); } }
      const pane = els(x, "pane")[0]; const frz = pane && pane.getAttribute("state") !== "split" ? { r: Math.round(+pane.getAttribute("ySplit") || 0), c: Math.round(+pane.getAttribute("xSplit") || 0) } : { r: 0, c: 0 };
      const rowH = []; for (const r of els(x, "row")) if (r.getAttribute("customHeight") === "1" && r.getAttribute("ht")) rowH[+r.getAttribute("r") - 1] = Math.round(+r.getAttribute("ht") * 4 / 3);
      const dv = []; for (const v of els(x, "dataValidation")) { const ty = v.getAttribute("type"); if (!/^(list|whole|decimal)$/.test(ty || "")) continue; const f1 = (els(v, "formula1")[0] || {}).textContent || "", f2 = (els(v, "formula2")[0] || {}).textContent || "", op = v.getAttribute("operator") || "between";
        for (const ref of (v.getAttribute("sqref") || "").split(/\s+/).filter(Boolean)) { const g = XLSX.utils.decode_range(ref); const base = { r1: g.s.r, c1: g.s.c, r2: g.e.r, c2: g.e.c };
          if (ty === "list") { if (/^".*"$/.test(f1)) dv.push({ ...base, type: "list", list: f1.slice(1, -1).split(",").map(z => z.trim()) }); }
          else dv.push({ ...base, type: ty, min: op === "lessThanOrEqual" || op === "lessThan" ? "" : f1, max: op === "between" ? f2 : op === "lessThanOrEqual" || op === "lessThan" ? f1 : "" }); } }
      const charts = await readCharts(z, "xl/" + t, P);
      out.sheets[sh.getAttribute("name")] = { cells, frz, rowH, dv, charts }; }
    return out;
  }
  /* charts inside the .xlsx (DrawingML): written on save, read back on open */
  const relsOf = p => p.replace(/([^/]+)$/, "_rels/$1.rels");
  const relPath = (base, t) => { if (t[0] === "/") return t.slice(1); const a = base.split("/"); a.pop(); for (const x of t.split("/")) { if (x === "..") a.pop(); else if (x !== ".") a.push(x); } return a.join("/"); };
  async function readCharts(z, sp, P) {
    const out = []; try {
      const rf = z.file(relsOf(sp)); if (!rf) return out; const rels = P(await rf.async("string"));
      for (const r of els(rels, "Relationship")) { if (!/\/drawing$/.test(r.getAttribute("Type") || "")) continue; const dp = relPath(sp, r.getAttribute("Target")); const df = z.file(dp), drf = z.file(relsOf(dp)); if (!df || !drf) continue;
        const dr = P(await drf.async("string")), map = {}; for (const x of els(dr, "Relationship")) map[x.getAttribute("Id")] = relPath(dp, x.getAttribute("Target"));
        for (const c of els(P(await df.async("string")), "chart")) { const id = c.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || c.getAttribute("r:id"); const cf = z.file(map[id] || ""); if (!cf) continue;
          const x = P(await cf.async("string")); const plot = els(x, "plotArea")[0]; if (!plot) continue; const kind = [...plot.children].find(n => /Chart$/.test(n.localName)); if (!kind) continue;
          const dir = (els(kind, "barDir")[0] || { getAttribute: () => "col" }).getAttribute("val");
          const type = kind.localName === "pieChart" || kind.localName === "doughnutChart" ? "pie" : kind.localName === "lineChart" ? "line" : dir === "bar" ? "hbar" : "bar";
          const fs = [...els(kind, "cat"), ...els(kind, "val"), ...els(kind, "tx")].map(n => (els(n, "f")[0] || {}).textContent).filter(Boolean);
          let r1 = 1e9, c1 = 1e9, r2 = -1, c2 = -1; for (const f of fs) { const ref = f.replace(/^.*!/, "").replace(/\$/g, ""); try { const g = XLSX.utils.decode_range(ref); r1 = Math.min(r1, g.s.r); c1 = Math.min(c1, g.s.c); r2 = Math.max(r2, g.e.r); c2 = Math.max(c2, g.e.c); } catch (e) { /* skip */ } }
          if (r2 < 0) continue; const tt = els(els(x, "title")[0], "t").map(n => n.textContent).join("");
          out.push({ type, r1, c1, r2, c2, title: tt }); } }
    } catch (e) { console.warn("xlsx charts", e); } return out;
  }
  function chartXml(ch, sn) {
    const d = chartData(ch), q = "'" + sn.replace(/'/g, "''") + "'!", A = (r, c) => "$" + colName(c) + "$" + (r + 1);
    const head = d.head, r0 = head ? ch.r1 + 1 : ch.r1, cat = ch.c2 > ch.c1 ? `<c:cat><c:strRef><c:f>${XA(q + A(r0, ch.c1) + ":" + A(ch.r2, ch.c1))}</c:f><c:strCache><c:ptCount val="${d.labels.length}"/>${d.labels.map((l, i) => `<c:pt idx="${i}"><c:v>${XA(l)}</c:v></c:pt>`).join("")}</c:strCache></c:strRef></c:cat>` : "";
    const c0 = ch.c1 + (ch.c2 > ch.c1 ? 1 : 0), list = ch.type === "pie" ? d.series.slice(0, 1) : d.series;
    const ser = list.map((s, j) => `<c:ser><c:idx val="${j}"/><c:order val="${j}"/>${head ? `<c:tx><c:strRef><c:f>${XA(q + A(ch.r1, c0 + j))}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${XA(s.name)}</c:v></c:pt></c:strCache></c:strRef></c:tx>` : ""}`
      + (ch.type === "pie" ? "" : `<c:spPr>${ch.type === "line" ? `<a:ln w="28575"><a:solidFill><a:srgbClr val="${PAL[j % PAL.length].slice(1)}"/></a:solidFill></a:ln>` : `<a:solidFill><a:srgbClr val="${PAL[j % PAL.length].slice(1)}"/></a:solidFill>`}</c:spPr>`)
      + (ch.type === "line" ? '<c:marker><c:symbol val="circle"/></c:marker>' : "") + cat
      + `<c:val><c:numRef><c:f>${XA(q + A(r0, c0 + j) + ":" + A(ch.r2, c0 + j))}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${s.vals.length}"/>${s.vals.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join("")}</c:numCache></c:numRef></c:val>${ch.type === "line" ? '<c:smooth val="0"/>' : ""}</c:ser>`).join("");
    const ax = '<c:axId val="111"/><c:axId val="222"/>', axes = '<c:catAx><c:axId val="111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="' + (ch.type === "hbar" ? "l" : "b") + '"/><c:crossAx val="222"/></c:catAx><c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="' + (ch.type === "hbar" ? "b" : "l") + '"/><c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="1"/><c:crossAx val="111"/></c:valAx>';
    const plot = ch.type === "pie" ? `<c:pieChart><c:varyColors val="1"/>${ser}<c:firstSliceAng val="0"/></c:pieChart>` : ch.type === "line" ? `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}<c:marker val="1"/>${ax}</c:lineChart>${axes}`
      : `<c:barChart><c:barDir val="${ch.type === "hbar" ? "bar" : "col"}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}<c:gapWidth val="150"/>${ax}</c:barChart>${axes}`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:chart>${ch.title ? `<c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>${XA(ch.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>` : '<c:autoTitleDeleted val="1"/>'}<c:plotArea><c:layout/>${plot}</c:plotArea><c:legend><c:legendPos val="r"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>`;
  }
  async function writeCharts(z) { // one drawing per sheet with charts; anchored below / right of the data
    let n = 0, ct = await z.file("[Content_Types].xml").async("string"); const add = [];
    for (let i = 0; i < book.sheets.length; i++) { const s = book.sheets[i]; if (!s.charts || !s.charts.length) continue; const sp = `xl/worksheets/sheet${i + 1}.xml`; if (!z.file(sp)) continue;
      const di = i + 1; let anchors = "", drels = "";
      s.charts.forEach((ch, j) => { n++; const col = Math.max(...s.charts.map(c => c.c2)) + 2, row = j * 16;
        z.file(`xl/charts/chart${n}.xml`, chartXml({ ...ch, si: i }, s.name)); add.push(`<Override PartName="/xl/charts/chart${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
        drels += `<Relationship Id="rId${j + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${n}.xml"/>`;
        anchors += `<xdr:twoCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${col + 8}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 15}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${j + 2}" name="Chart ${j + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${j + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`; });
      z.file(`xl/drawings/drawing${di}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors}</xdr:wsDr>`);
      z.file(`xl/drawings/_rels/drawing${di}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drels}</Relationships>`);
      add.push(`<Override PartName="/xl/drawings/drawing${di}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
      const rp = relsOf(sp); let rx = z.file(rp) ? await z.file(rp).async("string") : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
      rx = rx.replace("</Relationships>", `<Relationship Id="rIdDr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${di}.xml"/></Relationships>`); z.file(rp, rx);
      let x = await z.file(sp).async("string"); if (!/xmlns:r=/.test(x.slice(0, 600))) x = x.replace("<worksheet ", '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
      const at = x.search(/<legacyDrawing|<tableParts|<extLst|<\/worksheet>/); x = x.slice(0, at) + '<drawing r:id="rIdDr1"/>' + x.slice(at); z.file(sp, x); }
    if (add.length) z.file("[Content_Types].xml", ct.replace("</Types>", add.join("") + "</Types>"));
  }
  const NFID = { General: 0, "0": 1, "0.00": 2, "#,##0": 3, "#,##0.00": 4, "0%": 9, "0.00%": 10, "@": 49 };
  const XA = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const ARGB = c => "FF" + String(c || "#000000").replace("#", "").toUpperCase().padStart(6, "0");
  function writeStyles() {
    const fonts = ['<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>'], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'],
      borders = ["<border><left/><right/><top/><bottom/><diagonal/></border>"], numFmts = [], xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], dxfs = [];
    const ix = new Map(), fi = new Map(), fl = new Map(), bi = new Map(), ni = new Map(); let nfNext = 164;
    const idOf = (map, arr, key, xml) => { if (map.has(key)) return map.get(key); arr.push(xml); map.set(key, arr.length - 1); return arr.length - 1; };
    function xfOf(f) { const key = JSON.stringify(f); if (ix.has(key)) return ix.get(key);
      const fk = { b: f.b, i: f.i, u: f.u, s: f.s, font: f.font, sz: f.sz, color: f.color }; const hasF = Object.values(fk).some(Boolean);
      const fontId = hasF ? idOf(fi, fonts, JSON.stringify(fk), `<font>${f.b ? "<b/>" : ""}${f.i ? "<i/>" : ""}${f.s ? "<strike/>" : ""}${f.u ? "<u/>" : ""}<sz val="${f.sz || 11}"/>${f.color ? `<color rgb="${ARGB(f.color)}"/>` : '<color theme="1"/>'}<name val="${XA(f.font || "Calibri")}"/><family val="2"/></font>`) : 0;
      const fillId = f.bg ? idOf(fl, fills, f.bg, `<fill><patternFill patternType="solid"><fgColor rgb="${ARGB(f.bg)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
      const borderId = f.bd ? idOf(bi, borders, JSON.stringify(f.bd), `<border>${[["left", "l"], ["right", "r"], ["top", "t"], ["bottom", "b"]].map(([t, k]) => f.bd[k] ? `<${t} style="thin"><color auto="1"/></${t}>` : `<${t}/>`).join("")}<diagonal/></border>`) : 0;
      let numFmtId = 0; if (f.nf) { if (NFID[f.nf] != null) numFmtId = NFID[f.nf]; else { if (!ni.has(f.nf)) { ni.set(f.nf, nfNext); numFmts.push(`<numFmt numFmtId="${nfNext}" formatCode="${XA(f.nf)}"/>`); nfNext++; } numFmtId = ni.get(f.nf); } }
      const al = f.al || f.wrap ? `<alignment${f.al ? ` horizontal="${f.al}"` : ""}${f.wrap ? ' wrapText="1"' : ""} vertical="${f.wrap ? "top" : "bottom"}"/>` : "";
      xfs.push(`<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"${numFmtId ? ' applyNumberFormat="1"' : ""}${fontId ? ' applyFont="1"' : ""}${fillId ? ' applyFill="1"' : ""}${borderId ? ' applyBorder="1"' : ""}${al ? ' applyAlignment="1">' + al + "</xf>" : "/>"}`);
      ix.set(key, xfs.length - 1); return xfs.length - 1; }
    const dxfOf = rule => { dxfs.push(`<dxf><font><color rgb="${ARGB(rule.fg || "#9c0006")}"/></font><fill><patternFill><bgColor rgb="${ARGB(rule.bg)}"/></patternFill></fill></dxf>`); return dxfs.length - 1; };
    const xml = () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.join("")}</numFmts>` : ""}<fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="${borders.length}">${borders.join("")}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="${dxfs.length}">${dxfs.join("")}</dxfs><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
    return { xfOf, dxfOf, xml };
  }
  const OPS = { ">": "greaterThan", "<": "lessThan", ">=": "greaterThanOrEqual", "<=": "lessThanOrEqual", "=": "equal", "<>": "notEqual" };
  /* ---------- toolbar and events ---------- */
  const FONTLIST = ["Calibri", "Arial", "Times New Roman", "Cambria", "Georgia", "Verdana", "Courier New", "Noto Sans Bengali", "Noto Serif Bengali", "Kalpurush", "SolaimanLipi"];
  const FUNCS = ["SUM", "AVERAGE", "COUNT", "COUNTA", "MIN", "MAX", "ROUND", "IF", "IFERROR", "VLOOKUP", "HLOOKUP", "XLOOKUP", "INDEX", "MATCH", "SUMIF", "SUMIFS", "COUNTIF", "COUNTIFS", "AVERAGEIF", "TEXT", "DATE", "TODAY", "YEAR", "MONTH", "DAY", "DATEDIF", "NETWORKDAYS", "LEFT", "RIGHT", "MID", "LEN", "TRIM", "UPPER", "LOWER", "PROPER", "CONCAT", "TEXTJOIN", "SUBSTITUTE", "FIND", "SUMPRODUCT", "MEDIAN", "LARGE", "SMALL", "RANK", "ABS", "INT", "MOD"];
  const btn = (id, label, title, fn, extra = {}) => h("button", { type: "button", class: "wd-b", id, title, "aria-label": title, onmousedown: e => e.preventDefault(), onclick: fn, ...extra }, label);
  const selEl = (id, title, opts, fn) => { const s = h("select", { id, title, "aria-label": title, class: "wd-sel" }, ...opts.map(([v, l]) => h("option", { value: v }, l))); s.addEventListener("change", () => fn(s.value, s)); return s; };
  function selectAll() { const s = S(), u = used(s); anc = { r: 0, c: 0 }; sel = { r: Math.max(0, u.r - 1), c: Math.max(0, u.c - 1) }; paintSel(false); }
  function cellAt(e) { const el = document.elementFromPoint(e.clientX, e.clientY); const td = el && el.closest && el.closest("#xs-grid td[data-r]"); return td ? { r: +td.dataset.r, c: +td.dataset.c } : null; }
  return {
    exts: () => [curExt, "xlsx", "csv", "xls"],
    _api: () => ({ get book() { return book; }, val: (r, c, s) => val(r, c, s), show, si: () => si, aiEdit: fn => { snap(); fn({ book, putRaw, setFmt, newSheet, K }); eng = xEngine(book); si = Math.min(si, book.sheets.length - 1); ED.dirty("excel"); render(); drawTabs(); drawCharts(); }, sel: () => R(), setSel: (a, b) => { anc = a; sel = b || a; paintSel(); }, render, fmtNum, parseEntry, eng: () => eng }),
    init(body) {
      addr = h("span", { class: "xs-addr", id: "xs-addr" }); fx = h("input", { class: "xs-fx", id: "xs-fx", "aria-label": "Formula", spellcheck: "false" });
      fx.addEventListener("input", () => { editing = true; const a = anchorOf(sel.r, sel.c); const td = cellTd(a.r, a.c); if (td) td.textContent = fx.value; });
      fx.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); editing = true; commit(e.shiftKey ? -1 : 1, 0); } else if (e.key === "Tab") { e.preventDefault(); editing = true; commit(0, e.shiftKey ? -1 : 1); } else if (e.key === "Escape") { editing = false; render(); wrap.focus(); } });
      fx.addEventListener("blur", () => { if (editing) { editing = false; setCell(sel.r, sel.c, fx.value); } });
      fontSel = selEl("xs-font", T("x_font"), FONTLIST.map(f => [f, f]), v => fmtRange({ font: v === "Calibri" ? null : v }));
      for (const o of fontSel.options) o.style.fontFamily = fontStack(o.value);
      sizeSel = selEl("xs-size", T("x_size"), [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map(n => [String(n), String(n)]), v => fmtRange({ sz: +v === 11 ? null : +v }));
      nfSel = selEl("xs-nf", T("x_nf"), [["", "—"], ...Object.keys(NF).map(k => [k, T("nf_" + k)])], v => { if (v) fmtRange({ nf: NF[v] }); });
      const color = h("input", { type: "color", id: "xs-color", value: "#c00000", title: T("x_color"), "aria-label": T("x_color") }), fill = h("input", { type: "color", id: "xs-fill", value: "#fff2cc", title: T("x_fill"), "aria-label": T("x_fill") });
      const bd = selEl("xs-bd", T("x_bd"), [["", "▦ " + T("x_bd")], ["all", T("x_bd_all")], ["out", T("x_bd_out")], ["bot", T("x_bd_bot")], ["none", T("x_bd_none")]], (v, s) => { if (v) borders(v); s.value = ""; });
      frzSel = selEl("xs-freeze", T("x_frz"), [["none", "❄ " + T("frz_none")], ["row", "❄ " + T("frz_row")], ["col", "❄ " + T("frz_col")], ["sel", "❄ " + T("frz_sel")]], v => edit(() => { S().frz = v === "row" ? { r: 1, c: 0 } : v === "col" ? { r: 0, c: 1 } : v === "sel" ? { r: sel.r, c: sel.c } : { r: 0, c: 0 }; }));
      const fnSel = selEl("xs-fn", T("x_fn"), [["", "ƒx ▾"], ...FUNCS.map(f => [f, f])], (v, s) => { if (!v) return; fx.value = "=" + v + "("; editing = true; fx.focus(); s.value = ""; });
      const chSel = selEl("xs-chart", T("x_chart"), [["", "📊 " + T("x_chart")], ["bar", T("x_chart_bar")], ["hbar", T("x_chart_hbar")], ["line", T("x_chart_line")], ["pie", T("x_chart_pie")]], (v, s) => { if (v) addChart(v); s.value = ""; });
      const zm = selEl("xs-zoom", T("x_zoom"), [50, 75, 90, 100, 125, 150, 200].map(z => [String(z), z + "%"]), v => { zoom = +v / 100; render(); }); zm.value = "100";
      const fi = h("input", { id: "xs-fi", placeholder: T("find"), "aria-label": T("find") }), ri = h("input", { id: "xs-ri", placeholder: T("repl"), "aria-label": T("repl") }), fc = h("span", { class: "hint", id: "xs-fcnt", role: "status" });
      fi.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); fc.textContent = findNext(fi.value) ? "" : T("nomatch"); } });
      findBar = h("div", { class: "ed-tool", id: "xs-findbar", hidden: true }, fi, btn("xs-fnext", T("next"), T("next"), () => { fc.textContent = findNext(fi.value) ? "" : T("nomatch"); }), ri,
        btn("xs-rall", T("rall"), T("rall"), () => { fc.textContent = T("found", findNext(fi.value, ri.value, true)); }), fc, btn("xs-fclose", "✕", T("cancel"), () => { findBar.hidden = true; wrap.focus(); }));
      const tb1 = h("div", { class: "ed-tool", role: "toolbar", "aria-label": T("excel") },
        btn("xs-undo", "↶", T("undo"), () => undoDo(true)), btn("xs-redo", "↷", T("redo"), () => undoDo(false)), h("span", { class: "sep" }), fontSel, sizeSel,
        btn("xs-b", h("b", {}, "B"), T("x_b"), () => toggle("b"), { "aria-pressed": "false" }), btn("xs-i", h("i", {}, "I"), T("x_i"), () => toggle("i"), { "aria-pressed": "false" }), btn("xs-u", h("u", {}, "U"), T("x_u"), () => toggle("u"), { "aria-pressed": "false" }), btn("xs-s", h("s", {}, "ab"), T("x_s"), () => toggle("s"), { "aria-pressed": "false" }),
        h("label", { class: "wd-cl", title: T("x_color") }, "A", color), btn("xs-colorb", "A▾", T("x_color"), () => fmtRange({ color: color.value })), h("label", { class: "wd-cl", title: T("x_fill") }, "🪣", fill), btn("xs-fillb", "▾", T("x_fill"), () => fmtRange({ bg: fill.value })), h("span", { class: "sep" }),
        btn("xs-al", "⇤", T("x_al"), () => fmtRange({ al: "left" })), btn("xs-ac", "≡", T("x_ac"), () => fmtRange({ al: "center" })), btn("xs-ar", "⇥", T("x_ar"), () => fmtRange({ al: "right" })), btn("xs-wrap", "↵", T("x_wrap"), () => toggle("wrap"), { "aria-pressed": "false" }), bd,
        btn("xs-merge", "⊞ " + T("x_merge"), T("x_merge"), () => merge(true)), btn("xs-unmerge", "⊟", T("x_unmerge"), () => merge(false)), h("span", { class: "sep" }), nfSel,
        btn("xs-inr", "₹", T("nf_inr"), () => fmtRange({ nf: NF.inr })), btn("xs-pct", "%", T("nf_pct"), () => fmtRange({ nf: NF.pct })), btn("xs-decup", ".0+", T("x_dec_up"), () => decimals(1)), btn("xs-decdn", ".0−", T("x_dec_dn"), () => decimals(-1)),
        btn("xs-clearf", "⌫A", T("x_clearf"), () => edit(() => forRange((s, r, c) => s.fmt.delete(K(r, c))))));
      const tb2 = h("div", { class: "ed-tool" },
        h("button", { type: "button", class: "btn small", id: "xs-insr", onclick: () => structural("r", 1) }, T("insR")), h("button", { type: "button", class: "btn small", id: "xs-delr", onclick: () => delSpan("r") }, T("delR")),
        h("button", { type: "button", class: "btn small", id: "xs-insc", onclick: () => structural("c", 1) }, T("insC")), h("button", { type: "button", class: "btn small", id: "xs-delc", onclick: () => delSpan("c") }, T("delC")), h("span", { class: "sep" }),
        btn("xs-sortaz", "A→Z", T("x_sort_az"), () => sortBy(false)), btn("xs-sortza", "Z→A", T("x_sort_za"), () => sortBy(true)), btn("xs-filter", "⏷ " + T("x_filter"), T("x_filter"), toggleFilter), h("span", { class: "sep" }),
        btn("xs-copy", "⧉", T("x_copy"), () => { const t = grab(false); navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}); }), btn("xs-cut", "✂", T("x_cut"), () => { const t = grab(true); navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}); }),
        btn("xs-paste", "📋", T("x_paste"), async () => { if (clip) return pasteInternal(); try { pasteText(await navigator.clipboard.readText()); } catch (e) {} }),
        btn("xs-filld", "⤓", T("x_filld"), fillDown), btn("xs-fillr", "⇥⇥", T("x_fillr"), fillRight), h("span", { class: "sep" }), frzSel,
        btn("xs-find", "🔍", T("x_find"), () => { findBar.hidden = false; fi.focus(); }), btn("xs-sum", "Σ", T("x_sum"), autoSum), fnSel, chSel,
        btn("xs-cf", "🎨", T("x_cf"), addRule), btn("xs-cfx", "🎨✕", T("x_cf_clear"), () => edit(() => { S().cf = []; })), zm, btn("xs-print", "🖨", T("x_print"), printSheet),
        h("button", { type: "button", class: "btn small", id: "xs-delsheet", onclick: delSheet }, T("delsheet")), h("span", { class: "sep" }),
        btn("xs-noteb", "💬 " + T("x_note"), T("x_note"), setNote), btn("xs-dvb", "✔ " + T("x_dv"), T("x_dv"), addValidation), btn("xs-pivotb", "⊞ " + T("x_pivot"), T("x_pivot"), pivot),
        btn("xs-nameb", "🏷 " + T("x_name"), T("x_name"), defineName), btn("xs-dupb", "⧉✕ " + T("x_dup"), T("x_dup"), removeDup));
      noteBox = h("div", { class: "xs-note", id: "xs-notebox", role: "status", hidden: true });
      tbl = h("table", { class: "xs", id: "xs-grid" }); fh = h("div", { class: "xs-fh", id: "xs-fh", title: "Fill" }); inner = h("div", { class: "xs-in" }, tbl, fh);
      wrap = h("div", { class: "xs-wrap", tabindex: "0", "aria-label": T("excel") }, inner);
      tabs = h("div", { class: "xs-tabs", role: "tablist" }); stat = h("span", { class: "xs-stat", id: "xs-stat", role: "status" }); charts = h("div", { class: "xs-charts", id: "xs-charts" });
      wrap.addEventListener("mousedown", e => {
        if (e.target === fh) { e.preventDefault(); fdrag = { g: R() }; return; }
        const fb = e.target.closest(".xs-fb"); if (fb) { e.preventDefault(); filterPop(+fb.dataset.fc, fb); return; }
        if (e.target.closest("[data-rz]")) return;
        const th = e.target.closest("th"); if (th && !e.target.closest("td")) { if (editing) commit(0, 0); const s = S();
          if (th.dataset.all) selectAll(); else if (th.dataset.c != null) { anc = { r: 0, c: +th.dataset.c }; sel = { r: Math.max(used(s).r - 1, 0), c: +th.dataset.c }; paintSel(false); } else if (th.dataset.r != null) { anc = { r: +th.dataset.r, c: 0 }; sel = { r: +th.dataset.r, c: Math.max(used(s).c - 1, 0) }; paintSel(false); } return; }
        const td = e.target.closest("td[data-r]"); if (!td) return; if (editing) commit(0, 0);
        const p = { r: +td.dataset.r, c: +td.dataset.c }; if (e.shiftKey) sel = p; else { sel = p; anc = { ...p }; } mdrag = true; paintSel(false); });
      document.addEventListener("mousemove", e => { if (!mdrag && !fdrag) return; const p = cellAt(e); if (!p) return;
        if (mdrag) { if (p.r !== sel.r || p.c !== sel.c) { sel = p; paintSel(false); } return; }
        const g = fdrag.g; let g2 = { ...g }; if (p.r > g.r2 && p.r - g.r2 >= p.c - g.c2) g2.r2 = p.r; else if (p.c > g.c2) g2.c2 = p.c; else if (p.r < g.r1) g2.r1 = p.r; else if (p.c < g.c1) g2.c1 = p.c; fdrag.g2 = g2;
        for (const t of tbl.querySelectorAll("td.fil")) t.classList.remove("fil"); for (let r = g2.r1; r <= g2.r2; r++) for (let c = g2.c1; c <= g2.c2; c++) { const t = cellTd(r, c); if (t) t.classList.add("fil"); } });
      document.addEventListener("mouseup", () => { mdrag = false; if (fdrag) { const f = fdrag; fdrag = null; for (const t of tbl.querySelectorAll("td.fil")) t.classList.remove("fil"); if (f.g2) fillTo(f.g2); } });
      wrap.addEventListener("contextmenu", e => {
        if (!e.target.closest("td,th")) return;
        e.preventDefault();
        let m = document.getElementById("xs-menu");
        if (!m) { m = h("div", { class: "wd-menu", id: "xs-menu" }); document.body.append(m); }
        const item = (label, fn) => h("button", { type: "button", onclick: () => { m.hidden = true; fn(); } }, label);
        m.replaceChildren(
          item(T("x_copy"), () => { const t = grab(false); navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}); }),
          item(T("x_paste"), async () => { if (clip) return pasteInternal(); try { pasteText(await navigator.clipboard.readText()); } catch (err) {} }),
          item(T("delR"), () => delSpan("r")),
          item(T("delC"), () => delSpan("c"))
        );
        m.hidden = false;
        m.style.left = Math.max(8, Math.min(e.clientX, window.innerWidth - 180)) + "px";
        m.style.top = Math.max(8, Math.min(e.clientY, window.innerHeight - 200)) + "px";
      });
      document.addEventListener("pointerdown", e => { const m = document.getElementById("xs-menu"); if (m && !m.hidden && !m.contains(e.target)) m.hidden = true; });
      wrap.addEventListener("keydown", e => {
        if (e.target !== wrap) return; const k = e.key, mod = e.ctrlKey || e.metaKey, lk = k.toLowerCase();
        if (mod && !e.altKey) { const act = { z: () => undoDo(!e.shiftKey), y: () => undoDo(false), b: () => toggle("b"), i: () => toggle("i"), u: () => toggle("u"), d: fillDown, r: fillRight, a: selectAll, f: () => { findBar.hidden = false; fi.focus(); }, h: () => { findBar.hidden = false; ri.focus(); }, p: printSheet }[lk]; if (act) { e.preventDefault(); act(); } return; }
        const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Enter: [1, 0], Tab: [0, 1], PageDown: [20, 0], PageUp: [-20, 0] }[k];
        if (mv) { e.preventDefault(); const back = e.shiftKey && (k === "Enter" || k === "Tab"); move(back ? -mv[0] : mv[0], back ? -mv[1] : mv[1], e.shiftKey && k.startsWith("Arrow")); return; }
        if (k === "Delete" || k === "Backspace") { e.preventDefault(); clearRange(); return; }
        if (k === "F2") { e.preventDefault(); editing = true; fx.focus(); return; }
        if (k === "Escape") { clip = null; for (const t of tbl.querySelectorAll("td.cpy")) t.classList.remove("cpy"); return; }
        if (k.length === 1 && !e.altKey) { e.preventDefault(); anc = { ...sel }; fx.value = k; editing = true; fx.focus(); const a = anchorOf(sel.r, sel.c); const td = cellTd(a.r, a.c); if (td) td.textContent = k; }
      });
      const mine = () => ED.tab === "excel" && document.activeElement === wrap;
      document.addEventListener("copy", e => { if (!mine()) return; e.preventDefault(); e.clipboardData.setData("text/plain", grab(false)); });
      document.addEventListener("cut", e => { if (!mine()) return; e.preventDefault(); e.clipboardData.setData("text/plain", grab(true)); });
      document.addEventListener("paste", e => { if (!mine()) return; e.preventDefault(); const t = e.clipboardData.getData("text/plain"); if (t) pasteText(t); else if (clip) pasteInternal(); });
      let rz = null;
      tbl.addEventListener("mousedown", e => { const g = e.target.closest("[data-rz]"); if (!g) return; e.preventDefault(); e.stopPropagation(); const c = +g.dataset.rz; rz = { c, x: e.clientX, w: S().colW[c] || 90 }; });
      document.addEventListener("mousemove", e => { if (!rz) return; const w = Math.max(24, Math.min(800, rz.w + (e.clientX - rz.x) / zoom)); S().colW[rz.c] = w; const col = tbl.querySelectorAll("col")[rz.c + 1]; if (col) col.style.width = w + "px"; });
      document.addEventListener("mouseup", () => { if (rz) { rz = null; ED.dirty("excel"); render(); } });
      body.append(tb1, tb2, findBar, h("div", { class: "xs-bar" }, addr, h("span", { class: "xs-fxl", "aria-hidden": "true" }, "ƒx"), fx), noteBox, wrap, h("div", { class: "xs-foot" }, tabs, stat), charts);
    },
    blank() { book = { sheets: [newSheet("Sheet1")] }; eng = xEngine(book); si = 0; sel = { r: 0, c: 0 }; anc = { ...sel }; undo = []; redo = []; clip = null; curExt = "xlsx"; render(); },
    async load(buf, e) {
      await load("xlsx");
      const wb = e === "csv" ? XLSX.read(new TextDecoder("utf-8").decode(buf).replace(/^\ufeff/, ""), { type: "string", raw: true }) : XLSX.read(new Uint8Array(buf), { type: "array", cellFormula: true, cellNF: true, cellDates: false, sheetStubs: true, cellStyles: true });
      let sty = null; if (e === "xlsx") { try { sty = await readStyles(buf); } catch (er) { sty = null; } }
      book = { sheets: wb.SheetNames.map(n => { const ws = wb.Sheets[n]; const s = newSheet(n); const ss = sty && sty.sheets[n];
        for (const a of Object.keys(ws)) { if (a[0] === "!") continue; const cell = ws[a]; const d = XLSX.utils.decode_cell(a); let raw;
          if (cell.f) raw = "=" + cell.f.replace(/_xlfn\.|_xlws\./gi, ""); else if (cell.t === "b") raw = cell.v ? "TRUE" : "FALSE"; else if (cell.t === "e") raw = cell.w || "#ERR!"; else raw = cell.v == null ? "" : String(cell.v);
          if (raw !== "") s.cells.set(K(d.r, d.c), raw);
          if (cell.c && cell.c.length) s.notes.set(K(d.r, d.c), cell.c.map(x => x.t).join("\n").trim());
          if (!ss && cell.t === "n" && cell.z && cell.z !== "General") s.fmt.set(K(d.r, d.c), { nf: String(cell.z) }); }
        if (ss) { for (const [k, f] of ss.cells) s.fmt.set(k, { ...f }); s.frz = ss.frz; s.rowH = ss.rowH; s.dv = ss.dv || []; if (ss.charts && ss.charts.length) s.charts = ss.charts; }
        s.merges = (ws["!merges"] || []).map(m => ({ r1: m.s.r, c1: m.s.c, r2: m.e.r, c2: m.e.c }));
        (ws["!cols"] || []).forEach((c, i) => { if (c && (c.wpx || c.wch || c.width)) s.colW[i] = Math.round(c.wpx || (c.wch || c.width) * 7 + 5); });
        return s; }) };
      if (!book.sheets.length) book.sheets.push(newSheet("Sheet1"));
      book.names = {}; for (const nm of (wb.Workbook && wb.Workbook.Names) || []) if (nm.Name && nm.Ref && nm.Sheet == null && !/^_xlnm\./.test(nm.Name)) book.names[nm.Name] = nm.Ref;
      eng = xEngine(book); si = 0; sel = { r: 0, c: 0 }; anc = { ...sel }; undo = []; redo = []; clip = null; curExt = e; ED.st.excel.msg.textContent = ""; render();
    },
    async export(e) {
      await load("xlsx"); eng.reset(); const wb = XLSX.utils.book_new();
      const sheets = e === "csv" ? [book.sheets[si]] : book.sheets;
      sheets.forEach(s => { const ix = book.sheets.indexOf(s); const ws = {}; let mr = 0, mc = 0;
        for (const [k, raw] of s.cells) { const [r, c] = k.split(",").map(Number); mr = Math.max(mr, r); mc = Math.max(mc, c); const v = eng.get(ix, r, c); const cell = {}; const f = s.fmt.get(k);
          if (raw[0] === "=" && raw.length > 1) { cell.f = raw.slice(1).replace(/(^|[^A-Za-z0-9_.])(XLOOKUP|TEXTJOIN|MAXIFS|MINIFS|IFS|XOR|CONCAT|DAYS|IFNA|SWITCH)\(/gi, (m0, a, n) => a + "_xlfn." + n.toUpperCase() + "("); if (v instanceof XErr) { cell.t = "s"; cell.v = v.c; } else if (typeof v === "number") { cell.t = "n"; cell.v = v; } else if (typeof v === "boolean") { cell.t = "b"; cell.v = v; } else { cell.t = "s"; cell.v = v == null ? "" : String(v); } }
          else if (typeof v === "number") { cell.t = "n"; cell.v = v; } else if (typeof v === "boolean") { cell.t = "b"; cell.v = v; } else { cell.t = "s"; cell.v = raw; }
          if (e === "csv" && typeof v === "number" && f && f.nf) { cell.t = "s"; cell.v = show(v, f); delete cell.f; }
          if (f && f.nf) cell.z = f.nf;
          ws[XLSX.utils.encode_cell({ r, c })] = cell; }
        if (e !== "csv") for (const k of s.fmt.keys()) if (!s.cells.has(k)) { const [r, c] = k.split(",").map(Number); mr = Math.max(mr, r); mc = Math.max(mc, c); ws[XLSX.utils.encode_cell({ r, c })] = { t: "s", v: "" }; }
        if (e !== "csv" && s.notes) for (const [k, t] of s.notes) { const [r, c] = k.split(",").map(Number); mr = Math.max(mr, r); mc = Math.max(mc, c); const a = XLSX.utils.encode_cell({ r, c }); if (!ws[a]) ws[a] = { t: "s", v: "" }; ws[a].c = [{ a: "Biswas AI", t }]; ws[a].c.hidden = true; }
        for (const m of s.merges) { mr = Math.max(mr, m.r2); mc = Math.max(mc, m.c2); }
        ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: mr, c: mc } });
        ws["!cols"] = Array.from({ length: mc + 1 }, (_, c) => ({ wch: Math.round(((s.colW[c] || 90) - 5) / 7 * 100) / 100 }));
        if (s.merges.length) ws["!merges"] = s.merges.map(m => ({ s: { r: m.r1, c: m.c1 }, e: { r: m.r2, c: m.c2 } }));
        const hid = hiddenRows(s); if (hid.size || (s.rowH && s.rowH.length)) { ws["!rows"] = []; for (let r = 0; r <= mr; r++) ws["!rows"][r] = hid.has(r) ? { hidden: true } : s.rowH && s.rowH[r] ? { hpx: s.rowH[r] } : {}; }
        if (s.filter) ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: s.filter.r, c: s.filter.c1 }, e: { r: Math.max(mr, s.filter.r), c: s.filter.c2 } }) };
        XLSX.utils.book_append_sheet(wb, ws, s.name); });
      if (e !== "csv" && book.names && Object.keys(book.names).length) wb.Workbook = { Names: Object.entries(book.names).map(([Name, Ref]) => ({ Name, Ref })) };
      const bt = e === "csv" ? "csv" : e === "xls" ? "biff8" : "xlsx";
      let out = e === "csv" ? XLSX.utils.sheet_to_csv(wb.Sheets[sheets[0].name]) : XLSX.write(wb, { bookType: bt, type: "array", compression: true });
      if (e === "xlsx") { // formatting, frozen panes and highlight rules go into the package directly
        await load("jszip"); const z = await JSZip.loadAsync(out); const W = writeStyles();
        for (let i = 0; i < book.sheets.length; i++) { const s = book.sheets[i]; const n = `xl/worksheets/sheet${i + 1}.xml`; if (!z.file(n)) continue; let x = await z.file(n).async("string");
          const sOf = new Map(); for (const [k, f] of s.fmt) { const [r, c] = k.split(",").map(Number); sOf.set(colName(c) + (r + 1), W.xfOf(f)); }
          x = x.replace(/<c r="([A-Z]+\d+)"( s="\d+")?/g, (m, ref) => sOf.has(ref) ? `<c r="${ref}" s="${sOf.get(ref)}"` : `<c r="${ref}"`);
          const fr = s.frz || { r: 0, c: 0 };
          if (fr.r || fr.c) { const tl = colName(fr.c) + (fr.r + 1), ap = fr.r && fr.c ? "bottomRight" : fr.r ? "bottomLeft" : "topRight";
            x = x.replace(/<sheetView workbookViewId="0"\s*\/>|<sheetView workbookViewId="0">[\s\S]*?<\/sheetView>/, `<sheetView workbookViewId="0"><pane${fr.c ? ` xSplit="${fr.c}"` : ""}${fr.r ? ` ySplit="${fr.r}"` : ""} topLeftCell="${tl}" activePane="${ap}" state="frozen"/><selection pane="${ap}" activeCell="${tl}" sqref="${tl}"/></sheetView>`); }
          if (s.cf && s.cf.length) { let pr = 1; const cfx = s.cf.map(rule => { const ref = colName(rule.c1) + (rule.r1 + 1) + ":" + colName(rule.c2) + (rule.r2 + 1); const fv = isNaN(+rule.val) || rule.val === "" ? '"' + XA(String(rule.val).replace(/"/g, '""')) + '"' : rule.val;
              return `<conditionalFormatting sqref="${ref}"><cfRule type="cellIs" dxfId="${W.dxfOf(rule)}" priority="${pr++}" operator="${OPS[rule.op] || "equal"}"><formula>${fv}</formula></cfRule></conditionalFormatting>`; }).join("");
            const at = x.search(/<dataValidations|<hyperlinks|<printOptions|<pageMargins|<pageSetup|<headerFooter|<drawing|<legacyDrawing|<tableParts|<extLst|<\/worksheet>/); x = x.slice(0, at) + cfx + x.slice(at); }
          if (s.dv && s.dv.length) { const dvx = `<dataValidations count="${s.dv.length}">` + s.dv.map(v => { const ref = colName(v.c1) + (v.r1 + 1) + ":" + colName(v.c2) + (v.r2 + 1);
              if (v.type === "list") return `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="${ref}"><formula1>"${XA(v.list.join(","))}"</formula1></dataValidation>`;
              const has1 = v.min !== "" && v.min != null, has2 = v.max !== "" && v.max != null; const op = has1 && has2 ? "between" : has1 ? "greaterThanOrEqual" : "lessThanOrEqual";
              return `<dataValidation type="${v.type}" operator="${op}" allowBlank="1" showErrorMessage="1" sqref="${ref}"><formula1>${has1 ? +v.min : has2 ? +v.max : 0}</formula1>${has1 && has2 ? `<formula2>${+v.max}</formula2>` : ""}</dataValidation>`; }).join("") + "</dataValidations>";
            const at = x.search(/<hyperlinks|<printOptions|<pageMargins|<pageSetup|<headerFooter|<drawing|<legacyDrawing|<tableParts|<extLst|<\/worksheet>/); x = x.slice(0, at) + dvx + x.slice(at); }
          z.file(n, x); }
        z.file("xl/styles.xml", W.xml()); await writeCharts(z);
        out = await z.generateAsync({ type: "arraybuffer", compression: "DEFLATE" }); }
      return { blob: new Blob(e === "csv" ? ["\ufeff", out] : [out], { type: MIME[e] || MIME.xlsx }) };
    }
  };
})();
const css = `
.xs-in { position: relative; display: inline-block; min-width: 100%; }
.xs td.rng { background: color-mix(in srgb, var(--accent) 14%, transparent) !important; }
.xs td.cpy { outline: 2px dashed var(--accent); outline-offset: -2px; } .xs td.fil { outline: 1px dashed #555; outline-offset: -1px; }
.xs-fh { position: absolute; width: 8px; height: 8px; background: var(--accent); border: 1px solid #fff; cursor: crosshair; z-index: 5; }
.xs td.xs-fh-on { position: relative; padding-right: 18px; } .xs-fb { position: absolute; right: 2px; top: 3px; width: 15px; height: 16px; border: 1px solid #999; border-radius: 3px; background: #f4f4f4; cursor: pointer; }
.xs-fb::after { content: "▾"; font-size: 11px; line-height: 14px; display: block; text-align: center; color: #333; } .xs td.xs-fon .xs-fb { background: #cfe0ff; }
.xs-flist { max-height: 260px; overflow: auto; display: grid; gap: 2px; margin: 6px 0; min-width: 220px; } .xs-fl { display: block; font-size: .9rem; }
.xs-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; } .xs-stat { font-size: .8rem; color: var(--muted); white-space: pre; }
.xs-charts { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; } .xs-chartbox { margin: 0; border: 1px solid var(--line); border-radius: 8px; padding: 6px; background: #fff; }
.xs-chartbox figcaption { display: flex; gap: 6px; justify-content: flex-end; margin-top: 4px; } .xs-chart { max-width: 100%; height: auto; display: block; }
#ed-excel .wd-b[aria-pressed=true] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
#ed-excel .ed-tool { flex-wrap: wrap; } #ed-excel .wd-sel { max-width: 150px; }
.xs-wrap { height: calc(100vh - 380px); }
.xs td.xs-hasnote { position: relative; } .xs td.xs-hasnote::after { content: ""; position: absolute; top: 0; right: 0; border-style: solid; border-width: 0 7px 7px 0; border-color: transparent #d00 transparent transparent; }
.xs td.xs-hasdv { box-shadow: inset -3px 0 0 #2f6db5; }
.xs-note { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; font-size: .85rem; padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px; margin: 4px 0; }
.xs-note[hidden] { display: none; }
`;
document.head.append(h("style", { id: "xs-css" }, css));
})();
