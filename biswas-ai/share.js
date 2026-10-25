/* v113: share-link receiver page. No login: the link id + (optional) password give a short-lived token. */
"use strict";
const SID = (location.pathname.match(/^\/s\/([a-f0-9]{32})/) || [])[1] || "";
const XLSX_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
const XLSX_SRI = "sha384-EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT";
const TEXT_EXT = new Set("txt md csv tsv json js mjs ts jsx tsx py java c h cpp cs go rs rb php sh bat ps1 sql html htm css xml yml yaml toml ini log env svg tex".split(" "));
const L = {
  bn: { lang: "English", title: "শেয়ার করা ফাইল", pw: "এই লিংকে পাসওয়ার্ড আছে", pwgo: "খুলুন", pwbad: "ভুল পাসওয়ার্ড — আর {0} বার চেষ্টা করা যাবে", locked: "অনেকবার ভুল হয়েছে। {0} মিনিট পরে চেষ্টা করুন।",
    revoked: "এই লিংকটি বন্ধ করে দেওয়া হয়েছে।", expired: "এই লিংকের মেয়াদ শেষ।", limit: "এই লিংকের ডাউনলোড সীমা শেষ।", not_found: "লিংকটি পাওয়া যায়নি।", busy: "লিংক এখন ব্যস্ত, পরে চেষ্টা করুন।",
    too_many_requests: "খুব বেশি অনুরোধ — একটু পরে চেষ্টা করুন।", err: "সমস্যা হয়েছে: {0}", files: "{0}টি ফাইল", zip: "সব ডাউনলোড (ZIP)", dl: "ডাউনলোড", pv: "দেখুন", pick: "বাঁদিক থেকে একটি ফাইল বেছে নিন।",
    nopv: "এই ধরনের ফাইল এখানে দেখানো যায় না — ডাউনলোড করুন।", big: "ফাইলটি বড়, প্রথম অংশ দেখানো হচ্ছে।", exp: "মেয়াদ: {0}", never: "মেয়াদ নেই", left: "আর {0}বার ডাউনলোড করা যাবে",
    zipping: "ZIP তৈরি হচ্ছে… {0}/{1} ({2})", zipdone: "✅ ডাউনলোড শেষ", ai: "এই ফাইলগুলো নিয়ে প্রশ্ন করুন", ask: "জিজ্ঞেস করুন", thinking: "খোঁজা হচ্ছে…", ai_budget: "আজকের প্রশ্নের সীমা শেষ।",
    up: "ফাইল পাঠান", uphelp: "ফাইল এখানে টেনে আনুন বা বেছে নিন। সর্বোচ্চ {0}টি ফাইল, প্রতিটি {1} পর্যন্ত।", upleft: "আর {0}টি ফাইল পাঠানো যাবে", choose: "ফাইল বাছুন", sent: "✅ পাঠানো হয়েছে", resume: "আবার চেষ্টা",
    file_too_big: "ফাইলটি খুব বড়", upload_limit: "ফাইলের সংখ্যার সীমা শেষ", quota: "জায়গা নেই", sources: "সূত্র" },
  en: { lang: "বাংলা", title: "Shared files", pw: "This link is password protected", pwgo: "Open", pwbad: "Wrong password — {0} tries left", locked: "Too many wrong tries. Try again in {0} min.",
    revoked: "This link was turned off by its owner.", expired: "This link has expired.", limit: "This link's download limit has been reached.", not_found: "Link not found.", busy: "Link busy, try later.",
    too_many_requests: "Too many requests — try again shortly.", err: "Something went wrong: {0}", files: "{0} files", zip: "Download all (ZIP)", dl: "Download", pv: "Preview", pick: "Pick a file on the left.",
    nopv: "This file type can't be previewed here — download it.", big: "Large file: showing the beginning.", exp: "Expires: {0}", never: "No expiry", left: "{0} downloads left",
    zipping: "Building ZIP… {0}/{1} ({2})", zipdone: "✅ Download finished", ai: "Ask about these files", ask: "Ask", thinking: "Searching…", ai_budget: "Today's question limit is used up.",
    up: "Send files", uphelp: "Drop files here or choose them. Up to {0} files, {1} each.", upleft: "{0} more files can be sent", choose: "Choose files", sent: "✅ Sent", resume: "Retry",
    file_too_big: "File too big", upload_limit: "File limit reached", quota: "No space left", sources: "Sources" }
};
let lang = localStorage.getItem("s:lang") || "bn";
function t(k, ...a) { const s = (L[lang] && L[lang][k]) || L.en[k] || k; return s.replace(/\{(\d)\}/g, (_, i) => a[i] ?? ""); }
L.bn.pd_dl_big = L.en.pd_dl_big = "This ZIP is large and your browser will keep it in memory ({0}). Continue?";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function pdSize(n) { n = Number(n) || 0; const u = ["B", "KB", "MB", "GB", "TB"]; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + " " + u[i]; }
const $ = s => document.querySelector(s);
const S = { token: sessionStorage.getItem("s:tok:" + SID) || "", info: null, sel: "" };

