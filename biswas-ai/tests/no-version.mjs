// No version text a user can see. BASE=<url>. Checks /healthz is plain "ok" with X-Build, and served pages/scripts.
const B = process.env.BASE || "http://localhost:3998"; let bad = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) bad++; };
const RX = /\bv\d{2,3}\b|\b[Vv]ersion\b/, strip = s => s.replace(/<\?xml version="1\.0"[^>]*\?>/g, "").replace(/protocolVersion|version: "1\.0"|Previous version/g, "");
const h = await fetch(B + "/healthz"); const body = await h.text();
ok(h.status === 200 && body === "ok", "healthz 200 plain ok: " + JSON.stringify(body));
ok(/^\d+$/.test(h.headers.get("x-build") || ""), "X-Build header: " + h.headers.get("x-build"));
const page = await (await fetch(B + "/")).text();
const src = page.match(/\/attach\.js\?h=([a-f0-9]+)/); ok(!!src && src[1] !== "0", "attach.js cache-bust hash: " + (src && src[1]));
for (const p of ["/", src ? src[0] : "/attach.js", "/share.js", "/pd-dl-sw.js", "/pd-text-worker.js", "/s/" + "0".repeat(32)]) {
  const r = await fetch(B + p); const t = strip(await r.text()); const m = t.match(RX);
  ok(!m, p + " has no version text" + (m ? ": …" + t.slice(Math.max(0, m.index - 40), m.index + 20) + "…" : ""));
}
console.log(bad ? "FAILED " + bad : "ALL PASS"); process.exit(bad ? 1 : 0);
