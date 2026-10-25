// v115: cited answers. Pure checks of api/rag.js, then the API lifecycle (upload → chunks → ask → cites → delete),
// strict "not found", the spreadsheet aggregate engine, lazy migration of old indexes (local only) and AI on share links.
// Run against a server with PENDRIVE_MOCK_AI=1 (local) or BASE=<live url> (the live model answers instead of the mock).
import fs from "node:fs"; import path from "node:path";
import * as rag from "../api/rag.js";
const B = process.env.BASE || "http://localhost:3997", LIVE = !!process.env.BASE, LOCAL = process.env.PENDRIVE_LOCAL_DIR || (LIVE ? "" : "/tmp/pdl");
let tok = "";
const post = async (p, body = {}, h = {}) => { const r = await fetch(B + p, { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify(body) }); return { status: r.status, r, j: r.headers.get("content-type")?.includes("json") ? await r.json().catch(() => ({})) : null }; };
const api = (op, body) => post("/api/pd/" + op, body, tok ? { authorization: "Bearer " + tok } : {});
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const put = async (url, bytes) => (await fetch(url.startsWith("http") ? url : B + url, { method: "PUT", body: bytes })).headers.get("etag");
const up = async (p, text, note) => { const b = new TextEncoder().encode(text || "x"); const i = (await api("upload/init", { path: p, size: b.length, type: "application/octet-stream" })).j; const r = await api("upload/complete", { fileId: i.fileId, uploadId: i.uploadId, parts: [{ n: 1, etag: await put(i.urls[1], b) }] }); await api("text-batch", { items: [{ id: r.j.id, text: text || "", note }] }); return r.j; };
const ask = async (question, scope = {}, lang = "en") => { const r = await fetch(`${B}/api/pd/ai`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tok }, body: JSON.stringify({ question, lang, mode: "ask", scope }) }); const ev = (await r.text()).trim().split("\n").map(l => JSON.parse(l)); return { ...(ev.find(e => e.type === "answer") || ev.find(e => e.type === "error") || {}), ev }; };
const sum = a => `${(a.text || a.error || "").slice(0, 90).replace(/\n/g, " ")} | cites ${JSON.stringify((a.cites || []).map(c => [c.n, c.path, c.loc]))}`;

/* ---- texts as the browser extracts them (pdf.js pages, the docx worker's headings, SheetJS rows) ---- */
const filler = i => `Office procedure note ${i}: files must be kept in the correct folder and every register updated at the end of the day.`;
const PAGES = [["Introduction", "This manual explains how the block office handles records.", filler(1), filler(2)],
  ["Leave rules", "Casual leave is limited to 14 days in a calendar year for every employee.", "Earned leave can be carried forward up to 300 days.", filler(3)],
  ["Sales review", "The regional sales committee met on 2 April 2026.", "The March total of 4200 was confirmed for the east and west regions together.", filler(4)],
  ["Contacts", "The grievance officer can be reached at the district office on weekdays.", filler(5), filler(6)]];
const PDF = PAGES.map((p, i) => `\n[Page ${i + 1}]\nACME Block Office Manual - Internal\n${p.join("\n")}\nPage ${i + 1} of 4\n`).join("");
const DOCX = "# Annual Report\nIntroduction paragraph for the report.\n\n## Sales\nSales grew strongly in the eastern region.\n\n### March\nMarch sales were driven by the Kolkata office.\n\n## Costs\nCosts stayed flat.\nItem\nCost\nRent\n5000";
const XLSX = "[Sheet: Sales @1]\nDate\tRegion\tAmount\n2026-02-10\tEast\t500\n2026-03-01\tEast\t1200\n2026-03-15\tWest\t800\n2026-03-28\tEast\t2200\n2026-04-02\tWest\t900\n\n[Sheet: Costs @1]\nItem\tCost\nRent\t5000\nPaper\t300";

