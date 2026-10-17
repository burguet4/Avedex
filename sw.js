// Service worker de Payarinos: guarda la app en el móvil para que abra rápido y funcione sin cobertura.
// Cambia VERSION cada vez que publiques cambios para que los móviles descarguen la versión nueva.
const VERSION = "payarinos-v14";
const BASICOS = [
  "./",
  "index.html",
  "css/estilos.css",
  "js/app.js",
  "js/datos.js",
  "js/lugares.js",
  "js/vida.js",
  "datos/especies.json",
  "img/silueta.svg",
  "manifest.webmanifest",
  "img/iconos/icono-192.png",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Las teselas del mapa y las búsquedas de lugares no se guardan: ocuparían demasiado.
  if (url.hostname.endsWith("arcgisonline.com") || url.hostname.endsWith("tile.openstreetmap.org") || url.hostname === "photon.komoot.io") return;

  // Responde con lo guardado al instante y actualiza en segundo plano.
  ev.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const guardada = await cache.match(req, { ignoreSearch: url.origin === location.origin });
      const red = fetch(req)
        .then((resp) => {
          if (resp.ok || resp.type === "opaque") cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => guardada);
      return guardada || red;
    }),
  );
});
