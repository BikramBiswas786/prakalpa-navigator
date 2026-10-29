// Biswas AI for Office: chat endpoint (used by server.js).
// Tries free AI providers one after another. When one is out of quota or
// fails before answering, the next is used, so the free limits add up.
// Every provider is optional: set the API keys you have in Vercel.
//
//   LLM7_API_KEY         LLM7.io free (100k tokens/day, 60 RPM): turbo models
//   NARA_API_KEY         NaraRouter free (7M tokens/day, 15 RPM): agnes, nemotron, laguna
//   GEMINI_API_KEY       Google AI Studio (free, no card)
//   NVIDIA_API_KEY       NVIDIA build.nvidia.com developer API (free): Llama and Kimi models
//   GROQ_API_KEY         Groq (free, no card; each model has its own daily quota): Llama, gpt-oss
//   MISTRAL_API_KEY      Mistral "Experiment" plan (free, phone verification)
//   OPENROUTER_API_KEY   OpenRouter ":free" models: Kimi, Llama
//   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN   Cloudflare Workers AI (free daily allowance): Llama
//   SAMBANOVA_API_KEY    SambaNova free tier: Llama (about 20 requests/day per model)
//   ZAI_API_KEY          Z.ai GLM Flash models priced at $0 (tight concurrency)
//   COHERE_API_KEY       Cohere trial (about 1,000 calls/month; not for production)
//   CEREBRAS_API_KEY     Cerebras (trial credit; card)
//   SARVAM_API_KEY       Sarvam AI (Indian; strong Bengali; signup credit)
//   KIMI_API_KEY         Moonshot Kimi API, official Kimi K3 (paid)
//
// Paid, off unless named in PROVIDER_ORDER (a key alone does not spend money), except OpenAI:
//   DEEPSEEK_API_KEY     DeepSeek (no free tier; cheapest volume)
//   DASHSCOPE_API_KEY    Alibaba Model Studio, Singapore (1M-token grant, then it bills)
//   OPENAI_API_KEY       OpenAI (prepaid): ON by default as the LAST provider (gpt-6-luna)
//   XAI_API_KEY          xAI Grok (prepaid)
//   TOGETHER_API_KEY     Together (prepaid)
//   FIREWORKS_API_KEY    Fireworks (small starter credit, then paid)
//
// GitHub Models was shut down on 30 July 2026 and has been removed.
//
// Optional: PROVIDER_ORDER="gemini,nvidia,groq,..." and <NAME>_MODELS
// (comma-separated) to change models without touching code.

const env = name => (process.env[name] || "").trim();
// A provider key may also be set under an older/alternate name (Render has Z_AI).
const keyOf = p => env(p.key) || (p.alt ? env(p.alt) : "");
const list = (name, fallback) => (env(name) || fallback).split(",").map(s => s.trim()).filter(Boolean);

