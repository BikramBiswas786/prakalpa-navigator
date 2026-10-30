/* Images studio: photo adjustments, free-model picture edits, face swap, and a short film cut. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const EN = {
    h: "Images",
    note: "Open a picture, or describe one. The photo tools run here. A new picture or a change uses the free image models. Face swap needs your face photo and the picture to change. Other AIs on this page see the picture and each one can send a picture back. The film desk cuts those pictures and clips into one 720p file, up to 30 seconds. It does not add a soundtrack.",
    empty: "No picture yet. Open one, or describe a new one.",
    bri: "Light", con: "Contrast", sat: "Colour",
    apply: "Apply look", sharp: "Sharpen", rot: "Rotate", flip: "Flip", crop: "Square crop", text: "Text", undo: "Undo", dl: "Download",
    size: "Save width",
    ph: "What should the picture become? A place, a style, or a change.",
    pick: "Open picture", face: "Face photo",
    go: "Make / change", swap: "Face swap", others: "Send to other AIs",
    neu: "New picture, ignore the open photo",
    film: "Film desk",
    filmNote: "Add the picture, a clip, or a title. Cut, fade, zoom, colour or grain. Export is one silent 720p file.",
    still: "Add this picture", clip: "Add a clip", titlePh: "Title card", addTitle: "Add title", play: "Play", exp: "Export film",
    use: "Use this", shot: "Add to film", save: "Save",
    working: "Working…",
    ready: "Picture ready.",
    faceReady: "Face photo ready. Open the picture to change, then Face swap.",
    need: "Write what to make, or open a picture.",
    needTwo: "Face swap needs the face photo and the picture to change.",
    none: "No picture came back. Try again.",
    limit: "The picture limit for today is used. The tools on the left still work.",
    editFail: "The photo could not be changed just now. The open picture is still here.",
    noModel: "No image model answered. Try again in a moment.",
    sent: "Sent to the other AIs.",
    back: " came back.",
    noAi: "The other AIs did not answer in time. One picture was still made from your line.",
    filmNeed: "Add at least one shot.",
    filmLong: "The cut is limited to 30 seconds.",
    filmNo: "This browser cannot record the film.",
    filmDone: "Film file ready.",
    playing: "Playing the cut…",
    exporting: "Recording the film…",
    shotStill: "Picture", shotClip: "Clip", shotTitle: "Title",
    vfxCut: "Cut", vfxFade: "Fade", vfxZoom: "Zoom", vfxGrade: "Colour", vfxGrain: "Grain"
  };
  const BN = {
    h: "ছবি ও ফিল্ম",
    note: "একটা ছবি খুলুন, বা কেমন ছবি চান লিখুন। ছবির টুল এখানেই চলে। নতুন ছবি বা বদল ফ্রি ইমেজ মডেলে হয়। ফেস সোয়াপে আপনার মুখের ছবি আর যে ছবি বদলাবে দুটোই লাগে। অন্য AI এই পাতায় ছবি দেখে, প্রত্যেকে একটা ছবি ফেরত পাঠাতে পারে। ফিল্ম ডেস্ক সেই ছবি আর ক্লিপ কেটে একটা ৭২০p ফাইল বানায়, সর্বোচ্চ ৩০ সেকেন্ড। তাতে শব্দ যোগ হয় না।",
    empty: "এখনও কোনো ছবি নেই। একটা খুলুন, বা নতুন একটার কথা লিখুন।",
    bri: "আলো", con: "কনট্রাস্ট", sat: "রং",
    apply: "লুক বসান", sharp: "ধারালো", rot: "ঘোরান", flip: "উল্টান", crop: "বর্গ কাটুন", text: "লেখা", undo: "আগের", dl: "নামান",
    size: "সেভের প্রস্থ",
    ph: "ছবিটা কী হবে? জায়গা, ধরন, বা কী বদলাবে।",
    pick: "ছবি খুলুন", face: "মুখের ছবি",
    go: "বানান / বদলান", swap: "ফেস সোয়াপ", others: "অন্য AI-কে পাঠান",
    neu: "নতুন ছবি, খোলা ছবি বাদ",
    film: "ফিল্ম ডেস্ক",
    filmNote: "এই ছবি, একটা ক্লিপ, বা টাইটেল যোগ করুন। কাট, ফেড, জুম, রং বা গ্রেইন। একটা নিঃশব্দ ৭২০p ফাইল।",
    still: "এই ছবি যোগ", clip: "ক্লিপ যোগ", titlePh: "টাইটেল কার্ড", addTitle: "টাইটেল যোগ", play: "চালান", exp: "ফিল্ম নামান",
    use: "এটা ব্যবহার", shot: "ফিল্মে যোগ", save: "সেভ",
    working: "হচ্ছে…",
    ready: "ছবি তৈরি।",
    faceReady: "মুখের ছবি আছে। যে ছবি বদলাবে সেটা খুলুন, তারপর ফেস সোয়াপ।",
    need: "কী বানাবেন লিখুন, বা একটা ছবি খুলুন।",
    needTwo: "ফেস সোয়াপে মুখের ছবি আর যে ছবি বদলাবে দুটোই লাগে।",
    none: "কোনো ছবি আসেনি। আবার চেষ্টা করুন।",
    limit: "আজকের ছবির সীমা শেষ। বাঁদের টুল চলবে।",
    editFail: "ছবিটা এখন বদলানো গেল না। খোলা ছবি আগের মতোই আছে।",
    noModel: "কোনো ইমেজ মডেল উত্তর দেয়নি। একটু পরে আবার চেষ্টা করুন।",
    sent: "অন্য AI-দের কাছে গেছে।",
    back: " ফিরেছে।",
    noAi: "অন্য AI সময়মতো উত্তর দেয়নি। আপনার লাইন থেকে একটা ছবি তবু বানানো হয়েছে।",
    filmNeed: "অন্তত একটা শট যোগ করুন।",
    filmLong: "কাট সর্বোচ্চ ৩০ সেকেন্ড।",
    filmNo: "এই ব্রাউজার ফিল্ম রেকর্ড করতে পারে না।",
    filmDone: "ফিল্ম ফাইল তৈরি।",
    playing: "কাট চলছে…",
    exporting: "ফিল্ম রেকর্ড হচ্ছে…",
    shotStill: "ছবি", shotClip: "ক্লিপ", shotTitle: "টাইটেল",
    vfxCut: "কাট", vfxFade: "ফেড", vfxZoom: "জুম", vfxGrade: "রং", vfxGrain: "গ্রেইন"
  };
  const L = () => ((window.settings && settings.lang === "bn") || document.documentElement.lang === "bn" ? BN : EN);
  const say = t => { const n = $("#st-status"); if (n) n.textContent = t || ""; };
  let base = null, face = null, hist = [], shots = [], busy = false, bound = false, run = 0;

  function clone(c) { const n = document.createElement("canvas"); n.width = c.width; n.height = c.height; n.getContext("2d").drawImage(c, 0, 0); return n; }
  function remember() { if (!base) return; hist.push(clone(base)); if (hist.length > 8) hist.shift(); }
  function painted() {
    const cv = $("#st-cv");
    if (!base) return null;
    cv.hidden = false;
    const empty = $("#st-empty"); if (empty) empty.hidden = true;
    cv.width = base.width; cv.height = base.height;
    const g = cv.getContext("2d");
    const b = +($("#st-bri") && $("#st-bri").value || 100);
    const c = +($("#st-con") && $("#st-con").value || 100);
    const s = +($("#st-sat") && $("#st-sat").value || 100);
    g.filter = "brightness(" + b + "%) contrast(" + c + "%) saturate(" + s + "%)";
    g.drawImage(base, 0, 0);
    g.filter = "none";
    return cv;
  }
  function resetSliders() { ["st-bri", "st-con", "st-sat"].forEach(id => { const n = $("#" + id); if (n) n.value = "100"; }); }
  async function canvasFromBlob(blob, max) {
    const bmp = await createImageBitmap(blob);
    const sc = Math.min(1, (max || 1600) / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * sc));
    c.height = Math.max(1, Math.round(bmp.height * sc));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close && bmp.close();
    return c;
  }
  async function setBase(blob) { remember(); base = await canvasFromBlob(blob, 1600); resetSliders(); painted(); }
  function jpegB64(canvas, max, q) {
    const sc = Math.min(1, (max || 1024) / Math.max(canvas.width, canvas.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(canvas.width * sc));
    c.height = Math.max(1, Math.round(canvas.height * sc));
    c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q || 0.86).split(",")[1];
  }
  function blobFromB64(mime, b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime || "image/png" });
  }
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  }
  function errText(code) {
    const t = L();
    if (code === "image_daily_limit" || code === "too_many_requests") return t.limit;
    if (code === "edit_failed" || code === "need_picture") return t.editFail;
    if (code === "need_two_pictures") return t.needTwo;
    if (code === "no_image_provider") return t.noModel;
    return t.none;
  }
  function ratioSize() {
    const v = ($("#st-ratio") && $("#st-ratio").value) || "square";
    if (v === "wide") return { w: 1280, h: 768 };
    if (v === "tall") return { w: 768, h: 1280 };
    return { w: 1024, h: 1024 };
  }
  async function studio(task, prompt, images) {
    const size = ratioSize();
    const r = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task, prompt, w: size.w, h: size.h, images: images || [] }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || "failed"); e.code = j.error || ""; throw e; }
    return j;
  }
  function addCard(mime, b64, caption) {
    const t = L();
    const box = $("#st-out"); if (!box) return;
    const card = document.createElement("article");
    card.className = "studio-card";
    const img = document.createElement("img");
    img.alt = "";
    img.src = "data:" + (mime || "image/png") + ";base64," + b64;
    const cap = document.createElement("p");
    cap.textContent = caption || "";
    const tools = document.createElement("div");
    tools.className = "tools";
    const use = document.createElement("button");
    use.className = "btn small"; use.type = "button"; use.textContent = t.use;
    use.addEventListener("click", async () => { await setBase(blobFromB64(mime, b64)); say(t.ready); });
    const shot = document.createElement("button");
    shot.className = "btn small"; shot.type = "button"; shot.textContent = t.shot;
    shot.addEventListener("click", async () => { const c = await canvasFromBlob(blobFromB64(mime, b64), 1280); addShot({ kind: "still", canvas: c, dur: 4, vfx: "zoom" }); });
    const save = document.createElement("button");
    save.className = "btn small"; save.type = "button"; save.textContent = t.save;
    save.addEventListener("click", () => download(blobFromB64(mime, b64), "biswas-image.png"));
    tools.append(use, shot, save);
    card.append(img, cap, tools);
    box.prepend(card);
  }
  function convolve() {
    if (!base) return;
    remember();
    const w = base.width, h = base.height;
    const sctx = base.getContext("2d", { willReadFrequently: true });
    const img = sctx.getImageData(0, 0, w, h);
    const out = sctx.createImageData(w, h);
    out.data.set(img.data);
    const d = img.data, o = out.data, k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) {
        const i = ((y + ky - 1) * w + (x + kx - 1)) * 4;
        const wgt = k[n++];
        r += d[i] * wgt; g += d[i + 1] * wgt; b += d[i + 2] * wgt;
      }
      const i = (y * w + x) * 4;
      o[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      o[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      o[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      o[i + 3] = d[i + 3];
    }
    sctx.putImageData(out, 0, 0);
    resetSliders(); painted();
  }
  function rotate() {
    if (!base) return;
    remember();
    const c = document.createElement("canvas");
    c.width = base.height; c.height = base.width;
    const g = c.getContext("2d");
    g.translate(c.width / 2, c.height / 2); g.rotate(Math.PI / 2); g.drawImage(base, -base.width / 2, -base.height / 2);
    base = c; painted();
  }
  function flip() {
    if (!base) return;
    remember();
    const c = clone(base); const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(base, 0, 0);
    base = c; painted();
  }
  function crop() {
    if (!base) return;
    remember();
    const side = Math.min(base.width, base.height);
    const c = document.createElement("canvas");
    c.width = side; c.height = side;
    c.getContext("2d").drawImage(base, (base.width - side) / 2, (base.height - side) / 2, side, side, 0, 0, side, side);
    base = c; painted();
  }
  function putText() {
    if (!base) return;
    const line = ($("#st-title") && $("#st-title").value.trim()) || window.prompt(L().text, "") || "";
    if (!line.trim()) return;
    remember();
    const g = base.getContext("2d");
    const size = Math.max(28, Math.round(base.width / 16));
    g.font = "700 " + size + "px Georgia, serif";
    g.textAlign = "center"; g.textBaseline = "bottom";
    g.lineWidth = Math.max(4, size / 8); g.strokeStyle = "rgba(0,0,0,.65)"; g.fillStyle = "#fff";
    const y = base.height - size;
    g.strokeText(line.slice(0, 80), base.width / 2, y);
    g.fillText(line.slice(0, 80), base.width / 2, y);
    painted();
  }
  function pics() {
    const images = [];
    const cv = painted();
    if (cv) images.push({ mime: "image/jpeg", data: jpegB64(cv, 1024, 0.86) });
    return images;
  }
  async function make(task) {
    if (busy) return;
    const t = L();
    const prompt = ($("#st-prompt") && $("#st-prompt").value || "").trim();
    const fresh = $("#st-new") && $("#st-new").checked;
    let job = task;
    const images = [];
    if (job === "swap") {
      if (!face || !base) { say(t.needTwo); return; }
      images.push({ mime: "image/jpeg", data: jpegB64(face, 1024, 0.86) });
      images.push(pics()[0]);
    } else if (base && !fresh) {
      job = "edit";
      images.push(pics()[0]);
      if (!prompt) { /* an edit with no line still improves the photo */ }
    } else {
      job = "make";
      if (prompt.length < 3) { say(t.need); return; }
    }
    busy = true; say(t.working);
    try {
      const j = await studio(job, prompt, images);
      if (!j || !j.b64) { say(t.none); return; }
      addCard(j.mime, j.b64, (j.provider || "") + (j.ms ? " · " + Math.round(j.ms / 100) / 10 + "s" : ""));
      await setBase(blobFromB64(j.mime, j.b64));
      say(t.ready);
    } catch (e) { say(errText(e && e.code)); }
    finally { busy = false; }
  }
  function promptOf(text) {
    const m = String(text || "").match(/PROMPT:\s*(.+)/i);
    const line = (m ? m[1] : String(text || "").split("\n").filter(Boolean).slice(-1)[0] || "").replace(/^["']|["']$/g, "").trim();
    return line.slice(0, 400);
  }
  async function others() {
    if (busy) return;
    const t = L();
    const prompt = ($("#st-prompt") && $("#st-prompt").value || "").trim();
    const images = pics();
    if (!images.length && prompt.length < 3) { say(t.need); return; }
    busy = true; say(t.sent);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        panel: true,
        maxOut: 900,
        system: "You are one free AI in an image studio. If a photograph is attached, look at it. Write what you see in a few lines, then one line that starts with PROMPT: followed by one English sentence a photo model can paint or edit. Do not refuse. Do not say you cannot see or cannot create an image.",
        messages: [{ role: "user", content: prompt || "Describe this picture and write a careful edit." }],
        images
      }) });
      const j = r.ok ? await r.json() : { answers: [] };
      const rows = (j.answers || []).filter(a => a && a.text && !a.error);
      const box = $("#st-out");
      const seen = new Set();
      const prompts = [];
      for (const a of rows) {
        if (box) {
          const p = document.createElement("p");
          p.textContent = (a.provider || "AI") + ": " + String(a.text).replace(/\s+/g, " ").trim().slice(0, 500);
          box.prepend(p);
        }
        const line = promptOf(a.text);
        const key = line.toLowerCase();
        if (line.length > 12 && !seen.has(key)) { seen.add(key); prompts.push({ who: a.provider || "AI", line }); }
      }
      const jobs = prompts.slice(0, 2);
      if (!jobs.length) {
        const j2 = await studio(images.length ? "edit" : "make", prompt || "A sharp realistic photograph", images);
        if (j2 && j2.b64) { addCard(j2.mime, j2.b64, t.noAi); await setBase(blobFromB64(j2.mime, j2.b64)); }
        say(t.noAi);
      } else {
        for (const job of jobs) {
          const made = await studio(images.length ? "edit" : "make", job.line, images);
          if (made && made.b64) addCard(made.mime, made.b64, job.who + t.back);
        }
        say(rows.length + t.back);
      }
    } catch (e) { say(errText(e && (e.code || e.message))); }
    finally { busy = false; }
  }
  function renderShots() {
    const t = L();
    const box = $("#st-shots"); if (!box) return;
    box.innerHTML = "";
    shots.forEach((s, i) => {
      const row = document.createElement("div");
      row.className = "studio-shot";
      const b = document.createElement("b");
      b.textContent = (i + 1) + ". " + (s.kind === "clip" ? t.shotClip : s.kind === "title" ? t.shotTitle : t.shotStill);
      const sel = document.createElement("select");
      [["cut", t.vfxCut], ["fade", t.vfxFade], ["zoom", t.vfxZoom], ["grade", t.vfxGrade], ["grain", t.vfxGrain]].forEach(([v, lab]) => {
        const o = document.createElement("option"); o.value = v; o.textContent = lab; if (s.vfx === v) o.selected = true; sel.append(o);
      });
      sel.addEventListener("change", () => { s.vfx = sel.value; });
      const dur = document.createElement("input");
      dur.type = "number"; dur.min = "1"; dur.max = "8"; dur.value = String(s.dur || 4); dur.style.width = "4rem";
      dur.addEventListener("change", () => { s.dur = Math.max(1, Math.min(8, Number(dur.value) || 4)); });
      const up = document.createElement("button"); up.type = "button"; up.className = "btn small"; up.textContent = "↑";
      up.addEventListener("click", () => { if (i < 1) return; const x = shots[i - 1]; shots[i - 1] = shots[i]; shots[i] = x; renderShots(); });
      const del = document.createElement("button"); del.type = "button"; del.className = "btn small"; del.textContent = "✕";
      del.addEventListener("click", () => { if (shots[i].url) URL.revokeObjectURL(shots[i].url); shots.splice(i, 1); renderShots(); });
      row.append(b, sel, dur, up, del);
      box.append(row);
    });
  }
  function addShot(s) {
    const sum = shots.reduce((n, x) => n + (Number(x.dur) || 4), 0);
    if (sum >= 30) { say(L().filmLong); return; }
    shots.push(s);
    renderShots();
  }
  function fitDraw(ctx, src, W, H, t, vfx) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
    if (!sw || !sh) return;
    const z = vfx === "zoom" ? 1 + 0.08 * t : 1;
    const scale = Math.max(W / sw, H / sh) * z;
    const dw = sw * scale, dh = sh * scale;
    ctx.save();
    if (vfx === "fade") ctx.globalAlpha = t < 0.18 ? t / 0.18 : t > 0.82 ? (1 - t) / 0.18 : 1;
    if (vfx === "grade") ctx.filter = "contrast(1.12) saturate(0.85)";
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.filter = "none";
    if (vfx === "grain") {
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 70; i++) { ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000"; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function drawTitle(ctx, W, H, text, t, vfx) {
    ctx.fillStyle = "#141414"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = vfx === "fade" ? Math.min(1, t * 2.2) : 1;
    ctx.fillStyle = "#f4f1ea"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "64px Georgia, serif";
    const words = String(text || "").split(/\s+/);
    const lines = []; let cur = "";
    for (const w of words) { const n = cur ? cur + " " + w : w; if (n.length > 22 && cur) { lines.push(cur); cur = w; } else cur = n; }
    if (cur) lines.push(cur);
    lines.slice(0, 4).forEach((line, i) => ctx.fillText(line, W / 2, H / 2 + (i - (lines.length - 1) / 2) * 76));
    ctx.restore();
  }
  async function playShot(ctx, shot, W, H) {
    const dur = Math.max(1, Math.min(8, Number(shot.dur) || 4)) * 1000;
    const t0 = performance.now();
    let video = null;
    if (shot.kind === "clip" && shot.url) {
      video = document.createElement("video");
      video.muted = true; video.playsInline = true; video.preload = "auto"; video.src = shot.url;
      await new Promise(res => {
        const done = () => res();
        video.addEventListener("loadeddata", done, { once: true });
        video.addEventListener("error", done, { once: true });
        setTimeout(done, 5000);
      });
      try { await video.play(); } catch (e) { if (!video.videoWidth) video = null; }
    }
    while (performance.now() - t0 < dur) {
      const t = (performance.now() - t0) / dur;
      if (shot.kind === "title") drawTitle(ctx, W, H, shot.text, t, shot.vfx);
      else if (video) fitDraw(ctx, video, W, H, t, shot.vfx);
      else if (shot.canvas) fitDraw(ctx, shot.canvas, W, H, t, shot.vfx);
      await new Promise(r => requestAnimationFrame(r));
    }
    if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
  }
  async function runFilm(record) {
    const t = L();
    if (!shots.length) { say(t.filmNeed); return; }
    const mine = ++run;
    const W = 1280, H = 720;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    let rec = null, chunks = [];
    if (record) {
      if (!c.captureStream || typeof MediaRecorder === "undefined") { say(t.filmNo); return; }
      const stream = c.captureStream(24);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(200);
    }
    say(record ? t.exporting : t.playing);
    let used = 0;
    for (const shot of shots) {
      if (mine !== run) break;
      if (used >= 30) { say(t.filmLong); break; }
      const dur = Math.max(1, Math.min(8, Number(shot.dur) || 4));
      shot.dur = Math.min(dur, 30 - used);
      used += shot.dur;
      await playShot(ctx, shot, W, H);
    }
    if (rec) {
      const stopped = new Promise(r => { rec.onstop = r; });
      rec.stop();
      await stopped;
      if (mine === run && chunks.length) {
        download(new Blob(chunks, { type: "video/webm" }), "biswas-film.webm");
        const prev = $("#st-preview");
        if (prev) { prev.hidden = false; prev.src = URL.createObjectURL(new Blob(chunks, { type: "video/webm" })); }
        say(t.filmDone);
      }
    } else if (mine === run) say("");
  }
  function relabel() {
    const t = L();
    const set = (id, text) => { const n = $("#" + id); if (n) n.textContent = text; };
    set("st-h", t.h); const note = $("#st-note"); if (note) note.textContent = t.note;
    const empty = $("#st-empty"); if (empty && !base) empty.textContent = t.empty;
    set("st-l-bri", t.bri); set("st-l-con", t.con); set("st-l-sat", t.sat);
    set("st-apply", t.apply); set("st-sharp", t.sharp); set("st-rot", t.rot); set("st-flip", t.flip);
    set("st-crop", t.crop); set("st-text", t.text); set("st-undo", t.undo); set("st-dl", t.dl); set("st-l-size", t.size);
    const ph = $("#st-prompt"); if (ph) ph.placeholder = t.ph;
    set("st-pick", t.pick); set("st-face-btn", t.face); set("st-go", t.go); set("st-swap", t.swap); set("st-others", t.others);
    const neu = $("#st-new-lab span"); if (neu) neu.textContent = t.neu;
    set("st-film-h", t.film); const fn = $("#st-film-note"); if (fn) fn.textContent = t.filmNote;
    set("st-add-still", t.still); set("st-add-clip", t.clip); set("st-add-title", t.addTitle); set("st-play", t.play); set("st-export", t.exp);
    const title = $("#st-title"); if (title) title.placeholder = t.titlePh;
    renderShots();
  }
  function bind() {
    if (bound) return; bound = true;
    const on = (id, fn) => { const n = $("#" + id); if (n) n.addEventListener(fn.type || "click", fn.fn || fn); };
    ["st-bri", "st-con", "st-sat"].forEach(id => { const n = $("#" + id); if (n) n.addEventListener("input", () => painted()); });
    on("st-apply", () => { if (!base) return; const cv = painted(); if (!cv) return; remember(); base = clone(cv); resetSliders(); painted(); });
    on("st-sharp", convolve);
    on("st-rot", rotate);
    on("st-flip", flip);
    on("st-crop", crop);
    on("st-text", putText);
    on("st-undo", () => { const prev = hist.pop(); if (!prev) return; base = prev; resetSliders(); painted(); });
    on("st-dl", () => {
      const cv = painted(); if (!cv) return;
      const want = +($("#st-savew") && $("#st-savew").value || 0);
      let out = cv;
      if (want > cv.width) {
        out = document.createElement("canvas");
        out.width = want; out.height = Math.round(cv.height * (want / cv.width));
        const g = out.getContext("2d"); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(cv, 0, 0, out.width, out.height);
      }
      out.toBlob(b => { if (b) download(b, "biswas-image.png"); }, "image/png");
    });
    on("st-pick", () => $("#st-file").click());
    on("st-face-btn", () => $("#st-face").click());
    const file = $("#st-file");
    if (file) file.addEventListener("change", async () => { const f = file.files && file.files[0]; file.value = ""; if (f) { await setBase(f); say(L().ready); } });
    const faceIn = $("#st-face");
    if (faceIn) faceIn.addEventListener("change", async () => { const f = faceIn.files && faceIn.files[0]; faceIn.value = ""; if (f) { face = await canvasFromBlob(f, 1280); say(L().faceReady); } });
    const form = $("#st-form");
    if (form) form.addEventListener("submit", e => { e.preventDefault(); make("auto"); });
    on("st-swap", () => make("swap"));
    on("st-others", () => others());
    on("st-add-still", () => { const cv = painted(); if (!cv) { say(L().need); return; } addShot({ kind: "still", canvas: clone(cv), dur: 4, vfx: "zoom" }); });
    on("st-add-clip", () => $("#st-vid").click());
    const vid = $("#st-vid");
    if (vid) vid.addEventListener("change", () => {
      const f = vid.files && vid.files[0]; vid.value = "";
      if (!f) return;
      addShot({ kind: "clip", url: URL.createObjectURL(f), dur: 4, vfx: "cut" });
    });
    on("st-add-title", () => { const text = ($("#st-title") && $("#st-title").value || "").trim(); if (!text) return; addShot({ kind: "title", text, dur: 3, vfx: "fade" }); });
    on("st-play", () => runFilm(false));
    on("st-export", () => runFilm(true));
    const neu = document.createElement("label");
    neu.id = "st-new-lab";
    neu.innerHTML = "<input type=\"checkbox\" id=\"st-new\"> <span></span>";
    const tools = $("#st-go") && $("#st-go").parentElement;
    if (tools) tools.append(neu);
  }
  function open() { bind(); relabel(); if (base) painted(); }
  window.BA_STUDIO = { open, relabel };
})();
