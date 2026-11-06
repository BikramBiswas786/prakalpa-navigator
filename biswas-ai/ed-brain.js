/* Brain: a small open model that runs on this phone. No API key. After the file is stored here, it answers with the network off. */
(function () {
  const SIZE = 270590880;
  const KEY = "biswas-brain-v1";
  const FILE_NAME = "biswas-brain-360.gguf";

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

  const cfg = () => ({ n_ctx: 768, n_threads: 1, n_batch: 64 });

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
      setStatus(L("নামছে " + pct + "% · প্রায় ২৫৮ MB", "Downloading " + pct + "% · about 258 MB"));
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
      setStatus(L("প্রথমবার প্রায় ২৫৮ MB, ছোট ছোট অংশে। আগের ১০০ MB ফাইল আর ব্যবহার হয় না।", "First time: about 258 MB, in small pieces. The old 100 MB file is not used."));
      try { const root = await navigator.storage.getDirectory(); await root.removeEntry("biswas-brain.gguf"); } catch (e) { /* old file already gone */ }
      file = await downloadParts();
    } else setStatus(L("ফোনের কপি খোলা হচ্ছে…", "Opening the copy on this phone…"));
    await useBlob(file, "SmolLM2-360M");
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
      killer = setTimeout(() => ac.abort(), 180000);
      const w = await engineOf();
      const mem = (data.lessons || []).slice(-3).map((x) => String(x).slice(0, 60)).join("; ");
      const prompt = brief() + (mem ? "\nRemember: " + mem : "") + "\n" + String(extra || "").slice(0, 280) + "\nUser: " + String(q).slice(0, 500) + "\nAssistant:";
      const text = String(await w.createCompletion(prompt, {
        nPredict: 420,
        abortSignal: ac.signal,
        sampling: { temp: 0.4, top_k: 20, top_p: 0.9, penalty_repeat: 1.18, penalty_last_n: 128 },
        onNewToken: (_a, _b, current) => {
          if (id !== gen || !current) return;
          const bits = current.split(/(?<=[.।!?])\s+/);
          const lastBit = bits[bits.length - 1] || "";
          if (lastBit.length > 24 && bits.slice(0, -1).indexOf(lastBit) >= 0) { ac.abort(); return; }
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
        ? L("২৫৮ MB ফাইল এখনো এই ফোনে নেই। ওপরের বোতাম চাপুন। নিজের PDF বা Excel লাগবে না।", "The 258 MB file is not on this phone yet. Tap the button above. You do not need your own PDF or Excel.")
        : aborted
          ? L("তিন মিনিটে শব্দ আসেনি। আরও ছোট প্রশ্ন লিখুন।", "No word came in three minutes. Write a shorter question.")
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

  function brief() {
    return "You are Biswas Brain on this phone. Explain in clear paragraphs, up to about 500 words, in the user's language. Do not repeat a sentence. You may explain history, economics and institutions in general terms. Do not invent a memo number, a person's case file, or a figure the user did not give. If you do not know who holds an office today, say so. Known on 6 November 2026: Prime Minister of India Narendra Modi; President of India Droupadi Murmu since 25 July 2022; Chief Minister of West Bengal Suvendu Adhikari since 9 May 2026; President of the United States Donald Trump since 20 January 2025, Vice President JD Vance.";
  }
  const RECORD = [
    { test: /প্রধানমন্ত্রী|prime minister|নরেন্দ্র|narendra modi|\bmodi\b|মোদি|মোদী/i, en: "As of 6 November 2026, the Prime Minister of India is Narendra Modi.", bn: "৬ নভেম্বর ২০২৬ পর্যন্ত ভারতের প্রধানমন্ত্রী নরেন্দ্র মোদী।" },
    { test: /রাষ্ট্রপতি|president of india|droupadi|murmu|মুর্মু/i, en: "Droupadi Murmu has been President of India since 25 July 2022. This offline record has no later change.", bn: "দ্রৌপদী মুর্মু ২৫ জুলাই ২০২২ থেকে ভারতের রাষ্ট্রপতি। এই অফলাইন তালিকায় তারপর কোনো বদল নেই।" },
    { test: /মুখ্যমন্ত্রী|chief minister|west bengal|পশ্চিমবঙ্গ|suvendu|অধিকারী|mamata|মমতা|রাজ্যপাল|\bgovernor\b/i, en: "As of 6 November 2026, the Chief Minister of West Bengal is Suvendu Adhikari (Bharatiya Janata Party), sworn in on 9 May 2026. He is the first BJP Chief Minister of the state. Mamata Banerjee was Chief Minister before that. The Governor named with that change was R. N. Ravi.", bn: "৬ নভেম্বর ২০২৬ পর্যন্ত পশ্চিমবঙ্গের মুখ্যমন্ত্রী শুভেন্দু অধিকারী (ভারতীয় জনতা পার্টি)। তিনি ৯ মে ২০২৬ শপথ নেন। রাজ্যের প্রথম বিজেপি মুখ্যমন্ত্রী। তার আগে মুখ্যমন্ত্রী ছিলেন মমতা বন্দ্যোপাধ্যায়। সেই সময়ে রাজ্যপাল আর. এন. রবি।" },
    { test: /united states|u\.s\.a|\busa\b|america|যুক্তরাষ্ট্র|মার্কিন|trump|ট্রাম্প|\bvance\b|ভাইস প্রেসিডেন্ট|vice president/i, en: "As of 6 November 2026, the President of the United States is Donald Trump. He has been in office since 20 January 2025. This term runs to 20 January 2029. He is the 47th president. The Vice President is JD Vance.", bn: "৬ নভেম্বর ২০২৬ পর্যন্ত যুক্তরাষ্ট্রের প্রেসিডেন্ট ডোনাল্ড ট্রাম্প। তিনি ২০ জানুয়ারি ২০২৫ থেকে দায়িত্বে। এই মেয়াদ ২০ জানুয়ারি ২০২৯ পর্যন্ত। তিনি ৪৭তম প্রেসিডেন্ট। ভাইস প্রেসিডেন্ট জেডি ভ্যান্স।" }
  ];
  function recordAnswer(q) {
    const bits = [];
    if (/who is the president of (the )?(usa|u\.s|united states)|president of (the )?(usa|united states)|যুক্তরাষ্ট্রের প্রেসিডেন্ট কে/i.test(q)) bits.push(qEn(q) ? RECORD[3].en : RECORD[3].bn);
    if (/who is the prime minister|প্রধানমন্ত্রী কে|ভারতের প্রধানমন্ত্রী/i.test(q)) bits.push(qEn(q) ? RECORD[0].en : RECORD[0].bn);
    if (/who is the chief minister|মুখ্যমন্ত্রী কে|পশ্চিমবঙ্গের মুখ্যমন্ত্রী/i.test(q)) bits.push(qEn(q) ? RECORD[2].en : RECORD[2].bn);
    if (/who is the president of india|ভারতের রাষ্ট্রপতি কে/i.test(q)) bits.push(qEn(q) ? RECORD[1].en : RECORD[1].bn);
    if (bits.length) return bits.join("\n\n") + (qEn(q) ? "\n\nOffline record, 6 November 2026." : "\n\nঅফলাইন তালিকা, ৬ নভেম্বর ২০২৬।");
    if (/who is|who was|কে হলেন|এখন কে/i.test(q) && /president|minister|প্রেসিডেন্ট|মন্ত্রী|রাষ্ট্রপতি/i.test(q)) {
      return qEn(q)
        ? "That office is not in the offline record of 6 November 2026, so it is not guessed."
        : "এই পদ ৬ নভেম্বর ২০২৬-এর তালিকায় নেই, তাই অনুমান করা হয়নি।";
    }
    return "";
  }

  async function ask(q) {
    sink = data.turns;
    try { if (await localJob(q)) return; }
    finally { sink = null; }
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
    setStatus(L("এখনো এই ফোনে নেই। প্রথমবার প্রায় ২৫৮ MB, ছোট ছোট অংশে।", "Not on this phone yet. The first time is about 258 MB, in small pieces."));
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
  let sink = null;
  function showLocal(q, md, tables) {
    const list = sink || (data.off = data.off || []);
    list.push({ role: "user", content: q });
    list.push({ role: "assistant", content: String(md).slice(0, 24000) });
    paper = { md: String(md), tables: tables || [] };
    saveData();
    paint();
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
  function qEn(q) {
    const bn = (String(q).match(/[\u0980-\u09FF]/g) || []).length;
    const lat = (String(q).match(/[A-Za-z]/g) || []).length;
    if (bn > lat) return false;
    if (lat > 0) return true;
    return en();
  }
  function officeFromAsk(q) {
    if (!/draft|notesheet|খসড়া|নোটশিট|\bletter\b|চিঠি|put up|submitting|পেশ কর/i.test(q)) return "";
    const useEn = qEn(q);
    const count = Math.min(20, Math.max(1, Number((q.match(/\b(\d+)\b/) || [])[1] || 0) || 1));
    const many = /case|মামলা|আবেদন/i.test(q) ? count : 0;
    const heir = /legal heir|heir certificate|waris|ওয়ারিশ|উত্তরাধিকার/i.test(q);
    const approve = /recommend|approval|অনুমোদন|সুপারিশ|approve/i.test(q);
    const head = officeHead();
    const rows = many || (heir ? 5 : 0);
    const n = rows || 0;
    if (heir || (n && approve)) {
      const lines = [];
      for (let i = 1; i <= (n || 5); i++) lines.push("| " + i + " | ______ | ______ | ______ | ______ | ______ | " + (approve ? (useEn ? "Recommended" : "সুপারিশ") : "______") + " |");
      if (useEn) {
        return head + "\n\n**NOTE**\n\n**Subject:** Legal heir certificate — " + (n || 5) + " cases " + (approve ? "recommended for approval" : "put up") + "\n\nFrom the Dealing Assistant to the Sub-Divisional Officer.\n\n" + (n || 5) + " applications for a legal heir certificate are submitted with this note. The names, parentage, village, date of death and the enquiry report were not in the instruction, so those stay ______ and must be copied from each case file before anything is signed.\n\nIn each case the record has to show the death certificate, who the applicants are to the deceased, the local enquiry, and whether any objection is pending. A certificate is not ready for signature if the enquiry does not support the claim.\n\n" + (approve ? "On the instruction now given, these cases are recommended for approval, but only after the blanks below are filled from the files and found in order." : "The recommendation for each case is left blank until the file is checked.") + "\n\n| Case | Deceased | Applicant | Relationship | Village | Date of death | Recommendation |\n| --- | --- | --- | --- | --- | --- | --- |\n" + lines.join("\n") + "\n\nIf the Sub-Divisional Officer is satisfied, the certificates may be approved and signed. The dealing assistant does not approve them. No memo number has been invented.\n\n(Dealing Assistant)\nDate: ______\n\nSub-Divisional Officer";
      }
      return head + "\n\n**নোট**\n\n**বিষয়:** ওয়ারিশ সনদ — " + (n || 5) + "টি মামলা " + (approve ? "অনুমোদনের জন্য সুপারিশ" : "পেশ") + "\n\nডিলিং অ্যাসিস্ট্যান্টের পক্ষ থেকে মহকুমা শাসকের কাছে।\n\n" + (n || 5) + "টি ওয়ারিশ সনদের আবেদন এই নোটের সঙ্গে পেশ করা হল। মৃতের নাম, সম্পর্ক, গ্রাম, মৃত্যুর তারিখ ও তদন্তের কথা নির্দেশে ছিল না, তাই সেগুলো ______। সইয়ের আগে নথি থেকে বসাতে হবে।\n\nপ্রতিটি মামলায় মৃত্যুর সনদ, আবেদনকারীর সম্পর্ক, স্থানীয় তদন্ত এবং আপত্তি আছে কি না, তা দেখতে হবে। তদন্ত সমর্থন না করলে সইয়ের জন্য প্রস্তুত নয়।\n\n" + (approve ? "এখনকার নির্দেশ অনুযায়ী এই মামলাগুলো অনুমোদনের জন্য সুপারিশ করা হল, তবে নিচের ফাঁকা জায়গা নথি থেকে পূরণ ও মিলিয়ে দেখার পর।" : "প্রতিটি মামলার সুপারিশ নথি দেখার আগে খালি রাখা হয়েছে।") + "\n\n| মামলা | মৃত | আবেদনকারী | সম্পর্ক | গ্রাম | মৃত্যুর তারিখ | সুপারিশ |\n| --- | --- | --- | --- | --- | --- | --- |\n" + lines.join("\n") + "\n\nমহকুমা শাসক সন্তুষ্ট হলে সনদ অনুমোদন ও সই করতে পারেন। ডিলিং অ্যাসিস্ট্যান্ট অনুমোদন করেন না। স্মারক নম্বর বানানো হয়নি।\n\n(ডিলিং অ্যাসিস্ট্যান্ট)\nতারিখ: ______\n\nমহকুমা শাসক";
    }
    const subject = String(q).replace(/\s+/g, " ").slice(0, 200);
    if (useEn) {
      return head + "\n\n**NOTE**\n\n**Subject:** " + subject + "\n\nThe dealing assistant puts up the following. What was not in the instruction stays ______.\n\nThe matter, as asked: " + subject + "\n\nFacts still to be taken from the file: names, dates, memo number, amounts.\n\nProposal: ______\n\nPut up for kind orders.\n\n(Dealing Assistant)\nDate: ______\n\nSub-Divisional Officer";
    }
    return head + "\n\n**নোট**\n\n**বিষয়:** " + subject + "\n\nডিলিং অ্যাসিস্ট্যান্ট পেশ করছেন। নির্দেশে নেই এমন তথ্য ______।\n\nযে বিষয় চাওয়া হয়েছে: " + subject + "\n\nনথি থেকে নিতে বাকি: নাম, তারিখ, স্মারক নম্বর, টাকা।\n\nপ্রস্তাব: ______\n\nআদেশের জন্য পেশ করা হল।\n\n(ডিলিং অ্যাসিস্ট্যান্ট)\nতারিখ: ______\n\nমহকুমা শাসক";
  }
  function essays(q) {
    const useEn = qEn(q);
    const out = [];
    if (/tariff|trade war|শুল্ক|বাণিজ্য যুদ্ধ/i.test(q)) out.push(useEn
      ? "# Tariffs, and using them as a weapon\n\nA tariff is a tax on goods coming into a country. The importer pays it, and the cost usually shows up in the price.\n\nA trade war is what follows when countries answer each other's tariffs with more tariffs, instead of settling the dispute. Trade falls, prices rise, and factories that need imported parts slow down.\n\nCalling a tariff a weapon means it is being used as pressure, not only as revenue. A government may use it to shelter a home industry, to punish another country, to force a negotiation, or to answer what it says is dumping or an unfair subsidy.\n\nA United States administration imposes high tariffs for a few stated reasons: to protect manufacturing and jobs, to cut a trade deficit, to treat some goods (steel, chips) as a security matter, and to gain leverage. The cost is real. Households pay more. Firms that import parts pay more. Other countries retaliate against American exports. Allies as well as rivals get hit.\n\nAs of 6 November 2026 the President is Donald Trump, and tariffs were a stated tool of his administration. This note does not invent a 2026 tariff rate. A rate that is not in an attached official order is not stated here."
      : "# শুল্ক, এবং সেটাকে অস্ত্র হিসেবে ব্যবহার\n\nশুল্ক হল আমদানির ওপর কর। আমদানিকারক দেয়, দামে সেটা পড়ে।\n\nবাণিজ্য যুদ্ধ হয় যখন দেশে দেশে শুল্কের জবাবে আবার শুল্ক বসে। বাণিজ্য কমে, দাম বাড়ে, যে কারখানা আমদানি করা যন্ত্রাংশ চায় সেটা থেমে যায়।\n\nশুল্ককে অস্ত্র বলা হয় যখন সেটা চাপ দেওয়ার জন্য, শুধু রাজস্বের জন্য নয়। দেশীয় শিল্প বাঁচাতে, অন্য দেশকে শাস্তি দিতে, আলোচনায় ছাড় আদায় করতে, বা অন্যায় ভরতুকির জবাব দিতে এটা ব্যবহার হয়।\n\nযুক্তরাষ্ট্র উচ্চ শুল্ক বসায় এই যুক্তিতে: নিজের কারখানা ও চাকরি, বাণিজ্য ঘাটতি, ইস্পাত বা চিপকে নিরাপত্তার বিষয় বলা, এবং দরকষাকষির সুবিধা। দাম পড়ে সাধারণ মানুষের ওপর। যন্ত্রাংশ আমদানি করা কারখানারও। অন্য দেশ আমেরিকার রপ্তানিতে জবাব দেয়।\n\n৬ নভেম্বর ২০২৬-এ প্রেসিডেন্ট ডোনাল্ড ট্রাম্প। শুল্ক তার প্রশাসনের ঘোষিত হাতিয়ার। কোনো ২০২৬-এর শুল্কের হার এখানে বানানো হয়নি।");
    if (/taiwan|তাইওয়ান/i.test(q) && /german|brazil|supply|জার্মান|ব্রাজিল|সরবরাহ/i.test(q)) out.push(useEn
      ? "# Briefing: a sudden Taiwan Strait disruption\n\nThis is a hypothetical, not a news report. It uses the structure of the supply chain as it is known, not a secret cable.\n\nTaiwan makes a very large share of the world's advanced chips, and the strait is one of the busiest sea lanes. A sudden disruption does two things at once: chips stop moving, and insurers reprice shipping.\n\nGermany's car industry feels the chip stop first. A modern car needs chips in the engine controls, the safety systems and the dashboard. The 2020–22 shortage already showed that German lines stop when one class of chip is missing, even if steel and labour are on hand. Wiring, sensors and the machines that build the cars are in the same chain. The effect is days to weeks, not years: shifts cancelled, unfinished cars parked, suppliers told to halt.\n\nBrazil's farms are not waiting on Taiwanese chips in the same way. The immediate hit is indirect. A crisis that involves China hits the buyer of Brazilian soy and iron ore, and it hits freight insurance and the price of fuel. Farm machinery and spare parts also move on those ships. Fertiliser is a separate chain (gas, potash, phosphate), but a shipping and currency shock reaches the farm gate in the same season through freight, diesel and the soy price.\n\nSo the same event is a parts crisis in Germany and a price-and-freight crisis in Brazil. Neither is solved by the other country's stocks."
      : "# ব্রিফিং: তাইওয়ান প্রণালিতে আকস্মিক বিঘ্ন\n\nএটা অনুমান, সংবাদ নয়।\n\nতাইওয়ান উন্নত চিপের বড় অংশ বানায়, আর প্রণালি ব্যস্ত জলপথ। বিঘ্ন হলে চিপ আসা বন্ধ হয় এবং জাহাজের বীমা দাম বাড়ে।\n\nজার্মানির গাড়ি শিল্পে ধাক্কা আগে লাগে। গাড়ির ইঞ্জিন, নিরাপত্তা ও ড্যাশবোর্ডে চিপ লাগে। ২০২০–২২-এর ঘাটতিতে দেখা গেছে, এক শ্রেণির চিপ না থাকলে লাইন থেমে যায়।\n\nব্রাজিলের খামার সেই চিপের জন্য অপেক্ষা করে না। ধাক্কা অন্য পথে: চিন সয়া ও লৌহ আকরিক কেনে, ভাড়া ও বীমা বাড়ে, যন্ত্রের যন্ত্রাংশ আটকে। সার আলাদা চেইন, কিন্তু ভাড়া, ডিজেল ও সয়ার দাম একই মরসুমে খামারে পৌঁছায়।\n\nএকই ঘটনা জার্মানিতে যন্ত্রাংশের সংকট, ব্রাজিলে দাম ও ভাড়ার সংকট।");
    if (/paris/i.test(q) && /kyoto/i.test(q)) out.push(useEn
      ? "# Paris and Kyoto, in about 200 words\n\nThe Kyoto Protocol (1997) set legally binding emission cuts, but only for a list of developed countries. The United States signed and then did not ratify. Canada later withdrew. China and India, where emissions were growing, had no reduction target. The design was top-down: one number, imposed, with a weak way to enforce it. It stalled because the United States Senate would not accept cuts that left large developing emitters out, and because a rigid target could not survive domestic politics.\n\nThe Paris Agreement (2015) dropped that bargain. Every country puts forward its own nationally determined contribution. There is a shared transparency framework and a cycle of review, not a single binding tonnage for the rich alone. A country can miss a pledge without being expelled from the treaty. That is why it held together when Kyoto's binding list did not: participation was the point, and the obligation was to report and to update, not to hit one number or leave.\n\nParis did not therefore solve warming. It succeeded as a framework where Kyoto stalled as a treaty. The atmosphere does not care which design was more popular."
      : "# প্যারিস ও কিয়োটো\n\nকিয়োটো প্রোটোকল (১৯৯৭) বাধ্যতামূলক কাটছাঁট দিয়েছিল, কিন্তু শুধু উন্নত দেশের তালিকায়। যুক্তরাষ্ট্র সই করে অনুমোদন করেনি। কানাডা পরে বেরিয়ে যায়। চিন ও ভারতের বাড়তি নিঃসরণের লক্ষ্য ছিল না। নকশা ছিল ওপর থেকে একটা সংখ্যা, জোর করে মানানোর পথ দুর্বল। সিনেট এমন কাটছাঁট নেয়নি যেখানে বড় উন্নয়নশীল নিঃসরণকারী বাইরে।\n\nপ্যারিস চুক্তি (২০১৫) সেই শর্ত সরায়। প্রতিটি দেশ নিজের লক্ষ্য দেয়। একসঙ্গে স্বচ্ছতার কাঠামো ও পর্যালোচনা আছে, শুধু ধনী দেশের জন্য এক বাধ্যতামূলক টন নয়। লক্ষ্য না মানলেও চুক্তি থেকে বহিষ্কার নয়। তাই কিয়োটোর বাধ্যতামূলক তালিকা টেকেনি, প্যারিসের অংশগ্রহণ টিকেছে।\n\nপ্যারিস উষ্ণায়ন সমাধান করেনি। চুক্তি হিসেবে কিয়োটো আটকেছিল, কাঠামো হিসেবে প্যারিস টিকেছে।");
    if (/apollo|moon landing|চাঁদ/i.test(q)) out.push(useEn
      ? "# Two journal pages, 20 July 1969\n\nThese are imagined private pages, not quotations from real people.\n\n**Houston.** The street was all porch lights and a radio in the window. We had watched the countdown as if it were a high-school game, except nobody joked. When Armstrong's voice came through, thin and late, my father stood up and did not sit down again. At work they will say we beat them. Tonight it did not feel like beating anyone. It felt like the set in the living room had opened onto a place with no air. Mother cried, then said the flag looked small. I wrote the time on the calendar. A man from our town is up there, or near enough. I am proud in a way I do not want to examine, because the pride has a uniform on it.\n\n**Moscow.** The landing was on the late news, short, and the announcer's voice did not change. We were first: the satellite, the dog, Gagarin. Everyone in the kitchen knows that sentence. It did not help. My brother said the Americans had spent money they do not know how to count, and then he went quiet, which is how he sounds when he is angry at himself. I turned the dial and found music. The Moon is nobody's, the papers will say. The papers are late. What I saw was their flag, and our silence, and I hated that I wanted to see it again."
      : "# দুই পাতার ডায়েরি, ২০ জুলাই ১৯৬৯\n\nএগুলো কল্পিত ব্যক্তিগত পাতা, কোনো প্রকৃত মানুষের উদ্ধৃতি নয়।\n\n**হিউস্টন।** রাস্তায় বারান্দার আলো আর জানালায় রেডিও। কাউন্টডাউন দেখলাম যেন স্কুলের খেলা, কিন্তু কেউ হাসেনি। আর্মস্ট্রঙের স্বর এল, ক্ষীণ, দেরিতে। বাবা দাঁড়িয়ে রইলেন। কাল অফিসে বলবে আমরা তাদের হারিয়েছি। আজ তেমন লাগেনি। টিভিটা যেন বাতাসহীন এক জায়গায় খুলে গেছে। মা কাঁদলেন, তারপর বললেন পতাকাটা ছোট দেখাচ্ছে। ক্যালেন্ডারে সময় লিখলাম। গর্বটা ইউনিফর্ম পরা, তাই সেটা খুঁড়তে ইচ্ছে করে না।\n\n**মস্কো।** খবরটা রাতের অনুষ্ঠানে ছোট করে এল, ঘোষকের স্বর বদলায়নি। আমরাই প্রথম: স্যাটেলাইট, কুকুর, গ্যাগারিন। রান্নাঘরের সবাই এই বাক্য জানে। তাতে কিছু হয়নি। ভাই বলল আমেরিকানরা টাকা গুনতে জানে না, তারপর চুপ করল। আমি রেডিওতে গান খুঁজলাম। কাগজ বলবে চাঁদ কারও নয়। কাগজ দেরি করে। আমি দেখেছি তাদের পতাকা, আর আমাদের চুপ, আর আবার দেখতে ইচ্ছে হওয়াটা অপছন্দ করলাম।");
    if (/ottoman|উসমান/i.test(q)) out.push(useEn
      ? "# From the Ottoman defeat to today's borders\n\n1. **1914–1918.** The Ottoman Empire entered the First World War on the side of Germany and Austria-Hungary and was defeated. By late 1918 the Arab provinces were under British and French occupation, and the imperial government could no longer hold them.\n\n2. **1916–1920.** Wartime bargains, above all Sykes–Picot (1916) and the Balfour Declaration (1917), were turned into the San Remo decisions and the Treaty of Sèvres (1920). The Arab lands were not left as one state. They were divided into British and French mandates: Iraq, Palestine and Transjordan under Britain; Syria and Lebanon under France.\n\n3. **1923 and after.** The Treaty of Lausanne (1923) settled the borders of the new Turkish republic and buried Sèvres inside Anatolia. The mandates then hardened into the states recognised later: Iraq, Syria, Lebanon, Jordan, and, out of the Palestine mandate, Israel and the unfinished question of a Palestinian state.\n\n4. **Why it still cuts.** Those lines were drawn for imperial convenience. They split some peoples (the Kurds across Turkey, Syria, Iraq and Iran) and locked others together (Sunni, Shia and Kurds inside Iraq; many sects inside Lebanon and Syria). The conflicts of today are not all \"because of Sykes–Picot\", but the map those years produced is the map the conflicts are fought on."
      : "# উসমানীয় পরাজয় থেকে আজকের সীমান্ত\n\n1. **১৯১৪–১৯১৮।** উসমানীয় সাম্রাজ্য জার্মানি ও অস্ট্রিয়া-হাঙ্গেরির পক্ষে প্রথম বিশ্বযুদ্ধে ঢোকে এবং হারে। ১৯১৮-এর শেষে আরব প্রদেশ ব্রিটিশ ও ফরাসি দখলে।\n\n2. **১৯১৬–১৯২০।** সাইকস–পিকো (১৯১৬) ও বেলফোর ঘোষণা (১৯১৭) সান রেমো ও সেভ্র চুক্তিতে (১৯২০) রূপ নেয়। আরব ভূমি এক রাষ্ট্র থাকেনি। ব্রিটিশ ম্যান্ডেট: ইরাক, ফিলিস্তিন, ট্রান্সজর্ডান। ফরাসি ম্যান্ডেট: সিরিয়া, লেবানন।\n\n3. **১৯২৩ ও তারপর।** লোজান চুক্তি (১৯২৩) নতুন তুরস্কের সীমা ঠিক করে। ম্যান্ডেট পরে রাষ্ট্র হয়: ইরাক, সিরিয়া, লেবানন, জর্ডান, আর ফিলিস্তিন ম্যান্ডেট থেকে ইসরায়েল এবং ফিলিস্তিনি রাষ্ট্রের অসমাপ্ত প্রশ্ন।\n\n4. **কেন এখনও কাটে।** রেখাগুলো সাম্রাজ্যের সুবিধায় টানা। কুর্দদের ভাগ করা হয়েছে তুরস্ক, সিরিয়া, ইরাক ও ইরানে। ইরাকের ভেতরে সুন্নি, শিয়া ও কুর্দ একসঙ্গে বন্ধ। আজকের সব যুদ্ধ \"সাইকস–পিকোর জন্য\" নয়, কিন্তু লড়াই এই মানচিত্রের ওপর।");
    if (/2008|jenga|financial crisis|great recession|আর্থিক সংকট/i.test(q)) out.push(useEn
      ? "# 2008, as a badly built Jenga tower\n\nThe table was the belief that American house prices would not fall together. Each block pulled out and set on top was a loan to a buyer who could not really pay: low first-year rates, little proof of income, then a higher rate later.\n\nThe tower looked solid because the blocks were glued into bundles, the mortgage-backed securities, and the bundles into further bundles, the collateralised debt obligations. A ratings agency stamped the top pieces AAA, which is the pretence that the glue was stronger than the wood. Banks bought the pieces with borrowed money, and insured some of them with credit default swaps, many written by AIG. Leverage is playing Jenga with someone else's blocks while standing on a chair.\n\nFrom 2006 house prices did fall. The bottom loans failed. In March 2008 Bear Stearns was propped up. In September Lehman Brothers was allowed to fall, and the funding market, the overnight loans banks make to each other, froze. That is the tower hitting the table.\n\nThe blocks had been sold worldwide. European banks held them. Trade shrank in 2009, so countries that had never sold a bad American mortgage still lost jobs. The accurate moral of the toy: the danger was not one loose block. It was a tall stack, mislabelled as safe, standing on a single assumption about house prices."
      : "# ২০০৮, খারাপ জেঙ্গা টাওয়ার\n\nটেবিলটা ছিল এই বিশ্বাস যে আমেরিকার বাড়ির দাম একসঙ্গে পড়বে না। প্রতিটি ব্লক এমন ঋণ যা ক্রেতা আসলে শোধ করতে পারবে না: প্রথম বছর কম সুদ, আয়ের প্রমাণ কম, পরে সুদ বাড়ে।\n\nটাওয়ার শক্ত দেখাত কারণ ব্লক বাণ্ডিল করা হয়েছিল, মর্টগেজ-ব্যাকড সিকিউরিটি, আর সেই বাণ্ডিল আবার বাণ্ডিল, সিডিও। রেটিং সংস্থা ওপরের টুকরোতে AAA সিল দিয়েছিল। ব্যাংক ধার করা টাকায় সেগুলো কেনে, আর এআইজি-র মতো প্রতিষ্ঠান বিমা লেখে।\n\n২০০৬ থেকে বাড়ির দাম পড়ে। নিচের ঋণ ভাঙে। মার্চ ২০০৮-এ বেয়ার স্টার্নসকে ধরা হয়। সেপ্টেম্বরে লেহম্যানকে পড়তে দেওয়া হয়। ব্যাংক যে রাতারাতি একে অপরকে ধার দেয়, সেই বাজার জমে যায়। টাওয়ার টেবিলে পড়ে।\n\nটুকরোগুলো পৃথিবীজুড়ে বিক্রি হয়েছিল। ইউরোপের ব্যাংকেও ছিল। ২০০৯-এ বাণিজ্য কমে, তাই যে দেশ খারাপ আমেরিকান ঋণ বেচেনি সেখানেও চাকরি যায়। বিপদ একটা আলগা ব্লক নয়। বিপদ হল উঁচু স্তূপ, নিরাপদ বলে ভুল সিল, বাড়ির দামের একটা ধারণার ওপর দাঁড়ানো।");
    if (/telegraph|transatlantic|low earth|satellite constellation|\bleo\b|স্যাটেলাইট/i.test(q)) out.push(useEn
      ? "# From the telegraph cable to the low orbit\n\nThe first lasting transatlantic telegraph cable (1866, after the 1858 cable failed) tied two imperial coasts with a single copper line. A message that had taken a ship weeks took minutes. The wire was owned by companies and used by governments, newspapers and banks. It was one path. A break, or a government at either end, stopped it. Capacity was a trickle of Morse.\n\nThe next century thickened the path: radio, then telephone cables, then fibre-optic cables on the same sea floor from the late 1980s. Fibre is still how most internet traffic moves. It is cheap per bit and easy to cut, in a trench or by a state that controls the landing station.\n\nLow Earth orbit constellations, Starlink and OneWeb among them, change the shape rather than only the speed. Thousands of satellites a few hundred kilometres up give latency closer to a ground cable than an old high-orbit relay does, and a dish can be set down where no cable will be laid: an ocean, a farm, a war. Ownership sits with a few firms, not with a treaty or a post office. The new weakness is different. A cable is cut in one place. A constellation can be jammed, denied to a customer, or switched off by the company, as the Ukraine war from 2022 made obvious. The telegraph made empires simultaneous. The constellation makes a private switchboard simultaneous, and the switch is not in the foreign ministry."
      : "# টেলিগ্রাফ তার থেকে নিচু কক্ষপথ\n\nপ্রথম টিকে থাকা আটলান্টিক টেলিগ্রাফ তার (১৮৬৬) দুই উপকূলকে এক তামার তারে বাঁধে। জাহাজে যা সপ্তাহ লাগত, মিনিটে পৌঁছায়। কোম্পানি মালিক, সরকার, সংবাদপত্র ও ব্যাংক ব্যবহার করত। পথ একটা। ছিঁড়লে বা এক প্রান্তের সরকার চাইলে থেমে যায়।\n\nপরে রেডিও, টেলিফোন তার, ১৯৮০-র শেষ থেকে একই সমুদ্রতলে ফাইবার। বেশির ভাগ ইন্টারনেট এখনও ফাইবারে। সস্তা, কিন্তু কাটাও সহজ।\n\nনিচু কক্ষপথের স্যাটেলাইট, যেমন স্টারলিংক ও ওয়ানওয়েব, শুধু গতি নয়, আকৃতি বদলায়। কয়েকশো কিলোমিটার ওপরে হাজার স্যাটেলাইট, বিলম্ব মাটির তারের কাছাকাছি। তার যেখানে পৌঁছায় না, সেখানে ডিশ বসে: সমুদ্র, খামার, যুদ্ধক্ষেত্র। মালিকানা কয়েকটি কোম্পানির। নতুন দুর্বলতা আলাদা। তার এক জায়গায় কাটে। এই জাল আটকানো যায়, গ্রাহককে বন্ধ করা যায়, কোম্পানি সুইচ অফ করতে পারে। ২০২২ থেকে ইউক্রেন যুদ্ধে এটা স্পষ্ট। টেলিগ্রাফ সাম্রাজ্যকে একসময়ের করেছিল। এই জাল একটি বেসরকারি সুইচবোর্ডকে একসময়ের করে, সুইচটা পররাষ্ট্র মন্ত্রণালয়ে নয়।");
    return out.join("\n\n---\n\n");
  }
  function compose(q) {
    const bits = [];
    const who = recordAnswer(q);
    const paper = officeFromAsk(q);
    const said = essays(q);
    if (who) bits.push(who);
    if (paper) bits.push(paper);
    if (said) bits.push(said);
    if (!bits.length) return "";
    return bits.join("\n\n---\n\n");
  }
  async function localJob(q) {
    const text = String(q || "").trim();
    const made = compose(text);
    if (made) { showLocal(text, made, []); return true; }
    let kind = "";
    if (/নোটশিট|notesheet/i.test(text)) kind = "notesheet";
    else if (/নোটিশ|notice|show-?cause/i.test(text)) kind = "notice";
    else if (/আদেশ|\border\b/i.test(text)) kind = "order";
    else if (/রিপোর্ট|\breport\b/i.test(text)) kind = "report";
    else if (/চিঠি|\bletter\b|\bdfa\b|draft|খসড়া/i.test(text)) kind = "letter";
    else if (/বিশ্লেষণ|analys|সারাংশ|summary/i.test(text)) kind = "analyse";
    if (!kind) {
      const known = recordAnswer(text);
      if (known) { showLocal(text, known, []); return true; }
    }
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