const PROVIDERS = {
  llm7: { key: "LLM7_API_KEY", kind: "openai", url: "https://api.llm7.io/v1/chat/completions", models: list("LLM7_MODELS", "fast,default,gpt-oss") },
  nara: { key: "NARA_API_KEY", kind: "openai", url: "https://router.bynara.id/v1/chat/completions", models: list("NARA_MODELS", "agnes-2.5-flash,nemotron-3.5-lightning-free,laguna-s-2.1") },
  gemini: { key: "GEMINI_API_KEY", kind: "gemini", vision: true, models: list("GEMINI_MODELS", env("GEMINI_MODEL") || "gemini-flash-lite-latest,gemini-flash-latest") },
  nvidia: { key: "NVIDIA_API_KEY", kind: "openai", url: "https://integrate.api.nvidia.com/v1/chat/completions", models: list("NVIDIA_MODELS", "nvidia/nemotron-3.5-lightning-30b-a3b") },
  mistral: { key: "MISTRAL_API_KEY", kind: "openai", vision: true, url: "https://api.mistral.ai/v1/chat/completions", models: list("MISTRAL_MODELS", "mistral-small-latest,mistral-medium-latest") },
  groq: { key: "GROQ_API_KEY", kind: "openai", url: "https://api.groq.com/openai/v1/chat/completions", models: list("GROQ_MODELS", "openai/gpt-oss-20b,openai/gpt-oss-120b") },
  openrouter: { key: "OPENROUTER_API_KEY", kind: "openai", url: "https://openrouter.ai/api/v1/chat/completions", models: list("OPENROUTER_MODELS", "nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-26b-a4b-it:free,poolside/laguna-s-2.1:free") },
  cloudflare: { key: "CLOUDFLARE_API_TOKEN", also: "CLOUDFLARE_ACCOUNT_ID", kind: "openai", url: () => `https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/ai/v1/chat/completions`, models: list("CLOUDFLARE_MODELS", "@cf/meta/llama-3.3-70b-instruct-fp8-fast,@cf/meta/llama-4-scout-17b-16e-instruct") },
  sambanova: { key: "SAMBANOVA_API_KEY", kind: "openai", url: "https://api.sambanova.ai/v1/chat/completions", models: list("SAMBANOVA_MODELS", "Meta-Llama-3.3-70B-Instruct") },
  zai: { key: "ZAI_API_KEY", alt: "Z_AI", kind: "openai", url: "https://api.z.ai/api/paas/v4/chat/completions", models: list("ZAI_MODELS", "glm-4.7-flash") },
  cohere: { key: "COHERE_API_KEY", kind: "openai", url: "https://api.cohere.ai/compatibility/v1/chat/completions", models: list("COHERE_MODELS", "command-a-plus-05-2026") },
  cerebras: { key: "CEREBRAS_API_KEY", kind: "openai", url: "https://api.cerebras.ai/v1/chat/completions", models: list("CEREBRAS_MODELS", "gpt-oss-120b") },
  sarvam: { key: "SARVAM_API_KEY", kind: "openai", url: "https://api.sarvam.ai/v1/chat/completions", auth: "api-subscription-key", models: list("SARVAM_MODELS", "sarvam-105b") },
  kimi: { key: "KIMI_API_KEY", kind: "openai", url: "https://api.moonshot.ai/v1/chat/completions", models: list("KIMI_MODELS", "kimi-k3") },
  deepseek: { key: "DEEPSEEK_API_KEY", kind: "openai", url: "https://api.deepseek.com/chat/completions", models: list("DEEPSEEK_MODELS", "deepseek-flash") },
  qwen: { key: "DASHSCOPE_API_KEY", kind: "openai", url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", models: list("QWEN_MODELS", "qwen-flash") },
  openai: { key: "OPENAI_API_KEY", kind: "openai", vision: true, url: "https://api.openai.com/v1/chat/completions", models: list("OPENAI_MODELS", "gpt-6-luna").slice(0, 1), paid: true },
  xai: { key: "XAI_API_KEY", kind: "openai", url: "https://api.x.ai/v1/chat/completions", models: list("XAI_MODELS", "grok-4.7") },
  together: { key: "TOGETHER_API_KEY", kind: "openai", url: "https://api.together.xyz/v1/chat/completions", models: list("TOGETHER_MODELS", "meta-llama/Llama-3.3-70B-Instruct-Turbo") },
  fireworks: { key: "FIREWORKS_API_KEY", kind: "openai", url: "https://api.fireworks.ai/inference/v1/chat/completions", models: list("FIREWORKS_MODELS", "accounts/fireworks/models/llama-v3p3-70b-instruct") }
};
const ORDER = list("PROVIDER_ORDER", "llm7,nara,groq,gemini,nvidia,mistral,openrouter,cloudflare,sambanova,zai,cerebras,sarvam,kimi,openai").filter(id => PROVIDERS[id]);
// OpenAI is paid, so it is always the very last resort: it is tried only after
// every free provider above has failed. PROVIDER_ORDER still overrides all of this.

const LIMITS = { system: 80000, message: 160000, total: 360000, turns: 40, images: 4, imageB64: 7000000 };
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_OUT = 8192;
const FIRST_TEXT_MS = Number(env("FIRST_TEXT_MS")) || 12000; // last-resort wait
const NORMAL_FIRST_MS = Number(env("NORMAL_FIRST_MS")) || 4000; // normal mode: a model with no first text in 4 s is skipped (one at a time, never raced)
const modelCool = new Map(); // "id/model" → until (a model that stalled or failed sits out for 3 min)
const mCooled = k => (modelCool.get(k) || 0) > Date.now();
const IDLE_MS = Number(env("IDLE_MS")) || 60000;

const rankModel = model => { const m = String(model).toLowerCase(); return /70b|72b|120b|405|ultra|scout|medium|kimi|105b/.test(m) ? 0 : /flash-lite|8b|nemo|fast\b/.test(m) ? 2 : 1; };
const outTokens = body => {
  const cap = body && (body.deep || body.smart) ? 12288 : MAX_OUT;
  const n = Number(body && body.maxOut);
  return Number.isFinite(n) ? Math.max(256, Math.min(cap, Math.floor(n))) : cap;
};
const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const configured = () => ORDER.filter(id => keyOf(PROVIDERS[id]) && (!PROVIDERS[id].also || env(PROVIDERS[id].also)));
const coolUntil = new Map();
const cooled = id => (coolUntil.get(id) || 0) > Date.now();
const cool = (id, ms) => coolUntil.set(id, Date.now() + ms);
// Measured time to first text per provider/model (ms, moving average); starts from a rough guess.
const SPEED_GUESS = { cerebras: 500, groq: 600, sambanova: 900, gemini: 1100, mistral: 1200, zai: 1400, llm7: 1500, nvidia: 1500, cloudflare: 1500, deepseek: 1800, qwen: 1500, nara: 2000, cohere: 1800, together: 1500, fireworks: 1200, xai: 1500, kimi: 2500, sarvam: 2500, openrouter: 3000, openai: 1500 };
const speed = new Map();
export function speedNote(id, model, ms) {
  const k = id + "/" + model, cur = speed.get(k);
  if (ms == null) { speed.set(k, { ms: Math.max(cur ? cur.ms : 0, 9000), n: (cur ? cur.n : 0) + 1, failAt: Date.now() }); return; }
  speed.set(k, { ms: cur && !cur.failAt ? Math.round(cur.ms * 0.6 + ms * 0.4) : ms, n: (cur ? cur.n : 0) + 1, failAt: 0 });
}
function fastPairs(ids, vision, freeOnly) {
  const pairs = [];
  for (const id of ids) { const p = PROVIDERS[id]; if (vision && !p.vision) continue; if (freeOnly && p.paid) continue; p.models.forEach((m, i) => pairs.push([id, m, i])); }
  const score = ([id, m, i]) => { const s = speed.get(id + "/" + m); let v = s ? (s.failAt && Date.now() - s.failAt > 10 * 60 * 1000 ? (SPEED_GUESS[id] || 2500) * 1.5 : s.ms) : (SPEED_GUESS[id] || 2500) + i * 300; if (cooled(id)) v += 60000; if (PROVIDERS[id].paid) v += 100000; return v; };
  return pairs.sort((a, b) => score(a) - score(b)).map(([id, m]) => [id, m]);
}
export function speedTable() { return [...speed.entries()].map(([k, v]) => ({ model: k, ms: v.ms, n: v.n, failing: !!v.failAt })).sort((a, b) => a.ms - b.ms); }
const quotaError = (status, error) => status === 429 || /rate limit|quota|resource exhausted|too many requests/i.test(String(error || ""));

export async function GET(request) {
  const ids = configured();
  const test = request && new URL(request.url).searchParams.get("test");
  if (!test) return json({ configured: ids.length > 0, providers: ids });
  // Key check: ask every configured model a tiny question, in parallel.
  const body = { system: "Reply with one short word.", messages: [{ role: "user", content: "Say OK" }], images: [] };
  const checks = [];
  for (const id of ids) for (const model of PROVIDERS[id].models) {
    checks.push((async () => {
      const t0 = Date.now();
      const r = await attempt(PROVIDERS[id], model, body, null, 20000);
      if (r.ok) { try { await r.stream.cancel(); } catch { /* ignore */ } }
      return { provider: id, model, ok: r.ok, status: r.status || null, ms: Date.now() - t0, error: r.ok ? "" : r.error };
    })());
  }
  return json({ providers: ids, results: await Promise.all(checks) });
}

function validate(body) {
  if (!body || typeof body !== "object") return "bad body";
  const { system, messages, images = [] } = body;
  if (typeof system !== "string" || system.length > LIMITS.system) return "bad system";
  if (!Array.isArray(messages) || !messages.length || messages.length > LIMITS.turns) return "bad messages";
  let total = system.length;
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content || m.content.length > LIMITS.message) return "bad message";
    total += m.content.length;
  }
  if (total > LIMITS.total) return "too large";
  if (messages[messages.length - 1].role !== "user") return "last turn must be user";
  if (!Array.isArray(images) || images.length > LIMITS.images) return "bad images";
  for (const im of images) {
    if (!im || !IMAGE_TYPES.has(im.mime) || typeof im.data !== "string" || im.data.length > LIMITS.imageB64 || !/^[A-Za-z0-9+/=]+$/.test(im.data)) return "bad image";
  }
  return null;
}

