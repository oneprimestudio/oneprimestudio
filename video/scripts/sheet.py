"""contact sheets of out/stills → out/sheet<n>.png (16 per sheet)"""
import glob, os
from PIL import Image, ImageDraw
fs = sorted(glob.glob(os.path.join("out", "stills", "*.png")), key=lambda f: float(os.path.basename(f)[:-4]))
ims = [Image.open(f) for f in fs]
w, h = ims[0].size
cols = 8
for part in range(0, len(ims), 16):
    chunk = ims[part:part + 16]
    names = fs[part:part + 16]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 8), rows * (h + 30)), "white")
    d = ImageDraw.Draw(sheet)
    for i, (im, n) in enumerate(zip(chunk, names)):
        x = (i % cols) * (w + 8)
        y = (i // cols) * (h + 30)
        sheet.paste(im, (x, y + 26))
        d.text((x + 4, y + 6), os.path.basename(n)[:-4] + "s", fill="black")
    sheet.save(os.path.join("out", f"sheet{part // 16}.png"))
    print("sheet", part // 16, sheet.size)
