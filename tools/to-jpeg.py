"""Converts Gemini PNGs to web JPEGs for the catalog.
usage: python -I tools/to-jpeg.py <src.png> <dst.jpg> [<src.png> <dst.jpg> ...]"""
import sys
from PIL import Image

W, H = 900, 1200  # 3:4, same ratio as the Gemini originals (1792x2400)


def erase_mark(im):
    """Paints over Gemini's sparkle mark in the bottom-right corner of a full Gemini image.
    The backdrop there is a smooth studio gradient, so the box is filled by blending the backdrop
    just left and right of it. Panels cut from a grid are smaller and have no mark; they are left alone."""
    w, h = im.size
    if w < 1500:
        return
    x0, x1, y0, y1 = int(w * .832), int(w * .897), int(h * .872), int(h * .928)
    px = im.load()
    # The box can straddle the wall/floor line, so each row gets its own baseline blended between the
    # backdrop just left and right of the box. Only pixels brighter than that baseline (the white
    # sparkle) are painted, so clothing that reaches into the box is never touched. A row whose left
    # edge is covered by clothing uses its right edge alone.
    lum = lambda c: sum(c) / 3
    for y in range(y0, y1):
        l, r = px[x0 - 2, y], px[x1 + 2, y]
        if abs(lum(l) - lum(r)) > 18:
            l = r
        for x in range(x0, x1):
            t = (x - x0) / (x1 - x0)
            base = tuple(round(a + (b - a) * t) for a, b in zip(l, r))
            if lum(px[x, y]) > lum(base) + 3:
                px[x, y] = base


def main(args):
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


if __name__ == '__main__':
    main(sys.argv[1:])