/* ---------- request builders ---------- */
function geminiRequest(p, model, key, body, signal) {
  const contents = [];
  for (const m of body.messages) {
    const role = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n\n" + m.content;
    else contents.push({ role, parts: [{ text: m.content }] });
  }
  if (contents[0].role !== "user") contents.shift();
  for (const im of body.images || []) contents[contents.length - 1].parts.push({ inline_data: { mime_type: im.mime, data: im.data } });
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ system_instruction: { parts: [{ text: body.system }] }, contents, generationConfig: { temperature: 0.3, maxOutputTokens: outTokens(body) } }),
    signal
  });
}

function openaiRequest(p, model, key, body, signal) {
  const messages = [{ role: "system", content: body.system }];
  for (const m of body.messages) {
    const last = messages[messages.length - 1];
    if (last.role === m.role && typeof last.content === "string") last.content += "\n\n" + m.content;
    else messages.push({ role: m.role, content: m.content });
  }
  if (body.images && body.images.length) {
    const last = messages[messages.length - 1];
    last.content = [{ type: "text", text: last.content }, ...body.images.map(im => ({ type: "image_url", image_url: { url: `data:${im.mime};base64,${im.data}` } }))];
  }
  const payload = { model, messages, stream: true, temperature: 0.3, max_tokens: outTokens(body) };
  if (p === PROVIDERS.openai) {
    // GPT-6 models are reasoning models: they take max_completion_tokens, not max_tokens or temperature.
    delete payload.max_tokens; delete payload.temperature;
    payload.max_completion_tokens = outTokens(body);
    payload.reasoning_effort = "none";
  }
  if (/gpt-oss/.test(model) && p !== PROVIDERS.openrouter) payload.reasoning_effort = body.deep ? "medium" : "low";
  const headers = { "content-type": "application/json" };
  if (p.auth) headers[p.auth] = key; else headers.authorization = `Bearer ${key}`;
  if (p === PROVIDERS.openrouter) { headers["x-title"] = "Biswas AI for Office"; }
  return fetch(typeof p.url === "function" ? p.url() : p.url, { method: "POST", headers, body: JSON.stringify(payload), signal });
}

