#!/usr/bin/env python3
"""
Import de l'indice ATMO annuel pour Paris dans PostgreSQL.

Source : opendata.paris.fr — dataset "qualite-de-l-air-indice-atmo"
URL : https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/qualite-de-l-air-indice-atmo/exports/json

Le fichier JSON contient, pour chaque année, le nombre de jours dans chacune
des 6 catégories de l'indice ATMO (Bon, Moyen, Dégradé, Mauvais, Très mauvais,
Extrêmement mauvais), agrégé pour Paris.

Pour rafraîchir : retélécharger le JSON dans scripts/data/ puis relancer ce script.

Usage:
    python import_atmo_paris.py

Environment:
    POSTGRES_URL - chaîne de connexion PostgreSQL
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DATA_FILE = Path(__file__).parent / "data" / "qualite-de-l-air-indice-atmo.json"
SOURCE_LABEL = "AirParif / opendata.paris.fr — indice ATMO annuel"


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def load_data():
    if not DATA_FILE.exists():
        print(f"Error: data file not found at {DATA_FILE}")
        sys.exit(1)
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def to_row(entry):
    return (
        int(entry["annee"]),
        int(entry.get("ind_jour_qa_bonne", 0)),
        int(entry.get("ind_jour_qa_moyenne", 0)),
        int(entry.get("ind_jour_qa_degradee", 0)),
        int(entry.get("ind_jour_qa_mauvaise", 0)),
        int(entry.get("ind_jour_qa_tres_mauvaise", 0)),
        int(entry.get("ind_jour_qa_extremement_mauvaise", 0)),
        SOURCE_LABEL,
    )


def insert(conn, data):
    rows = [to_row(e) for e in data]
    if not rows:
        print("No rows to insert.")
        return

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO air_quality_atmo_paris
                (annee, jours_bonne, jours_moyenne, jours_degradee,
                 jours_mauvaise, jours_tres_mauvaise, jours_extremement_mauvaise, source)
            VALUES %s
            ON CONFLICT (annee)
            DO UPDATE SET
                jours_bonne = EXCLUDED.jours_bonne,
                jours_moyenne = EXCLUDED.jours_moyenne,
                jours_degradee = EXCLUDED.jours_degradee,
                jours_mauvaise = EXCLUDED.jours_mauvaise,
                jours_tres_mauvaise = EXCLUDED.jours_tres_mauvaise,
                jours_extremement_mauvaise = EXCLUDED.jours_extremement_mauvaise,
                source = EXCLUDED.source
            """,
            rows,
        )
    conn.commit()
    print(f"Inserted/updated {len(rows)} year(s) in air_quality_atmo_paris.")


def print_stats(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT annee,
                   jours_bonne, jours_moyenne, jours_degradee,
                   jours_mauvaise, jours_tres_mauvaise, jours_extremement_mauvaise,
                   (jours_bonne + jours_moyenne + jours_degradee
                    + jours_mauvaise + jours_tres_mauvaise + jours_extremement_mauvaise) AS total
            FROM air_quality_atmo_paris
            ORDER BY annee
        """)
        rows = cur.fetchall()
    print("\nRépartition par année (jours) :")
    print("  annee | bonne | moyen | degr. | mauv. | tres.m | extr.m | total")
    for r in rows:
        print(f"  {r[0]} | {r[1]:>5} | {r[2]:>5} | {r[3]:>5} | {r[4]:>5} | {r[5]:>6} | {r[6]:>6} | {r[7]:>5}")


def main():
    print("=== Import indice ATMO Paris (annuel) ===")
    data = load_data()
    print(f"Loaded {len(data)} year(s) from {DATA_FILE.name}")
    conn = get_connection()
    try:
        insert(conn, data)
        print_stats(conn)
    finally:
        conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
