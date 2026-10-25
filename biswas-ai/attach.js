/* Biswas AI v109: shared output module, used by every AI section.
   - Skills (Auto, Drafting, Analysis, Excel/Accounts, Coding, Summary, Translation) add a prompt addendum.
   - The AI attaches files with a fenced block:  ```attachment name="report.docx" type="docx"  ...  ```
   - Client-side generators (no npm deps): docx, pdf (text layer with embedded Bengali font), xlsx (styles + formulas),
     csv, json, code files, md, txt, html, PNG/SVG charts.
   - A Word-like document viewer (right side on desktop, stacked on mobile): A4 page, edit, undo, history, export. */
(() => {
"use strict";
const BA = window.BA = {};
const lang = () => { try { return settings.lang === "en" ? "en" : "bn"; } catch (e) { return "bn"; } };
const T = (bn, en) => lang() === "en" ? en : bn;
const escH = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const xe = s => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const say = m => { try { toast(m); } catch (e) { /* no toast yet */ } };
const now = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };

/* ---------------- skills ---------------- */
const SPEC = `FILE ATTACHMENTS (the app turns these into real downloadable files):
- To give the user a file, put it at the END of your reply as a fenced block that starts with the word attachment:
\`\`\`attachment name="short-ascii-name.ext" type="ext"
...file content...
\`\`\`
- Types and what the content must be:
  docx, pdf: the full document in Markdown (# Title, ## headings, numbered/bulleted lists, | tables | with a header row and | --- | separator, **bold**). Optional template="letter" or template="note" or template="report".
  xlsx: one or more Markdown tables. Put "## Sheet name" on the line above each table. Numbers as plain numbers (no commas, no currency sign). Use formulas where useful, e.g. =SUM(C2:C8) in a Total row. Cell references count the header as row 1.
  csv: CSV text with a header row. json: valid JSON only. py, js, html, css, sql, sh, md, txt: the raw file text (no extra fences inside).
  png or svg (chart): add chart="bar" or chart="line" or chart="pie" and give a Markdown table: first column = labels, other columns = numbers.
- To give the same document as Word AND PDF, write it ONCE with type="docx+pdf" (do not write it twice).
- Above the attachments write a short normal answer (what the files contain, key figures). Do not repeat the whole file twice.
- Never put an attachment block inside another code block. Use plain English letters, digits and dashes in file names.
- Only attach files when they help the task or the user asked for a file. A simple question gets a normal answer without files.
- You cannot make video or audio files; if asked, say so and offer a document, table or chart instead.`;
const SKILLS = {
  auto: { bn: "স্বয়ংক্রিয়", en: "Auto", add: `SKILL: Auto. Decide from the request: an official letter, notice, memo, order or application -> answer plus attachments one docx+pdf attachment (type="docx+pdf", template="letter"); accounts, budgets, lists of numbers -> an xlsx with SUM formulas (and csv if the user wants it); a coding request -> the code file (py/js/...) plus a short explanation; data analysis or a report -> a report docx plus a png chart from the main table; JSON requested -> a json file; a chart or graph requested -> a png chart; simple questions -> no attachment.` },
  draft: { bn: "খসড়া (চিঠি/নোটিশ/মেমো)", en: "Drafting (letter, notice, memo)", add: `SKILL: Drafting. Write a complete, ready-to-sign official draft (for West Bengal government offices use: office name, Memo No. ____ Date: ____, To, Subject, body in numbered paragraphs where needed, Yours faithfully, signature block with designation, copy forwarded to). Keep the language the user used (Bengali drafts in correct standard Bengali). Always attach the draft once with type="docx+pdf" (template="letter" for letters and notices, template="note" for memos and notesheets), so the user gets both Word and PDF.` },
  analysis: { bn: "বিশ্লেষণ / রিপোর্ট", en: "Analysis / Report", add: `SKILL: Analysis/Report. Structure: # Title, ## Summary (3-5 bullets), ## Findings with a Markdown table of the key figures, ## Recommendations. Attach a report docx (template="report") with the full report, and a png chart (chart="bar" unless a trend over time suggests "line" or shares suggest "pie") built from the main table.` },
  excel: { bn: "Excel / হিসাব", en: "Excel / Accounts", add: `SKILL: Excel/Accounts. Produce the data as an xlsx attachment: clear column headers, one row per item, numbers as plain numbers, a Total row using =SUM(...) formulas for every amount column (and other formulas such as =C2*D2 where a column is computed). Several sheets are allowed (## Sheet name above each table). In the reply, show a short preview table and the totals.` },
  code: { bn: "কোডিং", en: "Coding", add: `SKILL: Coding. Give a short explanation of the approach and how to run it, then attach the complete, working code file with the right extension (py, js, html, sql, sh, json ...). Include comments, no placeholders. Show only small key parts of the code in the reply text.` },
  summary: { bn: "সারাংশ", en: "Summary", add: `SKILL: Summary. Reply with a short title, a 3-7 bullet summary, then key facts, dates and amounts as a small table if there are any. Attach a docx of the summary only if the source is long or the user asks for a file.` },
  translate: { bn: "অনুবাদ (বাংলা↔ইংরেজি)", en: "Translation (Bengali↔English)", add: `SKILL: Translation. Translate between Bengali and English (Bengali -> English, English -> Bengali; standard colloquial Bengali, correct office terms). Keep the original layout: headings, numbering and tables. Give only the translation (and a one-line note if a term is ambiguous). For text longer than a few paragraphs also attach it as docx.` }
};
BA.SKILLS = SKILLS;
BA.skill = () => { try { const s = localStorage.getItem("ba:skill"); return SKILLS[s] ? s : "auto"; } catch (e) { return "auto"; } };
BA.setSkill = s => { try { localStorage.setItem("ba:skill", SKILLS[s] ? s : "auto"); } catch (e) { /* private */ } document.querySelectorAll(".ba-skill select").forEach(x => { x.value = BA.skill(); }); };
BA.addendum = (skill) => "\n\n" + SPEC + "\n" + SKILLS[skill || BA.skill()].add;
BA.SPEC = SPEC;

/* ---------------- tolerant attachment parser ---------------- */
const EXT = { docx: 1, doc: "docx", word: "docx", pdf: 1, xlsx: 1, xls: "xlsx", excel: "xlsx", csv: 1, json: 1, py: 1, python: "py", js: 1, javascript: "js", ts: 1, html: 1, css: 1, sql: 1, sh: 1, bash: "sh", md: 1, markdown: "md", txt: 1, text: "txt", png: 1, chart: "png", svg: 1, xml: 1, yaml: 1, yml: "yaml" };
const normType = x => { x = String(x || "").toLowerCase().replace(/^\./, ""); const v = EXT[x]; return v === 1 ? x : v || ""; };
function attrs(s) {
  const o = {}; const re = /([a-zA-Z_-]+)\s*[=:]\s*(?:"([^"]*)"|'([^']*)'|“([^”]*)”|([^\s"']+))/g; let m;
  while ((m = re.exec(s))) o[m[1].toLowerCase()] = (m[2] ?? m[3] ?? m[4] ?? m[5] ?? "").trim();
  return o;
}
BA.attInfo = function (info) {
  info = String(info || "").trim();
  if (!info) return null;
  const word = (info.match(/^([A-Za-z]+)/) || [])[1] || "";
  const a = attrs(info);
  const nm = a.name || a.filename || a.file || "";
  const isAtt = /^(attachment|attach|file)$/i.test(word) || (nm && /\.[a-z0-9]{1,5}$/i.test(nm));
  if (!isAtt) return null;
  let name = nm;
  if (!name) { const bare = info.replace(/^(attachment|attach|file)\s*:?\s*/i, "").split(/\s+/)[0]; if (/\.[a-z0-9]{1,5}$/i.test(bare)) name = bare.replace(/^["']|["']$/g, ""); }
  const multi = String(a.type || a.format || "").split(/[+,/\s]+/).map(normType).filter(Boolean);
  let type = multi[0] || normType(a.type || a.format || a.kind) || normType((name.match(/\.([a-z0-9]+)$/i) || [])[1]) || normType(word);
  if (a.chart && !["png", "svg"].includes(type)) type = "png";
  if (!type) type = "txt";
  name = String(name || `file-${now()}`).replace(/[\\/:*?"<>|]+/g, "-").replace(/^\.+/, "").slice(0, 80) || "file";
  if (!new RegExp("\\." + type + "$", "i").test(name)) name = name.replace(/\.[a-z0-9]{1,5}$/i, "") + "." + type;
  const chart = ["bar", "line", "pie"].includes(String(a.chart || "").toLowerCase()) ? a.chart.toLowerCase() : (["png", "svg"].includes(type) ? "bar" : "");
  const base = name.replace(/\.[a-z0-9]{1,5}$/i, "");
  const types = [...new Set([type, ...multi.slice(1)])];
  return { name, type, types, base, chart, template: (a.template || "").toLowerCase(), title: a.title || "" };
};
BA.isAtt = info => !!BA.attInfo(info);
// v114: a code block whose first line is "attachment name=..." is an attachment too.
BA.lift = (info, text) => { if (info && BA.attInfo(info)) return { info, text }; const L = String(text || "").split("\n"); const f = (L[0] || "").trim(); return /^(attachment|attach|file)\b/i.test(f) && BA.attInfo(f) ? { info: f, text: L.slice(1).join("\n") } : null; };
// Re-attach blocks after a text clean-up step (so cleaners never damage file content).
BA.join = (text, atts) => { const seen = new Set(); return String(text || "") + atts.filter(a => !seen.has(a.info + a.content) && seen.add(a.info + a.content)).map(a => "\n\n```" + a.info + "\n" + a.content + "\n```").join(""); };
BA.protect = (fn, s) => { const p = BA.parse(s); return p.atts.length ? BA.join(fn(p.text), p.atts) : fn(s); };
// v116: models sometimes drop the opening fence: a bare "attachment name=..." line followed by content and a closing ```.
BA.fix = function (src) {
  const L = String(src || "").replace(/\r/g, "").split("\n"); let inFence = false;
  for (let i = 0; i < L.length; i++) {
    if (/^\s*(```|~~~)/.test(L[i])) { inFence = !inFence; continue; }
    if (!inFence && /^\s*(attachment|attach)\s+name\s*=/i.test(L[i]) && BA.attInfo(L[i].trim())) { L[i] = "```" + L[i].trim(); inFence = true; }
  }
  return L.join("\n");
};
BA.parse = function (src) {
  src = BA.fix(src);
  const L = String(src || "").replace(/\r/g, "").split("\n"); const keep = []; const atts = [];
  for (let i = 0; i < L.length; i++) {
    const m = L[i].match(/^\s*(`{3,}|~{3,})(.*)$/);
    let info = m && BA.attInfo(m[2]);
    if (m && !info && L[i + 1] && /^\s*(attachment|attach|file)\b/i.test(L[i + 1]) && BA.attInfo(L[i + 1].trim())) { i++; m[2] = L[i].trim(); info = BA.attInfo(m[2]); } // v114: ```json + "attachment name=..." on the next line
    if (!info) { keep.push(L[i]); continue; }
    const fence = m[1]; const buf = []; i++;
    while (i < L.length && !new RegExp("^\\s*" + fence[0] + "{" + fence.length + ",}\\s*$").test(L[i])) buf.push(L[i++]);
    for (const ty of info.types) atts.push({ ...info, type: ty, name: ty === info.type ? info.name : info.base + "." + ty, content: buf.join("\n"), info: m[2].trim() });
  }
  return { text: keep.join("\n").trim(), atts };
};

/* ---------------- shared helpers ---------------- */
const BN_DIG = "০১২৩৪৫৬৭৮৯";
const toNum = s => { const t = String(s ?? "").replace(/[০-৯]/g, d => BN_DIG.indexOf(d)).replace(/[,₹\s]|Rs\.?|INR/gi, "").replace(/^\((.*)\)$/, "-$1"); return t !== "" && /^-?\d+(\.\d+)?%?$/.test(t) ? (t.endsWith("%") ? Number(t.slice(0, -1)) / 100 : Number(t)) : null; };
BA.toNum = toNum;
const plainCell = s => (typeof plain === "function" ? plain(s) : String(s)).trim();
function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false; const s = String(text || "").replace(/^\ufeff/, "");
  const h = s.split("\n")[0];
  const sep = (h.match(/\t/g) || []).length > (h.match(/,/g) || []).length ? "\t" : (h.includes(";") && !h.includes(",") ? ";" : ",");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ""; } else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; } else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ""));
}
BA.parseCsv = parseCsv;
function tablesOf(content) {
  const src = String(content || "");
  if (typeof parseMd === "function" && /\|/.test(src)) {
    const norm = typeof pdNormTables === "function" ? pdNormTables(src) : src;
    const out = []; let lastH = "";
    for (const b of parseMd(norm)) { if (b.t === "h") lastH = plainCell(b.text); else if (b.t === "p" && /^sheet\s*[:\-]/i.test(b.text)) lastH = b.text.replace(/^sheet\s*[:\-]\s*/i, ""); else if (b.t === "table") { out.push({ name: lastH, rows: b.rows.map(r => r.map(plainCell)) }); lastH = ""; } }
    if (out.length) return out;
  }
  const rows = parseCsv(src);
  return rows.length ? [{ name: "", rows }] : [];
}
BA.tablesOf = tablesOf;
const mime = { docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", pdf: "application/pdf", csv: "text/csv", json: "application/json", py: "text/x-python", js: "text/javascript", ts: "text/plain", html: "text/html", css: "text/css", sql: "text/plain", sh: "text/x-shellscript", md: "text/markdown", txt: "text/plain", png: "image/png", svg: "image/svg+xml", xml: "application/xml", yaml: "text/yaml" };
BA.mime = mime;

/* ---------------- ZIP (store); reuses the pendrive's in-memory writer when present ---------------- */
function zipStore() {
  if (typeof pdMemZip === "function") return pdMemZip();
  const files = []; const enc = new TextEncoder();
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  return {
    file(name, data) { files.push({ name: enc.encode(name), data: typeof data === "string" ? enc.encode(data) : data }); },
    blob(type) {
      const parts = []; const cd = []; let off = 0;
      for (const f of files) {
        const c = crc(f.data); const h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, f.name.length, true);
        parts.push(h.buffer, f.name, f.data);
        const d = new DataView(new ArrayBuffer(46)); d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x0800, true); d.setUint32(16, c, true); d.setUint32(20, f.data.length, true); d.setUint32(24, f.data.length, true); d.setUint16(28, f.name.length, true); d.setUint32(42, off, true);
        cd.push(d.buffer, f.name); off += 30 + f.name.length + f.data.length;
      }
      const cdLen = cd.reduce((n, x) => n + (x.byteLength ?? x.length), 0);
      const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdLen, true); e.setUint32(16, off, true);
      return new Blob([...parts, ...cd, e.buffer], { type });
    }
  };
}

/* ---------------- DOCX (from HTML, so viewer edits export too) ---------------- */
const BN_RE = /[\u0980-\u09FF]/;
function docxRuns(node, st, out) {
  for (const n of node.childNodes) {
    if (n.nodeType === 3) {
      const txt = n.nodeValue.replace(/\s+/g, " "); if (!txt) continue;
      const pr = `<w:rPr>${st.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>' : ""}${st.b ? "<w:b/><w:bCs/>" : ""}${st.i ? "<w:i/><w:iCs/>" : ""}${st.u ? '<w:u w:val="single"/>' : ""}${st.color ? `<w:color w:val="${st.color}"/>` : ""}${st.sz ? `<w:sz w:val="${st.sz}"/><w:szCs w:val="${st.sz}"/>` : ""}${BN_RE.test(txt) ? '<w:cs/><w:lang w:bidi="bn-IN"/>' : ""}</w:rPr>`;
      out.push(`<w:r>${pr}<w:t xml:space="preserve">${xe(txt)}</w:t></w:r>`);
    } else if (n.nodeType === 1) {
      const t = n.tagName.toLowerCase();
      if (t === "br") { out.push("<w:r><w:br/></w:r>"); continue; }
      if (["ul", "ol", "table", "pre"].includes(t) && st.inline) continue;
      docxRuns(n, { ...st, b: st.b || t === "strong" || t === "b" || t === "th", i: st.i || t === "em" || t === "i", u: st.u || t === "u", code: st.code || t === "code", color: t === "a" ? "1F4E79" : st.color }, out);
    }
  }
  return out;
}
function docxFromHtml(html, opt = {}) {
  const root = document.createElement("div"); root.innerHTML = html;
  root.querySelectorAll(".ba-att, .ba-noexport, script, style, button").forEach(x => x.remove());
  const body = []; const nums = [];
  const P = (inner, ppr = "") => `<w:p><w:pPr>${ppr}</w:pPr>${inner || ""}</w:p>`;
  const runsOf = (el, st = {}) => docxRuns(el, { inline: true, ...st }, []).join("");
  const list = (el, lvl) => {
    const ordered = el.tagName.toLowerCase() === "ol";
    nums.push({ ordered, start: Number(el.getAttribute("start")) || 1 }); const id = nums.length;
    for (const li of el.children) {
      if (li.tagName.toLowerCase() !== "li") continue;
      body.push(P(runsOf(li), `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${Math.min(lvl, 2)}"/><w:numId w:val="${id}"/></w:numPr>`));
      li.querySelectorAll(":scope > ul, :scope > ol").forEach(sub => list(sub, lvl + 1));
    }
  };
  const table = el => {
    const rows = [...el.querySelectorAll("tr")]; if (!rows.length) return;
    const n = Math.max(...rows.map(r => r.children.length)); const W = 9300; const w = Math.floor(W / n);
    const bd = ["top", "left", "bottom", "right", "insideH", "insideV"].map(s => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="7F7F7F"/>`).join("");
    const head = rows[0].querySelector("th") || el.querySelector("thead");
    body.push(`<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders>${bd}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${w}"/>`.repeat(n)}</w:tblGrid>` +
      rows.map((r, ri) => { const hd = ri === 0 && head; const cells = [...r.children];
        return `<w:tr>${hd ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${Array.from({ length: n }, (_, ci) => { const c = cells[ci]; const txt = c ? c.textContent.trim() : ""; const num = toNum(txt) != null;
          return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${hd ? '<w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40"/>${num && !hd ? '<w:jc w:val="right"/>' : ""}</w:pPr>${c ? runsOf(c, { b: hd, sz: 21 }) : ""}</w:p></w:tc>`; }).join("")}</w:tr>`; }).join("") + "</w:tbl>");
    body.push(P(""));
  };
  const walk = parent => {
    for (const el of parent.childNodes) {
      if (el.nodeType === 3) { if (el.nodeValue.trim()) body.push(P(`<w:r><w:t xml:space="preserve">${xe(el.nodeValue.trim())}</w:t></w:r>`)); continue; }
      if (el.nodeType !== 1) continue;
      const t = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(t)) { const lvl = Math.min(Number(t[1]), 3); const first = !body.length; body.push(P(runsOf(el), `<w:pStyle w:val="${first && lvl <= 2 ? "Title" : "Heading" + lvl}"/>`)); continue; }
      if (t === "p") { const al = (el.style && el.style.textAlign) || ""; body.push(P(runsOf(el), al === "center" ? '<w:jc w:val="center"/>' : al === "right" ? '<w:jc w:val="right"/>' : "")); continue; }
      if (t === "ul" || t === "ol") { list(el, 0); continue; }
      if (t === "table") { table(el); continue; }
      if (t === "pre") { el.textContent.replace(/\n$/, "").split("\n").forEach(line => body.push(P(`<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${xe(line)}</w:t></w:r>`, '<w:pStyle w:val="Code"/>'))); continue; }
      if (t === "blockquote") { body.push(P(runsOf(el), '<w:pStyle w:val="Quote"/>')); continue; }
      if (t === "hr") { body.push(P("", '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>')); continue; }
      if (t === "img") continue;
      walk(el);
    }
  };
  walk(root);
  const isBn = BN_RE.test(root.textContent);
  const serif = opt.template === "letter" || opt.template === "note";
  const latin = serif ? "Times New Roman" : "Calibri";
  const hs = [0, 32, 28, 25];
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${latin}" w:hAnsi="${latin}" w:eastAsia="${latin}" w:cs="Nirmala UI"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-IN" w:bidi="bn-IN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:before="120" w:after="200"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="1F3864"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
${[1, 2, 3].map(l => `<w:style w:type="paragraph" w:styleId="Heading${l}"><w:name w:val="heading ${l}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${l === 1 ? 280 : 200}" w:after="100"/><w:outlineLvl w:val="${l - 1}"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="${l === 3 ? "404040" : "1F3864"}"/><w:sz w:val="${hs[l]}"/><w:szCs w:val="${hs[l]}"/></w:rPr></w:style>`).join("")}
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="8EA9DB"/></w:pBdr><w:ind w:left="567"/></w:pPr><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="7F7F7F"/></w:rPr></w:style>
</w:styles>`;
  const lvlXml = (ordered, l) => `<w:lvl w:ilvl="${l}"><w:start w:val="1"/><w:numFmt w:val="${ordered ? (l === 1 ? "lowerLetter" : l === 2 ? "lowerRoman" : "decimal") : "bullet"}"/><w:lvlText w:val="${ordered ? `%${l + 1}.` : ["•", "◦", "▪"][l]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 + l * 360}" w:hanging="360"/></w:pPr></w:lvl>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0">${[0, 1, 2].map(l => lvlXml(false, l)).join("")}</w:abstractNum><w:abstractNum w:abstractNumId="1">${[0, 1, 2].map(l => lvlXml(true, l)).join("")}</w:abstractNum>${nums.map((n, i) => `<w:num w:numId="${i + 1}"><w:abstractNumId w:val="${n.ordered ? 1 : 0}"/>${n.ordered ? `<w:lvlOverride w:ilvl="0"><w:startOverride w:val="${n.start}"/></w:lvlOverride>` : ""}</w:num>`).join("")}</w:numbering>`;
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:t xml:space="preserve">${isBn ? "পৃষ্ঠা " : "Page "}</w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body.join("") || "<w:p/>"}<w:sectPr><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="${serif ? 1440 : 1247}" w:header="708" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const z = zipStore();
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  z.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`);
  z.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(opt.title || "")}</dc:title><dc:creator>Biswas AI</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</dcterms:created></cp:coreProperties>`);
  z.file("word/document.xml", doc); z.file("word/styles.xml", styles); z.file("word/numbering.xml", numbering); z.file("word/footer1.xml", footer);
  return z.blob(mime.docx);
}
const mdHtml = md => typeof mdToHtml === "function" ? mdToHtml(md) : `<pre>${escH(md)}</pre>`;
BA.docxFromHtml = docxFromHtml;
BA.docxFromMd = (md, opt) => docxFromHtml(mdHtml(md), opt);

/* ---------------- XLSX writer (own XML: styled header, numbers, formulas) ---------------- */
const colName = i => { let s = ""; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const TOTAL_RE = /^(total|grand total|sum|মোট|সর্বমোট)/i;
function xlsxFromTables(tables) {
  if (!tables.length) tables = [{ name: "Sheet1", rows: [[""]] }];
  const used = new Set();
  const sheets = tables.map((tb, k) => {
    let name = String(tb.name || `Sheet${k + 1}`).replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || `Sheet${k + 1}`;
    while (used.has(name.toLowerCase())) name = name.slice(0, 27) + " " + (k + 1); used.add(name.toLowerCase());
    const rows = tb.rows.map(r => r.map(c => String(c ?? "").trim()));
    const ncol = Math.max(...rows.map(r => r.length));
    const last = rows[rows.length - 1];
    if (rows.length > 2 && TOTAL_RE.test(last[0] || "")) { // a Total row: fill empty / typed totals with SUM formulas
      for (let c = 1; c < ncol; c++) {
        const v = last[c] || ""; if (/^=/.test(v) || (v !== "" && toNum(v) == null)) continue;
        if (rows.slice(1, -1).some(r => toNum(r[c]) != null)) last[c] = `=SUM(${colName(c)}2:${colName(c)}${rows.length - 1})`;
      }
    }
    const widths = Array.from({ length: ncol }, (_, c) => Math.min(60, Math.max(8, ...rows.map(r => String(r[c] ?? "").length + 2))));
    const xml = rows.map((r, ri) => { const total = ri > 0 && TOTAL_RE.test(r[0] || ""); return `<row r="${ri + 1}">${Array.from({ length: ncol }, (_, ci) => {
      const v = r[ci] ?? ""; const ref = colName(ci) + (ri + 1);
      if (ri === 0) return `<c r="${ref}" s="1" t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
      if (/^=/.test(v)) return `<c r="${ref}" s="${total ? 4 : 2}"><f>${xe(v.slice(1))}</f></c>`;
      const n = toNum(v);
      if (n != null) return `<c r="${ref}" s="${total ? 4 : /^\d{4,}$/.test(v) && !/\./.test(v) ? 5 : 2}"><v>${n}</v></c>`;
      return v === "" ? `<c r="${ref}" s="${total ? 6 : 3}"/>` : `<c r="${ref}" s="${total ? 6 : 3}" t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
    }).join("")}</row>`; }).join("");
    return { name, xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${xml}</sheetData><autoFilter ref="A1:${colName(ncol - 1)}${rows.length}"/><pageSetup paperSize="9" orientation="${ncol > 6 ? "landscape" : "portrait"}"/></worksheet>` };
  });
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9E9E9E"/></left><right style="thin"><color rgb="FF9E9E9E"/></right><top style="thin"><color rgb="FF9E9E9E"/></top><bottom style="thin"><color rgb="FF9E9E9E"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const z = zipStore();
  z.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
  z.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><definedNames>${sheets.map((s, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xe(s.name.replace(/'/g, "''"))}'!$A$1:$A$1</definedName>`).join("")}</definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
  z.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file("xl/styles.xml", styles);
  sheets.forEach((s, i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, s.xml));
  return z.blob(mime.xlsx);
}
BA.xlsxFromTables = xlsxFromTables;

/* ---------------- charts (canvas -> PNG, or SVG) ---------------- */
const PAL = ["#1f4e79", "#c55a11", "#548235", "#7030a0", "#bf9000", "#2e75b6", "#c00000", "#00b0f0"];
function chartData(content) {
  const tb = tablesOf(content)[0]; if (!tb || tb.rows.length < 2) return null;
  const [hd, ...rows] = tb.rows;
  const body = rows.filter(r => !TOTAL_RE.test(r[0] || ""));
  const series = []; for (let c = 1; c < hd.length; c++) { const vals = body.map(r => toNum(r[c])); if (vals.some(v => v != null)) series.push({ name: hd[c], vals: vals.map(v => v || 0) }); }
  return series.length ? { labels: body.map(r => r[0]), series } : null;
}
function drawChart(ctx, kind, d, title, Wd, Ht) {
  const F = '"Noto Sans Bengali", "Noto Sans", sans-serif';
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, Wd, Ht);
  ctx.fillStyle = "#1a1a1a"; ctx.font = `600 22px ${F}`; ctx.textAlign = "center"; ctx.fillText(title, Wd / 2, 34);
  if (kind === "pie") {
    const s = d.series[0]; const tot = s.vals.reduce((a, b) => a + Math.max(0, b), 0) || 1; let a0 = -Math.PI / 2; const cx = Wd * 0.36, cy = Ht / 2 + 18, r = Math.min(Wd, Ht) * 0.34;
    s.vals.forEach((v, i) => { const a1 = a0 + Math.max(0, v) / tot * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); ctx.fillStyle = PAL[i % PAL.length]; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); a0 = a1; });
    ctx.textAlign = "left"; ctx.font = `15px ${F}`;
    d.labels.forEach((l, i) => { const y = 80 + i * 28; if (y > Ht - 20) return; ctx.fillStyle = PAL[i % PAL.length]; ctx.fillRect(Wd * 0.68, y - 13, 16, 16); ctx.fillStyle = "#222"; ctx.fillText(`${l} (${(Math.max(0, s.vals[i]) / tot * 100).toFixed(1)}%)`, Wd * 0.68 + 24, y); });
    return;
  }
  const L = 100, R = 30, Tp = 70, B = 90; const pw = Wd - L - R, ph = Ht - Tp - B;
  const all = d.series.flatMap(s => s.vals); let max = Math.max(0, ...all), min = Math.min(0, ...all); if (max === min) max = min + 1;
  const raw = (max - min) / 5; const step = Math.pow(10, Math.floor(Math.log10(raw))); const nice = [1, 2, 2.5, 5, 10].map(m => m * step).find(s => s >= raw) || step * 10;
  max = Math.ceil(max / nice) * nice; min = Math.floor(min / nice) * nice;
  const y = v => Tp + ph - (v - min) / (max - min) * ph;
  ctx.font = `13px ${F}`; ctx.textAlign = "right"; ctx.strokeStyle = "#e3e3e3"; ctx.lineWidth = 1;
  for (let v = min; v <= max + nice / 1000; v += nice) { ctx.beginPath(); ctx.moveTo(L, y(v)); ctx.lineTo(L + pw, y(v)); ctx.stroke(); ctx.fillStyle = "#555"; ctx.fillText(Number(v.toFixed(6)).toLocaleString("en-IN"), L - 8, y(v) + 4); }
  ctx.strokeStyle = "#888"; ctx.beginPath(); ctx.moveTo(L, Tp); ctx.lineTo(L, Tp + ph); ctx.lineTo(L + pw, Tp + ph); ctx.stroke();
  const n = d.labels.length, gw = pw / n;
  d.labels.forEach((l, i) => { ctx.save(); ctx.translate(L + gw * (i + 0.5), Tp + ph + 18); if (n > 6) ctx.rotate(-Math.PI / 6); ctx.textAlign = n > 6 ? "right" : "center"; ctx.fillStyle = "#333"; ctx.fillText(String(l).slice(0, 22), 0, 0); ctx.restore(); });
  d.series.forEach((s, k) => {
    ctx.fillStyle = ctx.strokeStyle = PAL[k % PAL.length];
    if (kind === "line") { ctx.lineWidth = 3; ctx.beginPath(); s.vals.forEach((v, i) => { const X = L + gw * (i + 0.5); i ? ctx.lineTo(X, y(v)) : ctx.moveTo(X, y(v)); }); ctx.stroke(); s.vals.forEach((v, i) => { ctx.beginPath(); ctx.arc(L + gw * (i + 0.5), y(v), 4, 0, 7); ctx.fill(); }); }
    else { const bw = gw * 0.75 / d.series.length; s.vals.forEach((v, i) => { const X = L + gw * i + gw * 0.125 + bw * k; ctx.fillRect(X, Math.min(y(v), y(0)), bw - 2, Math.abs(y(v) - y(0))); }); }
  });
  if (d.series.length > 1 || kind === "line") { ctx.textAlign = "left"; ctx.font = `14px ${F}`; let x = L; d.series.forEach((s, k) => { ctx.fillStyle = PAL[k % PAL.length]; ctx.fillRect(x, Ht - 26, 14, 14); ctx.fillStyle = "#222"; ctx.fillText(s.name, x + 20, Ht - 14); x += ctx.measureText(s.name).width + 50; }); }
}
const dataUrl = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
async function chartBlob(content, kind, title, type) {
  const d = chartData(content); if (!d) throw new Error(T("চার্টের জন্য সংখ্যার টেবিল পাওয়া যায়নি", "No numeric table found for the chart"));
  try { await document.fonts.load('16px "Noto Sans Bengali"'); } catch (e) { /* fallback font */ }
  const Wd = 1000, Ht = 600; const c = document.createElement("canvas"); c.width = Wd; c.height = Ht;
  drawChart(c.getContext("2d"), kind || "bar", d, title, Wd, Ht);
  const png = await new Promise(r => c.toBlob(r, "image/png"));
  if (type !== "svg") return png;
  return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${Wd}" height="${Ht}" viewBox="0 0 ${Wd} ${Ht}"><title>${xe(title)}</title><image width="${Wd}" height="${Ht}" xlink:href="${await dataUrl(png)}"/></svg>`], { type: mime.svg });
}
BA.chartBlob = chartBlob;

