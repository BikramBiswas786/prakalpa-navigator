// v115: cited answers. Structure-aware chunking, query expansion, hybrid retrieval + rerank, a safe spreadsheet
// aggregate engine (no eval), and short quotes for highlighting. Pure functions except the optional remote rerankers.
//
// Text sidecars come from the browser with light markers:
//   PDF   "[Page n]" before each page          → per-page chunks, repeated headers/footers and page numbers removed
//   DOCX  "#", "##"… lines for headings       → chunks carry their heading path ("Sales › March")
//   XLSX  "[Sheet: name @r0]" + tab-separated rows → chunks of rows with the header repeated, row ranges kept
const env = process.env;
export const MIN_TOK = 400, MAX_TOK = 800, OVERLAP = 0.15;
const WORD = /[\p{L}\p{M}\p{N}]+|[^\s\p{L}\p{M}\p{N}]/gu;
export const toks = s => Math.ceil((String(s).match(WORD) || []).length * 1.15);
const BN_DIG = "০১২৩৪৫৬৭৮৯";
export const asciiDigits = s => String(s).replace(/[০-৯]/g, d => String(BN_DIG.indexOf(d)));

/* ---------- parsing ---------- */
export function parse(text) {
  const s = String(text || "");
  if (/^\s*\[Sheet: /.test(s)) return parseSheets(s);
  if (/\[Page \d+\]/.test(s)) return parsePdf(s);
  if (/^#{1,6} \S/m.test(s)) return parseDoc(s);
  return { kind: "plain", units: paras(s).map(t => ({ t, loc: {} })) };
}
const paras = s => s.split(/\n\s*\n+/).map(x => x.replace(/[ \t]+\n/g, "\n").trim()).filter(Boolean);
function parsePdf(s) {
  const parts = s.split(/\n?\[Page (\d+)\]\n?/); const pages = [];
  for (let i = 1; i < parts.length; i += 2) pages.push({ n: Number(parts[i]), lines: parts[i + 1].split("\n").map(l => l.trim()).filter(Boolean) });
  const norm = l => asciiDigits(l).toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
  const PAGE_NO = /^(page|পৃষ্ঠা|pg\.?)?\s*[-–—]?\s*#\s*[-–—]?\s*((of|\/|এর মধ্যে)\s*#)?$/i;
  const edge = p => [...p.lines.slice(0, 2).map((l, i) => i), ...p.lines.slice(-2).map((l, i) => Math.max(0, p.lines.length - 2) + i)];
  const count = new Map();
  if (pages.length >= 3) for (const p of pages) for (const k of new Set(edge(p).map(i => norm(p.lines[i])))) count.set(k, (count.get(k) || 0) + 1);
  const need = Math.max(2, Math.ceil(pages.length * 0.5)); let removed = 0, scanned = 0;
  const units = [];
  for (const p of pages) {
    const drop = new Set(edge(p).filter(i => { const k = norm(p.lines[i]); return PAGE_NO.test(k) || (pages.length >= 3 && p.lines.length >= 4 && (count.get(k) || 0) >= need && k.length < 100); }));
    removed += drop.size;
    const body = p.lines.filter((l, i) => !drop.has(i)).join("\n").trim();
    if (body.replace(/\s/g, "").length < 20) { scanned++; continue; }
    units.push({ t: body, loc: { page: p.n } });
  }
  return { kind: "pdf", units, pages: pages.length, scanned: pages.length > 0 && scanned === pages.length, scannedPages: scanned, removed };
}
function parseDoc(s) {
  const units = []; const path = []; let buf = [];
  const flush = () => { const t = buf.join("\n").trim(); if (t) units.push({ t, loc: { h: path.filter(Boolean).join(" › ") } }); buf = []; };
  for (const line of s.split("\n")) {
    const m = line.match(/^(#{1,6}) (.+)$/);
    if (m) { flush(); const lv = m[1].length; path.length = lv; path[lv - 1] = m[2].trim(); continue; }
    if (!line.trim()) { flush(); continue; }
    buf.push(line);
  }
  flush();
  return { kind: "doc", units };
}
function parseSheets(s) {
  const sheets = {}; const units = []; let total = 0;
  for (const block of s.split(/\n*(?=^\[Sheet: )/m)) {
    const m = block.match(/^\[Sheet: (.*?)(?: @(\d+))?\]\n?/); if (!m) continue;
    const name = m[1], r0 = Number(m[2] || 1);
    const rows = block.slice(m[0].length).split("\n").map(l => l.split("\t").map(c => c.trim()));
    while (rows.length && rows[rows.length - 1].every(c => !c)) rows.pop();
    const keep = rows.slice(0, Math.max(0, 20000 - total)); total += keep.length;
    sheets[name] = { r0, rows: keep };
    const hi = keep.findIndex(r => r.some(Boolean)); if (hi < 0) continue;
    const head = keep[hi].join(" | ");
    // rows → chunks of ~MIN..MAX tokens; each chunk repeats the header; ~15% of rows overlap
    let i = hi + 1;
    if (i >= keep.length) { units.push({ t: head, loc: { sheet: name, r1: r0 + hi, r2: r0 + hi }, pre: true }); continue; }
    while (i < keep.length) {
      let j = i, tk = toks(head);
      while (j < keep.length && (tk < 600 || j === i)) { tk += toks(keep[j].join(" | ")) + 1; j++; }
      const lines = keep.slice(i, j).map((r, k) => `R${r0 + i + k}: ${r.join(" | ")}`);
      units.push({ t: `${head}\n${lines.join("\n")}`, loc: { sheet: name, r1: r0 + i, r2: r0 + j - 1 }, pre: true });
      if (j >= keep.length) break;
      i = Math.max(i + 1, j - Math.max(1, Math.round((j - i) * OVERLAP)));
    }
  }
  return { kind: "sheet", units, sheets };
}

/* ---------- chunking: 400–800 tokens, 10–20% overlap ---------- */
const sentences = t => t.split(/(?<=[.!?।])\s+|\n+/).map(x => x.trim()).filter(Boolean);
function splitLong(t) {
  if (toks(t) <= MAX_TOK) return [t];
  let ss = sentences(t);
  ss = ss.flatMap(x => { if (toks(x) <= MAX_TOK * 0.6) return [x]; const w = x.split(/\s+/), out = []; for (let i = 0; i < w.length; i += 300) out.push(w.slice(i, i + 300).join(" ")); return out; });
  const out = []; let i = 0;
  while (i < ss.length) {
    let j = i, tk = 0;
    while (j < ss.length && (tk < 600 || j === i) && tk + toks(ss[j]) <= MAX_TOK + 50) { tk += toks(ss[j]); j++; }
    if (j === i) j = i + 1;
    out.push(ss.slice(i, j).join(" "));
    if (j >= ss.length) break;
    let back = j, ov = 0; while (back > i + 1 && ov < tk * OVERLAP) { back--; ov += toks(ss[back]); }
    i = back > i ? back : j;
  }
  return out;
}
export function chunk(doc) {
  const out = [];
  if (doc.kind === "sheet") return doc.units.map(u => ({ t: u.t, loc: u.loc }));
  if (doc.kind === "pdf") { for (const u of doc.units) for (const t of splitLong(u.t)) out.push({ t, loc: u.loc }); return out; }
  // doc/plain: merge small paragraphs (same heading path preferred) up to the window, split long ones
  let cur = null;
  const push = () => { if (cur) { for (const t of splitLong(cur.t)) out.push({ t, loc: cur.loc }); cur = null; } };
  for (const u of doc.units) {
    if (cur && u.loc.h !== cur.loc.h) push(); // a chunk never spans two sections, so its heading path is exact
    if (cur && (toks(cur.t) >= MIN_TOK || toks(cur.t) + toks(u.t) > MAX_TOK)) {
      const tail = sentences(cur.t).slice(-2).join(" "); push();
      cur = { t: toks(tail) < MAX_TOK * OVERLAP * 1.6 ? tail : "", loc: u.loc };
    }
    if (!cur) cur = { t: "", loc: u.loc };
    cur.t = cur.t ? cur.t + "\n" + u.t : u.t;
  }
  push();
  return out;
}
export function build(text) {
  const doc = parse(text); const chunks = chunk(doc).slice(0, 3000);
  const out = { v: 2, kind: doc.kind, chunks };
  if (doc.kind === "pdf") Object.assign(out, { pages: doc.pages, scanned: doc.scanned, scannedPages: doc.scannedPages, removed: doc.removed });
  if (doc.kind === "sheet") out.sheets = doc.sheets;
  return out;
}
export const searchText = c => (c.loc && c.loc.h ? c.loc.h + "\n" : "") + (c.loc && c.loc.sheet ? c.loc.sheet + "\n" : "") + c.t;

/* ---------- query expansion (bn ⇄ en, no key needed) ---------- */
const MONTHS = [["january", "jan", "জানুয়ারি", "জানুয়ারী"], ["february", "feb", "ফেব্রুয়ারি", "ফেব্রুয়ারী"], ["march", "mar", "মার্চ"], ["april", "apr", "এপ্রিল"], ["may", "মে"], ["june", "jun", "জুন"],
  ["july", "jul", "জুলাই"], ["august", "aug", "আগস্ট", "অগাস্ট"], ["september", "sep", "sept", "সেপ্টেম্বর"], ["october", "oct", "অক্টোবর"], ["november", "nov", "নভেম্বর"], ["december", "dec", "ডিসেম্বর"]];
const SYN = [["total", "sum", "মোট", "সর্বমোট", "যোগফল"], ["sales", "sale", "revenue", "বিক্রি", "বিক্রয়", "turnover"], ["cost", "expense", "expenditure", "খরচ", "ব্যয়"], ["invoice", "bill", "বিল", "চালান"],
  ["salary", "pay", "wage", "বেতন"], ["amount", "value", "টাকা", "পরিমাণ", "rs", "inr"], ["budget", "বাজেট"], ["profit", "লাভ", "মুনাফা"], ["loss", "ক্ষতি"], ["average", "mean", "গড়"], ["date", "তারিখ"], ["year", "বছর", "সাল"],
  ["meeting", "সভা", "মিটিং"], ["notice", "নোটিশ", "বিজ্ঞপ্তি"], ["land", "জমি"], ["case", "মামলা"], ["report", "রিপোর্ট", "প্রতিবেদন"], ["office", "অফিস", "দপ্তর"], ["district", "জেলা"], ["school", "স্কুল", "বিদ্যালয়"]];
export function monthOf(word) { const w = String(word).toLowerCase(); const i = MONTHS.findIndex(g => g.includes(w)); return i < 0 ? 0 : i + 1; }
// words that shape the answer rather than say what to look for; they don't count toward evidence coverage
const ASK_WORDS = "table tabular list please give show tell make write prose format answer reply explain short brief detail detailed file files document documents find what when where which who whose how much many is are the from in of me us my our about there any টেবিল সারণি তালিকা দিন দাও বলুন বলো লিখুন লেখো দেখাও দেখান কত কী কি কোন কোথায় কবে কে ফাইল ফাইলে একটা একটি আমাকে আমার সম্পর্কে".split(" ");
let askSet = null;
export function expand(q, tokens) {
  askSet = askSet || new Set(ASK_WORDS.flatMap(w => tokens(w)));
  const all = [...new Set(tokens(q))]; const base0 = all.filter(t => !askSet.has(t)); const base = base0.length ? base0 : all; const extra = new Set();
  const groups = [...MONTHS.map(g => g.filter(w => w.length > 3 || /[\u0980-\u09ff]/.test(w))), ...SYN].map(g => ({ g, t: new Set(g.flatMap(w => tokens(w))) }));
  for (const t of base) for (const { t: set } of groups) if (set.has(t)) for (const x of set) if (x !== t) extra.add(x);
  for (const t of base) { const a = asciiDigits(t); if (a !== t) extra.add(a); }
  return { base, extra: [...extra].filter(x => !base.includes(x)) };
}
// group of equivalent terms for each base token (for coverage)
function termGroups(base, tokens) {
  const groups = [...MONTHS.map(g => g.filter(w => w.length > 3 || /[\u0980-\u09ff]/.test(w))), ...SYN].map(g => new Set(g.flatMap(w => tokens(w))));
  return base.map(t => { const s = new Set([t, asciiDigits(t)]); for (const g of groups) if (g.has(t)) for (const x of g) s.add(x); return s; });
}

/* ---------- rerank ---------- */
// lexical rerank: share of the question's terms the chunk covers (synonyms count), proximity, plus normalised BM25
export function lexRerank(q, cands, tokens) {
  const { base } = expand(q, tokens); const groups = termGroups(base, tokens);
  const maxBm = Math.max(1e-9, ...cands.map(c => c.s || 0));
  for (const c of cands) {
    const tk = tokens(searchText(c.chunk)); const set = new Set(tk);
    const hit = groups.map(g => [...g].some(x => set.has(x)));
    const cov = groups.length ? hit.filter(Boolean).length / groups.length : 0;
    let prox = 0; // two question terms within 8 tokens of each other
    if (groups.length > 1) { const pos = tk.map(t => groups.findIndex(g => g.has(t))); let last = new Map();
      pos.forEach((g, i) => { if (g < 0) return; for (const [h, j] of last) if (h !== g && i - j <= 8) prox = 1; last.set(g, i); }); }
    c.cov = cov; c.score = 0.55 * cov + 0.3 * ((c.s || 0) / maxBm) + 0.15 * prox + (c.emb || 0) * 0.35;
  }
  return cands.sort((a, b) => b.score - a.score);
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);
// Optional: embeddings (Gemini, free tier) for the hybrid score, or Cohere's multilingual reranker. Either one is skipped
// silently when its key is missing or the call fails.
export async function remoteScores(q, cands) {
  if (env.PENDRIVE_MOCK_AI === "1" || env.PD_RAG_REMOTE === "0" || !cands.length) return "";
  const docs = cands.map(c => searchText(c.chunk).slice(0, 2000));
  try {
    if (env.COHERE_API_KEY) {
      const r = await withTimeout(fetch("https://api.cohere.com/v2/rerank", { method: "POST", headers: { authorization: "Bearer " + env.COHERE_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ model: env.COHERE_RERANK_MODEL || "rerank-v3.5", query: q, documents: docs, top_n: docs.length }) }), 7000);
      if (r.ok) { const j = await r.json(); for (const x of j.results || []) cands[x.index].emb = x.relevance_score; return "cohere-rerank"; }
    }
    if (env.GEMINI_API_KEY) {
      const model = env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
      const req = (text, taskType) => ({ model: "models/" + model, content: { parts: [{ text }] }, taskType, outputDimensionality: 256 });
      const r = await withTimeout(fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, { method: "POST", headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({ requests: [req(q, "RETRIEVAL_QUERY"), ...docs.map(d => req(d, "RETRIEVAL_DOCUMENT"))] }) }), 8000);
      if (r.ok) { const e = (await r.json()).embeddings || []; const qv = e[0] && e[0].values; if (qv) { const n = v => Math.hypot(...v) || 1; const qn = n(qv);
        e.slice(1).forEach((x, i) => { if (x && x.values && cands[i]) cands[i].emb = Math.max(0, x.values.reduce((a, v, k) => a + v * qv[k], 0) / (qn * n(x.values))); }); return "gemini-embeddings"; } }
    }
  } catch (e) { /* fall back to lexical only */ }
  return "";
}

/* ---------- quotes for highlighting ---------- */
export function quote(text, q, tokens) {
  const { base } = expand(q, tokens); const groups = termGroups(base, tokens);
  let best = "", bs = -1;
  for (const s of sentences(text)) { if (s.length < 8) continue; const set = new Set(tokens(s)); const sc = groups.filter(g => [...g].some(x => set.has(x))).length + Math.min(s.length, 200) / 2000; if (sc > bs) { bs = sc; best = s; } }
  best = best || String(text).slice(0, 160);
  return best.length > 180 ? best.slice(0, 180) : best;
}

/* ---------- spreadsheet aggregates (parsed, never eval'd) ---------- */
const OPS = [["sum", /\b(total|sum|overall|altogether|combined)\b|মোট|সর্বমোট|যোগফল/i], ["avg", /\b(average|mean|avg)\b|গড়/i], ["count", /\bhow many\b|\bcount\b|\bnumber of\b|কতগুলো|কয়টি|কটি|কতজন/i],
  ["max", /\b(max|maximum|highest|largest|biggest|most)\b|সর্বোচ্চ|সবচেয়ে বেশি/i], ["min", /\b(min|minimum|lowest|smallest|least)\b|সর্বনিম্ন|সবচেয়ে কম/i]];
export const numericQuestion = q => OPS.some(([, re]) => re.test(q));
export function num(v) { const s = asciiDigits(v).replace(/[,\s₹৳]|rs\.?|inr|tk\.?|taka|টাকা/gi, ""); if (!/^-?\(?\d+(\.\d+)?\)?%?$/.test(s)) return null; const n = Number(s.replace(/[()%]/g, "")); return /^\(.*\)$/.test(s) ? -n : n; }
export function dateOf(v) {
  const s = asciiDigits(String(v)).trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return { y: +m[1], m: +m[2] };
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) return { y: +m[3] < 100 ? 2000 + +m[3] : +m[3], m: +m[2] }; // dd/mm/yyyy (India)
  if (s.length > 40) return null;
  const w = s.toLowerCase().match(/[a-z\u0980-\u09ff]+/g) || []; for (const x of w) { const mo = monthOf(x) || monthOf(x.replace(/(ে|র|এ)$/u, "")); if (mo) { const y = s.match(/\d{4}/); return { y: y ? +y[0] : 0, m: mo }; } }
  return null;
}
const AMOUNT = /amount|total|value|sales|sale|revenue|price|cost|expense|salary|টাকা|পরিমাণ|মূল্য|দাম|খরচ|বিক্রি|বেতন/i;
export function aggregate(q, files, tokens) {
  const op = (OPS.find(([, re]) => re.test(q)) || [])[0]; if (!op) return null;
  const qt = new Set([...expand(q, tokens).base, ...expand(q, tokens).extra]);
  const qMonth = (() => { const qs = new Set(tokens(q)); const i = MONTHS.findIndex(g => g.some(w => tokens(w).some(t => qs.has(t)) && w.length > 3)); return i + 1; })();
  const qYear = (asciiDigits(q).match(/\b(19|20)\d{2}\b/) || [])[0];
  let best = null;
  for (const f of files) for (const [sheet, data] of Object.entries(f.sheets || {})) {
    const rows = data.rows; const hi = rows.findIndex(r => r.some(Boolean)); if (hi < 0) continue;
    const head = rows[hi]; const body = rows.slice(hi + 1).map((r, i) => ({ r, n: data.r0 + hi + 1 + i })).filter(x => x.r.some(Boolean));
    if (!body.length) continue;
    const cols = head.map((h, c) => { const vals = body.map(x => x.r[c]).filter(v => v !== undefined && v !== ""); const nums = vals.filter(v => num(v) !== null).length, dates = vals.filter(v => dateOf(v)).length;
      return { c, h: h || `col ${c + 1}`, ht: new Set(tokens(h || "")), num: vals.length && nums / vals.length >= 0.6 && dates / vals.length < 0.5, date: vals.length && dates / vals.length >= 0.6 }; });
    const rel = c => [...c.ht].filter(t => qt.has(t)).length;
    const sheetRel = [...tokens(sheet), ...tokens(f.path)].filter(t => qt.has(t)).length;
    const numCols = cols.filter(c => c.num);
    let target = null;
    if (op !== "count") { target = numCols.slice().sort((a, b) => rel(b) - rel(a))[0]; if (target && !rel(target)) target = numCols.find(c => AMOUNT.test(c.h)) || numCols[numCols.length - 1]; if (!target) continue; }
    const filters = []; let keep = body;
    if (qMonth) { const dc = cols.filter(c => c.date); if (dc.length) { keep = keep.filter(x => dc.some(c => { const d = dateOf(x.r[c.c]); return d && d.m === qMonth && (!qYear || !d.y || d.y === +qYear); })); filters.push(`${dc.map(c => c.h).join("/")}: ${MONTHS[qMonth - 1][0]}${qYear ? " " + qYear : ""}`); } }
    for (const c of cols) { if (c.num || c.date) continue; const vals = [...new Set(body.map(x => x.r[c.c]).filter(Boolean))].slice(0, 500);
      const hit = vals.filter(v => { const vt = tokens(v); return vt.length && vt.length <= 4 && vt.every(t => qt.has(t)); });
      if (hit.length && hit.length < vals.length) { const hs = new Set(hit); keep = keep.filter(x => hs.has(x.r[c.c])); filters.push(`${c.h} = ${hit.join(" / ")}`); } }
    const score = sheetRel * 2 + (target ? rel(target) * 2 : 0) + filters.length * 1.5; // must be about this sheet, not just "how many"
    if (score <= 0) continue;
    const vals = target ? keep.map(x => num(x.r[target.c])).filter(v => v !== null) : [];
    const value = op === "count" ? keep.length : !vals.length ? null : op === "sum" ? vals.reduce((a, b) => a + b, 0) : op === "avg" ? vals.reduce((a, b) => a + b, 0) / vals.length : op === "max" ? Math.max(...vals) : Math.min(...vals);
    if (value === null) continue;
    const cand = { fid: f.id, path: f.path, sheet, op, col: target ? target.h : "", filters, value: Math.round(value * 100) / 100, n: keep.length, rows: keep.map(x => x.n), score };
    if (!best || cand.score > best.score) best = cand;
  }
  return best;
}
export const ranges = ns => { const out = []; for (const n of ns) { const l = out[out.length - 1]; if (l && n === l[1] + 1) l[1] = n; else out.push([n, n]); } return out.map(([a, b]) => a === b ? `${a}` : `${a}–${b}`).join(", "); };
export function aggText(a) {
  const opName = { sum: "total", avg: "average", count: "count of rows", max: "maximum", min: "minimum" }[a.op];
  return `Computed exactly from ${a.path} › sheet "${a.sheet}": ${opName}${a.col ? ` of "${a.col}"` : ""}${a.filters.length ? ` where ${a.filters.join(" and ")}` : ""} = ${a.value} (${a.n} rows: ${ranges(a.rows).slice(0, 200) || "none"}).`;
}
// questions that ask about the files as a whole (no strict "not found" gate for these)
export const OVERVIEW = /\b(summar\w*|overview|describe|each file|all files|every file|list (the |all )?files|what('| i)s in|outline|key points|main points)\b|সারাংশ|সংক্ষেপ|সারসংক্ষেপ|প্রতিটি ফাইল|সব ফাইল|ফাইলগুলোর|ফাইলের নাম|কী আছে|কি আছে|মূল বিষয়|বিষয়বস্তু/i;
