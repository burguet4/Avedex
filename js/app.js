import {
  obtenerEspecies, obtenerCreditos, obtenerAvistamientos, obtenerAvistamientosDe,
  guardarAvistamiento, borrarAvistamiento,
} from "./datos.js";
import { buscarLugares, nombreDelPunto } from "./lugares.js";
import { CENTRO_ASTURIAS, hayMapas, crearMapa, chincheta } from "./mapa.js";
import { iniciarCielo, plumas } from "./vida.js";
import { $, numero, normalizar, hoy, fechaLarga, escapar, avisar, ponerImagen, cerrarAlTocarFuera } from "./util.js";

const AVISO_BLOQUEADA = "Aún no lo has descubierto. Toca + cuando lo veas";
const ESTATUS = ["Residente", "Estival", "Invernante", "De paso"];
const FILTROS_INICIALES = () => ({ estado: "todos", habitats: new Set(), estatus: new Set(), grupo: "", orden: "numero" });

const estado = {
  especies: [],
  porId: new Map(),
  creditos: {},
  resumen: new Map(), // especieId → { total, macho, hembra, ultima, anios }
  totalAvistamientos: 0,
  filtros: { texto: "", ...FILTROS_INICIALES() },
  fichaActual: null,
  scrollPokedex: 0,
  revelar: null, // especie recién descubierta, para animar su ficha al abrirla
};

const descubierta = (id) => estado.resumen.has(id);

/* =====================================================================
   Resumen de avistamientos y cabecera
   ===================================================================== */

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
  let ambosSexos = 0;
  let esteAnio = 0;
  for (const [id, r] of estado.resumen) {
    if (estado.porId.get(id).dimorfismo && r.macho && r.hembra) ambosSexos++;
    if (r.anios.has(anio)) esteAnio++;
  }
  const porcentaje = total ? (vistos / total) * 100 : 0;

  $("#num-vistos").textContent = vistos;
  $("#num-total").textContent = total;
  $("#est-descubiertos").textContent = `${porcentaje.toLocaleString("es-ES", { maximumFractionDigits: porcentaje < 10 ? 1 : 0 })}%`;
  $("#est-sexos").textContent = ambosSexos;
  $("#est-avistamientos").textContent = estado.totalAvistamientos;
  $("#est-anio").textContent = esteAnio;
  $("#barra-progreso").style.width = `${porcentaje}%`;
}

/** Vuelve a calcular todo lo que depende de los avistamientos. */
async function refrescar() {
  await recalcularResumen();
  pintarCabecera();
  actualizarTeselas();
  aplicarFiltros();
}

/* =====================================================================
   Pokédex: casillas, filtros y búsqueda
   ===================================================================== */

function crearTeselas() {
  const lista = $("#cuadricula");
  lista.replaceChildren(...estado.especies.map((e) => {
    const li = document.createElement("li");
    li.dataset.id = e.id;
    li.innerHTML = `
      <a class="tesela" role="link">
        <span class="tesela-img"><img loading="lazy" decoding="async" alt=""></span>
        <span class="tesela-num">${numero(e.numero)}</span>
        <span class="tesela-sexos" aria-hidden="true"></span>
      </a>`;
    ponerImagen(li.querySelector("img"), e);
    return li;
  }));
  lista.addEventListener("click", (ev) => {
    const tesela = ev.target.closest(".tesela");
    if (tesela && !tesela.hasAttribute("href")) avisar(AVISO_BLOQUEADA);
  });
}

function actualizarTeselas() {
  for (const li of $("#cuadricula").children) {
    const e = estado.porId.get(li.dataset.id);
    const r = estado.resumen.get(e.id);
    const tesela = li.firstElementChild;
    tesela.classList.toggle("descubierta", Boolean(r));
    tesela.setAttribute("aria-disabled", String(!r));
    tesela.setAttribute("aria-label", r ? `${numero(e.numero)} ${e.nombre}` : `${numero(e.numero)} ???, sin descubrir`);
    if (r) tesela.href = `#/especie/${e.id}`;
    else tesela.removeAttribute("href");
    tesela.querySelector(".tesela-sexos").innerHTML = r && e.dimorfismo
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
    // Por nombre solo se encuentran los ya descubiertos; el resto, por número
    const t = normalizar(f.texto);
    const porNombre = r && (normalizar(e.nombre).includes(t) || normalizar(e.cientifico).includes(t));
    if (!porNombre && !numero(e.numero).includes(t)) return false;
  }
  return true;
}