async function api(op, body = {}) {
  const r = await fetch("/api/s/" + op, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid: SID, token: S.token, ...body }) });
  let j = {}; try { j = await r.json(); } catch (e) { /* ignore */ }
  if (!r.ok) { const e = new Error(j.error || "HTTP " + r.status); e.status = r.status; e.code = j.error; e.j = j; throw e; }
  return j;
}
const why = e => e.code === "busy" ? t("busy") : L.en[e.code] ? t(e.code) : t("err", e.message);
function fatal(e) { $("#app").innerHTML = `<div class="msg ${e.code === "busy" ? "" : "bad"}" id="s-msg">${esc(why(e))}</div>`; }

async function boot() {
  $("#lang").textContent = t("lang"); document.documentElement.lang = lang; $("#h-title").textContent = "📁 " + t("title");
  if (!SID) return fatal({ code: "not_found" });
  try {
    if (S.token) { try { S.info = await api("tree"); return render(); } catch (e) { if (e.status !== 401) throw e; S.token = ""; } }
    const j = await api("open"); if (j.need === "password") return askPw(j);
    gotToken(j);
  } catch (e) { fatal(e); }
}
function gotToken(j) { S.token = j.token; sessionStorage.setItem("s:tok:" + SID, j.token); S.info = j; render(); }
function askPw(j, msg = "") {
  $("#app").innerHTML = `<form class="card" id="s-pw" style="max-width:420px"><b>🔒 ${esc(j.title || t("pw"))}</b><p class="mute">${esc(t("pw"))}</p>
    <input type="password" id="s-pass" autocomplete="off" required><div style="margin-top:10px"><button class="btn primary" type="submit">${esc(t("pwgo"))}</button></div>${msg ? `<p class="msg bad" id="s-msg">${esc(msg)}</p>` : ""}</form>`;
  $("#s-pass").focus();
  $("#s-pw").onsubmit = async ev => {
    ev.preventDefault();
    try { gotToken(await api("open", { password: $("#s-pass").value })); }
    catch (e) {
      if (e.code === "wrong") askPw(j, t("pwbad", e.j.left));
      else if (e.code === "locked") askPw(j, t("locked", Math.ceil((e.j.retryAfter || 900) / 60)));
      else askPw(j, why(e));
    }
  };
}
function head(i) {
  const bits = [i.expires ? t("exp", new Date(i.expires).toLocaleString(lang === "bn" ? "bn-IN" : "en-IN")) : t("never")];
  if (i.left != null) bits.push(t("left", i.left));
  return `<div class="card"><b style="font-size:18px" id="s-title">${esc(i.title || t("title"))}</b><div class="mute">${esc(bits.join(" · "))}</div></div>`;
}
function render() {
  const i = S.info; $("#h-title").textContent = "📁 " + t("title");
  if (i.kind === "upload") return renderUpload();
  const total = i.files.reduce((a, f) => a + f.size, 0);
  $("#app").innerHTML = head(i) + `<div class="split"><div class="card"><div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><span class="mute" style="flex:1">${esc(t("files", i.files.length))} · ${esc(pdSize(total))}</span>
    <button class="btn primary small" type="button" id="s-zip">${esc(t("zip"))}</button></div><ul class="tree" id="s-tree">${tree(i)}</ul><div id="s-zipst" class="mute"></div></div>
    <div class="card" id="pv"><p class="mute">${esc(t("pick"))}</p></div></div>` +
    (i.ai ? `<div class="card" id="s-ai"><b>✨ ${esc(t("ai"))}</b><form id="s-aiform" style="display:flex;gap:8px;margin-top:8px"><input type="text" id="s-q" maxlength="500" required><button class="btn primary" type="submit">${esc(t("ask"))}</button></form><div class="ai-ans" id="s-ans"></div></div>` : "");
  $("#s-zip").onclick = zipAll;
  $("#s-tree").onclick = ev => {
    const b = ev.target.closest("[data-act]"); if (!b) return;
    const li = b.closest("li");
    if (b.dataset.act === "dir") { li.classList.toggle("shut"); b.textContent = (li.classList.contains("shut") ? "▸ 📁 " : "▾ 📁 ") + li.dataset.name; return; }
    const f = i.files.find(x => x.id === li.dataset.id); if (!f) return;
    if (b.dataset.act === "dl") return download(f);
    preview(f);
  };
  if (i.ai) $("#s-aiform").onsubmit = ev => { ev.preventDefault(); ask($("#s-q").value); };
}
function tree(i) {
  const root = { d: {}, f: [] };
  for (const d of i.folders) { let n = root; for (const p of d.split("/")) n = n.d[p] = n.d[p] || { d: {}, f: [] }; }
  for (const f of i.files) { const ps = f.path.split("/"); const nm = ps.pop(); let n = root; for (const p of ps) n = n.d[p] = n.d[p] || { d: {}, f: [] }; n.f.push({ ...f, nm }); }
  const out = n => Object.keys(n.d).sort().map(k => `<li class="dir" data-name="${esc(k)}"><div class="dir"><span class="nm" data-act="dir">▾ 📁 ${esc(k)}</span></div><ul>${out(n.d[k])}</ul></li>`).join("") +
    n.f.sort((a, b) => a.nm.localeCompare(b.nm)).map(f => `<li data-id="${esc(f.id)}" data-path="${esc(f.path)}"><div><span class="nm" data-act="pv" title="${esc(f.path)}">${icon(f.nm)} ${esc(f.nm)}</span><span class="sz">${esc(pdSize(f.size))}</span><button class="btn small" type="button" data-act="dl" title="${esc(t("dl"))}">⬇</button></div></li>`).join("");
  return out(root);
}
const ext = n => (String(n).split(".").pop() || "").toLowerCase();
function icon(n) { const e = ext(n); return e === "pdf" ? "📕" : /^(png|jpe?g|gif|webp|svg)$/.test(e) ? "🖼️" : /^(mp4|webm|mov)$/.test(e) ? "🎬" : /^(mp3|wav|ogg|m4a)$/.test(e) ? "🎵" : /^(xlsx|xls|csv)$/.test(e) ? "📊" : /^docx?$/.test(e) ? "📘" : "📄"; }
function download(f) {
  api("url", { id: f.id }).then(j => { const a = document.createElement("a"); a.href = j.url; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); S.info.left = S.info.left != null ? Math.max(0, S.info.left - 1) : null; })
    .catch(e => { $("#pv").innerHTML = `<div class="msg" id="s-msg">${esc(why(e))}</div>`; });
}
async function preview(f, hi = "") {
  for (const el of document.querySelectorAll("#s-tree li > div.on")) el.classList.remove("on");
  const li = document.querySelector(`#s-tree li[data-id="${CSS.escape(f.id)}"] > div`); if (li) li.classList.add("on");
  const pv = $("#pv"); const e = ext(f.path); S.sel = f.id;
  const top = `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px"><b style="flex:1;word-break:break-all" id="pv-name">${esc(f.path)}</b><button class="btn small" type="button" id="pv-dl">⬇ ${esc(t("dl"))}</button></div>`
    + (hi && hi.n ? `<div class="cite-box" id="pv-cite"><b>[${Number(hi.n)}] ${esc(hi.label || "")}</b>${hi.text ? ` <mark>${esc(hi.text)}</mark>` : ""}</div>` : "");
  pv.innerHTML = top + `<p class="mute">…</p>`; $("#pv-dl").onclick = () => download(f);
  const body = h => { if (S.sel === f.id) { pv.innerHTML = top + h; $("#pv-dl").onclick = () => download(f); } };
  try {
    const isText = TEXT_EXT.has(e), cap = isText ? 2 * 1024 * 1024 : e === "docx" || e === "xlsx" || e === "xls" ? 30 * 1024 * 1024 : 0;
    if ((e === "docx" || e === "xlsx" || e === "xls") && f.size > cap) return body(`<p class="mute">${esc(t("nopv"))}</p>`);
    const j = await api("url", { id: f.id, inline: 1, range: cap || undefined });
    if (e === "pdf") return body(`<iframe id="pv-frame" title="${esc(f.path)}" src="${esc(j.url)}#page=${Number(hi.page) || 1}"></iframe>`);
    if (/^image\//.test(j.type)) return body(`<img id="pv-img" alt="${esc(f.path)}" src="${esc(j.url)}">`);
    if (/^video\//.test(j.type)) return body(`<video id="pv-video" controls preload="metadata" src="${esc(j.url)}"></video>`);
    if (/^audio\//.test(j.type)) return body(`<audio id="pv-audio" controls preload="metadata" src="${esc(j.url)}" style="width:100%"></audio>`);
    if (isText) {
      const r = await fetch(j.url, { headers: f.size > cap ? { range: `bytes=0-${cap - 1}` } : {} }); if (!r.ok && r.status !== 206) throw new Error("HTTP " + r.status);
      const txt = new TextDecoder().decode(await r.arrayBuffer());
      return body((f.size > cap ? `<p class="mute">${esc(t("big"))}</p>` : "") + `<pre id="pv-text">${mark(esc(txt), hi)}</pre>`);
    }
    if (e === "docx") { const r = await fetch(j.url); return body(`<div class="doc" id="pv-doc">${mark(await docxHtml(new Uint8Array(await r.arrayBuffer())), hi)}</div>`); }
    if (e === "xlsx" || e === "xls") { const r = await fetch(j.url); const buf = await r.arrayBuffer(); await needXlsx(); return xlsxView(body, buf, hi); }
    body(`<p class="mute">${esc(t("nopv"))}</p>`);
  } catch (err) { body(`<div class="msg" id="s-msg">${esc(err.code ? why(err) : t("err", err.message))}</div>`); }
}
function mark(html, hi) { const q = String((hi && hi.text) || "").trim(); if (!q || q.length < 3) return html; const k = esc(q.slice(0, 80)); const i = html.indexOf(k); return i < 0 ? html : html.slice(0, i) + `<mark id="pv-hit">${k}</mark>` + html.slice(i + k.length); }

/* ---- minimal DOCX → HTML (paragraphs, headings, lists, tables; text only) ---- */
async function unzipEntry(u8, want) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("not a zip");
  let p = dv.getUint32(eocd + 16, true); const n = dv.getUint16(eocd + 10, true);
  for (let k = 0; k < n; k++) {
    const meth = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl));
    if (name === want) {
      const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true); const raw = u8.subarray(start, start + csz);
      if (meth === 0) return new TextDecoder().decode(raw);
      const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return await new Response(ds).text();
    }
    p += 46 + nl + xl + cl;
  }
  throw new Error(want + " missing");
}
async function docxHtml(u8) {
  const xml = new DOMParser().parseFromString(await unzipEntry(u8, "word/document.xml"), "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const kids = (el, ln) => [...el.childNodes].filter(c => c.namespaceURI === W && c.localName === ln);
  const ptext = p => { let s = ""; const walk = n => { for (const c of n.childNodes) { if (c.namespaceURI !== W) { if (c.childNodes) walk(c); continue; } if (c.localName === "t") s += c.textContent; else if (c.localName === "tab") s += "\t"; else if (c.localName === "br") s += "\n"; else if (c.localName !== "pPr" && c.localName !== "rPr") walk(c); } }; walk(p); return s; };
  const para = p => { const st = p.getElementsByTagNameNS(W, "pStyle")[0]; const sv = st ? st.getAttributeNS(W, "val") || st.getAttribute("w:val") || "" : ""; const m = sv.match(/^(?:Heading|heading)\s*([1-6])$/) || (sv === "Title" ? [0, "1"] : null);
    const txt = esc(ptext(p)); if (m) return `<h${Number(m[1]) + 1}>${txt}</h${Number(m[1]) + 1}>`; if (p.getElementsByTagNameNS(W, "numPr")[0]) return `<p>• ${txt}</p>`; return txt.trim() ? `<p>${txt}</p>` : ""; };
  const block = el => el.localName === "p" ? para(el) : el.localName === "tbl" ? `<table>${kids(el, "tr").map(tr => `<tr>${kids(tr, "tc").map(tc => `<td>${[...tc.childNodes].filter(c => c.namespaceURI === W).map(block).join("")}</td>`).join("")}</tr>`).join("")}</table>` : el.localName === "sdt" ? [...(el.getElementsByTagNameNS(W, "sdtContent")[0] || el).childNodes].filter(c => c.namespaceURI === W).map(block).join("") : "";
  const b = xml.getElementsByTagNameNS(W, "body")[0]; if (!b) return "";
  return [...b.childNodes].filter(c => c.namespaceURI === W).map(block).join("");
}
/* ---- XLSX via SheetJS (pinned + SRI) ---- */
function needXlsx() {
  if (window.XLSX) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement("script"); s.src = XLSX_URL; s.integrity = XLSX_SRI; s.crossOrigin = "anonymous"; s.onload = res; s.onerror = () => rej(new Error("xlsx viewer failed to load")); document.head.appendChild(s); });
}
function xlsxView(body, buf, hi) {
  const wb = XLSX.read(buf, { type: "array", sheetRows: 2000, cellHTML: false });
  const show = name => { const html = XLSX.utils.sheet_to_html(wb.Sheets[name], { header: "", footer: "" });
    body(`<div class="tabs" id="pv-tabs">${wb.SheetNames.map(n => `<button class="btn small${n === name ? " primary" : ""}" type="button" data-sheet="${esc(n)}">${esc(n)}</button>`).join("")}</div><div class="doc" id="pv-sheet">${clean(html)}</div>`);
    const tb = $("#pv-tabs"); if (tb) tb.onclick = ev => { const b = ev.target.closest("[data-sheet]"); if (b) show(b.dataset.sheet); };
    // v115: highlight the cited rows (row numbers are the sheet's own, 1-based from its first used row)
    const ws = wb.Sheets[name]; const r0 = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s.r + 1 : 1;
    const want = hi && name === (hi.sheet || name) ? (hi.rows && hi.rows.length ? hi.rows : hi.r1 ? Array.from({ length: Math.min(500, (hi.r2 || hi.r1) - hi.r1 + 1) }, (_, i) => hi.r1 + i) : Number(hi.row) ? [Number(hi.row)] : []) : [];
    const trs = document.querySelectorAll("#pv-sheet tr"); let first = null;
    for (const r of want) { const tr = trs[r - r0]; if (tr) { tr.classList.add("hl-row"); first = first || tr; } }
    if (first) first.scrollIntoView({ block: "center" });
  };
  show(hi && hi.sheet && wb.SheetNames.includes(hi.sheet) ? hi.sheet : wb.SheetNames[0]);
}
// keep only table markup + text from SheetJS output
function clean(html) { const d = new DOMParser().parseFromString(html, "text/html"); const tb = d.querySelector("table"); if (!tb) return ""; let out = "<table>";
  for (const tr of tb.querySelectorAll("tr")) { out += "<tr>"; for (const td of tr.children) out += `<td${td.colSpan > 1 ? ` colspan="${td.colSpan | 0}"` : ""}${td.rowSpan > 1 ? ` rowspan="${td.rowSpan | 0}"` : ""}>${esc(td.textContent)}</td>`; out += "</tr>"; } return out + "</table>"; }

