// Adaptador local: ofrece a la página la misma interfaz de datos que usa en Claude
// (colecciones, documentos y suscripciones), pero guardando en esta computadora.
(function () {
  "use strict";
  const D = window.desktop;
  if (!D) return;
  let cache = {};
  const listeners = {};
  const ready = D.load().then(d => { cache = d || {}; });
  const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const merge = (a, b) => { for (const k of Object.keys(b)) { if (isObj(b[k]) && isObj(a[k])) merge(a[k], b[k]); else a[k] = b[k]; } return a; };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  const meta = { fromCache: false, hasPendingWrites: false };
  const docSnap = (id, v) => ({ id, exists: v !== undefined, data: () => clone(v), metadata: meta });
  function snap(col) {
    const m = cache[col] || {};
    const docs = Object.keys(m).map(id => docSnap(id, m[id]));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => docs.map((d, i) => ({ type: "added", doc: d, oldIndex: -1, newIndex: i })), metadata: meta };
  }
  function fire(col) {
    const set = listeners[col];
    if (!set) return;
    const s = snap(col);
    set.forEach(fn => { try { fn(s); } catch (e) { console.error(e); } });
  }
  function docRef(col, id) {
    id = id || newId();
    return {
      id, path: col + "/" + id,
      async get() { await ready; return docSnap(id, (cache[col] || {})[id]); },
      async set(data) { await ready; (cache[col] = cache[col] || {})[id] = clone(data); await D.op({ op: "set", col, id, data: clone(data) }); fire(col); },
      async update(data) {
        await ready; const m = cache[col] || {};
        if (!m[id]) throw { code: "invalid_argument", message: "El documento no existe" };
        merge(m[id], clone(data)); await D.op({ op: "update", col, id, data: clone(data) }); fire(col);
      },
      async delete() { await ready; if (cache[col]) delete cache[col][id]; await D.op({ op: "delete", col, id }); fire(col); },
      onSnapshot(next) {
        const fn = s => { const d = s.docs.find(x => x.id === id); next(d || docSnap(id, undefined)); };
        (listeners[col] = listeners[col] || new Set()).add(fn);
        ready.then(() => fn(snap(col)));
        return () => listeners[col].delete(fn);
      }
    };
  }
  function collection(col) {
    return {
      path: col,
      doc: id => docRef(col, id),
      async add(data) { const r = docRef(col); await r.set(data); return r; },
      async get() { await ready; return snap(col); },
      onSnapshot(next) {
        (listeners[col] = listeners[col] || new Set()).add(next);
        ready.then(() => next(snap(col)));
        return () => listeners[col].delete(next);
      }
    };
  }
  const db = { collection, doc: p => { const i = p.lastIndexOf("/"); return docRef(p.slice(0, i), p.slice(i + 1)); } };
  const user = { can: async () => true, canEdit: async () => true, isOwner: async () => true, id: async () => "local", me: async () => ({ id: "local", name: "", email: null }) };
  const downloads = {
    async save({ filename, data }) {
      const content = typeof data === "string" ? data : (data instanceof ArrayBuffer ? data : (data && data.buffer ? data.buffer : data));
      const r = await D.saveFile(filename, content);
      if (!r || r.canceled) throw { code: "cancelled", message: "Cancelado" };
      return { status: "saved" };
    }
  };
  // En la versión de servidor, otros usuarios pueden cambiar datos: se recargan y se notifica a la página.
  if (typeof D.onRemoteChange === "function") {
    D.onRemoteChange(async () => { const d = await D.load(); cache = d || {}; Object.keys(listeners).forEach(fire); });
  }
  window.claude = { use: async name => (name === "db" ? db : name === "user" ? user : name === "downloads" ? downloads : null) };
})();
