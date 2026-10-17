import {
  obtenerEspecies, obtenerCreditos, obtenerAvistamientos, obtenerAvistamientosDe,
  guardarAvistamiento, borrarAvistamiento,
} from "./datos.js";
import { buscarLugares, nombreDelPunto } from "./lugares.js";
import { iniciarCielo, plumas } from "./vida.js";

const SILUETA_GENERICA = "img/silueta.svg";
const CENTRO_ASTURIAS = [43.36, -5.85];

const $ = (sel) => document.querySelector(sel);
const estado = {
  especies: [],
  porId: new Map(),
  creditos: {},
  resumen: new Map(), // especieId -> { total, macho, hembra, ultima }
  totalAvistamientos: 0,
  filtros: { texto: "", estado: "todos", habitats: new Set(), estatus: new Set(), grupo: "", orden: "numero" },
  scrollPokedex: 0,
  fichaActual: null,
  revelar: null, // id de la especie recién descubierta, para animar su ficha
};

const descubierta = (id) => estado.resumen.has(id);

/* ---------- Utilidades ---------- */

const numero = (n) => String(n).padStart(3, "0");
const normalizar = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fechaLarga = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

function escapar(t) {
  return String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function avisar(texto, duracion = 2600) {
  const t = $("#toast");
  t.textContent = texto;
  t.hidden = false;
  clearTimeout(avisar.temporizador);
  avisar.temporizador = setTimeout(() => (t.hidden = true), duracion);
}

function ponerImagen(img, especie) {
  img.onerror = () => {
    img.onerror = null;
    img.src = SILUETA_GENERICA;
    img.classList.add("generica");
  };
  img.classList.remove("generica");
  img.src = especie.imagen;
}

/* ---------- Resumen de avistamientos ---------- */

async function recalcularResumen() {
  const todos = await obtenerAvistamientos();
  const resumen = new Map();
  for (const a of todos) {
    const r = resumen.get(a.especieId) ?? { total: 0, macho: false, hembra: false, ultima: "", anios: new Set() };
    r.total++;
    if (a.sexo === "macho") r.macho = true;
    if (a.sexo === "hembra") r.hembra = true;
    if (a.fecha > r.ultima) r.ultima = a.fecha;
    r.anios.add(a.fecha.slice(0, 4));
    resumen.set(a.especieId, r);
  }
  estado.resumen = resumen;
  estado.totalAvistamientos = todos.length;
}

function pintarCabecera() {
  const total = estado.especies.length;
  const vistos = estado.resumen.size;
  const anio = String(new Date().getFullYear());
  let ambos = 0, esteAnio = 0;
  for (const [id, r] of estado.resumen) {
    if (estado.porId.get(id)?.dimorfismo && r.macho && r.hembra) ambos++;
    if (r.anios.has(anio)) esteAnio++;
  }
  $("#num-vistos").textContent = vistos;
  $("#num-total").textContent = total;
  const pct = total ? (vistos / total) * 100 : 0;
  $("#est-descubiertos").textContent = `${pct.toLocaleString("es-ES", { maximumFractionDigits: pct < 10 ? 1 : 0 })}%`;
  $("#est-sexos").textContent = ambos;
  $("#est-avistamientos").textContent = estado.totalAvistamientos;
  $("#est-anio").textContent = esteAnio;
  $("#barra-progreso").style.width = `${pct}%`;
}

/* ---------- Pokédex ---------- */

function crearTeselas() {
  const lista = $("#cuadricula");
  const frag = document.createDocumentFragment();
  for (const e of estado.especies) {
    const li = document.createElement("li");
    li.dataset.id = e.id;
    li.innerHTML = `
      <a class="tesela">
        <span class="tesela-img"><img loading="lazy" decoding="async" alt=""></span>
        <span class="tesela-num">${numero(e.numero)}</span>
        <span class="tesela-sexos" aria-hidden="true"></span>
      </a>`;
    ponerImagen(li.querySelector("img"), e);
    frag.append(li);
  }
  lista.replaceChildren(frag);
}

function actualizarTeselas() {
  for (const li of $("#cuadricula").children) {
    const e = estado.porId.get(li.dataset.id);
    const r = estado.resumen.get(e.id);
    const a = li.firstElementChild;
    a.classList.toggle("descubierta", !!r);
    if (r) a.setAttribute("href", `#/especie/${e.id}`);
    else a.removeAttribute("href");
    a.setAttribute("role", "link");
    a.setAttribute("aria-disabled", String(!r));
    a.setAttribute("aria-label", r ? `${numero(e.numero)} ${e.nombre}` : `${numero(e.numero)} ???, sin descubrir`);
    const sexos = a.querySelector(".tesela-sexos");
    sexos.innerHTML = r && e.dimorfismo
      ? `<i class="${r.macho ? "si" : ""}">♂</i><i class="${r.hembra ? "si" : ""}">♀</i>`
      : "";
  }
}

function cumpleFiltros(e) {
  const f = estado.filtros;
  const r = estado.resumen.get(e.id);
  if (f.estado === "descubiertos" && !r) return false;
  if (f.estado === "pendientes" && r) return false;
  if (f.estado === "falta-sexo" && !(r && e.dimorfismo && !(r.macho && r.hembra))) return false;
  if (f.grupo && e.grupo !== f.grupo) return false;
  if (f.habitats.size && !e.habitats.some((h) => f.habitats.has(h))) return false;
  if (f.estatus.size && !e.estatus.some((s) => f.estatus.has(s))) return false;
  if (f.texto) {
    const t = normalizar(f.texto);
    const porNombre = r && (normalizar(e.nombre).includes(t) || normalizar(e.cientifico).includes(t));
    if (!porNombre && !numero(e.numero).includes(t)) return false;
  }
  return true;
}

function aplicarFiltros() {
  const f = estado.filtros;
  const visibles = estado.especies.filter(cumpleFiltros);
  const orden = [...visibles];
  if (f.orden === "nombre") orden.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  if (f.orden === "reciente") {
    orden.sort((a, b) => (estado.resumen.get(b.id)?.ultima ?? "").localeCompare(estado.resumen.get(a.id)?.ultima ?? "") || a.numero - b.numero);
  }
  const lista = $("#cuadricula");
  const porId = new Map([...lista.children].map((li) => [li.dataset.id, li]));
  const ids = new Set(orden.map((e) => e.id));
  for (const li of porId.values()) li.hidden = !ids.has(li.dataset.id);
  for (const e of orden) lista.append(porId.get(e.id)); // reordena sin recrear imágenes

  const activos = (f.estado !== "todos") + f.habitats.size + f.estatus.size + !!f.grupo + (f.orden !== "numero");
  $("#marca-filtros").hidden = !activos;
  $("#vacio").hidden = orden.length > 0;
  const aviso = $("#aviso-filtro");
  aviso.hidden = orden.length === estado.especies.length;
  aviso.textContent = `Mostrando ${orden.length} de ${estado.especies.length}`;
}

function prepararFiltros() {
  const habitats = [...new Set(estado.especies.flatMap((e) => e.habitats))];
  const estatus = ["Residente", "Estival", "Invernante", "De paso"];
  const grupos = [...new Set(estado.especies.map((e) => e.grupo))];

  const chips = (contenedor, valores, nombre) => {
    contenedor.innerHTML = valores.map((v) =>
      `<label><input type="checkbox" name="${nombre}" value="${escapar(v)}"><span>${escapar(v)}</span></label>`).join("");
  };
  chips($("#opciones-habitat"), habitats, "habitat");
  chips($("#opciones-estatus"), estatus, "estatus");
  $("#filtro-grupo").insertAdjacentHTML("beforeend", grupos.map((g) => `<option>${escapar(g)}</option>`).join(""));

  const panel = $("#panel-filtros");
  panel.addEventListener("change", (ev) => {
    const el = ev.target, f = estado.filtros;
    if (el.name === "estado") f.estado = el.value;
    if (el.name === "orden") f.orden = el.value;
    if (el.name === "habitat") el.checked ? f.habitats.add(el.value) : f.habitats.delete(el.value);
    if (el.name === "estatus") el.checked ? f.estatus.add(el.value) : f.estatus.delete(el.value);
    if (el.id === "filtro-grupo") f.grupo = el.value;
    aplicarFiltros();
  });
  $("#btn-limpiar").addEventListener("click", () => {
    Object.assign(estado.filtros, { estado: "todos", habitats: new Set(), estatus: new Set(), grupo: "", orden: "numero" });
    panel.querySelector("form").reset();
    aplicarFiltros();
  });
  $("#btn-filtros").addEventListener("click", () => panel.showModal());
  cerrarAlTocarFuera(panel);

  const caja = $("#caja-busqueda"), entrada = $("#busqueda");
  $("#btn-buscar").addEventListener("click", () => {
    caja.hidden = !caja.hidden;
    $("#btn-buscar").classList.toggle("activo", !caja.hidden);
    if (!caja.hidden) entrada.focus();
    else if (entrada.value) { entrada.value = ""; estado.filtros.texto = ""; aplicarFiltros(); }
  });
  entrada.addEventListener("input", () => { estado.filtros.texto = entrada.value.trim(); aplicarFiltros(); });
}

function cerrarAlTocarFuera(dialogo) {
  dialogo.addEventListener("click", (ev) => { if (ev.target === dialogo) dialogo.close(); });
}

/* ---------- Ficha de especie ---------- */

async function mostrarFicha(id) {
  const e = estado.porId.get(id);
  if (!e || !descubierta(id)) {
    if (e) avisar("Aún no lo has descubierto. Toca + cuando lo veas");
    location.replace("#/");
    return false;
  }
  estado.fichaActual = e;
  const avs = await obtenerAvistamientosDe(id);
  const r = estado.resumen.get(id);

  $("#ficha-numero").textContent = `Nº ${numero(e.numero)}`;
  const vistas = estado.especies.filter((x) => descubierta(x.id));
  const i = vistas.indexOf(e);
  const anterior = vistas[(i - 1 + vistas.length) % vistas.length];
  const siguiente = vistas[(i + 1) % vistas.length];
  for (const [sel, dest] of [["#ficha-anterior", anterior], ["#ficha-siguiente", siguiente]]) {
    const a = $(sel);
    a.href = `#/especie/${dest.id}`;
    a.hidden = vistas.length < 2;
  }

  const img = $("#ficha-img");
  ponerImagen(img, e);
  img.alt = e.nombre;
  $("#vista-ficha").classList.add("descubierta");

  $("#ficha-nombre").textContent = e.nombre;
  $("#ficha-cientifico").textContent = e.cientifico;
  $("#ficha-estado").textContent =
    `Visto ${r.total === 1 ? "1 vez" : `${r.total} veces`} · última el ${fechaLarga(r.ultima)}`;
  $("#ficha-etiquetas").innerHTML = [
    `<li class="etiqueta-grupo">${escapar(e.grupo)}</li>`,
    ...e.estatus.map((s) => `<li>${escapar(s)}</li>`),
    ...e.habitats.map((h) => `<li>${escapar(h)}</li>`),
  ].join("");
  $("#ficha-descripcion").textContent = e.descripcion;

  $("#ficha-sexos").innerHTML = e.dimorfismo
    ? ["macho", "hembra"].map((s) => {
        const visto = r?.[s];
        return `<div class="sexo ${visto ? "visto" : ""}">
          <span class="sexo-simbolo" aria-hidden="true">${s === "macho" ? "♂" : "♀"}</span>
          <span><strong>${s === "macho" ? "Macho" : "Hembra"}</strong><br>${visto ? "Visto" : "Te falta"}</span>
        </div>`;
      }).join("")
    : `<p class="nota">En esta especie machos y hembras se ven iguales, así que no hace falta distinguirlos.</p>`;

  pintarAvistamientos(avs);

  const c = estado.creditos[id];
  $("#ficha-credito").innerHTML = c
    ? `Foto: ${escapar(c.autor)} · <a href="${escapar(c.fuente)}" target="_blank" rel="noopener">${escapar(c.licencia)}</a>, vía Wikimedia Commons`
    : "";
  return true;
}

function pintarAvistamientos(avs) {
  $("#ficha-avistamientos").innerHTML = avs.map((a) => `
    <li class="avistamiento" data-id="${a.id}">
      <div>
        <p class="av-fecha">${fechaLarga(a.fecha)}${a.sexo !== "desconocido" ? ` <span class="av-sexo">${a.sexo === "macho" ? "♂ Macho" : "♀ Hembra"}</span>` : ""}</p>
        ${a.lugar ? `<p class="av-lugar">${escapar(a.lugar)}</p>` : a.lat != null ? `<p class="av-lugar">Punto marcado en el mapa</p>` : ""}
        ${!a.lugar && a.lat == null && a.sexo === "desconocido" && !a.notas ? `<p class="av-lugar">Sin detalles. Toca «Editar» para añadir lugar, sexo y notas.</p>` : ""}
        ${a.notas ? `<p class="av-notas">${escapar(a.notas)}</p>` : ""}
      </div>
      <div class="av-acciones">
        ${a.lat != null ? `<button class="btn-texto" data-ver>Ver en el mapa</button>` : ""}
        <button class="btn-texto" data-editar>Editar</button>
        <button class="btn-texto peligro" data-borrar>Borrar</button>
      </div>
    </li>`).join("");

  marcadoresFicha = new Map();
  const conPunto = avs.filter((a) => a.lat != null);
  const contenedor = $("#ficha-mapa");
  contenedor.hidden = !conPunto.length || !window.L;
  if (contenedor.hidden) return;
  if (!mapaFicha) {
    mapaFicha = L.map(contenedor, { scrollWheelZoom: false, maxZoom: 16 });
    capaBase().addTo(mapaFicha);
    capaFicha = L.layerGroup().addTo(mapaFicha);
  }
  capaFicha.clearLayers();
  const puntos = conPunto.map((a) => {
    const m = L.marker([a.lat, a.lng], { icon: chincheta() })
      .bindPopup(`<strong>${fechaLarga(a.fecha)}</strong>${a.lugar ? `<br>${escapar(a.lugar)}` : ""}`)
      .addTo(capaFicha);
    marcadoresFicha.set(a.id, m);
    return [a.lat, a.lng];
  });
  setTimeout(() => {
    mapaFicha.invalidateSize();
    puntos.length === 1 ? mapaFicha.setView(puntos[0], 13) : mapaFicha.fitBounds(puntos, { padding: [36, 36], maxZoom: 13 });
  }, 0);
}

/* Mapa base (Esri Topographic, gratis y sin clave): tierra en verde, agua en azul y los nombres de los lugares. */
function capaBase() {
  return L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16,
    attribution: "Mapa © Esri, HERE, Garmin, FAO, NOAA · © OpenStreetMap",
  });
}

