/* Images chat: attach a picture, say enhance / hero / video, get the file back. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const EN = {
    h: "Images",
    note: "Attach a picture and say what you want. Enhance, change background (type the new place), make it hero, cinematic VFX, restore, remove background, poster, or create a video. Free models do their best — results vary. Download the result — this chat is not kept after a reload.",
    empty: "Open Adjust to change light, crop and text on the latest picture.",
    ph: "Enhance, change background to beach, make it hero, restore…",
    chips: [["enhance", "Enhance"], ["hero", "Make it hero"], ["bg", "Change background"], ["isolate", "Remove background"], ["vfx", "Cinematic VFX"], ["restore", "Restore"], ["poster", "Poster"], ["video", "Create a video"], ["fresh", "New picture"]],
    more: "Adjust, crop, film desk",
    bri: "Light", con: "Contrast", sat: "Colour",
    apply: "Apply look", sharp: "Sharpen", rot: "Rotate", flip: "Flip", crop: "Square crop", text: "Text", undo: "Undo", dl: "Download",
    size: "Save width",
    face: "Face",
    still: "Add this picture", clip: "Add a clip", titlePh: "Title card", addTitle: "Add title", play: "Play", exp: "Export film",
    others: "Ask other AIs", swap: "Face swap",
    use: "Use this picture", save: "Download",
    working: "Working on it…",
    recording: "Recording the video…",
    ready: "Done.",
    need: "Attach a picture, or describe a new one.",
    needTwo: "Face swap needs a face photo and the picture to change.",
    none: "No picture came back. Try again.",
    badPicture: "That picture could not be read. Try a JPG.",
    limit: "The picture limit for today is used.",
    editFail: "The image model did not change the photo. Your picture is still attached.",
    noModel: "No image model answered. Try again in a moment.",
    sent: "Asking the other AIs…",
    back: " came back.",
    noAi: "The other AIs did not answer in time. One picture was still made from your line.",
    filmNeed: "Add at least one shot.",
    filmLong: "The cut is limited to 30 seconds.",
    filmNo: "This browser cannot record the video.",
    filmDone: "Video file ready.",
    playing: "Playing the cut…",
    exporting: "Recording the film…",
    shotStill: "Picture", shotClip: "Clip", shotTitle: "Title",
    vfxCut: "Cut", vfxFade: "Fade", vfxZoom: "Zoom", vfxGrade: "Colour", vfxGrain: "Grain",
    freshNote: "Describe the new picture. The attached photo is ignored this once.",
    videoNote: "A short silent clip. If a video model is not available, this is a camera move between the pictures the image model returned.",
    localNote: "The image model did not answer. This is a clearer copy made on the phone, not a new generated photo.",
    via: "Made with "
  };
  const BN = {
    h: "ছবি ও ফিল্ম",
    note: "একটা ছবি যোগ করে বলুন কী চান। স্পষ্ট, হিরো, বা ভিডিও। উত্তর এই চ্যাটে আসবে। নামিয়ে রাখুন — রিলোডের পর এই চ্যাট থাকে না।",
    empty: "আলো, কাট আর লেখা বদলাতে অ্যাডজাস্ট খুলুন।",
    ph: "স্পষ্ট করো, হিরো বানাও, ভিডিও বানাও…",
    chips: [["enhance", "স্পষ্ট করো"], ["hero", "হিরো বানাও"], ["bg", "ব্যাকগ্রাউন্ড বদলাও"], ["isolate", "ব্যাকগ্রাউন্ড সরান"], ["vfx", "সিনেমাটিক VFX"], ["restore", "রিস্টোর"], ["poster", "পোস্টার"], ["video", "ভিডিও বানাও"], ["fresh", "নতুন ছবি"]],
    more: "অ্যাডজাস্ট, কাট, ফিল্ম ডেস্ক",
    bri: "আলো", con: "কনট্রাস্ট", sat: "রং",
    apply: "লুক বসান", sharp: "ধারালো", rot: "ঘোরান", flip: "উল্টান", crop: "বর্গ কাটুন", text: "লেখা", undo: "আগের", dl: "নামান",
    size: "সেভের প্রস্থ",
    face: "মুখ",
    still: "এই ছবি যোগ", clip: "ক্লিপ যোগ", titlePh: "টাইটেল কার্ড", addTitle: "টাইটেল যোগ", play: "চালান", exp: "ফিল্ম নামান",
    others: "অন্য AI-কে জিজ্ঞেস", swap: "ফেস সোয়াপ",
    use: "এই ছবি ব্যবহার", save: "নামান",
    working: "হচ্ছে…",
    recording: "ভিডিও রেকর্ড হচ্ছে…",
    ready: "হয়ে গেছে।",
    need: "একটা ছবি যোগ করুন, বা নতুন একটার কথা লিখুন।",
    needTwo: "ফেস সোয়াপে মুখের ছবি আর যে ছবি বদলাবে দুটোই লাগে।",
    none: "কোনো ছবি আসেনি। আবার চেষ্টা করুন।",
    badPicture: "এই ছবি পড়া যায়নি। একটা JPG দিন।",
    limit: "আজকের ছবির সীমা শেষ।",
    editFail: "ইমেজ মডেল ছবি বদলাতে পারেনি। আপনার ছবি আগের মতোই আছে।",
    noModel: "কোনো ইমেজ মডেল উত্তর দেয়নি। একটু পরে আবার চেষ্টা করুন।",
    sent: "অন্য AI-দের জিজ্ঞেস করা হচ্ছে…",
    back: " ফিরেছে।",
    noAi: "অন্য AI সময়মতো উত্তর দেয়নি। আপনার লাইন থেকে একটা ছবি তবু বানানো হয়েছে।",
    filmNeed: "অন্তত একটা শট যোগ করুন।",
    filmLong: "কাট সর্বোচ্চ ৩০ সেকেন্ড।",
    filmNo: "এই ব্রাউজার ভিডিও রেকর্ড করতে পারে না।",
    filmDone: "ভিডিও ফাইল তৈরি।",
    playing: "কাট চলছে…",
    exporting: "ফিল্ম রেকর্ড হচ্ছে…",
    shotStill: "ছবি", shotClip: "ক্লিপ", shotTitle: "টাইটেল",
    vfxCut: "কাট", vfxFade: "ফেড", vfxZoom: "জুম", vfxGrade: "রং", vfxGrain: "গ্রেইন",
    freshNote: "নতুন ছবির কথা লিখুন। এই একবার যোগ করা ছবি বাদ যাবে।",
    videoNote: "একটা ছোট নিঃশব্দ ক্লিপ। ভিডিও মডেল না থাকলে এটা ইমেজ মডেলের ছবির ওপর ক্যামেরা চলা।",
    localNote: "ইমেজ মডেল উত্তর দেয়নি। এটা ফোনে বানানো একটা স্পষ্ট কপি, নতুন জেনারেট করা ছবি নয়।",
    via: "বানিয়েছে "
  };
  const L = () => ((window.settings && settings.lang === "bn") || document.documentElement.lang === "bn" ? BN : EN);
  const say = t => { const n = $("#st-status"); if (n) n.textContent = t || ""; };
  let base = null, hist = [], shots = [], busy = false, bound = false, run = 0;
  let thread = [], photo = null, face = null, fresh = false;

  function clone(c) { const n = document.createElement("canvas"); n.width = c.width; n.height = c.height; n.getContext("2d").drawImage(c, 0, 0); return n; }
  function remember() { if (!base) return; hist.push(clone(base)); if (hist.length > 8) hist.shift(); }
  function painted() {
    const cv = $("#st-cv");
    if (!base || !cv) return null;
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
    const sc = Math.min(1, (max || 1280) / Math.max(bmp.width, bmp.height));
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
    return { data: c.toDataURL("image/jpeg", q || 0.92).split(",")[1], w: c.width, h: c.height };
  }
  function blobToB64(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(new Error("read")); r.readAsDataURL(blob); });
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
  function errText(e) {
    const t = L();
    const code = String((e && (e.code || e.message)) || "");
    let msg = t.none;
    if (code === "image_daily_limit" || code === "too_many_requests") msg = t.limit;
    else if (code === "need_two_pictures") msg = t.needTwo;
    else if (code === "edit_failed" || code === "need_picture") msg = t.editFail;
    else if (code === "no_image_provider") msg = t.noModel;
    else if (code === "bad_picture") msg = t.badPicture;
    else if (code === "too_large" || code === "http_413") msg = t.none;
    const d = String((e && e.detail) || "").replace(/\s+/g, " ").trim().slice(0, 120);
    return d && d !== msg ? msg + " (" + d + ")" : msg;
  }
  function sizeOf(w, h) {
    if (!w || !h) return { w: 1024, h: 1024 };
    const a = w / h;
    if (a > 1.2) return { w: 1280, h: 768 };
    if (a < 0.84) return { w: 768, h: 1280 };
    return { w: 1024, h: 1024 };
  }
  async function payloadOf(blob, small) {
    const max = small ? 640 : 1024;
    let bmp;
    try { bmp = await createImageBitmap(blob); }
    catch (e) {
      bmp = await new Promise((res, rej) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); res(img); };
        img.onerror = () => { URL.revokeObjectURL(url); const err = new Error("bad_picture"); err.code = "bad_picture"; rej(err); };
        img.src = url;
      });
    }
    const sw = bmp.naturalWidth || bmp.width, sh = bmp.naturalHeight || bmp.height;
    const sc = Math.min(1, max / Math.max(sw, sh, 1));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw * sc));
    c.height = Math.max(1, Math.round(sh * sc));
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close && bmp.close();
    const data = c.toDataURL("image/jpeg", 0.86).split(",")[1];
    if (!data || data.length < 80) { const err = new Error("bad_picture"); err.code = "bad_picture"; throw err; }
    const size = sizeOf(c.width, c.height);
    return { mime: "image/jpeg", data, w: size.w, h: size.h };
  }
  async function studio(body) {
    const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(120000) : undefined;
    const r = await fetch("/api/studio", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (r.ok && /^image\//.test(ct)) {
      const blob = await r.blob();
      if (!blob || !blob.size) { const e = new Error("no_image"); e.code = "no_image"; throw e; }
      return { blob, mime: ct.split(";")[0], provider: r.headers.get("x-provider") || "", ms: Number(r.headers.get("x-ms") || 0), video: r.headers.get("x-video") === "1" };
    }
    const j = await r.json().catch(() => ({}));
    if (r.ok && j && j.b64) return { blob: blobFromB64(j.mime, j.b64), mime: j.mime, provider: j.provider || "", ms: j.ms || 0, video: !!j.video, extra: j.extra };
    const e = new Error(j.error || ("http_" + r.status));
    e.code = j.error || ("http_" + r.status);
    e.detail = j.detail || "";
    throw e;
  }
  function scrollThread() { const s = $("#st-scroll"); if (s) s.scrollTop = s.scrollHeight; }
  function renderThread() {
    const box = $("#st-thread"); if (!box) return;
    const t = L();
    box.innerHTML = "";
    if (!thread.length) {
      const w = document.createElement("div");
      w.className = "welcome";
      const h = document.createElement("h2"); h.textContent = t.h;
      const p = document.createElement("p"); p.textContent = t.note;
      w.append(h, p); box.append(w); return;
    }
    for (const m of thread) {
      const row = document.createElement("div");
      row.className = "msg " + (m.role === "user" ? "user" : "ai");
      if (m.role === "user") {
        const b = document.createElement("div"); b.className = "bubble"; b.textContent = m.text || "";
        row.append(b);
        if (m.url) { const img = document.createElement("img"); img.className = "st-pic"; img.alt = ""; img.src = m.url; row.append(img); }
      } else if (m.videoUrl) {
        const v = document.createElement("video"); v.className = "st-pic"; v.controls = true; v.playsInline = true; v.src = m.videoUrl;
        const cap = document.createElement("p"); cap.className = "via"; cap.textContent = m.text || t.videoNote;
        const tools = document.createElement("div"); tools.className = "actions";
        const save = document.createElement("button"); save.type = "button"; save.className = "btn small"; save.textContent = t.save;
        save.addEventListener("click", () => m.videoBlob && download(m.videoBlob, "biswas-film.webm"));
        tools.append(save); row.append(v, cap, tools);
      } else if (m.url) {
        const img = document.createElement("img"); img.className = "st-pic"; img.alt = ""; img.src = m.url;
        const cap = document.createElement("p"); cap.className = "via"; cap.textContent = m.text || "";
        const tools = document.createElement("div"); tools.className = "actions";
        const use = document.createElement("button"); use.type = "button"; use.className = "btn small"; use.textContent = t.use;
        use.addEventListener("click", () => { if (!m.blob) return; if (photo && photo.url) URL.revokeObjectURL(photo.url); photo = { blob: m.blob, url: URL.createObjectURL(m.blob), name: "result" }; fresh = false; pending(); say(t.ready); });
        const save = document.createElement("button"); save.type = "button"; save.className = "btn small"; save.textContent = t.save;
        save.addEventListener("click", () => m.blob && download(m.blob, "biswas-image.jpg"));
        tools.append(use, save); row.append(img, cap, tools);
      } else {
        const b = document.createElement("div"); b.className = "bubble"; b.textContent = m.text || "";
        row.append(b);
      }
      box.append(row);
    }
    scrollThread();
  }
  function pending() {
    const box = $("#st-pending"); if (!box) return;
    box.innerHTML = "";
    const add = (item, kind) => {
      if (!item) return;
      const wrap = document.createElement("span"); wrap.className = "file";
      const img = document.createElement("img"); img.className = "st-pic"; img.alt = ""; img.src = item.url; img.style.width = "48px"; img.style.height = "48px"; img.style.objectFit = "cover";
      const x = document.createElement("button"); x.type = "button"; x.textContent = "✕";
      x.addEventListener("click", () => {
        URL.revokeObjectURL(item.url);
        if (kind === "face") face = null; else photo = null;
        pending();
      });
      wrap.append(img, x); box.append(wrap);
    };
    add(photo, "photo"); add(face, "face");
  }
  function intent(text) {
    const low = String(text || "").toLowerCase();
    if (/\b(video|movie|film|animate|clip|reel)\b/.test(low) || /ভিডিও|মুভি|ফিল্ম/.test(text)) return "video";
    if (/\b(swap|face\s*swap)\b/.test(low) || /ফেস|মুখ/.test(text)) return "swap";
    if (/\b(remove\s+background|transparent|isolate|cutout|no\s+background)\b/.test(low) || /ব্যাকগ্রাউন্ড\s*সরান/.test(text)) return "isolate";
    if (/\b(background|bg|backdrop)\b/.test(low) && /\b(change|replace|remove|new)\b/.test(low) || /ব্যাকগ্রাউন্ড|পটভূমি/.test(text)) return "bg";
    if (/\b(vfx|cinematic\s*vfx|dramatic\s*lighting|hollywood)\b/.test(low) || /সিনেমাটিক/.test(text)) return "vfx";
    if (/\b(poster|movie\s*poster|title\s*card)\b/.test(low) || /পোস্টার/.test(text)) return "poster";
    if (/\b(hero|cinematic|poster|epic)\b/.test(low) || /হিরো/.test(text)) return "hero";
    if (/\b(enhance|sharper|sharpen|hd|upscale|clearer|improve|quality|restore|retouch)\b/.test(low) || /স্পষ্ট|উন্নত|রিস্টোর/.test(text)) return "enhance";
    return "";
  }
  async function localClearer(blob) {
    const c = await canvasFromBlob(blob, 1600);
    const g = c.getContext("2d");
    g.filter = "contrast(1.08) saturate(1.06)";
    const copy = clone(c);
    g.filter = "none";
    g.drawImage(copy, 0, 0);
    const out = await new Promise(res => c.toBlob(res, "image/jpeg", 0.92));
    return out;
  }
  function fitDraw(ctx, src, W, H, t, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
    if (!sw || !sh) { ctx.restore(); return; }
    const z = 1 + 0.08 * t;
    const scale = Math.max(W / sw, H / sh) * z;
    const dw = sw * scale, dh = sh * scale;
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.restore();
  }
  async function clipFrom(blobs) {
    const canvases = [];
    for (const b of blobs) { if (b) canvases.push(await canvasFromBlob(b, 1280)); }
    if (!canvases.length) return null;
    const portrait = canvases[0].height >= canvases[0].width;
    const W = portrait ? 720 : 1280, H = portrait ? 1280 : 720;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    if (!c.captureStream || typeof MediaRecorder === "undefined") return null;
    let mime = "video/webm";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) mime = "video/webm;codecs=vp9";
    const rec = new MediaRecorder(c.captureStream(24), { mimeType: mime });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(r => { rec.onstop = r; });
    rec.start(200);
    const dur = 6000, t0 = performance.now();
    while (performance.now() - t0 < dur) {
      const t = (performance.now() - t0) / dur;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      if (canvases.length > 1) {
        fitDraw(ctx, canvases[0], W, H, t, t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45);
        fitDraw(ctx, canvases[1], W, H, t, t < 0.35 ? 0 : Math.min(1, (t - 0.35) / 0.4));
      } else fitDraw(ctx, canvases[0], W, H, t, 1);
      await new Promise(r => requestAnimationFrame(r));
    }
    rec.stop();
    await stopped;
    return chunks.length ? new Blob(chunks, { type: "video/webm" }) : null;
  }
  async function pushPicture(j, caption) {
    const blob = j.blob || blobFromB64(j.mime, j.b64);
    const url = URL.createObjectURL(blob);
    thread.push({ role: "ai", url, blob, text: caption });
    renderThread();
    try { await setBase(blob); } catch (e) { /* adjust drawer can stay empty */ }
    return blob;
  }
  async function send(text, flags) {
    if (busy) return;
    const t = L();
    const line = String(text || "").trim();
    const kind = (flags && flags.kind) || intent(line);
    const ignore = fresh || (flags && flags.fresh);
    fresh = false;
    const usePhoto = photo && !ignore;
    if (!usePhoto && line.length < 3 && kind !== "enhance") { say(t.need); return; }
    if ((kind === "enhance" || kind === "hero" || kind === "video" || kind === "swap" || kind === "bg" || kind === "restore" || kind === "isolate" || kind === "vfx" || kind === "poster") && !usePhoto && !(face && photo)) {
      thread.push({ role: "user", text: line || kind });
      thread.push({ role: "ai", text: t.need });
      renderThread(); return;
    }
    if (kind === "swap" && (!face || !photo)) {
      thread.push({ role: "ai", text: t.needTwo }); renderThread(); return;
    }
    busy = true;
    const thumb = usePhoto ? URL.createObjectURL(photo.blob) : "";
    thread.push({ role: "user", text: line || kind, url: thumb });
    thread.push({ role: "ai", text: t.working });
    renderThread();
    const hold = thread[thread.length - 1];
    try {
      let images = [];
      let size = { w: 1024, h: 1024 };
      if (kind === "swap") {
        const a = await payloadOf(face.blob, false);
        const b = await payloadOf(photo.blob, false);
        images = [{ mime: a.mime, data: a.data }, { mime: b.mime, data: b.data }];
        size = { w: b.w, h: b.h };
      } else if (usePhoto) {
        const a = await payloadOf(photo.blob, false);
        images = [{ mime: a.mime, data: a.data }];
        size = { w: a.w, h: a.h };
      }
      let prompt = line || kind;
      if (kind === "bg" && (!line || /^(change\s+background|ব্যাকগ্রাউন্ড\s*বদলাও|bg)$/i.test(line.trim()))) {
        prompt = "change background to a clean modern studio backdrop, keep the people exactly the same";
      }
      if (kind === "isolate") {
        prompt = (line && !/remove\s+background|isolate|ব্যাকগ্রাউন্ড\s*সরান/i.test(line) ? line + ". " : "") + "remove background, isolate the subjects on pure white";
      }
      if (kind === "vfx") {
        prompt = (line || "cinematic VFX") + ". Add dramatic cinematic lighting, depth, subtle atmospheric effects, professional colour grade. Keep the people recognisable.";
      }
      if (kind === "poster") {
        prompt = (line || "movie poster") + ". Turn into a high-end poster with clear readable text if requested. Cinematic, sharp.";
      }
      const body = { task: kind === "swap" ? "swap" : images.length ? "edit" : "make", prompt, video: kind === "video", images, w: size.w, h: size.h };
      let j;
      try { j = await studio(body); }
      catch (e) {
        if (images.length && /klein 400|512|dimension|too large|payload|bad_picture|edit_failed/i.test(String((e && (e.detail || e.code)) || ""))) {
          const again = [];
          if (kind === "swap") {
            const a = await payloadOf(face.blob, true), b = await payloadOf(photo.blob, true);
            again.push({ mime: a.mime, data: a.data }, { mime: b.mime, data: b.data });
          } else {
            const a = await payloadOf(photo.blob, true);
            again.push({ mime: a.mime, data: a.data });
          }
          j = await studio({ ...body, images: again });
        } else throw e;
      }
      if (!j || !j.blob) { const e = new Error("no_image"); e.code = "no_image"; throw e; }
      const who = (t.via || "") + (j.provider || "image");
      thread.pop();
      const mainBlob = await pushPicture(j, who);
      let startBlob = null;
      if (j.extra && j.extra.b64) startBlob = blobFromB64(j.extra.mime, j.extra.b64);
      if (kind === "video") {
        thread.push({ role: "ai", text: t.recording }); renderThread();
        const vid = await clipFrom([startBlob || mainBlob, startBlob ? mainBlob : null].filter(Boolean));
        thread.pop();
        if (!vid) thread.push({ role: "ai", text: t.filmNo });
        else thread.push({ role: "ai", videoUrl: URL.createObjectURL(vid), videoBlob: vid, text: t.videoNote });
        renderThread();
      }
      say(t.ready);
    } catch (e) {
      if (thread.indexOf(hold) >= 0) hold.text = errText(e);
      else thread.push({ role: "ai", text: errText(e) });
      if (usePhoto && (kind === "enhance" || kind === "hero")) {
        try {
          const clearer = await localClearer(photo.blob);
          if (clearer) {
            const url = URL.createObjectURL(clearer);
            thread.push({ role: "ai", url, blob: clearer, text: L().localNote });
          }
        } catch (err) { /* keep the error line */ }
      }
      if (kind === "video" && usePhoto) {
        try {
          const vid = await clipFrom([photo.blob]);
          if (vid) thread.push({ role: "ai", videoUrl: URL.createObjectURL(vid), videoBlob: vid, text: L().videoNote });
        } catch (err) { /* no clip */ }
      }
      renderThread();
    } finally { busy = false; }
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
    const images = [];
    if (photo) { const a = await payloadOf(photo.blob, false); images.push({ mime: a.mime, data: a.data }); }
    if (!images.length && prompt.length < 3) { say(t.need); return; }
    busy = true; say(t.sent);
    thread.push({ role: "user", text: prompt || "Ask the other AIs", url: photo ? photo.url : "" });
    renderThread();
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        panel: true, maxOut: 900,
        system: "You are one free AI in an image studio. If a photograph is attached, look at it. Write what you see in a few lines, then one line that starts with PROMPT: followed by one English sentence a photo model can paint or edit. Do not refuse.",
        messages: [{ role: "user", content: prompt || "Describe this picture and write a careful edit." }],
        images
      }) });
      const j = r.ok ? await r.json() : { answers: [] };
      const rows = (j.answers || []).filter(a => a && a.text && !a.error);
      const seen = new Set(); const prompts = [];
      for (const a of rows) {
        thread.push({ role: "ai", text: (a.provider || "AI") + ": " + String(a.text).replace(/\s+/g, " ").trim().slice(0, 500) });
        const line = promptOf(a.text);
        const key = line.toLowerCase();
        if (line.length > 12 && !seen.has(key)) { seen.add(key); prompts.push({ who: a.provider || "AI", line }); }
      }
      renderThread();
      const jobs = prompts.slice(0, 2);
      if (!jobs.length) {
        const j2 = await studio({ task: images.length ? "edit" : "make", prompt: prompt || "A sharp realistic photograph", images, w: 1024, h: 1024 });
        if (j2 && j2.b64) await pushPicture(j2, t.noAi);
      } else {
        for (const job of jobs) {
          const made = await studio({ task: images.length ? "edit" : "make", prompt: job.line, images, w: 1024, h: 1024 });
          if (made && made.b64) await pushPicture(made, job.who + t.back);
        }
      }
    } catch (e) { thread.push({ role: "ai", text: errText(e) }); renderThread(); }
    finally { busy = false; }
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
        const i = ((y + ky - 1) * w + (x + kx - 1)) * 4, wgt = k[n++];
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
    if (!base) return; remember();
    const c = document.createElement("canvas");
    c.width = base.height; c.height = base.width;
    const g = c.getContext("2d");
    g.translate(c.width / 2, c.height / 2); g.rotate(Math.PI / 2); g.drawImage(base, -base.width / 2, -base.height / 2);
    base = c; painted();
  }
  function flip() {
    if (!base) return; remember();
    const c = clone(base); const g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(base, 0, 0);
    base = c; painted();
  }
  function crop() {
    if (!base) return; remember();
    const side = Math.min(base.width, base.height);
    const c = document.createElement("canvas"); c.width = side; c.height = side;
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
  function renderShots() {
    const t = L();
    const box = $("#st-shots"); if (!box) return;
    box.innerHTML = "";
    shots.forEach((s, i) => {
      const row = document.createElement("div"); row.className = "studio-shot";
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
      const del = document.createElement("button"); del.type = "button"; del.className = "btn small"; del.textContent = "✕";
      del.addEventListener("click", () => { if (shots[i].url) URL.revokeObjectURL(shots[i].url); shots.splice(i, 1); renderShots(); });
      row.append(b, sel, dur, del); box.append(row);
    });
  }
  function addShot(s) {
    const sum = shots.reduce((n, x) => n + (Number(x.dur) || 4), 0);
    if (sum >= 30) { say(L().filmLong); return; }
    shots.push(s); renderShots();
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
        video.addEventListener("loadeddata", res, { once: true });
        video.addEventListener("error", res, { once: true });
        setTimeout(res, 4000);
      });
      try { await video.play(); } catch (e) { if (!(video.videoWidth || video.width)) video = null; }
    }
    while (performance.now() - t0 < dur) {
      const t = (performance.now() - t0) / dur;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      if (shot.kind === "title") drawTitle(ctx, W, H, shot.text, t, shot.vfx);
      else if (video && (video.videoWidth || video.width)) fitDraw(ctx, video, W, H, t);
      else if (shot.canvas) fitDraw(ctx, shot.canvas, W, H, t);
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
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
      rec = new MediaRecorder(c.captureStream(24), { mimeType: mime });
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.start(200);
    }
    say(record ? t.exporting : t.playing);
    let used = 0;
    for (const shot of shots) {
      if (mine !== run) break;
      if (used >= 30) { say(t.filmLong); break; }
      const dur = Math.max(1, Math.min(8, Number(shot.dur) || 4));
      shot.dur = Math.min(dur, 30 - used); used += shot.dur;
      await playShot(ctx, shot, W, H);
    }
    if (rec) {
      const stopped = new Promise(r => { rec.onstop = r; });
      rec.stop(); await stopped;
      if (mine === run && chunks.length) {
        const blob = new Blob(chunks, { type: "video/webm" });
        download(blob, "biswas-film.webm");
        thread.push({ role: "ai", videoUrl: URL.createObjectURL(blob), videoBlob: blob, text: t.filmDone });
        renderThread();
        say(t.filmDone);
      }
    } else if (mine === run) say("");
  }
  function relabel() {
    const t = L();
    const set = (id, text) => { const n = $("#" + id); if (n) n.textContent = text; };
    const empty = $("#st-empty"); if (empty && !base) empty.textContent = t.empty;
    set("st-l-bri", t.bri); set("st-l-con", t.con); set("st-l-sat", t.sat);
    set("st-apply", t.apply); set("st-sharp", t.sharp); set("st-rot", t.rot); set("st-flip", t.flip);
    set("st-crop", t.crop); set("st-text", t.text); set("st-undo", t.undo); set("st-dl", t.dl); set("st-l-size", t.size);
    const ph = $("#st-prompt"); if (ph) ph.placeholder = t.ph;
    const faceBtn = $("#st-face-btn"); if (faceBtn) faceBtn.textContent = t.face;
    set("st-more-sum", t.more);
    set("st-add-still", t.still); set("st-add-clip", t.clip); set("st-add-title", t.addTitle); set("st-play", t.play); set("st-export", t.exp);
    set("st-others", t.others); set("st-swap", t.swap);
    const title = $("#st-title"); if (title) title.placeholder = t.titlePh;
    const chips = $("#st-chips");
    if (chips) {
      chips.innerHTML = "";
      t.chips.forEach(([id, lab]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "chip"; b.textContent = lab;
        b.addEventListener("click", () => {
          if (id === "fresh") { fresh = true; const p = $("#st-prompt"); if (p) p.focus(); say(t.freshNote); return; }
          if (id === "bg") {
            const p = $("#st-prompt");
            if (p && !p.value.trim()) {
              p.value = "change background to a clean modern studio backdrop";
              p.focus();
              say("Edit the new background description if you want, then press Enter or Send.");
              return;
            }
          }
          send(lab, { kind: id });
        });
        chips.append(b);
      });
    }
    if (!thread.length) renderThread();
    renderShots();
  }
  function bind() {
    if (bound) return; bound = true;
    const on = (id, fn) => { const n = $("#" + id); if (n) n.addEventListener("click", fn); };
    ["st-bri", "st-con", "st-sat"].forEach(id => { const n = $("#" + id); if (n) n.addEventListener("input", () => painted()); });
    on("st-apply", () => { if (!base) return; const cv = painted(); if (!cv) return; remember(); base = clone(cv); resetSliders(); painted(); });
    on("st-sharp", convolve); on("st-rot", rotate); on("st-flip", flip); on("st-crop", crop); on("st-text", putText);
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
    if (file) file.addEventListener("change", () => {
      const f = file.files && file.files[0]; file.value = "";
      if (!f) return;
      if (photo && photo.url) URL.revokeObjectURL(photo.url);
      photo = { blob: f, url: URL.createObjectURL(f), name: f.name || "picture" };
      fresh = false; pending();
    });
    const faceIn = $("#st-face");
    if (faceIn) faceIn.addEventListener("change", () => {
      const f = faceIn.files && faceIn.files[0]; faceIn.value = "";
      if (!f) return;
      if (face && face.url) URL.revokeObjectURL(face.url);
      face = { blob: f, url: URL.createObjectURL(f), name: f.name || "face" };
      pending();
    });
    const form = $("#st-form");
    if (form) form.addEventListener("submit", e => {
      e.preventDefault();
      const p = $("#st-prompt");
      const text = (p && p.value || "").trim();
      if (p) p.value = "";
      send(text, { kind: intent(text) });
    });
    const prompt = $("#st-prompt");
    if (prompt) prompt.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form && form.requestSubmit ? form.requestSubmit() : form && form.dispatchEvent(new Event("submit", { cancelable: true })); }
    });
    on("st-swap", () => send("Face swap", { kind: "swap" }));
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
  }
  function open() { bind(); relabel(); if (base) painted(); else renderThread(); }
  window.BA_STUDIO = { open, relabel };
})();
