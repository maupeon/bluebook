"""
Lazy Dog (Paul Neave, 2001, SIL OFL) trae sólo ASCII: ni una vocal acentuada
ni la ñ. Este script le agrega las letras del español armadas con sus propios
trazos, para que una frase como «Adiós» no salga con la ó en otra letra:

- acento agudo: el apóstrofo de la fuente, girado 38° y reducido
- tilde de la ñ: la «s» de la fuente, girada 90° y aplastada (una s acostada
  es una onda: conserva el temblor de la mano)
- diéresis: dos puntos de la fuente
- ¿ ¡: el ? y el ! girados 180°
- í: una «i» sin su punto (el contorno más alto se quita)
- comillas tipográficas, rayas y punto medio a partir de sus equivalentes

La OFL permite modificar y redistribuir; la versión modificada se renombra
«Lazy Dog BB» para no confundirla con la original.
"""
import math
import sys
from copy import deepcopy

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import GlyphComponent

src, out = sys.argv[1], sys.argv[2]
f = TTFont(src)
glyf, hmtx = f["glyf"], f["hmtx"]
gs = f.getGlyphSet()
NUEVOS = {}  # nombre -> (Glyph, avance)


def caja(g):
    g.recalcBounds(glyf)
    return g.xMin, g.yMin, g.xMax, g.yMax


def glifo(nombre):
    return NUEVOS[nombre][0] if nombre in NUEVOS else glyf[nombre]


def dibujar(base, matriz):
    """Glifo simple: el contorno de `base` transformado por (a, b, c, d, e, f)."""
    pen = TTGlyphPen(gs)
    rec = DecomposingRecordingPen(gs)
    gs[base].draw(rec)
    rec.replay(TransformPen(pen, matriz))
    return pen.glyph()


def al_origen(g):
    """Deja el centro del borde inferior del glifo en (0, 0)."""
    x0, y0, x1, y1 = caja(g)
    dx, dy = -round((x0 + x1) / 2), -round(y0)
    coords = g.coordinates
    for k in range(len(coords)):
        x, y = coords[k]
        coords[k] = (x + dx, y + dy)
    caja(g)
    return g


def rot(grados, sx=1.0, sy=1.0):
    r = math.radians(grados)
    c, s_ = math.cos(r), math.sin(r)
    # x' = a x + c y + e ; y' = b x + d y + f
    return (c * sx, s_ * sy, -s_ * sx, c * sy, 0, 0)


def onda(ancho, amplitud, grosor, muestras=28):
    """La tilde: una onda con el grosor del trazo de la fuente y puntas redondas.
    Sube un poco hacia la derecha, como la hace la mano."""
    import math as m
    centro = []
    for k in range(muestras + 1):
        t = k / muestras
        x = t * ancho
        y = amplitud * m.sin(2 * m.pi * t) + 0.12 * x
        centro.append((x, y))
    r = grosor / 2
    izq, der = [], []
    for k, (x, y) in enumerate(centro):
        xa, ya = centro[max(k - 1, 0)]
        xb, yb = centro[min(k + 1, muestras)]
        dx, dy = xb - xa, yb - ya
        L = m.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        izq.append((x + nx * r, y + ny * r))
        der.append((x - nx * r, y - ny * r))

    def tapa(cx, cy, dx, dy, lado):
        L = m.hypot(dx, dy) or 1
        a0 = m.atan2(dy / L, dx / L)
        pts = []
        for j in range(1, 8):
            a = a0 + lado * (m.pi / 2 - j * m.pi / 8)
            pts.append((cx + r * m.cos(a), cy + r * m.sin(a)))
        return pts

    (x0, y0), (x1, y1) = centro[0], centro[1]
    (xn, yn), (xm, ym) = centro[-1], centro[-2]
    contorno = izq + tapa(xn, yn, xn - xm, yn - ym, -1) + der[::-1] + tapa(x0, y0, x0 - x1, y0 - y1, -1)
    pen = TTGlyphPen(gs)
    pen.moveTo(tuple(round(v) for v in contorno[0]))
    for pt in contorno[1:]:
        pen.lineTo(tuple(round(v) for v in pt))
    pen.closePath()
    return pen.glyph()


# --- Marcas (sin avance: se colocan sobre la letra base) ---
NUEVOS["acute.lzd"] = (al_origen(dibujar("quotesingle", rot(-38, 0.78, 0.78))), 0)
NUEVOS["tilde.lzd"] = (al_origen(onda(ancho=250, amplitud=34, grosor=66)), 0)
pen = TTGlyphPen(gs)
px0, py0, px1, py1 = caja(glyf["period"])
for dx in (-62, 62):
    rec = DecomposingRecordingPen(gs)
    gs["period"].draw(rec)
    rec.replay(TransformPen(pen, (0.8, 0, 0, 0.8, dx - (px0 + px1) / 2 * 0.8, -py0 * 0.8)))
NUEVOS["dieresis.lzd"] = (al_origen(pen.glyph()), 0)

# --- i sin punto: la i sin su contorno más alto ---
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
coords, ends, flags = glyf["i"].getCoordinates(glyf)
contornos, start = [], 0
for e in ends:
    contornos.append(list(range(start, e + 1)))
    start = e + 1
