// Puente web: conecta la página con el servidor y detecta cambios hechos por otros usuarios.
(function () {
  "use strict";
  let rev = 0;
  const j = r => { if (!r.ok) throw { code: r.status === 401 ? "revoked" : "unavailable", message: "Error " + r.status }; return r.json(); };
  const listeners = [];
  window.desktop = {
    async load() { const d = await fetch("/api/data", { cache: "no-store" }).then(j); rev = d.rev; return d.data; },
    async op(o) { const d = await fetch("/api/op", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) }).then(j); if (d.rev === rev + 1) rev = d.rev; return true; },
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
        let txt; try { txt = await f.text(); JSON.parse(txt); } catch (e) { alert("El archivo no es un respaldo de InmobApp ERP."); return; }
        if (!confirm("¿Reemplazar TODOS los datos del servidor con este respaldo? Se guarda una copia de los datos actuales antes de reemplazarlos.")) return;
        const r = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: txt });
        if (!r.ok) { const e = await r.json().catch(() => ({})); alert(e.error || "No se pudo importar."); return; }
        location.reload();
      };
      inp.click();
    },
    exportBackup() {},
    openDataFolder() { alert("Los datos están en la carpeta «datos» junto al archivo server.js del servidor."); },
    onRemoteChange(cb) { listeners.push(cb); }
  };
  // Cada 5 segundos revisa si otro usuario cambió algo.
  setInterval(async () => {
    try {
      const d = await fetch("/api/rev", { cache: "no-store" }).then(j);
      if (d.rev > rev) { rev = d.rev; listeners.forEach(cb => cb()); }
    } catch (_) {}
  }, 5000);
})();
