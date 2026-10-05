#!/usr/bin/env python3
"""
Builds the per-product image galleries from the client's artwork folder.

    python3 build_gallery.py <PRODUCTS dir> <out dir>

Writes <out>/<handle>/<NN>-<slug>.jpg (1400px squares, front first, back last)
and <out>/manifest.json ({handle: [files in display order]}). `upload-gallery.ts`
pushes that manifest to the catalog.

Why squares: storefront cards cover-crop the first image to a square, so
every image is composed square here instead of being cut by CSS.
"""
import fitz, json, os, re, sys
from PIL import Image, ImageFilter, ImageChops

SRC, OUT = sys.argv[1], sys.argv[2]
SIZE = 1400
_pdf_cache = {}


def page(file, n, long_side=2600):
    key = (file, n)
    if key not in _pdf_cache:
        d = fitz.open(os.path.join(SRC, file))
        p = d[n - 1]
        z = long_side / max(p.rect.width, p.rect.height)
        pix = p.get_pixmap(matrix=fitz.Matrix(z, z), alpha=False)
        _pdf_cache[key] = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    return _pdf_cache[key].copy()


def photo(file):
    return Image.open(os.path.join(SRC, file)).convert("RGB")


def crop(im, box):
    w, h = im.size
    return im.crop((int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h)))


def trim_white(im, pad=0.03):
    bg = Image.new("RGB", im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg).convert("L").point(lambda v: 255 if v > 14 else 0)
    bb = diff.getbbox()
    if not bb:
        return im
    w, h = im.size
    px = int(pad * max(bb[2] - bb[0], bb[3] - bb[1]))
    return im.crop((max(0, bb[0] - px), max(0, bb[1] - px), min(w, bb[2] + px), min(h, bb[3] + px)))


def corners_white(im):
    w, h = im.size
    pts = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]
    return all(min(im.getpixel(p)) > 238 for p in pts)


