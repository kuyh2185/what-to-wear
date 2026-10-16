"""Converts Gemini PNGs to web JPEGs for the catalog.
usage: python -I tools/to-jpeg.py <src.png> <dst.jpg> [<src.png> <dst.jpg> ...]"""
import sys
from PIL import Image

W, H = 900, 1200  # 3:4, same ratio as the Gemini originals (1792x2400)


def erase_mark(im):
    """Paints over Gemini's sparkle mark in the bottom-right corner.
    The backdrop there is a smooth studio gradient, so each row is filled by blending
    the backdrop colors just left and right of the mark."""
    w, h = im.size
    x0, x1, y0, y1 = int(w * .815), int(w * .915), int(h * .86), int(h * .94)
    px = im.load()
    for y in range(y0, y1):
        l, r = px[x0 - 2, y], px[min(x1 + 2, w - 1), y]
        for x in range(x0, x1):
            t = (x - x0) / (x1 - x0)
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(l, r))


args = sys.argv[1:]
for src, dst in zip(args[::2], args[1::2]):
    im = Image.open(src).convert('RGB')
    erase_mark(im)
    # center-crop to 3:4 in case Gemini returns a slightly different ratio
    w, h = im.size
    if w / h > W / H:
        nw = round(h * W / H); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * H / W); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im.resize((W, H), Image.LANCZOS).save(dst, 'JPEG', quality=84, optimize=True, progressive=True)
    print(dst)
