#!/usr/bin/env python3
"""
Import DVF (Demandes de Valeurs Foncières) geolocalised data into PostgreSQL/Neon,
then enrich with cadastre parcel geometries from Etalab.

Usage:
    python import_dvf.py

Environment:
    POSTGRES_URL - PostgreSQL connection string

Downloads DVF geolocalised CSV files from data.gouv.fr for all departments,
filters sales of apartments and houses from the last 10 years, imports into
PostgreSQL, then downloads cadastre parcels to replace point geometries with
real parcel polygons.
"""

import os
import sys
import gzip
import io
import json
import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

# Base URL for DVF geolocalised CSV files (by department)
DVF_BASE_URL = "https://files.data.gouv.fr/geo-dvf/latest/csv"

# Base URL for cadastre Etalab GeoJSON parcels (by department)
CADASTRE_BASE_URL = "https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/departements"

# All metropolitan departments + DOM
DEPARTMENTS = [
    f"{i:02d}" for i in range(1, 96) if i != 20
] + ["2A", "2B", "971", "972", "973", "974", "976"]

BATCH_SIZE = 1000

# Minimum date: 10 years ago
MIN_DATE = (datetime.now() - timedelta(days=365 * 10)).strftime("%Y-%m-%d")


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def setup_database(conn):
    """Create PostGIS extension and tables."""
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("DROP TABLE IF EXISTS dvf_transactions;")
        cur.execute("""
            CREATE TABLE dvf_transactions (
                id SERIAL PRIMARY KEY,
                id_mutation VARCHAR(30) NOT NULL,
                id_parcelle VARCHAR(20),
                date_mutation DATE NOT NULL,
                nature_mutation VARCHAR(50),
                valeur_fonciere NUMERIC,
                surface_bati NUMERIC,
                type_local VARCHAR(50),
                code_commune VARCHAR(5),
                longitude DOUBLE PRECISION,
                latitude DOUBLE PRECISION,
                geometry GEOMETRY(GEOMETRY, 4326)
            );
        """)
        # Temporary table for cadastre parcels
        cur.execute("DROP TABLE IF EXISTS tmp_cadastre_parcelles;")
        cur.execute("""
            CREATE TABLE tmp_cadastre_parcelles (
                id VARCHAR(20) PRIMARY KEY,
                geometry GEOMETRY(MULTIPOLYGON, 4326)
            );
        """)
    conn.commit()
    print("Tables created.")


def download_department_dvf(dept):
    """Download DVF CSV for a department. Returns a DataFrame or None."""
    for year in ["2024", "2023", "2022"]:
        url = f"{DVF_BASE_URL}/{year}/departements/{dept}.csv.gz"
        try:
            response = requests.get(url, timeout=60)
            if response.status_code == 200:
                csv_data = gzip.decompress(response.content)
                df = pd.read_csv(io.BytesIO(csv_data), dtype=str, low_memory=False)
                return df
        except Exception:
            continue

    for year in ["2024", "2023", "2022"]:
        url = f"{DVF_BASE_URL}/{year}/departements/{dept}.csv"
        try:
            response = requests.get(url, timeout=60)
            if response.status_code == 200:
                df = pd.read_csv(io.BytesIO(response.content), dtype=str, low_memory=False)
                return df
        except Exception:
            continue

    return None


def process_department_dvf(conn, dept, df):
    """Filter and insert DVF data for one department."""
    df.columns = df.columns.str.lower().str.strip()

    required = ["id_mutation", "date_mutation", "nature_mutation", "valeur_fonciere",
                "type_local", "longitude", "latitude"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"  Warning: missing columns {missing}, skipping department {dept}")
        return 0

    # Filter: sales only
    df = df[df["nature_mutation"].str.contains("Vente", case=False, na=False)]

    # Filter: apartments and houses only
    df = df[df["type_local"].str.contains("Appartement|Maison", case=False, na=False)]

    # Filter: last 10 years
    df["date_mutation"] = pd.to_datetime(df["date_mutation"], errors="coerce")
    df = df.dropna(subset=["date_mutation"])
    df = df[df["date_mutation"] >= MIN_DATE]

    # Filter: valid coordinates
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df = df.dropna(subset=["longitude", "latitude"])

    # Filter: valid price
    df["valeur_fonciere"] = pd.to_numeric(df["valeur_fonciere"], errors="coerce")
    df = df.dropna(subset=["valeur_fonciere"])
    df = df[df["valeur_fonciere"] > 0]

    # Surface
    surface_col = "surface_reelle_bati" if "surface_reelle_bati" in df.columns else "surface_bati"
    if surface_col in df.columns:
        df["surface_bati"] = pd.to_numeric(df[surface_col], errors="coerce")
    else:
        df["surface_bati"] = None

    # Code commune
    code_commune_col = "code_commune" if "code_commune" in df.columns else "commune"
    if code_commune_col in df.columns:
        df["code_commune_val"] = df[code_commune_col].astype(str)
    else:
        df["code_commune_val"] = ""

    # id_parcelle
    if "id_parcelle" in df.columns:
        df["id_parcelle_val"] = df["id_parcelle"].fillna("")
    else:
        df["id_parcelle_val"] = ""

    # Deduplicate by id_mutation (keep first occurrence)
    df = df.drop_duplicates(subset=["id_mutation"], keep="first")

    if len(df) == 0:
        return 0

    # Build rows
    rows = []
    for _, row in df.iterrows():
        lon = float(row["longitude"])
        lat = float(row["latitude"])

        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            continue

        surface = float(row["surface_bati"]) if pd.notna(row["surface_bati"]) else None
        id_parcelle = str(row["id_parcelle_val"]) if row["id_parcelle_val"] else None

        rows.append((
            str(row["id_mutation"]),
            id_parcelle,
            row["date_mutation"].strftime("%Y-%m-%d"),
            str(row["nature_mutation"]),
            float(row["valeur_fonciere"]),
            surface,
            str(row["type_local"]),
            str(row["code_commune_val"]),
            lon,
            lat,
            lon,
            lat,
        ))

    # Insert
    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            execute_values(
                cur,
                """
                INSERT INTO dvf_transactions
                    (id_mutation, id_parcelle, date_mutation, nature_mutation, valeur_fonciere,
                     surface_bati, type_local, code_commune, longitude, latitude, geometry)
                VALUES %s
                """,
                batch,
                template="""(
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)
                )""",
            )

    conn.commit()
    return len(rows)


