#!/usr/bin/env python3
"""
Import des secteurs scolaires (collèges) de Paris dans PostgreSQL/PostGIS.

Source : opendata.paris.fr — dataset "secteurs-scolaires-colleges"
Format : GeoJSON FeatureCollection (polygones MultiPolygon + propriétés)

Usage:
    python import_school_sectors_paris.py

Environment:
    POSTGRES_URL - chaîne de connexion PostgreSQL
"""

import os
import sys
import json
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DATASET_URL = (
    "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/"
    "secteurs-scolaires-colleges/exports/geojson"
)
NIVEAU = "college"
TERRITOIRE = "paris"


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.")
        sys.exit(1)
    return psycopg2.connect(url)


def download():
    print(f"Downloading {DATASET_URL} …")
    response = requests.get(DATASET_URL, timeout=120)
    response.raise_for_status()
    data = response.json()
    if data.get("type") != "FeatureCollection":
        print(f"Error: unexpected GeoJSON root type: {data.get('type')}")
        sys.exit(1)
    features = data.get("features", [])
    print(f"  Loaded {len(features)} feature(s).")
    return features


def extract_first(props, *keys):
    """Récupère la première valeur non-vide parmi les clés possibles (insensible à la casse)."""
    lowered = {k.lower(): v for k, v in props.items()}
    for k in keys:
        v = lowered.get(k.lower())
        if v not in (None, "", []):
            if isinstance(v, list):
                v = v[0] if v else None
            return v
    return None


def normalize_feature(feature):
    """Convertit une feature GeoJSON en tuple d'insertion ou retourne None si invalide."""
    geom = feature.get("geometry")
    props = feature.get("properties") or {}
    if not geom or geom.get("type") not in ("Polygon", "MultiPolygon"):
        return None

    code_uai = extract_first(
        props, "code_uai", "uai", "c_etab", "cetab", "numero_uai", "rne", "id_etab"
    )
    nom = extract_first(
        props, "nom_etablissement", "nom_etab", "c_nom", "cnom",
        "nom_college", "nom", "libelle", "label",
    )
    adresse = extract_first(
        props, "adresse_etablissement", "adresse", "c_adres", "adr_etab", "address"
    )

    if not nom:
        return None

    geom_json = json.dumps(geom)
    return (
        NIVEAU,
        TERRITOIRE,
        str(code_uai).strip() if code_uai else None,
        str(nom).strip(),
        str(adresse).strip() if adresse else None,
        geom_json,
    )


def insert(conn, features):
    rows = [r for r in (normalize_feature(f) for f in features) if r is not None]
    if not rows:
        print("No valid features to insert.")
        return

    skipped = len(features) - len(rows)
    if skipped:
        print(f"  Skipped {skipped} feature(s) without geometry/name.")

    # Purge l'ancien jeu (territoire+niveau) avant ré-import — la sectorisation
    # peut bouger entre deux rentrées, on ne veut pas de polygones orphelins.
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM school_sector WHERE niveau = %s AND territoire = %s",
            (NIVEAU, TERRITOIRE),
        )
        deleted = cur.rowcount

        execute_values(
            cur,
            """
            INSERT INTO school_sector
                (niveau, territoire, code_uai, nom_etablissement, adresse, geometry)
            VALUES %s
            ON CONFLICT (niveau, territoire, code_uai)
            DO UPDATE SET
                nom_etablissement = EXCLUDED.nom_etablissement,
                adresse = EXCLUDED.adresse,
                geometry = EXCLUDED.geometry
            """,
            rows,
            template="(%s, %s, %s, %s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))",
        )
    conn.commit()
    print(f"  Deleted {deleted} previous row(s), inserted {len(rows)} new row(s).")


def print_stats(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT niveau, territoire, COUNT(*),
                   COUNT(*) FILTER (WHERE code_uai IS NOT NULL) AS with_uai
            FROM school_sector
            GROUP BY niveau, territoire
            ORDER BY niveau, territoire
            """
        )
        rows = cur.fetchall()
    print("\nSchool sectors in DB:")
    for niv, ter, n, with_uai in rows:
        print(f"  {niv:8} / {ter:10} : {n} secteurs ({with_uai} avec code UAI)")


def main():
    print("=== Import secteurs scolaires Paris (collèges) ===")
    features = download()
    conn = get_connection()
    try:
        insert(conn, features)
        print_stats(conn)
    finally:
        conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
