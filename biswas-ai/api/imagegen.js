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
  { name: "pollinations", ok: () => env("IMAGE_POLLINATIONS") !== "off", run: async (p, w, h) => {
    const r = await tfetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=${w}&height=${h}&nologo=true&safe=true&model=flux`, {}, 60000);
    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !/^image\//.test(ct)) throw new Error("pollinations " + r.status);
    return { mime: ct.split(";")[0], b64: await b64OfRes(r) };
  } },
  { name: "gemini", ok: () => env("GEMINI_API_KEY"), run: async p => {
    const model = env("GEMINI_IMAGE_MODEL") || "gemini-2.5-flash-image";
    const r = await tfetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: p }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }) });
    if (!r.ok) throw new Error("gemini " + r.status);
    const j = await r.json(); const part = ((((j.candidates || [])[0] || {}).content || {}).parts || []).find(x => x.inlineData || x.inline_data);
    const d = part && (part.inlineData || part.inline_data); if (!d) throw new Error("gemini empty");
    return { mime: d.mimeType || d.mime_type || "image/png", b64: d.data };
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
const STYLE = " High quality, realistic, clean composition, no text, no letters, no words, no watermark.";
export async function generate(prompt, opt = {}) {
  const p = String(prompt || "").replace(/\s+/g, " ").trim().slice(0, 900);
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
export async function handle(req, body, sendJson) {
  roll();
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const n = (counts.ip.get(ip) || 0) + 1;
  if (n > PER_IP_DAILY) return sendJson(429, { error: "image_daily_limit" });
  counts.ip.set(ip, n);
  try { const r = await generate(body && body.prompt, body || {}); sendJson(200, r); }
  catch (e) { counts.ip.set(ip, n - 1); sendJson(e.status || 500, { error: e.message, detail: e.detail || "" }); }
}