/* ---------------- PDF: browser-rendered pages + invisible text layer (embedded Noto font) ---------------- */
let fontB64 = null;
async function pdfFont() {
  if (fontB64) return fontB64;
  const buf = new Uint8Array(await (await fetch("/fonts/ba-pdf.ttf")).arrayBuffer());
  let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return (fontB64 = btoa(s));
}
function textLines(root) {
  const words = []; const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const rg = document.createRange();
  while ((n = tw.nextNode())) {
    const s = n.nodeValue; const re = /\S+/g; let m; const fs = parseFloat(getComputedStyle(n.parentElement).fontSize) || 16;
    while ((m = re.exec(s))) { rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const r = rg.getBoundingClientRect(); if (r.width || r.height) words.push({ t: m[0], x: r.left, y: r.top, h: r.height, fs }); }
  }
  const lines = [];
  for (const w of words) { const l = lines.length && lines[lines.length - 1]; if (l && Math.abs(l.y - w.y) < Math.max(3, w.h * 0.4) && w.x >= l.x2 - 2) { l.t += " " + w.t; l.x2 = w.x + 1; l.h = Math.max(l.h, w.h); } else lines.push({ t: w.t, x: w.x, y: w.y, x2: w.x + 1, h: w.h, fs: w.fs }); }
  return lines;
}
async function pdfFromHtml(html, opt = {}) {
  if (typeof load === "function") await load("html2pdf");
  const landscape = !!opt.landscape; const inner = landscape ? 267 : 180; const pageH = (landscape ? 210 : 297) - 30;
  const host = document.createElement("div"); host.style.cssText = "position:fixed;left:-20000px;top:0;";
  const sheet = document.createElement("div"); sheet.className = "pdf-doc ba-a4"; sheet.style.width = inner + "mm"; sheet.innerHTML = html;
  sheet.querySelectorAll(".ba-att, .ba-noexport, button").forEach(x => x.remove());
  host.append(sheet); document.body.append(host);
  try {
    await document.fonts.ready;
    const box = sheet.getBoundingClientRect(); const k = inner / box.width;
    const lines = textLines(sheet).map(l => ({ ...l, mx: (l.x - box.left) * k, my: (l.y - box.top) * k, mh: l.h * k, pt: l.fs * k / 0.3528 }));
    const pdf = await window.html2pdf().set({ margin: [15, 15, 15, 15], image: { type: "jpeg", quality: 0.95 }, html2canvas: { scale: 2, backgroundColor: "#ffffff" }, jsPDF: { unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" }, pagebreak: { mode: ["css", "legacy"] } }).from(sheet).toPdf().get("pdf");
    try {
      const b64 = await pdfFont();
      pdf.addFileToVFS("ba-pdf.ttf", b64); pdf.addFont("ba-pdf.ttf", "BAPDF", "normal"); pdf.setFont("BAPDF", "normal");
      const pages = pdf.getNumberOfPages();
      for (const l of lines) {
        const pg = Math.floor((l.my + l.mh / 2) / pageH); if (pg >= pages) continue;
        pdf.setPage(pg + 1); pdf.setFontSize(Math.max(4, Math.min(40, l.pt)));
        pdf.text(l.t, 15 + l.mx, 15 + (l.my - pg * pageH) + l.mh * 0.78, { renderingMode: "invisible" });
      }
      pdf.setProperties({ title: opt.title || "Biswas AI document", creator: "Biswas AI" });
    } catch (e) { console.warn("pdf text layer skipped", e); }
    return pdf.output("blob");
  } finally { host.remove(); }
}
BA.pdfFromHtml = pdfFromHtml;
BA.pdfFromMd = (md, opt) => pdfFromHtml(mdHtml(md), opt);

/* ---------------- build any attachment ---------------- */
BA.build = async function (a) {
  const type = a.type;
  if (a.html && type === "docx") return BA.docxFromHtml(a.content, { template: a.template, title: a.title || a.name });
  if (a.html && type === "pdf") return BA.pdfFromHtml(a.content, { title: a.title || a.name });
  if (type === "docx") return BA.docxFromMd(a.content, { template: a.template, title: a.title || a.name });
  if (type === "pdf") return BA.pdfFromMd(a.content, { title: a.title || a.name, landscape: /landscape/i.test(a.template || "") });
  if (type === "xlsx") return xlsxFromTables(tablesOf(a.content));
  if (type === "png" || type === "svg") return chartBlob(a.content, a.chart, a.title || a.name.replace(/\.[a-z]+$/i, "").replace(/[-_]+/g, " "), type);
  let text = String(a.content || "");
  if (type === "json") { try { text = JSON.stringify(JSON.parse(text), null, 2); } catch (e) { /* keep as written */ } }
  if (type === "csv") { if (/^\s*\|/.test(text)) { const t = tablesOf(text)[0]; if (t) text = t.rows.map(r => r.map(c => /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(",")).join("\r\n"); } text = "\ufeff" + text; }
  return new Blob([text.endsWith("\n") ? text : text + "\n"], { type: (mime[type] || "text/plain") + ";charset=utf-8" });
};
BA.jsonOk = s => { try { JSON.parse(s); return true; } catch (e) { return false; } };

/* ---------------- attachment cards ---------------- */
const REG = BA.reg = new Map();
const ICON = { docx: "📝", pdf: "📕", xlsx: "📊", csv: "📊", json: "🧾", png: "📈", svg: "📈", md: "📄", txt: "📄", html: "🌐" };
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
BA.cardHtml = function (info, content) {
  const inf = typeof info === "string" ? BA.attInfo(info) : info;
  if (inf.types && inf.types.length > 1) return inf.types.map(ty => BA.cardHtml({ ...inf, types: [ty], type: ty, name: ty === inf.type ? inf.name : inf.base + "." + ty }, content)).join("");
  const a = { ...inf, content: String(content || "") };
  const id = "a" + hash(a.name + "|" + a.type + "|" + a.content); REG.set(id, a);
  const kb = Math.max(1, Math.round(new Blob([a.content]).size / 1024));
  const warn = a.type === "json" && !BA.jsonOk(a.content) ? `<small class="ba-warn">${escH(T("JSON ঠিক নয়, যেমন আছে তেমন দেওয়া হবে", "JSON is not valid; it is given as written"))}</small>` : "";
  return `<div class="ba-att" data-ba-att="${id}" data-type="${escH(a.type)}"><span class="ba-ico" aria-hidden="true">${ICON[a.type] || "💻"}</span><span class="ba-meta"><b>${escH(a.name)}</b><small>${escH(a.type.toUpperCase())}${a.chart ? " · " + escH(a.chart) + " chart" : ""} · ~${kb} KB</small>${warn}</span><span class="ba-btns">`
    + `<button class="btn small primary" type="button" data-ba="dl" data-id="${id}">⬇ ${escH(T("ডাউনলোড", "Download"))}</button>`
    + `<button class="btn small" type="button" data-ba="open" data-id="${id}">👁 ${escH(T("দেখুন", "Preview"))}</button>`
    + `<button class="btn small" type="button" data-ba="pd" data-id="${id}">💾 ${escH(T("পেনড্রাইভে", "To pendrive"))}</button>`
    + `<button class="btn small" type="button" data-ba="share" data-id="${id}">↗ ${escH(T("শেয়ার", "Share"))}</button></span></div>`;
};
async function fileOf(a) { const b = await BA.build(a); return new File([b], a.name, { type: (mime[a.type] || "application/octet-stream") }); }
BA.fileOf = fileOf;
async function download(blob, name) {
  if (typeof saveFile === "function") { try { await saveFile(name, blob); return; } catch (e) { if (e && e.code === "declined") return; } }
  const u = URL.createObjectURL(blob); const x = document.createElement("a"); x.href = u; x.download = name; document.body.append(x); x.click(); x.remove(); setTimeout(() => URL.revokeObjectURL(u), 15000);
}
BA.download = download;
async function toPendrive(file, text) {
  let tok = ""; try { tok = pd.token; } catch (e) { /* no pendrive */ }
  if (!tok || typeof pdQueue !== "function") return say(T("আগে AI পেনড্রাইভ খুলুন (নাম ও PIN দিয়ে), তারপর আবার চাপুন", "Open your AI Pendrive first (name and PIN), then press again"));
  let cwd = ""; try { cwd = pd.cwd || ""; } catch (e) { /* root */ }
  const path = (cwd ? cwd + "/" : "") + "AI outputs/" + file.name;
  pdQueue([{ file, path, text: text || "" }]);
  say(T("পেনড্রাইভে রাখা হচ্ছে: ", "Saving to pendrive: ") + path);
}
async function share(file, text) {
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: file.name }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(text); say(T("এখানে সরাসরি শেয়ার হয় না, লেখাটি কপি হয়েছে", "Direct sharing isn't available here; the text was copied")); } catch (e) { await download(file, file.name); }
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-ba]"); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const act = b.dataset.ba;
  if (act === "skill-help") return say(T("স্কিল বেছে নিলে AI সেই কাজের মতো উত্তর আর ফাইল দেয় (Word, PDF, Excel, CSV, JSON, কোড, চার্ট ছবি)। ভিডিও বানানো যায় না।", "Pick a skill and the AI answers in that format with files (Word, PDF, Excel, CSV, JSON, code, chart images). Video can't be made."));
  if (act.startsWith("v-")) return viewerAct(act.slice(2), b);
  const a = REG.get(b.dataset.id); if (!a) return;
  const label = b.textContent; b.disabled = true; b.textContent = "…";
  try {
    if (act === "open") { await openAtt(a); return; }
    const f = await fileOf(a);
    if (act === "dl") await download(f, a.name);
    else if (act === "pd") await toPendrive(f, a.content);
    else if (act === "share") await share(f, a.content);
  } catch (err) { say((err && err.message) || T("ফাইল বানানো গেল না", "Could not make the file")); }
  finally { b.disabled = false; b.textContent = label; }
}, true);