function aplicarFiltros() {
  const f = estado.filtros;
  const visibles = estado.especies.filter(cumpleFiltros);
  if (f.orden === "nombre") visibles.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  if (f.orden === "reciente") {
    const ultima = (e) => estado.resumen.get(e.id)?.ultima ?? "";
    visibles.sort((a, b) => ultima(b).localeCompare(ultima(a)) || a.numero - b.numero);
  }

  // Se ocultan y reordenan las casillas existentes, sin volver a crear las imágenes
  const lista = $("#cuadricula");
  const casillas = new Map([...lista.children].map((li) => [li.dataset.id, li]));
  const ids = new Set(visibles.map((e) => e.id));
  for (const [id, li] of casillas) li.hidden = !ids.has(id);
  for (const e of visibles) lista.append(casillas.get(e.id));

  const total = estado.especies.length;
  const activos = (f.estado !== "todos") + f.habitats.size + f.estatus.size + Boolean(f.grupo) + (f.orden !== "numero");
  $("#marca-filtros").hidden = !activos;
  $("#vacio").hidden = visibles.length > 0;
  $("#aviso-filtro").hidden = visibles.length === total;
  $("#aviso-filtro").textContent = `Mostrando ${visibles.length} de ${total}`;
}

function prepararFiltros() {
  const panel = $("#panel-filtros");
  const habitats = [...new Set(estado.especies.flatMap((e) => e.habitats))];
  const grupos = [...new Set(estado.especies.map((e) => e.grupo))];
  const casillas = (nombre, valores) => valores
    .map((v) => `<label><input type="checkbox" name="${nombre}" value="${escapar(v)}"><span>${escapar(v)}</span></label>`)
    .join("");

  $("#opciones-habitat").innerHTML = casillas("habitat", habitats);
  $("#opciones-estatus").innerHTML = casillas("estatus", ESTATUS);
  $("#filtro-grupo").insertAdjacentHTML("beforeend", grupos.map((g) => `<option>${escapar(g)}</option>`).join(""));

  panel.addEventListener("change", ({ target: el }) => {
    const f = estado.filtros;
    if (el.name === "estado") f.estado = el.value;
    if (el.name === "orden") f.orden = el.value;
    if (el.name === "habitat") f.habitats[el.checked ? "add" : "delete"](el.value);
    if (el.name === "estatus") f.estatus[el.checked ? "add" : "delete"](el.value);
    if (el.name === "grupo") f.grupo = el.value;
    aplicarFiltros();
  });
  $("#btn-limpiar").addEventListener("click", () => {
    Object.assign(estado.filtros, FILTROS_INICIALES());
    panel.querySelector("form").reset();
    aplicarFiltros();
  });
  $("#btn-filtros").addEventListener("click", () => panel.showModal());
  cerrarAlTocarFuera(panel);
}

function prepararBusqueda() {
  const boton = $("#btn-buscar");
  const caja = $("#caja-busqueda");
  const entrada = $("#busqueda");
  boton.addEventListener("click", () => {
    caja.hidden = !caja.hidden;
    boton.classList.toggle("activo", !caja.hidden);
    if (!caja.hidden) {
      entrada.focus();
    } else if (entrada.value) {
      entrada.value = "";
      estado.filtros.texto = "";
      aplicarFiltros();
    }
  });
  entrada.addEventListener("input", () => {
    estado.filtros.texto = entrada.value.trim();
    aplicarFiltros();
  });
}

/* =====================================================================
   Ficha de especie
   ===================================================================== */

const mapaFicha = { mapa: null, capa: null, marcadores: new Map() };

