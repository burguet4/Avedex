// Service worker: guarda la app en el dispositivo para que abra rápido y funcione sin cobertura.
// Hay que subir VERSION cada vez que se publiquen cambios para que se descargue la versión nueva.
const VERSION = "avedex-v1";

const ARCHIVOS_BASE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/estilos.css",
  "js/app.js",
  "js/datos.js",
  "js/lugares.js",
  "js/mapa.js",
  "js/util.js",
  "js/vida.js",
  "datos/especies.json",
  "img/silueta.svg",
  "img/iconos/icono-192.png",
];

// Teselas del mapa y búsquedas de lugares: siempre de la red, sin guardar (ocuparían demasiado)
const SOLO_RED = ["arcgisonline.com", "photon.komoot.io"];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ARCHIVOS_BASE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((clave) => clave !== VERSION).map((clave) => caches.delete(clave))))
      .then(() => self.clients.claim()),
  );
});

// Responde con lo guardado al instante y lo actualiza en segundo plano
self.addEventListener("fetch", (ev) => {
  const peticion = ev.request;
  if (peticion.method !== "GET") return;
  const url = new URL(peticion.url);
  if (SOLO_RED.some((dominio) => url.hostname.endsWith(dominio))) return;

  ev.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const guardada = await cache.match(peticion, { ignoreSearch: url.origin === location.origin });
      const deLaRed = fetch(peticion)
        .then((respuesta) => {
          if (respuesta.ok || respuesta.type === "opaque") cache.put(peticion, respuesta.clone());
          return respuesta;
        })
        .catch(() => guardada);
      return guardada || deLaRed;
    }),
  );
});
