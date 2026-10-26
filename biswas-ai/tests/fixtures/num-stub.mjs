// Test-only: answers every AI provider call with a stream whose number tokens arrive as JSON numbers
// (Cloudflare Workers AI does this), so tests can check that no digit is lost on the way to the screen.
export const TOKENS = ["Memo No. ", 77, "/FR, dated 05-04-", 2026, ", Rs. ", 3, ",", 47, ",", 25, ",000, target ", 4, ",", 56, ",", 789, " [", 1, "]"];
export const EXPECT = "Memo No. 77/FR, dated 05-04-2026, Rs. 3,47,25,000, target 4,56,789 [1]";
const real = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url && url.url || url);
  if (!/\/chat\/completions|generativelanguage|streamGenerateContent/.test(u)) return real(url, init);
  const gem = /generativelanguage/.test(u);
  const stream = /"stream":true/.test(String(init && init.body || "")) || gem && /stream/i.test(u);
  if (!stream) return new Response(JSON.stringify(gem ? { candidates: [{ content: { parts: [{ text: TOKENS.join("") }] } }] } : { choices: [{ message: { content: TOKENS.join("") } }] }), { headers: { "content-type": "application/json" } });
  const lines = TOKENS.map(t => "data: " + JSON.stringify(gem ? { candidates: [{ content: { parts: [{ text: t }] } }] } : { choices: [{ delta: { content: t } }] }) + "\n\n").join("") + (gem ? "" : 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n');
  return new Response(lines, { headers: { "content-type": "text/event-stream" } });
};
