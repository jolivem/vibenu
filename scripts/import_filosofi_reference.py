#!/usr/bin/env python3
"""
Importe le revenu médian et le taux de pauvreté publiés par l'INSEE pour chaque commune, chaque
arrondissement municipal et la France métropolitaine (Filosofi 2021).

Source : « Revenus, pauvreté et niveau de vie en 2021 — Base niveau communes »,
https://www.insee.fr/fr/statistiques/7756729, fichier base-cc-filosofi-2021-geo2025_csv.zip.
Un CSV au format long (GEO ; GEO_OBJECT ; FILOSOFI_MEASURE ; … ; OBS_VALUE) : on garde
MED_SL (médiane du niveau de vie) et PR_MD60 (taux de pauvreté au seuil de 60 %), pour les
objets COM, ARM et FRANCE.

Ces valeurs remplacent, dans les repères commune et France, la moyenne des IRIS que calculait
`insee_aggregate` : voir la migration 027.

Usage :
    python import_filosofi_reference.py
    python import_filosofi_reference.py --file base-cc-filosofi-2021-geo2025_csv.zip

Pré-requis : migration 027-filosofi-reference.sql appliquée.
Environnement : POSTGRES_URL
"""

import argparse
import csv
import io
import os
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

URL = "https://www.insee.fr/fr/statistiques/fichier/7756729/base-cc-filosofi-2021-geo2025_csv.zip"
ANNEE = 2021
DATA = "DS_FILOSOFI_CC_data.csv"
NIVEAUX = {"COM": "COM", "ARM": "ARM", "FRANCE": "FRANCE"}
MESURES = {"MED_SL": "revenu_median", "PR_MD60": "taux_pauvrete"}
DATA_DIR = Path(__file__).parent / "data" / "insee"


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
    print(f"  téléchargement de {dest.name}…")
    r = requests.get(URL, timeout=600, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def read(path: Path) -> list[tuple]:
    values: dict[tuple[str, str], dict[str, float]] = defaultdict(dict)
    with zipfile.ZipFile(path) as z, z.open(DATA) as fh:
        for row in csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8"), delimiter=";"):
            niveau = NIVEAUX.get(row["GEO_OBJECT"])
            mesure = MESURES.get(row["FILOSOFI_MEASURE"])
            if not niveau or not mesure or str(row["TIME_PERIOD"]) != str(ANNEE):
                continue
            code = "FRANCE" if niveau == "FRANCE" else row["GEO"]
            if niveau == "FRANCE" and row["GEO"] != "FM":
                continue  # France métropolitaine seulement
            try:
                values[(code, niveau)][mesure] = float(row["OBS_VALUE"])
            except (TypeError, ValueError):
                pass  # secret statistique : la valeur reste absente
    return [(code, niveau, ANNEE, v.get("revenu_median"), v.get("taux_pauvrete")) for (code, niveau), v in values.items()]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--file", type=Path)
    args = parser.parse_args()
    rows = read(args.file or download(DATA_DIR / "base-cc-filosofi-2021-geo2025_csv.zip"))
    if not any(r[0] == "FRANCE" for r in rows):
        print("Error: ligne France métropolitaine absente du fichier.", file=sys.stderr)
        sys.exit(1)
    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("DELETE FROM filosofi_reference")
            execute_values(cur, """
                INSERT INTO filosofi_reference (code, niveau, annee, revenu_median, taux_pauvrete) VALUES %s
            """, rows)
    finally:
        conn.close()
    france = next(r for r in rows if r[0] == "FRANCE")
    print(f"Table filosofi_reference : {len(rows):,} lignes ; France métropolitaine {france[3]:.0f} € · {france[4]} %")


if __name__ == "__main__":
    main()