punto = max(contornos, key=lambda idx: min(coords[k][1] for k in idx))
quedan = [c for c in contornos if c is not punto]
g = Glyph()
g.numberOfContours = len(quedan)
g.coordinates = GlyphCoordinates([coords[k] for c in quedan for k in c])
g.flags = bytearray([flags[k] for c in quedan for k in c])
g.endPtsOfContours, n = [], 0
for c in quedan:
    n += len(c)
    g.endPtsOfContours.append(n - 1)
g.program = deepcopy(glyf["i"].program)
caja(g)
NUEVOS["dotlessi"] = (g, hmtx["i"][0])

# --- ¿ ¡ girados; rayas y punto medio ---
x_alto = caja(glyf["x"])[3]
base_y = caja(glyf["x"])[1]
for nombre, base in (("questiondown", "question"), ("exclamdown", "exclam")):
    x0, y0, x1, y1 = caja(glyf[base])
    tope = x_alto + 70
    NUEVOS[nombre] = (dibujar(base, (-1, 0, 0, -1, x0 + x1, tope + y0)), hmtx[base][0])
hx0 = caja(glyf["hyphen"])[0]
NUEVOS["endash"] = (dibujar("hyphen", (1.25, 0, 0, 1, -hx0 * 0.25, 0)), round(hmtx["hyphen"][0] * 1.2))
NUEVOS["emdash"] = (dibujar("hyphen", (1.9, 0, 0, 1, -hx0 * 0.9, 0)), round(hmtx["hyphen"][0] * 1.75))
NUEVOS["periodcentered"] = (dibujar("period", (1, 0, 0, 1, 0, round((base_y + x_alto) / 2 - (py0 + py1) / 2))), hmtx["period"][0])


# --- Letras compuestas: base + marca centrada sobre la base ---
def compuesta(nombre, base, marca, hueco=38, escala=1.0):
    x0, y0, x1, y1 = caja(glifo(base))
    cx = round((x0 + x1) / 2)
    g = Glyph()
    g.numberOfContours = -1
    c1 = GlyphComponent()
    c1.glyphName, c1.x, c1.y, c1.flags = base, 0, 0, 0x4
    c2 = GlyphComponent()
    c2.glyphName, c2.x, c2.y, c2.flags = marca, cx, round(y1 + hueco), 0x4
    if escala != 1.0:
        c2.transform = [[escala, 0], [0, escala]]
    g.components = [c1, c2]
    avance = NUEVOS[base][1] if base in NUEVOS else hmtx[base][0]
    NUEVOS[nombre] = (g, avance)


for v in "aeou":
    compuesta(v + "acute", v, "acute.lzd")
compuesta("iacute", "dotlessi", "acute.lzd")
for v in "AEIOU":
    compuesta(v + "acute", v, "acute.lzd", hueco=26, escala=0.85)
compuesta("ntilde", "n", "tilde.lzd", hueco=46)
compuesta("Ntilde", "N", "tilde.lzd", hueco=30, escala=0.9)
compuesta("udieresis", "u", "dieresis.lzd", hueco=50)
compuesta("Udieresis", "U", "dieresis.lzd", hueco=34, escala=0.9)

# Registrar todo de una vez: orden de glifos, glyf y hmtx.
orden = f.getGlyphOrder() + [n for n in NUEVOS if n not in f.getGlyphOrder()]
f.setGlyphOrder(orden)
glyf.glyphOrder = orden
for nombre, (g, avance) in NUEVOS.items():
    glyf.glyphs[nombre] = g
for nombre, (g, avance) in NUEVOS.items():
    g.recalcBounds(glyf)
    hmtx[nombre] = (avance, g.xMin if g.numberOfContours else 0)

# --- cmap ---
nuevos = {
    0xE1: "aacute", 0xE9: "eacute", 0xED: "iacute", 0xF3: "oacute", 0xFA: "uacute",
    0xC1: "Aacute", 0xC9: "Eacute", 0xCD: "Iacute", 0xD3: "Oacute", 0xDA: "Uacute",
    0xF1: "ntilde", 0xD1: "Ntilde", 0xFC: "udieresis", 0xDC: "Udieresis",
    0xBF: "questiondown", 0xA1: "exclamdown", 0x2013: "endash", 0x2014: "emdash",
    0xB7: "periodcentered", 0x0131: "dotlessi",
    0x2018: "quotesingle", 0x2019: "quotesingle", 0x201C: "quotedbl", 0x201D: "quotedbl",
}
for t in f["cmap"].tables:
    if t.isUnicode():
        t.cmap.update(nuevos)

# --- nombre: versión modificada ---
for r in f["name"].names:
    if r.nameID in (1, 4, 16):
        r.string = "Lazy Dog BB"
    elif r.nameID == 6:
        r.string = "LazyDogBB-Regular"
    elif r.nameID == 5:
        r.string = "Version 1.1; July 2001 - Freeware; acentos del espanol agregados para Blue Book, 2026"
f["post"].formatType = 2.0
f.flavor = "woff2" if out.endswith(".woff2") else None
f.save(out)
print("ok:", out, len(f.getGlyphOrder()), "glifos")
