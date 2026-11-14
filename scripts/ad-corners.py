#!/usr/bin/env python3
"""Arte de anuncios de Stan -> WebP sin pérdida con las 4 esquinas redondeadas transparentes.

  python3 scripts/ad-corners.py entrada.png salida.webp [radio_px]

Las piezas vienen con esquinas redondeadas (16 pt = 48 px @3x) sobre blanco opaco. Se calcula la
cobertura exacta del rectángulo redondeado (supermuestreo 8x8): fuera de la curva alfa 0, en el borde
alfa parcial con el color "des-mezclado" del blanco, y por dentro los píxeles quedan idénticos.
"""
import sys
import numpy as np
from PIL import Image

SS = 8

def corner_alpha(r):
    """Cobertura (0..1) de un cuarto de círculo de radio r en un bloque r x r (esquina superior izquierda)."""
    n = int(np.ceil(r))
    off = (np.arange(SS) + 0.5) / SS
    ys = (np.arange(n)[:, None] + off[None, :]).reshape(-1)  # n*SS
    xs = ys
    dy = r - ys[:, None]
    dx = r - xs[None, :]
    inside = ((dx <= 0) | (dy <= 0) | (dx * dx + dy * dy <= r * r)).astype(np.float64)
    return inside.reshape(n, SS, n, SS).mean(axis=(1, 3))

def process(src, dst, r=48.0):
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
    h, w, _ = rgb.shape
    alpha = np.ones((h, w))
    c = corner_alpha(r)
    n = c.shape[0]
    alpha[:n, :n] = c
    alpha[:n, w - n:] = c[:, ::-1]
    alpha[h - n:, :n] = c[::-1, :]
    alpha[h - n:, w - n:] = c[::-1, ::-1]
    out = rgb.copy()
    edge = (alpha > 0) & (alpha < 1)
    a = alpha[edge][:, None]
    out[edge] = np.clip((rgb[edge] - 255.0 * (1 - a)) / a, 0, 255)
    out[alpha == 0] = 0
    rgba = np.dstack([np.round(out), np.round(alpha * 255)]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    img.save(dst, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    back = np.asarray(Image.open(dst).convert('RGBA'))
    full = alpha == 1
    assert (back[..., :3][full] == rgb.astype(np.uint8)[full]).all(), 'los píxeles de adentro cambiaron'
    assert (back[..., 3] == rgba[..., 3]).all(), 'el alfa cambió'
    # Lo que quedó transparente tenía que ser blanco: si no, el radio no calza con el arte.
    gone = rgb[alpha == 0]
    return int(gone.min()) if gone.size else 255

if __name__ == '__main__':
    lo = process(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 48.0)
    if lo < 235:
        sys.exit(f'{sys.argv[1]}: la esquina recortada no era blanca (mín {lo}); revisa el radio')
