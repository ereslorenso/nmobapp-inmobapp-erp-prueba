# InmobApp ERP · ambiente de prueba

ERP de InmobApp (ventas, finanzas, administración de inmuebles, nómina y contabilidad) servido por un servidor Node sin dependencias, con usuario y contraseña y sincronización entre usuarios.

## Demo en línea (GitHub Pages)

https://ereslorenso.github.io/nmobapp-inmobapp-erp-prueba/

Versión para ejercicios: arranca con datos de ejemplo y cada persona trabaja con su propia copia guardada en su navegador (no se comparte con el resto). Para volver a empezar: Configuración › Respaldo de datos › **Restablecer demo**. Código en `docs/`.

## Probarlo en GitHub Codespaces (recomendado para el equipo)

1. En este repositorio: **Code › Codespaces › Create codespace on main**.
2. Espera a que termine de cargar. El servidor arranca solo; la terminal muestra el **usuario y la contraseña** (también están en `config.json`).
3. Abre la pestaña **Ports**, busca el puerto **8080** y abre la dirección `https://…-8080.app.github.dev`.
4. Para compartir con el equipo: clic derecho en el puerto 8080 › **Port visibility › Public** y comparte la dirección y la contraseña.
5. Primera vez: Configuración › Respaldo de datos › **Importar** y elige `datos-de-ejemplo.json`.

> El codespace se apaga solo tras 30 minutos sin uso. Al volver a abrirlo los datos siguen ahí; si se **elimina** el codespace, se pierden: exporta un respaldo antes.

## Probarlo en una computadora o servidor

Requisito: Node.js 18 o superior.

```bash
node server.js          # http://localhost:8080
```

En Windows: doble clic en `iniciar-servidor.bat`. Más detalle (red de oficina, VPS, servicio systemd) en `LEEME.txt`.

## Estructura

| Archivo | Función |
|---|---|
| `server.js` | Servidor HTTP, autenticación, API de datos y respaldos diarios |
| `public/index.html` | Aplicación ERP completa |
| `public/web-bridge.js` | Conecta la aplicación con la API y detecta cambios de otros usuarios |
| `public/desktop-shim.js` | Capa de datos compartida con la app de escritorio |
| `datos-de-ejemplo.json` | Datos ficticios para demostración |

## Limitaciones de esta versión de prueba

- Un solo usuario compartido, sin roles.
- Si dos personas editan el mismo registro a la vez, queda el último cambio.
- No usar con datos reales de clientes fuera de un entorno HTTPS controlado.