/* ---- pure ---- */
{
  const b = rag.build(PDF);
  ok(b.kind === "pdf" && b.chunks.length === 4 && b.chunks.every((c, i) => c.loc.page === i + 1), "pdf: one chunk per page with its page number");
  ok(b.chunks.every(c => !/ACME Block Office Manual|Page \d of 4/.test(c.t)), `pdf: repeated header and "Page n of 4" footer removed (${b.removed} lines)`);
  const d = rag.build(DOCX).chunks;
  ok(d.find(c => /Kolkata/.test(c.t))?.loc.h === "Annual Report › Sales › March" && d.find(c => /flat/.test(c.t))?.loc.h === "Annual Report › Costs", "docx: heading path per chunk");
  const x = rag.build(XLSX);
  ok(x.chunks[0].loc.sheet === "Sales" && x.chunks[0].loc.r1 === 2 && x.chunks[0].loc.r2 === 6 && /Date \| Region \| Amount/.test(x.chunks[0].t), "xlsx: chunk per sheet with row range and header");
  const big = Array.from({ length: 400 }, (_, i) => `Sentence ${i} is about the budget for district ${i % 9} and block ${i % 5}.`).join(" ");
  const ch = rag.build(big).chunks; const tk = ch.slice(0, -1).map(c => rag.toks(c.t)); const total = rag.toks(big), sumT = ch.reduce((a, c) => a + rag.toks(c.t), 0);
  ok(tk.every(n => n >= 400 && n <= 800), `chunks are 400–800 tokens (${tk.join(",")})`);
  const ov = (sumT - total) / sumT; ok(ov >= 0.08 && ov <= 0.22, `overlap ≈ 10–20% (${(ov * 100).toFixed(1)}%)`);
  const sheets = [{ id: "s", path: "sales.xlsx", sheets: x.sheets }]; const T = (await import("../api/pendrive.js")).tokens;
  const A = q => rag.aggregate(q, sheets, T);
  ok(A("total sales in March").value === 4200 && A("total sales in March").rows.join() === "3,4,5", "aggregate: total sales in March = 4200 (rows 3–5)");
  ok(A("মার্চে মোট বিক্রি কত?").value === 4200, "aggregate: Bengali মার্চে মোট বিক্রি = 4200");
  ok(A("average amount for East").value === 1300 && A("how many sales rows in March").value === 3 && A("highest amount").value === 2200 && A("total cost").value === 5300, "aggregate: avg / count / max / other sheet");
  ok(A("what is the capital of France") === null && A("total sales; process.exit()").value === 5600, "aggregate: no op → nothing; code-like text is just words (no eval)");
}

/* ---- API lifecycle ---- */
const PDN = (process.env.PDPREFIX || "zz-test-rag-") + Date.now(); console.log("pendrive " + PDN);
let r = await api("create", { name: PDN, pin: "482915" }); tok = r.j.token; ok(r.status === 200 && tok, "create test pendrive");
const fPdf = await up("Docs/manual.pdf", PDF), fDoc = await up("Docs/report.docx", DOCX), fX = await up("Docs/sales.xlsx", XLSX), fN = await up("Docs/notes.txt", "Shopping list: tea, sugar, rice.");
const fScan = await up("Docs/scan.pdf", "", "scanned");
const list = (await api("list")).j.files; const scanRow = list.find(f => f.id === fScan.id);
ok(scanRow && !scanRow.text && scanRow.note === "scanned", "scanned PDF is marked \"scanned, no text\"");

let a = await ask("What is the total sales in March?"); console.log("   " + sum(a));
ok(/4200/.test(a.text) && a.cites[0] && a.cites[0].path === "Docs/sales.xlsx" && a.cites[0].loc.sheet === "Sales" && (a.cites[0].loc.rows || []).join() === "3,4,5", "total sales in March → 4200, cited to sales.xlsx › Sales rows 3–5");
a = await ask("মার্চে মোট বিক্রি কত?", {}, "bn"); console.log("   " + sum(a));
ok(/4200|৪২০০/.test(a.text) && a.cites.some(c => c.path === "Docs/sales.xlsx"), "Bengali total question → 4200 with a sales.xlsx cite");
a = await ask("How many days of casual leave are allowed per year?"); console.log("   " + sum(a));
const cp = a.cites.find(c => c.path === "Docs/manual.pdf");
ok(cp && cp.loc.page === 2 && /Casual leave/i.test(cp.quote), "leave question → manual.pdf page 2 with the passage quoted");
ok(/\[\d\]/.test(a.text), "answer text carries [n] markers");
a = await ask("Which office drove the March sales?"); console.log("   " + sum(a));
ok(a.cites.some(c => c.path === "Docs/report.docx" && c.loc.h === "Annual Report › Sales › March"), "docx cite has the heading path");
a = await ask("What is the population of Mars?"); console.log("   " + sum(a));
ok(a.notFound === true && !(a.cites || []).length && /not found/i.test(a.text), "weak evidence → strict \"not found in your files\"");
a = await ask("মঙ্গল গ্রহের জনসংখ্যা কত?", {}, "bn"); ok(a.notFound === true && /পাওয়া যায়নি/.test(a.text), "Bengali not-found");
a = await ask("casual leave", { ids: [fN.id] }); ok(a.notFound === true, "scope respected: the right passage outside the scope → not found");
a = await ask("summarise these files"); ok(!a.notFound && (a.cites || []).length >= 2, `overview questions are not gated (${(a.cites || []).length} cites)`);
a = await ask("what does it say?", { ids: [fScan.id] }); ok((a.noText || []).length === 1 && (a.scanned || []).length === 1, "AI on a scanned-only scope explains there is no text");

