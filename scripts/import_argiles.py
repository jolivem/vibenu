#!/usr/bin/env python3
"""
Importe la carte d'exposition au retrait-gonflement des argiles 2026 (BRGM / Géorisques) dans
`argiles_exposition`.

Source : https://files.georisques.fr/argiles/2025/AleaRG_2025_Fxx_L93.zip (≈ 440 Mo, Shapefile
en Lambert 93, Licence Ouverte), carte de l'arrêté du 9/01/2026, en vigueur au 1/07/2026.
Champs repris : `niveau` (1 faible, 2 moyen, 3 fort) et `insee_dep`. La ville de Paris n'est
pas couverte.

PostGIS reprojette en WGS84 et simplifie à 10 m : la carte est établie au 1/50 000, sa
précision est de l'ordre de 25 m. La table est vidée puis remplie dans une transaction.

À relancer à chaque nouvelle édition de la carte (aucune n'est annoncée).

Usage :
    python import_argiles.py
    python import_argiles.py --file AleaRG_2025_Fxx_L93.zip

Pré-requis : migration 028-georisques-local.sql appliquée ; paquet `pyshp`.
Environnement : POSTGRES_URL
"""

import argparse
import json
import os
import sys
import zipfile
from pathlib import Path

import psycopg2
import requests
import shapefile  # pyshp
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

URL = "https://files.georisques.fr/argiles/2025/AleaRG_2025_Fxx_L93.zip"
EDITION = "AleaRG_2025_Fxx_L93"
DATA_DIR = Path(__file__).parent / "data" / "georisques"
BATCH = 500
SIMPLIFY_M = 10


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def download(dest: Path) -> Path:
    if dest.exists():
        print(f"  déjà présent : {dest.name}")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  téléchargement de {URL} (≈ 440 Mo)…")
    with requests.get(URL, timeout=1800, stream=True) as r:
        r.raise_for_status()
        with open(dest, "wb") as fh:
            for chunk in r.iter_content(1 << 20):
                fh.write(chunk)
    return dest


def extract(archive: Path) -> Path:
    out = archive.parent / EDITION
    with zipfile.ZipFile(archive) as z:
        if f"{EDITION}.shp" not in z.namelist():
            print(f"Error: {EDITION}.shp absent de l'archive ({z.namelist()}).", file=sys.stderr)
            sys.exit(1)
        z.extractall(out)
    return out / EDITION


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--file", type=Path, help="archive déjà téléchargée")
    args = parser.parse_args()
    base = extract(args.file or download(DATA_DIR / f"{EDITION}.zip"))

    reader = shapefile.Reader(str(base))
    fields = [f.name for f in reader.fields[1:]]
    if not {"niveau", "insee_dep"} <= set(fields):
        print(f"Error: champs inattendus : {fields}", file=sys.stderr)
        sys.exit(1)
    i_niveau, i_dep = fields.index("niveau"), fields.index("insee_dep")

    conn = get_connection()
    total = 0
    try:
        with conn, conn.cursor() as cur:
            cur.execute("DELETE FROM argiles_exposition")
            batch = []
            for sr in reader.iterShapeRecords():
                niveau = int(sr.record[i_niveau])
                if niveau not in (1, 2, 3):
                    print(f"Error: niveau inattendu {sr.record[i_niveau]!r}", file=sys.stderr)
                    sys.exit(1)
                batch.append((niveau, str(sr.record[i_dep]).strip(), json.dumps(sr.shape.__geo_interface__)))
                if len(batch) >= BATCH:
                    total += insert(cur, batch)
                    batch = []
                    print(f"\r  {total:,} zones", end="", flush=True)
            total += insert(cur, batch)
            cur.execute("""
                INSERT INTO georisques_import (jeu, fichier, date_fichier, date_donnees)
                VALUES ('argiles', %s, NULL, DATE '2026-07-01')
                ON CONFLICT (jeu) DO UPDATE SET fichier = EXCLUDED.fichier, date_fichier = EXCLUDED.date_fichier,
                  date_donnees = EXCLUDED.date_donnees, imported_at = NOW()
            """, (f"{EDITION}.zip",))
    finally:
        conn.close()
    print(f"\nargiles_exposition : {total:,} zones")


def insert(cur, batch: list[tuple]) -> int:
    if not batch:
        return 0
    # Simplifier en Lambert 93 (mètres), puis rendre valide et reprojeter.
    execute_values(cur, f"""
        INSERT INTO argiles_exposition (niveau, insee_dep, geom)
        SELECT niveau, dep, ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Transform(
                 ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON(g), 2154), {SIMPLIFY_M}), 4326)), 3))
          FROM (VALUES %s) AS v(niveau, dep, g)
    """, batch, template="(%s::smallint, %s, %s)")
    return len(batch)


if __name__ == "__main__":
    main()
