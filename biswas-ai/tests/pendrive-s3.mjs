// S3 SigV4 adapter test against a local S3 server (versitygw/MinIO). Run: node tests/pendrive-s3.mjs
import crypto from "node:crypto";
import { R2Storage } from "../api/storage.js";
const s = new R2Storage({ R2_ENDPOINT: process.env.S3_ENDPOINT || "http://127.0.0.1:9100", R2_BUCKET: process.env.S3_BUCKET || "pdtest", R2_ACCESS_KEY_ID: process.env.S3_KEY || "testkey", R2_SECRET_ACCESS_KEY: process.env.S3_SECRET || "testsecret123", R2_REGION: "us-east-1" });
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) process.exitCode = 1; };
const id = crypto.randomBytes(12).toString("hex"), key = `pendrives/${id}/f/${crypto.randomBytes(12).toString("hex")}`;
await s.putJson(`pendrives/${id}/meta.json`, { a: 1, bn: "বাংলা" });
ok((await s.getJson(`pendrives/${id}/meta.json`)).bn === "বাংলা", "signed PUT/GET JSON (UTF-8)");
ok((await s.getJson(`pendrives/${id}/missing.json`)) === null, "missing object -> null");
const SIZE = 210 * 1024 * 1024 + 4321, PART = 10 * 1024 * 1024;
const big = crypto.randomBytes(SIZE); const want = crypto.createHash("sha256").update(big).digest("hex");
const t0 = Date.now();
const up = await s.createMultipart(key, "application/octet-stream");
const n = Math.ceil(SIZE / PART); const parts = []; let next = 1;
async function worker() { while (next <= n) { const i = next++; const url = await s.presignPart(key, up, i); let r, tries = 0; do { r = await fetch(url, { method: "PUT", body: big.subarray((i - 1) * PART, i * PART) }); } while (!r.ok && ++tries < 3); parts.push({ n: i, etag: r.headers.get("etag") }); if (!r.ok) throw new Error("part " + i + " " + r.status); } }
await Promise.all([worker(), worker(), worker(), worker()]);
await s.completeMultipart(key, up, parts.sort((a, b) => a.n - b.n));
ok((await s.head(key)).size === SIZE, `presigned multipart: ${n} parts, 4 in parallel, ${(SIZE / 1048576).toFixed(1)} MB in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const get = await fetch(await s.presignGet(key, "রিপোর্ট big.bin"));
const buf = Buffer.from(await get.arrayBuffer());
ok(get.ok && crypto.createHash("sha256").update(buf).digest("hex") === want, `presigned GET returns identical bytes (sha256 match); content-disposition: ${get.headers.get("content-disposition")}`);
const bad = (await s.presignGet(key, "")).replace(/X-Amz-Signature=[0-9a-f]{4}/, "X-Amz-Signature=0000");
ok((await fetch(bad)).status === 403, "tampered signature -> 403");
const up2 = await s.createMultipart(key + "x", ""); await s.abortMultipart(key + "x", up2); ok(true, "abort multipart");
await s.del(key); ok((await s.head(key)) === null, "delete + head");
