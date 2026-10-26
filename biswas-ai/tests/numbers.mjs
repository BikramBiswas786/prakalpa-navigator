// Regression: numbers, dates and memo numbers must survive every AI provider path (Fast and normal) end to end.
// Bug seen live: Cloudflare streamed number tokens as JSON numbers and the parser dropped them ("Memo No. /FR", "Rs. ,,,000", "[]").
// Run: node tests/numbers.mjs   (no keys needed: provider calls are stubbed; fake key names only)
import { spawn, spawnSync } from "node:child_process"; import path from "node:path"; import { fileURLToPath } from "node:url"; import fs from "node:fs";
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), STUB = path.join(DIR, "tests/fixtures/num-stub.mjs");
const { EXPECT } = await import(STUB);
const KEYS = { llm7: "LLM7_API_KEY", nara: "NARA_API_KEY", groq: "GROQ_API_KEY", gemini: "GEMINI_API_KEY", nvidia: "NVIDIA_API_KEY", mistral: "MISTRAL_API_KEY", openrouter: "OPENROUTER_API_KEY", cloudflare: "CLOUDFLARE_API_TOKEN", zai: "ZAI_API_KEY", cerebras: "CEREBRAS_API_KEY", sambanova: "SAMBANOVA_API_KEY", openai: "OPENAI_API_KEY" };
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
if (process.argv[2] === "--one") { // child: one provider, one mode
  await import(STUB); const chat = await import(path.join(DIR, "api/chat.js"));
  const r = await chat.POST(new Request("http://x/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ system: "s", messages: [{ role: "user", content: "q" }], maxOut: 100, ...(process.argv[4] === "fast" ? { fast: true, race: true } : {}) }) }));
  const t = (await r.text()).replace(/\u0000[A-Z_]*/g, "").trim(); process.stdout.write(JSON.stringify({ status: r.status, t, prov: r.headers.get("x-ai-provider") })); process.exit(0);
}
// 1) parsers
const chat = await import(path.join(DIR, "api/chat.js"));
ok(chat._test.openaiEvent({ choices: [{ delta: { content: 47 } }] }).text === "47", "openai-style delta with a JSON number keeps the digits");
ok(chat._test.geminiEvent({ candidates: [{ content: { parts: [{ text: 2026 }] } }] }).text === "2026", "gemini part with a JSON number keeps the digits");
// 2) every provider, Fast and normal, through /api/chat
for (const [id, key] of Object.entries(KEYS)) for (const mode of ["normal", "fast"]) {
  const env = { ...process.env, PROVIDER_ORDER: id, FAST_ORDER: id, [key]: "test-key-not-real", CLOUDFLARE_ACCOUNT_ID: id === "cloudflare" ? "testaccount" : "" };
  for (const k of Object.values(KEYS)) if (k !== key) delete env[k];
  const c = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "--one", id, mode], { env, encoding: "utf8", timeout: 60000 });
  let j = {}; try { j = JSON.parse(c.stdout.trim().split("\n").pop()); } catch (e) { j = { t: c.stdout + c.stderr }; }
  ok(j.t === EXPECT, `${id} ${mode}: ${j.t === EXPECT ? "all numbers kept" : JSON.stringify(String(j.t).slice(0, 120))}`);
}
// 3) end to end: pendrive answer (server) in Fast and normal mode
const PORT = 3000 + Math.floor(Math.random() * 900) + 4000, B = `http://localhost:${PORT}`, LOC = fs.mkdtempSync("/tmp/pdnum-");
const env = { ...process.env, PORT: String(PORT), PENDRIVE_STORAGE: "local", PENDRIVE_LOCAL_DIR: LOC, PENDRIVE_SECRET: "t".repeat(48), PROVIDER_ORDER: "cloudflare", CLOUDFLARE_API_TOKEN: "test-key-not-real", CLOUDFLARE_ACCOUNT_ID: "testaccount", NODE_OPTIONS: `--import=${STUB}` };
for (const k of Object.values(KEYS)) if (k !== "CLOUDFLARE_API_TOKEN") delete env[k]; delete env.PENDRIVE_MOCK_AI;
const srv = spawn(process.execPath, [path.join(DIR, "server.js")], { env, stdio: "ignore" });
try {
  for (let i = 0; i < 50; i++) { try { await fetch(B + "/healthz"); break; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  const post = async (p, body, tok) => { const r = await fetch(B + p, { method: "POST", headers: { "content-type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}) }, body: JSON.stringify(body) }); return r; };
  const cr = await (await post("/api/pd/create", { name: "zz-test-numbers-" + Date.now().toString(36), pin: "482915" })).json(); const tok = cr.token;
  const text = "Flood Relief Order. Memo No. 77/FR dated 05-04-2026. Compensation Rs. 3,47,25,000. Target 4,56,789 persondays.";
  const b = new TextEncoder().encode(text); const i = await (await post("/api/pd/upload/init", { path: "order.txt", size: b.length, type: "text/plain" }, tok)).json();
  const u1 = i.urls[1], et = (await fetch(u1.startsWith("http") ? u1 : B + u1, { method: "PUT", body: b })).headers.get("etag");
  const fr = await (await post("/api/pd/upload/complete", { fileId: i.fileId, uploadId: i.uploadId, parts: [{ n: 1, etag: et }] }, tok)).json();
  await post("/api/pd/text-batch", { items: [{ id: fr.id, text }] }, tok);
  for (const fast of [false, true]) {
    const r = await post("/api/pd/ai", { question: "What is the memo number, date, compensation and target in order.txt?", fast, lang: "en" }, tok);
    const lines = (await r.text()).split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return {}; } });
    const ans = lines.find(e => e.type === "answer") || lines.find(e => e.type === "error") || {};
    const got = String(ans.text || ans.error || "");
    ok(["77/FR", "05-04-2026", "3,47,25,000", "4,56,789", "[1]"].every(s => got.includes(s)), `pendrive answer ${fast ? "Fast" : "normal"} keeps memo no., date, amount, citation: ${JSON.stringify(got.slice(0, 120))}`);
  }
} finally { srv.kill(); }
console.log(fails ? fails + " FAILED" : "ALL PASS"); process.exit(fails ? 1 : 0);
