// v109 attachments: build every file type in the page, then check the bytes outside the browser.
import puppeteer from "puppeteer-core";
import fs from "fs"; import { execSync } from "child_process";
const B = process.env.BASE || "http://localhost:3998";
const OUT = process.env.OUT || "/workspace/attach-samples";
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage(); const errs = []; p.on("pageerror", e => errs.push(String(e)));
await p.goto(B + "/", { waitUntil: "networkidle0" });
await p.waitForFunction(() => window.BA && BA.build, { timeout: 15000 });
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m); };
const answer = `এই চিঠিটা তৈরি।

\`\`\`attachment name="chithi.docx" type="docx+pdf" template="letter"
# আবেদনপত্র
প্রতি,
জেলা শাসক, বর্ধমান

বিষয়: **জন্ম শংসাপত্র** সংশোধনের আবেদন।

মহাশয়,
- প্রথম কারণ: নামের বানান ভুল
- দ্বিতীয় কারণ: তারিখ ভুল

| ক্রম | বিষয় | টাকা |
| --- | --- | --- |
| ১ | ফি | ৫০ |
| 2 | Stamp | 10 |

বিনীত, বিক্রম বিশ্বাস
\`\`\`

\`\`\`attachment name="hisab.xlsx" type="xlsx"
## Income
| Item | Amount |
| --- | --- |
| Salary | 45,000 |
| Rent | ₹12,500.50 |
| Total | |
## Expense
| খাত | টাকা |
| --- | --- |
| বিদ্যুৎ | ১২০০ |
| মোট | |
\`\`\`

\`\`\`attachment name="sum.py" type="py"
def total(xs):
    return sum(xs)
print(total([1, 2, 3]))
\`\`\`

\`\`\`file name="data.json"
{"a":1,"b":[1,2]}
\`\`\`

\`\`\`attachment name="chart.png" type="png" chart="bar" title="মাসিক খরচ"
| Month | Cost |
| --- | --- |
| Jan | 100 |
| Feb | 140 |
| Mar | 90 |
\`\`\`

\`\`\`attachment name="chart.svg" type="svg" chart="pie"
a,b
x,3
y,5
\`\`\`

\`\`\`attachment name="data.csv"
name,amount
x,1
\`\`\`

\`\`\`json
attachment name="nested.json" type="json"
{"n":1}
\`\`\`

\`\`\`python
print("plain code stays code")
\`\`\``;
const r = await p.evaluate(async md => {
  const parsed = BA.parse(md); const html = mdToHtml(md); const out = {};
  for (const a of parsed.atts) { const blob = await BA.build(a); const buf = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); out[a.name] = btoa(s); }
  const d = await toDocx("# শিরোনাম\n\n| A | B |\n| --- | --- |\n| 1 | 2 |"); const pdf = await toPdf("উত্তর: **বাংলা** লেখা ঠিক আছে। Plain English too.");
  const toB = async bl => { const u = new Uint8Array(await bl.arrayBuffer()); let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  out["answer-export.docx"] = await toB(d); out["answer-export.pdf"] = await toB(pdf);
  const fence = BA.attInfo('attach name="x.xlsx"'), loose = BA.attInfo('file: report.pdf'), none = BA.attInfo("python");
  return { names: parsed.atts.map(a => a.name), cards: (html.match(/class="ba-att/g) || []).length, plainCode: /<pre[^>]*><code>print/.test(html), out, fence: fence && fence.type, loose: loose && loose.type, none: !none, add: BA.addendum("excel").length, skills: Object.keys(BA.SKILLS || {}) };
}, answer);
ok(r.names.join() === "chithi.docx,chithi.pdf,hisab.xlsx,sum.py,data.json,chart.png,chart.svg,data.csv,nested.json", "parsed attachments " + r.names.join());
ok(r.cards === 9, "file cards rendered " + r.cards);
ok(r.plainCode, "ordinary code block stays code");
ok(r.fence === "xlsx" && r.loose === "pdf" && r.none, "tolerant fence parser");
ok(r.add > 200 && r.skills.length === 7, "skills " + r.skills.join());
for (const [n, v] of Object.entries(r.out)) fs.writeFileSync(OUT + "/" + n, Buffer.from(v, "base64"));
const sh = c => execSync(c, { encoding: "utf8", maxBuffer: 1 << 26 });
const py = (f, part, code) => sh(`python3 -c "import sys,zipfile,xml.dom.minidom as m; d=zipfile.ZipFile(sys.argv[1]).read(sys.argv[2]); ${code}" ${OUT}/${f} '${part}'`);
const xml = (f, part) => py(f, part, "sys.stdout.write(d.decode())");
const wellFormed = (f, part) => { try { py(f, part, "m.parseString(d)"); return true; } catch { return false; } };
const doc = xml("chithi.docx", "word/document.xml");
ok(["word/document.xml", "word/styles.xml", "word/numbering.xml", "word/footer1.xml", "[Content_Types].xml"].every(x => wellFormed("chithi.docx", x)), "docx XML parses");
ok(doc.includes("জন্ম শংসাপত্র") && doc.includes("<w:tbl>") && /w:shd [^>]*w:fill/.test(doc) && doc.includes("w:numPr"), "docx has Bengali text, table, shaded header, lists");
ok(/w:numPr/.test(doc) && /w:tblHeader/.test(doc), "docx real list numbering + repeating header");
const sheet1 = xml("hisab.xlsx", "xl/worksheets/sheet1.xml"), sheet2 = xml("hisab.xlsx", "xl/worksheets/sheet2.xml"), wb = xml("hisab.xlsx", "xl/workbook.xml");
ok(["xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"].every(x => wellFormed("hisab.xlsx", x)), "xlsx XML parses");
ok(/<f>SUM\(B2:B3\)<\/f>/.test(sheet1) && /<f>SUM\(B2:B2\)<\/f>/.test(sheet2), "xlsx SUM formulas in both sheets");
ok(/<v>45000<\/v>/.test(sheet1) && /<v>12500.5<\/v>/.test(sheet1) && /<v>1200<\/v>/.test(sheet2), "xlsx real numbers (₹, commas, Bengali digits)");
ok(/name="Income"/.test(wb) && /name="Expense"/.test(wb), "xlsx two named sheets");
ok(/<fill>.*?<patternFill patternType="solid"/.test(xml("hisab.xlsx", "xl/styles.xml")), "xlsx styled header fill");
const t1 = sh(`pdftotext ${OUT}/chithi.pdf -`), t2 = sh(`pdftotext ${OUT}/answer-export.pdf -`);
ok(t1.includes("জন্ম") && t1.includes("শংসাপত্র") && t1.includes("বর্ধমান"), "pdf Bengali survives pdftotext: " + t1.slice(0, 80).replace(/\s+/g, " "));
ok(t2.includes("বাংলা") && t2.includes("English"), "answer export pdf searchable");
ok(fs.readFileSync(OUT + "/chart.png").slice(1, 4).toString() === "PNG" && fs.statSync(OUT + "/chart.png").size > 5000, "chart PNG");
ok(fs.readFileSync(OUT + "/chart.svg", "utf8").startsWith("<svg") || fs.readFileSync(OUT + "/chart.svg", "utf8").includes("<svg"), "chart SVG");
ok(JSON.parse(fs.readFileSync(OUT + "/data.json", "utf8")).b.length === 2, "json valid");
ok(sh(`python3 ${OUT}/sum.py`).trim() === "6", "python file runs");
ok(wellFormed("answer-export.docx", "word/document.xml") && xml("answer-export.docx", "word/document.xml").includes("শিরোনাম"), "toDocx fallback export");
ok(!errs.length, "no page errors " + errs.join(" | "));
console.log(`${pass}/${pass + fail} passed`); await b.close(); process.exit(fail ? 1 : 0);
