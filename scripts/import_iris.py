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
    """
    Filet de sécurité pour une base neuve : la table est normalement créée par la
    migration 017-insee-iris.sql, qui la décrit à l'identique.

    Le DROP TABLE d'origine a été retiré : iris_demographics est désormais jointe par
    iris_logement / iris_emploi / iris_menages et agrégée par la vue matérialisée
    insee_aggregate. La recréer à chaque import ferait tomber tout cet échafaudage.
    Le ménage que faisait le DROP — supprimer les IRIS disparus du millésime — est
    repris explicitement en fin d'import_contours().
    """
    with conn.cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS iris_demographics (
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
    print("Table iris_demographics prête.")


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
    purge_obsolete(conn, [r[0] for r in rows])


def purge_obsolete(conn, codes):
    """
    Supprime les IRIS absents du millésime qu'on vient d'importer.

    Le DROP TABLE d'autrefois faisait ce ménage sans le dire. Sans lui, un IRIS
    redécoupé ou fusionné resterait indéfiniment en base avec son ancienne géométrie
    et son ancienne population — et serait compté dans l'agrégat France, qui est
    précisément le repère auquel tous les quartiers sont comparés.

    Garde-fou : on ne purge rien sur un import manifestement tronqué, sinon un
    téléchargement partiel viderait la base.
    """
    if len(codes) < 40000:
        print(f"  ⚠ purge ignorée : seulement {len(codes):,} contours reçus (import tronqué ?)")
        return

    with conn.cursor() as cur:
        cur.execute("CREATE TEMP TABLE vus (code_iris VARCHAR(9) PRIMARY KEY) ON COMMIT DROP;")
        execute_values(cur, "INSERT INTO vus VALUES %s ON CONFLICT DO NOTHING",
                       [(c,) for c in codes])
        cur.execute("""
            DELETE FROM iris_demographics d
            WHERE NOT EXISTS (SELECT 1 FROM vus v WHERE v.code_iris = d.code_iris)
        """)
        removed = cur.rowcount
    conn.commit()
    print(f"  {removed} IRIS obsolètes supprimés.")


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


# Une liste de colonnes candidates par colonne de destination, du millésime le plus
# récent au plus ancien. Résoudre variable par variable plutôt que par préfixe global :
# les fichiers INSEE mélangent les préfixes (P pour l'exploitation principale, C pour la
# complémentaire), et l'ancien repli par `.replace("P21_", …)` ne pouvait de toute façon
# jamais dépasser son premier candidat.
POP_COLUMNS = {
    "population": ["P21_POP", "P20_POP", "P19_POP"],
    "pop_0_14": ["P21_POP0014", "P20_POP0014", "P19_POP0014"],
    "pop_15_29": ["P21_POP1529", "P20_POP1529", "P19_POP1529"],
    "pop_30_44": ["P21_POP3044", "P20_POP3044", "P19_POP3044"],
    "pop_45_59": ["P21_POP4559", "P20_POP4559", "P19_POP4559"],
    "pop_60_74": ["P21_POP6074", "P20_POP6074", "P19_POP6074"],
    "pop_75_plus": ["P21_POP75P", "P20_POP75P", "P19_POP75P"],
}

REVENU_COLUMNS = {
    "revenu_median": ["MED21", "Q221", "DISP_MED21", "MED20", "MED19", "Q2"],
    "taux_pauvrete": ["TP6021", "TP6020", "TP6019", "TP60"],
}


def resolve_columns(available, wanted):
    """
    Associe chaque colonne de destination à la première colonne source présente.

    Journalise ce qui manque : un repli silencieux produirait une base à moitié vide
    qu'on ne découvrirait qu'à l'écran, plusieurs jours plus tard.
    """
    resolved = {}
    missing = []
    for dest, candidates in wanted.items():
        src = next((c for c in candidates if c in available), None)
        if src:
            resolved[dest] = src
        else:
            missing.append(dest)
    if missing:
        print(f"  ⚠ colonnes introuvables, laissées à NULL : {', '.join(missing)}")
    if resolved:
        print(f"  colonnes retenues : {', '.join(sorted(resolved.values()))}")
    return resolved


def find_iris_column(columns):
    return next((c for c in ["IRIS", "CODE_IRIS", "DCOMIRIS"] if c in columns), None)


def flush_updates(cur, batch, dest_cols, cast):
    """
    Un seul UPDATE par lot, joint sur une liste de VALUES.

    L'ancienne boucle envoyait une requête par IRIS, soit ~50 000 allers-retours par
    passe. Le cast explicite est obligatoire : les colonnes d'un VALUES sont typées
    `text` par défaut, et la jointure comme l'affectation échoueraient.
    """
    sets = ", ".join(f"{c} = v.{c}" for c in dest_cols)
    cols = ", ".join(dest_cols)
    template = "(%s::varchar, " + ", ".join(f"%s::{cast}" for _ in dest_cols) + ")"
    execute_values(
        cur,
        f"""
        UPDATE iris_demographics d SET {sets}
        FROM (VALUES %s) AS v(code_iris, {cols})
        WHERE d.code_iris = v.code_iris
        """,
        batch,
        template=template,
    )
    return len(batch)


def update_from_csv(conn, df, wanted, cast, label):
    """Applique un fichier INSEE sur iris_demographics, par lots."""
    df.columns = df.columns.str.upper().str.strip()

    iris_col = find_iris_column(df.columns)
    if not iris_col:
        print(f"  Warning: no IRIS column found in {label} data")
        return

    resolved = resolve_columns(set(df.columns), wanted)
    if not resolved:
        return

    dest_cols = list(resolved)
    updated = 0
    batch = []
    with conn.cursor() as cur:
        for _, row in df.iterrows():
            code_iris = str(row[iris_col]).strip()
            if len(code_iris) < 5:
                continue

            values = [pd.to_numeric(row[resolved[d]], errors="coerce") for d in dest_cols]
            if all(pd.isna(v) for v in values):
                continue

            batch.append((code_iris, *[None if pd.isna(v) else float(v) for v in values]))
            if len(batch) >= BATCH_SIZE:
                updated += flush_updates(cur, batch, dest_cols, cast)
                batch.clear()
        if batch:
            updated += flush_updates(cur, batch, dest_cols, cast)

    conn.commit()
    print(f"  Updated {updated} IRIS with {label} data.")


def update_population(conn, df):
    """Update IRIS demographics with population data from RP."""
    update_from_csv(conn, df, POP_COLUMNS, "int", "population")


def update_revenus(conn, df):
    """Update IRIS demographics with revenue data from Filosofi."""
    update_from_csv(conn, df, REVENU_COLUMNS, "numeric", "revenue")


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