function chincheta() {
  return L.divIcon({
    className: "chincheta",
    html: `<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 1.5C8.3 1.5 2.5 7.4 2.5 15c0 9.6 13.5 25.5 13.5 25.5S29.5 24.6 29.5 15C29.5 7.4 23.7 1.5 16 1.5z"/><circle cx="16" cy="15" r="5.5"/></svg>`,
    iconSize: [32, 42],
    iconAnchor: [16, 41],
    popupAnchor: [0, -36],
  });
}

/* ---------- Formulario de avistamiento (también para descubrir) ---------- */

let mapaForm = null, marcadorForm = null, punto = null, editando = null;
let formEspecie = null, modoDescubrir = false, lugarAutomatico = false;
let mapaFicha = null, capaFicha = null, marcadoresFicha = new Map();

function fijarPunto(lat, lng, { centrar = false, ponerNombre = false } = {}) {
  punto = lat == null ? null : { lat: +lat.toFixed(5), lng: +lng.toFixed(5) };
  $("#btn-quitar-punto").hidden = !punto;
  $("#texto-punto").textContent = punto ? "Punto marcado en el mapa." : "Toca el mapa para marcar dónde lo viste.";
  if (mapaForm) {
    if (marcadorForm) { marcadorForm.remove(); marcadorForm = null; }
    if (punto) {
      marcadorForm = L.marker([punto.lat, punto.lng], { icon: chincheta() }).addTo(mapaForm);
      if (centrar) mapaForm.setView([punto.lat, punto.lng], Math.max(mapaForm.getZoom(), 13), { animate: false });
    }
  }
  if (punto && ponerNombre) rellenarLugarDesdePunto(punto);
}

