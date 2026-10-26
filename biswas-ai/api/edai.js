// AI for the editors (Word, Excel, Image, Notepad): the browser sends the document's STRUCTURE (block ids, tables,
// sheets with cell refs/formulas/styles) plus attachments; the model answers with small edit operations, not a rewrite.
const OPS = {
  word: `Document blocks are listed as "<id> [tag align style] text"; tables as "<id> TABLE rows×cols" then "  r<r>: cell | cell".
Operations (JSON objects):
{"op":"text","id":"b3","text":"new text of that block (keeps its formatting)"}
{"op":"replace","find":"exact old text","with":"new text"}            (every occurrence, keeps formatting)
{"op":"insert_after","id":"b3","tag":"p|h1|h2|h3|li","text":"...","align":"left|center|right|justify"}  (copies the style of block b3 when the tag matches)
{"op":"delete","id":"b3"}
{"op":"cell","id":"t2","r":1,"c":0,"text":"..."}
{"op":"row_add","id":"t2","after":1,"cells":["...","..."]}   (copies the row's formatting)
{"op":"row_del","id":"t2","r":2}
{"op":"html","html":"<h1>…</h1><p>…</p><table>…</table>"}   (ONLY for an empty document or when asked to write a completely new document; use <p style=\\"text-align:center\\">, <b>, <table border=1>)`,
  excel: `Sheets are listed as "SHEET <name>" then one line per used cell: "A1 = raw value or =FORMULA  {style}" (style: b=bold, bg=fill, nf=number format, al=align).
Operations:
{"op":"set","sheet":"Sheet1","cell":"B2","v":"123"}        (numbers as plain digits; formulas start with =, e.g. "=SUM(B2:B9)")
{"op":"set_range","sheet":"Sheet1","from":"A2","rows":[["Rice","20"],["Oil","45"]]}
{"op":"style","sheet":"Sheet1","range":"A1:D1","b":true,"bg":"#dbeafe","nf":"#,##0.00","al":"center"}
{"op":"add_sheet","name":"Summary"}
{"op":"clear","sheet":"Sheet1","range":"A2:D20"}
Keep existing formulas and styles; put totals as formulas, not typed numbers.`,
  note: `The text is given with line numbers "12| text".
Operations:
{"op":"replace","find":"exact old text","with":"new text"}
{"op":"insert_after_line","line":12,"text":"new lines"}
{"op":"delete_lines","from":3,"to":5}
{"op":"set_text","text":"the whole new text"}   (only when asked to write/convert everything)`,
  image: `The picture is described by its size and layers.
Operations (coordinates in pixels of the picture):
{"op":"text","text":"...","x":40,"y":60,"size":36,"color":"#1a1a1a","bold":true,"align":"left|center"}
{"op":"rect","x":0,"y":0,"w":200,"h":80,"color":"#000000","fill":true}
{"op":"background","color":"#000000"}       (fills the whole picture)
{"op":"filter","kind":"grey|invert|soft|sharpen"}
{"op":"rotate","dir":1}  {"op":"flip","h":true}  {"op":"resize","w":800,"h":600}
{"op":"overlay","att":0,"x":0,"y":0,"w":400,"h":300,"opacity":0.5}   (place attachment image #0 as a new layer)
For a NEW poster, banner, card or notice: FIRST give a "background" op (a strong colour), THEN big "text" ops whose colour contrasts with that background (light text on dark, dark text on light), centred, sized to the picture. Never put white text on the empty white picture.`
};
const SYS = kind => `You edit a ${kind === "word" ? "Word document" : kind === "excel" ? "spreadsheet" : kind === "image" ? "picture" : "plain-text file"} for an Indian government office (Bengali and English).
Reply with ONLY one JSON object: {"reply":"one or two short sentences for the user, in the user's language","ops":[...operations...]}.
If the user only asks a question about the file, answer in "reply" and give "ops":[].
${OPS[kind]}
Rules: change only what the instruction asks; keep every other number, name and format. Keep Bengali text in Bengali.
When an ATTACHMENT is given as a format/template ("make it like this", "same format", "fill this format"), the document has ALREADY been loaded with the attachment's exact layout (letterhead, memo no./date lines, headings, tables, fonts, alignment, borders): only change the TEXT/VALUES with operations so the result is the new document about the user's subject. Never use "html" or "set_text" in that case.
When an attachment is only reference text (e.g. a screenshot read by OCR), use its text as the content.`;