/** Pinta la ficha de una especie. Devuelve false si no se puede ver (aún sin descubrir). */
async function mostrarFicha(id) {
  const e = estado.porId.get(id);
  if (!e || !descubierta(id)) {
    if (e) avisar(AVISO_BLOQUEADA);
    location.replace("#/");
    return false;
  }
  estado.fichaActual = e;
  const r = estado.resumen.get(id);

  // Flechas: solo recorren las especies ya descubiertas
  const vistas = estado.especies.filter((x) => descubierta(x.id));
  const i = vistas.indexOf(e);
  const vecinas = { "#ficha-anterior": vistas.at(i - 1), "#ficha-siguiente": vistas[(i + 1) % vistas.length] };
  for (const [selector, vecina] of Object.entries(vecinas)) {
    $(selector).href = `#/especie/${vecina.id}`;
    $(selector).hidden = vistas.length < 2;
  }

  $("#ficha-numero").textContent = `Nº ${numero(e.numero)}`;
  ponerImagen($("#ficha-img"), e);
  $("#ficha-img").alt = e.nombre;
  $("#ficha-nombre").textContent = e.nombre;
  $("#ficha-cientifico").textContent = e.cientifico;
  $("#ficha-estado").textContent = `Visto ${r.total === 1 ? "1 vez" : `${r.total} veces`} · última el ${fechaLarga(r.ultima)}`;
  $("#ficha-etiquetas").innerHTML = [
    `<li class="etiqueta-grupo">${escapar(e.grupo)}</li>`,
    ...[...e.estatus, ...e.habitats].map((t) => `<li>${escapar(t)}</li>`),
  ].join("");
  $("#ficha-descripcion").textContent = e.descripcion;
  $("#ficha-sexos").innerHTML = e.dimorfismo
    ? [["macho", "♂", "Macho"], ["hembra", "♀", "Hembra"]].map(([sexo, simbolo, nombre]) => `
        <div class="sexo ${r[sexo] ? "visto" : ""}">
          <span class="sexo-simbolo" aria-hidden="true">${simbolo}</span>
          <span><strong>${nombre}</strong><br>${r[sexo] ? "Visto" : "Te falta"}</span>
        </div>`).join("")
    : `<p class="nota">En esta especie machos y hembras se ven iguales, así que no hace falta distinguirlos.</p>`;

  pintarAvistamientos(await obtenerAvistamientosDe(id));

  const credito = estado.creditos[id];
  $("#ficha-credito").innerHTML = credito
    ? `Foto: ${escapar(credito.autor)} · <a href="${escapar(credito.fuente)}" target="_blank" rel="noopener">${escapar(credito.licencia)}</a>, vía Wikimedia Commons`
    : "";
  return true;
}

function htmlAvistamiento(a) {
  const sinDetalles = !a.lugar && a.lat == null && a.sexo === "desconocido" && !a.notas;
  const sexo = { macho: "♂ Macho", hembra: "♀ Hembra" }[a.sexo];
  const lugar = a.lugar || (a.lat != null ? "Punto marcado en el mapa" : "");
  return `
    <li class="avistamiento" data-id="${a.id}">
      <div>
        <p class="av-fecha">${fechaLarga(a.fecha)}${sexo ? ` <span class="av-sexo">${sexo}</span>` : ""}</p>
        ${lugar ? `<p class="av-lugar">${escapar(lugar)}</p>` : ""}
        ${sinDetalles ? `<p class="av-lugar">Sin detalles. Toca «Editar» para añadir lugar, sexo y notas.</p>` : ""}
        ${a.notas ? `<p class="av-notas">${escapar(a.notas)}</p>` : ""}
      </div>
      <div class="av-acciones">
        ${a.lat != null ? `<button class="btn-texto" data-accion="ver">Ver en el mapa</button>` : ""}
        <button class="btn-texto" data-accion="editar">Editar</button>
        <button class="btn-texto peligro" data-accion="borrar">Borrar</button>
      </div>
    </li>`;
}

