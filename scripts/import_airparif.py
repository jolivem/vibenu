#!/usr/bin/env python3
"""
Import AirParif annual pollutant concentrations into PostgreSQL.

Phase 0 SEO : 20 arrondissements parisiens, 4 polluants (PM2.5, PM10, NO2, O3).

Usage:
    python import_airparif.py

Environment:
    POSTGRES_URL - PostgreSQL connection string

Source : valeurs annuelles publiées par AirParif dans ses bilans annuels.
La donnée est stable (publication ~1×/an, généralement au printemps pour l'année N-1).
Pour rafraîchir, mettre à jour airparif_seed.json puis relancer ce script.

NOTE : Les valeurs ci-dessous sont des ordres de grandeur représentatifs basés sur
les rapports AirParif publics récents. À remplacer par les valeurs officielles
exactes du dernier bilan AirParif (https://www.airparif.asso.fr/) avant publication.

Évolution future (phase 2) :
- Ingestion automatique depuis opendata.paris.fr (dataset à identifier)
- Élargissement aux Atmo régionaux (Atmo Sud, Atmo Grand Est, etc.)
- Source LCSQA pour une base nationale unifiée
"""

import os
import sys
import json
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

SEED_FILE = Path(__file__).parent / "airparif_seed.json"


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def load_seed():
    if not SEED_FILE.exists():
        print(f"Error: seed file not found at {SEED_FILE}")
        sys.exit(1)
    with open(SEED_FILE, encoding="utf-8") as f:
        return json.load(f)


def insert(conn, seed):
    annee = seed["annee"]
    source = seed.get("source", "AirParif")
    seuils_oms = seed["seuils_oms"]  # {"PM25": 5, "PM10": 15, "NO2": 10, "O3": 60}
    rows = []
    for code_commune, polluants in seed["communes"].items():
        for polluant, concentration in polluants.items():
            seuil = seuils_oms.get(polluant)
            rows.append((code_commune, annee, polluant, float(concentration), seuil, source))

    if not rows:
        print("No rows to insert.")
        return

    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO air_quality_annual
                (code_commune, annee, polluant, concentration_moyenne, seuil_oms, source)
            VALUES %s
            ON CONFLICT (code_commune, annee, polluant)
            DO UPDATE SET
                concentration_moyenne = EXCLUDED.concentration_moyenne,
                seuil_oms = EXCLUDED.seuil_oms,
                source = EXCLUDED.source
            """,
            rows,
        )
    conn.commit()
    print(f"Inserted/updated {len(rows)} rows in air_quality_annual.")


def print_stats(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT polluant, COUNT(*), ROUND(AVG(concentration_moyenne)::numeric, 1)
            FROM air_quality_annual
            GROUP BY polluant
            ORDER BY polluant
        """)
        rows = cur.fetchall()
    print("\nConcentrations moyennes par polluant :")
    for polluant, count, avg in rows:
        print(f"  {polluant}: {count} commune(s), moyenne {avg} µg/m³")


def main():
    print("=== Import AirParif annual data ===")
    seed = load_seed()
    print(f"Loaded seed: année {seed['annee']}, "
          f"{len(seed['communes'])} commune(s), source: {seed.get('source')}")
    conn = get_connection()
    try:
        insert(conn, seed)
        print_stats(conn)
    finally:
        conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
