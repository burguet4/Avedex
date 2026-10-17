# -*- coding: utf-8 -*-
"""
Deja todas las imágenes de img/aves/ en un lienzo cuadrado transparente del mismo tamaño,
con el pájaro centrado y reducido para que quepa con margen. Así todas las casillas
de la pokédex se ven iguales.
Ejecutar: python herramientas/cuadrar_imagenes.py
"""
import pathlib
from PIL import Image

RAIZ = pathlib.Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "img" / "aves"
LADO = 400       # tamaño final del cuadrado en píxeles
MARGEN = 0.08    # hueco alrededor del pájaro (8 % por cada lado)


def cuadrar(ruta):
    img = Image.open(ruta)
    if img.size == (LADO, LADO):
        return False  # ya estaba cuadrada
    img = img.convert("RGBA")
    caja = img.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox()
    if caja:
        img = img.crop(caja)
    util = int(LADO * (1 - 2 * MARGEN))
    escala = util / max(img.size)
    img = img.resize((max(1, round(img.width * escala)), max(1, round(img.height * escala))), Image.LANCZOS)
    lienzo = Image.new("RGBA", (LADO, LADO), (0, 0, 0, 0))
    lienzo.paste(img, ((LADO - img.width) // 2, (LADO - img.height) // 2), img)
    temporal = ruta.with_suffix(".tmp")
    lienzo.save(temporal, "WEBP", quality=85, method=4)
    temporal.replace(ruta)  # se escribe aparte y se sustituye, para no dejar archivos a medias
    return True


def main():
    rutas = sorted(CARPETA.glob("*.webp"))
    hechas = 0
    for r in rutas:
        try:
            hechas += cuadrar(r)
        except Exception as ex:
            print(f"No se pudo procesar {r.name}: {ex}")
    print(f"{hechas} imágenes cuadradas a {LADO}x{LADO} ({len(rutas)} en total)")


if __name__ == "__main__":
    main()
