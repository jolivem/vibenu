#!/usr/bin/env python3
"""
Import DVF (Demandes de Valeurs Foncières) geolocalised data into PostgreSQL,
then enrich with cadastre parcel geometries from Etalab.

Usage:
    python import_dvf.py

Environment:
    POSTGRES_URL - PostgreSQL connection string

Downloads DVF geolocalised CSV files from data.gouv.fr for all departments,
filters sales of apartments and houses from the last 10 years, imports into
PostgreSQL, then downloads cadastre parcels to replace point geometries with
real parcel polygons.

Corrections du 29/10/2026, trouvées par scripts/verify (contrôle face aux fichiers publics) :
- **toutes les années publiées** (2021-2025 au 29/10/2026 : l'État ne publie que cinq ans).
  L'import s'arrêtait à la première trouvée, 2024, si bien que le site n'avait qu'une année ;
- **une ligne par vente, surface totale de ses logements**. Le fichier a une ligne par logement
  (et parfois plusieurs pour un même logement, une par nature de culture du terrain) : on
  gardait la première, et le prix d'une vente de deux appartements était divisé par la surface
  d'un seul (−18 % sur le prix médian de Boën-sur-Lignon une fois corrigé) ;
- **table construite à côté** (`dvf_transactions_new`) puis échangée en fin d'import : le site
  garde ses prix pendant les heures que dure l'import.
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

# Table construite pendant l'import, échangée avec `dvf_transactions` à la fin.
TABLE = "dvf_transactions_new"

# Colonnes qui identifient un logement dans une vente. Un même logement revient sur plusieurs
# lignes quand le terrain a plusieurs natures de culture : ces colonnes-là ne changent pas.
LOGEMENT_KEY = ["id_parcelle", "numero_volume", "lot1_numero", "lot2_numero", "lot3_numero",
                "type_local", "surface_reelle_bati", "nombre_pieces_principales"]

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
        cur.execute(f"DROP TABLE IF EXISTS {TABLE};")
        cur.execute(f"""
            CREATE TABLE {TABLE} (
                id SERIAL PRIMARY KEY,
                id_mutation VARCHAR(30) NOT NULL,
                id_parcelle VARCHAR(20),
                date_mutation DATE NOT NULL,
                nature_mutation VARCHAR(50),
                valeur_fonciere NUMERIC,
                surface_bati NUMERIC,
                type_local VARCHAR(50),
                -- Logements de la vente (appartements et maisons), et donc de sa surface.
                nb_logements SMALLINT,
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


def available_years() -> list[str]:
    """Les millésimes publiés (un dossier par année sous DVF_BASE_URL)."""
    import re

    r = requests.get(f"{DVF_BASE_URL}/", timeout=60)
    r.raise_for_status()
    return sorted(set(re.findall(r">(\d{4})/<", r.text)))


def download_department_dvf(dept, years):
    """Toutes les années publiées d'un département, en un seul DataFrame. None si aucune."""
    frames = []
    for year in years:
        for suffix, unzip in ((".csv.gz", True), (".csv", False)):
            url = f"{DVF_BASE_URL}/{year}/departements/{dept}{suffix}"
            try:
                response = requests.get(url, timeout=120)
            except Exception:
                continue
            if response.status_code == 200:
                content = gzip.decompress(response.content) if unzip else response.content
                frames.append(pd.read_csv(io.BytesIO(content), dtype=str, low_memory=False))
                break
    return pd.concat(frames, ignore_index=True) if frames else None


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

    # Un logement par ligne : retirer les lignes répétées d'un même logement (une par nature
    # de culture du terrain), puis une ligne par vente avec la surface totale de ses logements.
    key = ["id_mutation"] + [c for c in LOGEMENT_KEY if c in df.columns]
    df = df.drop_duplicates(subset=key, keep="first")
    df["surface_bati"] = df["surface_bati"].fillna(0)
    totals = df.groupby("id_mutation").agg(surface_totale=("surface_bati", "sum"), nb_logements=("surface_bati", "size"))
    df = df.drop_duplicates(subset=["id_mutation"], keep="first").set_index("id_mutation")
    df = df.join(totals).reset_index()
    df["surface_bati"] = df["surface_totale"]

    if len(df) == 0:
        return 0

    # Build rows
    rows = []
    for _, row in df.iterrows():
        lon = float(row["longitude"])
        lat = float(row["latitude"])

        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            continue

        surface = float(row["surface_bati"]) if pd.notna(row["surface_bati"]) and row["surface_bati"] > 0 else None
        id_parcelle = str(row["id_parcelle_val"]) if row["id_parcelle_val"] else None

        rows.append((
            str(row["id_mutation"]),
            id_parcelle,
            row["date_mutation"].strftime("%Y-%m-%d"),
            str(row["nature_mutation"]),
            float(row["valeur_fonciere"]),
            surface,
            str(row["type_local"]),
            int(row["nb_logements"]),
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
                f"""
                INSERT INTO {TABLE}
                    (id_mutation, id_parcelle, date_mutation, nature_mutation, valeur_fonciere,
                     surface_bati, type_local, nb_logements, code_commune, longitude, latitude, geometry)
                VALUES %s
                """,
                batch,
                template="""(
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
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
            f"SELECT DISTINCT id_parcelle FROM {TABLE} WHERE id_parcelle LIKE %s AND id_parcelle IS NOT NULL",
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
        cur.execute(f"""
            UPDATE {TABLE} d
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
    """Index de la nouvelle table, sous des noms provisoires (l'ancienne table garde les siens)."""
    print("Creating indexes...")
    with conn.cursor() as cur:
        cur.execute(f"CREATE INDEX idx_dvf_new_geometry ON {TABLE} USING GIST (geometry);")
        cur.execute(f"CREATE INDEX idx_dvf_new_date ON {TABLE} (date_mutation);")
        cur.execute(f"CREATE INDEX idx_dvf_new_parcelle ON {TABLE} (id_parcelle);")
        cur.execute(f"CREATE INDEX idx_dvf_new_commune ON {TABLE} (code_commune);")
        # Le point de la vente, tel que la recherche par rayon l'écrit (migration 029) :
        # sans lui, chaque analyse lit la table entière.
        cur.execute(f"CREATE INDEX idx_dvf_new_point ON {TABLE} USING GIST ((ST_MakePoint(longitude, latitude)::geography));")
    conn.commit()
    print("Indexes created.")


def swap_tables(conn):
    """Remplace l'ancienne table par la nouvelle, en une transaction : aucun moment sans prix."""
    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS dvf_transactions_old;")
        cur.execute("ALTER TABLE IF EXISTS dvf_transactions RENAME TO dvf_transactions_old;")
        cur.execute(f"ALTER TABLE {TABLE} RENAME TO dvf_transactions;")
        cur.execute("DROP TABLE IF EXISTS dvf_transactions_old;")
        for name in ("geometry", "date", "parcelle", "commune", "point"):
            cur.execute(f"DROP INDEX IF EXISTS idx_dvf_{name};")
            cur.execute(f"ALTER INDEX idx_dvf_new_{name} RENAME TO idx_dvf_{name};")
        # Clé primaire et séquence gardent sinon leur nom provisoire, et l'import suivant ne
        # pourrait plus recréer `dvf_transactions_new` (noms uniques dans le schéma).
        cur.execute("ALTER INDEX IF EXISTS dvf_transactions_new_pkey RENAME TO dvf_transactions_pkey;")
        cur.execute("ALTER SEQUENCE IF EXISTS dvf_transactions_new_id_seq RENAME TO dvf_transactions_id_seq;")
    conn.commit()
    print("Table dvf_transactions remplacée.")


def main():
    conn = get_connection()
    try:
        setup_database(conn)

        # Phase 1: Import DVF transactions
        print("=== Phase 1: Import DVF transactions ===")
        total_dvf = 0
        years = available_years()
        print(f"Millésimes publiés : {', '.join(years)}")
        for dept in DEPARTMENTS:
            print(f"Processing DVF for department {dept}...")
            df = download_department_dvf(dept, years)
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
        swap_tables(conn)

        print(f"\nImport completed. {total_dvf} DVF transactions, {total_parcels} parcels matched.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
