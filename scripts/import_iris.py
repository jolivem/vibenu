#!/usr/bin/env python3
"""
Import INSEE IRIS demographic data into PostgreSQL/PostGIS.

Usage:
    python import_iris.py

Environment:
    POSTGRES_URL - PostgreSQL connection string

Downloads IRIS contours (IGN) and demographic data (INSEE RP + Filosofi),
joins them, and imports into PostgreSQL for neighborhood demographic analysis.
"""

import os
import sys
import io
import json
import gzip
import zipfile
import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

# IRIS contours from data.gouv.fr (GeoJSON, simplified)
IRIS_CONTOURS_URL = "https://data.geopf.fr/telechargement/download/CONTOURS-IRIS/CONTOURS-IRIS_3-0__SHP__FRA_2024-01-01/CONTOURS-IRIS_3-0__SHP__FRA_2024-01-01.7z"

# IRIS contours GeoJSON from OpenDataSoft (all of France, ~1.2 GB)
IRIS_GEOJSON_URL = "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-france-iris/exports/geojson"

# INSEE RP 2021 - Population by IRIS
# https://www.insee.fr/fr/statistiques/8268806
RP_POP_URL = "https://www.insee.fr/fr/statistiques/fichier/8268806/base-ic-evol-struct-pop-2021_csv.zip"

# INSEE Filosofi 2021 - Revenue by IRIS
# https://www.insee.fr/fr/statistiques/8229323
FILOSOFI_URL = "https://www.insee.fr/fr/statistiques/fichier/8229323/BASE_TD_FILO_IRIS_2021_DISP_CSV.zip"

BATCH_SIZE = 1000


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def setup_database(conn):
    """Create tables for IRIS data."""
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("DROP TABLE IF EXISTS iris_demographics;")
        cur.execute("""
            CREATE TABLE iris_demographics (
                id SERIAL PRIMARY KEY,
                code_iris VARCHAR(9) NOT NULL UNIQUE,
                nom_iris TEXT,
                nom_commune TEXT,
                population INTEGER,
                pop_0_14 INTEGER,
                pop_15_29 INTEGER,
                pop_30_44 INTEGER,
                pop_45_59 INTEGER,
                pop_60_74 INTEGER,
                pop_75_plus INTEGER,
                revenu_median NUMERIC,
                taux_pauvrete NUMERIC,
                geom GEOMETRY(MULTIPOLYGON, 4326)
            );
        """)
    conn.commit()
    print("Table iris_demographics created.")


def download_iris_contours():
    """Download IRIS contours as GeoJSON."""
    print(f"Downloading IRIS contours...")
    response = requests.get(IRIS_GEOJSON_URL, timeout=300)
    response.raise_for_status()

    # Try to parse as GeoJSON
    try:
        data = response.json()
        if data.get("type") == "FeatureCollection":
            print(f"  Loaded {len(data['features'])} IRIS features.")
            return data
    except Exception:
        pass

    # Try as gzipped content
    try:
        decompressed = gzip.decompress(response.content)
        data = json.loads(decompressed)
        if data.get("type") == "FeatureCollection":
            print(f"  Loaded {len(data['features'])} IRIS features.")
            return data
    except Exception:
        pass

    print("Error: Could not parse IRIS contours.")
    sys.exit(1)


