// Búsqueda de lugares para los avistamientos con Photon (https://photon.komoot.io),
// un buscador gratuito y sin clave basado en OpenStreetMap. Las búsquedas se limitan a Asturias.

import { normalizar } from "./util.js";

const API = "https://photon.komoot.io";
const CAJA_ASTURIAS = "-7.25,42.85,-4.45,43.75"; // oeste, sur, este, norte
const MAX_SUGERENCIAS = 6;

// Sitios clásicos para ver aves. Van primero y se encuentran escribiendo en castellano
// (en OpenStreetMap muchos están con el topónimo asturiano, como "Peñes" para Peñas).
// Las coordenadas son aproximadas: el punto se puede afinar tocando el mapa.
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

// Orden de preferencia según el tipo de objeto de OpenStreetMap (menor = antes)
const PRIORIDAD = { place: 0, natural: 1, leisure: 2, boundary: 2, tourism: 3, waterway: 3, man_made: 4, landuse: 5, highway: 8 };
// Tipos que no se sugieren al escribir (tiendas, paradas, edificios…)
const DESCARTAR = new Set(["shop", "railway", "amenity", "office", "craft", "building", "house"]);
// Tipos cuyo nombre no sirve al marcar un punto en el mapa (una calle, un edificio…)
const POCO_UTILES = new Set(["highway", "building", "house", "railway", "power", "barrier", "amenity", "shop"]);

const esAsturias = (texto) => !texto || /asturias|asturies/i.test(texto);

/** Convierte un resultado de Photon en { nombre, detalle, tipo, lat, lng }. */
function aLugar(resultado, paraPunto = false) {
  const p = resultado.properties ?? {};
  const [lng, lat] = resultado.geometry.coordinates;
  const localidad = [p.city, p.town, p.village, p.locality, p.district, p.county].find((x) => !esAsturias(x));
  const nombre = paraPunto && POCO_UTILES.has(p.osm_key) ? null : p.name;
  const partes = [...new Set([nombre, localidad].filter(Boolean))];
  const zona = [p.county, p.state].filter((x) => !esAsturias(x) && !partes.includes(x));
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
  const destacados = DESTACADOS
    .filter((d) => normalizar(`${d.nombre} ${d.alias ?? ""}`).includes(t))
    .map(({ nombre, lat, lng }) => ({ nombre, detalle: "Lugar destacado para ver aves", lat, lng }));

  let encontrados = [];
  try {
    const respuesta = await fetch(`${API}/api/?q=${encodeURIComponent(texto)}&limit=15&bbox=${CAJA_ASTURIAS}`, { signal: senal });
    if (respuesta.ok) {
      const { features = [] } = await respuesta.json();
      encontrados = features
        .filter((f) => !DESCARTAR.has(f.properties?.osm_key))
        .map((f) => aLugar(f))
        .sort((a, b) => (PRIORIDAD[a.tipo] ?? 6) - (PRIORIDAD[b.tipo] ?? 6));
    }
  } catch (err) {
    if (err.name === "AbortError") throw err;
    // Sin conexión: solo se sugieren los lugares destacados
  }

  const vistos = new Set();
  return [...destacados, ...encontrados]
    .filter(({ nombre }) => nombre && !vistos.has(normalizar(nombre)) && vistos.add(normalizar(nombre)))
    .slice(0, MAX_SUGERENCIAS);
}

/** Nombre del sitio más cercano a un punto del mapa. */
export async function nombreDelPunto(lat, lng) {
  const respuesta = await fetch(`${API}/reverse?lat=${lat}&lon=${lng}&limit=1`);
  if (!respuesta.ok) throw new Error("No se pudo obtener el nombre del lugar");
  const { features = [] } = await respuesta.json();
  return features.length ? aLugar(features[0], true).nombre : "";
}