def get_dvf_parcelle_ids(conn, dept):
    """Get the set of id_parcelle values for a department's DVF data."""
    dept_pattern = dept + "%"
    with conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT id_parcelle FROM dvf_transactions WHERE id_parcelle LIKE %s AND id_parcelle IS NOT NULL",
            (dept_pattern,)
        )
        return {row[0] for row in cur.fetchall()}


def download_and_import_cadastre(conn, dept):
    """Download cadastre parcels for a department, filter to DVF parcels only, and insert."""
    # Get DVF parcelle IDs for this department
    dvf_ids = get_dvf_parcelle_ids(conn, dept)
    if not dvf_ids:
        return 0

    url = f"{CADASTRE_BASE_URL}/{dept}/cadastre-{dept}-parcelles.json.gz"
    try:
        response = requests.get(url, timeout=120)
        if response.status_code != 200:
            print(f"  Warning: cadastre download failed for {dept} (HTTP {response.status_code})")
            return 0

        data = gzip.decompress(response.content).decode("utf-8")
    except Exception as e:
        print(f"  Warning: cadastre download error for {dept}: {e}")
        return 0

    # Parse as GeoJSON FeatureCollection or NDJSON
    rows = []
    try:
        geojson = json.loads(data)
        features = geojson.get("features", [])
    except json.JSONDecodeError:
        # Fallback: try NDJSON (one feature per line)
        features = []
        for line in data.strip().split("\n"):
            if not line.strip():
                continue
            try:
                features.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    for feature in features:
        parcelle_id = feature.get("id") or (feature.get("properties") or {}).get("id")
        if not parcelle_id or parcelle_id not in dvf_ids:
            continue

        geom = feature.get("geometry")
        if not geom:
            continue

        geom_json = json.dumps(geom)
        rows.append((parcelle_id, geom_json))

    if not rows:
        return 0

    # Insert into temp table
    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            execute_values(
                cur,
                """
                INSERT INTO tmp_cadastre_parcelles (id, geometry)
                VALUES %s
                ON CONFLICT (id) DO NOTHING
                """,
                batch,
                template="(%s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))",
            )

    conn.commit()
    return len(rows)


def join_geometries(conn):
    """Update DVF transactions with cadastre parcel geometries."""
    print("Joining DVF transactions with cadastre geometries...")
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE dvf_transactions d
            SET geometry = c.geometry
            FROM tmp_cadastre_parcelles c
            WHERE d.id_parcelle = c.id
        """)
        updated = cur.rowcount
    conn.commit()
    print(f"  Updated {updated} transactions with parcel geometries.")
    return updated


def cleanup_temp(conn):
    """Drop temporary cadastre table."""
    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS tmp_cadastre_parcelles;")
    conn.commit()
    print("Temporary cadastre table dropped.")


def create_indexes(conn):
    """Create spatial and date indexes."""
    print("Creating indexes...")
    with conn.cursor() as cur:
        cur.execute("CREATE INDEX IF NOT EXISTS idx_dvf_geometry ON dvf_transactions USING GIST (geometry);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_dvf_date ON dvf_transactions (date_mutation);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_dvf_parcelle ON dvf_transactions (id_parcelle);")
    conn.commit()
    print("Indexes created.")


def main():
    conn = get_connection()
    try:
        setup_database(conn)

        # Phase 1: Import DVF transactions
        print("=== Phase 1: Import DVF transactions ===")
        total_dvf = 0
        for dept in DEPARTMENTS:
            print(f"Processing DVF for department {dept}...")
            df = download_department_dvf(dept)
            if df is None:
                print(f"  Warning: could not download DVF data for department {dept}")
                continue

            count = process_department_dvf(conn, dept, df)
            total_dvf += count
            print(f"  Inserted {count} transactions (total: {total_dvf})")

        print(f"\nDVF import done. Total: {total_dvf} transactions.\n")

        # Phase 2: Import cadastre parcels and join geometries
        print("=== Phase 2: Import cadastre parcels ===")
        total_parcels = 0
        for dept in DEPARTMENTS:
            print(f"Processing cadastre for department {dept}...")
            count = download_and_import_cadastre(conn, dept)
            total_parcels += count
            if count > 0:
                print(f"  Loaded {count} matching parcels (total: {total_parcels})")

        print(f"\nCadastre import done. Total: {total_parcels} parcels.\n")

        # Phase 3: Join geometries
        print("=== Phase 3: Join geometries ===")
        join_geometries(conn)

        # Phase 4: Cleanup and index
        cleanup_temp(conn)
        create_indexes(conn)

        print(f"\nImport completed. {total_dvf} DVF transactions, {total_parcels} parcels matched.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