def import_contours(conn, geojson):
    """Import IRIS contours into database."""
    print("Importing IRIS contours...")
    rows = []

    for feature in geojson["features"]:
        props = feature.get("properties", {})
        geom = feature.get("geometry")
        if not geom:
            continue

        # Extract IRIS code (may be a string or a list)
        code_iris = (
            props.get("CODE_IRIS")
            or props.get("code_iris")
            or props.get("iris_code")
            or props.get("DCOMIRIS")
            or ""
        )
        if isinstance(code_iris, list):
            code_iris = code_iris[0] if code_iris else ""
        code_iris = str(code_iris).strip()
        if not code_iris or len(code_iris) < 5:
            continue

        nom_iris_raw = props.get("NOM_IRIS") or props.get("nom_iris") or props.get("iris_name") or ""
        nom_iris = nom_iris_raw[0] if isinstance(nom_iris_raw, list) else str(nom_iris_raw)

        nom_commune_raw = (
            props.get("NOM_COM") or props.get("nom_com")
            or props.get("com_name") or props.get("NOM_COMMUNE") or ""
        )
        nom_commune = nom_commune_raw[0] if isinstance(nom_commune_raw, list) else str(nom_commune_raw)

        geom_json = json.dumps(geom)
        rows.append((code_iris, nom_iris, nom_commune, geom_json))

    print(f"  Inserting {len(rows)} IRIS contours...")

    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            execute_values(
                cur,
                """
                INSERT INTO iris_demographics (code_iris, nom_iris, nom_commune, geom)
                VALUES %s
                ON CONFLICT (code_iris) DO UPDATE SET
                    nom_iris = EXCLUDED.nom_iris,
                    nom_commune = EXCLUDED.nom_commune,
                    geom = EXCLUDED.geom
                """,
                batch,
                template="(%s, %s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))",
            )
            if (i // BATCH_SIZE) % 10 == 0:
                print(f"    ... {i + len(batch)}/{len(rows)}")

    conn.commit()
    print(f"  Imported {len(rows)} contours.")


def download_and_parse_csv(url, label):
    """Download a ZIP containing a CSV from INSEE."""
    print(f"Downloading {label}...")
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
        csv_files = [f for f in zf.namelist() if f.lower().endswith(".csv")]
        if not csv_files:
            print(f"  Warning: no CSV found in {label} ZIP")
            return None

        csv_name = csv_files[0]
        print(f"  Extracting {csv_name}...")
        with zf.open(csv_name) as f:
            # Try different separators
            content = f.read()
            for sep in [";", ",", "\t"]:
                try:
                    df = pd.read_csv(io.BytesIO(content), sep=sep, dtype=str, low_memory=False)
                    if len(df.columns) > 3:
                        print(f"  Loaded {len(df)} rows, {len(df.columns)} columns (sep='{sep}')")
                        return df
                except Exception:
                    continue

    print(f"  Warning: could not parse CSV from {label}")
    return None


def update_population(conn, df):
    """Update IRIS demographics with population data from RP."""
    df.columns = df.columns.str.upper().str.strip()
    print(f"  Population columns: {list(df.columns[:20])}...")

    # Find IRIS code column
    iris_col = None
    for candidate in ["IRIS", "CODE_IRIS", "DCOMIRIS"]:
        if candidate in df.columns:
            iris_col = candidate
            break

    if not iris_col:
        print("  Warning: no IRIS column found in population data")
        return

    # Map population columns (RP 2021 naming convention)
    pop_mapping = {
        "P21_POP": "population",
        "P21_POP0014": "pop_0_14",
        "P21_POP1529": "pop_15_29",
        "P21_POP3044": "pop_30_44",
        "P21_POP4559": "pop_45_59",
        "P21_POP6074": "pop_60_74",
        "P21_POP75P": "pop_75_plus",
    }

    # Also try without year prefix
    for alt_prefix in ["P20_", "P19_", "P_"]:
        if not any(c in df.columns for c in pop_mapping.keys()):
            pop_mapping = {
                k.replace("P21_", alt_prefix): v
                for k, v in pop_mapping.items()
            }

    updated = 0
    with conn.cursor() as cur:
        for _, row in df.iterrows():
            code_iris = str(row[iris_col]).strip()
            if len(code_iris) < 5:
                continue

            values = {}
            for src_col, dest_col in pop_mapping.items():
                if src_col in df.columns:
                    try:
                        val = pd.to_numeric(row[src_col], errors="coerce")
                        if pd.notna(val):
                            values[dest_col] = int(val)
                    except Exception:
                        pass

            if not values:
                continue

            set_clause = ", ".join(f"{k} = %s" for k in values.keys())
            params = list(values.values()) + [code_iris]
            cur.execute(
                f"UPDATE iris_demographics SET {set_clause} WHERE code_iris = %s",
                params,
            )
            updated += cur.rowcount

    conn.commit()
    print(f"  Updated {updated} IRIS with population data.")


def update_revenus(conn, df):
    """Update IRIS demographics with revenue data from Filosofi."""
    df.columns = df.columns.str.upper().str.strip()
    print(f"  Revenue columns: {list(df.columns[:20])}...")

    # Find IRIS code column
    iris_col = None
    for candidate in ["IRIS", "CODE_IRIS", "DCOMIRIS"]:
        if candidate in df.columns:
            iris_col = candidate
            break

    if not iris_col:
        print("  Warning: no IRIS column found in revenue data")
        return

    # Find revenue columns
    median_col = None
    for candidate in ["MED21", "Q221", "DISP_MED21", "MED20", "MED19", "Q2"]:
        if candidate in df.columns:
            median_col = candidate
            break

    poverty_col = None
    for candidate in ["TP6021", "TP6020", "TP6019", "TP60"]:
        if candidate in df.columns:
            poverty_col = candidate
            break

    updated = 0
    with conn.cursor() as cur:
        for _, row in df.iterrows():
            code_iris = str(row[iris_col]).strip()
            if len(code_iris) < 5:
                continue

            sets = []
            params = []

            if median_col:
                try:
                    val = pd.to_numeric(row[median_col], errors="coerce")
                    if pd.notna(val):
                        sets.append("revenu_median = %s")
                        params.append(float(val))
                except Exception:
                    pass

            if poverty_col:
                try:
                    val = pd.to_numeric(row[poverty_col], errors="coerce")
                    if pd.notna(val):
                        sets.append("taux_pauvrete = %s")
                        params.append(float(val))
                except Exception:
                    pass

            if not sets:
                continue

            params.append(code_iris)
            cur.execute(
                f"UPDATE iris_demographics SET {', '.join(sets)} WHERE code_iris = %s",
                params,
            )
            updated += cur.rowcount

    conn.commit()
    print(f"  Updated {updated} IRIS with revenue data.")


def create_indexes(conn):
    """Create spatial index."""
    print("Creating indexes...")
    with conn.cursor() as cur:
        cur.execute("CREATE INDEX IF NOT EXISTS idx_iris_geom ON iris_demographics USING GIST (geom);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_iris_code ON iris_demographics (code_iris);")
    conn.commit()
    print("Indexes created.")


def print_stats(conn):
    """Print summary stats."""
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM iris_demographics WHERE geom IS NOT NULL;")
        with_geom = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM iris_demographics WHERE population IS NOT NULL;")
        with_pop = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM iris_demographics WHERE revenu_median IS NOT NULL;")
        with_rev = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM iris_demographics;")
        total = cur.fetchone()[0]

    print(f"\nIRIS statistics:")
    print(f"  Total IRIS: {total:,}")
    print(f"  With geometry: {with_geom:,}")
    print(f"  With population: {with_pop:,}")
    print(f"  With revenue: {with_rev:,}")


def main():
    conn = get_connection()
    try:
        setup_database(conn)

        # Phase 1: Import contours
        print("=== Phase 1: IRIS contours ===")
        geojson = download_iris_contours()
        import_contours(conn, geojson)

        # Phase 2: Population data
        print("\n=== Phase 2: Population (RP) ===")
        df_pop = download_and_parse_csv(RP_POP_URL, "Recensement population")
        if df_pop is not None:
            update_population(conn, df_pop)

        # Phase 3: Revenue data
        print("\n=== Phase 3: Revenus (Filosofi) ===")
        df_rev = download_and_parse_csv(FILOSOFI_URL, "Filosofi revenus")
        if df_rev is not None:
            update_revenus(conn, df_rev)

        # Phase 4: Indexes and stats
        create_indexes(conn)
        print_stats(conn)

        print("\nIRIS import completed successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
