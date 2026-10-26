/* Pendrive limited mode: the pendrive keeps opening and working when every storage bucket is down or full.
   - remembers the last file list and every file you viewed (IndexedDB, this device only)
   - saves and uploads that cannot reach storage wait in IndexedDB and are sent automatically when storage is back
   - keeps the signed open ticket from the server (lets the PIN be checked when no bucket can) */
(() => {
  const L = () => (window.settings && settings.lang === "bn");
  const TX = {
    banner: () => L() ? "স্টোরেজ এখন বিশ্রামে, আপনার ফাইল নিরাপদ আছে; শেষ সেভ করা তালিকা দেখানো হচ্ছে; নতুন কাজ এই ডিভাইসে রাখা হচ্ছে এবং নিজে থেকে সিঙ্ক হবে" : "Storage is resting, your files are safe; showing your last saved list; new work is kept on this device and synced automatically",
    wait: n => L() ? `${n}টি সিঙ্কের অপেক্ষায়` : `${n} waiting to sync`,
    queued: () => L() ? "এই ডিভাইসে রাখা হয়েছে, স্টোরেজ ফিরলে নিজে থেকে সিঙ্ক হবে" : "Kept on this device; it will sync automatically when storage is back",
    notCached: () => L() ? "এই ফাইলটা এই ডিভাইসে আগে খোলা হয়নি, তাই স্টোরেজ ফেরা পর্যন্ত দেখা যাবে না" : "This file was not opened on this device before, so it can be viewed when storage is back",
    synced: n => L() ? `${n}টি ফাইল সিঙ্ক হয়েছে` : `${n} waiting file(s) synced`,
  };
  const DOWN = new Set(["storage_reset", "storage_resting", "storage_cap", "storage_denied", "total_cap", "storage_down", "storage_net"]);
  let dbP = null;
  const db = () => dbP || (dbP = new Promise((res, rej) => { const r = indexedDB.open("pd-offline", 1); r.onupgradeneeded = () => { const d = r.result; d.createObjectStore("lists"); d.createObjectStore("files"); d.createObjectStore("queue", { keyPath: "k", autoIncrement: true }); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (st, mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(st, mode); const s = t.objectStore(st); let out; Promise.resolve(fn(s)).then(v => { out = v; }); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
  const key = () => String(pd.name || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  const isDown = e => !!e && (DOWN.has(e.message) || (e.message === "server" && /^storage_/.test((e.info && e.info.why) || "")) || e.status === 502 || e.status === 503 || e.status === 504 || e.message === "Failed to fetch");
  let count = 0;
  async function queued() { const k = key(); const all = await tx("queue", "readonly", s => s.getAll()).catch(() => []); return (all || []).filter(x => x.nn === k); }
  async function badge() {
    count = (await queued()).length;
    let b = document.getElementById("pd-limited"); const main = document.getElementById("pd-main");
    if (!pd.limited && !count) { if (b) b.remove(); return; }
    if (!b && main) { b = document.createElement("div"); b.id = "pd-limited"; b.setAttribute("role", "status"); b.style.cssText = "margin:6px 0;padding:8px 10px;border-radius:8px;background:#fff6d6;color:#5a4500;border:1px solid #e8d48a;font-size:14px"; main.prepend(b); }
    if (b) b.textContent = (pd.limited ? TX.banner() : "") + (count ? (pd.limited ? " · " : "") + TX.wait(count) : "");
  }
  const enter = () => { if (!pd.limited) { pd.limited = true; } badge(); };
  const leave = () => { pd.limited = false; badge(); };
  const tk = n => "pd:ticket:" + String(n || "").normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
  window.PDO = {
    TX, isDown, enter, leave, badge,
    ticket: name => { try { return localStorage.getItem(tk(name)) || undefined; } catch (e) { return undefined; } },
    opened(j, name) { try { if (j.ticket) localStorage.setItem(tk(name), j.ticket); } catch (e) { /* ignore */ } if (j.limited) enter(); else leave(); },
    async saveList(j) { await tx("lists", "readwrite", s => s.put({ files: j.files, folders: j.folders, quota: j.quota, used: j.used, binUsed: j.binUsed, maxFile: j.maxFile, name: j.name, at: Date.now() }, key())).catch(() => {}); },
    async loadList() { return tx("lists", "readonly", s => s.get(key())).catch(() => null); },
    async blob(f, get) { // f: pendrive file row; get(): fetches the Blob from storage
      const fk = key() + "|" + f.id;
      if (!pd.limited) { try { const b = await get(); if (b.size <= 25 * 1024 * 1024) tx("files", "readwrite", s => s.put({ blob: b, path: f.path, at: Date.now() }, fk)).catch(() => {}); return b; } catch (e) { if (!isDown(e)) throw e; enter(); } }
      const c = await tx("files", "readonly", s => s.get(fk)).catch(() => null);
      if (c && c.blob) return c.blob; const e = new Error("not_cached"); e.text = TX.notCached(); throw e;
    },
    async enqueue(u) { await tx("queue", "readwrite", s => s.add({ nn: key(), path: u.path, name: u.file.name, type: u.file.type, blob: u.file, text: u.text, overwrite: !!u.overwrite, at: Date.now() })); u.state = "queued"; u.err = TX.queued(); enter(); },
    async flush() {
      const list = await queued(); if (!list.length) return 0;
      for (const x of list) { await tx("queue", "readwrite", s => s.delete(x.k)); pdQueue([{ file: new File([x.blob], x.name, { type: x.type }), path: x.path, text: x.text, overwrite: x.overwrite }]); }
      badge(); return list.length;
    },
  };
  let busy = false;
  async function tick() { // every 30 s while limited or something waits: try storage again; on success leave limited mode and send the waiting files
    if (busy || !pd.token) return; if (!pd.limited && !count) return; busy = true;
    try { const j = await pdApi("list"); if (j.limited) return; leave(); await PDO.saveList(j); const n = await PDO.flush(); await pdRefresh().catch(() => {}); if (n) toast(TX.synced(n)); }
    catch (e) { if (isDown(e)) enter(); }
    finally { busy = false; }
  }
  setInterval(tick, 30000); window.addEventListener("online", () => setTimeout(tick, 1000));
  setTimeout(() => { if (window.pd && pd.token) badge(); }, 500);
})();
