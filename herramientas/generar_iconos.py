# -*- coding: utf-8 -*-
"""
Genera los iconos de la app en img/iconos/: el pájaro de la silueta en blanco sobre el
degradado morado de la app, con el pico dorado.

Uso:  python herramientas/generar_iconos.py
"""
import math
import pathlib

from PIL import Image, ImageDraw

DESTINO = pathlib.Path(__file__).resolve().parent.parent / "img" / "iconos"
FONDO_ARRIBA = (178, 102, 214)   # #B266D6, mismos colores que el fondo de la app
FONDO_ABAJO = (91, 42, 147)      # #5B2A93
PAJARO = (255, 255, 255)
PICO = (242, 178, 51)            # #F2B233
SUPERMUESTREO = 4                # se dibuja más grande y se reduce para suavizar los bordes


def degradado(lado):
    fondo = Image.new("RGB", (lado, lado))
    pintar = ImageDraw.Draw(fondo)
    for y in range(lado):
        t = y / (lado - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(FONDO_ARRIBA, FONDO_ABAJO))
        pintar.line([(0, y), (lado, y)], fill=color)
    return fondo


def dibujar_pajaro(pintar, lado, escala):
    """Misma forma que img/silueta.svg (lienzo de 100×100), centrada y escalada."""
    k = lado / 100 * escala
    desplazamiento = lado * (1 - escala) / 2

    def punto(x, y):
        return (desplazamiento + x * k, desplazamiento + y * k)

    def circulo(cx, cy, r, color):
        x, y = punto(cx, cy)
        pintar.ellipse([x - r * k, y - r * k, x + r * k, y + r * k], fill=color)

    # Cuerpo: elipse girada -18°
    cx, cy, rx, ry, giro = 48, 56, 26, 18, math.radians(-18)
    cuerpo = []
    for i in range(90):
        t = 2 * math.pi * i / 90
        cuerpo.append(punto(
            cx + rx * math.cos(t) * math.cos(giro) - ry * math.sin(t) * math.sin(giro),
            cy + rx * math.cos(t) * math.sin(giro) + ry * math.sin(t) * math.cos(giro),
        ))
    pintar.polygon(cuerpo, fill=PAJARO)
    circulo(68, 36, 12, PAJARO)                                                         # cabeza
    pintar.polygon([punto(78, 33), punto(90, 37), punto(78, 40)], fill=PICO)            # pico
    pintar.polygon([punto(28, 62), punto(6, 78), punto(10, 80), punto(36, 70)], fill=PAJARO)  # cola
    pintar.polygon([punto(44, 72), punto(42, 88), punto(45, 88), punto(48, 73)], fill=PAJARO)  # pata
    pintar.polygon([punto(54, 70), punto(55, 88), punto(58, 88), punto(57, 70)], fill=PAJARO)  # pata
    circulo(71, 34, 2.2, FONDO_ABAJO)                                                   # ojo


def icono(lado, escala, redondeado):
    grande = lado * SUPERMUESTREO
    imagen = degradado(grande).convert("RGBA")
    dibujar_pajaro(ImageDraw.Draw(imagen), grande, escala)
    if redondeado:
        mascara = Image.new("L", (grande, grande), 0)
        ImageDraw.Draw(mascara).rounded_rectangle([0, 0, grande - 1, grande - 1], radius=int(grande * 0.22), fill=255)
        imagen.putalpha(mascara)
    return imagen.resize((lado, lado), Image.LANCZOS)


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    icono(192, 0.78, redondeado=True).save(DESTINO / "icono-192.png")
    icono(512, 0.78, redondeado=True).save(DESTINO / "icono-512.png")
    icono(512, 0.62, redondeado=False).save(DESTINO / "icono-maskable-512.png")             # Android recorta la forma
    icono(180, 0.74, redondeado=False).convert("RGB").save(DESTINO / "icono-180.png")       # iPhone redondea él solo
    print(f"Iconos generados en {DESTINO}")


if __name__ == "__main__":
    main()
