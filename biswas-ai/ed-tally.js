/* Tally Prime / Tally ERP 9 XML exports -> readable, citable text for the AI (vouchers, day book, ledgers, trial balance),
   and AI-built tables -> Tally-importable voucher XML. Works in the page and in the text worker (no DOM needed). */
(function (root) {
"use strict";
const ent = s => String(s || "").replace(/&#\d+;/g, m => { const n = +m.slice(2, -1); return n < 32 ? "" : String.fromCharCode(n); })
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}\\b[^>]*>([\\s\\S]*?)</${t}>`, "i")); return m ? ent(m[1].replace(/<[^>]+>/g, "")) : ""; };
const num = v => { const n = parseFloat(String(v || "").replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : 0; };
const r2 = n => (Math.round(n * 100) / 100).toFixed(2);
const d8 = d => /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;
// decode bytes: Tally often writes UTF-16 LE with a BOM
function decode(buf) {
  const u = new Uint8Array(buf);
  if (u[0] === 0xff && u[1] === 0xfe) return new TextDecoder("utf-16le").decode(u.subarray(2));
  if (u[0] === 0xfe && u[1] === 0xff) return new TextDecoder("utf-16be").decode(u.subarray(2));
  if (u.length > 3 && u[1] === 0 && u[3] === 0) return new TextDecoder("utf-16le").decode(u);
  return new TextDecoder("utf-8").decode(u);
}
const isTally = x => /<ENVELOPE\b/i.test(x) && /<(TALLYMESSAGE|VOUCHER|LEDGER|DSPACCNAME|DSPDISPNAME|BODY)\b/i.test(x);
function toText(x) {
  const out = [], vouchers = [], ledgers = [], tb = [];
  for (const m of x.matchAll(/<VOUCHER\b([^>]*)>([\s\S]*?)<\/VOUCHER>/gi)) {
    const at = m[1], b = m[2];
    const type = tag(b, "VOUCHERTYPENAME") || ent((at.match(/VCHTYPE="([^"]*)"/i) || [])[1]) || "Voucher";
    const v = { date: d8(tag(b, "DATE")), type, no: tag(b, "VOUCHERNUMBER"), party: tag(b, "PARTYLEDGERNAME"), narr: tag(b, "NARRATION"), lines: [] };
    for (const e of b.matchAll(/<(ALLLEDGERENTRIES|LEDGERENTRIES)\.LIST\b[^>]*>([\s\S]*?)<\/\1\.LIST>/gi)) {
      const name = tag(e[2], "LEDGERNAME"), amt = num(tag(e[2], "AMOUNT")); if (!name) continue;
      v.lines.push({ name, dr: amt < 0 ? -amt : 0, cr: amt > 0 ? amt : 0 }); // Tally: negative = debit
    }
    vouchers.push(v);
  }
  for (const m of x.matchAll(/<LEDGER\b([^>]*)>([\s\S]*?)<\/LEDGER>/gi)) {
    const name = ent((m[1].match(/NAME="([^"]*)"/i) || [])[1]) || tag(m[2], "NAME"); if (!name) continue;
    ledgers.push({ name, parent: tag(m[2], "PARENT"), open: num(tag(m[2], "OPENINGBALANCE")), close: tag(m[2], "CLOSINGBALANCE"), gstin: tag(m[2], "PARTYGSTIN") || tag(m[2], "GSTIN") });
  }
  // Trial Balance / Balance Sheet style report exports
  const re = /<DSPACCNAME>([\s\S]*?)<\/DSPACCNAME>\s*<DSPACCINFO>([\s\S]*?)<\/DSPACCINFO>/gi;
  for (const m of x.matchAll(re)) tb.push({ name: tag(m[1], "DSPDISPNAME"), dr: num(tag(m[2], "DSPCLDRAMTA")), cr: num(tag(m[2], "DSPCLCRAMTA")) });
  if (!vouchers.length && !ledgers.length && !tb.length) return "";
  out.push(`[Tally export] Read from Tally XML. ${vouchers.length} voucher(s), ${ledgers.length} ledger master(s)${tb.length ? `, trial balance with ${tb.length} account(s)` : ""}. Amounts in rupees; Dr = debit, Cr = credit.`);
  if (vouchers.length) {
    const dates = vouchers.map(v => v.date).filter(Boolean).sort();
    if (dates.length) out.push(`Period of vouchers: ${dates[0]} to ${dates[dates.length - 1]}.`);
    const byType = new Map(), byLed = new Map();
    for (const v of vouchers) { const amt = v.lines.reduce((s, l) => s + l.dr, 0); const t = byType.get(v.type) || { n: 0, amt: 0 }; t.n++; t.amt += amt; byType.set(v.type, t);
      for (const l of v.lines) { const g = byLed.get(l.name) || { dr: 0, cr: 0 }; g.dr += l.dr; g.cr += l.cr; byLed.set(l.name, g); } }
    out.push("Voucher totals by type: " + [...byType].map(([k, t]) => `${k}: ${t.n} voucher(s), total ${r2(t.amt)}`).join("; ") + ".");
    out.push("Ledger movement in these vouchers (Dr total / Cr total / net Dr−Cr):");
    for (const [k, g] of [...byLed].sort((a, b) => a[0].localeCompare(b[0]))) out.push(`- ${k}: Dr ${r2(g.dr)} / Cr ${r2(g.cr)} / net ${r2(g.dr - g.cr)}`);
    const gst = [...byLed].filter(([k]) => /\b(c|s|i|u)?gst\b|cgst|sgst|igst|utgst|cess|tds|tcs/i.test(k));
    if (gst.length) out.push("GST/TDS ledgers: " + gst.map(([k, g]) => `${k}: Dr ${r2(g.dr)}, Cr ${r2(g.cr)}`).join("; ") + ".");
    out.push("", "[Sheet: Vouchers @1]", ["Date", "Voucher type", "Voucher no", "Party", "Ledger", "Dr", "Cr", "Narration"].join("\t"));
    for (const v of vouchers) for (const l of v.lines) out.push([v.date, v.type, v.no, v.party, l.name, l.dr ? r2(l.dr) : "", l.cr ? r2(l.cr) : "", v.narr].map(c => String(c).replace(/[\t\n]+/g, " ")).join("\t"));
  }
  if (ledgers.length) {
    out.push("", "[Sheet: Ledgers @1]", ["Ledger", "Group", "Opening balance", "Closing balance", "GSTIN"].join("\t"));
    for (const l of ledgers) out.push([l.name, l.parent, l.open ? r2(l.open) : "", l.close, l.gstin].join("\t"));
  }
  if (tb.length) {
    out.push("", "[Sheet: Trial Balance @1]", ["Account", "Closing Dr", "Closing Cr"].join("\t"));
    for (const t of tb) out.push([t.name, t.dr ? r2(Math.abs(t.dr)) : "", t.cr ? r2(Math.abs(t.cr)) : ""].join("\t"));
    out.push(`Trial balance totals: Dr ${r2(tb.reduce((s, t) => s + Math.abs(t.dr), 0))}, Cr ${r2(tb.reduce((s, t) => s + Math.abs(t.cr), 0))}.`);
  }
  return out.join("\n");
}
/* rows (first row = header) -> Tally import XML; null when the table has no amount column */
const X = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function tdate(s) {
  s = String(s || "").trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + m[2].padStart(2, "0") + m[3].padStart(2, "0");
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) return (m[3].length === 2 ? "20" + m[3] : m[3]) + m[2].padStart(2, "0") + m[1].padStart(2, "0");
  const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
function toXml(rows) {
  if (!rows || rows.length < 2) return null;
  const h = rows[0].map(c => String(c).toLowerCase());
  const col = re => h.findIndex(c => re.test(c));
  const iAmt = col(/amount|amt|টাকা|পরিমাণ|rs\.?|₹|value|total/), iDate = col(/date|তারিখ/), iType = col(/voucher ?type|vch ?type|^type$|ধরন/);
  const iNo = col(/voucher ?no|vch ?no|number|নম্বর/), iNarr = col(/narration|particular|description|details|বিবরণ|purpose/);
  const iCr = [col(/credit|\bcr\b/), col(/paid from|bank|cash|mode|party/)].find(i => i >= 0) ?? -1;
  const iDr = [col(/debit|\bdr\b/), h.findIndex((c, i) => i !== iCr && /expense|ledger|head|খাত/.test(c))].find(i => i >= 0) ?? -1;
  if (iAmt < 0) return null;
  const msgs = [];
  for (const r of rows.slice(1)) {
    if (r.some(c => /^\s*(\*\*)?(grand )?(total|মোট)\b/i.test(String(c)))) continue;
    const amt = Math.abs(num(r[iAmt])); if (!amt) continue;
    const type = (iType >= 0 && String(r[iType]).trim()) || "Payment";
    const dr = (iDr >= 0 && iDr !== iCr && String(r[iDr]).trim()) || "Suspense", cr = (iCr >= 0 && String(r[iCr]).trim()) || "Cash";
    const no = iNo >= 0 ? String(r[iNo]).trim() : "", narr = iNarr >= 0 ? String(r[iNarr]).trim() : "";
    msgs.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${X(type)}" ACTION="Create"><DATE>${tdate(iDate >= 0 ? r[iDate] : "")}</DATE><VOUCHERTYPENAME>${X(type)}</VOUCHERTYPENAME>${no ? `<VOUCHERNUMBER>${X(no)}</VOUCHERNUMBER>` : ""}<NARRATION>${X(narr)}</NARRATION>`
      + `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${X(dr)}</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-${amt.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST>`
      + `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${X(cr)}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>${amt.toFixed(2)}</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE>`);
  }
  if (!msgs.length) return null;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>\n${msgs.join("\n")}\n</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>\n`;
}
root.BA_TALLY = { decode, isTally, toText, toXml };
})(typeof self !== "undefined" ? self : this);
