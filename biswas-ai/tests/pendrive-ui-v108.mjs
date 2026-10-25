import puppeteer from "puppeteer-core";
const B = process.env.BASE || "http://localhost:3997";
const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const p = await b.newPage(); await p.goto(B + "/", { waitUntil: "networkidle0" });
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + m); };
const cases = {
  md: "intro\n\n| A | B |\n| --- | --- |\n| 1 | 2 |",
  nosep: "Here:\n| ফাইল | বিষয় |\n| a.txt | বাজেট |\n| b.txt | মামলা |\nend",
  nolead: "ফাইল | বিষয়\n--- | ---\na | b",
  tabs: "x\nফাইল\tবিষয়\tতারিখ\na.txt\tবাজেট\t২০২৫\nb.txt\tমামলা\t২০১৯",
  html: "See <table><tr><th>ফাইল</th><th>বিষয়</th></tr><tr><td>a|b</td><td>বাজেট</td></tr></table> done",
  prose: "Just a | in a sentence.\n\nNo table here.",
  code: "```\na | b\nc | d\n```"
};
const r = await p.evaluate(c => Object.fromEntries(Object.entries(c).map(([k, v]) => { const n = pdNormTables(v); const t = parseMd(n).filter(x => x.t === "table"); return [k, { rows: t.map(x => x.rows.length), cols: t.map(x => x.rows[0].length), first: t[0] && t[0].rows[1], csv: pdOutCsv(n).length }]; })), cases);
ok(r.md.rows[0] === 2, "markdown table kept " + JSON.stringify(r.md));
ok(r.nosep.rows[0] === 3 && r.nosep.cols[0] === 2, "pipe table without separator " + JSON.stringify(r.nosep));
ok(r.nolead.rows[0] === 2, "pipes without outer | " + JSON.stringify(r.nolead));
ok(r.tabs.rows[0] === 3 && r.tabs.cols[0] === 3, "tab-separated " + JSON.stringify(r.tabs));
ok(r.html.rows[0] === 2 && r.html.first[0] === "a/b", "HTML table " + JSON.stringify(r.html));
ok(!r.prose.rows.length, "a lone | in prose is not a table");
ok(!r.code.rows.length, "code block untouched");
ok(await p.$("#pd-fmt") !== null, "output format selector present");
console.log(`${pass}/${pass + fail} passed`); await b.close();