/* ---- download everything as one ZIP (same v106 writer as the pendrive) ---- */
async function zipAll() {
  const i = S.info, st = $("#s-zipst"), btn = $("#s-zip"); if (!i.files.length) return;
  btn.disabled = true;
  try {
    const { urls } = await api("zip");
    const total = i.files.reduce((a, f) => a + f.size, 0);
    const name = (i.title || "shared-files").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80) + ".zip";
    const sink = await pdZipSink(name, total); if (!sink) { btn.disabled = false; return; }
    const zip = new PdZip(sink); let bytes = 0, done = 0, last = 0;
    for (const d of i.folders) await zip.dir(d);
    for (const f of i.files) {
      const r = await fetch(urls[f.id]); if (!r.ok || !r.body) throw new Error(f.path + ": HTTP " + r.status);
      await zip.stream(f.path, f.size, r.body.getReader(), f.mtime, n => { bytes += n; if (Date.now() - last > 250) { last = Date.now(); st.textContent = t("zipping", done, i.files.length, pdSize(bytes)); } });
      done++; st.textContent = t("zipping", done, i.files.length, pdSize(bytes));
    }
    await zip.finish(); st.textContent = t("zipdone"); st.id = "s-zipst"; st.dataset.done = "1";
  } catch (e) { st.innerHTML = `<span class="msg" id="s-msg">${esc(e.code ? why(e) : t("err", e.message))}</span>`; }
  btn.disabled = false;
}

