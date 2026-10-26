// reads text for the AI off the main thread, after a file is uploaded. Plain text files and .docx (no libraries:
// the docx ZIP is read here and word/document.xml is inflated with DecompressionStream).
self.onmessage = async e => {
  const { id, file, cap } = e.data;
  try {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    let text;
    if (ext === "docx") text = await docx(file);
    else if (ext === "pptx") text = await pptx(file);
    else if (ext === "xml") { const x = tallyLib().decode(await file.slice(0, cap * 4).arrayBuffer()); text = (tallyLib().isTally(x) && tallyLib().toText(x)) || x; }
    else text = await file.slice(0, cap * 3).text();
    self.postMessage({ id, text: text.slice(0, cap) });
  } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
let tallyOk = false;
function tallyLib() { if (!tallyOk) { importScripts("/ed-tally.js"); tallyOk = true; } return self.BA_TALLY; }
// .pptx: text of every slide in order, "[Slide n]" markers
async function pptx(file) {
  const out = [];
  for (let n = 1; n <= 500; n++) {
    let xml; try { xml = await entry(file, `ppt/slides/slide${n}.xml`); } catch (e) { break; }
    if (xml == null) break;
    const paras = xml.split(/<\/a:p>/).map(p => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join("")).filter(t => t.trim());
    out.push(`[Slide ${n}]\n` + paras.join("\n").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'));
  }
  return out.join("\n\n");
}
async function entry(file, want) {
  const buf = new Uint8Array(await file.arrayBuffer()); const dv = new DataView(buf.buffer);
  let eo = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eo = i; break; }
  if (eo < 0) throw new Error("not a zip");
  let p = dv.getUint32(eo + 16, true); const n = dv.getUint16(eo + 10, true); const dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nl));
    if (name === want) {
      const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true); const data = buf.subarray(start, start + csize);
      if (method === 0) return dec.decode(data);
      const s = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(s).text();
    }
    p += 46 + nl + xl + cl;
  }
  throw new Error("no " + want);
}
// headings become "#", "##"… lines (Heading1..6 / Title / outline level) so answers can cite the section path.
async function docx(file) {
  const xml = await entry(file, "word/document.xml");
  const ent = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const body = (xml.match(/<w:body[\s\S]*<\/w:body>/) || [xml])[0];
  const out = [];
  for (const p of body.split(/<\/w:p>/)) {
    const st = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || ""; const ol = (p.match(/<w:outlineLvl w:val="(\d)"/) || [])[1];
    const m = st.match(/^(?:heading|berschrift|titre|titolo)\s?(\d)$/i) || st.match(/^Heading(\d)/i);
    const level = m ? Math.min(6, +m[1]) : /^title$/i.test(st) ? 1 : ol != null && +ol < 6 ? +ol + 1 : 0;
    const text = p.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n").replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, (_, t) => "\u0001" + t + "\u0002")
      .replace(/<[^>]+>/g, "").replace(/\u0001([^\u0002]*)\u0002/g, (_, t) => ent(t)).trim();
    if (!text) continue;
    out.push(level ? "\n" + "#".repeat(level) + " " + text.replace(/\n/g, " ") : text);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
