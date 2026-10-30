// Text-to-image: free providers first, a capped paid fallback last. Returns { mime, b64, provider }.
// Order: Cloudflare Workers AI (flux-1-schnell) -> NVIDIA NIM (flux.1-schnell) -> Pollinations (no key) -> Gemini image -> OpenAI (hard daily cap).
// Never logs keys or prompts' secrets; only provider names and HTTP status.
const env = n => (process.env[n] || "").trim();
const OPENAI_DAILY = Math.max(0, Number(env("IMAGE_OPENAI_DAILY") || 20));
const PER_IP_DAILY = Math.max(1, Number(env("IMAGE_PER_IP_DAILY") || 40));
const day = () => new Date().toISOString().slice(0, 10);
const counts = { day: day(), openai: 0, ip: new Map() };
function roll() { if (counts.day !== day()) { counts.day = day(); counts.openai = 0; counts.ip.clear(); } }
const snap = v => Math.max(256, Math.min(1536, Math.round((+v || 1024) / 64) * 64));
async function tfetch(url, opt = {}, ms = 45000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opt, signal: ac.signal }); } finally { clearTimeout(t); }
}
const b64OfRes = async r => Buffer.from(await r.arrayBuffer()).toString("base64");
const PROVIDERS = [
  { name: "cloudflare", ok: () => env("CLOUDFLARE_API_TOKEN") && env("CLOUDFLARE_ACCOUNT_ID"), run: async (p, w, h) => {
    const r = await tfetch(`https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/ai/run/@cf/black-forest-labs/flux-1-schnell`, { method: "POST", headers: { authorization: "Bearer " + env("CLOUDFLARE_API_TOKEN"), "content-type": "application/json" }, body: JSON.stringify({ prompt: p, steps: 6 }) });
    if (!r.ok) throw new Error("cloudflare " + r.status);
    const j = await r.json(); const img = j && j.result && j.result.image; if (!img) throw new Error("cloudflare empty");
    return { mime: "image/jpeg", b64: img };
  } },
  { name: "nvidia", ok: () => env("NVIDIA_API_KEY"), run: async (p, w, h) => {
    const r = await tfetch("https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell", { method: "POST", headers: { authorization: "Bearer " + env("NVIDIA_API_KEY"), "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ prompt: p, width: Math.min(1024, w), height: Math.min(1024, h), steps: 4, seed: 0 }) });
    if (!r.ok) throw new Error("nvidia " + r.status);
    const j = await r.json(); const a = j && (j.artifacts || [])[0]; if (!a || !a.base64) throw new Error("nvidia empty");
    return { mime: "image/jpeg", b64: a.base64 };
  } },
  { name: "gemini", ok: () => env("GEMINI_API_KEY"), run: async p => {
    const model = env("GEMINI_IMAGE_MODEL") || "gemini-2.5-flash-image";
    const r = await tfetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: p }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }) });
    if (!r.ok) throw new Error("gemini " + r.status);
    const j = await r.json(); const part = ((((j.candidates || [])[0] || {}).content || {}).parts || []).find(x => x.inlineData || x.inline_data);
    const d = part && (part.inlineData || part.inline_data); if (!d) throw new Error("gemini empty");
    return { mime: d.mimeType || d.mime_type || "image/png", b64: d.data };
  } },
  { name: "pollinations", ok: () => env("IMAGE_POLLINATIONS") !== "off", run: async (p, w, h) => {
    const r = await tfetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${w}&height=${h}&nologo=true&safe=true&model=flux`, {}, 60000);
    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !/^image\//.test(ct)) throw new Error("pollinations " + r.status);
    return { mime: ct.split(";")[0], b64: await b64OfRes(r) };
  } },
  { name: "openai", paid: true, ok: () => env("OPENAI_API_KEY") && OPENAI_DAILY > 0, run: async (p, w, h) => {
    roll(); if (counts.openai >= OPENAI_DAILY) throw new Error("openai daily cap");
    counts.openai++;
    const size = w > h * 1.2 ? "1536x1024" : h > w * 1.2 ? "1024x1536" : "1024x1024";
    const r = await tfetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { authorization: "Bearer " + env("OPENAI_API_KEY"), "content-type": "application/json" }, body: JSON.stringify({ model: env("OPENAI_IMAGE_MODEL") || "gpt-image-1-mini", prompt: p, size, quality: "low", n: 1 }) }, 90000);
    if (!r.ok) throw new Error("openai " + r.status);
    const j = await r.json(); const d = (j.data || [])[0]; if (!d || !d.b64_json) throw new Error("openai empty");
    return { mime: "image/png", b64: d.b64_json };
  } }
];
export const imageProviders = () => PROVIDERS.filter(x => x.ok()).map(x => x.name);
const STYLE = " Photograph, high quality, realistic. Wide calm composition with plain open sky in the top third and plain ground in the bottom quarter, kept empty for a caption added later. Absolutely no text, no letters, no numbers, no signs, no banners, no flags with writing, no posters, no labels, no logos, no watermark. Shot outdoors in an open space away from buildings; any building is far in the background with blank walls and no signboard. The scene shows only people in plain clothes, trees, open fields and plain unmarked tents. Leave the top third as clean empty sky (reserved for the caption).";
// words that make image models paint fake lettering (the app writes the real text itself)
// named places/buildings make models paint a signboard with the name: drop proper names and send building scenes outdoors
const PLACE = /\b(at|in|inside|near|outside|of|from)\s+(the\s+)?([\w-]+\s+){0,2}(block\s+office|office|hospital|school|college|panchayat|bhavan|bhawan|hall|station|bank|shop|store|market|building|centre|center|clinic|court)\b/g;
const dropNames = s => s.replace(PLACE, " outdoors in an open village ground").replace(/(^|[^.!?]\s)\b([A-Z]{2,}[\w-]*|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, (m, pre) => pre);
export const cleanScene = p => dropNames(String(p || "")).replace(/\b(posters?|banners?|flyers?|notices?|signs?|signboards?|placards?|billboards?|labels?|captions?|titles?|headings?|logos?|texts?|words?|letters?|announc\w*|written|writing|saying|reads?|showing the words?)\b/gi, " ").replace(/["“”'‘’][^"“”'‘’]{0,80}["“”'‘’]/g, " ").replace(/\b(on|dated|from|till|until|by)?\s*\d[\d\s\-\/.,:]*(st|nd|rd|th)?\s*(jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)?\s*\d*/gi, " ").replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").replace(/\b(a|an) the\b/gi, "the").replace(/\b(at|in|on|of|near|for)\s+(?=(with|and|,|\.|$))/gi, "").replace(/^[\s:;,.-]*(for|of|about)?\s*/i, "").replace(/\s+([,.])/g, "$1").replace(/(\s+\b(with|saying|a|an|and|of|on|the)\b)+[\s,.]*$/i, "").replace(/[\s,:;]+$/, "").trim();
export async function generate(prompt, opt = {}) {
  const p = cleanScene(prompt).slice(0, 900) || "a calm landscape";
  if (p.length < 3) { const e = new Error("bad_prompt"); e.status = 400; throw e; }
  const w = snap(opt.w || 1024), h = snap(opt.h || 768), errs = [];
  const order = (env("IMAGE_PROVIDER_ORDER") ? env("IMAGE_PROVIDER_ORDER").split(",").map(s => s.trim()) : PROVIDERS.map(x => x.name));
  for (const n of order) {
    const pr = PROVIDERS.find(x => x.name === n); if (!pr || !pr.ok()) continue;
    try { const t = Date.now(); const out = await pr.run(p + STYLE, w, h); return { ...out, provider: pr.name, ms: Date.now() - t }; }
    catch (e) { errs.push(String(e && e.message || e).slice(0, 60)); }
  }
  const e = new Error("no_image_provider"); e.status = 503; e.detail = errs.join("; "); throw e;
}
// POST /api/imagegen {prompt, w, h}
export const studioInstruction = (task, prompt, kind) => {
  const p = String(prompt || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\s+/g, " ").trim().slice(0, 1200);
  const low = p.toLowerCase();
  const isBg = /\b(background|bg|backdrop|environment|place|setting|scene)\b/.test(low) && /\b(change|replace|remove|new|different|put|place|set|to|into)\b/.test(low)
    || /ব্যাকগ্রাউন্ড|পটভূমি|জায়গা\s*বদল|ব্যাকগ্রাউন্ড\s*বদল/.test(p)
    || /\b(remove\s+background|transparent|isolate|cutout|no\s+background)\b/.test(low);
  const isRestore = /\b(restore|restoration|old|blurry|damaged|fix\s+photo|recover)\b/.test(low) || /পুরনো|স্পষ্ট\s*করো|রিস্টোর/.test(p);
  const isCinematic = /\b(hero|cinematic|poster|epic|dramatic|vfx|movie|hollywood|film\s*still)\b/.test(low) || /হিরো|সিনেমাটিক/.test(p);
  const isEnhance = /\b(enhance|sharper|sharpen|hd|upscale|clearer|improve|quality|retouch)\b/.test(low) || /স্পষ্ট|উন্নত|রেটাচ/.test(p);
  const want = kind || ( /\b(video|movie|film|animate|clip|reel)\b/.test(low) || /ভিডিও|মুভি|ফিল্ম/.test(p) ? "video"
    : isCinematic ? "hero"
    : isEnhance || isRestore ? "enhance"
    : isBg ? "bg" : "");

  if (task === "swap") return "Put the face from the first reference photo onto the main person in the second reference photo. Keep the second photo's pose, clothes, lighting and background. Photoreal, sharp, natural skin, correct anatomy. No text, no watermark." + (p ? " Also: " + p : "");

  if (task === "edit" || (task === "swap" && false)) {
    if (want === "isolate" || /\b(remove\s+background|transparent|isolate|cutout)\b/.test(low)) {
      return `Use the reference photograph. Keep the exact same people, their faces, body proportions, clothes and jewellery perfectly identical. Completely remove the original background and isolate the subjects on a pure clean white background. Do not keep any original environment. Photoreal, sharp, natural skin, no text, no watermark. Instruction: ${p || "isolate on white"}`;
    }
    if (want === "vfx" || /\b(vfx|cinematic\s*vfx|dramatic\s*lighting|hollywood)\b/.test(low)) {
      return `Use the reference photograph. Keep the same people and faces clearly recognisable. Add high-end cinematic VFX: dramatic lighting, realistic shadows, subtle fog or light rays if suitable, depth, professional colour grade, atmospheric effects. Do not redesign the people. Photoreal, sharp, natural skin, no plastic, no text, no watermark. Instruction: ${p || "cinematic VFX with dramatic light and depth"}`;
    }
    if (want === "poster" || /\b(poster|movie\s*poster)\b/.test(low)) {
      return `Use the reference photograph. Keep the people recognisable. Turn into a high-end cinematic poster. If text is requested, render it clearly and correctly. Strong composition, dramatic lighting, professional grade. Photoreal or designed as asked. Instruction: ${p || "cinematic movie poster"}`;
    }
    if (isBg) {
      const wantTransparent = /transparent|isolate|cutout|no\s+background|remove\s+background/.test(low);
      const desc = p || "a clean modern studio backdrop with soft even light";
      if (wantTransparent) {
        return `Use the reference photograph. Keep the exact same people, their faces, body proportions, clothes and jewellery perfectly identical and recognisable. Completely remove the original background and isolate the subjects on a pure clean white background (or transparent if the model supports it). Do not keep any part of the original room, outdoor setting, water, boat, walls or backdrop. Subjects must stay pixel-accurate. Photoreal, sharp focus, natural skin, no plastic look, no text, no letters, no watermark, no logo. Instruction: ${desc}`;
      }
      return `Use the reference photograph. Keep the exact same people, their faces, body proportions, clothes and jewellery perfectly identical and recognisable — do not redesign, re-pose or re-light the subjects. Completely erase and replace the entire original background and environment with a brand-new photorealistic one. Do not keep any part of the original room, outdoor setting, water, boat, walls, sky or backdrop. The new background must be completely different and match the lighting on the subjects. Photoreal, sharp focus, natural skin, no plastic look, no text, no letters, no watermark, no logo. New background: ${desc}`;
    }
    if (want === "hero" || isCinematic) {
      return `Use the reference photograph. Keep the same people and faces clearly recognisable. Transform into a high-end cinematic movie still: richer colour grading, dramatic but natural lighting, subtle atmospheric effects if suitable (soft fog, light rays, depth), shallow depth of field, professional look. Photoreal, sharp, natural skin, no plastic, no text, no watermark. Instruction: ${p || "cinematic hero shot with stronger light and depth"}`;
    }
    if (want === "video") {
      return `Use the reference photograph. Keep the same people and faces. Show the same moment a second later with slight natural motion: softer expression, hair moved a little by a breeze, small ripple on any water. Photoreal, sharp, natural skin, no text, no watermark. ${p}`;
    }
    if (want === "enhance" || isRestore || !p) {
      return `Use the reference photograph. Keep the same people, faces, clothes and composition. Professionally enhance and restore: improve sharpness, detail, lighting, colour balance and clarity. Reduce noise or blur if present while preserving natural skin texture and identity. Photoreal, high quality, natural skin, no plastic look, no text, no watermark. ${p || "Make the photograph clearer and more detailed."}`;
    }
    return `Use the reference photograph. Keep the exact same people, their faces, body proportions, clothes, jewellery, pose and position perfectly recognisable. Change only what the instruction explicitly asks. Do not redesign, re-pose, re-light or invent new objects unless asked. Photoreal, sharp focus, natural skin texture, no plastic look, no text, no letters, no watermark, no logo. Instruction: ${p}`;
  }

  if (want === "hero" || isCinematic) return "One cinematic photoreal hero still, sharp, natural skin, professional colour grade. " + (p || "A person standing in a real place, low angle, strong natural light.") + ( /\b(text|poster|title|letter)\b/.test(low) ? "" : " No text, no watermark.");
  if (want === "video") return "One photoreal film still, sharp, a little motion in hair or water. " + (p || "A quiet real place with one person.") + " No text, no watermark.";
  if (isBg) return "Photoreal photograph with the described background. Sharp, natural. " + p + " No text, no watermark.";
  const allowText = /\b(poster|text|title|letter|words|typography|logo)\b/.test(low) || /পোস্টার|লেখা|টাইটেল/.test(p);
  return (allowText
    ? "One high-detail photoreal or designed image. Sharp, clear, professional. Include any requested text clearly and correctly. "
    : "One high-detail photoreal photograph. Sharp focus, natural light, real textures, no text, no letters, no watermark, no logo. ")
    + (p || "A quiet realistic scene.");
};
export const studioIntent = prompt => {
  const p = String(prompt || "");
  const low = p.toLowerCase();
  if (/\b(video|movie|film|animate|clip|reel)\b/.test(low) || /ভিডিও|মুভি|ফিল্ম/.test(p)) return "video";
  if (/\b(swap|face\s*swap)\b/.test(low) || /ফেস\s*সোয়াপ|মুখ\s*বদল/.test(p)) return "swap";
  if (/\b(remove\s+background|transparent|isolate|cutout|no\s+background)\b/.test(low) || /ব্যাকগ্রাউন্ড\s*সরান/.test(p)) return "isolate";
  if (/\b(background|bg|backdrop)\b/.test(low) && /\b(change|replace|remove|new)\b/.test(low) || /ব্যাকগ্রাউন্ড|পটভূমি/.test(p)) return "bg";
  if (/\b(vfx|cinematic\s*vfx|dramatic\s*lighting)\b/.test(low)) return "vfx";
  if (/\b(poster|movie\s*poster)\b/.test(low) || /পোস্টার/.test(p)) return "poster";
  if (/\b(hero|cinematic|poster|epic)\b/.test(low) || /হিরো/.test(p)) return "hero";
  if (/\b(enhance|sharper|sharpen|hd|upscale|clearer|improve|quality|restore|retouch)\b/.test(low) || /স্পষ্ট|উন্নত|রিস্টোর/.test(p)) return "enhance";
  return "";
};
function cleanImages(list) {
  const out = [];
  for (const im of Array.isArray(list) ? list : []) {
    if (!im || typeof im !== "object") continue;
    const mime = String(im.mime || "image/jpeg").toLowerCase();
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) continue;
    const raw = String(im.b64 || im.data || "");
    const b64 = raw.replace(/^data:[^,]+,/, "").replace(/\s/g, "");
    if (b64.length < 80 || b64.length > 3500000 || !/^[A-Za-z0-9+/=]+$/.test(b64)) continue;
    out.push({ mime, b64 });
    if (out.length === 2) break;
  }
  return out;
}
async function geminiPicture(prompt, images) {
  const key = env("GEMINI_API_KEY");
  if (!key) throw new Error("gemini missing");
  const models = [...new Set([env("GEMINI_IMAGE_MODEL"), "gemini-2.5-flash-image", "gemini-3.1-flash-lite-image"].filter(Boolean))];
  let last = "gemini empty";
  for (const model of models) {
    const parts = [{ text: prompt }];
    for (const im of images || []) parts.push({ inline_data: { mime_type: im.mime, data: im.b64 } });
    const r = await tfetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } })
    }, images && images.length ? 90000 : 60000);
    if (r.status === 429) { last = "gemini 429"; continue; }
    if (!r.ok) { last = "gemini " + r.status; continue; }
    const j = await r.json();
    const part = ((((j.candidates || [])[0] || {}).content || {}).parts || []).find(x => x.inlineData || x.inline_data);
    const d = part && (part.inlineData || part.inline_data);
    if (!d || !d.data) { last = "gemini empty"; continue; }
    return { mime: d.mimeType || d.mime_type || "image/png", b64: d.data };
  }
  throw new Error(last);
}
async function cloudflareKlein(prompt, images, w, h) {
  const token = env("CLOUDFLARE_API_TOKEN"), account = env("CLOUDFLARE_ACCOUNT_ID");
  if (!token || !account) throw new Error("cloudflare missing");
  const form = new FormData();
  form.append("prompt", String(prompt || "").slice(0, 1800));
  form.append("width", String(w));
  form.append("height", String(h));
  (images || []).slice(0, 2).forEach((im, i) => {
    form.append("input_image_" + i, new Blob([Buffer.from(im.b64, "base64")], { type: im.mime || "image/jpeg" }), "ref" + i + ".jpg");
  });
  const r = await tfetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/black-forest-labs/flux-2-klein-9b`, {
    method: "POST", headers: { authorization: "Bearer " + token }, body: form
  }, 90000);
  const ct = r.headers.get("content-type") || "";
  if (!r.ok) throw new Error("klein " + r.status + " " + (await r.text()).slice(0, 140));
  if (/^image\//.test(ct)) return { mime: ct.split(";")[0], b64: await b64OfRes(r) };
  const j = await r.json();
  const img = (j && j.result && (j.result.image || j.result.b64)) || j.image || "";
  if (!img) throw new Error("klein empty");
  const b64 = String(img).replace(/^data:[^,]+,/, "").replace(/\s/g, "");
  return { mime: "image/jpeg", b64 };
}
function fitSize(w, h) {
  let W = snap(w || 1024), H = snap(h || 1024);
  const s = Math.min(1, 1024 / Math.max(W, H));
  return { w: snap(W * s), h: snap(H * s) };
}

async function xaiGenerate(prompt, w, h) {
  const key = env("XAI_API_KEY");
  if (!key) throw new Error("xai missing");
  const r = await tfetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { authorization: "Bearer " + key, "content-type": "application/json" },
    body: JSON.stringify({
      model: env("XAI_IMAGE_MODEL") || "grok-imagine-image-2.0",
      prompt: String(prompt || "").slice(0, 1800),
      response_format: "b64_json",
      n: 1
    })
  }, 90000);
  if (!r.ok) throw new Error("xai gen " + r.status + " " + (await r.text()).slice(0, 120));
  const j = await r.json();
  const d = (j.data || [])[0];
  const b64 = d && (d.b64_json || d.b64 || "");
  if (!b64) throw new Error("xai empty");
  return { mime: "image/jpeg", b64: String(b64).replace(/^data:[^,]+,/, "").replace(/\s/g, "") };
}
async function xaiEdit(prompt, images) {
  const key = env("XAI_API_KEY");
  if (!key) throw new Error("xai missing");
  const im = (images || [])[0];
  if (!im || !im.b64) throw new Error("xai no image");
  const dataUrl = "data:" + (im.mime || "image/jpeg") + ";base64," + im.b64;
  const r = await tfetch("https://api.x.ai/v1/images/edits", {
    method: "POST",
    headers: { authorization: "Bearer " + key, "content-type": "application/json" },
    body: JSON.stringify({
      model: env("XAI_IMAGE_MODEL") || "grok-imagine-image-2.0",
      prompt: String(prompt || "").slice(0, 1800),
      image: { url: dataUrl, type: "image_url" },
      response_format: "b64_json",
      quality: "medium"
    })
  }, 120000);
  if (!r.ok) throw new Error("xai edit " + r.status + " " + (await r.text()).slice(0, 120));
  const j = await r.json();
  const d = (j.data || [])[0];
  const b64 = d && (d.b64_json || d.b64 || "");
  if (!b64) throw new Error("xai empty");
  return { mime: "image/jpeg", b64: String(b64).replace(/^data:[^,]+,/, "").replace(/\s/g, "") };
}
async function editWithFallback(brief, images, w, h) {
  const errs = [];
  if (env("CLOUDFLARE_API_TOKEN") && env("CLOUDFLARE_ACCOUNT_ID")) {
    try { const t = Date.now(); const out = await cloudflareKlein(brief, images, w, h); return { ...out, provider: "cloudflare", ms: Date.now() - t }; }
    catch (e) { errs.push(String(e && e.message || e).slice(0, 100)); }
  }
  try { const t = Date.now(); const out = await geminiPicture(brief, images); return { ...out, provider: "gemini", ms: Date.now() - t }; }
  catch (e) { errs.push(String(e && e.message || e).slice(0, 80)); }
  if (env("XAI_API_KEY")) {
    try { const t = Date.now(); const out = await xaiEdit(brief, images); return { ...out, provider: "xai", ms: Date.now() - t }; }
    catch (e) { errs.push(String(e && e.message || e).slice(0, 100)); }
  }
  const detail = errs.join("; ");
  const quota = /429|allocation|quota|rate.?limit/i.test(detail);
  const err = new Error(quota ? "quota_exhausted" : "edit_failed");
  err.status = quota ? 429 : 502;
  err.detail = detail;
  throw err;
}
async function makeWithFallback(brief, w, h) {
  const errs = [];
  if (env("XAI_API_KEY")) {
    try { const t = Date.now(); const out = await xaiGenerate(brief, w, h); return { ...out, provider: "xai", ms: Date.now() - t }; }
    catch (e) { errs.push(String(e && e.message || e).slice(0, 100)); }
  }
  if (env("CLOUDFLARE_API_TOKEN") && env("CLOUDFLARE_ACCOUNT_ID")) {
    try { const t = Date.now(); const out = await cloudflareKlein(brief, [], w, h); return { ...out, provider: "cloudflare", ms: Date.now() - t }; }
    catch (e) { errs.push(String(e && e.message || e).slice(0, 80)); }
  }
  const order = (env("IMAGE_PROVIDER_ORDER") ? env("IMAGE_PROVIDER_ORDER").split(",").map(s => s.trim()) : ["gemini", "nvidia", "cloudflare", "pollinations", "openai"]);
  for (const n of order) {
    const pr = PROVIDERS.find(x => x.name === n); if (!pr || !pr.ok()) continue;
    try {
      const t = Date.now();
      const out = n === "gemini" ? await geminiPicture(brief, []) : await pr.run(brief, w, h);
      return { ...out, provider: pr.name, ms: Date.now() - t };
    } catch (e) { errs.push(String(e && e.message || e).slice(0, 60)); }
  }
  const e = new Error("no_image_provider"); e.status = 503; e.detail = errs.join("; "); throw e;
}
export async function generateStudio(prompt, opt = {}) {
  const images = cleanImages(opt.images);
  const sent = Array.isArray(opt.images) && opt.images.some(im => im && (im.b64 || im.data));
  if (sent && !images.length) { const e = new Error("bad_picture"); e.status = 400; throw e; }
  const intent = studioIntent(prompt);
  let task = ["make", "edit", "swap"].includes(opt.task) ? opt.task : "make";
  if (task !== "swap" && images.length) task = "edit";
  if (task === "swap" || (intent === "swap" && images.length >= 2)) task = "swap";
  if (!images.length) task = "make";
  const video = opt.video === true || intent === "video";
  if (task === "swap" && images.length < 2) { const e = new Error("need_two_pictures"); e.status = 400; throw e; }
  if ((task === "edit" || task === "swap") && !images.length) { const e = new Error("need_picture"); e.status = 400; throw e; }
  const size = fitSize(opt.w, opt.h);
  const run = brief => images.length ? editWithFallback(brief, images, size.w, size.h) : makeWithFallback(brief, size.w, size.h);
  if (!video) {
    const brief = studioInstruction(task, prompt);
    if (task === "make" && brief.length < 20) { const e = new Error("bad_prompt"); e.status = 400; throw e; }
    return run(brief);
  }
  let start = null, end = null, err = null;
  try { start = await run(studioInstruction(task, prompt, "enhance")); } catch (e) { err = e; }
  try { end = await run(studioInstruction(task, prompt, "video")); } catch (e) { if (!start) err = e; }
  const main = end || start;
  if (!main) throw err;
  return { ...main, video: true, extra: start && end ? { mime: start.mime, b64: start.b64, provider: start.provider } : null };
}
function takeSlot(req) {
  roll();
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const n = (counts.ip.get(ip) || 0) + 1;
  if (n > PER_IP_DAILY) return { ip, n, limited: true };
  counts.ip.set(ip, n);
  return { ip, n, limited: false };
}
export async function handle(req, body, sendJson) {
  const slot = takeSlot(req);
  if (slot.limited) return sendJson(429, { error: "image_daily_limit" });
  try { const r = await generate(body && body.prompt, body || {}); sendJson(200, r); }
  catch (e) { counts.ip.set(slot.ip, slot.n - 1); sendJson(e.status || 500, { error: e.message, detail: e.detail || "" }); }
}
export async function handleStudio(req, body, sendJson, res) {
  const slot = takeSlot(req);
  if (slot.limited) return sendJson(429, { error: "image_daily_limit" });
  try {
    const r = await generateStudio(body && body.prompt, body || {});
    const buf = Buffer.from(String(r.b64 || "").replace(/\s/g, ""), "base64");
    if (buf.length < 32) { const e = new Error("no_image"); e.status = 502; throw e; }
    const mime = /^image\/(jpeg|png|webp)$/.test(r.mime || "") ? r.mime : "image/jpeg";
    res.writeHead(200, {
      "content-type": mime,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-provider": String(r.provider || "").slice(0, 40),
      "x-ms": String(r.ms || 0),
      "x-video": r.video ? "1" : "0"
    });
    res.end(buf);
  } catch (e) { counts.ip.set(slot.ip, slot.n - 1); sendJson(e.status || 500, { error: e.message, detail: e.detail || "" }); }
}
