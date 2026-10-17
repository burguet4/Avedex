# Avedex

Pokédex de los pájaros de Asturias. Es una web app (PWA) que se instala en el móvil como una app normal: cada vez que ves un pájaro lo apuntas y se desbloquea en tu colección, al estilo de la pokédex de Pokémon GO.

## Características

- **251 especies** que se pueden ver en Asturias: residentes, estivales, invernantes, migrantes y aves marinas que pasan frente a la costa.
- Las especies que todavía no has visto aparecen como una **sombra con su número**, y su ficha queda bloqueada hasta que las descubres.
- **Descubrir una especie**: buscas el pájaro por su nombre, común o científico, y apuntas cuándo y dónde lo viste.
- **Ficha de cada especie** con foto, nombre científico, grupo, hábitats, época del año, descripción y la lista de tus avistamientos.
- **Avistamientos** con fecha, lugar, punto en el mapa, sexo y notas. El lugar se autocompleta mientras escribes y también se puede marcar tocando el mapa o con tu ubicación.
- **Macho y hembra**: en las especies en las que se distinguen, la ficha indica cuál te falta por ver.
- **Filtros y búsqueda**: descubiertos, por descubrir, con un sexo pendiente, por hábitat, por época, por grupo y por orden.
- Funciona **sin conexión** y se puede instalar en Android e iPhone.

## Tecnologías

- HTML, CSS y JavaScript sin frameworks ni proceso de compilación.
- [Leaflet](https://leafletjs.com) para los mapas, con el mapa topográfico de Esri.
- [Photon](https://photon.komoot.io), basado en OpenStreetMap, para buscar lugares.
- IndexedDB para guardar los avistamientos en el dispositivo.
- Service worker y manifest para que sea instalable y funcione sin conexión.
- Python para preparar los datos: el catálogo de especies, las fotos y los iconos.

## Estructura

```
├── index.html
├── manifest.webmanifest
├── sw.js                   service worker
├── css/estilos.css
├── js/
│   ├── app.js              interfaz: pokédex, fichas, filtros y formularios
│   ├── datos.js            lectura y guardado de datos
│   ├── lugares.js          búsqueda de lugares
│   ├── mapa.js             mapas
│   ├── util.js             utilidades comunes
│   └── vida.js             animaciones del fondo y al descubrir una especie
├── datos/
│   ├── especies.json       catálogo de especies (generado)
│   └── creditos.json       autor y licencia de cada foto
├── img/
│   ├── aves/               una imagen por especie, sin fondo y de 400×400
│   ├── iconos/
│   └── silueta.svg
└── herramientas/           scripts para generar los datos y las imágenes
```

## Ejecutar en local

La app tiene que servirse desde un servidor, porque abriendo `index.html` directamente el navegador no carga el catálogo. Por ejemplo:

```
python -m http.server 8000
```

y después se abre http://localhost:8000.

## Herramientas

Los scripts de `herramientas/` se ejecutan desde la raíz del proyecto:

| Script | Qué hace |
| --- | --- |
| `especies_fuente.py` | Contiene la lista de especies y genera `datos/especies.json`. |
| `descargar_imagenes.py` | Descarga una foto con licencia libre de cada especie desde Wikimedia Commons, le quita el fondo y guarda los créditos. Necesita `pip install "rembg[cpu]" pillow`. |
| `cuadrar_imagenes.py` | Pasa todas las imágenes a un cuadrado de 400×400 con el pájaro centrado. |
| `generar_iconos.py` | Genera los iconos de la app. |
| `revision.html` | Página para revisar todas las imágenes recortadas de un vistazo. |

## Créditos

- Las fotos de las aves son de Wikimedia Commons y tienen licencias libres. El autor y la licencia de cada una aparecen en su ficha y en `datos/creditos.json`.
- Mapa © Esri, HERE, Garmin, FAO, NOAA y colaboradores de OpenStreetMap.
- Búsqueda de lugares con Photon, de Komoot, sobre datos de © colaboradores de OpenStreetMap.

## Próximos pasos

- Cuentas de usuario para tener la pokédex sincronizada entre dispositivos.
