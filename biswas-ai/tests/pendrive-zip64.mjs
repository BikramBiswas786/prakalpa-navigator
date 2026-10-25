// v106: checks the browser ZIP writer from index.html with Python's zipfile, incl. the ZIP64 paths (threshold lowered to 1000 bytes).
import fs from "node:fs"; import { execSync } from "node:child_process"; import crypto from "node:crypto";
const h = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const src = h.slice(h.indexOf("const PD_CRC ="), h.indexOf("function pdMemZip()"));
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
for (const lim of [0xFFFFFFFF, 1000]) {
  const PdZip = new Function(src.replace("PD_Z64 = 0xFFFFFFFF;", `PD_Z64 = ${lim};`) + "; return PdZip;")();
  const parts = []; const z = new PdZip({ write: async u => parts.push(Buffer.from(u)), close: async () => {} });
  const files = { "অফিস/বিল.txt": Buffer.from("বিদ্যুৎ বিল"), "অফিস/big.bin": crypto.randomBytes(300000), "a/b/c.txt": Buffer.from("x") };
  await z.dir("অফিস"); await z.dir("empty/sub");
  for (const [n, d] of Object.entries(files)) { const r = (function* () { for (let i = 0; i < d.length; i += 65536) yield d.subarray(i, i + 65536); })(); await z.stream(n, d.length, { read: async () => { const x = r.next(); return x.done ? { done: true } : { value: new Uint8Array(x.value), done: false }; } }); }
  await z.bytes("mem.xml", new TextEncoder().encode("<a>বাংলা</a>"));
  for (let i = 0; i < (lim === 1000 ? 70000 : 0); i++) await z.bytes(`many/${i}.txt`, new Uint8Array([65]));
  await z.finish(); fs.writeFileSync("/tmp/zt.zip", Buffer.concat(parts));
  const out = execSync(`python3 -c "
import zipfile,hashlib,json; z=zipfile.ZipFile('/tmp/zt.zip'); assert z.testzip() is None
print(json.dumps(dict(n=len(z.namelist()), h={k:hashlib.sha256(z.read(k)).hexdigest() for k in z.namelist() if not k.startswith('many/') and not k.endswith('/')}, dirs=[k for k in z.namelist() if k.endswith('/')])))"`).toString();
  const j = JSON.parse(out); const want = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, crypto.createHash("sha256").update(v).digest("hex")]));
  ok(Object.entries(want).every(([k, v]) => j.h[k] === v) && j.dirs.includes("empty/sub/") && j.n === 6 + (lim === 1000 ? 70000 : 0), `${lim === 1000 ? "ZIP64 (forced, 70k entries)" : "plain ZIP"}: python zipfile OK, ${j.n} entries, hashes match, Bengali names`);
  try { execSync("unzip -tq /tmp/zt.zip"); ok(true, "  unzip -t OK"); } catch (e) { ok(lim === 1000, "  unzip -t " + e.message.slice(0, 80)); }
}
