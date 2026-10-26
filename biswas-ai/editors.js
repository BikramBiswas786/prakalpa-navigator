/* Drafting Desk editors: Word (.docx), Excel (.xlsx/.xls/.csv), Image (png/jpg/webp) and Notepad (text).
   Everything runs in the browser. Files are read from the pendrive with short-lived links and saved back with the
   normal upload queue. Uses globals from index.html: pd, pdApi, pdQueue, pdRefresh, pdBranches, PD_BR, load, toast, esc, settings. */
(() => {
"use strict";
const L = () => (window.settings && settings.lang === "bn") ? "bn" : "en";
const TX = {
  en: { files: "Files & AI", word: "Drafting Desk Word", excel: "Drafting Desk Excel", image: "Drafting Image", note: "Notepad",
    open: "Open…", newb: "New blank", save: "Save", saveas: "Save as…", dl: "Download", conv: "Save to conversation", conv_t: "Save a copy of this document and its AI thread as a new row in Conversations", newpage: "New page", newpage_t: "Save this document as a conversation row, then start a blank one", unsaved: "not saved yet",
    nofile: "New file (not on the pendrive yet)", pick_open: "Open a file", pick_save: "Save as", branch: "Branch", main: "Main", fname: "File name",
    cancel: "Cancel", newfolder: "New folder", nofiles: "No files in this folder.", openfail: "This file could not be opened as a document. Nothing was written into the page.", dlword: "Word", dlpdf: "PDF", dlx: "Excel", print: "Print", keepold: "Keep the old version (moved to the folder “Old versions”)",
    replace: "Replace “{0}” with your edited version?", saved: "Saved: {0}", saving: "Saving…", opening: "Opening…", lost: "You have unsaved changes. Discard them?",
    badtype: "This editor can’t open that file type.", docold: "Old .doc files can’t be read in the browser. Open the file in Word and save it as .docx first.", docold_short: "old .doc: save it as .docx in Word first",
    big: "This file is large; only the first {0} rows are shown.", fail: "Could not save: {0}", find: "Find", repl: "Replace with", next: "Next", rone: "Replace", rall: "Replace all",
    mcase: "Match case", found: "{0} replaced", nomatch: "Not found", rows: "Row", cols: "Column", insR: "+ Row", delR: "− Row", insC: "+ Column", delC: "− Column",
    freeze: "Freeze first row", addsheet: "+ Sheet", delsheet: "Delete sheet", rensheet: "Rename sheet (double-click a tab)", tbl: "Table", img: "Picture", pb: "Page break",
    undo: "Undo", redo: "Redo", rotl: "Rotate left", rotr: "Rotate right", crop: "Crop", applycrop: "Apply crop", resize: "Resize", bright: "Brightness", contrast: "Contrast",
    apply: "Apply", pen: "Pen", box: "Box", arrow: "Arrow", text: "Text", width: "Width", height: "Height", typetext: "Text to place:", trows: "Rows?", tcols: "Columns?",
    sheetname: "Sheet name:", fmt: "Format", nfolder: "Folder name:", empty: "Open a file or start a new blank one.", dropcrop: "Drag on the picture to choose the crop area." },
  bn: { files: "ফাইল ও AI", word: "ড্রাফটিং ডেস্ক Word", excel: "ড্রাফটিং ডেস্ক Excel", image: "ড্রাফটিং ছবি", note: "নোটপ্যাড",
    open: "খুলুন…", newb: "নতুন ফাঁকা", save: "সেভ", saveas: "অন্য নামে সেভ…", dl: "ডাউনলোড", conv: "কথোপকথনে রাখুন", conv_t: "এই নথি ও AI-আলাপের একটি কপি কথোপকথনে নতুন সারি হিসেবে রাখুন", newpage: "নতুন পাতা", newpage_t: "এই নথি কথোপকথনে রেখে নতুন ফাঁকা পাতা শুরু করুন", unsaved: "এখনও সেভ হয়নি",
    nofile: "নতুন ফাইল (এখনও পেনড্রাইভে নেই)", pick_open: "ফাইল খুলুন", pick_save: "অন্য নামে সেভ", branch: "শাখা", main: "মূল", fname: "ফাইলের নাম",
    cancel: "বাতিল", newfolder: "নতুন ফোল্ডার", nofiles: "এই ফোল্ডারে কোনো ফাইল নেই।", openfail: "এই ফাইল নথি হিসেবে খোলা গেল না। পাতায় কিছু লেখা হয়নি।", dlword: "Word", dlpdf: "PDF", dlx: "Excel", print: "প্রিন্ট", keepold: "পুরনো সংস্করণ রেখে দিন (“Old versions” ফোল্ডারে)",
    replace: "“{0}” আপনার সম্পাদিত সংস্করণ দিয়ে বদলাবেন?", saved: "সেভ হয়েছে: {0}", saving: "সেভ হচ্ছে…", opening: "খোলা হচ্ছে…", lost: "সেভ না করা পরিবর্তন আছে। বাদ দেবেন?",
    badtype: "এই এডিটর এই ধরনের ফাইল খুলতে পারে না।", docold: "পুরনো .doc ফাইল ব্রাউজারে পড়া যায় না। Word-এ খুলে .docx হিসেবে সেভ করুন।", docold_short: "পুরনো .doc: Word-এ .docx হিসেবে সেভ করুন",
    big: "ফাইলটি বড়; প্রথম {0}টি সারি দেখানো হচ্ছে।", fail: "সেভ হয়নি: {0}", find: "খুঁজুন", repl: "বদলে দিন", next: "পরের", rone: "বদলান", rall: "সব বদলান",
    mcase: "বড়/ছোট হাতের অক্ষর মেলান", found: "{0}টি বদলানো হয়েছে", nomatch: "পাওয়া যায়নি", rows: "সারি", cols: "কলাম", insR: "+ সারি", delR: "− সারি", insC: "+ কলাম", delC: "− কলাম",
    freeze: "প্রথম সারি আটকে রাখুন", addsheet: "+ শিট", delsheet: "শিট মুছুন", rensheet: "শিটের নাম বদলাতে ট্যাবে ডাবল-ক্লিক করুন", tbl: "টেবিল", img: "ছবি", pb: "পৃষ্ঠা বিরতি",
    undo: "আগের অবস্থা", redo: "আবার করুন", rotl: "বাঁয়ে ঘোরান", rotr: "ডানে ঘোরান", crop: "কাটুন", applycrop: "কাটা প্রয়োগ", resize: "মাপ বদল", bright: "উজ্জ্বলতা", contrast: "কনট্রাস্ট",
    apply: "প্রয়োগ", pen: "কলম", box: "বাক্স", arrow: "তীর", text: "লেখা", width: "প্রস্থ", height: "উচ্চতা", typetext: "কী লিখবেন:", trows: "কত সারি?", tcols: "কত কলাম?",
    sheetname: "শিটের নাম:", fmt: "ধরন", nfolder: "ফোল্ডারের নাম:", empty: "একটি ফাইল খুলুন বা নতুন ফাঁকা ফাইল শুরু করুন।", dropcrop: "কাটার জায়গা বাছতে ছবির উপর টেনে আঁকুন।" }
};
const T = (k, ...a) => String((TX[L()] || TX.en)[k] ?? TX.en[k] ?? k).replace(/\{(\d)\}/g, (_, i) => a[i] ?? "");
const $e = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => { const el = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === "class") el.className = v; else if (k.startsWith("on")) el.addEventListener(k.slice(2), v); else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v); } for (const c of kids.flat()) if (c != null) el.append(c); return el; };
const ext = p => (/\.([a-z0-9]+)$/i.exec(p || "") || [, ""])[1].toLowerCase();
const base = p => (p || "").split("/").pop();
const dirOf = p => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
const TYPES = {
  word: ["docx", "doc", "txt", "md", "pdf", "rtf", "policy", "json", "csv", "log", "html", "xml", "zip"], excel: ["xlsx", "xls", "csv"], image: ["png", "jpg", "jpeg", "webp"],
  note: ["txt", "md", "csv", "json", "js", "mjs", "ts", "py", "html", "htm", "css", "xml", "yml", "yaml", "ini", "log", "sh", "sql", "java", "c", "cpp", "h", "go", "rs", "php", "rb", "tsv", "env", "toml", "bat"]
};
const MIME = { docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel", csv: "text/csv", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", txt: "text/plain", md: "text/markdown", json: "application/json" };
const DEFNAME = { word: "Untitled.docx", excel: "Untitled.xlsx", image: "Untitled.png", note: "Untitled.txt" };
const KINDS = ["word", "excel", "image", "note"];
const ED = window.BA_ED = { tab: "files", st: {}, kinds: {} };
for (const k of KINDS) ED.st[k] = { file: null, name: DEFNAME[k], dirty: false, bytes: null };