async function rellenarLugarDesdePunto(p) {
  const campo = $("#form-avistamiento").lugar;
  if (campo.value.trim() && !lugarAutomatico) return; // no pisar lo que haya escrito el usuario
  campo.placeholder = "Buscando el nombre del sitio…";
  try {
    const nombre = await nombreDelPunto(p.lat, p.lng);
    if (punto === p && nombre && (!campo.value.trim() || lugarAutomatico)) {
      campo.value = nombre;
      lugarAutomatico = true;
    }
  } catch { /* sin conexión: el usuario puede escribirlo a mano */ }
  campo.placeholder = "Escribe la zona o toca el mapa";
}

function abrirFormulario({ especie, avistamiento = null, descubrir = false }) {
  formEspecie = especie;
  modoDescubrir = descubrir;
  editando = avistamiento;
  lugarAutomatico = false;
  const form = $("#form-avistamiento");
  form.reset();
  ocultarSugerencias();
  $("#form-titulo").textContent = descubrir ? "¿Lo has visto?" : avistamiento ? "Editar avistamiento" : "Nuevo avistamiento";
  $("#btn-guardar-avistamiento").textContent = descubrir ? "¡Lo he visto!" : "Guardar avistamiento";

  const cab = $("#form-especie");
  cab.hidden = !descubrir;
  if (descubrir) {
    ponerImagen($("#form-especie-img"), especie);
    $("#form-especie-nombre").textContent = especie.nombre;
    $("#form-especie-cientifico").textContent = especie.cientifico;
  }

  form.fecha.value = avistamiento?.fecha ?? hoy();
  form.fecha.max = hoy();
  form.lugar.value = avistamiento?.lugar ?? "";
  form.notas.value = avistamiento?.notas ?? "";
  $("#opciones-sexo").hidden = !especie.dimorfismo;
  $("#nota-sexo").hidden = especie.dimorfismo;
  form.sexo.value = especie.dimorfismo ? (avistamiento?.sexo ?? "desconocido") : "desconocido";

  $("#panel-avistamiento").showModal();
  $("#panel-avistamiento").scrollTop = 0;

  const contenedor = $("#form-mapa");
  contenedor.hidden = !window.L;
  if (window.L) {
    if (!mapaForm) {
      mapaForm = L.map(contenedor, { maxZoom: 16 }).setView(CENTRO_ASTURIAS, 8);
      capaBase().addTo(mapaForm);
      mapaForm.on("click", (ev) => fijarPunto(ev.latlng.lat, ev.latlng.lng, { centrar: true, ponerNombre: true }));
    }
    setTimeout(() => {
      mapaForm.invalidateSize();
      if (avistamiento?.lat != null) mapaForm.setView([avistamiento.lat, avistamiento.lng], 13);
      else mapaForm.setView(CENTRO_ASTURIAS, 8);
    }, 60);
  }
  fijarPunto(avistamiento?.lat ?? null, avistamiento?.lng ?? null);
}

