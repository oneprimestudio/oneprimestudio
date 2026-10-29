"""
Project banners: a screen shown on an iPad Pro 13" (M4), portrait, on a quiet ground.

    python brand/banners/compose.py <screen.png> <out.webp> [--size=1600x2000] [--ground=#ece9e5]

The screen is fitted (cover) into the iPad's own 2064 x 2752 display, so a capture taken at the iPad's
viewport (1032 x 1376 CSS px at 2x, see capture.mjs) lands pixel for pixel. Drawn at 2x and reduced,
so the rounded corners come out smooth.

    body     215.5 x 281.6 mm   (Apple's spec)
    display  2064 x 2752 px, 3:4, an even bezel of ~8.7 mm round it
"""

import sys

from PIL import Image, ImageDraw, ImageFilter

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--"))
SCREEN, OUT = args
CW, CH = (int(v) for v in opts.get("size", "1600x2000").split("x"))
GROUND = opts.get("ground", "#ece9e5")

S = 2  # supersample
W, H = CW * S, CH * S

BODY_W, BODY_H = 215.5, 281.6  # mm
BEZEL = 8.7
BODY_R = 18.0  # outer corner radius, mm
SCREEN_R = BODY_R - BEZEL + 1.2

# the iPad fills 88% of the banner's height, or 84% of its width, whichever binds first
mm = min(H * 0.88 / BODY_H, W * 0.84 / BODY_W)
bw, bh = BODY_W * mm, BODY_H * mm
x0, y0 = (W - bw) / 2, (H - bh) / 2 - H * 0.004

canvas = Image.new("RGB", (W, H), GROUND)

# a soft floor shadow, then a tighter contact shadow
for blur, alpha, dy, grow in ((90 * S, 70, 40 * S, 10 * S), (18 * S, 60, 8 * S, 0)):
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).rounded_rectangle(
        [x0 - grow, y0 + dy, x0 + bw + grow, y0 + bh + dy], radius=BODY_R * mm, fill=alpha
    )
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    canvas.paste(Image.new("RGB", (W, H), "#2a2624"), (0, 0), sh)

d = ImageDraw.Draw(canvas)
# the aluminium edge, then the black glass inside it
d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], radius=BODY_R * mm, fill="#3a3a3c")
e = 0.55 * mm
d.rounded_rectangle([x0 + e, y0 + e, x0 + bw - e, y0 + bh - e], radius=BODY_R * mm - e, fill="#0b0b0c")

# the display
sx0, sy0 = x0 + BEZEL * mm, y0 + BEZEL * mm
sw, sh_ = bw - 2 * BEZEL * mm, bh - 2 * BEZEL * mm
shot = Image.open(SCREEN).convert("RGB")
scale = max(sw / shot.width, sh_ / shot.height)
shot = shot.resize((round(shot.width * scale), round(shot.height * scale)), Image.LANCZOS)
shot = shot.crop((0, 0, round(sw), round(sh_)))  # cover, anchored top-left like a screen
mask = Image.new("L", shot.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, shot.width - 1, shot.height - 1], radius=SCREEN_R * mm, fill=255)
canvas.paste(shot, (round(sx0), round(sy0)), mask)

# the front camera sits on the landscape top edge: in portrait, the middle of the left bezel
cx, cy, cr = x0 + BEZEL * mm / 2, y0 + bh / 2, 1.1 * mm
d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill="#1c1d22")
d.ellipse([cx - cr * 0.45, cy - cr * 0.45, cx + cr * 0.45, cy + cr * 0.45], fill="#2b3040")

out = canvas.resize((CW, CH), Image.LANCZOS)
out.save(OUT, quality=90, method=6) if OUT.endswith(".webp") else out.save(OUT)
print("wrote", OUT, out.size)
