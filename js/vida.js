// Detalles que dan vida a la pokédex: pájaros que cruzan el cielo del fondo
// (si tocas uno, te cuenta una curiosidad) y plumas al descubrir una especie.

const CURIOSIDADES = [
  "El vencejo común puede pasar más de diez meses seguidos volando sin posarse.",
  "En picado, el halcón peregrino supera los 300 km/h: es el animal más rápido del planeta.",
  "El charrán ártico viaja cada año de un polo a otro: unos 70.000 km de ida y vuelta.",
  "El mirlo acuático camina por el fondo de los ríos, contra la corriente, buscando larvas.",
  "El alcatraz se lanza al mar desde unos 30 metros y entra en el agua a casi 100 km/h.",
  "El reyezuelo sencillo pesa unos 5 gramos: es el ave más pequeña de Europa.",
  "El quebrantahuesos deja caer huesos desde el aire para romperlos y comerse el tuétano.",
  "El cuco no cría a sus pollos: pone los huevos en nidos de otras aves.",
  "El urogallo cantábrico solo vive en la cordillera Cantábrica y está en peligro de extinción.",
  "Los pájaros carpinteros tienen una lengua tan larga que se enrolla por dentro del cráneo.",
  "Los búhos no pueden mover los ojos, pero giran la cabeza unos 270 grados.",
  "El azul del martín pescador no es un pigmento: es la luz rebotando en la estructura de sus plumas.",
  "La pardela balear solo cría en las Baleares y es de las aves marinas más amenazadas de Europa.",
  "Las golondrinas que crían en Asturias pasan el invierno en África, al sur del Sáhara.",
  "Cada otoño, un arrendajo entierra miles de bellotas. Las que olvida acaban siendo robles.",
  "El petirrojo canta también en invierno, y en las ciudades a veces de noche, junto a las farolas.",
  "El chochín pesa unos 10 gramos y tiene uno de los cantos más potentes para su tamaño.",
  "Las gaviotas patiamarillas han aprendido a criar en los tejados de ciudades como Gijón y Avilés.",
];

const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const azar = (a, b) => a + Math.random() * (b - a);

function svgPajaro() {
  return `<svg viewBox="0 0 60 24" aria-hidden="true"><path class="ala" d="M2 14 Q16 0 30 13 Q44 0 58 14" /></svg>`;
}

/** Hace cruzar un pájaro por el cielo del fondo. */
function soltarPajaro(cielo, avisar, opciones = {}) {
  const p = document.createElement("button");
  p.type = "button";
  p.className = "pajaro-fondo";
  p.setAttribute("aria-label", "Pájaro volando: toca para ver una curiosidad");
  p.innerHTML = svgPajaro();
  const haciaDerecha = opciones.haciaDerecha ?? Math.random() < 0.6;
  const tam = opciones.tam ?? azar(26, 46);
  const duracion = opciones.duracion ?? azar(16, 26);
  p.style.setProperty("--y", `${opciones.y ?? azar(8, 78)}vh`);
  p.style.setProperty("--tam", `${tam}px`);
  p.style.setProperty("--dur", `${duracion}s`);
  p.style.setProperty("--aleteo", `${azar(0.45, 0.75)}s`);
  p.style.setProperty("--retraso", `${opciones.retraso ?? 0}s`);
  p.classList.add(haciaDerecha ? "a-la-derecha" : "a-la-izquierda");
  p.addEventListener("click", () => {
    avisar(CURIOSIDADES[Math.floor(Math.random() * CURIOSIDADES.length)], 5200);
    p.classList.add("asustado");
  });
  p.addEventListener("animationend", (ev) => { if (ev.animationName.startsWith("cruzar")) p.remove(); });
  cielo.append(p);
}

/** Empieza a soltar pájaros de vez en cuando mientras la pokédex está a la vista. */
export function iniciarCielo(avisar) {
  if (reducirMovimiento) return;
  const cielo = document.getElementById("cielo");
  const siguiente = () => {
    const visible = !document.getElementById("vista-pokedex").hidden && !document.hidden;
    if (visible && cielo.childElementCount < 3) soltarPajaro(cielo, avisar);
    setTimeout(siguiente, azar(6000, 13000));
  };
  setTimeout(siguiente, 1800);
}

/** Lluvia de plumas alrededor de un elemento (al descubrir una especie). */
export function plumas(elemento) {
  if (reducirMovimiento || !elemento) return;
  const caja = elemento.getBoundingClientRect();
  const colores = ["#FFFFFF", "#E4DBFF", "#F2B233", "#C9B8F5"];
  for (let i = 0; i < 18; i++) {
    const pl = document.createElement("span");
    pl.className = "pluma";
    pl.innerHTML = `<svg viewBox="0 0 12 32" aria-hidden="true"><path d="M6 1C1 9 1 20 6 31C11 20 11 9 6 1Z"/><path class="raquis" d="M6 4V31"/></svg>`;
    pl.style.left = `${caja.left + caja.width / 2}px`;
    pl.style.top = `${caja.top + caja.height * 0.45}px`;
    pl.style.setProperty("--c", colores[i % colores.length]);
    pl.style.setProperty("--dx", `${azar(-160, 160)}px`);
    pl.style.setProperty("--dy", `${azar(-150, 40)}px`);
    pl.style.setProperty("--caida", `${azar(120, 240)}px`);
    pl.style.setProperty("--giro", `${azar(-260, 260)}deg`);
    pl.style.setProperty("--dur", `${azar(1.3, 2)}s`);
    pl.addEventListener("animationend", () => pl.remove());
    document.body.append(pl);
  }
}

