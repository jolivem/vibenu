#!/usr/bin/env python3
"""
Import BPE (Base Permanente des Équipements) data from INSEE into PostgreSQL.

Usage:
    python import_bpe.py

Environment:
    POSTGRES_URL - PostgreSQL connection string

Downloads the latest BPE data from INSEE, filters relevant equipment types,
and inserts into PostgreSQL. The 2024 BPE file includes LONGITUDE/LATITUDE
in WGS84 and establishment names (NOMRS).
"""

import os
import sys
import io
import zipfile
import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

# INSEE BPE download URL (géolocalisé, 2024)
BPE_URL = "https://www.insee.fr/fr/statistiques/fichier/8217525/BPE24.zip"

# BPE TYPEQU codes → our PoiCategory (2024 nomenclature)
TYPEQU_MAPPING = {
    # school
    "C107": "school",    # École maternelle
    "C108": "school",    # École élémentaire
    "C109": "school",    # Collège
    "C201": "school",    # Lycée général ou technologique
    "C301": "school",    # Lycée professionnel
    # supermarket
    "B104": "supermarket",  # Hypermarché
    "B105": "supermarket",  # Supermarché
    # bakery
    "B201": "bakery",
    # pharmacy
    "D307": "pharmacy",
    # doctor
    "D101": "doctor",    # Médecin omnipraticien
    # bank
    "A104": "bank",
    # post_office
    "A203": "post_office",  # Bureau de poste
    # library
    "F303": "library",   # Bibliothèque
    # sport
    "F101": "sport",  # Bassin de natation
    "F102": "sport",  # Boulodrome
    "F103": "sport",  # Tennis
    "F106": "sport",  # Terrain de grands jeux
    "F109": "sport",  # Salle non spécialisée
}

BATCH_SIZE = 1000


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def setup_database(conn):
    """Create PostGIS extension and bpe_equipment table."""
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("DROP TABLE IF EXISTS bpe_equipment;")
        cur.execute("""
            CREATE TABLE bpe_equipment (
                id SERIAL PRIMARY KEY,
                depcom VARCHAR(5) NOT NULL,
                typequ VARCHAR(4) NOT NULL,
                category VARCHAR(20) NOT NULL,
                name TEXT,
                geom GEOMETRY(POINT, 4326) NOT NULL
            );
        """)
    conn.commit()
    print("Table bpe_equipment created.")


def download_bpe():
    """Download and extract BPE CSV from INSEE."""
    print(f"Downloading BPE from {BPE_URL}...")
    response = requests.get(BPE_URL, timeout=300)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        csv_files = [f for f in zf.namelist() if f.endswith(".csv")]
        if not csv_files:
            print("Error: No CSV file found in ZIP archive.")
            sys.exit(1)

        csv_name = csv_files[0]
        print(f"Extracting {csv_name}...")
        with zf.open(csv_name) as f:
            df = pd.read_csv(f, sep=";", dtype=str, low_memory=False)

    print(f"Loaded {len(df)} rows from BPE.")
    return df


def process_and_insert(conn, df):
    """Filter, and insert into database."""
    df.columns = df.columns.str.upper()

    # Filter on relevant TYPEQU codes
    df = df[df["TYPEQU"].isin(TYPEQU_MAPPING.keys())].copy()
    print(f"After TYPEQU filter: {len(df)} rows.")

    # Use LONGITUDE/LATITUDE directly (WGS84 in 2024 BPE)
    df["LONGITUDE"] = pd.to_numeric(df["LONGITUDE"], errors="coerce")
    df["LATITUDE"] = pd.to_numeric(df["LATITUDE"], errors="coerce")
    df = df.dropna(subset=["LONGITUDE", "LATITUDE"])
    df = df[(df["LONGITUDE"].abs() <= 180) & (df["LATITUDE"].abs() <= 90)]
    print(f"After coordinate filter: {len(df)} rows.")

    # Build rows
    rows = []
    for _, row in df.iterrows():
        typequ = row["TYPEQU"]
        category = TYPEQU_MAPPING.get(typequ)
        if not category:
            continue

        lon = float(row["LONGITUDE"])
        lat = float(row["LATITUDE"])
        depcom = str(row["DEPCOM"]) if pd.notna(row.get("DEPCOM")) else ""
        name = str(row["NOMRS"]).strip() if pd.notna(row.get("NOMRS")) else ""

        rows.append((depcom, typequ, category, name, lon, lat))

    print(f"Inserting {len(rows)} rows...")

    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            execute_values(
                cur,
                """
                INSERT INTO bpe_equipment (depcom, typequ, category, name, geom)
                VALUES %s
                """,
                batch,
                template="(%s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))",
            )
            if (i // BATCH_SIZE) % 50 == 0:
                print(f"  ... {i + len(batch)}/{len(rows)} rows inserted")

    conn.commit()
    print(f"Inserted {len(rows)} rows into bpe_equipment.")


def create_indexes(conn):
    """Create spatial and category indexes."""
    print("Creating indexes...")
    with conn.cursor() as cur:
        cur.execute("CREATE INDEX IF NOT EXISTS idx_bpe_geom ON bpe_equipment USING GIST (geom);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_bpe_category ON bpe_equipment (category);")
    conn.commit()
    print("Indexes created.")


def print_stats(conn):
    """Print category counts."""
    with conn.cursor() as cur:
        cur.execute("SELECT category, COUNT(*) FROM bpe_equipment GROUP BY category ORDER BY count DESC;")
        rows = cur.fetchall()
    print("\nBPE counts by category:")
    for category, count in rows:
        print(f"  {category}: {count:,}")
    total = sum(count for _, count in rows)
    print(f"  TOTAL: {total:,}")


def main():
    conn = get_connection()
    try:
        setup_database(conn)
        df = download_bpe()
        process_and_insert(conn, df)
        create_indexes(conn)
        print_stats(conn)
        print("\nBPE import completed successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
