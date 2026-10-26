/* Replicated metadata store over the storage pool (names, meta, index, text, conversations, stats).
 * - Every write goes to all healthy replicas, stamped with a version (x-amz-meta-v = time-ordered counter); one success is enough.
 * - Reads ask the healthy replicas in parallel, take the newest version and quietly repair replicas that are missing it or stale.
 * - A replica that answers 403/429/5xx/timeout is skipped for COOLDOWN, then tried again (no request fails while one replica works).
 * - Deletes write a tombstone (x-amz-meta-dead=1), so a replica that was down cannot bring a deleted key back.
 * - Objects written before replication (v=0, e.g. on B2) are copied to the other replicas the first time they are read, and by sync().
 * Order: PD_META_ORDER (backend names, comma separated; default filebase,tigris,b2,...); PD_META_EXCLUDE (default coritan). */
const COOLDOWN = Math.max(10000, Number(process.env.PD_META_COOLDOWN_MS) || 10 * 60 * 1000);
const bad = e => /fetch failed|timeout|abort|ECONN|ENOTFOUND|EAI_AGAIN|certificate| 40[13]\b| 429\b| 5\d\d\b|AccessDenied/i.test(String(e && (e.message + " " + (e.cause && e.cause.code || "")) || e));
let clock = 0; const nextV = () => (clock = Math.max(Date.now() * 1000, clock + 1));
export class MetaStore {
  constructor(pool, env = process.env) {
    const ex = new Set(String(env.PD_META_EXCLUDE ?? "coritan").toLowerCase().split(",").map(s => s.trim()).filter(Boolean));
    const order = String(env.PD_META_ORDER || "filebase,tigris,b2,s3").toLowerCase().split(",").map(s => s.trim());
    const rank = b => { const i = order.indexOf(b.name); return i < 0 ? 50 + Number(b.id) : i; };
    this.all = pool.filter(b => !ex.has(b.name)).sort((a, b) => rank(a) - rank(b));
    if (!this.all.length) this.all = pool.slice(0, 1);
    this.legacy = pool[0]; // where metadata lived before replication
    this.max = Math.max(2, Number(env.PD_META_REPLICAS) || 3);
    this.provider = this.all.map(b => b.name).join("+"); this.log = [];
  }
  healthy() { const now = Date.now(); const h = this.all.filter(b => !(b.metaBad > now)); return (h.length ? h : this.all).slice(0, this.max); }
  note(b, e) {
    if (!bad(e)) return false; const was = b.metaBad > Date.now(); b.metaBad = Date.now() + COOLDOWN; b.badUntil = Math.max(b.badUntil || 0, b.metaBad);
    if (!was) { const m = `metadata replica ${b.name} skipped for ${Math.round(COOLDOWN / 60000)} min: ${String(e.message || e).replace(/https?:\/\/\S+/g, "").slice(0, 60)}`; console.warn(m); this.log.unshift({ t: Date.now(), m }); this.log.length = Math.min(this.log.length, 50); }
    return true;
  }
  ok(b) { if (b.metaBad) { b.metaBad = 0; const m = `metadata replica ${b.name} healthy again`; console.warn(m); this.log.unshift({ t: Date.now(), m }); if (this.onBack) this.onBack(b); } }
  async getText(key) {
    const reps = this.healthy(); let lastErr = null;
    const res = await Promise.all(reps.map(async b => { try { const r = await b.st.getTextV(key); this.ok(b); return { b, r }; } catch (e) { if (!this.note(b, e)) lastErr = e; else lastErr = lastErr || e; return { b, err: e }; } }));
    const got = res.filter(x => !x.err);
    if (!got.length) {
      // every replica refused: try the rest of the pool (cooling ones included) before giving up
      for (const b of this.all.filter(b => !reps.includes(b))) { try { const r = await b.st.getTextV(key); this.ok(b); got.push({ b, r }); break; } catch (e) { this.note(b, e); lastErr = e; } }
      if (!got.length) throw lastErr || new Error("storage unavailable");
    }
    let best = null; for (const x of got) if (x.r && (!best || x.r.v > best.r.v)) best = x;
    if (!best && this.legacy && !this.synced && !key.startsWith("stats/") && !got.some(x => x.b === this.legacy)) {
      // not found on the replicas while the old home (B2) is refusing reads: a bucket LIST (separate allowance) tells whether it is really absent
      let there = true; try { there = (await this.legacy.st.listKeys(key, 1)).includes(key); } catch (e) { there = true; }
      if (there) { const e = new Error("storage_reset: this pendrive's data is on a storage account that is resting; it will be back after the daily reset"); e.code = "storage_reset"; throw e; }
    }
    if (!best) return null;
    const stale = got.filter(x => x !== best && (!x.r || x.r.v < best.r.v)).map(x => x.b);
    if (best.r.v === 0) for (const x of got) if (x !== best && !x.r) stale.push(x.b);
    if (stale.length) { const v = best.r.v || nextV(); this.copy(key, best.r, v, [...new Set([...stale, ...(best.r.v ? [] : [best.b])])]).catch(() => {}); }
    return best.r.dead ? null : best.r.text;
  }
  async copy(key, r, v, to) { await Promise.all(to.map(b => b.st.putText(key, r.text, "application/octet-stream", { "x-amz-meta-v": String(v), ...(r.dead ? { "x-amz-meta-dead": "1" } : {}) }).then(() => this.ok(b), e => this.note(b, e)))); }
  async write(key, text, type, extra) {
    const reps = this.healthy(); let n = 0, lastErr = null;
    await Promise.all(reps.map(b => b.st.putText(key, text, type, extra).then(() => { n++; this.ok(b); }, e => { this.note(b, e); lastErr = e; })));
    if (!n) for (const b of this.all.filter(b => !reps.includes(b))) { try { await b.st.putText(key, text, type, extra); n++; this.ok(b); break; } catch (e) { this.note(b, e); lastErr = e; } }
    if (!n) throw lastErr || new Error("storage unavailable");
  }
  putText(key, text, type = "text/plain; charset=utf-8") { return this.write(key, text, type, { "x-amz-meta-v": String(nextV()) }); }
  putJson(key, obj) { return this.putText(key, JSON.stringify(obj), "application/json"); }
  async getJson(key) { const t = await this.getText(key); return t == null ? null : JSON.parse(t); }
  async del(key) { await this.write(key, "", "application/octet-stream", { "x-amz-meta-v": String(nextV()), "x-amz-meta-dead": "1" }); }
  // copy every metadata object a replica (e.g. B2 after an outage) has that others lack or hold older; returns counts
  async sync(from) {
    const src = from || this.legacy; if (!src || !src.st.listKeys) return { copied: 0, checked: 0 };
    const keys = (await src.st.listKeys("names/")).concat((await src.st.listKeys("pendrives/")).filter(k => !/\/f\/[a-f0-9]{24}$/.test(k)), (await src.st.listKeys("stats/")));
    let copied = 0, checked = 0;
    for (let i = 0; i < keys.length; i += 8) await Promise.all(keys.slice(i, i + 8).map(async k => {
      checked++; try { const r = await src.st.getTextV(k); if (!r) return; const others = this.healthy().filter(b => b !== src); const vs = await Promise.all(others.map(b => b.st.getTextV(k).catch(() => ({ v: Infinity }))));
        const need = others.filter((b, j) => !vs[j] || vs[j].v < r.v || (r.v === 0 && !vs[j])); if (need.length) { await this.copy(k, r, r.v || nextV(), need); copied++; } } catch (e) { this.note(src, e); }
    }));
    if (src === this.legacy) { this.synced = true; await this.putJson("stats/meta-synced.json", { t: Date.now(), from: src.name, copied, checked }).catch(() => {}); }
    const m = `metadata sync from ${src.name}: ${copied} copied of ${checked}`; console.warn(m); this.log.unshift({ t: Date.now(), m }); return { copied, checked };
  }
  async init() { try { this.synced = !!(await this.getJson("stats/meta-synced.json")); } catch (e) { this.synced = false; } return this; }
  status() { const now = Date.now(); return { replicas: this.all.map(b => ({ name: b.name, healthy: !(b.metaBad > now), ...(b.metaBad > now ? { retryIn: Math.round((b.metaBad - now) / 1000) } : {}) })), log: this.log.slice(0, 10) }; }
}