/* Autocompletado del campo "Lugar" */
let busquedaEnCurso = null, temporizadorLugar = null;

function ocultarSugerencias() {
  const lista = $("#lugar-sugerencias");
  lista.hidden = true;
  lista.innerHTML = "";
}

function prepararAutocompletado() {
  const campo = $("#form-avistamiento").lugar;
  const lista = $("#lugar-sugerencias");
  let resultados = [];

  campo.addEventListener("input", () => {
    lugarAutomatico = false;
    clearTimeout(temporizadorLugar);
    const texto = campo.value.trim();
    if (texto.length < 3) { ocultarSugerencias(); return; }
    temporizadorLugar = setTimeout(async () => {
      busquedaEnCurso?.abort();
      busquedaEnCurso = new AbortController();
      try {
        resultados = await buscarLugares(texto, busquedaEnCurso.signal);
      } catch (err) {
        if (err.name !== "AbortError") ocultarSugerencias();
        return;
      }
      lista.innerHTML = resultados.map((l, i) => `
        <li><button type="button" class="sugerencia" data-i="${i}">
          <span>${escapar(l.nombre)}</span>${l.detalle ? `<small>${escapar(l.detalle)}</small>` : ""}
        </button></li>`).join("");
      lista.hidden = !resultados.length;
    }, 300);
  });

  lista.addEventListener("click", (ev) => {
    const b = ev.target.closest(".sugerencia");
    if (!b) return;
    const l = resultados[+b.dataset.i];
    campo.value = l.nombre;
    lugarAutomatico = true;
    ocultarSugerencias();
    fijarPunto(l.lat, l.lng, { centrar: true });
  });

  campo.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !lista.hidden) { ev.preventDefault(); ocultarSugerencias(); } });
  campo.addEventListener("blur", () => setTimeout(ocultarSugerencias, 200));
}

