// Spreadsheet questions: the AI plans, code computes over ALL rows. Checks the executor on a 200-row fixture with scope cases.
import * as rag from "../api/rag.js";
const blocks = ["Katwa", "Kalna", "Memari", "Burdwan"]; const rows = [["Name", "Block", "Basic", "DA"]];
for (let i = 0; i < 200; i++) rows.push([`Emp ${i + 1}`, blocks[i % 4], String(20000 + ((i * 7919) % 7400)), String(1000 + i)]);
rows[180][2] = "27,400"; // overall max is outside Katwa (row index 180 → Memari)
const tables = rag.sheetTables([{ id: "f1", path: "salary.xlsx", sheets: { Sheet1: { r0: 1, rows } } }]);
const body = rows.slice(1).map(r => ({ b: r[1], v: rag.num(r[2]) }));
const K = body.filter(x => x.b === "Katwa").map(x => x.v), A = body.map(x => x.v);
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const q = p => rag.runQuery(tables, p);
ok(q({ agg: "max", col: "Basic" }).value === 27400 && Math.max(...K) !== 27400, "overall max over ALL rows = 27400 (Katwa max is " + Math.max(...K) + ")");
ok(q({ agg: "max", col: "Basic", where: [{ col: "Block", op: "eq", value: "Katwa" }] }).value === Math.max(...K), "Katwa-only max");
ok(q({ agg: "min", col: "Basic" }).value === Math.min(...A), "overall min");
ok(q({ agg: "avg", col: "basic" }).value === Math.round(A.reduce((a, b) => a + b) / A.length * 100) / 100, "overall avg (header matched case-insensitively)");
ok(q({ agg: "sum", col: "Basic", where: [{ col: "Block", value: "katwa" }] }).value === K.reduce((a, b) => a + b), "Katwa sum");
ok(q({ agg: "count", where: [{ col: "Block", value: "Katwa" }] }).value === 50, "Katwa count = 50");
const g = q({ agg: "sum", col: "Basic", groupBy: "Block" }); ok(g.groups.length === 4 && blocks.every(b => g.groups.find(x => x.key === b).value === body.filter(x => x.b === b).reduce((a, x) => a + x.v, 0)), "per-block sums");
const t = q({ agg: "top", col: "Basic", n: 5 }); const top = A.slice().sort((a, b) => b - a).slice(0, 5); ok(JSON.stringify(t.items.map(i => i.value)) === JSON.stringify(top) && t.items[0].row === 181, "top 5 overall: " + t.items.map(i => i.value).join(","));
ok(q({ agg: "bottom", col: "Basic", n: 3, where: [{ col: "Block", value: "Kalna" }] }).items.length === 3, "bottom 3 in Kalna");
let threw = false; try { q({ agg: "max", col: "Bonus" }); } catch (e) { threw = /Bonus/.test(e.message); } ok(threw, "unknown column is refused, not guessed");
ok(/over ALL rows/.test(rag.queryText(q({ agg: "max", col: "Basic" }))) && /where Block eq Katwa/.test(rag.queryText(q({ agg: "max", col: "Basic", where: [{ col: "Block", value: "Katwa" }] }))), "computed text states the scope");
const plan = rag.parsePlan('Sure: {"queries":[{"agg":"sum","col":"Basic","where":[{"col":"Block","op":"eq","value":"Katwa"}]},{"agg":"max","col":"Basic"}]}');
ok(plan && plan.length === 2 && q(plan[1]).value === 27400, "plan parsed from model text; mixed-scope question keeps overall max");
ok(rag.fmtIN(27400) === "27,400" && rag.fmtIN(34725000) === "3,47,25,000" && rag.fmtIN(23718.5) === "23,718.5", "Indian grouping of computed values");
ok(/= 27,400 \(/.test(rag.queryText(q({ agg: "max", col: "Basic" }))), "COMPUTED text carries 27,400 pre-formatted");
ok(rag.fixGroups("Kalna: 27 400 [1]; total 3\u202f47\u202f25\u202f000") === "Kalna: 27,400 [1]; total 3,47,25,000", "space/narrow-nbsp grouping -> commas");
ok(rag.fixGroups("Page 12 345; on 15 30 rows; 1.5 200") === "Page 12 345; on 15 30 rows; 1.5 200", "non-groupings left alone");
console.log(fails ? fails + " FAILED" : "ALL PASS"); process.exit(fails ? 1 : 0);