def square(im, margin=0.05):
    """Contain `im` in a SIZE square: white ground for flat art on white,
    otherwise a blurred, enlarged copy of the image so scenes extend edge to edge."""
    if corners_white(im):
        canvas = Image.new("RGB", (SIZE, SIZE), (255, 255, 255))
        inner = int(SIZE * (1 - 2 * margin))
    else:
        canvas = im.copy()
        s = SIZE / min(canvas.size)
        canvas = canvas.resize((int(canvas.width * s) + 1, int(canvas.height * s) + 1))
        l, t = (canvas.width - SIZE) // 2, (canvas.height - SIZE) // 2
        canvas = canvas.crop((l, t, l + SIZE, t + SIZE)).filter(ImageFilter.GaussianBlur(36))
        inner = SIZE
    s = min(inner / im.width, inner / im.height)
    r = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    canvas.paste(r, ((SIZE - r.width) // 2, (SIZE - r.height) // 2))
    return canvas


# --- sources ---------------------------------------------------------------
def P(file, n, box=None, trim=True):
    def f():
        im = page(file, n)
        if box:
            im = crop(im, box)
        return trim_white(im) if trim else im
    return f


def M(file, box=None):
    def f():
        im = photo(file)
        return crop(im, box) if box else im
    return f


BP = "Blueberry Pan Cake,Popped Ragi flour,Raw Banana Powder"
JB = "Jaggery,Peanut,Sesame Chikki back,Dals,Mapillai Samba,Karuppu kavuni.pdf"
JF = "Solid Jaggery,Peanut ,sesame Chikki front.pdf"
MF, MB = "Millets/Millets Front.pdf", "Millets/Millets Backside.pdf"
SN = "Snacks (4 x 7 in).pdf"
RP, RA = "Rice/Rice Pouch Front & Back Mockup.pdf", "Rice/All Rices.pdf"
OIL = "Oil-Peanut & Sesame.pdf"
PODI = "Podis/Idli,Paruppu,Sesame Podi.pdf"
RIGHT = (0.5, 0, 1, 1)
LEFT = (0, 0, 0.5, 1)


def rice(n):
    # page 1 has the front pouch on the right, pages 2-6 on the left
    return [("front", P(RP, n, RIGHT if n == 1 else LEFT)), ("pouches", P(RP, n)), ("artwork", P(RA, n))]


def millet(front, back, extra=()):
    return [("front", P(MF, front, trim=False)), *extra, ("back", P(MB, back, trim=False))]


PLAN = {
    # ghee
    "sastra-pure-cow-ghee-100ml-3-2-oz": [
        ("front", M("Ghee/100ml Ghee Mockup.jpeg", (0.0, 0.10, 0.507, 0.86))),
        ("jars", M("Ghee/100ml Ghee Mockup.jpeg")),
        ("label", P("Ghee/SASTRA GHEE-100ML NEW.pdf", 1)),
    ],
    "sastra-pure-cow-ghee-1l-32-oz": [
        ("front", M("Ghee/1Liter Ghee Mockup.jpeg", (0.0, 0.03, 0.413, 0.96))),
        ("tins", M("Ghee/1Liter Ghee Mockup.jpeg")),
        ("label", P("Ghee/SASTRA GHEE-1 LT (NEW 32X14.9).pdf", 1)),
    ],
    "sastra-pure-cow-ghee-16l": [
        ("tub", M("Ghee/16L Ghee Mockup.jpeg")),
        ("label", P("Ghee/SASTRA GHEE-16LTS (NEW).pdf", 1)),
    ],
    # flours
    "mithra-popped-ragi-flour-1lb": [
        ("front", M(f"{BP}/Popped Ragi Flour Mockup.jpeg", (0.47, 0.04, 0.93, 0.96))),
        ("pouches", M(f"{BP}/Popped Ragi Flour Mockup.jpeg")),
        ("label", P(f"{BP}/Popped Ragi Flour.pdf", 1)),
    ],
    "mithra-nendran-raw-banana-powder-200g": [
        ("front", M(f"{BP}/Raw Banana Mockup.jpeg", (0.47, 0.04, 0.93, 0.96))),
        ("pouches", M(f"{BP}/Raw Banana Mockup.jpeg")),
        ("label", P(f"{BP}/Nendran Raw Powder.pdf", 1)),
    ],
    # health mixes
    "mithra-multigrain-health-mix-200g": [
        ("front", M("Multigrain Drink Mix/Multigrain Mockup.jpeg", (0.0, 0.04, 0.62, 0.97))),
        ("pouches", M("Multigrain Drink Mix/Multigrain Mockup.jpeg")),
        ("label", P("Multigrain Drink Mix/HEALTH MIX-FRONT.pdf", 1)),
        ("back", P("Multigrain Drink Mix/HEALTH MIX-BACK.pdf", 1)),
    ],
    "mithra-paruthi-paal-mix-200g": [("label", P("4X4_Mithra_Paruthi Paal Mix.pdf", 1, trim=False))],
    "mithra-palmyra-sprouts-powder-200g": [
        ("front", P("Palmyra.pdf", 1, trim=False)),
        ("back", P("Palmyra.pdf", 2, trim=False)),
    ],
    # podis
    "mithra-idli-podi-200g": [
        ("front", M("Podis/Idly Podi Mockup.jpeg", (0.205, 0.06, 0.795, 0.94))),
        ("jars", M("Podis/Idly Podi Mockup.jpeg")),
        ("label", P(PODI, 1)),
    ],
    "mithra-paruppu-podi-200g": [
        ("front", M("Podis/Paruppu Podi mockup.jpeg", (0.205, 0.06, 0.795, 0.94))),
        ("jars", M("Podis/Paruppu Podi mockup.jpeg")),
        ("label", P(PODI, 2)),
    ],
    "mithra-sesame-podi-200g": [
        ("front", M("Podis/Sesame Podi Mockup.jpeg", (0.205, 0.06, 0.795, 0.94))),
        ("jars", M("Podis/Sesame Podi Mockup.jpeg")),
        ("label", P(PODI, 3)),
    ],
    # rice
    "mithra-rajabogam-ponni-boiled-rice": rice(1),
    "mithra-bangaru-theegalu-sona-masoori-rice": rice(2),
    "mithra-mullai-idli-rice": rice(3),
    "mithra-malligai-ir20-rice": rice(4),
    "mithra-marutham-seeraga-samba-rice": rice(5),
    "mithra-neithal-hand-pound-ponni-rice": rice(6),
    # millets (front page, back page)
    "little-millet-unpolished-2lbs": millet(1, 1, [("front-alt", P(MF, 8, trim=False))]),
    "finger-millet-unpolished-2lbs": millet(2, 5),
    "jowar-red-millet-2lbs": millet(3, 3),
    "foxtail-millet-unpolished-2lbs": millet(4, 6),
    "mithra-kodo-millet-2lbs": millet(5, 7),
    "barnyard-millet-unpolished-2lbs": millet(6, 4),
    # oils
    "wood-pressed-groundnut-oil": [("label", P(OIL, 1, trim=False))],
    "extra-virgin-sesame-oil-2l": [("label", P(OIL, 3, trim=False))],
    # jaggery, palm, chikki
    "mithra-pure-solid-jaggery-500g": [("front", P(JF, 7, trim=False)), ("back", P(JB, 2))],
    "jaggery-powder-raw-cane-sugar-2lbs": [("front", P(JF, 8, trim=False)), ("back", P(JB, 1))],
    "mithra-groundnut-chikki-200g": [("front", P(JF, 9, trim=False)), ("back", P(JB, 4))],
    "mithra-palm-jaggery-500g": [
        ("front", P("Palm Jaggery.pdf", 1, trim=False)),
        ("back", P("Palm Jaggery.pdf", 2, trim=False)),
    ],
    # traditional treats
    "mithra-elantha-vadai-100g": [("label", P("4X4_Mithra_Elantha Vadai.pdf", 1, trim=False))],
    "mithra-kamarkattu": [("label", P("4X4_Mithra_Kamarkat.pdf", 1, trim=False))],
    # snacks (front p1-5, back p6-10)
    "mithra-mixture-200g": [("front", P(SN, 1, trim=False)), ("back", P(SN, 6, trim=False))],
    "mithra-kai-muruku-200g": [("front", P(SN, 2, trim=False)), ("back", P(SN, 7, trim=False))],
    "mithra-pepper-kara-sev-200g": [("front", P(SN, 3, trim=False)), ("back", P(SN, 8, trim=False))],
    "mithra-manaparai-muruku-200g": [("front", P(SN, 4, trim=False)), ("back", P(SN, 9, trim=False))],
    "mithra-kara-boondi-200g": [("front", P(SN, 5, trim=False)), ("back", P(SN, 10, trim=False))],
}

if __name__ == "__main__":
    only = set(sys.argv[3:])
    manifest = {}
    for handle, items in PLAN.items():
        if only and handle not in only:
            continue
        os.makedirs(f"{OUT}/{handle}", exist_ok=True)
        files = []
        for i, (slug, src) in enumerate(items, 1):
            name = f"{i:02d}-{slug}.jpg"
            square(src()).save(f"{OUT}/{handle}/{name}", quality=88, optimize=True)
            files.append(name)
        manifest[handle] = files
        print(handle, files)
    mp = f"{OUT}/manifest.json"
    if only and os.path.exists(mp):
        manifest = {**json.load(open(mp)), **manifest}
    json.dump(manifest, open(mp, "w"), indent=1)
