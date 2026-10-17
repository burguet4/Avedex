// Capa de datos: todo lo que la app guarda o lee pasa por aquí.
// Los avistamientos se guardan en el propio navegador (IndexedDB). Para añadir cuentas de
// usuario basta con cambiar este archivo por uno que hable con un servidor (p. ej. Supabase).

const BD_NOMBRE = "avedex";
const BD_VERSION = 1;
const ALMACEN = "avistamientos";

let conexion = null;

function abrirBD() {
  conexion ??= new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BD_NOMBRE, BD_VERSION);
    peticion.onupgradeneeded = () => {
      const almacen = peticion.result.createObjectStore(ALMACEN, { keyPath: "id" });
      almacen.createIndex("especieId", "especieId");
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
  return conexion;
}

/** Ejecuta una operación sobre el almacén y devuelve su resultado al terminar la transacción. */
async function operacion(modo, accion) {
  const bd = await abrirBD();
  return new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    const peticion = accion(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolver(peticion.result);
    tx.onerror = () => rechazar(tx.error);
  });
}

/** Catálogo de especies (fijo, viene en datos/especies.json). */
export async function obtenerEspecies() {
  const respuesta = await fetch("datos/especies.json");
  if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo de especies");
  return (await respuesta.json()).especies;
}

/** Autor y licencia de cada foto. */
export async function obtenerCreditos() {
  try {
    const respuesta = await fetch("datos/creditos.json");
    return respuesta.ok ? await respuesta.json() : {};
  } catch {
    return {};
  }
}

/** Todos los avistamientos del usuario. */
export function obtenerAvistamientos() {
  return operacion("readonly", (almacen) => almacen.getAll());
}

/** Avistamientos de una especie, del más reciente al más antiguo. */
export async function obtenerAvistamientosDe(especieId) {
  const lista = await operacion("readonly", (almacen) => almacen.index("especieId").getAll(especieId));
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado - a.creado);
}

/** Crea o actualiza un avistamiento y lo devuelve. */
export async function guardarAvistamiento(datos) {
  const avistamiento = {
    id: datos.id ?? crypto.randomUUID(),
    especieId: datos.especieId,
    fecha: datos.fecha,
    sexo: datos.sexo ?? "desconocido", // "macho" | "hembra" | "desconocido"
    lugar: datos.lugar ?? "",
    lat: datos.lat ?? null,
    lng: datos.lng ?? null,
    notas: datos.notas ?? "",
    creado: datos.creado ?? Date.now(),
  };
  await operacion("readwrite", (almacen) => almacen.put(avistamiento));
  return avistamiento;
}

export function borrarAvistamiento(id) {
  return operacion("readwrite", (almacen) => almacen.delete(id));
}
