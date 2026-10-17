// Pequeñas utilidades compartidas por toda la app.

const SILUETA_GENERICA = "img/silueta.svg";

export const $ = (selector) => document.querySelector(selector);

/** Número de la pokédex con tres cifras: 7 → "007". */
export const numero = (n) => String(n).padStart(3, "0");

/** Texto en minúsculas y sin tildes, para comparar búsquedas. */
export const normalizar = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Fecha de hoy en formato AAAA-MM-DD (hora local). */
export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-10-16" → "16 de octubre de 2026". */
export const fechaLarga = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

/** Escapa un texto para meterlo en HTML sin riesgo. */
export const escapar = (texto) =>
  String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Muestra un aviso flotante durante unos segundos. */
export function avisar(texto, duracion = 2600) {
  const toast = $("#toast");
  toast.textContent = texto;
  toast.hidden = false;
  clearTimeout(avisar.temporizador);
  avisar.temporizador = setTimeout(() => (toast.hidden = true), duracion);
}

/** Pone la imagen de una especie y, si no existe, una silueta genérica. */
export function ponerImagen(img, especie) {
  img.onerror = () => {
    img.onerror = null;
    img.src = SILUETA_GENERICA;
  };
  img.src = especie.imagen;
}

/** Cierra un <dialog> al tocar fuera de su contenido. */
export function cerrarAlTocarFuera(dialogo) {
  dialogo.addEventListener("click", (ev) => {
    if (ev.target === dialogo) dialogo.close();
  });
}
