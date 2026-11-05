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

  const cfg = () => ({ n_ctx: 2048, n_threads: 1, n_batch: 128 });

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
      await w.loadModel([file], { n_ctx: 1024, n_threads: 1, n_batch: 128 });
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

  async function ask(q) {
    if (busy) return;
    if (!loaded) {
      setStatus(L("আগে মস্তিষ্ক এই ফোনে রাখুন, বা একটি .gguf ফাইল খুলুন।", "Put the brain on this phone first, or open a .gguf file."));
      return;
    }
    data.turns.push({ role: "user", content: q });
    data.turns.push({ role: "assistant", content: "…" });
    saveData();
    paint();
    const ac = new AbortController();
    busy = ac;
    const go = $("br-go");
    if (go) go.disabled = true;
    try {
      const w = await engineOf();
      const opts = {
        nPredict: 160,
        abortSignal: ac.signal,
        sampling: { temp: 0.6, top_k: 40, top_p: 0.9 },
        onNewToken: (_tok, _piece, current) => {
          data.turns[data.turns.length - 1].content = current;
          paint();
        }
      };
      let text = "";
      try { text = await w.createChatCompletion(messages(), opts); }
      catch (e) {
        const prompt = messages().map((m) => m.role + ": " + m.content).join("\n") + "\nassistant:";
        text = await w.createCompletion(prompt, opts);
      }
      text = String(text || "").trim();
      data.turns[data.turns.length - 1].content = text || L("কিছু আসেনি। আবার বলুন।", "Nothing came back. Try again.");
      saveData();
      paint();
    } catch (e) {
      const aborted = e && (e.name === "WllamaAbortError" || e.name === "AbortError");
      data.turns.pop();
      if (!aborted) data.turns.pop();
      saveData();
      paint();
      if (!aborted) setStatus(String(e && e.message || e).slice(0, 180));
    } finally {
      busy = null;
      if (go) go.disabled = false;
    }
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

  async function askOff(q) {
    if (busy) return;
    if (!loaded) {
      const el = $("off-status");
      if (el) el.textContent = L("আগে মস্তিষ্ক এই ফোনে রাখুন। Brain পাতায় গিয়ে নামান, অথবা এখানেই নামান।", "Put the brain on this phone first. Download it on the Brain page, or download it here.");
      return;
    }
    data.off = data.off || [];
    data.off.push({ role: "user", content: q });
    data.off.push({ role: "assistant", content: "…" });
    saveData();
    paintOff();
    const ac = new AbortController();
    busy = ac;
    const go = $("off-go");
    if (go) go.disabled = true;
    try {
      const w = await engineOf();
      const desk = readDesk();
      const prior = data.off.filter(t => !(t.role === "assistant" && t.content === "…")).slice(-6);
      const messages = [{ role: "system", content: desk.system }, ...prior.map(t => ({ role: t.role, content: t.content }))];
      const opts = { nPredict: 220, abortSignal: ac.signal, sampling: { temp: 0.6, top_k: 40, top_p: 0.9 }, onNewToken: (_a, _b, current) => { data.off[data.off.length - 1].content = current; paintOff(); } };
      let text = "";
      try { text = await w.createChatCompletion(messages, opts); }
      catch (e) { text = await w.createCompletion(messages.map(m => m.role + ": " + m.content).join("\n") + "\nassistant:", opts); }
      text = String(text || "").trim();
      try {
        if (typeof splitMemory === "function" && typeof learn === "function") {
          const sp = splitMemory(text);
          if (sp.lines && sp.lines.length) learn(sp.lines, "office");
          if (sp.clean) text = sp.clean;
        }
      } catch (e) { /* memory parse is optional */ }
      data.off[data.off.length - 1].content = text || L("কিছু আসেনি। আবার বলুন।", "Nothing came back. Try again.");
      saveData();
      paintOff();
      offNote();
    } catch (e) {
      const aborted = e && (e.name === "WllamaAbortError" || e.name === "AbortError");
      data.off.pop();
      if (!aborted) data.off.pop();
      saveData();
      paintOff();
      if (!aborted) { const el = $("off-status"); if (el) el.textContent = String(e && e.message || e).slice(0, 180); }
    } finally {
      busy = null;
      if (go) go.disabled = false;
    }
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
  }

  window.BA_BRAIN = {
    open() { bind(); paint(); if (!loaded) refresh(); },
    openOffline() { bindOff(); offNote(); if (!loaded) refresh(); },
    relabel() { paint(); paintOff(); }
  };
})();
