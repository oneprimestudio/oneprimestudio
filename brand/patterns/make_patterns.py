"""
One Prime Studio paper patterns: 4:5 backgrounds for invoices, letterheads, quotes and covers.

Drawn in the site's own dither language (DitherSeam / CursorField): square cells of 4 x 4 sub-pixels,
each sub-pixel lit when the cell's coverage beats the studio's Bayer rank for that position
(src/lib/bayer.ts). Every pattern is a stack of layers, each one a coverage field with a softly
wandering edge, painted in brand colours from back to front, so the fronts read as levels.

    a cell's coverage:   v = field(x, y) + wander + grain
    a sub-pixel lights:  v > THRESHOLD[j mod 4][i mod 4]

Output: 2400 x 3000 px PNGs (8 x 10 in at 300 dpi) in ./out, plus a contact sheet.
    python brand/patterns/make_patterns.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 2400, 3000
SUB = 6  # px per sub-pixel at 300 dpi (0.5 mm); 4 x 4 of them make a 2 mm cell
SW, SH = W // SUB, H // SUB  # sub-pixel grid, 400 x 500
CW, CH = SW // 4, SH // 4  # cell grid, 100 x 125

INK = "#08064e"
ACCENT = "#2f6bff"
CHALK = "#f7f6f2"
SAND = "#efede9"
MIST = "#8a89a3"
GRAPHITE = "#3b3a56"
PAPER = "#ffffff"
HAZE = "#dddbe4"  # mist thinned toward chalk: a watermark that text can sit on

RANKS = np.array([[0, 12, 3, 15], [8, 4, 11, 7], [2, 14, 1, 13], [10, 6, 9, 5]])
THRESHOLD = np.tile((RANKS + 0.5) / 16, (SH // 4, SW // 4))  # THRESHOLD[j][i] per sub-pixel

OUT = Path(__file__).parent / "out"


def rgb(hex_):
    n = int(hex_[1:], 16)
    return np.array([(n >> 16) & 255, (n >> 8) & 255, n & 255], dtype=np.uint8)


# cell-centre coordinates, 0..1 across the page (x) and down it (y)
cy, cx = np.mgrid[0:CH, 0:CW].astype(float)
X = (cx + 0.5) / CW
Y = (cy + 0.5) / CH


def wander(seed, scale=14, amp=0.07):
    """Smooth value noise in cells (~scale cells per step), like the seam's bending edge."""
    rng = np.random.default_rng(seed)
    coarse = rng.random((CH // scale + 3, CW // scale + 3)).astype(np.float32)
    big = Image.fromarray(coarse, "F").resize(((CW // scale + 3) * scale, (CH // scale + 3) * scale), Image.BICUBIC)
    return (np.asarray(big)[:CH, :CW] - 0.5) * 2 * amp


def grain(seed, amp=0.05):
    return (np.random.default_rng(seed).random((CH, CW)) - 0.5) * 2 * amp


def front(t, a, b, gamma=1.6, seed=None, amp=0.035):
    """0 before a, 1 after b, eased between: one layer's rising edge. With a seed the edge itself
    wanders (the position is bent, not the coverage), so even the faint end of a level is never a ruled line."""
    if seed is not None:
        t = t + wander(seed, amp=amp)
    s = np.clip((t - a) / (b - a), 0, 1)
    return s**gamma


def lit(v):
    """Cell coverage -> sub-pixel mask through the Bayer ranks."""
    return np.repeat(np.repeat(v, 4, 0), 4, 1) > THRESHOLD


class Page:
    def __init__(self, ground):
        self.px = np.empty((SH, SW, 3), np.uint8)
        self.px[:] = rgb(ground)

    def layer(self, colour, v, seed=0, grain_amp=0.05):
        v = v + grain(seed, grain_amp) * (v > 0.001)
        self.px[lit(v)] = rgb(colour)
        return self

    def mask(self, colour, m):
        self.px[m] = rgb(colour)
        return self

    def image(self):
        img = Image.fromarray(self.px).resize((W, H), Image.NEAREST)
        return img


def switch_mark(cx_, cy_, width):
    """The logo's switch (outline + knob, Logo.tsx proportions) as a sub-pixel mask."""
    s = 8  # draw large, then reduce, so the curve is clean at sub-pixel size
    img = Image.new("L", (SW * s, SH * s), 0)
    d = ImageDraw.Draw(img)
    w = width * SW * s
    h = w * 547 / 1064
    stroke = w * 97.5 / 1064
    x0, y0 = cx_ * SW * s - w / 2, cy_ * SH * s - h / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=h / 2, outline=255, width=round(stroke))
    knob = w * 272 / 1064
    kx = x0 + w * 137.5 / 1064
    d.ellipse([kx, y0 + h / 2 - knob / 2, kx + knob, y0 + h / 2 + knob / 2], fill=255)
    small = img.resize((SW, SH), Image.BOX)
    return np.asarray(small) > 127


# ------------------------------------------------------------------ the set

def _hash(x, y):
    """src/lib/dither.ts hash, bit for bit (Math.imul is a wrapping 32-bit multiply)."""
    M = 0xFFFFFFFF
    x = np.asarray(x, np.int64) & M
    y = np.asarray(y, np.int64) & M
    h = ((x * 374761393) & M) ^ ((y * 668265263) & M)
    h = ((h ^ (h >> 13)) * 1274126177) & M
    return (h ^ (h >> 16)) / 4294967296


def _smooth(x, y):
    """src/lib/dither.ts smooth: bilinear value noise between hashed corners, eased."""
    xi, yi = np.floor(x).astype(np.int64), np.floor(y).astype(np.int64)
    fx, fy = x - xi, y - yi
    ux, uy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a, b = _hash(xi, yi), _hash(xi + 1, yi)
    c, d = _hash(xi, yi + 1), _hash(xi + 1, yi + 1)
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy


def seam(ground, layers, sub=4, progress=0.5):
    """DitherSeam as it sits on the page, held still, stacked in levels: each (colour, band) is one seam
    at the page's foot, `band` of its height tall, its colour arriving in the seam's own dots; later
    layers are shorter and paint over earlier ones, so the shades deepen toward the foot. The page's 8px
    cell across a 1440px screen is ~180 cells; sub=4 gives 150 across this sheet (1.35 mm in print).

        y = 0 on a band's top row of cells, 1 on its bottom row
        v = y^γ + (wander + grain)·4y(1 − y),  γ = 2^(2.2 − 4.4·progress)   (0.5 = the still frame)
        a sub-pixel takes the layer's colour when v > THRESHOLD[sj][si]
    """
    cell = sub * 4
    px = np.empty((H // sub, W // sub, 3), np.uint8)
    px[:] = rgb(ground)
    for k, (colour, band) in enumerate(layers):
        cols, rows = W // cell, -(-round(H * band) // cell)  # rows rounded up: the spare falls off the top
        cj, ci = np.mgrid[0:rows, 0:cols]
        y = cj / max(1, rows - 1)
        n = ci + 997 * k  # each level samples its own stretch of the noise, so their edges don't echo
        wander = (_smooth(n / 14, cj / 14) - 0.5) * 0.34
        grain = (_hash(n + 7919, cj) - 0.5) * 0.1
        v = y ** (2 ** (2.2 - 4.4 * progress)) + (wander + grain) * 4 * y * (1 - y)
        th = np.tile((RANKS + 0.5) / 16, (rows, cols))
        on = np.repeat(np.repeat(v, 4, 0), 4, 1) > th
        on = on[-px.shape[0]:]
        px[-on.shape[0]:][on] = rgb(colour)  # anchored to the foot, like the seam's canvas
    return Image.fromarray(px).resize((W, H), Image.NEAREST)


def p01_foot_seam():
    """Invoice: a white page with DitherSeam rising in three light greys at its foot, never black."""
    # sub=8: 2.7 mm cells of 0.7 mm dots (75 across), large enough to read as dither at arm's length
    return seam(PAPER, [("#e6e6e6", 0.42), ("#cccccc", 0.29), ("#adadad", 0.16)], sub=8)


def p02_head_band():
    """Letterhead: an ink head dissolving into the page, a mist level beneath it."""
    return (
        Page(CHALK)
        .layer(MIST, front(1 - Y, 0.70, 0.88, seed=211) * 0.85, seed=21)
        .layer(INK, front(1 - Y, 0.80, 0.97, 1.7, seed=221), seed=22)
        .image()
    )


def p03_corner():
    """Quote / proposal: three levels blooming from the bottom-right corner."""
    r = np.hypot((1 - X) * 0.8, 1 - Y)  # page is 4:5, so x is scaled to keep the arcs round
    t = 1 - r
    return (
        Page(CHALK)
        .layer(MIST, front(t, 0.30, 0.62, seed=311) * 0.8, seed=31)
        .layer(ACCENT, front(t, 0.48, 0.74, seed=321), seed=32)
        .layer(INK, front(t, 0.62, 0.92, seed=331), seed=33)
        .image()
    )


def p04_rail():
    """Receipts / statements: a dither rail down the left margin."""
    return (
        Page(CHALK)
        .layer(MIST, front(1 - X, 0.80, 0.93, seed=411) * 0.85, seed=41)
        .layer(INK, front(1 - X, 0.88, 0.99, 1.8, seed=421), seed=42)
        .image()
    )


def p05_head_and_foot():
    """Multi-page documents: a slim head and a slim foot, the body left open."""
    head = front(1 - Y, 0.88, 0.99, 1.7, seed=521)
    foot = front(Y, 0.84, 0.99, 1.7, seed=522)
    return (
        Page(CHALK)
        .layer(MIST, np.maximum(front(1 - Y, 0.84, 0.93, seed=511), front(Y, 0.78, 0.92, seed=512)) * 0.8, seed=51)
        .layer(INK, np.maximum(head, foot), seed=52)
        .image()
    )


def p06_mark():
    """Watermark sheet: the switch mark, filled in rising dither, faint on the page."""
    m = switch_mark(0.5, 0.5, 0.62)
    j = np.arange(SH)[:, None] / SH
    fill = np.clip((j - 0.38) / 0.26, 0, 1) * 0.55 + 0.08  # sparse at the mark's top, half lit at its foot
    dots = np.broadcast_to(fill, (SH, SW)) > THRESHOLD
    return (
        Page(CHALK)
        .mask(HAZE, m & dots)
        .layer(MIST, front(Y, 0.86, 0.99, seed=611) * 0.7, seed=61)
        .image()
    )


def p07_ink_cover():
    """Cover / dark sheet: ink ground, accent then chalk rising from the foot."""
    return (
        Page(INK)
        .layer(GRAPHITE, front(Y, 0.42, 0.80, seed=711) * 0.9, seed=71)
        .layer(ACCENT, front(Y, 0.58, 0.90, seed=721), seed=72)
        .layer(CHALK, front(Y, 0.74, 0.99, 1.8, seed=731), seed=73)
        .image()
    )


def p08_ink_mark():
    """Dark cover with the mark: chalk dither switch on ink, a halo level around it."""
    m = switch_mark(0.5, 0.44, 0.56)
    r = np.hypot((X - 0.5) * 0.8, Y - 0.44)
    halo = front(1 - r, 0.55, 1.0, 2.2, seed=811) * 0.45
    page = Page(INK).layer(GRAPHITE, halo, seed=81)
    j = np.arange(SH)[:, None] / SH
    fill = np.clip((j - 0.34) / 0.22, 0, 1) * 0.75 + 0.25
    page.mask(CHALK, m & (np.broadcast_to(fill, (SH, SW)) > THRESHOLD))
    return page.layer(ACCENT, front(Y, 0.88, 1.0, seed=821) * 0.9, seed=82).image()


SET = [
    ("01-foot-seam", "Invoice", p01_foot_seam),
    ("02-head-band", "Letterhead", p02_head_band),
    ("03-corner-bloom", "Quote / proposal", p03_corner),
    ("04-margin-rail", "Receipt / statement", p04_rail),
    ("05-head-and-foot", "Multi-page", p05_head_and_foot),
    ("06-mark-watermark", "Watermark sheet", p06_mark),
    ("07-ink-cover", "Cover, dark", p07_ink_cover),
    ("08-ink-mark", "Cover with mark", p08_ink_mark),
]


def contact_sheet(images):
    tw, th, gap, label = 480, 600, 48, 56
    cols = 4
    rows = (len(images) + cols - 1) // cols
    sheet = Image.new("RGB", (gap + cols * (tw + gap), gap + rows * (th + label + gap)), CHALK)
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        font = ImageFont.load_default()
    for k, (name, use, img) in enumerate(images):
        x = gap + (k % cols) * (tw + gap)
        y = gap + (k // cols) * (th + label + gap)
        sheet.paste(img.resize((tw, th), Image.BOX), (x, y))
        d.rectangle([x - 1, y - 1, x + tw, y + th], outline="#dcdbe2")
        d.text((x, y + th + 16), f"{name}  ·  {use}", fill=INK, font=font)
    return sheet


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    made = []
    for name, use, fn in SET:
        img = fn()
        img.save(OUT / f"oneprime-pattern-{name}.png", dpi=(300, 300), optimize=True)
        made.append((name, use, img))
        print("wrote", name)
    contact_sheet(made).save(OUT / "contact-sheet.png", optimize=True)
    print("wrote contact-sheet")