/* ---------------- code blocks: highlight + copy ---------------- */
const KW = /\b(def|class|return|if|elif|else|for|while|in|import|from|as|with|try|except|finally|raise|lambda|yield|None|True|False|and|or|not|function|const|let|var|new|async|await|export|default|null|undefined|true|false|this|switch|case|break|continue|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE|JOIN|GROUP|ORDER|BY|print)\b/g;
function highlight(code) {
  const out = []; const re = /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(#[^\n]*|\/\/[^\n]*)|(\b\d+(?:\.\d+)?\b)/g; let last = 0, m;
  const kw = s => escH(s).replace(KW, '<span class="tk-k">$1</span>');
  while ((m = re.exec(code))) { out.push(kw(code.slice(last, m.index))); out.push(`<span class="${m[1] ? "tk-s" : m[2] ? "tk-c" : "tk-n"}">${escH(m[0])}</span>`); last = m.index + m[0].length; }
  out.push(kw(code.slice(last)));
  return out.join("");
}
BA.highlight = highlight;
function enhanceCode(root) {
  root.querySelectorAll(".doc pre > code:not([data-ba-hl]), .ba-page pre > code:not([data-ba-hl]), .pd-out-doc pre > code:not([data-ba-hl])").forEach(c => {
    c.dataset.baHl = "1"; const pre = c.parentElement;
    if (c.textContent.length < 60000) c.innerHTML = highlight(c.textContent);
    const bt = document.createElement("button"); bt.type = "button"; bt.className = "btn small ba-copy ba-noexport"; bt.textContent = T("কপি", "Copy");
    bt.addEventListener("click", async ev => { ev.stopPropagation(); try { await navigator.clipboard.writeText(c.textContent); bt.textContent = "✓"; setTimeout(() => { bt.textContent = T("কপি", "Copy"); }, 1500); } catch (e) { say("Copy failed"); } });
    pre.style.position = "relative"; pre.append(bt);
  });
}

/* ---------------- document viewer ---------------- */
const HKEY = "ba:hist";
const hist = () => { try { return JSON.parse(localStorage.getItem(HKEY) || "[]"); } catch (e) { return []; } };
const histSave = h => { let n = 30; while (n > 0) { try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, n))); return; } catch (e) { n = Math.floor(n / 2); } } };
let V = null; const undo = []; let cur = null;
function viewerEl() {
  if (V) return V;
  V = document.createElement("aside"); V.id = "ba-viewer"; V.hidden = true; V.setAttribute("aria-label", "Document");
  V.innerHTML = `<div class="ba-vbar"><b id="ba-vtitle"></b><span class="ba-vtools">
    <button class="btn small" type="button" data-ba="v-edit" id="ba-vedit"></button><button class="btn small" type="button" data-ba="v-undo" id="ba-vundo"></button>
    <button class="btn small primary" type="button" data-ba="v-docx">Word</button><button class="btn small" type="button" data-ba="v-pdf">PDF</button><button class="btn small" type="button" data-ba="v-txt">TXT</button><button class="btn small" type="button" data-ba="v-xlsx" id="ba-vxlsx">Excel</button>
    <button class="btn small" type="button" data-ba="v-print" id="ba-vprint"></button><button class="btn small" type="button" data-ba="v-copy" id="ba-vcopy"></button><button class="btn small" type="button" data-ba="v-pd" id="ba-vpd"></button><button class="btn small" type="button" data-ba="v-share" id="ba-vshare"></button>
    <select id="ba-vhist" aria-label="History"></select><button class="btn small" type="button" data-ba="v-close" aria-label="Close">✕</button></span></div>
    <div class="ba-vscroll"><div class="ba-page" id="ba-vpage" spellcheck="false"></div></div>
    <p class="ba-vhelp" id="ba-vhelp"></p>`;
  document.body.append(V);
  V.querySelector("#ba-vpage").addEventListener("input", () => { if (!cur) return; clearTimeout(V._t); V._t = setTimeout(snap, 600); });
  V.querySelector("#ba-vhist").addEventListener("change", e => { const h = hist()[Number(e.target.value)]; if (h) show(h.html, h.title, { noHist: true, md: h.md, id: h.id }); });
  return V;
}
function snap() { const pg = V.querySelector("#ba-vpage"); if (undo[undo.length - 1] !== pg.innerHTML) undo.push(pg.innerHTML); if (undo.length > 50) undo.shift(); if (cur) { cur.html = pg.innerHTML; const h = hist(); const i = h.findIndex(x => x.id === cur.id); if (i >= 0) { h[i].html = cur.html; histSave(h); } } }
function labels() {
  V.querySelector("#ba-vedit").textContent = V.querySelector("#ba-vpage").isContentEditable ? "✓ " + T("সম্পাদনা শেষ", "Done editing") : "✎ " + T("সম্পাদনা", "Edit");
  V.querySelector("#ba-vundo").textContent = "↶ " + T("আগের রূপ", "Undo");
  V.querySelector("#ba-vprint").textContent = T("প্রিন্ট", "Print"); V.querySelector("#ba-vcopy").textContent = T("কপি", "Copy");
  V.querySelector("#ba-vpd").textContent = "💾 " + T("পেনড্রাইভে", "To pendrive"); V.querySelector("#ba-vshare").textContent = "↗ " + T("শেয়ার", "Share");
  V.querySelector("#ba-vhelp").textContent = T("A4 পাতা। 'সম্পাদনা' চেপে নিজে বদলান, তারপর Word/PDF/TXT নিন। ভিডিও বানানো যায় না; চার্ট ছবি (PNG) হিসেবে পাওয়া যায়।", "A4 page. Press Edit to change it yourself, then export Word/PDF/TXT. Video can't be made; charts come as PNG images.");
  const h = hist(); V.querySelector("#ba-vhist").innerHTML = `<option value="">${escH(T("আগের উত্তর", "History"))} (${h.length})</option>` + h.map((x, i) => `<option value="${i}">${escH(new Date(x.at).toLocaleString().slice(0, 17))} · ${escH(String(x.title).slice(0, 40))}</option>`).join("");
  V.querySelector("#ba-vxlsx").hidden = !V.querySelector("#ba-vpage table");
}
function titleOf(html) { const d = document.createElement("div"); d.innerHTML = html; d.querySelectorAll(".ba-att,button").forEach(x => x.remove()); const h = d.querySelector("h1,h2,h3,h4,p,li,td"); return ((h && h.textContent) || T("নথি", "Document")).trim().slice(0, 80); }
function show(html, title, o = {}) {
  viewerEl(); const pg = V.querySelector("#ba-vpage");
  pg.innerHTML = html; pg.querySelectorAll(".ba-copy").forEach(x => x.remove()); pg.querySelectorAll("[data-ba-hl]").forEach(x => x.removeAttribute("data-ba-hl"));
  pg.contentEditable = "false"; undo.length = 0; undo.push(pg.innerHTML);
  cur = { id: o.id || "h" + hash(html), html, title: title || titleOf(html), md: o.md || "" };
  V.querySelector("#ba-vtitle").textContent = cur.title;
  if (!o.noHist) { const h = hist().filter(x => x.id !== cur.id); h.unshift({ id: cur.id, title: cur.title, html: html.slice(0, 300000), md: (o.md || "").slice(0, 200000), at: Date.now() }); histSave(h); }
  enhanceCode(pg); labels(); V.hidden = false; document.body.classList.add("ba-open");
}
BA.show = show;
BA.showMd = (md, title) => show(mdHtml(md), title, { md });
async function openAtt(a) {
  let html;
  if (a.html) html = a.content;
  else if (a.type === "docx" || a.type === "pdf" || a.type === "md") html = mdHtml(a.content);
  else if (a.type === "xlsx" || a.type === "csv") html = tablesOf(a.content).map(t => `${t.name ? `<h3>${escH(t.name)}</h3>` : ""}<table><thead><tr>${t.rows[0].map(c => `<th>${escH(c)}</th>`).join("")}</tr></thead><tbody>${t.rows.slice(1).map(r => `<tr>${r.map(c => `<td>${escH(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`).join("");
  else if (a.type === "png" || a.type === "svg") html = `<h3>${escH(a.name)}</h3><p><img alt="${escH(a.name)}" src="${await dataUrl(await chartBlob(a.content, a.chart, a.title || a.name.replace(/\.[a-z]+$/i, ""), "png"))}" style="max-width:100%"></p>`;
  else html = `<h3>${escH(a.name)}</h3><pre><code>${escH(a.type === "json" && BA.jsonOk(a.content) ? JSON.stringify(JSON.parse(a.content), null, 2) : a.content)}</code></pre>`;
  show(html, a.name, { md: ["docx", "pdf", "md"].includes(a.type) ? a.content : "" });
}
BA.openAtt = openAtt;
function pageText() { return (V.querySelector("#ba-vpage").innerText || "").replace(/\n{3,}/g, "\n\n").trim() + "\n"; }
function baseName() { const t = (cur && cur.title || "").replace(/\.[a-z0-9]+$/i, ""); const a = t.replace(/[^A-Za-z0-9 ._-]/g, " ").trim().replace(/\s+/g, "-").slice(0, 40); return (a.length >= 3 ? a : "document") + "-" + now(); }
async function viewerAct(act, btn) {
  const pg = V && V.querySelector("#ba-vpage"); if (!pg) return;
  if (act === "close") { V.hidden = true; document.body.classList.remove("ba-open"); return; }
  if (act === "edit") { const on = !pg.isContentEditable; pg.contentEditable = on ? "true" : "false"; if (on) pg.focus(); else snap(); labels(); return; }
  if (act === "undo") { snap(); if (undo.length > 1) { undo.pop(); pg.innerHTML = undo[undo.length - 1]; } else say(T("আর আগের রূপ নেই", "Nothing more to undo")); return; }
  const html = pg.innerHTML; const label = btn.textContent; btn.disabled = true; btn.textContent = "…";
  try {
    if (act === "docx") await download(docxFromHtml(html, { title: cur && cur.title }), baseName() + ".docx");
    else if (act === "pdf") await download(await pdfFromHtml(html, { title: cur && cur.title }), baseName() + ".pdf");
    else if (act === "txt") await download(new Blob(["\ufeff" + pageText()], { type: "text/plain;charset=utf-8" }), baseName() + ".txt");
    else if (act === "xlsx") await download(xlsxFromTables([...pg.querySelectorAll("table")].map((t, i) => ({ name: "Table " + (i + 1), rows: [...t.querySelectorAll("tr")].map(r => [...r.children].map(c => c.textContent.trim())) }))), baseName() + ".xlsx");
    else if (act === "print") printHtml(html);
    else if (act === "copy") { await navigator.clipboard.writeText(pageText()); say(T("কপি হয়েছে", "Copied")); }
    else if (act === "pd") await toPendrive(new File([docxFromHtml(html)], baseName() + ".docx", { type: mime.docx }), pageText());
    else if (act === "share") await share(new File([docxFromHtml(html)], baseName() + ".docx", { type: mime.docx }), pageText());
  } catch (e) { say((e && e.message) || T("ফাইল বানানো গেল না", "Could not make the file")); }
  finally { btn.disabled = false; btn.textContent = label; }
}
function printHtml(html) {
  const f = document.createElement("iframe"); f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&family=Noto+Serif+Bengali:wght@400;700&display=swap"><style>@page{size:A4;margin:18mm 16mm}body{font:12pt/1.6 "Noto Serif","Noto Serif Bengali",serif;color:#000}table{border-collapse:collapse;width:100%}th{background:#d9e2f3}th,td{border:1px solid #666;padding:4px 6px;text-align:left;vertical-align:top}pre{background:#f4f4f4;padding:8px;white-space:pre-wrap}blockquote{border-left:4px solid #8ea9db;margin:0 0 8pt;padding-left:10px;color:#333}.ba-copy,.ba-att{display:none}</style></head><body>${html}</body></html>`;
  f.onload = () => setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { say("Print failed"); } setTimeout(() => f.remove(), 60000); }, 400);
  document.body.append(f);
}

