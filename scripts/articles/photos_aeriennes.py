"""
Article « Voir sa rue il y a 70 ans : photos aériennes et cartes anciennes de l'IGN ».

Pas de base de données : les époques sont celles de la card « Le lieu autrefois »
(`components/map/historicalLayers.ts`, textes dans `i18n/messages/fr/map.ts`), écrites ici
dans `data.json` pour que le contrôle retrouve les dates citées par le texte.

Le script fabrique aussi les captures avant / après : une mosaïque de tuiles WMTS de la
Géoplateforme (publiques, sans clé) pour chaque lieu et chaque époque, photographiée par
Chromium headless, écrite dans `frontend/public/articles/<slug>/`.

    python scripts/articles/photos_aeriennes.py
"""

import math
import subprocess
import tempfile
from pathlib import Path

from common import ARTICLES_DIR, ROOT, write_snapshot

SLUG = "voir-sa-rue-il-y-a-70-ans-photos-aeriennes"
PUBLIC = ROOT / "frontend" / "public" / "articles" / SLUG
CHROME = Path.home() / ".cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"
ZOOM = 15
COLONNES, LIGNES = 3, 2
TUILE = 256

# Mêmes couches que la card (historicalLayers.ts) ; « aujourd'hui » est le fond de la card.
COUCHES = {
    "1950": ("ORTHOIMAGERY.ORTHOPHOTOS.1950-1965", "normal", "image/png"),
    "aujourdhui": ("ORTHOIMAGERY.ORTHOPHOTOS", "normal", "image/jpeg"),
}

EPOQUES = [
    {"id": "cassini", "nom": "Carte de Cassini", "debut": 1750, "fin": None, "environ": True},
    {"id": "etat-major", "nom": "Carte de l'état-major", "debut": 1820, "fin": 1866, "environ": False},
    {"id": "scan50-1950", "nom": "Carte de 1950", "debut": 1950, "fin": None, "environ": True},
    {"id": "ortho-1950-1965", "nom": "Photographies aériennes", "debut": 1950, "fin": 1965, "environ": False},
    {"id": "ortho-1965-1980", "nom": "Photographies aériennes", "debut": 1965, "fin": 1980, "environ": False},
    {"id": "ortho-2000-2005", "nom": "Photographies aériennes", "debut": 2000, "fin": 2005, "environ": False},
]

LIEUX = [
    {"id": "la-defense", "nom": "La Défense", "precision": "Puteaux et Courbevoie (Hauts-de-Seine)", "lon": 2.2361, "lat": 48.8925},
    {"id": "cergy", "nom": "Cergy", "precision": "ville nouvelle (Val-d'Oise)", "lon": 2.0786, "lat": 49.0365},
]


def tuile(lon, lat, z):
    n = 2 ** z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    return x, y


def url(couche, x, y):
    layer, style, fmt = COUCHES[couche]
    return (
        "https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile"
        f"&LAYER={layer}&STYLE={style}&TILEMATRIXSET=PM&TILEMATRIX={ZOOM}&TILEROW={y}&TILECOL={x}&FORMAT={fmt}"
    )


def capture(lieu, couche, sortie):
    cx, cy = tuile(lieu["lon"], lieu["lat"], ZOOM)
    x0, y0 = cx - COLONNES // 2, cy - LIGNES // 2
    imgs = "".join(
        f'<img src="{url(couche, x0 + i, y0 + j)}" width="{TUILE}" height="{TUILE}">'
        for j in range(LIGNES)
        for i in range(COLONNES)
    )
    html = (
        "<!DOCTYPE html><html><body style='margin:0'>"
        f"<div style='display:grid;grid-template-columns:repeat({COLONNES},{TUILE}px);line-height:0'>{imgs}</div>"
        "</body></html>"
    )
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "mosaique.html"
        page.write_text(html, encoding="utf-8")
        subprocess.run(
            [str(CHROME), "--no-sandbox", "--hide-scrollbars", "--virtual-time-budget=15000",
             f"--window-size={COLONNES * TUILE},{LIGNES * TUILE}", f"--screenshot={sortie}", page.as_uri()],
            check=True, capture_output=True,
        )


# `sharp` arrive avec Next.js (optimisation d'images) : on s'en sert pour passer les captures
# en JPEG, quatre fois plus légères que le PNG de Chromium.
SHARP = ROOT / "node_modules" / ".pnpm" / "node_modules" / "sharp"


def en_jpeg(png, jpeg):
    script = (
        f"require({str(SHARP)!r})({str(png)!r}).jpeg({{quality: 80, mozjpeg: true}})"
        f".toFile({str(jpeg)!r}).catch(e => {{ console.error(e); process.exit(1); }})"
    )
    subprocess.run(["node", "-e", script], check=True)
    png.unlink()


def main():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    lieux = []
    for lieu in LIEUX:
        fichiers = {}
        for couche in COUCHES:
            nom = f"{lieu['id']}-{couche}.jpg"
            png = PUBLIC / f"{lieu['id']}-{couche}.png"
            capture(lieu, couche, png)
            en_jpeg(png, PUBLIC / nom)
            fichiers[couche] = f"/articles/{SLUG}/{nom}"
            print(f"→ {(PUBLIC / nom).relative_to(ROOT)}")
        lieux.append({**{k: lieu[k] for k in ("id", "nom", "precision")}, "images": fichiers})

    write_snapshot(SLUG, {
        "epoques": EPOQUES,
        "nbEpoques": len(EPOQUES),
        # « Il y a 70 ans » (titre) : les photographies de 1950-1965 ont de 60 à 75 ans.
        "ilYaAns": 70,
        "lieux": lieux,
        "capture": {"zoom": ZOOM, "largeur": COLONNES * TUILE, "hauteur": LIGNES * TUILE},
    })


if __name__ == "__main__":
    main()
