#!/usr/bin/env python3
"""
Importe les loyers d'annonce par commune (« Carte des loyers ») et reconstruit les contours
simplifiés des communes, dans PostgreSQL.

Source : https://www.data.gouv.fr/datasets/693aa2feed1bf4da603faa49/ — ANIL et ministère du
Logement (DHUP), Licence Ouverte 2.0. Quatre CSV par édition (point-virgule, Latin-1,
virgule décimale), une ligne par commune :

  - app     appartements, tous types       pred-app-mef-dhup.csv
  - app12   appartements de 1 ou 2 pièces  pred-app12-mef-dhup.csv
  - app3    appartements de 3 pièces et +  pred-app3-mef-dhup.csv
  - maison  maisons                        pred-mai-mef-dhup.csv

Une nouvelle édition paraît chaque décembre sous un nouveau jeu de données : mettre à jour
ANNEE et FILES ci-dessous, puis relancer. Les éditions ne se comparent pas entre elles
(méthode et maillage changent) : on ne garde que la dernière pour l'affichage.

Le script reconstruit aussi la table `commune_shape` (contours des communes) à partir des
IRIS déjà importés : lancer import_iris.py d'abord.

Usage :
    python import_rents.py
    python import_rents.py --skip-shapes        # loyers seulement

Pré-requis : migration 023-rents.sql appliquée, table iris_demographics remplie.
Environnement : POSTGRES_URL
"""

import argparse
import csv
import os
import re
import sys
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

ANNEE = 2025
BASE = "https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025"
FILES = {
    "app": f"{BASE}/20251211-145010/pred-app-mef-dhup.csv",
    "app12": f"{BASE}/20251211-144934/pred-app12-mef-dhup.csv",
    "app3": f"{BASE}/20251211-144951/pred-app3-mef-dhup.csv",
    "maison": f"{BASE}/20251211-145039/pred-mai-mef-dhup.csv",
}
NIVEAUX = {"commune": "commune", "maille": "maille", "EPCI": "epci"}

DATA_DIR = Path(__file__).parent / "data" / "rents"
INSEE_RE = re.compile(r"^(\d{2}|2[AB])\d{3}$")

# Tolérance de simplification des contours, en degrés (~50 m) : assez fin pour une carte au
# 1:100 000, assez grossier pour que 35 000 communes tiennent en quelques dizaines de Mo.
SIMPLIFY_TOLERANCE = 0.0005


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def download(url: str, dest: Path) -> Path:
    if dest.exists():
        print(f"  déjà présent : {dest.name}")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  téléchargement de {dest.name}…")
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    return dest


def to_float(value: str | None) -> float | None:
    if value is None or value.strip() in ("", "NA"):
        return None
    return float(value.replace(",", "."))


def read_rents(type_bien: str, path: Path) -> tuple[list[tuple], int]:
    rows: list[tuple] = []
    rejected = 0
    with open(path, "r", encoding="latin-1", newline="") as f:
        for r in csv.DictReader(f, delimiter=";"):
            code = (r.get("INSEE_C") or "").strip()
            loyer = to_float(r.get("loypredm2"))
            niveau = NIVEAUX.get((r.get("TYPPRED") or "").strip())
            if not INSEE_RE.match(code) or loyer is None or niveau is None:
                rejected += 1
                continue
            rows.append((
                code, (r.get("LIBGEO") or "").strip() or None, ANNEE, type_bien,
                round(loyer, 2),
                round(v, 2) if (v := to_float(r.get("lwr.IPm2"))) is not None else None,
                round(v, 2) if (v := to_float(r.get("upr.IPm2"))) is not None else None,
                niveau,
                int(r.get("nbobs_com") or 0),
                round(v, 3) if (v := to_float(r.get("R2_adj"))) is not None else None,
            ))
    return rows, rejected


def import_rents(conn) -> None:
    all_rows: list[tuple] = []
    for type_bien, url in FILES.items():
        path = download(url, DATA_DIR / f"{ANNEE}-{type_bien}.csv")
        rows, rejected = read_rents(type_bien, path)
        print(f"  {type_bien} : {len(rows)} communes" + (f", {rejected} lignes rejetées" if rejected else ""))
        all_rows.extend(rows)

    # Une seule transaction : l'édition est remplacée d'un bloc, ou pas du tout.
    with conn.cursor() as cur:
        cur.execute("DELETE FROM rent_commune WHERE annee = %s", (ANNEE,))
        execute_values(
            cur,
            """
            INSERT INTO rent_commune
              (code_commune, nom, annee, type_bien, loyer_m2, ic_bas, ic_haut, niveau, nb_annonces, r2)
            VALUES %s
            """,
            all_rows,
            page_size=5000,
        )
    conn.commit()
    print(f"{len(all_rows)} lignes de loyers écrites ({ANNEE}).")


def rebuild_shapes(conn) -> None:
    print("Reconstruction des contours de communes à partir des IRIS…")
    with conn.cursor() as cur:
        cur.execute("TRUNCATE commune_shape")
        cur.execute(
            """
            INSERT INTO commune_shape (code_commune, nom, geom)
            SELECT LEFT(code_iris, 5),
                   min(nom_commune),
                   ST_Multi(ST_CollectionExtract(
                     ST_SimplifyPreserveTopology(ST_Union(geom), %s), 3))
              FROM iris_demographics
             WHERE geom IS NOT NULL
             GROUP BY 1
            """,
            (SIMPLIFY_TOLERANCE,),
        )
        cur.execute("SELECT count(*) FROM commune_shape")
        n = cur.fetchone()[0]
    conn.commit()
    print(f"{n} contours de communes écrits.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import des loyers d'annonce par commune.")
    parser.add_argument("--skip-shapes", action="store_true", help="ne pas reconstruire commune_shape")
    args = parser.parse_args()

    conn = get_connection()
    try:
        import_rents(conn)
        if not args.skip_shapes:
            rebuild_shapes(conn)
    finally:
        conn.close()
    print("Terminé.")


if __name__ == "__main__":
    main()
