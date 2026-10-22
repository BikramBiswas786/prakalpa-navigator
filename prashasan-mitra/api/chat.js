// Prashasan Mitra: chat endpoint for the public website.
// Tries free AI providers one after another. When one is out of quota or
// fails before answering, the next is used, so the free limits add up.
// Every provider is optional: set the API keys you have in Vercel.
//
//   GEMINI_API_KEY       Google AI Studio (free, no card)
//   MISTRAL_API_KEY      Mistral "Experiment" plan (free, phone verification)
//   GROQ_API_KEY         Groq (free, no card; each model has its own daily quota)
//   OPENROUTER_API_KEY   OpenRouter ":free" models
//   GITHUB_MODELS_TOKEN  GitHub Models (free with a GitHub account)
//   CEREBRAS_API_KEY     Cerebras (trial credit)
//   SARVAM_API_KEY       Sarvam AI (Indian; strong Bengali; signup credit)
//
// Optional: PROVIDER_ORDER="gemini,mistral,groq,..." and <NAME>_MODELS
// (comma-separated) to change models without touching code.

const env = name => (process.env[name] || "").trim();
const list = (name, fallback) => (env(name) || fallback).split(",").map(s => s.trim()).filter(Boolean);

const PROVIDERS = {
  gemini: { key: "GEMINI_API_KEY", kind: "gemini", vision: true, models: list("GEMINI_MODELS", env("GEMINI_MODEL") || "gemini-flash-latest,gemini-flash-lite-latest") },
  mistral: { key: "MISTRAL_API_KEY", kind: "openai", vision: true, url: "https://api.mistral.ai/v1/chat/completions", models: list("MISTRAL_MODELS", "mistral-medium-latest,mistral-small-latest") },
  groq: { key: "GROQ_API_KEY", kind: "openai", url: "https://api.groq.com/openai/v1/chat/completions", models: list("GROQ_MODELS", "openai/gpt-oss-120b,llama-3.3-70b-versatile,openai/gpt-oss-20b") },
  openrouter: { key: "OPENROUTER_API_KEY", kind: "openai", url: "https://openrouter.ai/api/v1/chat/completions", models: list("OPENROUTER_MODELS", "meta-llama/llama-3.3-70b-instruct:free,openai/gpt-oss-120b:free") },
  github: { key: "GITHUB_MODELS_TOKEN", kind: "openai", vision: true, url: "https://models.github.ai/inference/chat/completions", models: list("GITHUB_MODELS", "openai/gpt-4.1-mini,openai/gpt-4o-mini") },
  cerebras: { key: "CEREBRAS_API_KEY", kind: "openai", url: "https://api.cerebras.ai/v1/chat/completions", models: list("CEREBRAS_MODELS", "gpt-oss-120b") },
  sarvam: { key: "SARVAM_API_KEY", kind: "openai", url: "https://api.sarvam.ai/v1/chat/completions", auth: "api-subscription-key", models: list("SARVAM_MODELS", "sarvam-105b") }
};
const ORDER = list("PROVIDER_ORDER", "gemini,mistral,groq,openrouter,github,cerebras,sarvam").filter(id => PROVIDERS[id]);

const LIMITS = { system: 80000, message: 120000, total: 300000, turns: 40, images: 4, imageB64: 7000000 };
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_OUT = 8192;

const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const configured = () => ORDER.filter(id => env(PROVIDERS[id].key));

export function GET() {
  const ids = configured();
  return json({ configured: ids.length > 0, providers: ids });
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
  if (p === PROVIDERS.openrouter) { headers["x-title"] = "Prashasan Mitra"; }
  return fetch(p.url, { method: "POST", headers, body: JSON.stringify(payload), signal });
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

function relay(upstream, parse) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buf = "", finish = "";
      const handle = line => {
        line = line.trim();
        if (!line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") return;
        let ev; try { ev = JSON.parse(data); } catch { return; }
        const r = parse(ev);
        if (r.text) controller.enqueue(enc.encode(r.text));
        if (r.finish) finish = r.finish;
      };
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split(/\r?\n/); buf = lines.pop();
          lines.forEach(handle);
        }
        handle(buf);
        if (finish) controller.enqueue(enc.encode("\u0000" + finish));
        controller.close();
      } catch (e) { controller.error(e); }
    }
  });
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
      let upstream;
      try {
        upstream = await (p.kind === "gemini" ? geminiRequest : openaiRequest)(p, model, env(p.key), body, request.signal);
      } catch { tried.push(`${id}:${model}:network`); continue; }
      if (upstream.ok && upstream.body) {
        const stream = relay(upstream, p.kind === "gemini" ? geminiEvent : openaiEvent);
        return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-ai-provider": `${id}/${model}` } });
      }
      if (upstream.status === 429) sawLimit = true;
      tried.push(`${id}:${model}:${upstream.status}`);
      try { await upstream.body?.cancel(); } catch { /* ignore */ }
    }
  }
  if (wantsVision && !tried.length) return json({ error: "no_vision" }, 422);
  console.warn("all providers failed", tried.join(" "));
  return json({ error: sawLimit ? "rate_limited" : "upstream", tried: tried.length }, sawLimit ? 429 : 502);
}