/* ---------- stream parsers: SSE line -> {text, finish} ---------- */
const tokText = v => typeof v === "string" ? v : typeof v === "number" && isFinite(v) ? String(v) : "";
export const _test = { openaiEvent: e => openaiEvent(e), geminiEvent: e => geminiEvent(e) };
function geminiEvent(ev) {
  const out = { text: "", finish: "" };
  if (ev.promptFeedback && ev.promptFeedback.blockReason) out.finish = "BLOCKED";
  const cand = ev.candidates && ev.candidates[0];
  if (!cand) return out;
  out.text = ((cand.content && cand.content.parts) || []).map(p => (p.thought ? "" : tokText(p.text))).join("");
  if (cand.finishReason === "MAX_TOKENS") out.finish = "MAX_TOKENS";
  else if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(cand.finishReason)) out.finish = "BLOCKED";
  return out;
}
function openaiEvent(ev) {
  const out = { text: "", finish: "" };
  const ch = ev.choices && ev.choices[0];
  if (!ch) return out;
  const c = ch.delta && ch.delta.content;
  // some providers stream a numeric token as a JSON number ("content":47), not a string: keep it, or every number in an answer is lost
  out.text = typeof c === "string" ? c : typeof c === "number" ? String(c) : Array.isArray(c) ? c.map(x => tokText(x.text)).join("") : "";
  if (ch.finish_reason === "length") out.finish = "MAX_TOKENS";
  else if (ch.finish_reason === "content_filter") out.finish = "BLOCKED";
  return out;
}

