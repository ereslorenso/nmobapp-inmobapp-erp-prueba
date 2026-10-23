// Puente demo para GitHub Pages: guarda los datos en el navegador de cada persona.
// Primera visita: carga datos-de-ejemplo.json. Cada persona trabaja con su propia copia.
(function () {
  "use strict";
  const KEY = "inmobapp-erp-demo-v1";
  let data = null, timer = null;
  const persist = () => { clearTimeout(timer); timer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn("No se pudo guardar", e); } }, 200); };
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  const merge = (a, b) => { for (const k of Object.keys(b)) { if (isObj(b[k]) && isObj(a[k])) merge(a[k], b[k]); else a[k] = b[k]; } return a; };
  async function sample() { try { const j = await fetch("datos-de-ejemplo.json", { cache: "no-store" }).then(r => r.json()); return isObj(j.data) ? j.data : {}; } catch (_) { return {}; } }
  window.addEventListener("beforeunload", () => { if (timer) { clearTimeout(timer); try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {} } });
  window.desktop = {
    async load() {
      if (data) return data;
      try { const s = localStorage.getItem(KEY); if (s) data = JSON.parse(s); } catch (_) {}
      if (!isObj(data)) { data = await sample(); persist(); }
      return data;
    },
    async op(o) {
      const col = (data[o.col] = data[o.col] || {});
      if (o.op === "set") col[o.id] = o.data;
      else if (o.op === "update" && col[o.id]) merge(col[o.id], o.data);
      else if (o.op === "delete") delete col[o.id];
      persist(); return true;
    },
    async saveFile(name, content) {
      const blob = new Blob([content], { type: /\.pdf$/i.test(name) ? "application/pdf" : /\.csv$/i.test(name) ? "text/csv" : "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return { canceled: false };
    },
    importBackup() {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        let j; try { j = JSON.parse(await f.text()); } catch (_) { alert("El archivo no es un respaldo de InmobApp ERP."); return; }
        if (!j || !isObj(j.data)) { alert("El archivo no es un respaldo de InmobApp ERP."); return; }
        if (!confirm("¿Reemplazar los datos de esta demo con el respaldo?")) return;
        data = j.data; clearTimeout(timer); timer = null; localStorage.setItem(KEY, JSON.stringify(data)); location.reload();
      };
      inp.click();
    },
    exportBackup() {},
    demo: true,
    async openDataFolder() {
      if (!confirm("Demo: ¿borrar tus cambios y volver a los datos de ejemplo?")) return;
      data = await sample(); clearTimeout(timer); timer = null; localStorage.setItem(KEY, JSON.stringify(data)); location.reload();
    }
  };
  // Aviso de modo demo
  document.addEventListener("DOMContentLoaded", () => {
    const b = document.createElement("div");
    b.textContent = "Modo demo · datos guardados solo en este navegador";
    b.style.cssText = "position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:9999;background:#ec7734;color:#fff;font:600 12px 'Public Sans',sans-serif;padding:6px 12px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.2);max-width:calc(100% - 32px);text-align:center;pointer-events:none;opacity:.92";
    document.body.appendChild(b);
  });
})();
