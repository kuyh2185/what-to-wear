"""Cuts Gemini 2x2 grid images into one image per look.
usage: python -I tools/split-grid.py <dir>
Reads <dir>/grid/gr_<id1>-<id2>-<id3>-<id4>.png and writes <dir>/raw/<id>_avg.png for each panel
(existing panels are left alone). The white gutters between panels are found by brightness, so a
slightly uneven grid still splits cleanly; an image without a clear 2x2 gutter is reported and skipped."""
import sys, os, glob
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module
erase_mark = import_module('to-jpeg').erase_mark


def gutter(means, lo, hi):
    """Returns the (start, end) of the bright run nearest the middle of means[lo:hi], or None."""
    runs, start = [], None
    for i in range(lo, hi):
        if means[i] > 238 and start is None:
            start = i
        elif means[i] <= 238 and start is not None:
            runs.append((start, i)); start = None
    if start is not None:
        runs.append((start, hi))
    runs = [r for r in runs if r[1] - r[0] >= 2]
    mid = (lo + hi) / 2
    return min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - mid)) if runs else None


def split(path, raw):
    ids = os.path.basename(path)[3:-4].split('-')
    im = Image.open(path).convert('RGB')
    erase_mark(im)  # the sparkle sits in the bottom-right panel
    w, h = im.size
    g = im.convert('L')
    small = g.resize((w // 4, h // 4))
    px = small.load()
    sw, sh = small.size
    cols = [sum(px[x, y] for y in range(sh)) / sh for x in range(sw)]
    rows = [sum(px[x, y] for x in range(sw)) / sw for y in range(sh)]
    gx, gy = gutter(cols, int(sw * .4), int(sw * .6)), gutter(rows, int(sh * .4), int(sh * .6))
    if not gx or not gy:
        # Gemini sometimes draws the panels edge to edge with no bright gap; a grid of the usual
        # size is then cut at its exact middle
        if (w, h) != (1792, 2400):
            print('no 2x2 gutter:', os.path.basename(path)); return 0
        print('no gutter, cut at the middle:', os.path.basename(path))
        gx, gy = (w // 8, w // 8), (h // 8, h // 8)
    xs = [(0, gx[0] * 4), (gx[1] * 4, w)]
    ys = [(0, gy[0] * 4), (gy[1] * 4, h)]
    boxes = [(xs[0][0], ys[0][0], xs[0][1], ys[0][1]), (xs[1][0], ys[0][0], xs[1][1], ys[0][1]),
             (xs[0][0], ys[1][0], xs[0][1], ys[1][1]), (xs[1][0], ys[1][0], xs[1][1], ys[1][1])]
    n = 0
    for lid, (x0, y0, x1, y1) in zip(ids, boxes):
        out = os.path.join(raw, f'{lid}_avg.png')
        if os.path.exists(out):
            continue
        # trim 3px so no gutter edge is left, then any white outer margin Gemini drew around the grid
        trim(im.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3))).save(out)
        n += 1
    return n


def trim(panel):
    """Cuts near-white lines off each edge of a panel (at most 60px a side)."""
    g = panel.convert('L')
    w, h = g.size
    px = g.load()
    col = lambda x: sum(px[x, y] for y in range(0, h, 4)) / len(range(0, h, 4))
    row = lambda y: sum(px[x, y] for x in range(0, w, 4)) / len(range(0, w, 4))
    l, r, t, b = 0, w, 0, h
    while l < 60 and col(l) > 240: l += 1
    while w - r < 60 and col(r - 1) > 240: r -= 1
    while t < 60 and row(t) > 240: t += 1
    while h - b < 60 and row(b - 1) > 240: b -= 1
    return panel.crop((l, t, r, b))


d = sys.argv[1]
raw = os.path.join(d, 'raw')
total = sum(split(p, raw) for p in sorted(glob.glob(os.path.join(d, 'grid', 'gr_*.png'))))
print('panels written:', total)