/* ---------------- skill selector + per-answer "Document view" (all sections) ---------------- */
function skillSel(cls) {
  const w = document.createElement("div"); w.className = "ba-skill " + (cls || "");
  w.innerHTML = `<label>${escH(T("স্কিল", "Skill"))} <select aria-label="Skill">${Object.entries(SKILLS).map(([k, s]) => `<option value="${k}">${escH(lang() === "en" ? s.en : s.bn)}</option>`).join("")}</select></label><button type="button" class="ba-help" data-ba="skill-help" aria-label="Help">?</button><small>${escH(T("Word · PDF · Excel · কোড · চার্ট", "Word · PDF · Excel · code · charts"))}</small>`;
  w.querySelector("select").value = BA.skill();
  w.querySelector("select").addEventListener("change", e => BA.setSkill(e.target.value));
  w.dataset.lang = lang();
  return w;
}
function mountSkills() {
  document.querySelectorAll(".ba-skill").forEach(x => { if (x.dataset.lang !== lang()) x.remove(); });
  const q = document.getElementById("q");
  if (q && !document.querySelector(".ba-skill.main")) { const form = q.closest("form") || q.parentElement; form.before(skillSel("main")); }
  const ag = document.getElementById("ag-form");
  if (ag && !document.querySelector(".ba-skill.ag")) ag.before(skillSel("ag"));
  const pq = document.getElementById("pd-q");
  if (pq && !document.querySelector(".ba-skill.pd")) { const f = pq.closest(".field") || pq; f.after(skillSel("pd")); }
}
function msgMd(el) {
  const msg = el.closest(".msg.ai[data-k]");
  try { if (msg && Array.isArray(messages)) { const m = messages[Number(msg.dataset.k)]; if (m && m.content) return m.content; } } catch (e) { /* not available */ }
  return "";
}
/* v118: deterministic attachments. The model may forget the attachment block; build the files from the answer itself. */
const INTENT = {
  excel: /excel|xlsx|spreadsheet|\bsheet\b|accounts?|budget|ledger|expense|হিসাব|এক্সেল|শিট|খরচ|বাজেট|খতিয়ান/i,
  draft: /letter|application|notice|memo|notesheet|petition|চিঠি|আবেদন|নোটিশ|মেমো|পত্র|নোটশিট|\bword\b|docx|\bpdf\b/i,
  code: /python|\bcode\b|script|javascript|program|\.py\b|\bsql\b|\bhtml\b|কোড|প্রোগ্রাম/i,
  json: /\bjson\b/i,
  chart: /chart|graph|plot|চার্ট|গ্রাফ|লেখচিত্র/i
};
function intents(q) {
  const k = BA.skill(), out = new Set();
  if (k === "excel") out.add("excel"); if (k === "draft") out.add("draft"); if (k === "code") out.add("code"); if (k === "analysis") out.add("chart");
  for (const [n, re] of Object.entries(INTENT)) if (re.test(q || "")) out.add(n);
  return out;
}
BA.intents = intents;
const isNum = c => toNum(String(c || "").trim()) !== null;
function domTables(doc) {
  const out = [...doc.querySelectorAll("table")].map(tb => [...tb.querySelectorAll("tr")].map(tr => [...tr.children].map(td => td.innerText.trim()))).filter(r => r.length >= 2);
  if (out.length) return out;
  const blocks = [...doc.querySelectorAll("p, li, pre, td")]; const lines = (blocks.length ? blocks.map(x => x.textContent.replace(/(Copy|কপি)$/, "")).join("\n") : doc.textContent).split("\n"); let cur = [];
  const flush = () => { if (cur.length >= 2) out.push(cur); cur = []; };
  for (const l of lines) { const cells = /\t/.test(l) ? l.split("\t") : /\|.*\|/.test(l) ? l.replace(/^\s*\||\|\s*$/g, "").split("|") : null; if (cells && cells.length >= 2 && !/^[\s|:-]+$/.test(l)) cur.push(cells.map(c => c.trim())); else flush(); }
  flush(); return out;
}
function tableMd(rows, withTotal) {
  const w = Math.max(...rows.map(r => r.length)); const R = rows.map(r => { const x = r.slice(); while (x.length < w) x.push(""); return x; });
  const numCols = [...Array(w).keys()].filter(c => R.slice(1).filter(r => isNum(r[c])).length >= Math.max(1, (R.length - 1) * 0.6));
  const hasTotal = R.slice(1).some(r => /^(total|grand total|sum|মোট|সর্বমোট)/i.test(String(r[0] || "").trim()));
  const body = R.map(r => r.map((c, j) => j > 0 && numCols.includes(j) && isNum(c) && R.indexOf(r) > 0 ? String(toNum(c)) : c.replace(/\|/g, "/")));
  if (withTotal && numCols.length && !hasTotal) { const last = body.length; body.push(R[0].map((_, j) => j === 0 ? (lang() === "en" ? "Total" : "মোট") : numCols.includes(j) ? `=SUM(${String.fromCharCode(65 + j)}2:${String.fromCharCode(65 + j)}${last})` : "")); }
  return { md: ["| " + body[0].join(" | ") + " |", "| " + body[0].map(() => "---").join(" | ") + " |", ...body.slice(1).map(r => "| " + r.join(" | ") + " |")].join("\n"), numCols };
}
const AEXT = { python: "py", py: "py", javascript: "js", js: "js", node: "js", typescript: "ts", ts: "ts", html: "html", css: "css", sql: "sql", bash: "sh", sh: "sh", shell: "sh", json: "json", yaml: "yaml", yml: "yaml", xml: "xml", csv: "csv" };
const slug = s => (String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "biswas-ai");
function autoAtt(root) {
  const boxes = [];
  root.querySelectorAll(".msg.ai").forEach(m => { if (!m.querySelector(".actions")) return; const doc = m.querySelector(".doc") || m.querySelector(".bubble"); let u = m.previousElementSibling; while (u && !u.matches(".msg.user")) u = u.previousElementSibling; if (doc) boxes.push({ host: m, doc, q: u ? u.innerText : "" }); });
  root.querySelectorAll("article.job").forEach(j => { if (!j.querySelector(".actions")) return; const doc = j.querySelector(".doc"); if (doc) boxes.push({ host: j, doc, q: (j.querySelector(".job-ask") || {}).innerText || "" }); });
  const pdo = document.getElementById("pd-out-doc"); if (pdo && pdo.innerText.trim().length > 20 && !document.querySelector("#pd-out[aria-busy=true]")) boxes.push({ host: pdo.closest(".pd-out") || pdo, doc: pdo, q: (document.getElementById("pd-q") || {}).value || BA.lastPdQ || "" });
  for (const b of boxes) {
    const sig = b.doc.innerText.length + ":" + b.q.length; if (b.doc.dataset.baAuto === sig) continue;
    const want = intents(b.q); if (!want.size) { b.doc.dataset.baAuto = sig; continue; }
    const have = new Set([...b.host.querySelectorAll(".ba-att")].map(x => x.dataset.type));
    const clone = b.doc.cloneNode(true); clone.querySelectorAll(".ba-att, .ba-auto, button, .ba-noexport").forEach(x => x.remove());
    const park = document.createElement("div"); park.style.cssText = "position:fixed;left:-30000px;top:0;width:800px"; park.append(clone); document.body.append(park);
    let text, tables; try { text = clone.innerText.trim(); tables = domTables(clone).filter(t => t[0].length >= 2); } finally { park.remove(); }
    if (text.length < 15) continue;
    const base = slug(b.q.replace(/[^\x00-\x7f]/g, " ")) ; const cards = [];
    if (want.has("excel") && !have.has("xlsx") && tables.length) cards.push(BA.cardHtml({ name: (base === "biswas-ai" ? "hisab" : base) + ".xlsx", type: "xlsx", types: ["xlsx"] }, tables.map((t, i) => (tables.length > 1 ? `## Sheet${i + 1}\n` : "") + tableMd(t, true).md).join("\n\n")));
    const chartOk = [...b.host.querySelectorAll('.ba-att[data-type="png"], .ba-att[data-type="svg"]')].some(x => { const a = REG.get(x.dataset.baAtt); return a && tablesOf(a.content).some(t => t.rows.length > 1 && t.rows.slice(1).some(r => r.slice(1).some(c => toNum(c) !== null))); }); // v121: a model chart with no numbers does not count
    if (want.has("chart") && !chartOk) { const t = tables.map(t => ({ t, m: tableMd(t, false) })).find(x => x.m.numCols.length); if (t) cards.push(BA.cardHtml({ name: (base === "biswas-ai" ? "chart" : base) + ".png", type: "png", types: ["png"], chart: /trend|month|year|মাস|বছর/i.test(b.q) ? "line" : "bar", title: "" }, t.m.md)); }
    if (want.has("code")) { const seen = {}; clone.querySelectorAll("pre").forEach((pre, i) => { const lg = (pre.dataset.lang || "").toLowerCase(); const ext = AEXT[lg] || (/^\s*(def |import |print\()/m.test(pre.textContent) ? "py" : /^\s*(const |let |function |console\.)/m.test(pre.textContent) ? "js" : ""); if (!ext || ext === "json" || have.has(ext) || seen[ext]) return; seen[ext] = 1; cards.push(BA.cardHtml({ name: (base === "biswas-ai" ? "code" : base) + (i ? "-" + i : "") + "." + ext, type: ext, types: [ext] }, pre.textContent.replace(/(Copy|কপি)$/, "").trim())); }); }
    if (want.has("json") && !have.has("json")) { let js = ""; for (const pre of clone.querySelectorAll("pre")) { if (BA.jsonOk(pre.textContent.trim())) { js = pre.textContent.trim(); break; } } if (!js) { const m = text.match(/[\[{][\s\S]*[\]}]/); if (m && BA.jsonOk(m[0])) js = m[0]; } if (!js && tables.length) { const t = tables[0]; js = JSON.stringify(t.slice(1).map(r => Object.fromEntries(t[0].map((h, j) => [h, isNum(r[j]) ? toNum(r[j]) : r[j]]))), null, 2); } if (js) cards.push(BA.cardHtml({ name: (base === "biswas-ai" ? "data" : base) + ".json", type: "json", types: ["json"] }, js)); }
    if (want.has("draft") && !(have.has("docx") && have.has("pdf"))) { const html = clone.innerHTML; for (const ty of ["docx", "pdf"]) if (!have.has(ty)) cards.push(BA.cardHtml({ name: (base === "biswas-ai" ? "draft" : base) + "." + ty, type: ty, types: [ty], html: true, template: /letter|চিঠি|আবেদন|পত্র/i.test(b.q) ? "letter" : "" }, html)); }
    b.doc.dataset.baAuto = sig;
    b.host.querySelectorAll(".ba-auto").forEach(x => x.remove());
    if (cards.length) { const w = document.createElement("div"); w.className = "ba-auto ba-noexport"; w.innerHTML = `<small>${escH(T("উত্তর থেকে তৈরি ফাইল", "Files made from this answer"))}</small>` + cards.join(""); b.doc.after(w); }
  }
}
BA.autoAtt = autoAtt;
function enhance(root) {
  enhanceCode(root);
  try { autoAtt(document); } catch (e) { console.warn("auto attachments", e); }
  root.querySelectorAll(".msg.ai .actions:not([data-ba-v]), article.job .actions:not([data-ba-v]), .pd-out-bar:not([data-ba-v])").forEach(act => {
    act.dataset.baV = "1"; const bt = document.createElement("button"); bt.type = "button"; bt.className = "btn small ba-vbtn"; bt.textContent = "📄 " + T("ডকুমেন্ট ভিউ", "Document view");
    bt.addEventListener("click", ev => { ev.stopPropagation(); const box = act.closest(".msg.ai, article.job, .pd-out"); const docs = box ? [...box.querySelectorAll(".pd-out-doc, .doc")] : []; if (!docs.length) return; const html = docs.map(d => d.innerHTML).join(""); show(html, titleOf(html), { md: msgMd(act) }); });
    act.append(bt);
  });
  if (matchMedia("(min-width: 1100px)").matches) root.querySelectorAll(".msg.ai .via, article.job .actions").forEach(v => {
    const msg = v.closest(".msg.ai, article.job"); const att = msg && msg.querySelector('.ba-att[data-type="docx"], .ba-att[data-type="pdf"], .ba-att[data-type="md"]'); if (!att) return;
    const id = att.dataset.baAtt; BA._auto = BA._auto || new Set(); if (BA._auto.has(id)) return; BA._auto.add(id);
    if (Date.now() - BOOT < 4000) return; // do not pop up for old answers on page load
    const a = REG.get(id); if (a) openAtt(a);
  });
}
const BOOT = Date.now();
const CSS = `
.ba-skill{display:flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted,#555);margin:0 0 6px;flex-wrap:wrap}
.ba-skill select{font-size:.8rem;padding:2px 6px;border:1px solid var(--line,#ccc);border-radius:6px;background:var(--surface,#fff);max-width:62vw}
.ba-skill .ba-help{border:1px solid var(--line,#ccc);background:none;border-radius:50%;width:22px;height:22px;cursor:pointer;padding:0;font-size:.75rem}
.ba-skill small{opacity:.8}
.ba-att{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1px solid var(--line,#ccc);border-left:4px solid var(--accent,#1c3d32);background:var(--surface,#fff);border-radius:8px;padding:8px 10px;margin:8px 0}
.ba-att .ba-ico{font-size:1.5rem}.ba-att .ba-meta{display:flex;flex-direction:column;min-width:150px;flex:1}.ba-att .ba-meta small{color:var(--muted,#666);font-size:.75rem}.ba-att .ba-warn{color:var(--warn,#a60)!important}
.ba-att .ba-btns{display:flex;gap:6px;flex-wrap:wrap}
.doc pre,.ba-page pre,.pd-out-doc pre{background:#f6f8fa;border:1px solid #e1e4e8;border-radius:6px;padding:10px 12px;padding-right:64px;overflow:auto;font:13px/1.5 "IBM Plex Mono",Consolas,monospace;white-space:pre}
.doc pre code,.ba-page pre code{background:none;padding:0;font-size:inherit}
.ba-copy{position:absolute;top:6px;right:6px;opacity:.85}
.tk-k{color:#cf222e;font-weight:600}.tk-s{color:#0a3069}.tk-c{color:#6e7781;font-style:italic}.tk-n{color:#0550ae}
.doc table th,.ba-page table th,.pd-out-doc table th{background:#d9e2f3}
.doc table th,.doc table td{border:1px solid #9aa4b2;padding:4px 8px}
.doc blockquote,.ba-page blockquote{border-left:4px solid #8ea9db;margin:0 0 10px;padding:2px 12px;color:#333;background:#f7f9fc}
#ba-viewer{position:fixed;top:0;right:0;bottom:0;width:min(640px,44vw);z-index:15;background:#e9e6df;border-left:1px solid var(--line,#ccc);box-shadow:-6px 0 18px rgba(0,0,0,.12);display:flex;flex-direction:column}
#ba-viewer[hidden]{display:none}
@media (min-width:1100px){body.ba-open .app{margin-right:min(640px,44vw)}}
.ba-vbar{display:flex;flex-direction:column;gap:6px;padding:8px 10px;background:var(--surface,#fff);border-bottom:1px solid var(--line,#ccc)}
.ba-vbar b{font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ba-vtools{display:flex;gap:5px;flex-wrap:wrap;align-items:center}.ba-vtools select{font-size:.78rem;max-width:180px}
.ba-vscroll{flex:1;overflow:auto;padding:16px}
.ba-page{width:210mm;max-width:none;min-height:297mm;margin:0 auto;background:#fff;color:#000;padding:18mm 16mm;box-shadow:0 1px 6px rgba(0,0,0,.18);font:12pt/1.65 "Noto Serif","Noto Serif Bengali",serif;box-sizing:border-box;overflow-wrap:anywhere}
#ba-viewer .ba-page{zoom:.74}
.ba-page[contenteditable=true]{outline:2px solid var(--accent,#1c3d32);outline-offset:-2px}
.ba-page h1,.ba-page h2,.ba-page h3,.ba-page h4{font-family:"Noto Serif","Noto Serif Bengali",serif;color:#1f3864;margin:12pt 0 6pt}.ba-page h1,.ba-page h2:first-child{text-align:center}
.ba-page table{border-collapse:collapse;width:100%;font-size:10.5pt;margin:6pt 0}.ba-page th,.ba-page td{border:1px solid #666;padding:4px 6px;text-align:left;vertical-align:top}
.ba-vhelp{font-size:.74rem;color:#555;margin:0;padding:6px 12px;background:var(--surface,#fff);border-top:1px solid var(--line,#ccc)}
.pdf-doc.ba-a4 th{background:#d9e2f3}.pdf-doc.ba-a4 th,.pdf-doc.ba-a4 td{border:1px solid #666;padding:4px 6px;text-align:left;vertical-align:top}.pdf-doc.ba-a4 pre{background:#f4f4f4;padding:6px;white-space:pre-wrap;font-size:9.5pt}.pdf-doc.ba-a4 h1,.pdf-doc.ba-a4 h2,.pdf-doc.ba-a4 h3{color:#1f3864}.pdf-doc.ba-a4 blockquote{border-left:4px solid #8ea9db;margin:0 0 8pt;padding-left:10px}.pdf-doc.ba-a4 p,.pdf-doc.ba-a4 li{margin:0 0 6pt}
@media (max-width:1099px){#ba-viewer{top:auto;left:0;width:auto;height:84vh;border-left:0;border-top:1px solid var(--line,#ccc);border-radius:14px 14px 0 0}#ba-viewer .ba-page{zoom:.46}}
@media print{#ba-viewer{display:none}}
`;
function boot() {
  const st = document.createElement("style"); st.textContent = CSS; document.head.append(st);
  viewerEl(); mountSkills(); enhance(document.body);
  let busy = false;
  new MutationObserver(() => { if (busy) return; busy = true; requestAnimationFrame(() => { busy = false; try { mountSkills(); enhance(document.body); } catch (e) { console.warn(e); } }); }).observe(document.body, { childList: true, subtree: true });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
