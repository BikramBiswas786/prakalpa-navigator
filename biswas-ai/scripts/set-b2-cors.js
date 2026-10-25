#!/usr/bin/env node
// Apply the browser-upload CORS rule to the AI Pendrive bucket (Backblaze B2 or any S3-compatible store).
// Uses the same env vars as the server (S3_* or the R2_* alias). Node built-ins only. Prints no secrets.
//   node scripts/set-b2-cors.js            apply via S3 PutBucketCors, then read it back
//   node scripts/set-b2-cors.js --show     only read the current S3 CORS rules
//   node scripts/set-b2-cors.js --native   use B2's native b2_update_bucket instead
// Optional: CORS_ORIGIN (default https://biswas-ai-for-office.onrender.com, comma-separated for several)
import crypto from "node:crypto";
import { S3Storage, s3Config } from "../api/storage.js";

const ORIGINS = (process.env.CORS_ORIGIN || "https://biswas-ai-for-office.onrender.com").split(",").map(s => s.trim()).filter(Boolean);
const cfg = s3Config(process.env);
if (!cfg) { console.error("Missing env: set S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET"); process.exit(2); }
console.log(`bucket=${cfg.bucket} endpoint=${cfg.endpoint} region=${cfg.region} key=${cfg.ak.slice(0, 4)}… origins=${ORIGINS.join(",")}`);
const args = process.argv.slice(2);

async function native() {
  const basic = Buffer.from(`${cfg.ak}:${cfg.sk}`).toString("base64");
  const a = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", { headers: { authorization: `Basic ${basic}` } });
  const auth = await a.json();
  if (!a.ok) throw new Error(`b2_authorize_account ${a.status} ${auth.code || ""}`);
  const api = auth.apiInfo.storageApi, accountId = auth.accountId;
  const call = async (name, body) => {
    const r = await fetch(`${api.apiUrl}/b2api/v3/${name}`, { method: "POST", headers: { authorization: auth.authorizationToken, "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json(); if (!r.ok) throw new Error(`${name} ${r.status} ${j.code || ""} ${j.message || ""}`); return j;
  };
  const { buckets } = await call("b2_list_buckets", { accountId, bucketName: cfg.bucket });
  if (!buckets || !buckets.length) throw new Error("bucket not found (does the key have access to it?)");
  const out = await call("b2_update_bucket", { accountId, bucketId: buckets[0].bucketId, corsRules: [{
    corsRuleName: "aiPendriveUploads", allowedOrigins: ORIGINS, allowedOperations: ["s3_get", "s3_put", "s3_head"],
    allowedHeaders: ["*"], exposeHeaders: ["ETag"], maxAgeSeconds: 3600 }] });
  console.log("native corsRules now:", JSON.stringify(out.corsRules));
}

async function s3() {
  const st = new S3Storage(cfg);
  const show = async () => {
    const r = await st.request("GET", "", { cors: "" });
    const t = await r.text();
    console.log(`GetBucketCors ${r.status}${r.status === 404 ? " (no S3 CORS rules)" : ""}`);
    if (r.ok) console.log(t.replace(/\s+/g, " "));
    return r.ok;
  };
  if (args.includes("--show")) return show();
  const x = (s) => s.replace(/[<>&]/g, "");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><CORSRule>` +
    ORIGINS.map(o => `<AllowedOrigin>${x(o)}</AllowedOrigin>`).join("") +
    `<AllowedMethod>GET</AllowedMethod><AllowedMethod>PUT</AllowedMethod><AllowedMethod>HEAD</AllowedMethod>` +
    `<AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader><MaxAgeSeconds>3600</MaxAgeSeconds></CORSRule></CORSConfiguration>`;
  const md5 = crypto.createHash("md5").update(xml).digest("base64");
  const r = await st.request("PUT", "", { cors: "" }, xml, { "content-type": "application/xml", "content-md5": md5 });
  const t = await r.text();
  if (!r.ok) {
    const code = (t.match(/<Code>([^<]+)/) || [])[1] || "", msg = (t.match(/<Message>([^<]+)/) || [])[1] || "";
    console.error(`PutBucketCors failed: ${r.status} ${code} ${msg}`);
    if (cfg.provider === "b2") console.error("On B2 this usually means the bucket already has native CORS rules (e.g. a preset chosen in the web UI).\nEither set 'CORS Rules' to 'Do not share' in the B2 web UI and re-run, or run with --native.");
    process.exit(1);
  }
  console.log(`PutBucketCors ${r.status} OK`);
  await show();
}

(args.includes("--native") ? native() : s3()).catch(e => { console.error("error:", e.message); process.exit(1); });