function pintarAvistamientos(avistamientos) {
  $("#ficha-avistamientos").innerHTML = avistamientos.map(htmlAvistamiento).join("");

  const conPunto = avistamientos.filter((a) => a.lat != null);
  const contenedor = $("#ficha-mapa");
  contenedor.hidden = !conPunto.length || !hayMapas();
  mapaFicha.marcadores.clear();
  if (contenedor.hidden) return;

  if (!mapaFicha.mapa) {
    mapaFicha.mapa = crearMapa(contenedor, { scrollWheelZoom: false });
    mapaFicha.capa = L.layerGroup().addTo(mapaFicha.mapa);
  }
  mapaFicha.capa.clearLayers();
  for (const a of conPunto) {
    const marcador = chincheta([a.lat, a.lng])
      .bindPopup(`<strong>${fechaLarga(a.fecha)}</strong>${a.lugar ? `<br>${escapar(a.lugar)}` : ""}`)
      .addTo(mapaFicha.capa);
    mapaFicha.marcadores.set(a.id, marcador);
  }
  // Leaflet necesita que el contenedor ya sea visible para medirlo
  setTimeout(() => {
    const puntos = conPunto.map((a) => [a.lat, a.lng]);
    mapaFicha.mapa.invalidateSize();
    if (puntos.length === 1) mapaFicha.mapa.setView(puntos[0], 13);
    else mapaFicha.mapa.fitBounds(puntos, { padding: [36, 36], maxZoom: 13 });
  }, 0);
}

function prepararFicha() {
  $("#btn-nuevo").addEventListener("click", () => abrirFormulario({ especie: estado.fichaActual }));

  $("#ficha-avistamientos").addEventListener("click", async (ev) => {
    const boton = ev.target.closest("[data-accion]");
    if (!boton) return;
    const id = boton.closest(".avistamiento").dataset.id;
    const especie = estado.fichaActual;

    if (boton.dataset.accion === "ver") {
      const marcador = mapaFicha.marcadores.get(id);
      $("#ficha-mapa").scrollIntoView({ behavior: "smooth", block: "center" });
      mapaFicha.mapa.setView(marcador.getLatLng(), 14, { animate: false });
      marcador.openPopup();
      return;
    }

    const avistamiento = (await obtenerAvistamientosDe(especie.id)).find((a) => a.id === id);
    if (boton.dataset.accion === "editar") {
      abrirFormulario({ especie, avistamiento });
      return;
    }
    if (!confirm(`¿Borrar el avistamiento del ${fechaLarga(avistamiento.fecha)}?`)) return;
    await borrarAvistamiento(id);
    await refrescar();
    if (descubierta(especie.id)) {
      await mostrarFicha(especie.id);
      avisar("Avistamiento borrado");
    } else {
      location.hash = "#/";
      avisar(`${especie.nombre} vuelve a estar sin descubrir`);
    }
  });
}

/* =====================================================================
   Formulario de avistamiento (nuevo, editar o descubrir una especie)
   ===================================================================== */

const formulario = {
  especie: null,
  avistamiento: null, // el que se está editando, si lo hay
  descubrir: false,
  punto: null,
  lugarAutomatico: false, // el campo "Lugar" lo ha rellenado la app, no el usuario
  mapa: null,
  marcador: null,
};

