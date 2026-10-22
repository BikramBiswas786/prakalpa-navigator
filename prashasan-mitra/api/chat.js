// Prashasan Mitra: chat endpoint for the public website.
// Streams an answer from the Gemini API (free tier) as plain text.
// Set GEMINI_API_KEY in the Vercel project; GEMINI_MODEL is optional.

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const LIMITS = { system: 80000, message: 120000, total: 300000, turns: 40, images: 4, imageB64: 7000000 };
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const json = (body, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

export function GET() {
  return json({ configured: Boolean(process.env.GEMINI_API_KEY), model: MODEL });
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

export async function POST(request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "not_configured" }, 503);

  // Only our own page may call this endpoint from a browser.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return json({ error: "forbidden" }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const problem = validate(body);
  if (problem) return json({ error: problem }, problem === "too large" ? 413 : 400);

  // Gemini wants alternating user/model turns starting with user.
  const contents = [];
  for (const m of body.messages) {
    const role = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n\n" + m.content;
    else contents.push({ role, parts: [{ text: m.content }] });
  }
  if (contents[0].role !== "user") contents.shift();
  for (const im of body.images || []) contents[contents.length - 1].parts.push({ inline_data: { mime_type: im.mime, data: im.data } });

  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: body.system }] },
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
    }),
    signal: request.signal
  }).catch(() => null);

  if (!upstream) return json({ error: "upstream" }, 502);
  if (!upstream.ok) {
    const status = upstream.status === 429 ? 429 : 502;
    return json({ error: status === 429 ? "rate_limited" : "upstream", status: upstream.status }, status);
  }

  // Turn Gemini's server-sent events into plain text. A final "\u0000FLAG"
  // tells the page when the answer was cut short or blocked.
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      let buf = "", finish = "";
      const handle = line => {
        if (!line.startsWith("data:")) return;
        let ev;
        try { ev = JSON.parse(line.slice(5)); } catch { return; }
        const cand = ev.candidates && ev.candidates[0];
        if (ev.promptFeedback && ev.promptFeedback.blockReason) finish = "BLOCKED";
        if (!cand) return;
        const text = (cand.content && cand.content.parts || []).map(p => p.thought ? "" : (p.text || "")).join("");
        if (text) controller.enqueue(enc.encode(text));
        if (cand.finishReason === "MAX_TOKENS") finish = "MAX_TOKENS";
        else if (["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(cand.finishReason)) finish = "BLOCKED";
      };
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split(/\r?\n/);
          buf = lines.pop();
          lines.forEach(handle);
        }
        handle(buf);
        if (finish) controller.enqueue(enc.encode("\u0000" + finish));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    }
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