export function parseOps(t) {
  const s = String(t || "").trim(); const m = s.match(/```(?:json)?\s*([\s\S]*?)```/); const raw = m ? m[1] : s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1);
  try { const j = JSON.parse(raw); if (!j || typeof j !== "object") return null; const ops = Array.isArray(j.ops) ? j.ops.filter(o => o && typeof o.op === "string").slice(0, 400) : [];
    return { reply: String(j.reply || "").slice(0, 4000), ops }; } catch (e) { return null; }
}
// deterministic stand-in for tests (PENDRIVE_MOCK_AI=1)
function mock(kind, q, doc, atts) {
  const att = atts[0]; const ql = q.toLowerCase(); const ops = [];
  if (/\?\s*$/.test(q)) return { reply: `MOCK answer about the ${kind} file (${doc.split("\n").length} lines).`, ops };
  const rep = q.match(/replace\s+"?([^"]+?)"?\s+with\s+"?([^"]+?)"?\s*$/i);
  const topic = (q.match(/about\s+(.+?)\s*$/i) || [])[1];
  if (kind === "word") {
    if (att && att.format && topic) {
      for (const l of doc.split("\n")) { const m = l.match(/^(b\d+) \[[^\]]*\] (.*)$/); if (!m) continue;
        if (/^(subject|sub|বিষয়)\b/i.test(m[2])) ops.push({ op: "text", id: m[1], text: "Subject: " + topic });
        if (/memo no/i.test(m[2])) ops.push({ op: "text", id: m[1], text: m[2].replace(/\d+/, "99") }); }
      const t = doc.match(/^(t\d+) TABLE/m); if (t) ops.push({ op: "cell", id: t[1], r: 1, c: 1, text: topic });
    } else if (att && att.text) ops.push({ op: "html", html: att.text.split(/\n+/).filter(Boolean).map(l => `<p>${l.replace(/[<>&]/g, "")}</p>`).join("") });
    else if (rep) ops.push({ op: "replace", find: rep[1], with: rep[2] });
    else { const last = [...doc.matchAll(/^(b\d+) /gm)].pop(); ops.push(last ? { op: "insert_after", id: last[1], tag: "p", text: q } : { op: "html", html: `<p>${q}</p>` }); }
  } else if (kind === "excel") {
    const nums = (q.match(/-?\d+(?:\.\d+)?/g) || []); const sh = (doc.match(/^SHEET (.+)$/m) || [, "Sheet1"])[1];
    if (/fill|numbers|values/i.test(q) && nums.length) nums.forEach((n, i) => ops.push({ op: "set", sheet: sh, cell: "B" + (i + 2), v: n }));
    else if (rep) ops.push({ op: "set", sheet: sh, cell: "A1", v: rep[2] });
    else ops.push({ op: "set", sheet: sh, cell: "A1", v: q.slice(0, 40) });
  } else if (kind === "note") {
    if (att && att.text) ops.push({ op: "set_text", text: att.text });
    else if (rep) ops.push({ op: "replace", find: rep[1], with: rep[2] });
    else ops.push({ op: "insert_after_line", line: doc.split("\n").length, text: q });
  } else {
    if (att && att.image) ops.push({ op: "overlay", att: 0, x: 10, y: 10, w: 200, h: 120, opacity: 1 });
    else if (/grey|gray/.test(ql)) ops.push({ op: "filter", kind: "grey" });
    else ops.push({ op: "background", color: "#000000" }, { op: "text", text: (q.match(/"([^"]+)"/) || [, q])[1], x: 30, y: 30, size: 32, color: "#ffffff", bold: true });
  }
  return { reply: `MOCK: ${ops.length} change(s) for “${q.slice(0, 60)}”.`, ops };
}
const LANGRULE = l => l === "bn" ? `LANGUAGE: write "reply" in Bengali (the user's screen is in Bengali), unless the instruction asks for another language.` : `LANGUAGE: write "reply" in English (the user's screen is in English), even if the document is in Bengali, unless the instruction itself is written in Bengali or asks for Bengali. Document content keeps its own language.`;
const lum = c => { const m = String(c || "").match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i); if (!m) return /white/i.test(c) ? 1 : /black/i.test(c) ? 0 : 0.5; let x = m[1]; if (x.length === 3) x = x.replace(/./g, "$&$&"); const n = parseInt(x, 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
// safety net: text on the blank picture with no background in a light colour would be invisible
export function fixImageOps(ops) {
  const texts = ops.filter(o => o.op === "text"); if (!texts.length || ops.some(o => o.op === "background")) return ops;
  if (texts.every(o => lum(o.color || "#000") > 0.75)) return [{ op: "background", color: "#0b2a4a" }, ...ops];
  return ops;
}
export async function edAI(body, askAI, mockOn) {
  const kind = ["word", "excel", "image", "note"].includes(body.kind) ? body.kind : null; if (!kind) return { error: "bad_kind" };
  const q = String(body.q || "").slice(0, 4000).trim(); if (!q) return { error: "no_question" };
  const doc = String(body.doc || "").slice(0, 60000);
  const atts = (Array.isArray(body.attachments) ? body.attachments : []).slice(0, 6).map(a => ({ name: String(a.name || "").slice(0, 200), text: String(a.text || "").slice(0, 30000), how: String(a.how || ""), format: !!a.format, image: !!a.image }));
  if (mockOn) return mock(kind, q, doc, atts);
  const thread = (Array.isArray(body.thread) ? body.thread : []).slice(-4).map(t => `USER: ${String(t.q || "").slice(0, 600)}\nAI: ${String(t.a || "").slice(0, 600)}`).join("\n");
  const user = `${thread ? "EARLIER IN THIS DOCUMENT'S THREAD:\n" + thread + "\n\n" : ""}FILE: ${String(body.name || "").slice(0, 200)}\nDOCUMENT STRUCTURE:\n${doc || "(empty document)"}\n\n${atts.map((a, i) => `ATTACHMENT #${i} ${a.name}${a.format ? " (ALREADY LOADED AS THE DOCUMENT'S FORMAT — fill it)" : ""}${a.how === "tesseract" ? " (text read by OCR, may have small errors)" : ""}:\n${a.text || "(image)"}`).join("\n\n")}\n\nINSTRUCTION: ${q}`;
  const opts = body.fast ? { fast: true } : {};
  const sys = SYS(kind) + "\n" + LANGRULE(body.lang === "bn" ? "bn" : "en");
  let out = await askAI(sys, user, 4000, opts); let r = parseOps(out);
  if (!r) { out = await askAI(sys, user + "\n\nYour previous reply was not valid JSON. Reply with ONLY the JSON object {\"reply\":...,\"ops\":[...]}.", 4000, opts); r = parseOps(out); }
  if (r && kind === "image") r.ops = fixImageOps(r.ops);
  return r || { reply: String(out || "").replace(/```[\s\S]*?```/g, "").slice(0, 2000), ops: [], malformed: true };
}