function prepararFormulario() {
  const panel = $("#panel-avistamiento");
  const form = $("#form-avistamiento");
  cerrarAlTocarFuera(panel);
  panel.querySelector("[data-cerrar]").addEventListener("click", () => panel.close());
  $("#btn-nuevo").addEventListener("click", () => abrirFormulario({ especie: estado.fichaActual }));
  $("#btn-quitar-punto").addEventListener("click", () => fijarPunto(null));
  prepararAutocompletado();

  $("#btn-ubicacion").addEventListener("click", () => {
    if (!navigator.geolocation) return avisar("Tu navegador no permite obtener la ubicación");
    const btn = $("#btn-ubicacion");
    btn.disabled = true;
    btn.textContent = "Buscando…";
    navigator.geolocation.getCurrentPosition(
      (pos) => { fijarPunto(pos.coords.latitude, pos.coords.longitude, { centrar: true, ponerNombre: true }); fin(); },
      () => { avisar("No se pudo obtener tu ubicación. Revisa el permiso de ubicación del navegador"); fin(); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
    function fin() { btn.disabled = false; btn.textContent = "Usar mi ubicación"; }
  });

  form.addEventListener("submit", async (ev) => {
    if (ev.submitter?.value !== "guardar") return;
    ev.preventDefault();
    const especie = formEspecie;
    await guardarAvistamiento({
      ...(editando ?? {}),
      especieId: especie.id,
      fecha: form.fecha.value || hoy(),
      sexo: form.sexo.value || "desconocido",
      lugar: form.lugar.value.trim(),
      notas: form.notas.value.trim(),
      lat: punto?.lat ?? null,
      lng: punto?.lng ?? null,
    });
    panel.close();
    await refrescar();
    if (modoDescubrir) {
      estado.revelar = especie.id;
      location.hash = `#/especie/${especie.id}`;
      return;
    }
    await mostrarFicha(especie.id);
    avisar("Avistamiento guardado");
  });

  $("#ficha-avistamientos").addEventListener("click", async (ev) => {
    const li = ev.target.closest(".avistamiento");
    if (!li) return;
    if (ev.target.matches("[data-ver]")) {
      const m = marcadoresFicha.get(li.dataset.id);
      if (m && mapaFicha) {
        $("#ficha-mapa").scrollIntoView({ behavior: "smooth", block: "center" });
        mapaFicha.setView(m.getLatLng(), 14, { animate: false });
        m.openPopup();
      }
      return;
    }
    const avs = await obtenerAvistamientosDe(estado.fichaActual.id);
    const a = avs.find((x) => x.id === li.dataset.id);
    if (ev.target.matches("[data-editar]")) abrirFormulario({ especie: estado.fichaActual, avistamiento: a });
    if (ev.target.matches("[data-borrar]") && confirm(`¿Borrar el avistamiento del ${fechaLarga(a.fecha)}?`)) {
      await borrarAvistamiento(a.id);
      await refrescar();
      if (descubierta(estado.fichaActual.id)) {
        await mostrarFicha(estado.fichaActual.id);
        avisar("Avistamiento borrado");
      } else {
        location.hash = "#/";
        avisar(`${estado.fichaActual.nombre} vuelve a estar sin descubrir`);
      }
    }
  });
}

/* ---------- Descubrir (selector de especies) ---------- */

function prepararDescubrir() {
  const panel = $("#panel-descubrir");
  const entrada = $("#descubrir-busqueda");
  const lista = $("#descubrir-resultados");
  cerrarAlTocarFuera(panel);
  panel.querySelector("[data-cerrar]").addEventListener("click", () => panel.close());

  $("#btn-descubrir").addEventListener("click", () => {
    entrada.value = "";
    lista.innerHTML = "";
    $("#descubrir-ayuda").hidden = false;
    panel.showModal();
    entrada.focus();
  });

  entrada.addEventListener("input", () => {
    const t = normalizar(entrada.value.trim());
    $("#descubrir-ayuda").hidden = t.length >= 2;
    if (t.length < 2) { lista.innerHTML = ""; return; }
    const coinciden = estado.especies
      .filter((e) => normalizar(e.nombre).includes(t) || normalizar(e.cientifico).includes(t))
      .sort((a, b) => normalizar(b.nombre).startsWith(t) - normalizar(a.nombre).startsWith(t) || a.nombre.localeCompare(b.nombre, "es"))
      .slice(0, 12);
    lista.innerHTML = coinciden.length
      ? coinciden.map((e) => `
        <li><button type="button" class="resultado ${descubierta(e.id) ? "descubierta" : ""}" data-id="${e.id}">
          <img alt="" src="${e.imagen}" onerror="this.onerror=null;this.src='${SILUETA_GENERICA}'">
          <span class="resultado-texto">${escapar(e.nombre)}<i>${escapar(e.cientifico)}</i></span>
          ${descubierta(e.id) ? `<span class="resultado-marca">Ya lo tienes</span>` : ""}
        </button></li>`).join("")
      : `<li class="nota">No hay ningún pájaro con ese nombre en la pokédex de Asturias.</li>`;
  });

  lista.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".resultado");
    if (!btn) return;
    const e = estado.porId.get(btn.dataset.id);
    panel.close();
    if (descubierta(e.id)) { location.hash = `#/especie/${e.id}`; return; }
    abrirFormulario({ especie: e, descubrir: true });
  });
}

