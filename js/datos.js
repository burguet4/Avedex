// Capa de datos de Payarinos.
// Todo lo que la app guarda o lee pasa por aquí. Ahora usa IndexedDB (dentro del navegador);
// cuando se añadan las cuentas, solo habrá que cambiar este archivo para hablar con Supabase.

const BD_NOMBRE = "payarinos";
const BD_VERSION = 1;
const ALMACEN = "avistamientos";

let bdPromesa = null;

function abrirBD() {
  if (!bdPromesa) {
    bdPromesa = new Promise((resolver, rechazar) => {
      const peticion = indexedDB.open(BD_NOMBRE, BD_VERSION);
      peticion.onupgradeneeded = () => {
        const bd = peticion.result;
        if (!bd.objectStoreNames.contains(ALMACEN)) {
          const almacen = bd.createObjectStore(ALMACEN, { keyPath: "id" });
          almacen.createIndex("especieId", "especieId");
        }
      };
      peticion.onsuccess = () => resolver(peticion.result);
      peticion.onerror = () => rechazar(peticion.error);
    });
  }
  return bdPromesa;
}

function operacion(modo, accion) {
  return abrirBD().then((bd) => new Promise((resolver, rechazar) => {
    const tx = bd.transaction(ALMACEN, modo);
    const resultado = accion(tx.objectStore(ALMACEN));
    tx.oncomplete = () => resolver(resultado?.result);
    tx.onerror = () => rechazar(tx.error);
  }));
}

/** Catálogo de especies (fijo, viene en datos/especies.json). */
export async function obtenerEspecies() {
  const r = await fetch("datos/especies.json");
  if (!r.ok) throw new Error("No se pudo cargar el catálogo de especies");
  return (await r.json()).especies;
}

/** Autores y licencias de las fotos (puede no existir aún). */
export async function obtenerCreditos() {
  try {
    const r = await fetch("datos/creditos.json");
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

/** Todos los avistamientos del usuario. */
export function obtenerAvistamientos() {
  return operacion("readonly", (a) => a.getAll());
}

/** Avistamientos de una especie, del más reciente al más antiguo. */
export async function obtenerAvistamientosDe(especieId) {
  const lista = await operacion("readonly", (a) => a.index("especieId").getAll(especieId));
  return lista.sort((x, y) => y.fecha.localeCompare(x.fecha) || y.creado - x.creado);
}

/** Crea o actualiza un avistamiento. Devuelve el avistamiento guardado. */
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
  await operacion("readwrite", (a) => a.put(avistamiento));
  return avistamiento;
}

export function borrarAvistamiento(id) {
  return operacion("readwrite", (a) => a.delete(id));
}
