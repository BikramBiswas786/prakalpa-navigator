/* Brain: a small open model that runs on this phone. No API key. After the file is stored here, it answers with the network off. */
(function () {
  const REPO = "Qwen/Qwen2.5-0.5B-Instruct-GGUF";
  const FILE = "qwen2.5-0.5b-instruct-q4_0.gguf";
  const HF = "https://huggingface.co/" + REPO + "/resolve/main/" + FILE;
  const KEY = "biswas-brain-v1";
  const FILE_NAME = "biswas-brain.gguf";
  const MB = 428730208;

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
      if (j && Array.isArray(j.lessons) && Array.isArray(j.turns)) return j;
    } catch (e) { /* empty */ }
    return { lessons: [], turns: [] };
  }
  function saveData() {
    data.lessons = data.lessons.slice(-12);
    data.turns = data.turns.slice(-8);
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

  async function cachedHf(w) {
    try {
      const models = await w.modelManager.getModels();
      return models.some((m) => m && m.url === HF && m.size > 0);
    } catch (e) { return false; }
  }

  const cfg = () => ({ n_ctx: 1024, n_threads: 1, n_batch: 128 });

  async function useBlob(file, label) {
    await dropEngine();
    setStatus(L("মস্তিষ্ক খোলা হচ্ছে…", "Opening the brain…"));
    const w = await engineOf();
    await w.loadModel([file], cfg());
    loaded = label || file.name || "file";
    setStatus(L("এই ফোনে প্রস্তুত। কোনো চাবি লাগে না।", "Ready on this phone. No key is used."));
  }

  async function useHf() {
    await dropEngine();
    const w = await engineOf();
    const had = await cachedHf(w);
    setStatus(had
      ? L("ফোনের কপি খোলা হচ্ছে…", "Opening the copy on this phone…")
      : L("প্রথমবার প্রায় ৪০৯ MB নামছে। পরে আর নামবে না।", "First time: about 409 MB. It is not downloaded again."));
    await w.loadModelFromHF(REPO, FILE, {
      ...cfg(),
      progressCallback: ({ loaded: n, total }) => {
        const t = total || MB;
        const pct = Math.min(100, Math.round((n / t) * 100));
        if (!had) setStatus(L(`নামছে ${pct}%`, `Downloading ${pct}%`));
      }
    });
    loaded = "Qwen 0.5B";
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
    if (own) {
      setStatus(L(`একটা মস্তিষ্ক ফাইল এই ফোনে আছে (${Math.round(own.size / 1048576)} MB)। চাইলে আবার খুলুন।`, `A brain file is already on this phone (${Math.round(own.size / 1048576)} MB). Open it again if you want.`));
      return;
    }
    try {
      const w = await engineOf();
      if (await cachedHf(w)) setStatus(L("ছোট মস্তিষ্ক এই ফোনে আছে। খুললেই চলবে, ইন্টারনেট ছাড়াও।", "The small brain is already on this phone. Open it, even with no internet."));
      else setStatus(L("এখনো এই ফোনে নেই। প্রথমবার প্রায় ৪০৯ MB লাগবে। তারপর চাবি বা ইন্টারনেট লাগে না।", "Not on this phone yet. The first time needs about 409 MB. After that, no key and no internet."));
    } catch (e) {
      setStatus(L("মস্তিষ্কের অংশ লোড হয়নি। ইন্টারনেট দেখে আবার খুলুন।", "The brain runtime did not load. Check the internet and open this page again."));
    }
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

  window.BA_BRAIN = {
    open() { bind(); paint(); if (!loaded) refresh(); },
    relabel() { paint(); }
  };
})();
