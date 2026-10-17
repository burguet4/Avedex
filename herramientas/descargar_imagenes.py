# -*- coding: utf-8 -*-
"""
Descarga una foto con licencia libre de cada especie (Wikipedia / Wikimedia Commons), le quita
el fondo y la guarda en img/aves/<id>.webp, cuadrada y con el pájaro centrado.
El autor y la licencia de cada foto se guardan en datos/creditos.json, porque las licencias
Creative Commons obligan a citarlos (la app los muestra en la ficha de cada especie).

Requisitos:  pip install "rembg[cpu]" pillow
Uso:         python herramientas/descargar_imagenes.py [opciones]

    --solo-descargar   baja las fotos pero no les quita el fondo
    --solo-recortar    solo quita el fondo a las fotos ya descargadas
    --forzar           vuelve a procesar aunque la imagen ya exista
    --id ID [ID ...]   procesa solo esas especies (p. ej. --id morus-bassanus)

Las fotos originales quedan en herramientas/_originales/ (no se suben al repositorio).
"""
import argparse
import html
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from cuadrar_imagenes import cuadrar, guardar

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ESPECIES = RAIZ / "datos" / "especies.json"
CREDITOS = RAIZ / "datos" / "creditos.json"
ORIGINALES = RAIZ / "herramientas" / "_originales"
SALIDA = RAIZ / "img" / "aves"

AGENTE = "Avedex/1.0 (proyecto educativo: pokédex de aves de Asturias) python-urllib"
ANCHO_FOTO = 960  # Wikimedia solo sirve sin restricciones los anchos estándar (500, 960, 1280…)
PAUSA = 1.5       # segundos entre especies, para no saturar a Wikimedia


def pedir(url, timeout=60):
    """Descarga una URL; si Wikimedia pide esperar (429/503), espera y reintenta."""
    peticion = urllib.request.Request(url, headers={"User-Agent": AGENTE})
    for intento in range(6):
        try:
            with urllib.request.urlopen(peticion, timeout=timeout) as respuesta:
                return respuesta.read()
        except urllib.error.HTTPError as error:
            if error.code not in (429, 503) or intento == 5:
                raise
            cabecera = error.headers.get("Retry-After") or ""
            espera = int(cabecera) if cabecera.isdigit() else 15 * (intento + 1)
            print(f"   … Wikimedia pide esperar, reintento en {espera} s", flush=True)
            time.sleep(espera)


def api(url, parametros):
    consulta = urllib.parse.urlencode({**parametros, "format": "json", "formatversion": "2"})
    return json.loads(pedir(f"{url}?{consulta}", timeout=30))


def sin_html(texto):
    return html.unescape(re.sub(r"<[^>]+>", "", texto or "")).strip()


def buscar_foto(cientifico):
    """Nombre del archivo de la foto principal del artículo de Wikipedia de la especie."""
    for idioma in ("en", "es"):
        datos = api(f"https://{idioma}.wikipedia.org/w/api.php", {
            "action": "query", "prop": "pageimages", "piprop": "name", "titles": cientifico, "redirects": 1,
        })
        for pagina in datos.get("query", {}).get("pages", []):
            nombre = pagina.get("pageimage")
            if nombre and not nombre.lower().endswith((".svg", ".gif", ".ogg", ".webm")):
                return nombre
    return None


def info_foto(nombre):
    """URL de descarga, autor y licencia de un archivo de Wikimedia Commons."""
    datos = api("https://commons.wikimedia.org/w/api.php", {
        "action": "query", "titles": f"File:{nombre}", "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": ANCHO_FOTO,
    })
    pagina = datos["query"]["pages"][0]
    if "imageinfo" not in pagina:
        return None
    info = pagina["imageinfo"][0]
    meta = info.get("extmetadata", {})
    return {
        "url": info.get("thumburl") or info["url"],
        "autor": sin_html(meta.get("Artist", {}).get("value")) or "Desconocido",
        "licencia": sin_html(meta.get("LicenseShortName", {}).get("value")) or "Ver fuente",
        "url_licencia": meta.get("LicenseUrl", {}).get("value", ""),
        "fuente": info.get("descriptionurl", ""),
    }


def descargar(especies, creditos, forzar):
    """Baja la foto original de cada especie. Devuelve las que no se encontraron."""
    ORIGINALES.mkdir(parents=True, exist_ok=True)
    fallos = []
    for i, especie in enumerate(especies, 1):
        destino = ORIGINALES / f"{especie['id']}.jpg"
        if destino.exists() and especie["id"] in creditos and not forzar:
            continue
        print(f"[{i}/{len(especies)}] {especie['nombre']} ({especie['cientifico']})", flush=True)
        try:
            nombre = buscar_foto(especie["cientifico"])
            info = info_foto(nombre) if nombre else None
            if not info:
                raise LookupError("no tiene foto en Wikipedia")
            destino.write_bytes(pedir(info["url"]))
            creditos[especie["id"]] = {clave: info[clave] for clave in ("autor", "licencia", "url_licencia", "fuente")}
            CREDITOS.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf-8")
        except (OSError, LookupError, KeyError, ValueError) as error:
            print(f"   ! fallo: {error}")
            fallos.append(especie["id"])
        time.sleep(PAUSA)
    return fallos


def recortar(especies, forzar):
    """Quita el fondo a las fotos originales y guarda la versión cuadrada para la app."""
    try:
        from PIL import Image
        from rembg import new_session, remove
    except ImportError:
        sys.exit('Falta rembg. Instálalo con:  pip install "rembg[cpu]" pillow')

    SALIDA.mkdir(parents=True, exist_ok=True)
    sesion = new_session("isnet-general-use")  # la primera vez descarga el modelo (~170 MB)
    for i, especie in enumerate(especies, 1):
        origen = ORIGINALES / f"{especie['id']}.jpg"
        destino = SALIDA / f"{especie['id']}.webp"
        if not origen.exists() or (destino.exists() and not forzar):
            continue
        print(f"[{i}/{len(especies)}] recortando {especie['nombre']}", flush=True)
        with Image.open(origen) as foto:
            sin_fondo = remove(foto.convert("RGB"), session=sesion, post_process_mask=True)
        guardar(cuadrar(sin_fondo), destino)


def main():
    argumentos = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    argumentos.add_argument("--solo-descargar", action="store_true")
    argumentos.add_argument("--solo-recortar", action="store_true")
    argumentos.add_argument("--forzar", action="store_true")
    argumentos.add_argument("--id", nargs="+")
    opciones = argumentos.parse_args()

    especies = json.loads(ESPECIES.read_text(encoding="utf-8"))["especies"]
    if opciones.id:
        especies = [e for e in especies if e["id"] in opciones.id]
    creditos = json.loads(CREDITOS.read_text(encoding="utf-8")) if CREDITOS.exists() else {}

    if not opciones.solo_recortar:
        fallos = descargar(especies, creditos, opciones.forzar)
        if fallos:
            print("\nSin foto (habrá que buscarla a mano):", ", ".join(fallos))
    if not opciones.solo_descargar:
        recortar(especies, opciones.forzar)
    print("\nListo.")


if __name__ == "__main__":
    main()
