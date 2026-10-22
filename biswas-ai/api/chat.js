// Biswas AI for Office: chat endpoint (used by server.js).
// Tries free AI providers one after another. When one is out of quota or
// fails before answering, the next is used, so the free limits add up.
// Every provider is optional: set the API keys you have in Vercel.
//
//   GEMINI_API_KEY       Google AI Studio (free, no card)
//   NVIDIA_API_KEY       NVIDIA build.nvidia.com developer API (free): Llama and Kimi models
//   GROQ_API_KEY         Groq (free, no card; each model has its own daily quota): Llama, gpt-oss
//   MISTRAL_API_KEY      Mistral "Experiment" plan (free, phone verification)
//   OPENROUTER_API_KEY   OpenRouter ":free" models: Kimi, Llama
//   CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN   Cloudflare Workers AI (free daily allowance): Llama
//   GITHUB_MODELS_TOKEN  GitHub Models (free with a GitHub account)
//   CEREBRAS_API_KEY     Cerebras (trial credit)
//   SARVAM_API_KEY       Sarvam AI (Indian; strong Bengali; signup credit)
//   KIMI_API_KEY         Moonshot Kimi API, official Kimi K3 (paid: $1 minimum top-up)
//
// Optional: PROVIDER_ORDER="gemini,nvidia,groq,..." and <NAME>_MODELS
// (comma-separated) to change models without touching code.

const env = name => (process.env[name] || "").trim();
const list = (name, fallback) => (env(name) || fallback).split(",").map(s => s.trim()).filter(Boolean);

const PROVIDERS = {
  gemini: { key: "GEMINI_API_KEY", kind: "gemini", vision: true, models: list("GEMINI_MODELS", env("GEMINI_MODEL") || "gemini-flash-latest,gemini-flash-lite-latest") },
  nvidia: { key: "NVIDIA_API_KEY", kind: "openai", url: "https://integrate.api.nvidia.com/v1/chat/completions", models: list("NVIDIA_MODELS", "moonshotai/kimi-k2-instruct,deepseek-ai/deepseek-v3.1,meta/llama-4-maverick-17b-128e-instruct,meta/llama-3.3-70b-instruct") },
  mistral: { key: "MISTRAL_API_KEY", kind: "openai", vision: true, url: "https://api.mistral.ai/v1/chat/completions", models: list("MISTRAL_MODELS", "mistral-medium-latest,mistral-small-latest") },
  groq: { key: "GROQ_API_KEY", kind: "openai", url: "https://api.groq.com/openai/v1/chat/completions", models: list("GROQ_MODELS", "openai/gpt-oss-120b,llama-3.3-70b-versatile,openai/gpt-oss-20b") },
  openrouter: { key: "OPENROUTER_API_KEY", kind: "openai", url: "https://openrouter.ai/api/v1/chat/completions", models: list("OPENROUTER_MODELS", "moonshotai/kimi-k2:free,meta-llama/llama-3.3-70b-instruct:free,openai/gpt-oss-120b:free") },
  cloudflare: { key: "CLOUDFLARE_API_TOKEN", also: "CLOUDFLARE_ACCOUNT_ID", kind: "openai", url: () => `https://api.cloudflare.com/client/v4/accounts/${env("CLOUDFLARE_ACCOUNT_ID")}/ai/v1/chat/completions`, models: list("CLOUDFLARE_MODELS", "@cf/meta/llama-3.3-70b-instruct-fp8-fast,@cf/meta/llama-4-scout-17b-16e-instruct") },
  github: { key: "GITHUB_MODELS_TOKEN", kind: "openai", vision: true, url: "https://models.github.ai/inference/chat/completions", models: list("GITHUB_MODELS", "openai/gpt-4.1-mini,openai/gpt-4o-mini") },
  cerebras: { key: "CEREBRAS_API_KEY", kind: "openai", url: "https://api.cerebras.ai/v1/chat/completions", models: list("CEREBRAS_MODELS", "gpt-oss-120b") },
  sarvam: { key: "SARVAM_API_KEY", kind: "openai", url: "https://api.sarvam.ai/v1/chat/completions", auth: "api-subscription-key", models: list("SARVAM_MODELS", "sarvam-105b") },
  kimi: { key: "KIMI_API_KEY", kind: "openai", url: "https://api.moonshot.ai/v1/chat/completions", models: list("KIMI_MODELS", "kimi-k3") }
};
const ORDER = list("PROVIDER_ORDER", "gemini,nvidia,groq,mistral,openrouter,cloudflare,github,cerebras,sarvam,kimi").filter(id => PROVIDERS[id]);

