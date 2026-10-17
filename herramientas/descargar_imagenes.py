# -*- coding: utf-8 -*-
"""
Descarga una foto con licencia libre de cada especie (Wikipedia / Wikimedia Commons),
le quita el fondo y la guarda recortada en img/aves/<id>.webp (cuadrada, 400x400), lista para la pokédex.
También guarda la autoría y licencia de cada foto en datos/creditos.json
(las licencias CC exigen citar al autor; la app lo muestra en la ficha).

Uso (desde la carpeta del proyecto Payarinos):
    pip install rembg[cpu] pillow
    python herramientas/descargar_imagenes.py

Opciones:
    --solo-descargar   baja las fotos pero no quita el fondo
    --solo-recortar    solo quita el fondo de las fotos ya descargadas
    --forzar           vuelve a procesar aunque ya exista la imagen
    --id ID [ID ...]   procesa solo esas especies (p. ej. --id morus-bassanus)

Las fotos originales se guardan en herramientas/_originales/ (no hace falta subirlas a GitHub).
"""
import argparse, json, pathlib, sys, time, urllib.parse, urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ESPECIES = RAIZ / "datos" / "especies.json"
CREDITOS = RAIZ / "datos" / "creditos.json"
ORIGINALES = RAIZ / "herramientas" / "_originales"
SALIDA = RAIZ / "img" / "aves"
UA = "Payarinos/1.0 (https://github.com; proyecto educativo, pokedex de aves de Asturias) python-urllib"
TAM_DESCARGA = 960    # ancho de la foto (Wikimedia solo sirve sin límite los tamaños estándar: 500, 960, 1280...)
PAUSA = 1.5           # segundos entre especies para no saturar a Wikimedia


def pedir(url, timeout=60):
    """Descarga una URL reintentando si Wikimedia pide esperar (error 429)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for intento in range(6):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503) and intento < 5:
                ra = e.headers.get("Retry-After") or ""
                espera = int(ra) if ra.isdigit() else 15 * (intento + 1)
                print(f"   … Wikimedia pide esperar, reintento en {espera} s", flush=True)
                time.sleep(espera)
                continue
            raise


def api(url, params):
    q = url + "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})
    return json.loads(pedir(q, timeout=30))


def bajar(url):
    return pedir(url)


def limpiar_html(t):
    import re, html
    return html.unescape(re.sub(r"<[^>]+>", "", t or "")).strip()


def buscar_foto(cientifico):
    """Devuelve el nombre del archivo de la foto principal del artículo."""
    for wiki in ("en", "es"):
        d = api(f"https://{wiki}.wikipedia.org/w/api.php", {
            "action": "query", "prop": "pageimages", "piprop": "name",
            "titles": cientifico, "redirects": 1,
        })
        for p in d.get("query", {}).get("pages", []):
            nombre = p.get("pageimage")
            if nombre and not nombre.lower().endswith((".svg", ".gif", ".ogg", ".webm")):
                return nombre
    return None


def info_archivo(nombre):
    d = api("https://commons.wikimedia.org/w/api.php", {
        "action": "query", "titles": "File:" + nombre, "prop": "imageinfo",
        "iiprop": "url|extmetadata", "iiurlwidth": TAM_DESCARGA,
    })
    pag = d["query"]["pages"][0]
    if "imageinfo" not in pag:
        return None
    ii = pag["imageinfo"][0]
    meta = ii.get("extmetadata", {})
    return {
        "url": ii.get("thumburl") or ii["url"],
        "autor": limpiar_html(meta.get("Artist", {}).get("value")) or "Desconocido",
        "licencia": limpiar_html(meta.get("LicenseShortName", {}).get("value")) or "Ver fuente",
        "url_licencia": meta.get("LicenseUrl", {}).get("value", ""),
        "fuente": ii.get("descriptionurl", ""),
    }


def descargar(especies, creditos, forzar):
    ORIGINALES.mkdir(parents=True, exist_ok=True)
    fallos = []
    for i, e in enumerate(especies, 1):
        destino = ORIGINALES / f"{e['id']}.jpg"
        if destino.exists() and e["id"] in creditos and not forzar:
            continue
        print(f"[{i}/{len(especies)}] {e['nombre']} ({e['cientifico']})", flush=True)
        try:
            nombre = buscar_foto(e["cientifico"])
            info = info_archivo(nombre) if nombre else None
            if not info:
                raise RuntimeError("sin foto en Wikipedia")
            destino.write_bytes(bajar(info["url"]))
            creditos[e["id"]] = {k: info[k] for k in ("autor", "licencia", "url_licencia", "fuente")}
            CREDITOS.write_text(json.dumps(creditos, ensure_ascii=False, indent=1), encoding="utf-8")
        except Exception as ex:
            print(f"   ! fallo: {ex}")
            fallos.append(e["id"])
        time.sleep(PAUSA)
    return fallos


def recortar(especies, forzar):
    try:
        from rembg import new_session, remove
        from PIL import Image
    except ImportError:
        sys.exit("Falta rembg. Instálalo con:  pip install rembg[cpu] pillow")
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    from cuadrar_imagenes import cuadrar
    SALIDA.mkdir(parents=True, exist_ok=True)
    sesion = new_session("isnet-general-use")  # la primera vez descarga el modelo (~170 MB)
    for i, e in enumerate(especies, 1):
        origen = ORIGINALES / f"{e['id']}.jpg"
        destino = SALIDA / f"{e['id']}.webp"
        if not origen.exists() or (destino.exists() and not forzar):
            continue
        print(f"[{i}/{len(especies)}] recortando {e['nombre']}", flush=True)
        img = Image.open(origen).convert("RGB")
        sin_fondo = remove(img, session=sesion, post_process_mask=True)
        caja = sin_fondo.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox()
        if caja:
            sin_fondo = sin_fondo.crop(caja)
        sin_fondo.save(destino, "WEBP", quality=90)
        cuadrar(destino)  # lienzo cuadrado de 400x400 con el pájaro centrado


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo-descargar", action="store_true")
    ap.add_argument("--solo-recortar", action="store_true")
    ap.add_argument("--forzar", action="store_true")
    ap.add_argument("--id", nargs="+")
    a = ap.parse_args()

    especies = json.loads(ESPECIES.read_text(encoding="utf-8"))["especies"]
    if a.id:
        especies = [e for e in especies if e["id"] in a.id]
    creditos = json.loads(CREDITOS.read_text(encoding="utf-8")) if CREDITOS.exists() else {}

    if not a.solo_recortar:
        fallos = descargar(especies, creditos, a.forzar)
        if fallos:
            print("\nSin foto (habrá que buscarla a mano):", ", ".join(fallos))
    if not a.solo_descargar:
        recortar(especies, a.forzar)
    print("\nListo.")


if __name__ == "__main__":
    main()
