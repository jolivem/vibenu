#!/usr/bin/env python3
"""
Import de l'indice ATMO annuel pour Marseille dans PostgreSQL.

Source : AtmoSud (https://www.atmosud.org/)
À téléverser dans scripts/data/atmo-marseille.json au format normalisé suivant :

[
  {"annee": 2025, "jours_bonne": ..., "jours_moyenne": ..., "jours_degradee": ...,
   "jours_mauvaise": ..., "jours_tres_mauvaise": ..., "jours_extremement_mauvaise": ...},
  ...
]

Si la source officielle utilise d'autres noms de champs (ex. ind_jour_qa_*), adapter
le mapping dans normalize_entry().

Usage:
    python import_atmo_marseille.py

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

DATA_FILE = Path(__file__).parent / "data" / "atmo-marseille.json"
SOURCE_LABEL = "AtmoSud — indice ATMO annuel"
VILLE = "marseille"


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def load_data():
    if not DATA_FILE.exists():
        print(f"Error: data file not found at {DATA_FILE}")
        print(f"Placer le bilan ATMO Marseille dans ce fichier puis relancer le script.")
        sys.exit(1)
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def normalize_entry(entry):
    """Convertit une entrée du fichier source vers le format DB.
    Adapter ici si AtmoSud utilise d'autres noms de champs."""
    return {
        "annee": int(entry["annee"]),
        "jours_bonne": int(entry.get("jours_bonne", entry.get("ind_jour_qa_bonne", 0))),
        "jours_moyenne": int(entry.get("jours_moyenne", entry.get("ind_jour_qa_moyenne", 0))),
        "jours_degradee": int(entry.get("jours_degradee", entry.get("ind_jour_qa_degradee", 0))),
        "jours_mauvaise": int(entry.get("jours_mauvaise", entry.get("ind_jour_qa_mauvaise", 0))),
        "jours_tres_mauvaise": int(entry.get("jours_tres_mauvaise", entry.get("ind_jour_qa_tres_mauvaise", 0))),
        "jours_extremement_mauvaise": int(entry.get("jours_extremement_mauvaise", entry.get("ind_jour_qa_extremement_mauvaise", 0))),
    }


def to_row(normalized):
    return (
        VILLE,
        normalized["annee"],
        normalized["jours_bonne"],
        normalized["jours_moyenne"],
        normalized["jours_degradee"],
        normalized["jours_mauvaise"],
        normalized["jours_tres_mauvaise"],
        normalized["jours_extremement_mauvaise"],
        SOURCE_LABEL,
    )


def insert(conn, data):
    rows = [to_row(normalize_entry(e)) for e in data]
    if not rows:
        print("No rows to insert.")
        return

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO air_quality_atmo
                (ville, annee, jours_bonne, jours_moyenne, jours_degradee,
                 jours_mauvaise, jours_tres_mauvaise, jours_extremement_mauvaise, source)
            VALUES %s
            ON CONFLICT (ville, annee)
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
    print(f"Inserted/updated {len(rows)} year(s) for ville='{VILLE}' in air_quality_atmo.")


def print_stats(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT annee,
                   jours_bonne, jours_moyenne, jours_degradee,
                   jours_mauvaise, jours_tres_mauvaise, jours_extremement_mauvaise,
                   (jours_bonne + jours_moyenne + jours_degradee
                    + jours_mauvaise + jours_tres_mauvaise + jours_extremement_mauvaise) AS total
            FROM air_quality_atmo
            WHERE ville = %s
            ORDER BY annee
        """, (VILLE,))
        rows = cur.fetchall()
    print(f"\nRépartition par année (jours) pour ville='{VILLE}' :")
    print("  annee | bonne | moyen | degr. | mauv. | tres.m | extr.m | total")
    for r in rows:
        print(f"  {r[0]} | {r[1]:>5} | {r[2]:>5} | {r[3]:>5} | {r[4]:>5} | {r[5]:>6} | {r[6]:>6} | {r[7]:>5}")


def main():
    print(f"=== Import indice ATMO {VILLE} (annuel) ===")
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
