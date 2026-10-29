#!/usr/bin/env python3
"""
Importe les arrêtés de catastrophe naturelle de la base GASPAR (Géorisques) dans
`catnat_arrete` : une ligne par reconnaissance (arrêté × commune × péril × période).

Source : https://files.georisques.fr/GASPAR/gaspar.zip (≈ 8 Mo, Licence Ouverte), refait par
Géorisques au fil des publications au Journal officiel. Le fichier utile est
`catnat_gaspar_<date>.csv` (séparateur « ; »). La date du nom de fichier et la dernière date
de publication au JO sont inscrites dans `georisques_import`, pour les dire à l'écran.

Les dates sont publiées en UTC (« 1989-06-01 02:00:00 » pour le 1er juin) : on ramène
chacune à la date de Paris avant d'en garder le jour.

À relancer chaque mois.

Usage :
    python import_catnat.py
    python import_catnat.py --file gaspar.zip

Pré-requis : migration 028-georisques-local.sql appliquée.
Environnement : POSTGRES_URL
"""

import argparse
import csv
import io
import os
import re
import sys
import zipfile
from datetime import date, datetime, timedelta
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

URL = "https://files.georisques.fr/GASPAR/gaspar.zip"
DATA_DIR = Path(__file__).parent / "data" / "georisques"


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def download(dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  téléchargement de {URL}…")
    r = requests.get(URL, timeout=300)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def paris_day(value: str) -> date:
    """« 1989-06-01 02:00:00 » (UTC) → 1989-06-01. Trois heures couvrent l'heure d'été."""
    return (datetime.fromisoformat(value.strip()[:19]) + timedelta(hours=3)).date()


def read(path: Path) -> tuple[list[tuple], str, date | None]:
    with zipfile.ZipFile(path) as z:
        names = [n for n in z.namelist() if re.search(r"catnat_gaspar_.*\.csv$", n)]
        if len(names) != 1:
            # Adresse non documentée, format susceptible de changer : on échoue bruyamment.
            print(f"Error: fichier catnat introuvable dans l'archive ({z.namelist()}).", file=sys.stderr)
            sys.exit(1)
        name = names[0]
        m = re.search(r"(\d{4}-\d{2}-\d{2})", name)
        file_date = date.fromisoformat(m.group(1)) if m else None
        with z.open(name) as fh:
            reader = csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8", errors="replace"), delimiter=";")
            expected = {"id_gaspar", "code_commune", "num_risque_jo", "date_debut", "date_fin", "date_publication_jo"}
            if not expected <= set(reader.fieldnames or []):
                print(f"Error: colonnes inattendues : {reader.fieldnames}", file=sys.stderr)
                sys.exit(1)
            rows = {}
            for r in reader:
                key = (r["id_gaspar"].strip(), r["code_commune"].strip(), r["num_risque_jo"].strip(),
                       paris_day(r["date_debut"]), paris_day(r["date_fin"]))
                rows[key] = paris_day(r["date_publication_jo"])
    return [(*k, v) for k, v in rows.items()], name, file_date


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--file", type=Path, help="archive gaspar.zip déjà téléchargée")
    args = parser.parse_args()
    rows, name, file_date = read(args.file or download(DATA_DIR / "gaspar.zip"))
    if len(rows) < 100_000:
        print(f"Error: {len(rows)} lignes seulement, fichier tronqué ?", file=sys.stderr)
        sys.exit(1)
    last_jo = max(r[5] for r in rows)
    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("DELETE FROM catnat_arrete")
            execute_values(cur, """
                INSERT INTO catnat_arrete
                  (id_gaspar, code_commune, risque_code, date_debut, date_fin, date_publication_jo)
                VALUES %s
            """, rows, page_size=5000)
            cur.execute("""
                INSERT INTO georisques_import (jeu, fichier, date_fichier, date_donnees)
                VALUES ('catnat', %s, %s, %s)
                ON CONFLICT (jeu) DO UPDATE SET fichier = EXCLUDED.fichier, date_fichier = EXCLUDED.date_fichier,
                  date_donnees = EXCLUDED.date_donnees, imported_at = NOW()
            """, (name, file_date, last_jo))
    finally:
        conn.close()
    print(f"catnat_arrete : {len(rows):,} reconnaissances ; fichier du {file_date}, dernier JO le {last_jo}")


if __name__ == "__main__":
    main()