// Upstream error bodies can echo keys back (e.g. OpenAI "Incorrect API key provided: ...").
// Mask anything key-like before it is stored, logged or counted.
export function redact(text) {
  let s = String(text || "");
  for (const p of Object.values(PROVIDERS)) for (const name of [p.key, p.also, p.alt]) {
    const v = name ? env(name) : ""; if (v.length >= 4) s = s.split(v).join("[redacted]");
  }
  return s
    .replace(/(Incorrect API key provided:\s*)[^\s.,"']+/gi, "$1[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+\/=-]+/gi, "$1[redacted]")
    .replace(/\b(sk|gsk|nvapi|xai|pk|rk|csk|tvly|fc|AIza)[-_][A-Za-z0-9._-]{6,}/g, "[redacted]")
    .replace(/\bAIza[A-Za-z0-9_-]{20,}/g, "[redacted]")
    .replace(/((?:api[_-]?key|token|key|secret|authorization)["']?\s*[:=]\s*["']?)[A-Za-z0-9._~+\/-]{8,}/gi, "$1[redacted]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted]");
}
const timeout = (ms, label) => new Promise((_, rej) => setTimeout(() => rej(new Error(label)), ms));

// Sends one request and waits for the first piece of text. Resolves with
// {ok: true, stream} (a text stream starting with that first piece) or
// {ok: false, status, error} so the caller can move on to the next model.
async function attempt(p, model, body, signal, firstMs = FIRST_TEXT_MS) {
  const ctl = new AbortController();
  const stop = () => ctl.abort();
  if (signal) signal.addEventListener("abort", stop, { once: true });
  const fail = (status, error) => { ctl.abort(); return { ok: false, status, error: redact(error).slice(0, 300) }; };
  let upstream;
  try {
    upstream = await Promise.race([
      (p.kind === "gemini" ? geminiRequest : openaiRequest)(p, model, keyOf(p), body, ctl.signal),
      timeout(firstMs, "no response in time")
    ]);
  } catch (e) { return fail(0, e.message || "network error"); }
  if (!upstream.ok || upstream.status !== 200 || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return fail(upstream.status, (text || upstream.statusText).replace(/\s+/g, " "));
  }
  const parse = p.kind === "gemini" ? geminiEvent : openaiEvent;
  const reader = upstream.body.getReader();
  const dec = new TextDecoder();
  const isJson = /application\/json/.test(upstream.headers.get("content-type") || "");
  let buf = "", raw = "", finish = "";
  const pending = [];
  const eat = line => {
    line = line.trim();
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let ev; try { ev = JSON.parse(data); } catch { return; }
    if (ev.error) { finish = finish || "ERROR"; return; }
    const r = parse(ev);
    if (r.text) pending.push(r.text);
    if (r.finish) finish = r.finish;
  };
  const pump = async ms => {
    const { value, done } = await Promise.race([reader.read(), timeout(ms, "silent")]);
    if (done) return false;
    const chunk = dec.decode(value, { stream: true });
    if (isJson) { raw += chunk; return true; }
    buf += chunk;
    const lines = buf.split(/\r?\n/); buf = lines.pop();
    lines.forEach(eat);
    return true;
  };
  // Phase 1: wait for the first text.
  const deadline = Date.now() + firstMs;
  try {
    while (!pending.length) {
      const left = deadline - Date.now();
      if (left <= 0) return fail(200, "no text in time");
      if (!(await pump(left))) break;
    }
  } catch (e) { return fail(200, e.message); }
  if (isJson && !pending.length) {
    // Provider ignored stream:true and sent one JSON answer.
    try {
      const j = JSON.parse(raw);
      const t = p.kind === "gemini" ? geminiEvent(Array.isArray(j) ? j[0] : j).text : tokText(j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content);
      if (t) pending.push(t);
    } catch { /* fall through */ }
  }
  if (!pending.length) { if (buf) eat(buf); }
  if (!pending.length) return fail(200, finish === "BLOCKED" ? "blocked" : "empty answer");
  // Phase 2: hand over a stream that starts with what we already have.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const flush = () => { while (pending.length) controller.enqueue(enc.encode(pending.shift())); };
      try {
        flush();
        while (await pump(IDLE_MS)) flush();
        if (buf) eat(buf);
        flush();
        if (finish && finish !== "ERROR") controller.enqueue(enc.encode("\u0000" + finish));
      } catch { controller.enqueue(enc.encode("\u0000CUT")); }
      finally { try { controller.close(); } catch { /* closed */ } ctl.abort(); }
    },
    cancel() { ctl.abort(); }
  });
  return { ok: true, stream };
}

export async function POST(request) {
  const ids = configured();
  if (!ids.length) return json({ error: "not_configured" }, 503);

  // Only our own page may call this endpoint from a browser.
  const origin = request.headers.get("origin");
  if (origin) { try { if (new URL(origin).host !== request.headers.get("host")) return json({ error: "forbidden" }, 403); } catch { return json({ error: "forbidden" }, 403); } }

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const problem = validate(body);
  if (problem) return json({ error: problem }, problem === "too large" ? 413 : 400);

  if (body.panel) {
    const FREE = ["groq", "gemini", "nvidia", "cerebras", "mistral", "openrouter", "sambanova", "cloudflare", "zai", "llm7", "nara", "cohere", "sarvam"];
    const ids = configured().filter(id => FREE.includes(id) && !cooled(id)).sort((a, b) => FREE.indexOf(a) - FREE.indexOf(b)).slice(0, 5);
    const out = Math.min(12288, Math.max(256, Number(body.maxOut) || 1400));
    const fileJob = out > 1800;
    const capChars = fileJob ? 28000 : 14000;
    const readAll = async stream => {
      const reader = stream.getReader();
      const dec = new TextDecoder();
      let text = "";
      const stop = Date.now() + (fileJob ? 36000 : 20000);
      while (text.length < capChars && Date.now() < stop) {
        const { value, done } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
      }
      try { await stream.cancel(); } catch { /* done */ }
      return text.replace(/\u0000[A-Z_]+$/, "").trim();
    };
    const answers = await Promise.all(ids.map(async id => {
      try {
        const p = PROVIDERS[id];
        const extra = { nvidia: ["meta/llama-3.3-70b-instruct"], mistral: ["ministral-8b-latest", "open-mistral-nemo"] }[id] || [];
        const models = p.models.slice();
        for (const name of extra) if (!models.includes(name)) models.push(name);
        models.sort((a, b) => rankModel(a) - rankModel(b));
        let last = { provider: id, model: models[0], text: "", error: "no answer" };
        for (const model of models.slice(0, 2)) {
          const r = await attempt(p, model, { ...body, images: (p.vision && body.images && body.images.length) ? body.images : [], maxOut: out }, request.signal, fileJob ? 26000 : 12000);
          if (!r.ok) {
            const raw = String(r.error || "");
            last = { provider: id, model, text: "", error: /rate limit|429|1300/i.test(raw) ? "rate limit" : "no answer" };
            if (/rate limit|429|1300/i.test(raw)) continue;
            break;
          }
          const text = await readAll(r.stream);
          if (text && !/^\s*\{"object"\s*:\s*"error"/i.test(text)) return { provider: id, model, text, error: "" };
          last = { provider: id, model, text: "", error: "empty answer" };
        }
        if (last.error === "rate limit") cool(id, 60 * 1000);
        return last;
      } catch {
        return { provider: id, model: "", text: "", error: "no answer" };
      }
    }));
    return json({ answers });
  }

  const wantsVision = Boolean(body.images && body.images.length);
  let sawLimit = false;
  const tried = [];
  if (body.race) { // Fast (pendrive ⚡): the models that answered quickest lately go first, and the two quickest race; paid ones only as a last resort
    const pairs = fastPairs(ids, wantsVision, !!body.freeOnly);
    const win = (r, id, model) => { console.log(`answered (fast) by ${id}/${model}` + (tried.length ? ` after: ${tried.join(" | ")}` : "")); return new Response(r.stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ai-provider": `${id}/${model}` } }); };
    const timed = async ([id, model], signal) => { const t0 = Date.now(); const r = await attempt(PROVIDERS[id], model, body, signal, Math.min(FIRST_TEXT_MS, 8000)); speedNote(id, model, r.ok ? Date.now() - t0 : null); if (!r.ok) { if (quotaError(r.status, r.error)) { sawLimit = true; cool(id, 60 * 1000); } tried.push(`${id}/${model}: ${r.status || ""} ${r.error}`.trim()); } return { r, id, model }; };
    const head = pairs.slice(0, 2), rest = pairs.slice(2);
    if (head.length) {
      const ctls = head.map(() => new AbortController());
      if (request.signal) request.signal.addEventListener("abort", () => ctls.forEach(c => c.abort()), { once: true });
      const runs = head.map((pr, i) => timed(pr, ctls[i].signal).then(x => { if (!x.r.ok) throw x; return { ...x, i }; }));
      try {
        const w = await Promise.any(runs);
        runs.forEach((pr, i) => { if (i !== w.i) pr.then(x => { try { x.r.stream.cancel(); } catch { /* done */ } }, () => {}); });
        ctls.forEach((c, i) => { if (i !== w.i) c.abort(); });
        return win(w.r, w.id, w.model);
      } catch { /* both failed: go on in order */ }
    }
    for (const pr of rest) {
      if (request.signal && request.signal.aborted) return json({ error: "cancelled" }, 499);
      const x = await timed(pr, request.signal); if (x.r.ok) return win(x.r, x.id, x.model);
    }
    return json({ error: sawLimit ? "rate_limited" : "upstream", tried: tried.length }, sawLimit ? 429 : 502);
  }
  // Normal mode: one model at a time, quickest recent first-text first; stalled/failed models sit out 3 min; a short first-text wait,
  // then (only if every model missed it) the first few are retried with the long wait.
  const pairs = fastPairs(ids, wantsVision, !!body.freeOnly);
  const order = [...pairs.filter(([id, m]) => !mCooled(id + "/" + m)), ...pairs.filter(([id, m]) => mCooled(id + "/" + m))];
  if (body.deep || body.smart) {
    order.sort((a, b) => rankModel(a[1]) - rankModel(b[1]));
  }
  const slow = [];
  for (const [i, [id, model]] of order.entries()) {
    if (request.signal && request.signal.aborted) return json({ error: "cancelled" }, 499);
    const first = body.deep ? 22000 : body.smart ? 14000 : body.fast ? Math.min(FIRST_TEXT_MS, 8000) : NORMAL_FIRST_MS;
    const t0 = Date.now(); const r = await attempt(PROVIDERS[id], model, body, request.signal, first);
    speedNote(id, model, r.ok ? Date.now() - t0 : null);
    if (r.ok) {
      modelCool.delete(id + "/" + model);
      console.log(`answered by ${id}/${model} in ${Date.now() - t0} ms` + (tried.length ? ` after: ${tried.join(" | ")}` : ""));
      return new Response(r.stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ai-provider": `${id}/${model}` } });
    }
    modelCool.set(id + "/" + model, Date.now() + 3 * 60 * 1000);
    if (quotaError(r.status, r.error)) { sawLimit = true; cool(id, 60 * 1000); } else if (/in time|stalled|no text/i.test(String(r.error))) slow.push([id, model]);
    tried.push(`${id}/${model}: ${r.status || ""} ${r.error}`.trim());
    if (i >= (body.deep ? 16 : body.smart ? 8 : 11) && slow.length) break; // don't walk the whole list at 4 s each
  }
  for (const [id, model] of slow.slice(0, 2)) { // everyone missed the short wait: give the quickest stallers the long wait
    if (request.signal && request.signal.aborted) return json({ error: "cancelled" }, 499);
    const r = await attempt(PROVIDERS[id], model, body, request.signal, FIRST_TEXT_MS);
    if (r.ok) { console.log(`answered by ${id}/${model} (long wait) after: ${tried.join(" | ")}`); return new Response(r.stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ai-provider": `${id}/${model}` } }); }
    tried.push(`${id}/${model} (long): ${r.status || ""} ${r.error}`.trim());
  }
  if (wantsVision && !tried.length) return json({ error: "no_vision" }, 422);
  console.warn("all providers failed:\n  " + tried.join("\n  "));
  return json({ error: sawLimit ? "rate_limited" : "upstream", tried: tried.length }, sawLimit ? 429 : 502);
}
