// Fast AI: ⚡ toggle (fast model race + streaming), per-pendrive file memory, answer cache until files change.
// Makes a zz-test pendrive with 20 files, then asks the same questions with Fast off, Fast on, and Fast on again (cache).
// Local: PENDRIVE_MOCK_AI=1 (PENDRIVE_MOCK_DELAY=ms makes the mock slow so timings mean something). Live: BASE=<url>.
import fs from "node:fs"; import path from "node:path";
const B = process.env.BASE || "http://localhost:3998", LIVE = !!process.env.BASE, LOCAL = process.env.PENDRIVE_LOCAL_DIR || (LIVE ? "" : "/tmp/pdl");
const OUT = process.env.OUT || "/tmp/fast-ai.json";
let tok = "";
const post = async (p, body = {}, h = {}) => { const r = await fetch(B + p, { method: "POST", headers: { "content-type": "application/json", ...h }, body: JSON.stringify(body) }); return { status: r.status, j: r.headers.get("content-type")?.includes("json") ? await r.json().catch(() => ({})) : null }; };
const api = (op, body) => post("/api/pd/" + op, body, tok ? { authorization: "Bearer " + tok } : {});
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const put = async (url, bytes) => (await fetch(url.startsWith("http") ? url : B + url, { method: "PUT", body: bytes })).headers.get("etag");
const up = async (p, text) => { const b = new TextEncoder().encode(text); const i = (await api("upload/init", { path: p, size: b.length, type: "text/plain" })).j; const r = await api("upload/complete", { fileId: i.fileId, uploadId: i.uploadId, parts: [{ n: 1, etag: await put(i.urls[1], b) }] }); await api("text-batch", { items: [{ id: r.j.id, text }] }); return r.j; };
async function ask(question, fast) {
  let t0, first = 0, deltas = 0, r;
  for (;;) { t0 = performance.now(); r = await fetch(`${B}/api/pd/ai`, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + tok }, body: JSON.stringify({ question, lang: "en", mode: "ask", format: "auto", scope: { branch: "" }, fast }) });
    if (r.status !== 429) break; await new Promise(z => setTimeout(z, 15000)); } // the server allows 10 AI asks a minute
  const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "", ans = null;
  for (;;) { const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i;
    while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (!l.trim()) continue; const e = JSON.parse(l);
      if (e.type === "delta") { deltas++; if (!first) first = performance.now() - t0; }
      if (e.type === "answer" || e.type === "error") { ans = e; if (!first) first = performance.now() - t0; } } }
  return { first: Math.round(first), total: Math.round(performance.now() - t0), deltas, cached: !!(ans && ans.cached), error: ans && ans.error, text: ans && ans.text || "", cites: (ans && ans.cites || []).length };
}
const FILES = [
  ["Letters/leave-application-ratan.txt", "To the Block Development Officer, Barasat II. Subject: casual leave. I, Ratan Das, clerk, request casual leave from 3 to 5 November 2026 for my sister's wedding. Yours faithfully, Ratan Das."],
  ["Letters/water-supply-complaint.txt", "Complaint from Kalyani ward 7 residents: the water supply has been irregular since 12 October 2026. The pipeline near the school is broken. Please repair it urgently."],
  ["Letters/road-repair-request.txt", "Request to the Panchayat Pradhan: the road from Duttapukur station to the high school (2.4 km) needs repair before the monsoon. Estimated cost Rs 18,50,000."],
  ["Minutes/meeting-2026-09-14.txt", "Minutes of the block level meeting held on 14 September 2026. Present: BDO, Joint BDO, 12 Panchayat Pradhans. Decisions: 1) Duare Sarkar camps from 1 October. 2) Laptop purchase for the accounts section approved. 3) Next meeting on 12 October 2026."],
  ["Minutes/meeting-2026-10-12.txt", "Minutes of 12 October 2026. The Duare Sarkar camps covered 46 villages and 8,212 applications. Pending: 311 caste certificates. The drinking water problem in Kalyani ward 7 was discussed; the PHE engineer will visit on 20 October."],
  ["Accounts/budget-2026.xlsx.txt", "[Sheet: Budget @1]\nHead\tAllocated\tSpent\nSalaries\t4500000\t3900000\nTravel\t250000\t180000\nStationery\t120000\t96500\nComputers\t600000\t420000\nElectricity\t300000\t275000"],
  ["Accounts/vendor-bills-oct.xlsx.txt", "[Sheet: Bills @1]\nVendor\tItem\tAmount\tDate\nSaha Stationers\tPaper reams\t14500\t2026-10-03\nDas Computers\tPrinter toner\t22800\t2026-10-07\nGhosh Electricals\tWiring repair\t9300\t2026-10-15\nSaha Stationers\tFiles and folders\t6200\t2026-10-21"],
  ["Accounts/salary-sheet-sept.xlsx.txt", "[Sheet: Salary @1]\nName\tPost\tBasic\tDA\nRatan Das\tClerk\t28000\t14000\nMitali Sen\tAccountant\t35000\t17500\nArup Paul\tPeon\t18000\t9000\nSudip Roy\tData entry operator\t22000\t11000"],
  ["Schemes/lakshmir-bhandar-status.txt", "Lakshmir Bhandar status for the block, October 2026: 18,430 beneficiaries enrolled; 412 applications pending Aadhaar seeding; payments for September released on 5 October."],
  ["Schemes/krishak-bandhu.txt", "Krishak Bandhu: 6,120 farmers registered in the block. The Kharif instalment of Rs 5,000 per acre was credited on 30 September 2026. 87 death benefit claims are under verification."],
  ["Schemes/awas-yojana.txt", "Awas Yojana progress: 1,250 houses sanctioned, 940 completed, 310 under construction. The third instalment is due in December 2026."],
  ["Notices/holiday-list-2026.txt", "Holiday list 2026 (office): Durga Puja 19 to 23 October, Kali Puja 8 November, Christmas 25 December. Offices remain open on the second Saturday."],
  ["Notices/office-timing.txt", "Office timings from 1 November 2026: 10:00 to 17:30 on weekdays. The public counter closes at 16:00. Biometric attendance is compulsory."],
  ["Notices/training-schedule.txt", "e-Office training for all clerks on 4 and 5 November 2026 in the conference hall, 11:00 to 15:00. Trainer: NIC district centre."],
  ["Reports/monthly-report-sept.txt", "Monthly report September 2026: 1,920 certificates issued, 46 RTI applications received and 41 disposed, 3 court cases pending, revenue collection Rs 7,82,000."],
  ["Reports/court-cases.txt", "Court cases: (1) Barasat land case WP 1123/2025, next hearing 18 November 2026. (2) Service matter of Arup Paul, hearing 2 December 2026. (3) Shop eviction case, judgement reserved."],
  ["Reports/rti-register.txt", "RTI register October 2026: 12 new applications, 9 replied within 30 days, 1 first appeal filed by Sujit Mondal about the road repair tender."],
  ["Bangla/নোটিশ-পূজা.txt", "নোটিশ: দুর্গাপূজা উপলক্ষে ১৯ থেকে ২৩ অক্টোবর ২০২৬ অফিস বন্ধ থাকবে। জরুরি কাজের জন্য কন্ট্রোল রুম খোলা থাকবে। ফোন: ০৩৩-২৫৫২-০০০০।"],
  ["Bangla/সভার-বিবরণ.txt", "সভার বিবরণ: ২০ অক্টোবর ২০২৬ তারিখে পানীয় জল নিয়ে বৈঠক হয়। কল্যাণী ৭ নম্বর ওয়ার্ডে নতুন পাইপলাইন বসানো হবে, খরচ ৩ লক্ষ ২০ হাজার টাকা।"],
  ["Inventory/computers.txt", "Computer inventory: 24 desktops (6 older than 7 years), 5 laptops, 7 printers, 2 scanners. The accounts section needs 3 new laptops (approved on 14 September 2026)."],
];
const QS = [
  "When is the next hearing in the Barasat land case?",
  "How much was spent on stationery in the 2026 budget?",
  "What did the meeting on 12 October 2026 decide about drinking water in Kalyani?",
  "What are the new office timings?",
  "What files are in this pendrive? Give a short overview.",
];
let r = await api("create", { name: "zz-test-fast-" + Date.now().toString(36), pin: String(100000 + Math.floor(Math.random() * 899999)) }); tok = r.j.token; ok(r.status === 200 && !!tok, "create zz-test pendrive");
const ids = {}; for (const [p, t] of FILES) ids[p] = (await up(p, t)).id;
ok(Object.keys(ids).length === 20, "20 files uploaded and indexed");
if (LOCAL) { const d = fs.readdirSync(path.join(LOCAL, "pendrives")).map(x => path.join(LOCAL, "pendrives", x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  const m = JSON.parse(fs.readFileSync(path.join(d, "mem.json"), "utf8")); const c = Object.values(m.files);
  ok(c.length === 20, `memory has a card per file (${c.length})`);
  ok(c.some(x => x.sheets && x.sheets[0] && x.sheets[0].cols.join(",") === "Head,Allocated,Spent"), "memory keeps the sheet columns");
  ok(c.every(x => x.sum && x.kw.length), "every card has a summary and key words"); }
const rows = [];
for (const q of QS) {
  const off = await ask(q, false), on = await ask(q, true), again = await ask(q, true);
  rows.push({ q, off, on, again });
  console.log(`${q.slice(0, 60).padEnd(60)} off ${off.first}/${off.total} ms · fast ${on.first}/${on.total} ms (${on.deltas} pieces) · repeat ${again.first}/${again.total} ms${again.cached ? " cached" : ""}`);
  ok(!off.error && !on.error, `answers without error: ${q.slice(0, 40)}`);
  ok(on.deltas > 0, "fast answer streams in pieces");
  ok(again.cached && again.text === on.text, "repeat question comes from the cache with the same answer");
}
// the cache ends when a file changes
{ const q = QS[3]; await up("Notices/office-timing-2.txt", "Correction: office timings from 1 November 2026 are 10:30 to 18:00."); const a = await ask(q, true); ok(!a.cached, "after a new file the cached answer is not reused"); }
fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
const med = k => { const v = rows.map(k).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
console.log(`median first words: off ${med(x => x.off.first)} ms · fast ${med(x => x.on.first)} ms · cached ${med(x => x.again.first)} ms`);
console.log(`median total:       off ${med(x => x.off.total)} ms · fast ${med(x => x.on.total)} ms · cached ${med(x => x.again.total)} ms`);
if (!process.env.KEEP) { const left = (await api("list")).j.files.map(f => f.id); await api("delete", { ids: left, confirm: true }); }
else console.log("KEEP: pendrive left in place");
