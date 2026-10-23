// InmobApp ERP · servidor de prueba
// Sin dependencias: solo necesita Node.js 18 o superior.
// Uso: node server.js   (variables opcionales: PORT, HOST, ERP_USER, ERP_PASSWORD)
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "datos");
const DATA_FILE = path.join(DATA_DIR, "inmobapp-erp-datos.json");
const BACKUP_DIR = path.join(DATA_DIR, "respaldos");
const CONFIG_FILE = path.join(ROOT, "config.json");
const PORT = +process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

/* ---------- configuración y contraseña ---------- */
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch (_) {}
if (!cfg.user || !cfg.password) {
  cfg.user = cfg.user || "admin";
  cfg.password = cfg.password || crypto.randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "x");
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}
const USER = process.env.ERP_USER || cfg.user;
const PASS = process.env.ERP_PASSWORD || cfg.password;

/* ---------- datos ---------- */
let data = {}, rev = 1, saveTimer = null;
const isObj = v => v && typeof v === "object" && !Array.isArray(v);
const merge = (a, b) => { for (const k of Object.keys(b)) { if (isObj(b[k]) && isObj(a[k])) merge(a[k], b[k]); else a[k] = b[k]; } return a; };
function load() {
  try { const j = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); data = isObj(j.data) ? j.data : {}; rev = j.rev || 1; }
  catch (e) { if (fs.existsSync(DATA_FILE)) { fs.renameSync(DATA_FILE, DATA_FILE + ".danado-" + Date.now()); } data = {}; }
}
function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ app: "InmobApp ERP", version: 1, rev, savedAt: new Date().toISOString(), data }));
  fs.renameSync(tmp, DATA_FILE);
}
const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 300); };
function dailyBackup() {
  if (!fs.existsSync(DATA_FILE)) return;
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const t = path.join(BACKUP_DIR, "respaldo-" + new Date().toISOString().slice(0, 10) + ".json");
  if (!fs.existsSync(t)) fs.copyFileSync(DATA_FILE, t);
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith("respaldo-")).sort();
  while (files.length > 30) fs.unlinkSync(path.join(BACKUP_DIR, files.shift()));
}

/* ---------- utilidades http ---------- */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".css": "text/css; charset=utf-8", ".ico": "image/x-icon" };
function send(res, code, body, type, extra) {
  res.writeHead(code, Object.assign({ "Content-Type": type || "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, extra || {}));
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > limit) { reject(new Error("too_large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function authorized(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Basic ")) return false;
  const [u, ...p] = Buffer.from(h.slice(6), "base64").toString("utf8").split(":");
  const a = Buffer.from(u + ":" + p.join(":")), b = Buffer.from(USER + ":" + PASS);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- servidor ---------- */
const server = http.createServer(async (req, res) => {
  try {
    if (!authorized(req)) return send(res, 401, "Se requiere usuario y contraseña", "text/plain; charset=utf-8", { "WWW-Authenticate": 'Basic realm="InmobApp ERP", charset="UTF-8"' });
    const url = new URL(req.url, "http://x");
    const p = url.pathname;
    if (p === "/api/data" && req.method === "GET") return send(res, 200, { rev, data });
    if (p === "/api/rev" && req.method === "GET") return send(res, 200, { rev });
    if (p === "/api/op" && req.method === "POST") {
      const o = JSON.parse(await readBody(req, 2 * 1024 * 1024));
      if (!o || typeof o.col !== "string" || typeof o.id !== "string" || !/^[\w\-.:@+~]{1,200}$/.test(o.col + o.id)) return send(res, 400, { error: "invalid_argument" });
      const col = (data[o.col] = data[o.col] || {});
      if (o.op === "set") col[o.id] = o.data;
      else if (o.op === "update") { if (!col[o.id]) return send(res, 400, { error: "invalid_argument" }); merge(col[o.id], o.data); }
      else if (o.op === "delete") delete col[o.id];
      else return send(res, 400, { error: "invalid_argument" });
      rev++; saveSoon();
      return send(res, 200, { rev });
    }
    if (p === "/api/import" && req.method === "POST") {
      const j = JSON.parse(await readBody(req, 50 * 1024 * 1024));
      if (!j || !isObj(j.data)) return send(res, 400, { error: "El archivo no es un respaldo de InmobApp ERP." });
      saveNow();
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, "antes-de-importar-" + Date.now() + ".json"));
      data = j.data; rev++; saveNow();
      return send(res, 200, { rev });
    }
    if (req.method !== "GET") return send(res, 405, { error: "method_not_allowed" });
    const file = path.normalize(path.join(PUBLIC, p === "/" ? "index.html" : decodeURIComponent(p)));
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, "No encontrado", "text/plain; charset=utf-8");
    return send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || "application/octet-stream");
  } catch (e) {
    return send(res, e.message === "too_large" ? 413 : 500, { error: e.message });
  }
});

load(); try { dailyBackup(); } catch (_) {}
setInterval(() => { try { dailyBackup(); } catch (_) {} }, 6 * 3600 * 1000);
process.on("SIGINT", () => { try { saveNow(); } catch (_) {} process.exit(0); });
process.on("SIGTERM", () => { try { saveNow(); } catch (_) {} process.exit(0); });
server.listen(PORT, HOST, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
  console.log("\n  InmobApp ERP está funcionando.\n");
  console.log("  En esta computadora:  http://localhost:" + PORT);
  ips.forEach(ip => console.log("  En tu red / servidor: http://" + ip + ":" + PORT));
  console.log("\n  Usuario:    " + USER + "\n  Contraseña: " + PASS + "\n  (puedes cambiarlos en config.json)\n");
  console.log("  Datos en: " + DATA_FILE + "\n  Deja esta ventana abierta mientras la usen. Ctrl+C para detener.\n");
});
