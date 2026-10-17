# -*- coding: utf-8 -*-
"""
Deja cada imagen de img/aves/ en un lienzo cuadrado y transparente de 400×400, con el pájaro
centrado y un pequeño margen, para que todas las casillas de la pokédex se vean iguales.

Uso:  python herramientas/cuadrar_imagenes.py
"""
import pathlib

from PIL import Image

CARPETA = pathlib.Path(__file__).resolve().parent.parent / "img" / "aves"
LADO = 400      # tamaño final del cuadrado, en píxeles
MARGEN = 0.08   # hueco alrededor del pájaro (8 % por cada lado)


def cuadrar(imagen):
    """Devuelve una copia cuadrada de la imagen, con el pájaro centrado."""
    imagen = imagen.convert("RGBA")
    caja = imagen.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox()
    if caja:
        imagen = imagen.crop(caja)
    escala = LADO * (1 - 2 * MARGEN) / max(imagen.size)
    imagen = imagen.resize((max(1, round(imagen.width * escala)), max(1, round(imagen.height * escala))), Image.LANCZOS)
    lienzo = Image.new("RGBA", (LADO, LADO), (0, 0, 0, 0))
    lienzo.paste(imagen, ((LADO - imagen.width) // 2, (LADO - imagen.height) // 2), imagen)
    return lienzo


def guardar(imagen, ruta):
    """Guarda en WebP pasando por un archivo temporal, para no dejar nunca uno a medias."""
    temporal = ruta.with_suffix(".tmp")
    imagen.save(temporal, "WEBP", quality=85, method=4)
    temporal.replace(ruta)


def main():
    rutas = sorted(CARPETA.glob("*.webp"))
    cambiadas = 0
    for ruta in rutas:
        try:
            with Image.open(ruta) as imagen:
                if imagen.size == (LADO, LADO):
                    continue
                cuadrada = cuadrar(imagen)
            guardar(cuadrada, ruta)
            cambiadas += 1
        except OSError as error:
            print(f"No se pudo procesar {ruta.name}: {error}")
    print(f"{cambiadas} imágenes cuadradas a {LADO}×{LADO} ({len(rutas)} en total)")


if __name__ == "__main__":
    main()
