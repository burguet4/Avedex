# -*- coding: utf-8 -*-
"""Genera los iconos de la app (img/iconos/). Ejecutar: python herramientas/generar_iconos.py"""
import pathlib
from PIL import Image, ImageDraw

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "img" / "iconos"
FONDO = (47, 143, 107)      # verde prado
TINTA = (255, 255, 255)
SOL = (231, 180, 22)        # amarillo retama


def pajaro(d, s, escala=1.0):
    """Dibuja el pájaro (misma forma que img/silueta.svg) en un lienzo de lado s."""
    k = s / 100 * escala
    off = s * (1 - escala) / 2

    def p(x, y):
        return (off + x * k, off + y * k)

    # cuerpo: elipse inclinada aproximada con un polígono
    import math
    cx, cy, rx, ry, ang = 48, 56, 26, 18, math.radians(-18)
    cuerpo = [p(cx + rx * math.cos(t) * math.cos(ang) - ry * math.sin(t) * math.sin(ang),
                cy + rx * math.cos(t) * math.sin(ang) + ry * math.sin(t) * math.cos(ang))
              for t in [i * 2 * math.pi / 90 for i in range(90)]]
    d.polygon(cuerpo, fill=TINTA)
    x, y = p(68, 36)
    r = 12 * k
    d.ellipse([x - r, y - r, x + r, y + r], fill=TINTA)
    d.polygon([p(78, 33), p(90, 37), p(78, 40)], fill=SOL)
    d.polygon([p(28, 62), p(6, 78), p(10, 80), p(36, 70)], fill=TINTA)
    d.polygon([p(44, 72), p(42, 88), p(45, 88), p(48, 73)], fill=TINTA)
    d.polygon([p(54, 70), p(55, 88), p(58, 88), p(57, 70)], fill=TINTA)
    # ojo
    x, y = p(71, 34)
    r = 2.2 * k
    d.ellipse([x - r, y - r, x + r, y + r], fill=FONDO)


def icono(lado, escala, redondeado):
    sobre = 4  # dibujar a mayor tamaño y reducir para suavizar bordes
    s = lado * sobre
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if redondeado:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=FONDO)
    else:
        d.rectangle([0, 0, s, s], fill=FONDO)
    pajaro(d, s, escala)
    return img.resize((lado, lado), Image.LANCZOS)


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    icono(192, 0.78, True).save(DESTINO / "icono-192.png")
    icono(512, 0.78, True).save(DESTINO / "icono-512.png")
    icono(512, 0.62, False).save(DESTINO / "icono-maskable-512.png")   # Android recorta la forma
    icono(180, 0.74, False).convert("RGB").save(DESTINO / "icono-180.png")  # iPhone redondea solo
    print("Iconos generados en", DESTINO)


if __name__ == "__main__":
    main()
