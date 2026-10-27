#!/usr/bin/env python3
"""
Importe le zonage « zone tendue » de chaque commune dans PostgreSQL.

Source : « Liste des communes selon le zonage TLV », ministère de la Transition écologique,
https://www.data.gouv.fr/datasets/657c88da2947e13be0597058/ — Licence Ouverte.
Un CSV (UTF-8, point-virgule, une ligne par commune, clé CODGEO25). On lit la colonne du
dernier décret, « Zonage TLV post décret 22/12/2025 » :

  « 1. Zone tendue »                   → 'tendue'
  « 2. Zone touristique et tendue »    → 'touristique'
  « 3. Non tendue »                    → 'non'

Au prochain décret : mettre à jour URL, COLONNE et DECRET ci-dessous, puis relancer. Le
script remplace toute la table.

Usage :
    python import_zone_tendue.py
    python import_zone_tendue.py --file zonage.csv    # fichier déjà téléchargé

Pré-requis : migration 026-zone-tendue.sql appliquée.
Environnement : POSTGRES_URL
"""

import argparse
import collections
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

URL = (
    "https://static.data.gouv.fr/resources/liste-des-communes-selon-le-zonage-tlv-1/"
    "20251230-094759/zonage-tlv-decret-22-dec-2025.csv"
)
COLONNE = "Zonage TLV post décret 22/12/2025"
DECRET = "2025-12-22"
ZONAGES = {"1": "tendue", "2": "touristique", "3": "non"}

DATA_DIR = Path(__file__).parent / "data" / "zone-tendue"
INSEE_RE = re.compile(r"^(\d{2}|2[AB])\d{3}$")


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
    r = requests.get(URL, timeout=300)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def read_rows(path: Path) -> list[tuple[str, str, str]]:
    rows = []
    rejets = 0
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        if COLONNE not in (reader.fieldnames or []):
            print(f"Error: colonne « {COLONNE} » absente ; colonnes : {reader.fieldnames}", file=sys.stderr)
            sys.exit(1)
        for row in reader:
            code = (row.get("CODGEO25") or "").strip()
            # « 1. Zone tendue » : le chiffre de tête porte la catégorie.
            zonage = ZONAGES.get((row.get(COLONNE) or "").strip()[:1])
            if not INSEE_RE.match(code) or zonage is None:
                rejets += 1
                continue
            rows.append((code, zonage, DECRET))
    if rejets:
        print(f"  lignes rejetées : {rejets}")
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--file", type=Path, help="csv du zonage (sinon téléchargé)")
    args = parser.parse_args()

    path = args.file or download(DATA_DIR / "zonage-tlv.csv")
    rows = read_rows(path)
    if not rows:
        print("Error: aucune ligne lue.", file=sys.stderr)
        sys.exit(1)

    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("DELETE FROM rent_zone_tendue")
            execute_values(cur, "INSERT INTO rent_zone_tendue (code_commune, zonage, decret) VALUES %s", rows)
    finally:
        conn.close()

    compte = collections.Counter(z for _, z, _ in rows)
    print(f"Table rent_zone_tendue : {len(rows):,} communes")
    for zonage in ZONAGES.values():
        print(f"  {zonage:<12} {compte[zonage]:,}")


if __name__ == "__main__":
    main()
