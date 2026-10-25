// v110: reads text for the AI off the main thread, after a file is uploaded. Plain text files and .docx (no libraries:
// the docx ZIP is read here and word/document.xml is inflated with DecompressionStream).
self.onmessage = async e => {
  const { id, file, cap } = e.data;
  try {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const text = ext === "docx" ? await docx(file) : await file.slice(0, cap * 3).text();
    self.postMessage({ id, text: text.slice(0, cap) });
  } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
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
async function docx(file) {
  const xml = await entry(file, "word/document.xml");
  const ent = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  return xml.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n").replace(/<\/w:p>/g, "\n").replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, (_, t) => "\u0001" + t + "\u0002")
    .replace(/<[^>]+>/g, "").replace(/\u0001([^\u0002]*)\u0002/g, (_, t) => ent(t)).replace(/\n{3,}/g, "\n\n").trim();
}
