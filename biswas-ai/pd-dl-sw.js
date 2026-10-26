// streams a ZIP built in the page to a normal browser download, with back-pressure (one chunk per pull).
const jobs = new Map();
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("message", e => { const d = e.data || {}; if (d.type === "pd-dl" && d.id && e.ports[0]) jobs.set(String(d.id), { name: String(d.name || "download.zip"), port: e.ports[0] }); });
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url); const m = u.pathname.match(/^\/pd-dl\/([a-z0-9]+)$/);
  if (!m) return;
  const job = jobs.get(m[1]); if (!job) { e.respondWith(new Response("expired", { status: 404 })); return; }
  jobs.delete(m[1]);
  const { port, name } = job;
  const stream = new ReadableStream({
    pull: c => new Promise(res => { port.onmessage = ev => { const d = ev.data; if (d === "end") c.close(); else if (d && d.error) c.error(new Error(d.error)); else c.enqueue(new Uint8Array(d)); res(); }; port.postMessage("pull"); }),
    cancel: () => port.postMessage("cancel")
  });
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\%]/g, "_");
  e.respondWith(new Response(stream, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${enc(name)}` } }));
});
