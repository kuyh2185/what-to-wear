"""Converts Gemini PNGs to web JPEGs for the catalog.
usage: python -I tools/to-jpeg.py <src.png> <dst.jpg> [<src.png> <dst.jpg> ...]"""
import sys
from PIL import Image

W, H = 900, 1200  # 3:4, same ratio as the Gemini originals (1792x2400)
args = sys.argv[1:]
for src, dst in zip(args[::2], args[1::2]):
    im = Image.open(src).convert('RGB')
    # center-crop to 3:4 in case Gemini returns a slightly different ratio
    w, h = im.size
    if w / h > W / H:
        nw = round(h * W / H); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w * H / W); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    im.resize((W, H), Image.LANCZOS).save(dst, 'JPEG', quality=84, optimize=True, progressive=True)
    print(dst)