/* lazy migration of an old (pre-v115) index — local storage only */
if (LOCAL) {
  const dir = fs.readdirSync(path.join(LOCAL, "pendrives")).map(d => path.join(LOCAL, "pendrives", d)).find(d => fs.existsSync(path.join(d, "c", fPdf.id + ".json")));
  ok(!!dir, "chunk sidecar c/<id>.json written");
  fs.writeFileSync(path.join(dir, "bm25.json"), JSON.stringify({ df: {}, n: 0, len: 0, files: {} })); fs.rmSync(path.join(dir, "c"), { recursive: true, force: true });
  a = await ask("How many days of casual leave are allowed per year?");
  ok(a.cites.some(c => c.loc.page === 2) && JSON.parse(fs.readFileSync(path.join(dir, "bm25.json"))).v === 2 && fs.existsSync(path.join(dir, "c", fPdf.id + ".json")), "old index is rebuilt lazily (v2 + chunk files)");
  r = await api("delete", { ids: [fN.id], confirm: true }); ok(r.status === 200 && !fs.existsSync(path.join(dir, "c", fN.id + ".json")), "delete removes the chunk sidecar");
} else { r = await api("delete", { ids: [fN.id], confirm: true }); ok(r.status === 200, "delete a file"); }

/* AI on share links: only the shared files, cites with link-relative paths */
r = await api("share/create", { kind: "share", folders: ["Docs"], expiry: "1d", ai: true }); const sid = r.j.sid; ok(r.status === 200 && sid, "share link with AI");
const ip = { "x-forwarded-for": "10.7.6." + (Date.now() % 200) };
const T = (await post("/api/s/open", { sid }, ip)).j.token;
const sask = async (sid, token, question) => { const x = await fetch(B + "/api/s/ai", { method: "POST", headers: { "content-type": "application/json", ...ip }, body: JSON.stringify({ sid, token, question, lang: "en" }) }); const ev = (await x.text()).trim().split("\n").filter(Boolean).map(l => JSON.parse(l)); return ev.find(e => e.type === "answer") || ev.find(e => e.type === "error") || { status: x.status }; };
a = await sask(sid, T, "total sales in March"); console.log("   share " + sum(a));
const tree = new Set(((await post("/api/s/tree", { sid, token: T }, ip)).j.files || []).map(f => f.path));
ok(/4200/.test(a.text) && a.cites && a.cites[0].id === fX.id && a.cites.every(c => tree.has(c.path)), `share AI: cited answer, cite paths as the link shows them (${[...tree].slice(0, 3)})`);
r = await api("share/create", { kind: "share", ids: [fPdf.id], expiry: "1d", ai: true }); const sid2 = r.j.sid; const T2 = (await post("/api/s/open", { sid: sid2 }, ip)).j.token;
a = await sask(sid2, T2, "What is the total sales in March?"); console.log("   share2 " + sum(a));
ok(!(a.cites || []).some(c => /sales\.xlsx|report\.docx/.test(c.path)) && !/Kolkata|5600/.test(a.text || ""), "share AI never cites or reads files outside the link");
a = await sask(sid2, T2, "Which office drove the March sales?"); ok(a.notFound === true || !(a.cites || []).length || a.cites.every(c => c.path === "manual.pdf"), "share AI: unshared docx can't answer");

/* cleanup */
for (const s of [sid, sid2]) await api("share/revoke", { sid: s });
const left = (await api("list")).j.files.map(f => f.id); r = await api("delete", { ids: left, confirm: true });
ok(r.status === 200 && (await api("list")).j.files.length === 0, "cleanup: all test files deleted, links revoked");
