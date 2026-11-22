"""
Outils partagés des scripts d'articles.

Chaque script calcule les chiffres d'un article et les fige dans
`frontend/src/content/articles/<slug>/data.json`. Le site ne lit jamais la base pour un
article : le build Docker se fait sans base, et un article publie des chiffres datés,
recalculés au millésime suivant.

Environnement : POSTGRES_URL (lu aussi depuis frontend/.env).
"""

import json
import os
import sys
from datetime import date
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
ARTICLES_DIR = ROOT / "frontend" / "src" / "content" / "articles"

load_dotenv()
load_dotenv(ROOT / "frontend" / ".env")


def connect():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Erreur : la variable POSTGRES_URL est requise.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def fetch(conn, sql, params=None):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def write_snapshot(slug, payload):
    """Écrit `data.json` : `generatedAt` d'abord, puis les champs propres à l'article."""
    out = ARTICLES_DIR / slug / "data.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    data = {"generatedAt": date.today().isoformat(), **payload}
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"→ {out.relative_to(ROOT)}")


# Noms des départements (COG INSEE) : absents de la base, utiles à plusieurs articles.
DEPARTEMENTS = {
    "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes",
    "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes", "09": "Ariège", "10": "Aube",
    "11": "Aude", "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal",
    "16": "Charente", "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud",
    "2B": "Haute-Corse", "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne",
    "25": "Doubs", "26": "Drôme", "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère", "30": "Gard",
    "31": "Haute-Garonne", "32": "Gers", "33": "Gironde", "34": "Hérault", "35": "Ille-et-Vilaine",
    "36": "Indre", "37": "Indre-et-Loire", "38": "Isère", "39": "Jura", "40": "Landes",
    "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique", "45": "Loiret",
    "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère", "49": "Maine-et-Loire", "50": "Manche",
    "51": "Marne", "52": "Haute-Marne", "53": "Mayenne", "54": "Meurthe-et-Moselle", "55": "Meuse",
    "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord", "60": "Oise", "61": "Orne",
    "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques", "65": "Hautes-Pyrénées",
    "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône", "70": "Haute-Saône",
    "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie", "75": "Paris",
    "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres", "80": "Somme",
    "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse", "85": "Vendée", "86": "Vienne",
    "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne", "90": "Territoire de Belfort", "91": "Essonne",
    "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d'Oise",
    "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte",
}

# Paris, Lyon et Marseille : les tables à la maille communale les portent sous leur code de
# ville, que `commune_shape` (par arrondissement) ne connaît pas.
VILLES_PLM = {"75056": "Paris", "69123": "Lyon", "13055": "Marseille"}


def departement(code_commune):
    """Code du département d'une commune : « 2A », « 974 » ou « 13 »."""
    return code_commune[:3] if code_commune.startswith("97") else code_commune[:2]


def noms_communes(conn):
    """Nom de chaque commune par code INSEE, villes de Paris, Lyon et Marseille comprises."""
    noms = {r["code_commune"]: r["nom"] for r in fetch(conn, "SELECT code_commune, nom FROM commune_shape")}
    noms.update(VILLES_PLM)
    return noms
