// Mapas de los avistamientos (Leaflet + mapa topográfico de Esri, gratuito y sin clave).
// Leaflet se carga desde index.html; si no está disponible (sin conexión), los mapas se ocultan.

export const CENTRO_ASTURIAS = [43.36, -5.85];
const ZOOM_MAXIMO = 16;

export const hayMapas = () => Boolean(window.L);

/** Crea un mapa en el contenedor indicado, con la capa base ya puesta. */
export function crearMapa(contenedor, opciones = {}) {
  const mapa = L.map(contenedor, { maxZoom: ZOOM_MAXIMO, ...opciones });
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: ZOOM_MAXIMO,
    attribution: "Mapa © Esri, HERE, Garmin, FAO, NOAA · © OpenStreetMap",
  }).addTo(mapa);
  return mapa;
}

/** Marcador en forma de chincheta. */
export function chincheta([lat, lng]) {
  const icono = L.divIcon({
    className: "chincheta",
    html: `<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 1.5C8.3 1.5 2.5 7.4 2.5 15c0 9.6 13.5 25.5 13.5 25.5S29.5 24.6 29.5 15C29.5 7.4 23.7 1.5 16 1.5z"/><circle cx="16" cy="15" r="5.5"/></svg>`,
    iconSize: [32, 42],
    iconAnchor: [16, 41],
    popupAnchor: [0, -36],
  });
  return L.marker([lat, lng], { icon: icono });
}