/* ---- AI questions (only when the owner allowed it; answers only from these files) ---- */
async function ask(q) {
  const out = $("#s-ans"); out.textContent = t("thinking");
  try {
    const r = await fetch("/api/s/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid: SID, token: S.token, question: q, lang }) });
    if (!r.ok) { let j = {}; try { j = await r.json(); } catch (e) { /* ignore */ } const e = new Error(j.error || r.status); e.code = j.error; throw e; }
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "", ans = null;
    for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let k;
      while ((k = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, k); buf = buf.slice(k + 1); if (!line) continue; let o; try { o = JSON.parse(line); } catch (e) { continue; }
        if (o.type === "answer") ans = o; else if (o.type === "error") throw new Error(o.error || o.message || "ai"); } }
    if (!ans) throw new Error("no answer");
    // v115: [n] markers become chips; each opens the file at the cited page / sheet rows / section with the passage highlighted
    const cites = ans.cites || []; const byN = new Map(cites.map(c => [c.n, c]));
    const label = l => !l ? "" : l.page ? (lang === "en" ? "p. " : "পৃ. ") + l.page : l.sheet ? `${l.sheet} ${lang === "en" ? "rows" : "সারি"} ${l.r1}${l.r2 !== l.r1 ? "–" + l.r2 : ""}` : l.h ? l.h.split(" › ").pop() : "";
    const chip = c => `<button class="chip cite" type="button" data-cite="${c.n}" title="${esc(c.path + (label(c.loc) ? " · " + label(c.loc) : ""))}">[${c.n}]</button>`;
    const body = esc(ans.text).replace(/\[(\d{1,2})\]/g, (m, n) => byN.has(Number(n)) ? chip(byN.get(Number(n))) : m);
    out.innerHTML = (ans.notFound ? `<div class="notfound" id="s-notfound">${body}</div>` : body)
      + (cites.length ? `<div class="mute" style="margin-top:8px" id="s-cites">${esc(t("sources"))}: ${cites.map(c => `<button class="chip" type="button" data-cite="${c.n}">[${c.n}] ${esc(c.path)}${label(c.loc) ? " · " + esc(label(c.loc)) : ""}</button>`).join(" ")}</div>`
        : ans.sources && ans.sources.length ? `<div class="mute" style="margin-top:8px">${esc(t("sources"))}: ${ans.sources.map((s, n) => `<button class="chip" type="button" data-src="${esc(s)}">[${n + 1}] ${esc(s)}</button>`).join(" ")}</div>` : "");
    out.onclick = ev => { const b = ev.target.closest("[data-cite],[data-src]"); if (!b) return;
      if (b.dataset.cite) { const c = byN.get(Number(b.dataset.cite)); const f = c && S.info.files.find(x => x.id === c.id || x.path === c.path); if (f) preview(f, { n: c.n, label: label(c.loc), page: c.loc && c.loc.page, sheet: c.loc && c.loc.sheet, r1: c.loc && c.loc.r1, r2: c.loc && c.loc.r2, rows: c.loc && c.loc.rows, text: c.quote }); return; }
      const f = S.info.files.find(x => x.path === b.dataset.src || x.path.endsWith("/" + b.dataset.src)); if (f) preview(f); };
  } catch (e) { out.innerHTML = `<span class="msg" id="s-msg">${esc(e.code ? (e.code === "ai_budget" ? t("ai_budget") : why(e)) : t("err", e.message))}</span>`; }
}

