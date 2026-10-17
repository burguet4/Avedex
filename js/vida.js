// Detalles que dan vida a la pokédex: pájaros que cruzan el fondo (al tocarlos
// cuentan una curiosidad) y una lluvia de plumas al descubrir una especie.

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
const COLORES_PLUMAS = ["#FFFFFF", "#E4DBFF", "#F2B233", "#C9B8F5"];
const MAX_PAJAROS = 3;

const reducirMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const azar = (min, max) => min + Math.random() * (max - min);
const alAzar = (lista) => lista[Math.floor(Math.random() * lista.length)];

function soltarPajaro(cielo, avisar) {
  const pajaro = document.createElement("button");
  pajaro.type = "button";
  pajaro.className = `pajaro-fondo ${Math.random() < 0.6 ? "a-la-derecha" : "a-la-izquierda"}`;
  pajaro.setAttribute("aria-label", "Pájaro volando: toca para ver una curiosidad");
  pajaro.innerHTML = `<svg viewBox="0 0 60 24" aria-hidden="true"><path class="ala" d="M2 14 Q16 0 30 13 Q44 0 58 14"/></svg>`;
  pajaro.style.setProperty("--y", `${azar(8, 78)}vh`);
  pajaro.style.setProperty("--tam", `${azar(26, 46)}px`);
  pajaro.style.setProperty("--dur", `${azar(16, 26)}s`);
  pajaro.style.setProperty("--aleteo", `${azar(0.45, 0.75)}s`);

  pajaro.addEventListener("click", () => {
    avisar(alAzar(CURIOSIDADES), 5200);
    pajaro.classList.add("asustado");
  });
  pajaro.addEventListener("animationend", (ev) => {
    if (ev.animationName.startsWith("cruzar")) pajaro.remove();
  });
  cielo.append(pajaro);
}

/** Suelta un pájaro de vez en cuando mientras la pokédex está a la vista. */
export function iniciarCielo(avisar) {
  if (reducirMovimiento) return;
  const cielo = document.getElementById("cielo");
  const pokedex = document.getElementById("vista-pokedex");
  const siguiente = () => {
    if (!pokedex.hidden && !document.hidden && cielo.childElementCount < MAX_PAJAROS) soltarPajaro(cielo, avisar);
    setTimeout(siguiente, azar(6000, 13000));
  };
  setTimeout(siguiente, 1800);
}

/** Lluvia de plumas que sale del centro de un elemento. */
export function plumas(elemento) {
  if (reducirMovimiento) return;
  const caja = elemento.getBoundingClientRect();
  for (let i = 0; i < 18; i++) {
    const pluma = document.createElement("span");
    pluma.className = "pluma";
    pluma.innerHTML = `<svg viewBox="0 0 12 32" aria-hidden="true"><path d="M6 1C1 9 1 20 6 31C11 20 11 9 6 1Z"/><path class="raquis" d="M6 4V31"/></svg>`;
    pluma.style.left = `${caja.left + caja.width / 2}px`;
    pluma.style.top = `${caja.top + caja.height * 0.45}px`;
    pluma.style.setProperty("--color", COLORES_PLUMAS[i % COLORES_PLUMAS.length]);
    pluma.style.setProperty("--dx", `${azar(-160, 160)}px`);
    pluma.style.setProperty("--dy", `${azar(-150, 40)}px`);
    pluma.style.setProperty("--caida", `${azar(120, 240)}px`);
    pluma.style.setProperty("--giro", `${azar(-260, 260)}deg`);
    pluma.style.setProperty("--dur", `${azar(1.3, 2)}s`);
    pluma.addEventListener("animationend", () => pluma.remove());
    document.body.append(pluma);
  }
}
