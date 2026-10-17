# Avedex

Pokédex de los pájaros de Asturias. Es una web que se instala en el móvil como una app (PWA): apuntas los pájaros que ves y se van desbloqueando en tu colección, al estilo de la pokédex de Pokémon GO.

## Qué hace

- **Pokédex**: cuadrícula con las 251 especies que se pueden ver en Asturias (residentes, estivales, invernantes, migrantes y aves marinas que pasan frente a la costa). Las que no has visto aparecen como sombra; al apuntar un avistamiento se muestran a color.
- **Contador** de descubiertos, especies con macho y hembra vistos, avistamientos totales y especies vistas este año.
- **Filtros**: descubiertos / por descubrir / falta un sexo, hábitat, cuándo se ve, grupo, buscador y orden.
- **Ficha** de cada especie: imagen, nombre común y científico, descripción, sexos vistos y tus avistamientos con fecha, lugar, punto en el mapa, sexo y notas.

## Estructura

```
index.html              página de la app
css/estilos.css         estilos
js/app.js               lógica de la interfaz
js/datos.js             guardar y leer datos (ahora en el navegador; luego Supabase)
sw.js                   service worker (instalación y uso sin conexión)
manifest.webmanifest    datos para "Añadir a pantalla de inicio"
datos/especies.json     catálogo de especies (se genera, no editar a mano)
datos/creditos.json     autor y licencia de cada foto
img/aves/               fotos recortadas de cada especie
img/iconos/             iconos de la app
herramientas/           scripts para generar el catálogo, las fotos y los iconos
```

## Probarla en el ordenador

Hace falta abrirla a través de un servidor (con doble clic no funciona el service worker ni la carga del catálogo). Desde la carpeta del proyecto:

```
python -m http.server 8000
```

y abre <http://localhost:8000> en el navegador.

## Probarla en el móvil

Con el ordenador y el móvil en la misma wifi, lanza el servidor como arriba y abre `http://IP-DEL-ORDENADOR:8000` en el móvil (la IP sale con `ipconfig`). Para instalarla y usar la ubicación hace falta HTTPS, así que lo cómodo es publicarla en GitHub Pages.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube esta carpeta.
2. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En un par de minutos estará en `https://TU-USUARIO.github.io/NOMBRE-REPO/`.

Cada vez que publiques cambios, sube el número de `VERSION` en `sw.js` para que los móviles descarguen la versión nueva.

## Instalar en el móvil

- **Android (Chrome)**: botón de descarga de la cabecera, o menú ⋮ → *Instalar aplicación*.
- **iPhone (Safari)**: botón Compartir → *Añadir a pantalla de inicio*.

## Scripts

- `python herramientas/especies_fuente.py` regenera `datos/especies.json` tras editar la lista de especies.
- `python herramientas/descargar_imagenes.py` descarga y recorta las fotos (necesita `pip install "rembg[cpu]" pillow`).
- `python herramientas/generar_iconos.py` regenera los iconos.

## Créditos

Las fotos proceden de Wikimedia Commons con licencias libres; el autor y la licencia de cada una aparecen en su ficha y en `datos/creditos.json`. Mapas © colaboradores de OpenStreetMap.

## Próximos pasos

- Cuentas de usuario y guardado en la nube con Supabase (solo cambia `js/datos.js`), con Row Level Security para que cada usuario solo acceda a sus avistamientos.