function abrirFormulario({ especie, avistamiento = null, descubrir = false }) {
  Object.assign(formulario, { especie, avistamiento, descubrir, lugarAutomatico: false });
  const form = $("#form-avistamiento");
  form.reset();
  ocultarSugerencias();

  $("#form-titulo").textContent = descubrir ? "¿Lo has visto?" : avistamiento ? "Editar avistamiento" : "Nuevo avistamiento";
  $("#btn-guardar-avistamiento").textContent = descubrir ? "¡Lo he visto!" : "Guardar avistamiento";
  $("#form-especie").hidden = !descubrir;
  if (descubrir) {
    ponerImagen($("#form-especie-img"), especie);
    $("#form-especie-nombre").textContent = especie.nombre;
    $("#form-especie-cientifico").textContent = especie.cientifico;
  }

  form.fecha.value = avistamiento?.fecha ?? hoy();
  form.fecha.max = hoy();
  form.lugar.value = avistamiento?.lugar ?? "";
  form.notas.value = avistamiento?.notas ?? "";
  form.sexo.value = especie.dimorfismo ? (avistamiento?.sexo ?? "desconocido") : "desconocido";
  $("#opciones-sexo").hidden = !especie.dimorfismo;
  $("#nota-sexo").hidden = especie.dimorfismo;

  const panel = $("#panel-avistamiento");
  panel.showModal();
  panel.scrollTop = 0;

  $("#form-mapa").hidden = !hayMapas();
  if (hayMapas()) {
    if (!formulario.mapa) {
      formulario.mapa = crearMapa($("#form-mapa")).setView(CENTRO_ASTURIAS, 8);
      formulario.mapa.on("click", ({ latlng }) => fijarPunto(latlng.lat, latlng.lng, { centrar: true, ponerNombre: true }));
    }
    setTimeout(() => {
      formulario.mapa.invalidateSize();
      if (avistamiento?.lat != null) formulario.mapa.setView([avistamiento.lat, avistamiento.lng], 13);
      else formulario.mapa.setView(CENTRO_ASTURIAS, 8);
    }, 60);
  }
  fijarPunto(avistamiento?.lat ?? null, avistamiento?.lng ?? null);
}

function fijarPunto(lat, lng, { centrar = false, ponerNombre = false } = {}) {
  const punto = lat == null ? null : { lat: +lat.toFixed(5), lng: +lng.toFixed(5) };
  formulario.punto = punto;
  $("#btn-quitar-punto").hidden = !punto;
  $("#texto-punto").textContent = punto ? "Punto marcado en el mapa." : "Toca el mapa para marcar dónde lo viste.";

  if (formulario.mapa) {
    formulario.marcador?.remove();
    formulario.marcador = punto ? chincheta([punto.lat, punto.lng]).addTo(formulario.mapa) : null;
    if (punto && centrar) {
      formulario.mapa.setView([punto.lat, punto.lng], Math.max(formulario.mapa.getZoom(), 13), { animate: false });
    }
  }
  if (punto && ponerNombre) rellenarLugarDesdePunto(punto);
}

/** Pone en "Lugar" el nombre del sitio marcado, sin pisar lo que haya escrito el usuario. */
async function rellenarLugarDesdePunto(punto) {
  const campo = $("#form-avistamiento").lugar;
  if (campo.value.trim() && !formulario.lugarAutomatico) return;
  campo.placeholder = "Buscando el nombre del sitio…";
  try {
    const nombre = await nombreDelPunto(punto.lat, punto.lng);
    const sigueSiendoElMismo = formulario.punto === punto;
    if (nombre && sigueSiendoElMismo && (!campo.value.trim() || formulario.lugarAutomatico)) {
      campo.value = nombre;
      formulario.lugarAutomatico = true;
    }
  } catch {
    // Sin conexión: el lugar se puede escribir a mano
  }
  campo.placeholder = "Escribe la zona o toca el mapa";
}

function ocultarSugerencias() {
  const lista = $("#lugar-sugerencias");
  lista.hidden = true;
  lista.innerHTML = "";
}