const LIMITS = { system: 80000, message: 120000, total: 300000, turns: 40, images: 4, imageB64: 7000000 };
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_OUT = 8192;
// A provider that has not produced any text within FIRST_TEXT_MS is skipped and
// the next one is tried; a stream that goes silent for IDLE_MS is ended.
const FIRST_TEXT_MS = Number(env("FIRST_TEXT_MS")) || 25000;
const IDLE_MS = Number(env("IDLE_MS")) || 60000;

const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const configured = () => ORDER.filter(id => env(PROVIDERS[id].key) && (!PROVIDERS[id].also || env(PROVIDERS[id].also)));

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
    body: JSON.stringify({ system_instruction: { parts: [{ text: body.system }] }, contents, generationConfig: { temperature: 0.3, maxOutputTokens: MAX_OUT } }),
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
  const payload = { model, messages, stream: true, temperature: 0.3, max_tokens: MAX_OUT };
  if (/gpt-oss/.test(model) && p !== PROVIDERS.openrouter) payload.reasoning_effort = "low";
  const headers = { "content-type": "application/json" };
  if (p.auth) headers[p.auth] = key; else headers.authorization = `Bearer ${key}`;
  if (p === PROVIDERS.openrouter) { headers["x-title"] = "Biswas AI for Office"; }
  return fetch(typeof p.url === "function" ? p.url() : p.url, { method: "POST", headers, body: JSON.stringify(payload), signal });
}

/* ---------- stream parsers: SSE line -> {text, finish} ---------- */
function geminiEvent(ev) {
  const out = { text: "", finish: "" };
  if (ev.promptFeedback && ev.promptFeedback.blockReason) out.finish = "BLOCKED";
  const cand = ev.candidates && ev.candidates[0];
  if (!cand) return out;
  out.text = ((cand.content && cand.content.parts) || []).map(p => (p.thought ? "" : p.text || "")).join("");
  if (cand.finishReason === "MAX_TOKENS") out.finish = "MAX_TOKENS";
  else if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(cand.finishReason)) out.finish = "BLOCKED";
  return out;
}
function openaiEvent(ev) {
  const out = { text: "", finish: "" };
  const ch = ev.choices && ev.choices[0];
  if (!ch) return out;
  const c = ch.delta && ch.delta.content;
  out.text = typeof c === "string" ? c : Array.isArray(c) ? c.map(x => x.text || "").join("") : "";
  if (ch.finish_reason === "length") out.finish = "MAX_TOKENS";
  else if (ch.finish_reason === "content_filter") out.finish = "BLOCKED";
  return out;
}

const timeout = (ms, label) => new Promise((_, rej) => setTimeout(() => rej(new Error(label)), ms));

// Sends one request and waits for the first piece of text. Resolves with
// {ok: true, stream} (a text stream starting with that first piece) or
// {ok: false, status, error} so the caller can move on to the next model.
async function attempt(p, model, body, signal, firstMs = FIRST_TEXT_MS) {
  const ctl = new AbortController();
  const stop = () => ctl.abort();
  if (signal) signal.addEventListener("abort", stop, { once: true });
  const fail = (status, error) => { ctl.abort(); return { ok: false, status, error: String(error || "").slice(0, 300) }; };
  let upstream;
  try {
    upstream = await Promise.race([
      (p.kind === "gemini" ? geminiRequest : openaiRequest)(p, model, env(p.key), body, ctl.signal),
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
      const t = p.kind === "gemini" ? geminiEvent(Array.isArray(j) ? j[0] : j).text : ((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "");
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

  const wantsVision = Boolean(body.images && body.images.length);
  let sawLimit = false;
  const tried = [];
  for (const id of ids) {
    const p = PROVIDERS[id];
    if (wantsVision && !p.vision) continue;
    for (const model of p.models) {
      if (request.signal && request.signal.aborted) return json({ error: "cancelled" }, 499);
      const r = await attempt(p, model, body, request.signal);
      if (r.ok) {
        console.log(`answered by ${id}/${model}` + (tried.length ? ` after: ${tried.join(" | ")}` : ""));
        return new Response(r.stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ai-provider": `${id}/${model}` } });
      }
      if (r.status === 429) sawLimit = true;
      tried.push(`${id}/${model}: ${r.status || ""} ${r.error}`.trim());
    }
  }
  if (wantsVision && !tried.length) return json({ error: "no_vision" }, 422);
  console.warn("all providers failed:\n  " + tried.join("\n  "));
  return json({ error: sawLimit ? "rate_limited" : "upstream", tried: tried.length }, sawLimit ? 429 : 502);
}
