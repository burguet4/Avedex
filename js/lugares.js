// Búsqueda de lugares para los avistamientos.
// Usa Photon (https://photon.komoot.io), un buscador gratuito y sin clave basado en OpenStreetMap,
// pensado para autocompletar. Las búsquedas se limitan a Asturias.

const API = "https://photon.komoot.io";
const CAJA_ASTURIAS = "-7.25,42.85,-4.45,43.75"; // oeste, sur, este, norte

// Lugares clásicos para ver aves en Asturias. Se encuentran escribiendo su nombre en castellano
// (en OpenStreetMap muchos aparecen con el topónimo asturiano, como "Peñes" para Peñas).
// Las coordenadas son aproximadas: al elegir uno, el punto se puede afinar tocando el mapa.
const DESTACADOS = [
  { nombre: "Cabo Peñas, Gozón", lat: 43.6560, lng: -5.8490, alias: "peñes faro" },
  { nombre: "Ría de Villaviciosa", lat: 43.5150, lng: -5.3950, alias: "reserva natural" },
  { nombre: "Playa de Rodiles, Villaviciosa", lat: 43.5330, lng: -5.3780 },
  { nombre: "Ría del Eo", lat: 43.5000, lng: -7.0300, alias: "castropol figueras vegadeo" },
  { nombre: "Ría de Avilés", lat: 43.5750, lng: -5.9250 },
  { nombre: "Charca de Zeluán, Gozón", lat: 43.5830, lng: -5.9390, alias: "ensenada de llodero" },
  { nombre: "Embalse de Trasona, Corvera", lat: 43.5560, lng: -5.8880 },
  { nombre: "Embalse de La Granda, Gozón", lat: 43.5330, lng: -5.8620 },
  { nombre: "Isla de Deva, Castrillón", lat: 43.5920, lng: -5.9950 },
  { nombre: "Cabo Vidío, Cudillero", lat: 43.5940, lng: -6.2450 },
  { nombre: "Cabo Busto, Valdés", lat: 43.5670, lng: -6.4700 },
  { nombre: "Ría de Navia", lat: 43.5350, lng: -6.7200 },
  { nombre: "Ría del Nalón, San Esteban de Pravia", lat: 43.5600, lng: -6.0800 },
  { nombre: "Puerto de El Musel, Gijón", lat: 43.5600, lng: -5.6950, alias: "xixon" },
  { nombre: "Lagos de Covadonga, Cangas de Onís", lat: 43.2700, lng: -4.9850, alias: "picos de europa enol ercina" },
  { nombre: "Parque Natural de Somiedo", lat: 43.0950, lng: -6.2550 },
  { nombre: "Reserva de Muniellos, Cangas del Narcea", lat: 43.0300, lng: -6.7000 },
  { nombre: "Puerto de Leitariegos", lat: 42.9950, lng: -6.4150 },
  { nombre: "Puerto de Pajares", lat: 42.9900, lng: -5.7700 },
];

// Importancia de cada tipo de objeto de OpenStreetMap para elegir un lugar (menor = antes)
const PRIORIDAD = { place: 0, natural: 1, leisure: 2, boundary: 2, tourism: 3, waterway: 3, man_made: 4, landuse: 5, highway: 8 };
const DESCARTAR = new Set(["shop", "railway", "amenity", "office", "craft", "building", "house"]);
// Tipos cuyo nombre no sirve al marcar un punto en el mapa (una calle, un edificio…)
const POCO_UTILES = new Set(["highway", "building", "house", "railway", "power", "barrier", "amenity", "shop"]);

const normalizar = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function aLugar(f, paraPunto = false) {
  const p = f.properties ?? {};
  const [lng, lat] = f.geometry.coordinates;
  const provincia = (x) => !x || /asturias|asturies/i.test(x); // "Asturias" no aporta nada aquí
  const localidad = [p.city, p.town, p.village, p.locality, p.district, p.county].find((x) => !provincia(x));
  const nombre = paraPunto && POCO_UTILES.has(p.osm_key) ? null : p.name;
  const partes = [nombre, localidad].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
  const zona = [p.county, p.state].filter((x) => !provincia(x) && !partes.includes(x));
  return {
    nombre: partes.join(", ") || zona[0] || "",
    detalle: zona.join(", "),
    tipo: p.osm_key,
    lat: +lat.toFixed(5),
    lng: +lng.toFixed(5),
  };
}

/** Sugerencias para lo que el usuario está escribiendo. */
export async function buscarLugares(texto, senal) {
  const t = normalizar(texto);
  const propios = DESTACADOS
    .filter((d) => normalizar(`${d.nombre} ${d.alias ?? ""}`).includes(t))
    .map((d) => ({ nombre: d.nombre, detalle: "Lugar destacado para ver aves", lat: d.lat, lng: d.lng }));

  let externos = [];
  try {
    const r = await fetch(`${API}/api/?q=${encodeURIComponent(texto)}&limit=15&bbox=${CAJA_ASTURIAS}`, { signal: senal });
    if (r.ok) {
      const { features = [] } = await r.json();
      externos = features
        .filter((f) => !DESCARTAR.has(f.properties?.osm_key))
        .map((f) => aLugar(f))
        .sort((a, b) => (PRIORIDAD[a.tipo] ?? 6) - (PRIORIDAD[b.tipo] ?? 6));
    }
  } catch (err) {
    if (err.name === "AbortError") throw err;
    // sin conexión: se quedan solo los lugares destacados
  }

  const vistos = new Set();
  return [...propios, ...externos]
    .filter((l) => l.nombre && !vistos.has(normalizar(l.nombre)) && vistos.add(normalizar(l.nombre)))
    .slice(0, 6);
}

/** Nombre del sitio más cercano a un punto del mapa. */
export async function nombreDelPunto(lat, lng) {
  const r = await fetch(`${API}/reverse?lat=${lat}&lon=${lng}&limit=1`);
  if (!r.ok) throw new Error("No se pudo obtener el nombre del lugar");
  const { features = [] } = await r.json();
  return features.length ? aLugar(features[0], true).nombre : "";
}
