/* Brain: a small open model that runs on this phone. No API key. After the file is stored here, it answers with the network off. */
(function () {
  const SIZE = 105454432;
  const KEY = "biswas-brain-v1";
  const FILE_NAME = "biswas-brain.gguf";

  const $ = (id) => document.getElementById(id);
  const en = () => document.documentElement.lang === "en";
  const L = (bn, english) => (en() ? english : bn);
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => c === "&" ? "&" + "amp;" : c === "<" ? "&" + "lt;" : c === ">" ? "&" + "gt;" : c === '"' ? "&" + "quot;" : "&" + "#39;");
  }

  let engine = null;
  let loaded = "";
  let busy = null;
  let data = loadData();

  function loadData() {
    try {
      const j = JSON.parse(localStorage.getItem(KEY) || "");
      if (j && Array.isArray(j.lessons) && Array.isArray(j.turns)) {
        if (!Array.isArray(j.off)) j.off = [];
        return j;
      }
    } catch (e) { /* empty */ }
    return { lessons: [], turns: [], off: [] };
  }
  function saveData() {
    data.lessons = data.lessons.slice(-12);
    data.turns = data.turns.slice(-8);
    data.off = (data.off || []).slice(-8);
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* full */ }
  }

  function setStatus(text) {
    const el = $("br-status");
    if (el) el.textContent = text;
  }

  async function engineOf() {
    if (engine) return engine;
    const { Wllama } = await import("/brain/wllama.js");
    engine = new Wllama(
      { "single-thread/wllama.wasm": "/brain/wllama.wasm" },
      { allowOffline: true, suppressNativeLog: true }
    );
    return engine;
  }

  async function dropEngine() {
    const w = engine;
    engine = null;
    loaded = "";
    if (w) { try { await w.exit(); } catch (e) { /* already gone */ } }
  }

  async function ownFile() {
    if (!navigator.storage || !navigator.storage.getDirectory) return null;
    try {
      const root = await navigator.storage.getDirectory();
      const fh = await root.getFileHandle(FILE_NAME);
      const file = await fh.getFile();
      return file && file.size > 1000000 ? file : null;
    } catch (e) { return null; }
  }

  async function keepFile(file) {
    if (!navigator.storage || !navigator.storage.getDirectory) return;
    const root = await navigator.storage.getDirectory();
    const fh = await root.getFileHandle(FILE_NAME, { create: true });
    const w = await fh.createWritable();
    await w.write(file);
    await w.close();
  }

  async function cachedHf() { return false; }

  const cfg = () => ({ n_ctx: 512, n_threads: 1, n_batch: 64 });

  async function downloadParts() {
    if (!navigator.storage || !navigator.storage.getDirectory) throw new Error("no storage");
    const root = await navigator.storage.getDirectory();
    const fh = await root.getFileHandle(FILE_NAME, { create: true });
    let have = 0;
    try { have = (await fh.getFile()).size; } catch (e) { have = 0; }
    if (have > SIZE || (have > 0 && have < 1000000)) have = 0;
    let w;
    try { w = await fh.createWritable({ keepExistingData: have > 0 && have < SIZE }); }
    catch (e) { w = await fh.createWritable(); have = 0; }
    if (have > 0 && have < SIZE) {
      try { await w.seek(have); } catch (e) { await w.close(); w = await fh.createWritable(); have = 0; }
    } else have = 0;
    while (have < SIZE) {
      const r = await fetch("/api/brain-part?s=" + have);
      if (!r.ok) throw new Error("download " + r.status);
      const buf = await r.arrayBuffer();
      if (!buf.byteLength) throw new Error("empty part");
      await w.write(buf);
      have += buf.byteLength;
      const pct = Math.min(100, Math.round((have / SIZE) * 100));
      setStatus(L("নামছে " + pct + "% · প্রায় ১০০ MB", "Downloading " + pct + "% · about 100 MB"));
    }
    await w.close();
    return fh.getFile();
  }

  async function useBlob(file, label) {
    await dropEngine();
    setStatus(L("মস্তিষ্ক খোলা হচ্ছে…", "Opening the brain…"));
    let w = await engineOf();
    try { await w.loadModel([file], cfg()); }
    catch (e) {
      await dropEngine();
      w = await engineOf();
      await w.loadModel([file], { n_ctx: 512, n_threads: 1, n_batch: 64 });
    }
    loaded = label || file.name || "file";
    setStatus(L("এই ফোনে প্রস্তুত। কোনো চাবি লাগে না।", "Ready on this phone. No key is used."));
  }

  async function useHf() {
    let file = await ownFile();
    if (!file || Math.abs(file.size - SIZE) > 4096) {
      setStatus(L("প্রথমবার প্রায় ১০০ MB নামছে। আগের ৪০৯ MB ফাইল আর লাগবে না।", "First time: about 100 MB. The old 409 MB file is not used."));
      file = await downloadParts();
    } else setStatus(L("ফোনের কপি খোলা হচ্ছে…", "Opening the copy on this phone…"));
    await useBlob(file, "SmolLM2");
    setStatus(L("এই ফোনে প্রস্তুত। ইন্টারনেট বন্ধ থাকলেও উত্তর দেবে। কোনো চাবি লাগে না।", "Ready on this phone. It still answers with the internet off. No key is used."));
  }

  function messages() {
    const lessons = data.lessons.map((x) => "- " + x).join("\n");
    const system = [
      "You are Biswas Brain, a small model running on this phone. No server and no API key are involved.",
      "Answer in the language the user writes. Be short and plain. If you are not sure, say so. Do not invent an office order, a law, or a number.",
      lessons ? "Remembered on this phone:\n" + lessons : ""
    ].filter(Boolean).join("\n\n");
    const hist = data.turns.filter((t) => !(t.role === "assistant" && t.content === "…")).slice(-6).map((t) => ({ role: t.role, content: t.content }));
    return [{ role: "system", content: system }, ...hist];
  }

  function paint() {
    const box = $("br-thread");
    if (!box) return;
    box.innerHTML = data.turns.map((t) => t.role === "user"
      ? `<div class="msg user"><div class="bubble">${esc(t.content)}</div></div>`
      : `<div class="msg ai"><div class="bubble">${esc(t.content)}</div></div>`).join("");
    const list = $("br-lesson-list");
    if (list) {
      list.innerHTML = data.lessons.length
        ? data.lessons.map((x, i) => `<li><span>${esc(x)}</span> <button type="button" data-br-drop="${i}">×</button></li>`).join("")
        : `<li class="hint">${esc(L("এখনও কিছু মনে নেই।", "Nothing remembered yet."))}</li>`;
    }
    const sc = $("br-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  }

  let gen = 0;

  function sayStatus(el, text) {
    if (el) el.textContent = text;
    else setStatus(text);
  }

  async function ensure() {
    if (loaded && engine) return;
    const own = await ownFile();
    if (own && Math.abs(own.size - SIZE) < 4096) {
      setStatus(L("ফোনে রাখা ফাইল খোলা হচ্ছে। নিজের PDF, Word বা Excel লাগবে না।", "Opening the file already on this phone. You do not need your own PDF, Word or Excel."));
      await useBlob(own, "SmolLM2");
      return;
    }
    const err = new Error("nofile");
    throw err;
  }

  async function speak(list, q, extra, statusEl) {
    if (busy) return;
    const id = ++gen;
    list.push({ role: "user", content: q });
    list.push({ role: "assistant", content: "…" });
    saveData();
    paint();
    paintOff();
    const go = $("br-go");
    const og = $("off-go");
    if (go) go.disabled = true;
    if (og) og.disabled = true;
    const ac = new AbortController();
    busy = ac;
    const t0 = Date.now();
    const timer = setInterval(() => {
      if (id !== gen) return;
      const s = Math.round((Date.now() - t0) / 1000);
      const cur = list[list.length - 1] && list[list.length - 1].content;
      if (cur === "…" || /^… \d+$/.test(cur || "")) {
        list[list.length - 1].content = "… " + s;
        paint();
        paintOff();
      }
      sayStatus(statusEl, L("উত্তর আসছে… " + s + " সেকেন্ড। ফোন একটু ধীর।", "Answer is coming… " + s + "s. This phone is slow."));
    }, 1000);
    let killer = 0;
    try {
      await ensure();
      if (id !== gen) return;
      killer = setTimeout(() => ac.abort(), 90000);
      const w = await engineOf();
      const mem = (data.lessons || []).slice(-3).map((x) => String(x).slice(0, 60)).join("; ");
      const prompt = String(extra || "Answer in one or two short sentences.").slice(0, 360) + (mem ? "\nRemember: " + mem : "") + "\nUser: " + String(q).slice(0, 300) + "\nAssistant:";
      const text = String(await w.createCompletion(prompt, {
        nPredict: 160,
        abortSignal: ac.signal,
        sampling: { temp: 0.7, top_k: 20, top_p: 0.9 },
        onNewToken: (_a, _b, current) => {
          if (id !== gen || !current) return;
          list[list.length - 1].content = current;
          paint();
          paintOff();
        }
      }) || "").trim();
      if (id !== gen) return;
      list[list.length - 1].content = text || L("কিছু আসেনি। ছোট করে আবার লিখুন।", "Nothing came back. Write a shorter question.");
      saveData();
      paint();
      paintOff();
      sayStatus(statusEl, L("উত্তর এসেছে।", "Answer is ready."));
    } catch (e) {
      if (id !== gen) return;
      const aborted = !!(ac.signal.aborted || (e && (e.name === "AbortError" || e.name === "WllamaAbortError")));
      const nofile = e && e.message === "nofile";
      list[list.length - 1].content = nofile
        ? L("১০০ MB ফাইল এখনো এই ফোনে নেই। ওপরের বোতাম চাপুন। নিজের PDF বা Excel লাগবে না।", "The 100 MB file is not on this phone yet. Tap the button above. You do not need your own PDF or Excel.")
        : aborted
          ? L("৯০ সেকেন্ডে শব্দ আসেনি। আরও ছোট প্রশ্ন লিখুন।", "No word came in 90 seconds. Write a shorter question.")
          : L("উত্তর হয়নি। ", "No answer. ") + String(e && e.message || e).slice(0, 120);
      saveData();
      paint();
      paintOff();
      sayStatus(statusEl, list[list.length - 1].content);
    } finally {
      if (killer) clearTimeout(killer);
      clearInterval(timer);
      if (id === gen) {
        busy = null;
        if (go) go.disabled = false;
        if (og) og.disabled = false;
      }
    }
  }

  async function ask(q) {
    await speak(data.turns, q, "", null);
  }

  function pack() {
    return { kind: "biswas-brain", v: 1, lessons: data.lessons, turns: data.turns };
  }

  async function refresh() {
    const own = await ownFile();
    if (own && Math.abs(own.size - SIZE) < 4096) {
      setStatus(L("ছোট মস্তিষ্ক এই ফোনে আছে (" + Math.round(own.size / 1048576) + " MB)। খুললেই চলবে।", "The small brain is already on this phone (" + Math.round(own.size / 1048576) + " MB). Open it when you want."));
      return;
    }
    setStatus(L("এখনো এই ফোনে নেই। প্রথমবার প্রায় ১০০ MB। আগের ৪০৯ MB ফাইল আর ব্যবহার হয় না।", "Not on this phone yet. The first time is about 100 MB. The old 409 MB file is no longer used."));
  }

  function bind() {
    const get = $("br-get");
    const pick = $("br-pick");
    const gguf = $("br-gguf");
    const save = $("br-save");
    const open = $("br-openmem");
    const mem = $("br-memfile");
    const forget = $("br-forget");
    const form = $("br-form");
    const lesson = $("br-lesson-form");
    if (get && !get._br) {
      get._br = true;
      get.addEventListener("click", async () => {
        get.disabled = true;
        try { await useHf(); } catch (e) { setStatus(String(e && e.message || e).slice(0, 180)); await dropEngine(); }
        get.disabled = false;
      });
    }
    if (pick && gguf && !pick._br) {
      pick._br = true;
      pick.addEventListener("click", () => gguf.click());
      gguf.addEventListener("change", async () => {
        const file = gguf.files && gguf.files[0];
        gguf.value = "";
        if (!file) return;
        if (!/\.gguf$/i.test(file.name)) { setStatus(L("শুধু .gguf ফাইল।", "Only a .gguf file.")); return; }
        pick.disabled = true;
        try {
          await useBlob(file, file.name);
          setStatus(L("খুলেছে। ফোনের ভেতর কপি রাখা হচ্ছে, যাতে পরে USB না লাগে।", "Open. A copy is being kept on this phone so the USB is not needed next time."));
          await keepFile(file);
          setStatus(L("এই ফোনে প্রস্তুত। USB এখন খুলতে পারেন। কোনো চাবি লাগে না।", "Ready on this phone. You can unplug the USB. No key is used."));
        } catch (e) { setStatus(String(e && e.message || e).slice(0, 180)); await dropEngine(); }
        pick.disabled = false;
      });
    }
    if (save && !save._br) {
      save._br = true;
      save.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(pack(), null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "biswas-brain.json";
        document.body.append(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      });
    }
    if (open && mem && !open._br) {
      open._br = true;
      open.addEventListener("click", () => mem.click());
      mem.addEventListener("change", async () => {
        const file = mem.files && mem.files[0];
        mem.value = "";
        if (!file) return;
        try {
          const j = JSON.parse(await file.text());
          if (!j || j.kind !== "biswas-brain" || !Array.isArray(j.lessons)) throw new Error("bad");
          data.lessons = j.lessons.map((x) => String(x).slice(0, 240)).filter(Boolean).slice(-12);
          if (Array.isArray(j.turns)) data.turns = j.turns.filter((t) => t && (t.role === "user" || t.role === "assistant") && t.content).slice(-8).map((t) => ({ role: t.role, content: String(t.content).slice(0, 4000) }));
          saveData();
          paint();
          setStatus(L("স্মৃতির ফাইল যোগ হয়েছে।", "Memory file added."));
        } catch (e) { setStatus(L("এই ফাইল স্মৃতির ফাইল নয়।", "That file is not a memory file.")); }
      });
    }
    if (forget && !forget._br) {
      forget._br = true;
      forget.addEventListener("click", async () => {
        await dropEngine();
        try {
          const root = await navigator.storage.getDirectory();
          await root.removeEntry(FILE_NAME);
        } catch (e) { /* none */ }
        try {
          const { Wllama } = await import("/brain/wllama.js");
          const w = new Wllama({ "single-thread/wllama.wasm": "/brain/wllama.wasm" }, { allowOffline: true });
          await w.modelManager.clear();
          await w.exit();
        } catch (e) { /* none */ }
        setStatus(L("মস্তিষ্কের ফাইল এই ফোন থেকে সরানো হয়েছে। স্মৃতির লাইন আছে।", "The brain file was removed from this phone. Remembered lines are still here."));
      });
    }
    if (form && !form._br) {
      form._br = true;
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const q = $("br-q");
        const text = (q && q.value || "").trim();
        if (!text) return;
        q.value = "";
        ask(text);
      });
    }
    if (lesson && !lesson._br) {
      lesson._br = true;
      lesson.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const inp = $("br-lesson");
        const text = (inp && inp.value || "").trim().slice(0, 240);
        if (!text) return;
        data.lessons.push(text);
        if (inp) inp.value = "";
        saveData();
        paint();
      });
    }
    const list = $("br-lesson-list");
    if (list && !list._br) {
      list._br = true;
      list.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-br-drop]");
        if (!b) return;
        data.lessons.splice(Number(b.dataset.brDrop), 1);
        saveData();
        paint();
      });
    }
  }

  function clip(s, n) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, n); }

  function readDesk() {
    const mem = [];
    try { (memory || []).forEach(m => m && m.text && mem.push(m.text)); } catch (e) { /* not ready */ }
    try { (officeMemory || []).forEach(m => m && m.text && mem.push(m.text)); } catch (e) { /* not ready */ }
    const lines = [];
    const take = (arr, label) => {
      (arr || []).forEach(th => {
        (th.messages || []).forEach(m => {
          if (!m || !m.content || m.role === "system") return;
          lines.push(label + " " + (m.role === "user" ? "U" : "A") + ": " + clip(m.content, 180));
        });
      });
    };
    try { take(threads, "chat"); } catch (e) { /* none */ }
    try { Object.keys(officeThreads || {}).forEach(k => take(officeThreads[k], "office:" + k)); } catch (e) { /* none */ }
    let skill = "";
    try {
      const id = BA.skill();
      skill = (BA.SKILLS[id] && BA.SKILLS[id].add) || "";
    } catch (e) { skill = ""; }
    return {
      nChat: lines.length,
      nMem: mem.length,
      system: [
        "You are Offline AI on this phone. No API key. You can draft a notesheet, a letter (DFA), an office order, a notice, a report, an Excel table, a summary, a translation, or code. Write the paper in the answer. Leave blanks as ______. Do not invent a memo number, a date, or a name.",
        skill ? clip(skill, 700) : "",
        "Remembered facts:\n" + (mem.slice(-24).map(t => "- " + clip(t, 160)).join("\n") || "(none)"),
        "Chats already on this phone. Read them. Do not ignore a name or a fact that is here:\n" + (lines.slice(-20).join("\n") || "(none)")
      ].filter(Boolean).join("\n\n")
    };
  }

  function paintOff() {
    const box = $("off-thread");
    if (!box) return;
    box.innerHTML = (data.off || []).map(t => t.role === "user"
      ? `<div class="msg user"><div class="bubble">${esc(t.content)}</div></div>`
      : `<div class="msg ai"><div class="bubble">${esc(t.content)}</div></div>`).join("");
    const sc = $("off-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
    const skills = $("off-skills");
    if (skills && window.BA && BA.SKILLS && !skills.childElementCount) {
      skills.innerHTML = Object.keys(BA.SKILLS).map(id => `<button class="btn small" type="button" data-off-skill="${id}">${esc(en() ? BA.SKILLS[id].en : BA.SKILLS[id].bn)}</button>`).join("");
    }
    if (skills && window.BA) skills.querySelectorAll("[data-off-skill]").forEach(b => { b.setAttribute("aria-pressed", b.dataset.offSkill === BA.skill() ? "true" : "false"); });
  }

  function offNote() {
    const d = readDesk();
    const el = $("off-status");
    if (el) el.textContent = L(
      "পড়েছে " + d.nChat + "টা চ্যাটের লাইন এবং " + d.nMem + "টা স্মৃতি। নতুন স্মৃতি এলে পরের উত্তরে সেটাও পড়বে।",
      "Read " + d.nChat + " chat lines and " + d.nMem + " memories. New memories are read on the next answer."
    );
  }

  let packs = [];
  let paper = null;

  function officeHead() {
    let subdiv = "______", district = "";
    try { subdiv = settings.subdiv || subdiv; district = settings.district || ""; } catch (e) { /* defaults */ }
    return en()
      ? "Government of West Bengal\nOffice of the Sub-Divisional Officer, " + subdiv + " Sub-Division" + (district ? ", " + district : "")
      : "পশ্চিমবঙ্গ সরকার\nমহকুমা শাসকের কার্যালয়, " + subdiv + " মহকুমা" + (district ? ", " + district : "");
  }
  function linesOf(p) { return String(p.text || "").split("\n").map((s) => s.trim()).filter(Boolean); }
  function allLines() {
    const out = [];
    packs.forEach((p) => linesOf(p).forEach((line) => out.push({ file: p.name, line })));
    return out;
  }
  function remembered() {
    try { return (officeMemory || []).concat(memory || []).map((m) => m && m.text).filter(Boolean).slice(-8); }
    catch (e) { return []; }
  }
  function firstMatch(re) {
    for (const row of allLines()) if (re.test(row.line)) return row.line.replace(re, "").replace(/^[\s:.\-]+/, "").trim().slice(0, 180);
    return "";
  }
  function grabAll(re, n) {
    const out = [];
    const seen = new Set();
    const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    for (const row of allLines()) {
      for (const m of row.line.matchAll(rx)) {
        const v = String(m[1] || m[0]).trim();
        if (!v || seen.has(v)) continue;
        seen.add(v);
        out.push(v);
        if (out.length >= n) return out;
      }
    }
    return out;
  }
  function keyLines() {
    const seen = new Set();
    const out = [];
    for (const row of allLines()) {
      if (row.line.length < 28) continue;
      const k = row.line.slice(0, 60);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(row.line.slice(0, 220));
      if (out.length >= 8) break;
    }
    return out;
  }
  function caseFacts() {
    const subject = firstMatch(/(?:বিষয়|subject)\s*[:.\-]?\s*/i) || (packs[0] && packs[0].name.replace(/\.[a-z0-9]+$/i, "")) || "______";
    const to = firstMatch(/(?:^প্রতি|^to)\b\s*[:,]?\s*/i);
    const dates = grabAll(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g, 6);
    const memos = grabAll(/(?:memo(?:\s*no\.?)?|স্মারক(?:\s*নং)?|ref(?:erence)?)\s*[:.\-]?\s*([A-Za-z0-9][A-Za-z0-9\/\-]{2,})/i, 4);
    const money = [];
    for (const row of allLines()) {
      if (!/(₹|টাকা|rs\.?|rupees|amount|মূল্য)/i.test(row.line) && !/\d{1,3}(?:,\d{3})+/.test(row.line)) continue;
      money.push(row.line.slice(0, 180));
      if (money.length >= 5) break;
    }
    return { subject, to, dates, memos, money, lines: keyLines() };
  }
  function fileFacts() {
    if (!packs.length) return en() ? "No file is attached, so every missing fact stays ______." : "কোনো ফাইল যুক্ত নেই, তাই যা জানা নেই তা ______।";
    const f = caseFacts();
    const bn = !en();
    const bits = [];
    bits.push((bn ? "বিষয়: " : "Subject: ") + f.subject);
    if (f.to) bits.push((bn ? "প্রাপক: " : "Addressee: ") + f.to);
    if (f.dates.length) bits.push((bn ? "তারিখ: " : "Dates: ") + f.dates.join(", "));
    if (f.memos.length) bits.push((bn ? "স্মারক / সূত্র: " : "Memo / reference: ") + f.memos.join(", "));
    if (f.money.length) bits.push((bn ? "টাকার লাইন:" : "Amount lines:") + "\n" + f.money.map((l) => "- " + l).join("\n"));
    if (f.lines.length) bits.push((bn ? "ফাইল থেকে নেওয়া কথা:" : "Taken from the file:") + "\n" + f.lines.map((l) => "- " + l).join("\n"));
    const mem = remembered();
    if (mem.length) bits.push((bn ? "এই ফোন যা মনে রেখেছে:" : "Remembered on this phone:") + "\n" + mem.map((l) => "- " + String(l).slice(0, 160)).join("\n"));
    return bits.join("\n\n");
  }
  function numOf(s) {
    const t = String(s == null ? "" : s).replace(/[₹$,\s]/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
    return Number(t);
  }
  function fmt(n) { return Math.round(n * 100) / 100; }
  function sheetsOf(text) {
    const out = [];
    for (const block of String(text || "").split(/\n(?=\[Sheet:)/)) {
      const lines = block.split("\n");
      const name = (lines[0].match(/^\[Sheet:\s*([^\]]+)/) || [])[1] || "Sheet";
      const rows = lines.slice(1).filter((l) => l.trim() && !/rows\]?$/.test(l.trim()) && !/^\[/.test(l)).map((l) => l.split("\t"));
      if (rows.length) out.push({ name, rows });
    }
    return out;
  }
  function columnStats(rows) {
    const width = Math.max(...rows.map((r) => r.length));
    const body = rows.slice(1);
    const stats = [];
    for (let c = 0; c < width; c++) {
      const nums = body.map((r) => numOf(r[c])).filter((n) => n != null);
      if (!nums.length || nums.length < Math.max(1, body.length * 0.4)) continue;
      const sum = nums.reduce((a, b) => a + b, 0);
      stats.push({ name: rows[0][c] || ("Col " + (c + 1)), n: nums.length, sum, min: Math.min(...nums), max: Math.max(...nums), avg: sum / nums.length });
    }
    return stats;
  }
  function analyseMd() {
    if (!packs.length) return { md: en() ? "Attach a PDF, Word file or Excel first." : "আগে একটি PDF, Word বা Excel যুক্ত করুন।", tables: [] };
    const parts = [en() ? "# Reading done on this phone" : "# এই ফোনে পড়া হয়েছে", en() ? "The 100 MB model was not used. Every total below was calculated on the phone." : "১০০ MB মডেল ব্যবহার হয়নি। নিচের সব যোগ এই ফোনেই করা হয়েছে।"];
    const tables = [];
    for (const p of packs) {
      parts.push("## " + p.name);
      parts.push((en() ? "Kind: " : "ধরন: ") + (p.kind || "") + (p.pages ? (en() ? ". Pages: " : "। পাতা: ") + p.pages : "") + (en() ? ". Characters: " : "। অক্ষর: ") + String(p.text || "").length);
      const sh = p.kind === "sheet" ? sheetsOf(p.text) : [];
      if (sh.length) {
        for (const s of sh) {
          const st = columnStats(s.rows);
          parts.push("### " + s.name + " — " + s.rows.length + (en() ? " rows" : " সারি"));
          if (!st.length) { parts.push(en() ? "No number column to add." : "যোগ করার মতো সংখ্যার কলাম নেই।"); continue; }
          const biggest = st.slice().sort((a, b) => b.n - a.n)[0];
          const colIndex = s.rows[0].findIndex((h) => String(h) === String(biggest.name));
          parts.push("| Column | Count | Sum | Average | Min | Max |\n| --- | --- | --- | --- | --- | --- |");
          const rows = [["Column", "Count", "Sum", "Average", "Min", "Max"]];
          for (const c of st) {
            parts.push("| " + c.name + " | " + c.n + " | " + fmt(c.sum) + " | " + fmt(c.avg) + " | " + fmt(c.min) + " | " + fmt(c.max) + " |");
            rows.push([String(c.name), String(c.n), String(fmt(c.sum)), String(fmt(c.avg)), String(fmt(c.min)), String(fmt(c.max))]);
          }
          if (colIndex >= 0 && biggest.sum) {
            const ranked = s.rows.slice(1).map((r) => ({ label: r[0] || "", n: numOf(r[colIndex]) })).filter((x) => x.n != null).sort((a, b) => b.n - a.n).slice(0, 8);
            if (ranked.length) {
              parts.push(en() ? "Largest rows in " + biggest.name + ":" : biggest.name + "-এ সবচেয়ে বড় সারি:");
              parts.push("| Row | Amount | Share |\n| --- | --- | --- |");
              ranked.forEach((r) => parts.push("| " + (r.label || "—") + " | " + fmt(r.n) + " | " + fmt(r.n / biggest.sum * 100) + "% |"));
              rows.push(["—", "—", "—", "—", "—", "—"]);
              ranked.forEach((r) => rows.push([String(r.label || ""), String(fmt(r.n)), fmt(r.n / biggest.sum * 100) + "%", "", "", ""]));
            }
          }
          tables.push({ name: String(s.name).slice(0, 31), rows });
        }
      } else {
        const lines = String(p.text || "").split("\n").map((x) => x.trim()).filter(Boolean);
        const amounts = [];
        for (const line of lines) {
          const found = line.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) || [];
          found.forEach((x) => { const n = numOf(x); if (n != null) amounts.push(n); });
        }
        if (amounts.length) {
          const sum = amounts.reduce((a, b) => a + b, 0);
          parts.push((en() ? "Numbers found: " : "পাওয়া সংখ্যা: ") + amounts.length + (en() ? ". Sum: " : "। যোগ: ") + fmt(sum) + (en() ? ". Average: " : "। গড়: ") + fmt(sum / amounts.length) + (en() ? ". Smallest: " : "। সবচেয়ে কম: ") + fmt(Math.min(...amounts)) + (en() ? ". Largest: " : "। সবচেয়ে বেশি: ") + fmt(Math.max(...amounts)));
          tables.push({ name: "Numbers", rows: [["Value"], ...amounts.slice(0, 400).map((n) => [String(n)]), ["Sum", String(fmt(sum))]] });
        }
        parts.push(lines.slice(0, 40).map((l) => "- " + l.slice(0, 200)).join("\n"));
      }
    }
    return { md: parts.join("\n\n"), tables };
  }
  function draftMd(kind) {
    const head = officeHead();
    const f = packs.length ? caseFacts() : { subject: "______", to: "", dates: [], memos: [], money: [], lines: [] };
    const sub = f.subject || "______";
    const who = f.to || "______";
    const body = fileFacts();
    const when = f.dates[0] || "______";
    const ref = f.memos[0] || "______";
    const bn = !en();
    const note = bn ? "ফাইলে যা নেই তা ______। কিছু বানানো হয়নি।" : "Anything not in the file stays ______. Nothing was invented.";
    if (kind === "notesheet") {
      return bn
        ? "**নোট**\n\n**বিষয়:** " + sub + "\n**সূত্র:** " + ref + "\n\nবিচার্য পত্র এই ফোনে পড়া হয়েছে। " + note + "\n\n" + body + "\n\nপ্রস্তাব: ______\n\nসদয় অবগতি ও আদেশের জন্য পেশ করা হল।\n\n(ডিলিং অ্যাসিস্ট্যান্ট)\nতারিখ: " + when + "\n\nমহকুমা শাসক"
        : "**NOTE**\n\n**Subject:** " + sub + "\n**Reference:** " + ref + "\n\nThe paper was read on this phone. " + note + "\n\n" + body + "\n\nProposal: ______\n\nPut up for kind perusal and orders, please.\n\n(Dealing assistant)\nDate: " + when + "\n\nSub-Divisional Officer";
    }
    if (kind === "letter") {
      return bn
        ? head + "\n\nস্মারক নং: ______          তারিখ: " + when + "\n\nপ্রতি,\n" + who + "\n\n**বিষয়:** " + sub + "\n**সূত্র:** " + ref + "\n\nমহাশয়,\n\n" + body + "\n\n" + note + "\n\nঅতএব ______ করার জন্য অনুরোধ করা হচ্ছে।\n\nভবদীয়,\n\nমহকুমা শাসক"
        : head + "\n\nMemo No. ______          Date: " + when + "\n\nTo\n" + who + "\n\n**Subject:** " + sub + "\n**Reference:** " + ref + "\n\nSir,\n\n" + body + "\n\n" + note + "\n\nYou are requested to ______.\n\nYours faithfully,\n\nSub-Divisional Officer";
    }
    if (kind === "order") {
      return bn
        ? head + "\n\n**অফিস আদেশ**\n\nস্মারক নং: ______    তারিখ: " + when + "\n\n**বিষয়:** " + sub + "\n\n" + body + "\n\n" + note + "\n\nএতদ্বারা আদেশ করা হচ্ছে যে ______। এই আদেশ ______ তারিখ থেকে কার্যকর।\n\nমহকুমা শাসক"
        : head + "\n\n**OFFICE ORDER**\n\nMemo No. ______    Date: " + when + "\n\n**Subject:** " + sub + "\n\n" + body + "\n\n" + note + "\n\nIt is hereby ordered that ______. This order takes effect from ______.\n\nSub-Divisional Officer";
    }
    if (kind === "notice") {
      return bn
        ? head + "\n\n**নোটিশ**\n\nস্মারক নং: ______    তারিখ: " + when + "\n\nপ্রতি,\n" + who + "\n\n**বিষয়:** " + sub + "\n\n" + body + "\n\n" + note + "\n\nআপনাকে ______ তারিখে ______ স্থানে হাজির হতে বলা হচ্ছে। লিখিত জবাব ______ দিনের মধ্যে দিন।\n\nমহকুমা শাসক"
        : head + "\n\n**NOTICE**\n\nMemo No. ______    Date: " + when + "\n\nTo\n" + who + "\n\n**Subject:** " + sub + "\n\n" + body + "\n\n" + note + "\n\nYou are asked to appear on ______ at ______. A written reply is due within ______ days.\n\nSub-Divisional Officer";
    }
    return bn
      ? "# প্রতিবেদন\n\n**বিষয়:** " + sub + "\n**সূত্র:** " + ref + "\n\n" + body + "\n\n## সুপারিশ\n\n______\n\n" + note + "\n\nতারিখ: " + when
      : "# Report\n\n**Subject:** " + sub + "\n**Reference:** " + ref + "\n\n" + body + "\n\n## Recommendation\n\n______\n\n" + note + "\n\nDate: " + when;
  }
  function wordMath(text) {
    const t = String(text || "").replace(/,/g, "");
    let m = t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of|এর)?\s*(\d+(?:\.\d+)?)/i);
    if (m) return { n: Number(m[2]) * Number(m[1]) / 100, how: m[1] + "% of " + m[2] };
    m = t.match(/(\d+(?:\.\d+)?)\s*(?:এর|of)\s*(\d+(?:\.\d+)?)\s*%/i);
    if (m) return { n: Number(m[1]) * Number(m[2]) / 100, how: m[2] + "% of " + m[1] };
    m = t.match(/(?:sum|যোগ|মোট)\s*[:=]?\s*(\d+(?:\.\d+)?(?:\s*[+,]\s*\d+(?:\.\d+)?)+)/i);
    if (m) {
      const nums = m[1].split(/[+,\s]+/).map(Number).filter((n) => Number.isFinite(n));
      if (nums.length > 1) return { n: nums.reduce((a, b) => a + b, 0), how: nums.join(" + ") };
    }
    m = t.match(/(\d+(?:\.\d+)?)\s*(?:থেকে|from)\s*(\d+(?:\.\d+)?)/i);
    if (m && /বাড়|বৃদ্ধি|increase|কম|decrease|change|শতাংশ|%/i.test(t)) {
      const a = Number(m[1]), b = Number(m[2]);
      if (a) return { n: (b - a) / a * 100, how: a + " → " + b, suffix: "%" };
    }
    return null;
  }
  function answerFile(q) {
    if (!packs.length) return null;
    const ql = q.toLowerCase();
    let colHit = null;
    for (const p of packs) {
      if (p.kind !== "sheet") continue;
      for (const s of sheetsOf(p.text)) {
        for (const c of columnStats(s.rows)) {
          const name = String(c.name || "").toLowerCase();
          if (name.length > 1 && ql.includes(name.slice(0, Math.min(16, name.length)))) colHit = c;
        }
      }
    }
    const skip = /^(the|and|for|what|this|that|with|from|কত|কী|কি|এর|যে|একটা|করে|করা)$/;
    const words = ql.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !skip.test(w));
    const hits = [];
    allLines().forEach((row) => {
      const low = row.line.toLowerCase();
      let s = 0;
      words.forEach((w) => { if (low.includes(w)) s += 1; });
      if (s) hits.push(Object.assign({ s }, row));
    });
    hits.sort((a, b) => b.s - a.s);
    const top = hits.slice(0, 8);
    const dates = /কবে|তারিখ|when|date/i.test(q) ? grabAll(/\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b/g, 8) : [];
    if (!top.length && !colHit && !dates.length) return null;
    const bn = !en();
    const parts = [bn ? "# ফাইল থেকে উত্তর" : "# Answer from the file", bn ? "১০০ MB মডেল ব্যবহার হয়নি। শুধু এই ফাইলে যা লেখা আছে।" : "The 100 MB model was not used. Only what is written in the file."];
    const tables = [];
    if (colHit) {
      parts.push((bn ? "কলাম **" : "Column **") + colHit.name + "**: " + (bn ? "যোগ " : "sum ") + fmt(colHit.sum) + (bn ? ", গড় " : ", average ") + fmt(colHit.avg) + (bn ? ", সংখ্যা " : ", count ") + colHit.n);
      tables.push({ name: "Column", rows: [["Column", "Count", "Sum", "Average", "Min", "Max"], [String(colHit.name), String(colHit.n), String(fmt(colHit.sum)), String(fmt(colHit.avg)), String(fmt(colHit.min)), String(fmt(colHit.max))]] });
    }
    if (dates.length) parts.push((bn ? "তারিখ: " : "Dates: ") + dates.join(", "));
    if (top.length) {
      parts.push(bn ? "প্রশ্নের সঙ্গে যে লাইন মেলে:" : "Lines that match the question:");
      top.forEach((h) => parts.push("- " + h.line.slice(0, 240)));
    }
    if (!top.length) parts.push(bn ? "প্রশ্নের শব্দ কোনো লাইনে মেলেনি।" : "No line contained the words of the question.");
    return { md: parts.join("\n\n"), tables };
  }
  function calc(src) {
    const s = String(src || "").replace(/,/g, "").replace(/[x×]/gi, "*").replace(/÷/g, "/").trim();
    if (!/^[\d.+\-*/()%\s]+$/.test(s) || !/\d/.test(s)) throw new Error("bad");
    const n = Function('"use strict"; return (' + s.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)") + ")")();
    if (typeof n !== "number" || !Number.isFinite(n)) throw new Error("bad");
    return n;
  }
  function showLocal(q, md, tables) {
    data.off = data.off || [];
    data.off.push({ role: "user", content: q });
    data.off.push({ role: "assistant", content: String(md).slice(0, 8000) });
    paper = { md: String(md), tables: tables || [] };
    saveData();
    paintOff();
    const bar = $("off-save");
    if (bar) bar.hidden = false;
    const el = $("off-status");
    if (el) el.textContent = L("এই উত্তর ফোনেই তৈরি। নিচে Word, PDF বা Excel নিন।", "This answer was made on the phone. Save Word, PDF or Excel below.");
  }
  async function takeFiles(list) {
    const el = $("off-status");
    if (el) el.textContent = L("ফাইল পড়া হচ্ছে…", "Reading the file…");
    for (const f of list) {
      try {
        const row = await readFile(f);
        packs.push({ name: row.name, kind: row.kind, pages: row.pages || 0, text: row.text || "" });
      } catch (e) {
        packs.push({ name: f.name, kind: "error", text: String(e && e.message || e) });
      }
    }
    const names = $("off-files");
    if (names) names.textContent = packs.map((p) => p.name).join(", ");
    if (el) el.textContent = L(packs.length + "টি ফাইল পড়া হয়েছে। এখন বিশ্লেষণ, খসড়া বা অঙ্ক চাপুন।", packs.length + " file(s) read. Tap analyse, a draft, or calculate.");
  }
  async function savePaper(type) {
    if (!paper) {
      const last = (data.off || []).filter((t) => t.role === "assistant").pop();
      if (!last) return;
      paper = { md: last.content, tables: [] };
    }
    const el = $("off-status");
    try {
      if (type === "docx") await BA.download(await BA.docxFromMd(paper.md, { title: "Offline" }), "offline.docx");
      else if (type === "pdf") await BA.download(await BA.pdfFromMd(paper.md, { title: "Offline" }), "offline.pdf");
      else await BA.download(BA.xlsxFromTables(paper.tables && paper.tables.length ? paper.tables : [{ name: "Draft", rows: String(paper.md).split("\n").map((l) => [l]) }]), "offline.xlsx");
      if (el) el.textContent = L("ফাইল নেমেছে।", "File saved.");
    } catch (e) {
      if (el) el.textContent = String(e && e.message || e).slice(0, 160);
    }
  }
  async function localJob(q) {
    const text = String(q || "").trim();
    let kind = "";
    if (/নোটশিট|notesheet/i.test(text)) kind = "notesheet";
    else if (/নোটিশ|notice|show-?cause/i.test(text)) kind = "notice";
    else if (/আদেশ|\border\b/i.test(text)) kind = "order";
    else if (/রিপোর্ট|\breport\b/i.test(text)) kind = "report";
    else if (/চিঠি|\bletter\b|\bdfa\b/i.test(text)) kind = "letter";
    else if (/বিশ্লেষণ|analys|সারাংশ|summary/i.test(text)) kind = "analyse";
    const wm = wordMath(text);
    if (wm && !kind) {
      showLocal(text, (en() ? "Result: **" : "ফলাফল: **") + fmt(wm.n) + (wm.suffix || "") + "**\n\n" + wm.how + " = " + fmt(wm.n) + (wm.suffix || ""));
      return true;
    }
    if (!kind && packs.length && text) {
      const ans = answerFile(text);
      if (ans) { showLocal(text, ans.md, ans.tables); return true; }
      kind = "analyse";
    }
    if (!kind && /^[\d.+\-*/()%,\s]+$/.test(text) && /\d/.test(text) && /[+\-*/%]/.test(text)) kind = "math";
    if (!kind) return false;
    if (kind === "math") {
      try { const n = calc(text); showLocal(text, (en() ? "Result: **" : "ফলাফল: **") + fmt(n) + "**\n\n" + text + " = " + fmt(n)); }
      catch (e) { showLocal(text, en() ? "This phone could not do that sum. Use digits and + - * / ( ). Example: 1200*5/100" : "এই অঙ্ক হয়নি। সংখ্যা আর + - * / ( ) দিন। যেমন: 1200*5/100"); }
      return true;
    }
    if (kind === "analyse") { const r = analyseMd(); showLocal(text || (en() ? "Analyse" : "বিশ্লেষণ"), r.md, r.tables); return true; }
    showLocal(text, draftMd(kind), []);
    return true;
  }

  async function askOff(q) {
    if (await localJob(q)) return;
    data.off = data.off || [];
    let skill = "Write a full answer, several paragraphs if needed. Do not stop after three lines.";
    try {
      const id = BA.skill();
      skill = "Skill: " + (en() ? BA.SKILLS[id].en : BA.SKILLS[id].bn) + ". If they want a paper, write a short draft and leave blanks as ______. Do not invent a memo number.";
    } catch (e) { /* skills not ready */ }
    let known = "";
    try {
      const bag = (officeMemory || []).concat(memory || []).slice(-4).map((m) => m && m.text).filter(Boolean);
      if (bag.length) known = " Known facts: " + bag.map((t) => String(t).slice(0, 50)).join("; ");
    } catch (e) { /* no memory yet */ }
    await speak(data.off, q, skill + known, $("off-status"));
  }

  function bindOff() {
    paintOff();
    const form = $("off-form");
    const get = $("off-get");
    const skills = $("off-skills");
    if (form && !form._off) {
      form._off = true;
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const q = $("off-q");
        const text = (q && q.value || "").trim();
        if (!text) return;
        q.value = "";
        askOff(text);
      });
    }
    if (get && !get._off) {
      get._off = true;
      get.addEventListener("click", async () => {
        get.disabled = true;
        try { await useHf(); offNote(); } catch (e) { const el = $("off-status"); if (el) el.textContent = String(e && e.message || e).slice(0, 180); }
        get.disabled = false;
      });
    }
    if (skills && !skills._off) {
      skills._off = true;
      skills.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-off-skill]");
        if (!b || !window.BA) return;
        BA.setSkill(b.dataset.offSkill);
        paintOff();
        offNote();
      });
    }
    const work = $("off-work");
    const file = $("off-file");
    const math = $("off-math");
    if (work && file && !work._off) {
      work._off = true;
      work.addEventListener("click", async (ev) => {
        const b = ev.target.closest("[data-off-do]");
        if (!b) return;
        const doWhat = b.dataset.offDo;
        if (doWhat === "read") { file.click(); return; }
        if (doWhat === "clear") { packs = []; const names = $("off-files"); if (names) names.textContent = ""; const el = $("off-status"); if (el) el.textContent = L("ফাইল সরিয়ে দেওয়া হয়েছে।", "Files cleared."); return; }
        if (doWhat === "analyse") { const r = analyseMd(); showLocal(en() ? "Analyse" : "বিশ্লেষণ", r.md, r.tables); return; }
        if (doWhat === "math") { math && math.requestSubmit(); return; }
        showLocal(b.textContent.trim(), draftMd(doWhat), []);
      });
      file.addEventListener("change", async () => {
        const list = [...(file.files || [])];
        file.value = "";
        if (list.length) await takeFiles(list);
      });
    }
    if (math && !math._off) {
      math._off = true;
      math.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const inp = $("off-expr");
        const text = (inp && inp.value || "").trim();
        if (!text) return;
        askOff(text);
      });
    }
    const save = $("off-save");
    if (save && !save._off) {
      save._off = true;
      save.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-off-save]");
        if (b) savePaper(b.dataset.offSave);
      });
    }
  }

  window.BA_BRAIN = {
    open() {
      bind();
      const last = data.turns[data.turns.length - 1];
      if (last && last.role === "assistant" && (last.content === "…" || /^… \d+$/.test(last.content))) {
        last.content = L("আগের উত্তর আটকে গিয়েছিল। আবার লিখুন।", "The last answer got stuck. Write again.");
        saveData();
      }
      paint();
      if (!loaded) refresh();
    },
    openOffline() {
      bindOff();
      data.off = data.off || [];
      const last = data.off[data.off.length - 1];
      if (last && last.role === "assistant" && (last.content === "…" || /^… \d+$/.test(last.content))) {
        last.content = L("আগের উত্তর আটকে গিয়েছিল। আবার লিখুন।", "The last answer got stuck. Write again.");
        saveData();
      }
      offNote();
      if (!loaded) refresh();
    },
    relabel() { paint(); paintOff(); }
  };
})();