function prepararAutocompletado() {
  const campo = $("#form-avistamiento").lugar;
  const lista = $("#lugar-sugerencias");
  let sugerencias = [];
  let espera = null;
  let busqueda = null;

  campo.addEventListener("input", () => {
    formulario.lugarAutomatico = false;
    clearTimeout(espera);
    const texto = campo.value.trim();
    if (texto.length < 3) {
      ocultarSugerencias();
      return;
    }
    espera = setTimeout(async () => {
      busqueda?.abort();
      busqueda = new AbortController();
      try {
        sugerencias = await buscarLugares(texto, busqueda.signal);
      } catch (err) {
        if (err.name !== "AbortError") ocultarSugerencias();
        return;
      }
      lista.innerHTML = sugerencias.map((l, i) => `
        <li><button type="button" class="sugerencia" data-i="${i}">
          <span>${escapar(l.nombre)}</span>${l.detalle ? `<small>${escapar(l.detalle)}</small>` : ""}
        </button></li>`).join("");
      lista.hidden = !sugerencias.length;
    }, 300);
  });

  lista.addEventListener("click", (ev) => {
    const boton = ev.target.closest(".sugerencia");
    if (!boton) return;
    const lugar = sugerencias[Number(boton.dataset.i)];
    campo.value = lugar.nombre;
    formulario.lugarAutomatico = true;
    ocultarSugerencias();
    fijarPunto(lugar.lat, lugar.lng, { centrar: true });
  });

  campo.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !lista.hidden) {
      ev.preventDefault();
      ocultarSugerencias();
    }
  });
  campo.addEventListener("blur", () => setTimeout(ocultarSugerencias, 200));
}

function usarMiUbicacion() {
  if (!navigator.geolocation) {
    avisar("Tu navegador no permite obtener la ubicación");
    return;
  }
  const boton = $("#btn-ubicacion");
  const terminar = () => {
    boton.disabled = false;
    boton.textContent = "Usar mi ubicación";
  };
  boton.disabled = true;
  boton.textContent = "Buscando…";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      fijarPunto(coords.latitude, coords.longitude, { centrar: true, ponerNombre: true });
      terminar();
    },
    () => {
      avisar("No se pudo obtener tu ubicación. Revisa el permiso de ubicación del navegador");
      terminar();
    },
    { enableHighAccuracy: true, timeout: 15000 },
  );
}

async function guardarFormulario() {
  const form = $("#form-avistamiento");
  const { especie, avistamiento, descubrir, punto } = formulario;
  await guardarAvistamiento({
    ...avistamiento,
    especieId: especie.id,
    fecha: form.fecha.value || hoy(),
    sexo: form.sexo.value || "desconocido",
    lugar: form.lugar.value.trim(),
    notas: form.notas.value.trim(),
    lat: punto?.lat ?? null,
    lng: punto?.lng ?? null,
  });
  $("#panel-avistamiento").close();
  await refrescar();

  if (descubrir) {
    estado.revelar = especie.id;
    location.hash = `#/especie/${especie.id}`;
  } else {
    await mostrarFicha(especie.id);
    avisar("Avistamiento guardado");
  }
}

function prepararFormulario() {
  const panel = $("#panel-avistamiento");
  cerrarAlTocarFuera(panel);
  panel.querySelector("[data-cerrar]").addEventListener("click", () => panel.close());
  $("#btn-quitar-punto").addEventListener("click", () => fijarPunto(null));
  $("#btn-ubicacion").addEventListener("click", usarMiUbicacion);
  $("#form-avistamiento").addEventListener("submit", (ev) => {
    ev.preventDefault();
    guardarFormulario();
  });
  prepararAutocompletado();
}

/* =====================================================================
   Descubrir: elegir qué especie has visto
   ===================================================================== */

