// Shared S3 CORS logic for the AI Pendrive bucket (used by server.js at boot and scripts/set-b2-cors.js).
// Node built-ins only. Never logs keys.
import crypto from "node:crypto";

export const DEFAULT_ORIGIN = "https://biswas-ai-for-office.onrender.com";
export const corsOrigins = (env = process.env) => (env.CORS_ORIGIN || DEFAULT_ORIGIN).split(",").map(s => s.trim()).filter(Boolean);
export const WANT = origins => ({ origins: [...origins].sort(), methods: ["GET", "HEAD", "PUT"], headers: ["*"], expose: ["etag"], maxAge: 3600 });

const xesc = s => String(s).replace(/[<>&]/g, "");
export function corsXml(origins) {
  return `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><CORSRule>` +
    origins.map(o => `<AllowedOrigin>${xesc(o)}</AllowedOrigin>`).join("") +
    `<AllowedMethod>GET</AllowedMethod><AllowedMethod>PUT</AllowedMethod><AllowedMethod>HEAD</AllowedMethod>` +
    `<AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader><MaxAgeSeconds>3600</MaxAgeSeconds></CORSRule></CORSConfiguration>`;
}
// Parse GetBucketCors XML into normalized rules.
export function parseCors(xml) {
  const all = (s, tag) => [...s.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map(m => m[1].trim());
  return [...String(xml).matchAll(/<CORSRule>([\s\S]*?)<\/CORSRule>/g)].map(([, r]) => ({
    origins: all(r, "AllowedOrigin").sort(), methods: all(r, "AllowedMethod").map(s => s.toUpperCase()).sort(),
    headers: all(r, "AllowedHeader").sort(), expose: all(r, "ExposeHeader").map(s => s.toLowerCase()).sort(),
    maxAge: Number(all(r, "MaxAgeSeconds")[0] || 0) }));
}
// v104: some rule set (e.g. made in the provider's console) already lets every origin GET/PUT/HEAD with any header and read ETag.
const wild = (pat, o) => pat === "*" || pat === o || (pat.includes("*") && new RegExp("^" + pat.split("*").map(x => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$").test(o));
export const allows = (rules, origins) => origins.every(o => rules.some(r => r.origins.some(p => wild(p, o)) && ["GET", "PUT", "HEAD"].every(m => r.methods.includes(m)) && r.headers.includes("*") && r.expose.includes("etag")));
// Exactly one rule, equal to what we want.
export const matches = (rules, origins) => rules.length === 1 && JSON.stringify(rules[0]) === JSON.stringify(WANT(origins));
const errCode = t => ((t.match(/<Code>([^<]+)/) || [])[1] || "") + " " + ((t.match(/<Message>([^<]+)/) || [])[1] || "");

export async function getCors(st) {
  const r = await st.request("GET", "", { cors: "" });
  const t = await r.text();
  if (r.status === 404 || /NoSuchCORSConfiguration/.test(t)) return { status: r.status, rules: [], xml: "" };
  if (!r.ok) throw new Error(`GetBucketCors ${r.status} ${errCode(t)}`.trim());
  return { status: r.status, rules: parseCors(t), xml: t };
}
export async function putCors(st, origins) {
  const xml = corsXml(origins);
  const md5 = crypto.createHash("md5").update(xml).digest("base64");
  const r = await st.request("PUT", "", { cors: "" }, xml, { "content-type": "application/xml", "content-md5": md5 });
  const t = await r.text();
  if (!r.ok) { const e = new Error(`PutBucketCors ${r.status} ${errCode(t)}`.trim()); e.status = r.status; e.body = t; throw e; }
}
// Returns { state: "already" | "applied" | "native_rules" | "failed", detail }.
export async function ensureCors(st, origins) {
  try {
    const cur = await getCors(st);
    if (matches(cur.rules, origins)) return { state: "already" };
    if (allows(cur.rules, origins)) return { state: "compatible" }; // leave the owner's own rules alone
    try { await putCors(st, origins); }
    catch (e) {
      // B2 refuses S3 CORS changes while native (web-UI) rules exist on the bucket.
      if (st.provider === "b2" && /native|b2_update_bucket/i.test(e.body || "") && e.status >= 400 && e.status < 500) return { state: "native_rules", detail: e.message };
      return { state: "failed", detail: e.message };
    }
    const after = await getCors(st);
    return matches(after.rules, origins) ? { state: "applied" } : { state: "failed", detail: "read-back did not match" };
  } catch (e) { return { state: "failed", detail: String(e.message || e).slice(0, 200) }; }
}