/* ---------- reading / writing pendrive files ---------- */
async function fetchFile(f) {
  const get = async () => { const j = await pdApi("download-urls", { ids: [f.id] }); const u = j.urls && j.urls[f.id]; if (!u) throw new Error("not_found");
    const r = await fetch(u); if (!r.ok) throw new Error("HTTP " + r.status); return await r.blob(); };
  return await (window.PDO ? await PDO.blob(f, get) : await get()).arrayBuffer();
}
function waitUpload(u) { return new Promise((res, rej) => { const tick = () => { if (u.state === "done" || u.state === "queued") return res(); if (u.state === "fail" || u.state === "cancel" || u.state === "skip") return rej(new Error(u.err || u.state)); setTimeout(tick, 250); }; tick(); }); }
async function upload(path, blob, { overwrite = false, text } = {}) {
  const file = new File([blob], base(path), { type: blob.type || MIME[ext(path)] || "application/octet-stream" });
  pdQueue([{ file, path, text, overwrite }]);
  const u = pd.ups[pd.ups.length - 1]; await waitUpload(u); await pdRefresh().catch(() => {});
  return (pd.files || []).find(f => f.path === path) || (u.state === "queued" ? { id: "", path, size: blob.size, queued: true } : null);
}
const stamp = () => { const d = new Date(), z = n => String(n).padStart(2, "0"); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`; };
async function backupOld(f) { // cheap restorable version: the old file is renamed and moved, not copied, so it costs no extra upload
  const dir = dirOf(f.path), vdir = (dir ? dir + "/" : "") + "Old versions", e = ext(f.path), stem = base(f.path).replace(/\.[^.]+$/, "");
  if (!(pd.folders || []).includes(vdir)) { try { await pdApi("mkdir", { path: vdir }); } catch (er) { if (er.message !== "exists") throw er; } }
  await pdApi("rename", { id: f.id, name: `${stem} (old ${stamp()})${e ? "." + e : ""}` });
  await pdApi("move", { ids: [f.id], to: vdir });
}
ED.io = { fetchFile, upload, backupOld };
/* ---------- picker: Branch → Folder → File ---------- */
function pick(kind, mode, suggest) { // mode "open" | "save"; resolves to { file } or { path } or null
  return new Promise(resolve => {
    const st = ED.st[kind]; const cur0 = st.file ? dirOf(st.file.path) : (pd.cwd || "");
    let br = cur0.startsWith(PD_BR + "/") ? cur0.split("/")[1] : "", cur = cur0, extraFolders = new Set();
    const root = () => br ? PD_BR + "/" + br : "";
    const dlg = h("dialog", { class: "ed-pick", "aria-label": T(mode === "open" ? "pick_open" : "pick_save") });
    const close = v => { dlg.close(); dlg.remove(); resolve(v); };
    const draw = () => {
      if (!(cur === root() || cur.startsWith(root() + (root() ? "/" : "")))) cur = root();
      const folders = [...new Set([...(pd.folders || []), ...extraFolders])].filter(f => dirOf(f) === cur && !(cur === "" && f === PD_BR)).sort((a, b) => a.localeCompare(b));
      const ok = TYPES[kind];
      const files = (pd.files || []).filter(f => dirOf(f.path) === cur).sort((a, b) => a.path.localeCompare(b.path));
      const rel = root() ? cur.slice(root().length).replace(/^\//, "") : cur; const parts = rel ? rel.split("/") : [];
      dlg.innerHTML = "";
      const bsel = h("select", { id: "ed-pk-br", "aria-label": T("branch"), onchange: e => { br = e.target.value; cur = root(); draw(); } },
        h("option", { value: "" }, "🏠 " + T("main")), ...pdBranches().map(b => h("option", { value: b }, "⎇ " + b)));
      bsel.value = br;
      const crumbs = h("nav", { class: "ed-crumbs", "aria-label": "Folder" }, h("button", { type: "button", onclick: () => { cur = root(); draw(); } }, br ? "⎇ " + br : "🏠 " + T("main")),
        ...parts.map((p, i) => [h("span", { "aria-hidden": "true" }, " › "), h("button", { type: "button", onclick: () => { cur = (root() ? root() + "/" : "") + parts.slice(0, i + 1).join("/"); draw(); } }, p)]));
      const list = h("ul", { class: "ed-pk-list", role: "list" },
        ...folders.map(f => h("li", {}, h("button", { type: "button", class: "ed-pk-folder", "data-path": f, onclick: () => { cur = f; draw(); } }, "📁 " + base(f)))),
        ...files.map(f => { const good = TYPES[kind].includes(ext(f.path)); return h("li", {}, h("button", { type: "button", class: "ed-pk-file" + (good ? "" : " dim"), "data-path": f.path,
          onclick: () => { if (mode === "open") close({ file: f }); else name.value = base(f.path); }, ondblclick: () => { if (mode === "save") go(); } }, (good ? "📄 " : "· ") + base(f.path) + (kind === "word" && ext(f.path) === "doc" ? "  — " + T("docold_short") : ""))); }));
      if (!folders.length && !files.length) list.append(h("li", { class: "hint" }, T("nofiles")));
      const name = h("input", { id: "ed-pk-name", value: suggest || st.name, "aria-label": T("fname"), maxlength: "200" });
      const go = () => { const n = name.value.trim(); if (!n || /[\/\\:*?"<>|]/.test(n)) { name.focus(); return; } close({ path: (cur ? cur + "/" : "") + n }); };
      dlg.append(h("h3", {}, T(mode === "open" ? "pick_open" : "pick_save")), h("div", { class: "ed-pk-row" }, h("label", { for: "ed-pk-br" }, T("branch")), bsel), crumbs, list);
      if (mode === "save") dlg.append(h("div", { class: "ed-pk-row" }, h("label", { for: "ed-pk-name" }, T("fname")), name,
        h("button", { type: "button", class: "btn small", onclick: () => { const n = (prompt(T("nfolder")) || "").trim(); if (!n || /[\/\\:*?"<>|]/.test(n)) return; const f = (cur ? cur + "/" : "") + n; extraFolders.add(f); cur = f; draw(); } }, "📁+ " + T("newfolder"))));
      dlg.append(h("div", { class: "ed-pk-act" }, h("button", { type: "button", class: "btn", onclick: () => close(null) }, T("cancel")),
        mode === "save" ? h("button", { type: "button", class: "btn primary", id: "ed-pk-go", onclick: go }, T("save")) : null));
      if (mode === "save") name.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    };
    dlg.addEventListener("cancel", e => { e.preventDefault(); close(null); });
    document.body.append(dlg); draw(); dlg.showModal();
  });
}

/* ---------- the tab bar and the editor frame ---------- */
const ICON = { files: "📁", word: "📝", excel: "📊", image: "🖼️", note: "🗒️" };
function bar() {
  const nav = h("div", { class: "ed-tabs", role: "tablist", id: "ed-tabs", "aria-label": "Pendrive tools" },
    ...["files", ...KINDS].map(k => h("button", { type: "button", role: "tab", id: "ed-tab-" + k, "data-ed-tab": k, "aria-selected": String(ED.tab === k), onclick: () => show(k) }, h("span", { "aria-hidden": "true" }, ICON[k] + " "), h("span", { class: "lbl" }, T(k)))));
  const tools = h("div", { class: "ed-tab-dl" },
    h("button", { type: "button", class: "btn small", id: "ed-hd-print", onclick: () => headAct("print") }, "🖨 " + T("print")),
    h("button", { type: "button", class: "btn small", id: "ed-hd-word", onclick: () => headAct("docx") }, T("dlword")),
    h("button", { type: "button", class: "btn small", id: "ed-hd-pdf", onclick: () => headAct("pdf") }, T("dlpdf")),
    h("button", { type: "button", class: "btn small", id: "ed-hd-xlsx", onclick: () => headAct("xlsx") }, T("dlx")));
  return h("div", { class: "ed-tabbar", id: "ed-tabbar" }, nav, tools);
}
function relabel() {
  for (const b of document.querySelectorAll("[data-ed-tab] .lbl")) b.textContent = T(b.parentNode.dataset.edTab);
  const p = document.getElementById("ed-hd-print"); if (p) p.textContent = "🖨 " + T("print");
  const w = document.getElementById("ed-hd-word"); if (w) w.textContent = T("dlword");
  const f = document.getElementById("ed-hd-pdf"); if (f) f.textContent = T("dlpdf");
  const x = document.getElementById("ed-hd-xlsx"); if (x) x.textContent = T("dlx");
}
function show(k) {
  if (!KINDS.includes(k)) k = "files"; relabel();
  ED.tab = k; const main = $e("#pd-main"); main.classList.toggle("ed-on", k !== "files");
  for (const b of document.querySelectorAll("[data-ed-tab]")) b.setAttribute("aria-selected", String(b.dataset.edTab === k));
  for (const kk of KINDS) { const p = $e("#ed-" + kk); if (p) p.hidden = kk !== k; }
  if (k !== "files") { ensure(k); if (k === "image") requestAnimationFrame(() => ED.kinds.image.fit()); }
}
function frame(kind) {
  const st = ED.st[kind];
  const sec = h("section", { class: "ed-pane", id: "ed-" + kind, hidden: true, "aria-label": T(kind) });
  const head = h("div", { class: "ed-head" },
    h("div", { class: "ed-title" }, h("b", { class: "ed-fname" }), h("span", { class: "ed-where" }), h("span", { class: "ed-dirty", hidden: true, title: T("unsaved") }, "● " + T("unsaved"))),
    h("div", { class: "ed-actions" },
      h("button", { type: "button", class: "btn small", "data-ed": "open", onclick: () => doOpen(kind) }, "📂 " + T("open")),
      h("button", { type: "button", class: "btn small", "data-ed": "new", onclick: () => doNew(kind) }, "＋ " + T("newb")),
      h("button", { type: "button", class: "btn small primary", "data-ed": "save", onclick: () => doSave(kind) }, "💾 " + T("save")),
      h("button", { type: "button", class: "btn small", "data-ed": "saveas", onclick: () => doSave(kind, true) }, T("saveas")),
      h("button", { type: "button", class: "btn small", "data-ed": "dl", onclick: () => doDownload(kind) }, "⬇ " + T("dl")),
      h("button", { type: "button", class: "btn small", "data-ed": "as-docx", onclick: () => dlAs(kind, "docx") }, T("dlword")),
      h("button", { type: "button", class: "btn small", "data-ed": "as-pdf", onclick: () => dlAs(kind, "pdf") }, T("dlpdf")),
      h("button", { type: "button", class: "btn small", "data-ed": "as-xlsx", onclick: () => dlAs(kind, "xlsx") }, T("dlx")),
      h("button", { type: "button", class: "btn small", "data-ed": "conv", id: "ed-conv-" + kind, title: T("conv_t"), onclick: () => ED.ai && ED.ai.saveConv(kind) }, "💾 " + T("conv")),
      h("button", { type: "button", class: "btn small", "data-ed": "newpage", title: T("newpage_t"), onclick: () => ED.ai && ED.ai.newPage(kind) }, "📄 " + T("newpage"))));
  const body = h("div", { class: "ed-body" });
  const msg = h("p", { class: "status-line ed-msg", role: "status" });
  sec.append(head, msg, body); st.sec = sec; st.body = body; st.msg = msg;
  return sec;
}
function label(kind) {
  const st = ED.st[kind]; if (!st.sec) return;
  $e(".ed-fname", st.sec).textContent = st.file ? base(st.file.path) : st.name;
  const d = st.file ? dirOf(st.file.path) : ""; const br = d.startsWith(PD_BR + "/") ? d.split("/")[1] : "";
  $e(".ed-where", st.sec).textContent = st.file ? " — " + (br ? "⎇ " + br : "🏠 " + T("main")) + (d.replace(/^⎇\/[^/]+\/?/, "") ? " › " + d.replace(/^⎇\/[^/]+\/?/, "").split("/").join(" › ") : "") : " — " + T("nofile");
  $e(".ed-dirty", st.sec).hidden = !st.dirty;
}
function dirty(kind, v = true) { const st = ED.st[kind]; if (st.dirty !== v) { st.dirty = v; label(kind); } }
ED.dirty = dirty;
const say = (kind, m) => { ED.st[kind].msg.textContent = m || ""; };
function ensure(kind) {
  const st = ED.st[kind]; if (st.ready) return; st.ready = true; $e("#ed-host").append(frame(kind)); st.sec.hidden = false;
  ED.kinds[kind].init(st.body, kind); ED.kinds[kind].blank(); label(kind);
  if (ED.ai) ED.ai.mount(kind);
}
async function doOpen(kind, file) {
  const st = ED.st[kind], tabs = ED.kinds[kind].newTab;
  if (st.dirty && !tabs && !confirm(T("lost"))) return;
  if (!file) { const r = await pick(kind, "open"); if (!r) return; file = r.file; }
  if (tabs) { const same = ED.kinds[kind].findTab && ED.kinds[kind].findTab(file.path); if (same) return; ED.kinds[kind].newTab(); }
  const e = ext(file.path);
  if (kind === "word" && e === "doc") { say(kind, T("docold")); return; }
  if (kind !== "word" && !TYPES[kind].includes(e)) { say(kind, T("badtype")); return; }
  say(kind, T("opening"));
  try { const buf = await fetchFile(file); await ED.kinds[kind].load(buf, e, file.path); st.file = { id: file.id, path: file.path }; st.name = base(file.path); st.dirty = false; label(kind); say(kind, ""); }
  catch (er) { const m = String((er && er.message) || er); say(kind, m === "openfail" || /zip|central directory|jszip|mammoth/i.test(m) ? T("openfail") : (m.length > 160 ? T("openfail") : m)); }
}
function doNew(kind) {
  const st = ED.st[kind]; if (ED.kinds[kind].newTab) { ED.kinds[kind].newTab(true); say(kind, ""); return; }
  if (st.dirty && !confirm(T("lost"))) return;
  ED.kinds[kind].blank(); st.file = null; st.name = DEFNAME[kind]; st.dirty = false; label(kind); say(kind, "");
}
function confirmSave(path) {
  return new Promise(resolve => {
    const keep = h("input", { type: "checkbox", id: "ed-keep", checked: true });
    const dlg = h("dialog", { class: "ed-pick ed-confirm" }, h("p", {}, T("replace", path)), h("label", { class: "ed-chk" }, keep, " " + T("keepold")),
      h("div", { class: "ed-pk-act" }, h("button", { type: "button", class: "btn", onclick: () => fin(null) }, T("cancel")), h("button", { type: "button", class: "btn primary", id: "ed-confirm-go", onclick: () => fin({ keep: keep.checked }) }, T("save"))));
    const fin = v => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.addEventListener("cancel", e => { e.preventDefault(); fin(null); });
    document.body.append(dlg); dlg.showModal();
  });
}
async function doSave(kind, as = false) {
  const st = ED.st[kind]; const E = ED.kinds[kind];
  let path, overwrite = false, old = null;
  if (!as && st.file) {
    old = (pd.files || []).find(f => f.id === st.file.id) || (pd.files || []).find(f => f.path === st.file.path);
    path = st.file.path;
    const c = await confirmSave(path); if (!c) return;
    if (old && c.keep) { try { await backupOld(old); } catch (er) { say(kind, T("fail", er.message)); return; } }
    else overwrite = true;
  } else {
    const suggest = st.file ? base(st.file.path) : st.name;
    const r = await pick(kind, "save", suggest); if (!r) return; path = r.path;
    if (!E.exts().includes(ext(path))) path += "." + E.exts()[0];
    if ((pd.files || []).some(f => f.path === path)) { if (!confirm(T("replace", path))) return; overwrite = true; }
  }
  say(kind, T("saving"));
  try {
    const { blob, text } = await E.export(ext(path));
    const f = await upload(path, blob, { overwrite, text });
    st.file = f ? { id: f.id, path: f.path } : { id: "", path }; st.name = base(path); st.dirty = false; label(kind); say(kind, T("saved", path));
  } catch (er) { say(kind, T("fail", (er && er.message) || String(er))); }
}
async function plainOf(kind) {
  if (kind === "word") return (document.getElementById("wd-page") || {}).innerText || "";
  if (kind === "note") return (document.getElementById("np-ta") || {}).value || "";
  if (kind === "excel") { const { blob } = await ED.kinds.excel.export("csv"); return await blob.text(); }
  return ED.st[kind].name || "";
}
async function dlAs(kind, fmt) {
  const st = ED.st[kind];
  const stem = ((st.file ? base(st.file.path) : st.name) || "document").replace(/\.[^.]+$/, "") || "document";
  say(kind, T("opening"));
  try {
    let blob, name = stem + "." + fmt;
    if (fmt === "docx") {
      if (kind === "word") blob = (await ED.kinds.word.export()).blob;
      else { const div = document.createElement("div"); (await plainOf(kind)).split(/\n/).forEach(line => { const p = document.createElement("p"); p.textContent = line || " "; div.append(p); }); blob = await ED.htmlToDocx(div, {}); }
    } else if (fmt === "pdf") {
      const html = kind === "word" ? (document.getElementById("wd-page") || {}).innerHTML || "<p></p>" : (await plainOf(kind)).split(/\n/).map(l => `<p>${XE(l || " ")}</p>`).join("");
      blob = await htmlToPdf(html);
    } else if (kind === "excel") blob = (await ED.kinds.excel.export("xlsx")).blob;
    else {
      await load("xlsx"); const rows = (await plainOf(kind)).split(/\n/).map(l => [l]);
      const ws = XLSX.utils.aoa_to_sheet(rows.length ? rows : [[""]]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      blob = new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: MIME.xlsx });
    }
    const a = h("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    say(kind, "");
  } catch (e) { say(kind, T("openfail")); }
}
function cleanPrint(html) {
  const f = h("iframe", { style: "position:fixed;right:0;bottom:0;width:0;height:0;border:0", title: "\u00a0" });
  document.body.append(f);
  const d = f.contentDocument; d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>\u00a0</title><style>@page{margin:0}html,body{margin:0}body{padding:14mm 12mm;font:12pt/1.5 Calibri,"Noto Sans",sans-serif;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #808080;padding:4px 6px;vertical-align:top}img{max-width:100%}pre{white-space:pre-wrap;font:11pt Consolas,monospace}p{margin:0 0 8pt}</style></head><body>${html}</body></html>`);
  d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); }, 400);
}
async function headAct(fmt) {
  const k = ED.tab || "files";
  if (k === "files") {
    if (fmt === "print" && window.pdPrintAnswer) return window.pdPrintAnswer();
    if (window.pdOutAct) return window.pdOutAct(fmt === "xlsx" ? "csv" : fmt);
    return;
  }
  if (fmt === "print") {
    const K = ED.kinds[k];
    if (K && K.print) return K.print();
    if (k === "image" && K) {
      const { blob } = await K.export();
      const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
      return cleanPrint(`<img src="${data}" alt="">`);
    }
    const text = await plainOf(k);
    const rows = String(text || "").split(/\n/).filter(l => l.length).map(l => "<tr>" + l.split(/,|\t/).map(c => `<td>${XE(c)}</td>`).join("") + "</tr>").join("");
    return cleanPrint(rows ? `<table>${rows}</table>` : `<pre>${XE(text || "")}</pre>`);
  }
  return dlAs(k, fmt);
}
async function doDownload(kind) {
  const st = ED.st[kind]; const E = ED.kinds[kind]; const name = st.file ? base(st.file.path) : st.name;
  const { blob } = await E.export(ext(name) || E.exts()[0]);
  const a = h("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
window.addEventListener("beforeunload", e => { if (KINDS.some(k => ED.st[k].dirty)) { e.preventDefault(); e.returnValue = ""; } });
document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && KINDS.includes(ED.tab)) { e.preventDefault(); doSave(ED.tab, e.shiftKey); } });
function mount() {
  const main = $e("#pd-main"), top = main && $e(".pd-top", main); if (!top || $e("#ed-tabs")) return;
  new MutationObserver(() => { if (main.hidden) { for (const k of KINDS) { const st = ED.st[k]; if (st.ready) ED.kinds[k].blank(); st.file = null; st.name = DEFNAME[k]; st.dirty = false; label(k); } show("files"); } else relabel(); }).observe(main, { attributes: true, attributeFilter: ["hidden"] });
  top.after(bar()); $e("#ed-tabbar").after(h("div", { class: "ed-host", id: "ed-host" }));
}
ED.relabel = relabel; ED.show = show; ED.open = doOpen; ED.pick = pick; ED.T = T;
// shared with the per-editor modules (ed-*.js): helpers and a way to add their own words
ED.h = h; ED.ext = ext; ED.base = base; ED.dirOf = dirOf; ED.MIME = MIME; ED.TYPES = TYPES; ED.say = say; ED.label = label;
ED.addTX = o => { for (const l of Object.keys(o)) Object.assign(TX[l] || (TX[l] = {}), o[l]); };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
/* ---------- Notepad ---------- */
ED.kinds.note = (() => {
  let ta, gut, fi, ri, mc, cnt, curExt = "txt";
  let nl = -1;
  const lines = () => { const n = ta.value.split("\n").length; if (nl !== n && (nl = n)) gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n"); gut.scrollTop = ta.scrollTop; };
  const norm = s => mc.checked ? s : s.toLowerCase();
  function findNext() { const q = fi.value; if (!q) return false; const v = norm(ta.value), qq = norm(q); let i = v.indexOf(qq, ta.selectionEnd); if (i < 0) i = v.indexOf(qq); if (i < 0) { cnt.textContent = T("nomatch"); return false; } ta.focus(); ta.setSelectionRange(i, i + q.length); cnt.textContent = ""; const lh = ta.scrollHeight / Math.max(1, ta.value.split("\n").length); ta.scrollTop = Math.max(0, ta.value.slice(0, i).split("\n").length * lh - ta.clientHeight / 2); return true; }
  function replOne() { const q = fi.value; if (!q) return; const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd); if (norm(sel) === norm(q) && sel.length) { ta.setRangeText(ri.value, ta.selectionStart, ta.selectionEnd, "end"); ED.dirty("note"); lines(); } findNext(); }
  function replAll() { const q = fi.value; if (!q) return; const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), mc.checked ? "g" : "gi"); let n = 0; ta.value = ta.value.replace(re, () => { n++; return ri.value; }); cnt.textContent = T("found", n); if (n) ED.dirty("note"); lines(); }
  return {
    exts: () => [curExt, ...TYPES.note],
    init(body) {
      fi = h("input", { id: "np-find", placeholder: T("find"), "aria-label": T("find") }); ri = h("input", { id: "np-repl", placeholder: T("repl"), "aria-label": T("repl") });
      mc = h("input", { type: "checkbox", id: "np-mc" }); cnt = h("span", { class: "hint", role: "status" });
      fi.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); findNext(); } });
      const tools = h("div", { class: "ed-tool" }, fi, h("button", { type: "button", class: "btn small", id: "np-next", onclick: findNext }, T("next")), ri,
        h("button", { type: "button", class: "btn small", id: "np-rone", onclick: replOne }, T("rone")), h("button", { type: "button", class: "btn small", id: "np-rall", onclick: replAll }, T("rall")),
        h("label", { class: "ed-chk" }, mc, " " + T("mcase")), cnt);
      gut = h("pre", { class: "np-gut", "aria-hidden": "true" }); ta = h("textarea", { class: "np-ta", id: "np-ta", spellcheck: "false", wrap: "off", "aria-label": T("note") });
      ta.addEventListener("input", () => { ED.dirty("note"); lines(); }); ta.addEventListener("scroll", () => { gut.scrollTop = ta.scrollTop; });
      ta.addEventListener("keydown", e => { if (e.key === "Tab") { e.preventDefault(); ta.setRangeText("\t", ta.selectionStart, ta.selectionEnd, "end"); ED.dirty("note"); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); fi.focus(); fi.select(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") { e.preventDefault(); ri.focus(); } });
      body.append(tools, h("div", { class: "np-wrap" }, gut, ta));
    },
    blank() { ta.value = ""; curExt = "txt"; lines(); },
    async load(buf, e) { let s = new TextDecoder("utf-8").decode(buf); if (s.charCodeAt(0) === 0xfeff) s = s.slice(1); ta.value = s.replace(/\r\n/g, "\n"); curExt = e || "txt"; lines(); ta.scrollTop = 0; },
    async export(e) { const s = ta.value; return { blob: new Blob([s], { type: (MIME[e] || "text/plain") + ";charset=utf-8" }), text: s }; }
  };
})();
/* ---------- Excel ---------- */
const colName = c => { let s = ""; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
const colNum = s => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
class XErr { constructor(c) { this.c = c; } }
const ERR = c => { throw new XErr(c); };
function xEngine(book) { // book.sheets[i] = { name, cells: Map("r,c" -> raw string) }
  // named ranges: book.names = { Name: "Sheet1!$A$1:$B$5" }; a bare name in a formula (outside quotes, not a function) means that range
  const withNames = f => { const N = book.names; if (!N || !Object.keys(N).length) return f; const map = new Map(Object.entries(N).map(([k, v]) => [k.toUpperCase(), v]));
    return f.split(/("[^"]*")/).map((part, i) => i % 2 ? part : part.replace(/(^|[^A-Za-z0-9_.!$'])([A-Za-z_][A-Za-z0-9_.]*)(?![A-Za-z0-9_.(!])/g, (m, a, n) => map.has(n.toUpperCase()) ? a + map.get(n.toUpperCase()) : m)).join(""); };
  let memo = new Map(), busy = new Set();
  const sheetIx = name => { if (name == null) return -1; const n = name.replace(/^'|'$/g, "").toLowerCase(); return book.sheets.findIndex(s => s.name.toLowerCase() === n); };
  function cellVal(si, r, c) {
    const key = si + ":" + r + "," + c; if (memo.has(key)) { const v = memo.get(key); if (v instanceof XErr) throw v; return v; }
    if (busy.has(key)) ERR("#CYCLE!");
    const raw = book.sheets[si] && book.sheets[si].cells.get(r + "," + c);
    let v;
    if (raw == null || raw === "") v = null;
    else if (raw[0] === "=" && raw.length > 1) { busy.add(key); try { v = evalF(withNames(raw.slice(1)), si); if (v && v.range) v = first(v); } catch (e) { v = e instanceof XErr ? e : new XErr("#ERR!"); } busy.delete(key); }
    else if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(raw.trim())) v = parseFloat(raw);
    else if (/^(true|false)$/i.test(raw)) v = /^true$/i.test(raw);
    else if (/^[+-]?(\d+\.?\d*)%$/.test(raw.trim())) v = parseFloat(raw) / 100;
    else v = raw;
    memo.set(key, v); if (v instanceof XErr) throw v; return v;
  }
  function first(rg) { const [si, r1, c1] = rg.range; return cellVal(si, r1, c1); }
  function flat(args) { const out = []; for (const a of args) { if (a && a.range) { const [si, r1, c1, r2, c2] = a.range; for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) out.push({ v: cellVal(si, r, c), ref: true }); } else out.push({ v: a, ref: false }); } return out; }
  const nums = args => flat(args).filter(x => typeof x.v === "number" || (!x.ref && (typeof x.v === "boolean" || (typeof x.v === "string" && x.v !== "" && !isNaN(+x.v))))).map(x => +x.v);
  const num = v => { if (v && v.range) v = first(v); if (v instanceof XErr) throw v; if (v == null || v === "") return 0; if (typeof v === "boolean") return +v; if (typeof v === "number") return v; const n = +v; if (isNaN(n)) ERR("#VALUE!"); return n; };
  const str = v => { if (v && v.range) v = first(v); if (v instanceof XErr) throw v; return v == null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v); };
  const FN = {
    SUM: a => nums(a).reduce((x, y) => x + y, 0), AVERAGE: a => { const n = nums(a); if (!n.length) ERR("#DIV/0!"); return n.reduce((x, y) => x + y, 0) / n.length; },
    MIN: a => { const n = nums(a); return n.length ? Math.min(...n) : 0; }, MAX: a => { const n = nums(a); return n.length ? Math.max(...n) : 0; },
    COUNT: a => nums(a).length, COUNTA: a => flat(a).filter(x => x.v != null && x.v !== "").length, PRODUCT: a => nums(a).reduce((x, y) => x * y, 1),
    ROUND: a => { const p = Math.pow(10, num(a[1] ?? 0)); return Math.round(num(a[0]) * p) / p; }, ABS: a => Math.abs(num(a[0])), INT: a => Math.floor(num(a[0])),
    SQRT: a => { const n = num(a[0]); if (n < 0) ERR("#NUM!"); return Math.sqrt(n); }, MOD: a => { const d = num(a[1]); if (!d) ERR("#DIV/0!"); const n = num(a[0]); return n - d * Math.floor(n / d); },
    IF: a => { if (a[0] instanceof XErr) return a[0]; const c = a[0] && a[0].range ? first(a[0]) : a[0]; return (typeof c === "string" ? c !== "" : !!c) ? (a[1] ?? true) : (a[2] ?? false); },
    AND: a => flat(a).every(x => !!x.v), OR: a => flat(a).some(x => !!x.v), NOT: a => !num(a[0]),
    CONCAT: a => flat(a).map(x => str(x.v)).join(""), CONCATENATE: a => flat(a).map(x => str(x.v)).join(""), LEN: a => [...str(a[0])].length,
    UPPER: a => str(a[0]).toUpperCase(), LOWER: a => str(a[0]).toLowerCase(), TRIM: a => str(a[0]).trim().replace(/\s+/g, " ")
  };
  if (xEngine.ext) Object.assign(FN, xEngine.ext({ flat, nums, num, str, first, cellVal, ERR, XErr, book }));
  const LAZY = new Set(["IFERROR", "IFNA", "ISERROR", "ISERR", "ISNA", "IF", "ERROR.TYPE"]);
  function evalF(src, si) {
    const toks = []; const re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+)|("(?:[^"]|"")*")|((?:'[^']+'|[A-Za-z_][\w.]*)!)?(\$?[A-Za-z]{1,3}\$?\d+)(?::(\$?[A-Za-z]{1,3}\$?\d+))?|([A-Za-z_][\w.]*)|(<>|<=|>=|[-+*/^&=<>(),%]))/y;
    let m, pos = 0; src = src.trim();
    while (pos < src.length) { re.lastIndex = pos; m = re.exec(src); if (!m || m[0] === "") ERR("#ERR!"); pos = re.lastIndex;
      if (m[1] != null) toks.push({ t: "n", v: parseFloat(m[1]) }); else if (m[2] != null) toks.push({ t: "s", v: m[2].slice(1, -1).replace(/""/g, '"') });
      else if (m[4] != null) { const sx = m[3] ? sheetIx(m[3].slice(0, -1)) : si; if (sx < 0) ERR("#REF!"); const a = /\$?([A-Za-z]+)\$?(\d+)/.exec(m[4]); let r1 = +a[2] - 1, c1 = colNum(a[1]), r2 = r1, c2 = c1; if (m[5]) { const b = /\$?([A-Za-z]+)\$?(\d+)/.exec(m[5]); r2 = +b[2] - 1; c2 = colNum(b[1]); } toks.push({ t: "r", v: [sx, Math.min(r1, r2), Math.min(c1, c2), Math.max(r1, r2), Math.max(c1, c2)], single: !m[5] }); }
      else if (m[6] != null) toks.push({ t: "id", v: m[6].toUpperCase() }); else toks.push({ t: "op", v: m[7] }); }
    let i = 0; const peek = () => toks[i], eat = v => { const k = toks[i]; if (v && (!k || k.v !== v)) ERR("#ERR!"); i++; return k; };
    const val = v => v && v.range ? first(v) : v;
    function cmp() { let a = cat(); while (peek() && peek().t === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(peek().v)) { const o = eat().v; let x = val(a), y = val(cat()); if (typeof x === "string" || typeof y === "string") { x = str(x).toLowerCase(); y = str(y).toLowerCase(); } else { x = num(x); y = num(y); } a = o === "=" ? x === y : o === "<>" ? x !== y : o === "<" ? x < y : o === ">" ? x > y : o === "<=" ? x <= y : x >= y; } return a; }
    function cat() { let a = add(); while (peek() && peek().v === "&") { eat(); a = str(a) + str(add()); } return a; }
    function add() { let a = mul(); while (peek() && (peek().v === "+" || peek().v === "-") && peek().t === "op") { const o = eat().v; const b = num(mul()); a = o === "+" ? num(a) + b : num(a) - b; } return a; }
    function mul() { let a = pw(); while (peek() && (peek().v === "*" || peek().v === "/") && peek().t === "op") { const o = eat().v; const b = num(pw()); if (o === "/" && b === 0) ERR("#DIV/0!"); a = o === "*" ? num(a) * b : num(a) / b; } return a; }
    function pw() { let a = un(); while (peek() && peek().v === "^") { eat(); a = Math.pow(num(a), num(un())); } return a; }
    function un() { if (peek() && peek().t === "op" && (peek().v === "-" || peek().v === "+")) { const o = eat().v; const v = num(un()); return o === "-" ? -v : v; } let v = prim(); if (peek() && peek().v === "%") { eat(); v = num(v) / 100; } return v; }
    function prim() { const k = eat(); if (!k) ERR("#ERR!");
      if (k.t === "n" || k.t === "s") return k.v;
      if (k.t === "r") return k.single ? cellVal(k.v[0], k.v[1], k.v[2]) : { range: k.v };
      if (k.t === "id") { if (k.v === "TRUE") return true; if (k.v === "FALSE") return false; const f = FN[k.v]; if (!f || !peek() || peek().v !== "(") ERR("#NAME?"); eat("("); const args = [];
        const arg = () => { const st = i; try { return cmp(); } catch (e) { if (!(e instanceof XErr)) throw e; i = st; let d = 0; while (i < toks.length) { const t = toks[i]; if (t.t === "op" && t.v === "(") d++; else if (t.t === "op" && t.v === ")") { if (!d) break; d--; } else if (t.t === "op" && t.v === "," && !d) break; i++; } return e; } };
        if (peek() && peek().v !== ")") { args.push(arg()); while (peek() && peek().v === ",") { eat(); args.push(peek() && (peek().v === "," || peek().v === ")") ? null : arg()); } } eat(")");
        if (!LAZY.has(k.v)) { const bad = args.find(a => a instanceof XErr); if (bad) throw bad; }
        const out = f(args, si); if (out instanceof XErr) throw out; return out; }
      if (k.v === "(") { const v = cmp(); eat(")"); return v; }
      ERR("#ERR!"); }
    const v = cmp(); if (i < toks.length) ERR("#ERR!"); return v;
  }
  return { reset() { memo = new Map(); busy = new Set(); }, get(si, r, c) { try { return cellVal(si, r, c); } catch (e) { return e instanceof XErr ? e : new XErr("#ERR!"); } } };
}
function shiftRefs(f, own, ownName, axis, at, d) { // insert (d=1) / delete (d=-1) a row or column in formulas
  return f.split(/("(?:[^"]|"")*")/).map((part, k) => k % 2 ? part : part.replace(/((?:'[^']+'|[A-Za-z_][\w.]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\w(])/g, (all, sh, d1, col, d2, row) => {
    const mine = sh ? sh.slice(0, -1).replace(/^'|'$/g, "").toLowerCase() === ownName.toLowerCase() : own; if (!mine) return all;
    let r = +row - 1, c = colNum(col);
    if (axis === "r") { if (d < 0 && r === at) return (sh || "") + "#REF!"; if (r >= at + (d < 0 ? 1 : 0)) r += d; } else { if (d < 0 && c === at) return (sh || "") + "#REF!"; if (c >= at + (d < 0 ? 1 : 0)) c += d; }
    return (sh || "") + d1 + colName(c) + d2 + (r + 1);
  })).join("");
}
ED.xl = { xEngine, colName, colNum, shiftRefs, XErr };
ED.kinds.excel = (() => {
  const MAXR = 2000;
  let book, eng, si = 0, sel = { r: 0, c: 0 }, wrap, tbl, fx, addr, tabs, freezeBox, curExt = "xlsx", editing = false;
  const S = () => book.sheets[si];
  const fmt = v => v == null ? "" : v instanceof XErr ? v.c : typeof v === "number" ? (Number.isInteger(v) ? String(v) : String(+v.toPrecision(10))) : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v);
  const ext0 = s => { let r = 0, c = 0; for (const k of s.cells.keys()) { const [a, b] = k.split(",").map(Number); r = Math.max(r, a + 1); c = Math.max(c, b + 1); } return { r, c }; };
  function newSheet(name) { return { name, cells: new Map(), colW: [], nr: 50, nc: 12 }; }
  function render() {
    const s = S(); const e = ext0(s); s.nr = Math.max(s.nr, e.r + 10, 30); s.nc = Math.max(s.nc, e.c + 2, 10);
    const nr = Math.min(s.nr, MAXR); eng.reset();
    const cg = `<colgroup><col style="width:46px">${Array.from({ length: s.nc }, (_, c) => `<col style="width:${s.colW[c] || 90}px">`).join("")}</colgroup>`;
    const th = `<thead><tr><th class="xs-corner"></th>${Array.from({ length: s.nc }, (_, c) => `<th scope="col" data-c="${c}">${colName(c)}<span class="xs-rz" data-rz="${c}"></span></th>`).join("")}</tr></thead>`;
    let body = "";
    for (let r = 0; r < nr; r++) { body += `<tr><th scope="row">${r + 1}</th>`; for (let c = 0; c < s.nc; c++) { const raw = s.cells.get(r + "," + c); const v = raw == null || raw === "" ? null : eng.get(si, r, c); const n = typeof v === "number"; body += `<td data-r="${r}" data-c="${c}"${n ? ' class="n"' : v instanceof XErr ? ' class="e"' : ""}>${esc(fmt(v))}</td>`; } body += "</tr>"; }
    tbl.innerHTML = cg + th + `<tbody>${body}</tbody>`; tbl.style.width = (46 + Array.from({ length: s.nc }, (_, c) => s.colW[c] || 90).reduce((a, b) => a + b, 0)) + "px";
    tabs.innerHTML = ""; book.sheets.forEach((sh, i) => tabs.append(h("button", { type: "button", class: "xs-tab", role: "tab", "aria-selected": String(i === si), "data-si": i, title: T("rensheet"), onclick: () => { si = i; sel = { r: 0, c: 0 }; render(); }, ondblclick: () => renameSheet(i) }, sh.name)));
    tabs.append(h("button", { type: "button", class: "btn small", id: "xs-addsheet", onclick: addSheet }, T("addsheet")));
    if (s.cells.size === 0 && e.r === 0) {} if (nr < s.nr) ED.st.excel.msg.textContent = T("big", MAXR);
    paintSel();
  }
  function cellTd(r, c) { return tbl.querySelector(`td[data-r="${r}"][data-c="${c}"]`); }
  function paintSel() { const o = tbl.querySelector("td.sel"); if (o) o.classList.remove("sel"); const td = cellTd(sel.r, sel.c); if (td) { td.classList.add("sel"); td.scrollIntoView({ block: "nearest", inline: "nearest" }); } addr.textContent = colName(sel.c) + (sel.r + 1); fx.value = S().cells.get(sel.r + "," + sel.c) || ""; }
  function refresh() { eng.reset(); const s = S(); for (const td of tbl.querySelectorAll("tbody td")) { const r = +td.dataset.r, c = +td.dataset.c; const raw = s.cells.get(r + "," + c); const v = raw == null || raw === "" ? null : eng.get(si, r, c); td.textContent = fmt(v); td.className = (typeof v === "number" ? "n" : v instanceof XErr ? "e" : "") + (r === sel.r && c === sel.c ? " sel" : ""); } }
  function setCell(r, c, raw) { const s = S(); const k = r + "," + c; const old = s.cells.get(k) || ""; if (old === raw) return; if (raw === "") s.cells.delete(k); else s.cells.set(k, raw); ED.dirty("excel"); if (r >= s.nr - 2 || c >= s.nc - 1) render(); else refresh(); }
  function move(dr, dc) { const s = S(); sel = { r: Math.max(0, Math.min(Math.min(s.nr, MAXR) - 1, sel.r + dr)), c: Math.max(0, Math.min(s.nc - 1, sel.c + dc)) }; paintSel(); }
  function commit(dr = 1, dc = 0) { if (!editing) return; editing = false; setCell(sel.r, sel.c, fx.value); move(dr, dc); wrap.focus(); }
  function structural(axis, d) {
    const s = S(), at = axis === "r" ? sel.r : sel.c; const nm = new Map();
    for (const [k, v] of s.cells) { let [r, c] = k.split(",").map(Number); const p = axis === "r" ? r : c; if (d < 0 && p === at) continue; if (p >= at + (d < 0 ? 1 : 0)) { if (axis === "r") r += d; else c += d; } nm.set(r + "," + c, v); }
    s.cells = nm; if (axis === "c") { if (d > 0) s.colW.splice(at, 0, undefined); else s.colW.splice(at, 1); s.nc = Math.max(1, s.nc + d); } else s.nr = Math.max(1, s.nr + d);
    book.sheets.forEach((sh, i) => { for (const [k, v] of sh.cells) if (v && v[0] === "=") sh.cells.set(k, shiftRefs(v, i === si, s.name, axis, at, d)); });
    ED.dirty("excel"); render();
  }
  function addSheet() { let n = book.sheets.length + 1; while (book.sheets.some(s => s.name === "Sheet" + n)) n++; book.sheets.push(newSheet("Sheet" + n)); si = book.sheets.length - 1; ED.dirty("excel"); render(); }
  function renameSheet(i) { const n = (prompt(T("sheetname"), book.sheets[i].name) || "").trim().slice(0, 31); if (!n || /[\\\/?*\[\]:]/.test(n) || book.sheets.some((s, j) => j !== i && s.name.toLowerCase() === n.toLowerCase())) return; book.sheets[i].name = n; ED.dirty("excel"); render(); }
  function delSheet() { if (book.sheets.length < 2) return; if (!confirm(T("delsheet") + ": " + S().name + "?")) return; book.sheets.splice(si, 1); si = Math.max(0, si - 1); ED.dirty("excel"); render(); }
  return {
    exts: () => [curExt, "xlsx", "csv", "xls"],
    init(body) {
      addr = h("span", { class: "xs-addr", id: "xs-addr" }); fx = h("input", { class: "xs-fx", id: "xs-fx", "aria-label": "Formula", spellcheck: "false" });
      fx.addEventListener("input", () => { editing = true; const td = cellTd(sel.r, sel.c); if (td) td.textContent = fx.value; });
      fx.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); editing = true; commit(e.shiftKey ? -1 : 1, 0); } else if (e.key === "Tab") { e.preventDefault(); editing = true; commit(0, e.shiftKey ? -1 : 1); } else if (e.key === "Escape") { editing = false; paintSel(); refresh(); wrap.focus(); } });
      fx.addEventListener("blur", () => { if (editing) { editing = false; setCell(sel.r, sel.c, fx.value); } });
      freezeBox = h("input", { type: "checkbox", id: "xs-freeze", checked: true, onchange: () => tbl.classList.toggle("frz", freezeBox.checked) });
      const tb = h("div", { class: "ed-tool" },
        h("button", { type: "button", class: "btn small", id: "xs-insr", onclick: () => structural("r", 1) }, T("insR")), h("button", { type: "button", class: "btn small", id: "xs-delr", onclick: () => structural("r", -1) }, T("delR")),
        h("button", { type: "button", class: "btn small", id: "xs-insc", onclick: () => structural("c", 1) }, T("insC")), h("button", { type: "button", class: "btn small", id: "xs-delc", onclick: () => structural("c", -1) }, T("delC")),
        h("label", { class: "ed-chk" }, freezeBox, " " + T("freeze")), h("button", { type: "button", class: "btn small", id: "xs-delsheet", onclick: delSheet }, T("delsheet")));
      tbl = h("table", { class: "xs frz", id: "xs-grid" }); wrap = h("div", { class: "xs-wrap", tabindex: "0", "aria-label": T("excel") }, tbl);
      tabs = h("div", { class: "xs-tabs", role: "tablist" });
      wrap.addEventListener("mousedown", e => { const td = e.target.closest("td[data-r]"); if (!td) return; if (editing) commit(0, 0); sel = { r: +td.dataset.r, c: +td.dataset.c }; paintSel(); });
      wrap.addEventListener("dblclick", e => { if (e.target.closest("td[data-r]")) { fx.focus(); fx.setSelectionRange(fx.value.length, fx.value.length); } });
      wrap.addEventListener("keydown", e => {
        if (e.target !== wrap) return; const k = e.key;
        const mv = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Enter: [1, 0], Tab: [0, 1] }[k];
        if (mv) { e.preventDefault(); move(e.shiftKey && (k === "Enter" || k === "Tab") ? -mv[0] : mv[0], e.shiftKey && (k === "Enter" || k === "Tab") ? -mv[1] : mv[1]); return; }
        if (k === "Delete" || k === "Backspace") { e.preventDefault(); setCell(sel.r, sel.c, ""); paintSel(); return; }
        if (k === "F2") { e.preventDefault(); fx.focus(); return; }
        if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); fx.value = k; editing = true; fx.focus(); const td = cellTd(sel.r, sel.c); if (td) td.textContent = k; }
      });
      let rz = null; // column resize
      tbl.addEventListener("mousedown", e => { const g = e.target.closest("[data-rz]"); if (!g) return; e.preventDefault(); e.stopPropagation(); const c = +g.dataset.rz; rz = { c, x: e.clientX, w: S().colW[c] || 90 }; });
      document.addEventListener("mousemove", e => { if (!rz) return; const w = Math.max(30, Math.min(600, rz.w + e.clientX - rz.x)); S().colW[rz.c] = w; const col = tbl.querySelectorAll("col")[rz.c + 1]; if (col) col.style.width = w + "px"; });
      document.addEventListener("mouseup", () => { if (rz) { rz = null; ED.dirty("excel"); render(); } });
      body.append(tb, h("div", { class: "xs-bar" }, addr, h("span", { class: "xs-fxl", "aria-hidden": "true" }, "ƒx"), fx), wrap, tabs);
    },
    blank() { book = { sheets: [newSheet("Sheet1")] }; eng = xEngine(book); si = 0; sel = { r: 0, c: 0 }; curExt = "xlsx"; render(); },
    async load(buf, e) {
      await load("xlsx");
      const wb = e === "csv" ? XLSX.read(new TextDecoder("utf-8").decode(buf).replace(/^\ufeff/, ""), { type: "string", raw: true }) : XLSX.read(new Uint8Array(buf), { type: "array", cellFormula: true, cellNF: true, cellDates: false, sheetStubs: true, cellStyles: true });
      book = { sheets: wb.SheetNames.map(n => { const ws = wb.Sheets[n]; const s = newSheet(n);
        for (const a of Object.keys(ws)) { if (a[0] === "!") continue; const cell = ws[a]; const d = XLSX.utils.decode_cell(a); let raw;
          if (cell.f) raw = "=" + cell.f; else if (cell.t === "b") raw = cell.v ? "TRUE" : "FALSE"; else if (cell.t === "n" && cell.z && /[dmyhs]/i.test(String(cell.z)) && cell.w) raw = cell.w; else if (cell.t === "e") raw = cell.w || "#ERR!"; else raw = cell.v == null ? "" : String(cell.v);
          if (raw !== "") s.cells.set(d.r + "," + d.c, raw); }
        (ws["!cols"] || []).forEach((c, i) => { if (c && (c.wpx || c.wch || c.width)) s.colW[i] = Math.round(c.wpx || (c.wch || c.width) * 7 + 5); });
        return s; }) };
      if (!book.sheets.length) book.sheets.push(newSheet("Sheet1"));
      eng = xEngine(book); si = 0; sel = { r: 0, c: 0 }; curExt = e; ED.st.excel.msg.textContent = ""; render();
    },
    async export(e) {
      await load("xlsx"); eng.reset(); const wb = XLSX.utils.book_new();
      const sheets = e === "csv" ? [book.sheets[si]] : book.sheets;
      sheets.forEach(s => { const ix = book.sheets.indexOf(s); const ws = {}; let mr = 0, mc = 0;
        for (const [k, raw] of s.cells) { const [r, c] = k.split(",").map(Number); mr = Math.max(mr, r); mc = Math.max(mc, c); const v = eng.get(ix, r, c); const cell = {};
          if (raw[0] === "=" && raw.length > 1) { cell.f = raw.slice(1); if (v instanceof XErr) { cell.t = "s"; cell.v = v.c; } else if (typeof v === "number") { cell.t = "n"; cell.v = v; } else if (typeof v === "boolean") { cell.t = "b"; cell.v = v; } else { cell.t = "s"; cell.v = v == null ? "" : String(v); } }
          else if (typeof v === "number") { cell.t = "n"; cell.v = v; } else if (typeof v === "boolean") { cell.t = "b"; cell.v = v; } else { cell.t = "s"; cell.v = raw; }
          ws[XLSX.utils.encode_cell({ r, c })] = cell; }
        ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: mr, c: mc } });
        ws["!cols"] = Array.from({ length: mc + 1 }, (_, c) => ({ wch: Math.round(((s.colW[c] || 90) - 5) / 7 * 100) / 100 }));
        if (freezeBox.checked) { ws["!freeze"] = { xSplit: 0, ySplit: 1 }; ws["!views"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2" }]; }
        XLSX.utils.book_append_sheet(wb, ws, s.name); });
      const bt = e === "csv" ? "csv" : e === "xls" ? "biff8" : "xlsx";
      let out = e === "csv" ? XLSX.utils.sheet_to_csv(wb.Sheets[sheets[0].name]) : XLSX.write(wb, { bookType: bt, type: "array", compression: true });
      if (e === "xlsx" && freezeBox.checked) { // the free SheetJS build does not write frozen panes; add the pane to each sheet's XML
        await load("jszip"); const z = await JSZip.loadAsync(out);
        for (const n of Object.keys(z.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))) { const x = await z.file(n).async("string"); z.file(n, x.replace(/<sheetView workbookViewId="0"\s*\/>/, '<sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView>')); }
        out = await z.generateAsync({ type: "arraybuffer", compression: "DEFLATE" }); }
      return { blob: new Blob(e === "csv" ? ["\ufeff", out] : [out], { type: MIME[e] || MIME.xlsx }) };
    }
  };
})();
/* ---------- Word: an A4 page you type into, docx in (mammoth) and docx out (own OOXML writer) ---------- */
const XE = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const pxToPt = px => Math.round(px * 0.75 * 2) / 2;
async function htmlToDocx(root, O = {}) {
  await load("jszip");
  const media = [], nums = [], rels = [], cmts = [], fnotes = []; let pid = 1, revId = 1;
  const secBase = () => { const G = O.page || {}, m = v => Math.round(v / 25.4 * 1440), pw = m(G.w || 210), ph = m(G.h || 297); return `<w:pgSz w:w="${pw}" w:h="${ph}"${pw > ph ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${m(G.mt ?? 25.4)}" w:right="${m(G.mr ?? 25.4)}" w:bottom="${m(G.mb ?? 25.4)}" w:left="${m(G.ml ?? 25.4)}" w:header="708" w:footer="708" w:gutter="0"/>`; };
  const isoT = t => (/^\d{4}-/.test(t || "") ? t : new Date().toISOString()).replace(/\.\d+Z$/, "Z");
  const rid = (type, target) => { const id = "rId" + (rels.length + 10); rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`); return id; };
  async function imgBytes(img) {
    const src = img.getAttribute("src") || ""; let mime = "", bytes;
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(src);
    if (m) { mime = m[1]; bytes = m[2] ? Uint8Array.from(atob(m[3]), c => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(m[3])); }
    else { const r = await fetch(src); mime = r.headers.get("content-type") || ""; bytes = new Uint8Array(await r.arrayBuffer()); }
    if (!/^image\/(png|jpe?g|gif)$/.test(mime)) { // Word-safe: re-encode anything else as PNG
      const bmp = await createImageBitmap(new Blob([bytes], { type: mime })); const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height; c.getContext("2d").drawImage(bmp, 0, 0);
      bytes = new Uint8Array(await (await new Promise(r => c.toBlob(r, "image/png"))).arrayBuffer()); mime = "image/png"; }
    return { bytes, ext: mime === "image/png" ? "png" : mime === "image/gif" ? "gif" : "jpeg" };
  }
  async function drawing(img) {
    const { bytes, ext } = await imgBytes(img); const n = media.length + 1; const name = `image${n}.${ext}`; media.push({ name, bytes });
    const id = rid("image", "media/" + name);
    let w = img.width || img.naturalWidth || 200, hh = img.height || img.naturalHeight || 150; const max = 602; if (w > max) { hh = hh * max / w; w = max; }
    const cx = Math.round(w * 9525), cy = Math.round(hh * 9525), d = pid++;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${d}" name="Picture ${d}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${d}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }
  const colorHex = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || ""); if (m) return [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, "0")).join("").toUpperCase(); const h6 = /^#([0-9a-f]{6})$/i.exec(c || ""); return h6 ? h6[1].toUpperCase() : ""; };
  function rpr(s) {
    let x = "";
    if (s.font) x += `<w:rFonts w:ascii="${XE(s.font)}" w:hAnsi="${XE(s.font)}" w:cs="${XE(s.font)}" w:eastAsia="${XE(s.font)}"/>`;
    if (s.b) x += "<w:b/><w:bCs/>"; if (s.i) x += "<w:i/><w:iCs/>"; if (s.strike) x += "<w:strike/>";
    if (s.color && s.color !== "000000") x += `<w:color w:val="${s.color}"/>`;
    if (s.sz) x += `<w:sz w:val="${s.sz}"/><w:szCs w:val="${s.sz}"/>`;
    if (s.u) x += '<w:u w:val="single"/>';
    if (s.va) x += `<w:vertAlign w:val="${s.va}"/>`;
    if (s.hl) x += `<w:shd w:val="clear" w:color="auto" w:fill="${s.hl}"/>`;
    return x ? `<w:rPr>${x}</w:rPr>` : "";
  }
  function inlineStyle(el, s) {
    const n = { ...s }; const tag = el.tagName; const st = el.style;
    if (tag === "B" || tag === "STRONG") n.b = true; if (tag === "I" || tag === "EM") n.i = true; if (tag === "U" || tag === "INS") n.u = true; if (tag === "S" || tag === "STRIKE" || tag === "DEL") n.strike = true; if (tag === "SUP") n.va = "superscript"; if (tag === "SUB") n.va = "subscript";
    if (tag === "FONT") { if (el.getAttribute("face")) n.font = el.getAttribute("face").split(",")[0].replace(/["']/g, "").trim(); if (el.getAttribute("color")) n.color = colorHex(el.getAttribute("color")); }
    if (st) { if (st.fontWeight && (st.fontWeight === "bold" || +st.fontWeight >= 600)) n.b = true; if (st.fontWeight === "normal" || st.fontWeight === "400") n.b = false; if (st.fontStyle === "italic") n.i = true; if (st.verticalAlign === "super") n.va = "superscript"; if (st.verticalAlign === "sub") n.va = "subscript";
      if (/underline/.test(st.textDecoration || st.textDecorationLine || "")) n.u = true; if (/line-through/.test(st.textDecoration || "")) n.strike = true;
      if (st.fontFamily) n.font = st.fontFamily.split(",")[0].replace(/["']/g, "").trim();
      if (st.fontSize) { const m = /([\d.]+)(pt|px)/.exec(st.fontSize); if (m) n.sz = Math.round((m[2] === "pt" ? +m[1] : pxToPt(+m[1])) * 2); }
      if (st.color) n.color = colorHex(st.color) || n.color; if (st.backgroundColor && colorHex(st.backgroundColor) && colorHex(st.backgroundColor) !== "FFFFFF") n.hl = colorHex(st.backgroundColor); }
    return n;
  }
  async function runs(node, s) {
    let x = "";
    for (const ch of node.childNodes) {
      if (ch.nodeType === 3) { const t = ch.nodeValue.replace(/[\r\n]+/g, " "); if (t) x += `<w:r>${rpr(s)}<w:t xml:space="preserve">${XE(t)}</w:t></w:r>`; }
      else if (ch.nodeType === 1) { const tg = ch.tagName;
        if (tg === "BR") x += "<w:r><w:br/></w:r>"; else if (tg === "IMG") x += await drawing(ch);
        else if (tg === "SPAN" && ch.classList.contains("wd-cmt")) { const id = cmts.length; cmts.push({ id, text: ch.dataset.c || "", a: ch.dataset.a || "User", t: isoT(ch.dataset.t) });
          x += `<w:commentRangeStart w:id="${id}"/>${await runs(ch, s)}<w:commentRangeEnd w:id="${id}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`; }
        else if (tg === "INS" && ch.classList.contains("wd-ins")) x += `<w:ins w:id="${revId++}" w:author="${XE(ch.dataset.a || "User")}" w:date="${isoT(ch.dataset.t)}">${await runs(ch, s)}</w:ins>`;
        else if (tg === "DEL" && ch.classList.contains("wd-del")) x += `<w:del w:id="${revId++}" w:author="${XE(ch.dataset.a || "User")}" w:date="${isoT(ch.dataset.t)}">${(await runs(ch, s)).replace(/<w:t( [^>]*)?>/g, "<w:delText$1>").replace(/<\/w:t>/g, "</w:delText>")}</w:del>`;
        else if (tg === "SUP" && ch.classList.contains("wd-fn")) { const id = fnotes.length + 1; fnotes.push({ id, text: ch.dataset.fn || "" }); x += `<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`; }
        else if (tg === "A") { const href = ch.getAttribute("href") || ""; if (/^https?:|^mailto:/i.test(href)) { const id = rid("hyperlink", XE(href)).replace(/$/, ""); rels[rels.length - 1] = rels[rels.length - 1].replace("/>", ' TargetMode="External"/>'); x += `<w:hyperlink r:id="${id}">${await runs(ch, { ...inlineStyle(ch, s), u: true, color: "0563C1" })}</w:hyperlink>`; } else x += await runs(ch, inlineStyle(ch, s)); }
        else if (/^(UL|OL|TABLE|P|DIV|H[1-6]|BLOCKQUOTE|HR|PRE)$/.test(tg)) {} // block inside inline: handled by caller
        else x += await runs(ch, inlineStyle(ch, s)); }
    }
    return x;
  }
  const JC = { left: "left", start: "left", center: "center", right: "right", end: "right", justify: "both" };
  const tw = v => { const m = /(-?[\d.]+)(px|pt|mm|cm|in|em)?/.exec(v || ""); if (!m) return 0; const k = { px: 15, pt: 20, mm: 56.7, cm: 567, in: 1440, em: 240 }[m[2] || "px"]; return Math.round(+m[1] * k); };
  function pextra(el) { const st = el.style || {}; let x = "";
    { const sides = ["Top", "Left", "Bottom", "Right"].filter(b => st["border" + b + "Style"] && st["border" + b + "Style"] !== "none"); if (sides.length) x += `<w:pBdr>${sides.map(b => { const c = colorHex(st["border" + b + "Color"]) || "000000", w = parseFloat(st["border" + b + "Width"]) || 1, sty = st["border" + b + "Style"]; return `<w:${b.toLowerCase()} w:val="${sty === "double" ? "double" : sty === "dashed" ? "dashed" : sty === "dotted" ? "dotted" : "single"}" w:sz="${Math.max(2, Math.min(96, Math.round(w * 6)))}" w:space="4" w:color="${c}"/>`; }).join("")}</w:pBdr>`; }
    const lh = parseFloat(st.lineHeight); if (lh && /^[\d.]+$/.test(st.lineHeight)) x += `<w:spacing w:line="${Math.round(240 * lh)}" w:lineRule="auto"/>`;
    const ml = tw(st.marginLeft), ti = tw(st.textIndent); if (ml > 0 || ti) x += `<w:ind w:left="${Math.max(0, ml)}"${ti > 0 ? ` w:firstLine="${ti}"` : ti < 0 ? ` w:hanging="${-ti}"` : ""}/>`;
    return x; }
  function ppr(el, extra = "") { let x = extra + pextra(el); const al = (el.style && el.style.textAlign) || el.getAttribute("align") || ""; if (JC[al] && JC[al] !== "left") x += `<w:jc w:val="${JC[al]}"/>`; return x ? `<w:pPr>${x}</w:pPr>` : ""; }
  const isBlock = n => n.nodeType === 1 && /^(P|DIV|H[1-6]|UL|OL|TABLE|BLOCKQUOTE|HR|PRE|LI|SECTION|ARTICLE|FIGURE)$/.test(n.tagName);
  async function para(el, pp, s = {}) { return `<w:p>${pp}${await runs(el, s)}</w:p>`; }
  async function blocks(parent, ctx = {}) {
    let x = "", inl = [];
    const flush = async () => { if (!inl.length) return; const d = document.createElement("span"); inl.forEach(n => d.append(n.cloneNode(true))); const r = await runs(d, {}); if (r.replace(/<w:r><w:t xml:space="preserve">\s*<\/w:t><\/w:r>/g, "")) x += `<w:p>${ctx.pp || ""}${r}</w:p>`; inl = []; };
    for (const n of [...parent.childNodes]) {
      if (!isBlock(n)) { if (n.nodeType === 3 && !n.nodeValue.trim() && !inl.length) continue; inl.push(n); continue; }
      await flush(); const tg = n.tagName;
      if (/^H[1-6]$/.test(tg)) x += await para(n, ppr(n, `<w:pStyle w:val="Heading${Math.min(+tg[1], 3)}"/>`), {});
      else if (tg === "DIV" && n.classList.contains("wd-vline")) { // straight vertical line: a VML line in its own paragraph (Word, LibreOffice and Google Docs read it)
        const bw = parseFloat(n.style.borderLeftWidth) || 2, bc = colorHex(n.style.borderLeftColor) || "000000", hh = parseFloat(n.style.height) || 160, ml = parseFloat(n.style.marginLeft) || 0, pt = v => (v * 0.75).toFixed(1);
        x += `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:pict><v:line xmlns:v="urn:schemas-microsoft-com:vml" from="${pt(ml)}pt,0" to="${pt(ml)}pt,${pt(hh)}pt" strokecolor="#${bc}" strokeweight="${pt(bw)}pt" style="position:absolute;mso-position-horizontal-relative:text;mso-position-vertical-relative:text"/></w:pict></w:r></w:p><w:p><w:pPr><w:spacing w:before="${Math.round(hh * 15)}" w:after="0"/></w:pPr></w:p>`; }
      else if (tg === "HR" && n.classList.contains("wd-hr")) { const bw = parseFloat(n.style.borderTopWidth) || 1.5, bc = colorHex(n.style.borderTopColor) || "000000", wpx = /px$/.test(n.style.width) ? parseFloat(n.style.width) : 0, ml = parseFloat(n.style.marginLeft) || 0, right = wpx ? Math.max(0, 9026 - Math.round((wpx + ml) * 15)) : 0;
        x += `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="${Math.max(2, Math.min(96, Math.round(bw * 6)))}" w:space="1" w:color="${bc}"/></w:pBdr><w:spacing w:after="120"/>${ml || right ? `<w:ind w:left="${Math.round(ml * 15)}" w:right="${right}"/>` : ""}</w:pPr></w:p>`; }
      else if (tg === "HR" || n.classList.contains("ed-pb")) x += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
      else if (n.classList.contains("wd-tbox")) { const w = Math.round(Math.min(9026, Math.max(1440, (n.offsetWidth || 300) * 15))); x += `<w:tbl><w:tblPr><w:tblW w:w="${w}" w:type="dxa"/><w:tblBorders>${["top", "left", "bottom", "right"].map(b => `<w:${b} w:val="single" w:sz="8" w:space="0" w:color="${colorHex(n.style.borderTopColor) || "333333"}"/>`).join("")}</w:tblBorders><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${w}"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${colorHex(n.style.backgroundColor) && colorHex(n.style.backgroundColor) !== "FFFFFF" ? `<w:shd w:val="clear" w:color="auto" w:fill="${colorHex(n.style.backgroundColor)}"/>` : ""}</w:tcPr>${(await blocks(n)) || "<w:p/>"}</w:tc></w:tr></w:tbl><w:p/>`; }
      else if (tg === "DIV" && n.classList.contains("wd-cols")) { const k = Math.max(1, Math.min(3, +n.dataset.n || 2));
        x += `<w:p><w:pPr><w:sectPr>${secBase()}<w:type w:val="continuous"/></w:sectPr></w:pPr></w:p>` + await blocks(n, ctx) + `<w:p><w:pPr><w:sectPr>${secBase()}<w:type w:val="continuous"/><w:cols w:num="${k}" w:space="720"/></w:sectPr></w:pPr></w:p>`; }
      else if (tg === "UL" || tg === "OL") x += await list(n, 0);
      else if (tg === "TABLE") x += await table(n);
      else if (tg === "BLOCKQUOTE") x += await blocks(n, { pp: '<w:pPr><w:pStyle w:val="Quote"/></w:pPr>' });
      else if (tg === "PRE") x += n.textContent.split("\n").map(l => `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/></w:rPr><w:t xml:space="preserve">${XE(l)}</w:t></w:r></w:p>`).join("");
      else if ([...n.childNodes].some(isBlock)) x += await blocks(n, ctx);
      else { const r = await runs(n, inlineStyle(n, {})); x += `<w:p>${ppr(n)}${r}</w:p>`; }
    }
    await flush(); return x;
  }
  async function list(el, lvl, numId) {
    if (numId == null) { numId = nums.length + 1; nums.push(el.tagName === "OL" ? "num" : "bul"); }
    let x = "";
    for (const li of el.children) {
      if (li.tagName !== "LI") { if (li.tagName === "UL" || li.tagName === "OL") x += await list(li, Math.min(lvl + 1, 8), numId); continue; }
      const inner = document.createElement("div"); const subs = [];
      for (const c of li.childNodes) { if (c.nodeType === 1 && (c.tagName === "UL" || c.tagName === "OL")) subs.push(c); else inner.append(c.cloneNode(true)); }
      const p = [...inner.children].find(c => c.tagName === "P"); const src = p && inner.children.length === 1 ? p : inner;
      x += `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="${numId}"/></w:numPr>${pextra(li).replace(/<w:ind [^>]*\/>/, "")}${(() => { const al = li.style.textAlign; return JC[al] && JC[al] !== "left" ? `<w:jc w:val="${JC[al]}"/>` : ""; })()}</w:pPr>${await runs(src, {})}</w:p>`;
      for (const s of subs) x += await list(s, Math.min(lvl + 1, 8), s.tagName === el.tagName ? numId : undefined);
    }
    return x;
  }
  async function table(t) {
    const rows = [...t.rows]; if (!rows.length) return "";
    const ncol = Math.max(...rows.map(r => [...r.cells].reduce((a, c) => a + (c.colSpan || 1), 0))); const cw = Math.floor(9026 / ncol);
    // widths dragged in the editor: <col style="width:Npx"> (or %), table style width
    const tpx = t.style && /px$/.test(t.style.width) ? parseFloat(t.style.width) : t.style && /%$/.test(t.style.width) ? 602 * parseFloat(t.style.width) / 100 : 602;
    const cols = [...t.querySelectorAll(":scope > colgroup > col")].map(c => /px$/.test(c.style.width) ? parseFloat(c.style.width) * 15 : /%$/.test(c.style.width) ? tpx * 15 * parseFloat(c.style.width) / 100 : 0);
    const gw = Array.from({ length: ncol }, (_, i) => Math.max(200, Math.round(cols[i] || (cols.length ? 0 : 0) || cw)));
    const totW = Math.min(14000, gw.reduce((a, b) => a + b, 0)); const custom = cols.some(Boolean) || (t.style && t.style.width);
    let x = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>${custom ? `<w:tblW w:w="${totW}" w:type="dxa"/>` : '<w:tblW w:w="5000" w:type="pct"/>'}<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`).join("")}</w:tblBorders><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>${custom ? '<w:tblLayout w:type="fixed"/>' : ""}<w:tblGrid>${gw.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
    for (const r of rows) {
      const rh = parseFloat(r.style && r.style.height); x += "<w:tr>" + (rh > 0 ? `<w:trPr><w:trHeight w:val="${Math.round(rh * 15)}" w:hRule="atLeast"/></w:trPr>` : ""); let used = 0;
      for (const c of r.cells) { const span = c.colSpan || 1; used += span; const th = c.tagName === "TH";
        let inner = await blocks(c, th ? {} : {}); if (th) inner = inner.replace(/<w:r>(<w:rPr>(<w:rFonts[^>]*\/>)?)?/g, (m, p, f) => p ? (/<w:b\/>/.test(inner) ? m : "<w:r><w:rPr>" + (f || "") + "<w:b/>") : "<w:r><w:rPr><w:b/></w:rPr>");
        if (!inner) inner = "<w:p/>"; x += `<w:tc><w:tcPr><w:tcW w:w="${gw.slice(used - span, used).reduce((a, b) => a + b, 0)}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""}${th ? '<w:shd w:val="clear" w:color="auto" w:fill="E7EEF7"/>' : ""}</w:tcPr>${inner}</w:tc>`; }
      for (; used < ncol; used++) x += `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`;
      x += "</w:tr>";
    }
    return x + "</w:tbl><w:p/>";
  }
  let body = await blocks(root); if (!body) body = "<w:p/>";
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const G = O.page || {}, mmT = v => Math.round(v / 25.4 * 1440);
  const WM = O.wm ? `<w:p><w:r><w:pict><v:shape id="BAWaterMark" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:468pt;height:117pt;rotation:315;z-index:-251654144;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" fillcolor="silver" stroked="f"><v:fill opacity=".5"/><v:textpath style="font-family:&quot;Calibri&quot;;font-size:1pt" string="${XE(O.wm)}"/></v:shape></w:pict></w:r></w:p>` : "";
  const hf = (tag, text, pn) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:${tag} ${NS} xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">${tag === "hdr" ? WM : ""}${text ? `<w:p><w:pPr><w:jc w:val="${JC[(O.hfAlign || {})[tag]] || "center"}"/></w:pPr><w:r><w:t xml:space="preserve">${XE(text)}</w:t></w:r></w:p>` : ""}${pn ? `<w:p><w:pPr><w:jc w:val="${JC[pn] || "center"}"/></w:pPr><w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p>` : ""}${!text && !pn ? "<w:p/>" : ""}</w:${tag}>`;
  const hdrX = O.header || O.wm || (O.pnum && O.pnumPos === "top") ? hf("hdr", O.header, O.pnum && O.pnumPos === "top" ? O.pnumAlign : "") : "", ftrX = O.footer || (O.pnum && O.pnumPos !== "top") ? hf("ftr", O.footer, O.pnum && O.pnumPos !== "top" ? O.pnumAlign : "") : "";
  const hdrId = hdrX && rid("header", "header1.xml"), ftrId = ftrX && rid("footer", "footer1.xml");
  const pw = mmT(G.w || 210), ph = mmT(G.h || 297), land = pw > ph;
  const sect = `<w:sectPr>${hdrId ? `<w:headerReference w:type="default" r:id="${hdrId}"/>` : ""}${ftrId ? `<w:footerReference w:type="default" r:id="${ftrId}"/>` : ""}<w:pgSz w:w="${pw}" w:h="${ph}"${land ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${mmT(G.mt ?? 25.4)}" w:right="${mmT(G.mr ?? 25.4)}" w:bottom="${mmT(G.mb ?? 25.4)}" w:left="${mmT(G.ml ?? 25.4)}" w:header="708" w:footer="708" w:gutter="0"/>${O.pbd ? `<w:pgBorders w:offsetFrom="text">${(O.pbd === "box" ? ["top", "left", "bottom", "right"] : ["left"]).map(e => `<w:${e} w:val="single" w:sz="${Math.round(Math.max(.5, +O.pbw || 1.5) * 8)}" w:space="12" w:color="${String(O.pbc || "#000000").replace("#", "")}"/>`).join("")}</w:pgBorders>` : ""}</w:sectPr>`;
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}${sect}</w:body></w:document>`;
  const F = O.font || "Noto Serif Bengali", FSZ = Math.round((O.size || 12) * 2), rf = f => `<w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}" w:eastAsia="${f}"/>`;
  const hd = (n, sz, sp) => `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${sp}" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="1F3864"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr></w:style>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr>${rf(XE(F))}<w:sz w:val="${FSZ}"/><w:szCs w:val="${FSZ}"/><w:lang w:val="en-IN" w:bidi="bn-IN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="${O.line ? Math.round(240 * O.line) : 300}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${hd(1, 36, 360)}${hd(2, 30, 240)}${hd(3, 26, 200)}<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:ind w:left="720"/><w:contextualSpacing/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/><w:color w:val="555555"/></w:rPr></w:style><w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblPr><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`).join("")}</w:tblBorders></w:tblPr></w:style></w:styles>`;
  const lvlX = (kind, i) => kind === "num" ? `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${["decimal", "lowerLetter", "lowerRoman"][i % 3]}"/><w:lvlText w:val="%${i + 1}."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr></w:lvl>` : `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${["•", "◦", "▪"][i % 3]}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr></w:lvl>`;
  const numbering = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${Array.from({ length: 9 }, (_, i) => lvlX("bul", i)).join("")}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${Array.from({ length: 9 }, (_, i) => lvlX("num", i)).join("")}</w:abstractNum>${nums.map((k, i) => `<w:num w:numId="${i + 1}"><w:abstractNumId w:val="${k === "num" ? 1 : 0}"/>${k === "num" ? '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride>' : ""}</w:num>`).join("")}</w:numbering>`;
  const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const cmtX = cmts.length ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${W_NS}>${cmts.map(c => `<w:comment w:id="${c.id}" w:author="${XE(c.a)}" w:date="${c.t}" w:initials="${XE(c.a.slice(0, 2).toUpperCase())}"><w:p><w:r><w:t xml:space="preserve">${XE(c.text)}</w:t></w:r></w:p></w:comment>`).join("")}</w:comments>` : "";
  const fnX = fnotes.length ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes ${W_NS}><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote><w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>${fnotes.map(f => `<w:footnote w:id="${f.id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> ${XE(f.text)}</w:t></w:r></w:p></w:footnote>`).join("")}</w:footnotes>` : "";
  if (cmtX) rid("comments", "comments.xml"); if (fnX) rid("footnotes", "footnotes.xml");
  const extraCT = (cmtX ? '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>' : "") + (fnX ? '<Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/>' : "");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>${hdrX ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ""}${ftrX ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ""}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${extraCT}</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Biswas AI</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Biswas AI</Application></Properties>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>${rels.join("")}</Relationships>`);
  zip.file("word/document.xml", doc); zip.file("word/styles.xml", styles); zip.file("word/numbering.xml", numbering); if (hdrX) zip.file("word/header1.xml", hdrX); if (ftrX) zip.file("word/footer1.xml", ftrX); if (cmtX) zip.file("word/comments.xml", cmtX); if (fnX) zip.file("word/footnotes.xml", fnX);
  for (const m of media) zip.file("word/media/" + m.name, m.bytes);
  return await zip.generateAsync({ type: "blob", mimeType: MIME.docx, compression: "DEFLATE" });
}
ED.htmlToDocx = htmlToDocx;
ED.XE = XE; // the Word editor itself lives in ed-word.js
/* ---------- Image ---------- */
ED.kinds.image = (() => {
  let cv, ov, ctx, octx, tool = "pen", color, lw, bri, con, rw, rh, keep, undo = [], redo = [], drag = null, crop = null, curExt = "png", stage;
  const snap = () => { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 25) undo.shift(); redo = []; };
  const restore = d => { cv.width = d.width; cv.height = d.height; ov.width = d.width; ov.height = d.height; ctx.putImageData(d, 0, 0); sizes(); };
  function sizes() { rw.value = cv.width; rh.value = cv.height; }
  function setCanvas(w, hh, draw) { cv.width = w; cv.height = hh; ov.width = w; ov.height = hh; ctx = cv.getContext("2d", { willReadFrequently: true }); octx = ov.getContext("2d"); if (draw) draw(ctx); sizes(); fit(); }
  function fit() { const box = stage.getBoundingClientRect(); const mw = Math.max(200, box.width - 4), mh = Math.max(200, window.innerHeight - stage.getBoundingClientRect().top - 24); const s = Math.min(1, mw / cv.width, mh / cv.height); for (const c of [cv, ov]) { c.style.width = Math.round(cv.width * s) + "px"; c.style.height = Math.round(cv.height * s) + "px"; } }
  const pt = e => { const r = ov.getBoundingClientRect(); return { x: (e.clientX - r.left) * ov.width / r.width, y: (e.clientY - r.top) * ov.height / r.height }; };
  function arrow(g, a, b) { const ang = Math.atan2(b.y - a.y, b.x - a.x), L = Math.max(10, g.lineWidth * 4); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.beginPath(); g.moveTo(b.x, b.y); g.lineTo(b.x - L * Math.cos(ang - 0.45), b.y - L * Math.sin(ang - 0.45)); g.lineTo(b.x - L * Math.cos(ang + 0.45), b.y - L * Math.sin(ang + 0.45)); g.closePath(); g.fill(); }
  const style = g => { g.strokeStyle = color.value; g.fillStyle = color.value; g.lineWidth = +lw.value; g.lineCap = "round"; g.lineJoin = "round"; };
  function down(e) { if (e.button) return; const p = pt(e); ov.setPointerCapture(e.pointerId);
    if (tool === "text") { const s = prompt(T("typetext")); if (!s) return; snap(); style(ctx); ctx.font = `${Math.max(12, +lw.value * 6)}px "Noto Sans Bengali","Noto Sans",sans-serif`; ctx.textBaseline = "top"; s.split("\n").forEach((l, i) => ctx.fillText(l, p.x, p.y + i * Math.max(12, +lw.value * 6) * 1.25)); ED.dirty("image"); return; }
    if (tool === "pen") { snap(); style(ctx); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.01, p.y); ctx.stroke(); }
    drag = { a: p, b: p }; }
  function move(e) { if (!drag) return; const p = pt(e);
    if (tool === "pen") { ctx.lineTo(p.x, p.y); ctx.stroke(); drag.b = p; return; }
    drag.b = p; octx.clearRect(0, 0, ov.width, ov.height); style(octx); const { a, b } = drag;
    if (tool === "box") octx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); else if (tool === "arrow") arrow(octx, a, b);
    else if (tool === "crop") { octx.fillStyle = "rgba(0,0,0,.45)"; octx.fillRect(0, 0, ov.width, ov.height); octx.clearRect(a.x, a.y, b.x - a.x, b.y - a.y); octx.setLineDash([8, 6]); octx.strokeStyle = "#fff"; octx.lineWidth = Math.max(2, ov.width / 400); octx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); octx.setLineDash([]); } }
  function up() { if (!drag) return; const { a, b } = drag; drag = null;
    if (tool === "pen") { ED.dirty("image"); return; }
    if (tool === "crop") { crop = { x: Math.round(Math.max(0, Math.min(a.x, b.x))), y: Math.round(Math.max(0, Math.min(a.y, b.y))), w: Math.round(Math.abs(b.x - a.x)), h: Math.round(Math.abs(b.y - a.y)) }; crop.w = Math.min(crop.w, cv.width - crop.x); crop.h = Math.min(crop.h, cv.height - crop.y); document.getElementById("im-applycrop").disabled = crop.w < 2 || crop.h < 2; return; }
    octx.clearRect(0, 0, ov.width, ov.height); if (Math.hypot(b.x - a.x, b.y - a.y) < 2) return; snap(); style(ctx);
    if (tool === "box") ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); else if (tool === "arrow") arrow(ctx, a, b); ED.dirty("image"); }
  function applyCrop() { if (!crop || crop.w < 2 || crop.h < 2) return; snap(); const d = ctx.getImageData(crop.x, crop.y, crop.w, crop.h); setCanvas(crop.w, crop.h, g => g.putImageData(d, 0, 0)); crop = null; octx.clearRect(0, 0, ov.width, ov.height); document.getElementById("im-applycrop").disabled = true; ED.dirty("image"); }
  function rotate(dir) { snap(); const src = document.createElement("canvas"); src.width = cv.width; src.height = cv.height; src.getContext("2d").drawImage(cv, 0, 0); setCanvas(src.height, src.width, g => { g.translate(dir > 0 ? src.height : 0, dir > 0 ? 0 : src.width); g.rotate(dir * Math.PI / 2); g.drawImage(src, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0); }); ED.dirty("image"); }
  function resize() { const w = Math.max(1, Math.min(10000, parseInt(rw.value) || 0)), hh = Math.max(1, Math.min(10000, parseInt(rh.value) || 0)); if (w === cv.width && hh === cv.height) return; snap(); const src = document.createElement("canvas"); src.width = cv.width; src.height = cv.height; src.getContext("2d").drawImage(cv, 0, 0); setCanvas(w, hh, g => { g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, w, hh); }); ED.dirty("image"); }
  function preview() { cv.style.filter = `brightness(${bri.value}%) contrast(${con.value}%)`; }
  function applyAdj() { if (+bri.value === 100 && +con.value === 100) return; snap(); const src = document.createElement("canvas"); src.width = cv.width; src.height = cv.height; src.getContext("2d").drawImage(cv, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.filter = `brightness(${bri.value}%) contrast(${con.value}%)`; ctx.drawImage(src, 0, 0); ctx.filter = "none"; bri.value = 100; con.value = 100; preview(); ED.dirty("image"); }
  function setTool(t) { tool = t; for (const b of document.querySelectorAll("[data-im-tool]")) b.setAttribute("aria-pressed", String(b.dataset.imTool === t)); octx && octx.clearRect(0, 0, ov.width, ov.height); crop = null; const ac = document.getElementById("im-applycrop"); if (ac) ac.disabled = true; ED.st.image.msg.textContent = t === "crop" ? T("dropcrop") : ""; }
  const B = (id, label, title, fn, extra = {}) => h("button", { type: "button", class: "wd-b", id, title, "aria-label": title, onclick: fn, ...extra }, label);
  return {
    exts: () => [curExt, "png", "jpg", "jpeg", "webp"],
    init(body) {
      color = h("input", { type: "color", id: "im-color", value: "#e11d48", "aria-label": "Colour" }); lw = h("input", { type: "number", id: "im-lw", min: "1", max: "60", value: "4", "aria-label": "Line", class: "im-num" });
      bri = h("input", { type: "range", id: "im-bri", min: "20", max: "200", value: "100", oninput: preview, "aria-label": T("bright") }); con = h("input", { type: "range", id: "im-con", min: "20", max: "200", value: "100", oninput: preview, "aria-label": T("contrast") });
      rw = h("input", { type: "number", id: "im-w", class: "im-num", min: "1", "aria-label": T("width") }); rh = h("input", { type: "number", id: "im-h", class: "im-num", min: "1", "aria-label": T("height") }); keep = h("input", { type: "checkbox", id: "im-keep", checked: true, title: "Keep ratio" });
      rw.addEventListener("input", () => { if (keep.checked && cv.width) rh.value = Math.round(rw.value * cv.height / cv.width); }); rh.addEventListener("input", () => { if (keep.checked && cv.height) rw.value = Math.round(rh.value * cv.width / cv.height); });
      const tb = h("div", { class: "ed-tool", role: "toolbar" },
        B("im-undo", "↶", T("undo"), () => { if (!undo.length) return; redo.push(ctx.getImageData(0, 0, cv.width, cv.height)); restore(undo.pop()); ED.dirty("image"); }),
        B("im-redo", "↷", T("redo"), () => { if (!redo.length) return; undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); restore(redo.pop()); ED.dirty("image"); }), h("span", { class: "sep" }),
        ...[["pen", "✎"], ["box", "▭"], ["arrow", "➚"], ["text", "T"], ["crop", "⛶"]].map(([k, ic]) => B("im-t-" + k, ic + " " + T(k), T(k), () => setTool(k), { "data-im-tool": k, "aria-pressed": String(k === tool) })),
        B("im-applycrop", "✂ " + T("applycrop"), T("applycrop"), applyCrop, { disabled: true }), color, lw, h("span", { class: "sep" }),
        B("im-rotl", "⟲", T("rotl"), () => rotate(-1)), B("im-rotr", "⟳", T("rotr"), () => rotate(1)));
      const tb2 = h("div", { class: "ed-tool" }, h("label", { class: "ed-chk" }, T("resize") + " "), rw, "×", rh, h("label", { class: "ed-chk", title: "Keep ratio" }, keep, "🔗"), B("im-resize", T("apply"), T("resize"), resize), h("span", { class: "sep" }),
        h("label", { class: "ed-chk", for: "im-bri" }, "☀ " + T("bright")), bri, h("label", { class: "ed-chk", for: "im-con" }, "◐ " + T("contrast")), con, B("im-adj", T("apply"), T("apply"), applyAdj));
      cv = h("canvas", { class: "im-cv", id: "im-cv" }); ov = h("canvas", { class: "im-ov", id: "im-ov" });
      ov.addEventListener("pointerdown", down); ov.addEventListener("pointermove", move); ov.addEventListener("pointerup", up); ov.addEventListener("pointercancel", up);
      stage = h("div", { class: "im-stage" }, h("div", { class: "im-box" }, cv, ov)); body.append(tb, tb2, stage);
      ctx = cv.getContext("2d", { willReadFrequently: true }); octx = ov.getContext("2d"); window.addEventListener("resize", () => { if (ED.tab === "image") fit(); });
    },
    blank() { undo = []; redo = []; curExt = "png"; setCanvas(1200, 800, g => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1200, 800); }); bri.value = con.value = 100; preview(); setTool("pen"); },
    async load(buf, e) { const bmp = await createImageBitmap(new Blob([buf], { type: MIME[e] || "image/png" })); undo = []; redo = []; curExt = e === "jpeg" ? "jpeg" : e; setCanvas(bmp.width, bmp.height, g => g.drawImage(bmp, 0, 0)); bri.value = con.value = 100; preview(); setTool("pen"); requestAnimationFrame(fit); },
    async export(e) { let src = cv; const mime = e === "jpg" || e === "jpeg" ? "image/jpeg" : e === "webp" ? "image/webp" : "image/png";
      if (+bri.value !== 100 || +con.value !== 100) applyAdj();
      if (mime === "image/jpeg") { src = document.createElement("canvas"); src.width = cv.width; src.height = cv.height; const g = src.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, src.width, src.height); g.drawImage(cv, 0, 0); }
      return { blob: await new Promise(r => src.toBlob(r, mime, 0.92)) }; },
    fit
  };
})();
})();