/* ---- upload-request page (resumable: multipart state is kept in localStorage) ---- */
function renderUpload() {
  const i = S.info, u = i.up;
  $("#app").innerHTML = head(i) + `<div class="card"><b>📤 ${esc(t("up"))}</b><p class="mute">${esc(t("uphelp", u.maxFiles, pdSize(u.maxBytes)))}</p>
    <div class="drop" id="s-drop">${esc(t("uphelp", u.maxFiles, pdSize(u.maxBytes)))}<br><br><label class="btn primary">${esc(t("choose"))}<input type="file" id="s-file" multiple hidden></label></div>
    <p class="mute" id="s-left">${esc(t("upleft", u.left))}</p><div class="ups" id="s-ups"></div></div>`;
  const dz = $("#s-drop");
  dz.ondragover = e => { e.preventDefault(); dz.classList.add("over"); }; dz.ondragleave = () => dz.classList.remove("over");
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove("over"); queue([...e.dataTransfer.files]); };
  $("#s-file").onchange = e => { queue([...e.target.files]); e.target.value = ""; };
}
const UPQ = []; let upRunning = 0;
function queue(files) { for (const f of files) { const row = document.createElement("div"); row.className = "row"; row.dataset.name = f.name; row.innerHTML = `<span style="word-break:break-all">${esc(f.name)} <span class="mute">${esc(pdSize(f.size))}</span></span><div class="bar"><i></i></div><span class="st mute">…</span>`; $("#s-ups").appendChild(row); UPQ.push({ f, row }); } pump(); }
function pump() { while (upRunning < 3 && UPQ.length) { const j = UPQ.shift(); upRunning++; sendFile(j).finally(() => { upRunning--; pump(); }); } }
const rkey = f => `s:up:${SID}:${f.name}:${f.size}:${f.lastModified}`;
function put(url, blob, onp) {
  return new Promise((res, rej) => { const x = new XMLHttpRequest(); let sent = 0;
    x.upload.onprogress = e => { onp(e.loaded - sent); sent = e.loaded; };
    x.onload = () => x.status >= 200 && x.status < 300 ? res(x.getResponseHeader("ETag") || "\"ok\"") : (onp(-sent), rej(Object.assign(new Error("HTTP " + x.status), { status: x.status })));
    x.onerror = () => { onp(-sent); rej(new Error("network")); }; x.open("PUT", url); x.send(blob); });
}
async function sendFile(job) {
  const { f, row } = job, bar = row.querySelector("i"), st = row.querySelector(".st");
  let done = 0; const draw = () => { bar.style.width = Math.min(100, 100 * done / Math.max(1, f.size)) + "%"; st.textContent = Math.floor(100 * done / Math.max(1, f.size)) + "%"; };
  try {
    let s = null; try { s = JSON.parse(localStorage.getItem(rkey(f)) || "null"); } catch (e) { s = null; }
    if (s) { try { await api("up-parts", { fileId: s.fileId, uploadId: s.uploadId, parts: [1] }); } catch (e) { if (e.status === 404) s = null; else throw e; } }
    if (!s) {
      const j = await api("up-init", { name: f.name, size: f.size, type: f.type || "application/octet-stream" });
      s = { fileId: j.fileId, uploadId: j.uploadId, partSize: j.partSize, parts: j.parts, single: !!j.single, etags: {}, urls: j.urls || {} };
      if (!s.single) localStorage.setItem(rkey(f), JSON.stringify({ ...s, urls: {} }));
    }
    const todo = []; for (let n = 1; n <= s.parts; n++) if (!s.etags[n]) todo.push(n); else done += Math.min(s.partSize, f.size - (n - 1) * s.partSize);
    draw(); let next = 0;
    const worker = async () => { while (next < todo.length) { const n = todo[next++];
      for (let tries = 0; ; tries++) { try {
        if (!s.urls[n]) Object.assign(s.urls, (await api("up-parts", { fileId: s.fileId, uploadId: s.uploadId, parts: todo.slice(todo.indexOf(n), todo.indexOf(n) + 50) })).urls);
        s.etags[n] = await put(s.urls[n], s.single ? f : f.slice((n - 1) * s.partSize, n * s.partSize), d => { done += d; draw(); });
        if (!s.single) localStorage.setItem(rkey(f), JSON.stringify({ ...s, urls: {} })); break;
      } catch (e) { if (tries >= 3 || e.code) throw e; delete s.urls[n]; await new Promise(r => setTimeout(r, 1000 * 2 ** tries)); } } } };
    await Promise.all(Array.from({ length: Math.min(4, todo.length) }, worker));
    const r = await api("up-complete", { fileId: s.fileId, uploadId: s.uploadId, parts: Object.entries(s.etags).map(([n, etag]) => ({ n: Number(n), etag })) });
    localStorage.removeItem(rkey(f)); done = f.size; draw(); st.textContent = t("sent"); row.dataset.done = r.path || f.name;
    try { S.info = { ...S.info, ...(await api("tree")) }; const el = $("#s-left"); if (el) el.textContent = t("upleft", S.info.up.left); } catch (e) { /* ignore */ }
  } catch (e) {
    st.innerHTML = ""; const b = document.createElement("button"); b.className = "btn small"; b.type = "button"; b.textContent = "⚠ " + t("resume"); b.title = e.code ? why(e) : e.message; st.appendChild(b);
    row.dataset.err = e.code || e.message; const m = document.createElement("div"); m.className = "mute"; m.textContent = e.code ? why(e) : t("err", e.message); row.appendChild(m);
    b.onclick = () => { m.remove(); delete row.dataset.err; UPQ.push(job); pump(); };
  }
}
$("#lang").onclick = () => { lang = lang === "bn" ? "en" : "bn"; localStorage.setItem("s:lang", lang); if (S.info) { $("#lang").textContent = t("lang"); render(); } else boot(); };
boot();