function prepararDescubrir() {
  const panel = $("#panel-descubrir");
  const entrada = $("#descubrir-busqueda");
  const lista = $("#descubrir-resultados");
  const ayuda = $("#descubrir-ayuda");
  cerrarAlTocarFuera(panel);
  panel.querySelector("[data-cerrar]").addEventListener("click", () => panel.close());

  $("#btn-descubrir").addEventListener("click", () => {
    entrada.value = "";
    lista.innerHTML = "";
    ayuda.hidden = false;
    panel.showModal();
    entrada.focus();
  });

  entrada.addEventListener("input", () => {
    const t = normalizar(entrada.value.trim());
    ayuda.hidden = t.length >= 2;
    if (t.length < 2) {
      lista.innerHTML = "";
      return;
    }
    const empiezaPor = (e) => normalizar(e.nombre).startsWith(t);
    const coincidencias = estado.especies
      .filter((e) => normalizar(e.nombre).includes(t) || normalizar(e.cientifico).includes(t))
      .sort((a, b) => empiezaPor(b) - empiezaPor(a) || a.nombre.localeCompare(b.nombre, "es"))
      .slice(0, 12);

    if (!coincidencias.length) {
      lista.innerHTML = `<li class="nota">No hay ningún pájaro con ese nombre en la pokédex de Asturias.</li>`;
      return;
    }
    lista.innerHTML = coincidencias.map((e) => `
      <li><button type="button" class="resultado ${descubierta(e.id) ? "descubierta" : ""}" data-id="${e.id}">
        <img alt="">
        <span class="resultado-texto">${escapar(e.nombre)}<i>${escapar(e.cientifico)}</i></span>
        ${descubierta(e.id) ? `<span class="resultado-marca">Ya lo tienes</span>` : ""}
      </button></li>`).join("");
    lista.querySelectorAll(".resultado").forEach((boton, i) => ponerImagen(boton.querySelector("img"), coincidencias[i]));
  });

  lista.addEventListener("click", (ev) => {
    const boton = ev.target.closest(".resultado");
    if (!boton) return;
    const especie = estado.porId.get(boton.dataset.id);
    panel.close();
    if (descubierta(especie.id)) location.hash = `#/especie/${especie.id}`;
    else abrirFormulario({ especie, descubrir: true });
  });
}

/* =====================================================================
   Navegación entre la pokédex y las fichas (#/ y #/especie/<id>)
   ===================================================================== */

function animarDescubrimiento() {
  const figura = $(".ficha-imagen");
  figura.classList.remove("revelar");
  void figura.offsetWidth; // reinicia la animación
  figura.classList.add("revelar");
  setTimeout(() => plumas(figura), 350);
  avisar(`¡${estado.fichaActual.nombre} descubierto!`);
}

async function enrutar() {
  const pokedex = $("#vista-pokedex");
  const ficha = $("#vista-ficha");
  const id = location.hash.match(/^#\/especie\/([\w-]+)/)?.[1];

  if (!id) {
    ficha.hidden = true;
    pokedex.hidden = false;
    scrollTo(0, estado.scrollPokedex);
    return;
  }
  if (!pokedex.hidden) estado.scrollPokedex = scrollY;
  if (!(await mostrarFicha(id))) return;
  pokedex.hidden = true;
  ficha.hidden = false;
  scrollTo(0, 0);
  if (estado.revelar === id) {
    estado.revelar = null;
    animarDescubrimiento();
  }
}

/* =====================================================================
   Instalar como app
   ===================================================================== */

function prepararInstalacion() {
  const boton = $("#btn-instalar");
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  let peticion = null; // aviso de instalación de Chrome/Android

  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault();
    peticion = ev;
    boton.hidden = false;
  });
  window.addEventListener("appinstalled", () => (boton.hidden = true));
  if (esIOS && !instalada) boton.hidden = false; // en iPhone se explica cómo hacerlo a mano

  cerrarAlTocarFuera($("#panel-ios"));
  boton.addEventListener("click", async () => {
    if (peticion) {
      peticion.prompt();
      await peticion.userChoice;
      peticion = null;
      boton.hidden = true;
    } else if (esIOS) {
      $("#panel-ios").showModal();
    }
  });
}

/* =====================================================================
   Arranque
   ===================================================================== */

async function iniciar() {
  try {
    [estado.especies, estado.creditos] = await Promise.all([obtenerEspecies(), obtenerCreditos()]);
  } catch {
    $("#cuadricula").outerHTML = `<p class="vacio">No se pudo cargar el catálogo de pájaros. Comprueba la conexión y recarga la página.</p>`;
    return;
  }
  estado.porId = new Map(estado.especies.map((e) => [e.id, e]));

  crearTeselas();
  prepararFiltros();
  prepararBusqueda();
  prepararFicha();
  prepararFormulario();
  prepararDescubrir();
  prepararInstalacion();
  iniciarCielo(avisar);

  await refrescar();
  window.addEventListener("hashchange", enrutar);
  await enrutar();

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}

iniciar();