/* ---------- Navegación ---------- */

async function enrutar() {
  const m = location.hash.match(/^#\/especie\/([\w-]+)/);
  const pokedex = $("#vista-pokedex"), ficha = $("#vista-ficha");
  if (m) {
    if (!pokedex.hidden) estado.scrollPokedex = scrollY;
    if (!(await mostrarFicha(m[1]))) return;
    pokedex.hidden = true;
    ficha.hidden = false;
    scrollTo(0, 0);
    if (estado.revelar === m[1]) {
      estado.revelar = null;
      const fig = $(".ficha-imagen");
      fig.classList.remove("revelar");
      void fig.offsetWidth;
      fig.classList.add("revelar");
      setTimeout(() => plumas(fig), 350);
      avisar(`¡${estado.fichaActual.nombre} descubierto!`);
    }
  } else {
    ficha.hidden = true;
    pokedex.hidden = false;
    scrollTo(0, estado.scrollPokedex);
  }
}

async function refrescar() {
  await recalcularResumen();
  pintarCabecera();
  actualizarTeselas();
  aplicarFiltros();
}

/* ---------- Instalación como app ---------- */

function prepararInstalacion() {
  const btn = $("#btn-instalar");
  let aviso = null;
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    aviso = ev;
    btn.hidden = false;
  });
  window.addEventListener("appinstalled", () => (btn.hidden = true));
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (esIOS && !instalada) btn.hidden = false;
  cerrarAlTocarFuera($("#panel-ios"));
  btn.addEventListener("click", async () => {
    if (aviso) { aviso.prompt(); await aviso.userChoice; aviso = null; btn.hidden = true; }
    else if (esIOS) $("#panel-ios").showModal();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

/* ---------- Arranque ---------- */

async function iniciar() {
  try {
    [estado.especies, estado.creditos] = await Promise.all([obtenerEspecies(), obtenerCreditos()]);
  } catch (err) {
    $("#cuadricula").outerHTML = `<p class="vacio">No se pudo cargar el catálogo de pájaros. Comprueba la conexión y recarga la página.</p>`;
    return;
  }
  estado.porId = new Map(estado.especies.map((e) => [e.id, e]));
  crearTeselas();
  prepararFiltros();
  prepararFormulario();
  prepararDescubrir();
  prepararInstalacion();
  iniciarCielo(avisar);
  $("#cuadricula").addEventListener("click", (ev) => {
    const t = ev.target.closest(".tesela");
    if (t && !t.hasAttribute("href")) avisar("Aún no lo has descubierto. Toca + cuando lo veas");
  });
  await refrescar();
  window.addEventListener("hashchange", enrutar);
  await enrutar();
}

iniciar();
