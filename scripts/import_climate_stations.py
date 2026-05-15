#!/usr/bin/env python3
"""
Importe les normales climatiques 1991-2020 par station Météo-France à partir
des fichiers décadaires officiels (meteo.data.gouv.fr / dataset "Données
climatologiques de base - décadaires"), 1 fichier par département × période.

Méthode :
1. Lit tous les *.csv.gz placés dans scripts/data/climate/ (un par dept × période)
2. Filtre la fenêtre 1991-01 → 2020-12
3. Agrège par NUM_POSTE :
   - Température = moyenne des TM décadaires
   - Précipitations annuelles = somme(RR) / nb_années
   - Ensoleillement annuel = somme(INST minutes) / 60 / nb_années
4. Filtre qualité : ≥ 25 années couvertes (sur 30 possibles)
5. INSERT dans climate_station_normales (UPSERT par NUM_POSTE)

Usage :
    # Place les .csv.gz dans scripts/data/climate/, puis :
    python import_climate_stations.py
    # Ou chemin explicite :
    python import_climate_stations.py --data-dir ~/Downloads/decadaires

Pré-requis : migration 008-climate-station-normales.sql appliquée.
"""

import argparse
import os
import sys
from pathlib import Path
import psycopg2
import pandas as pd
import numpy as np
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

PERIOD_START_YYYYMM = 199101
PERIOD_END_YYYYMM = 202012
NUM_YEARS = 30
MIN_VALID_YEARS = 25
SOURCE_TAG = "meteo-france-decadaires-1991-2020"
BATCH_SIZE = 500

DEFAULT_DATA_DIR = Path(__file__).parent / "data" / "climate"

# Colonnes nécessaires (les ~150 autres sont skippées pour la mémoire)
USECOLS = ["NUM_POSTE", "NOM_USUEL", "LAT", "LON", "ALTI", "AAAAMM", "NUM_DECADE", "TM", "RR", "INST"]
DTYPE = {
    "NUM_POSTE": "string",
    "NOM_USUEL": "string",
    "LAT": "float64",
    "LON": "float64",
    "ALTI": "float64",
    "AAAAMM": "Int64",
    "NUM_DECADE": "Int64",
    "TM": "float64",
    "RR": "float64",
    "INST": "float64",
}


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def read_one(path: Path) -> pd.DataFrame | None:
    """Lit un csv.gz Météo-France, filtre la période, ne garde que les colonnes utiles."""
    # Météo-France utilise ; comme séparateur. Encoding parfois UTF-8, parfois Latin-1.
    for sep in (";", ","):
        for encoding in ("utf-8", "latin-1"):
            try:
                df = pd.read_csv(
                    path,
                    sep=sep,
                    encoding=encoding,
                    usecols=lambda c: c in USECOLS,
                    dtype=DTYPE,
                    compression="gzip",
                    low_memory=False,
                )
                if "NUM_POSTE" not in df.columns:
                    continue
                break
            except (UnicodeDecodeError, ValueError, pd.errors.ParserError):
                continue
        else:
            continue
        break
    else:
        print(f"  [skip] cannot parse {path.name}")
        return None

    # Filtre période de référence WMO 1991-2020
    df = df[
        (df["AAAAMM"] >= PERIOD_START_YYYYMM)
        & (df["AAAAMM"] <= PERIOD_END_YYYYMM)
    ]
    return df


def aggregate(df: pd.DataFrame) -> pd.DataFrame:
    """Calcule les normales annuelles par station avec filtre qualité."""
    df = df.copy()
    df["YEAR"] = (df["AAAAMM"] // 100).astype("Int64")

    # Agrégation : pour les sommes (RR, INST), min_count=1 fait que all-NaN → NaN
    agg = df.groupby("NUM_POSTE", as_index=False).agg(
        station_name=("NOM_USUEL", "first"),
        lat=("LAT", "first"),
        lon=("LON", "first"),
        alti=("ALTI", "first"),
        nb_years=("YEAR", "nunique"),
        nb_decades=("AAAAMM", "count"),
        temperature_c=("TM", "mean"),
        precip_sum=("RR", lambda x: x.sum(min_count=1)),
        precip_count=("RR", "count"),
        sunshine_sum_min=("INST", lambda x: x.sum(min_count=1)),
        sunshine_count=("INST", "count"),
    )

    # Filtre qualité : on veut au moins 25 années couvertes sur 30
    before = len(agg)
    agg = agg[agg["nb_years"] >= MIN_VALID_YEARS].copy()
    after = len(agg)
    print(f"  Filtre qualité ≥ {MIN_VALID_YEARS} ans : {after}/{before} stations gardées")

    # Cumuls annuels moyens
    # Précipitations : somme totale / nb années (mm/an)
    agg["precipitation_mm"] = np.where(
        agg["precip_count"] > 0,
        (agg["precip_sum"] / agg["nb_years"]).round(),
        np.nan,
    )
    # Ensoleillement : minutes → heures, puis / nb années (h/an)
    agg["sunshine_hours"] = np.where(
        agg["sunshine_count"] > 0,
        ((agg["sunshine_sum_min"] / 60) / agg["nb_years"]).round(),
        np.nan,
    )

    # Arrondi température à 1 décimale
    agg["temperature_c"] = agg["temperature_c"].round(1)

    return agg[
        [
            "NUM_POSTE", "station_name", "lat", "lon", "alti",
            "temperature_c", "precipitation_mm", "sunshine_hours",
            "nb_years",
        ]
    ]


def sanity_check_units(agg: pd.DataFrame) -> None:
    """Détecte les erreurs d'unités classiques (sunshine en heures × 60 ?)."""
    if "sunshine_hours" not in agg.columns:
        return
    valid_sun = agg["sunshine_hours"].dropna()
    if valid_sun.empty:
        return
    median = valid_sun.median()
    if median < 800:
        print(f"⚠  Sunshine median {median:.0f} h/an semble bas pour la France.")
        print(f"   La normale française est ~1969 h. Vérifier que INST est bien en MINUTES.")
    elif median > 3500:
        print(f"⚠  Sunshine median {median:.0f} h/an semble très élevé.")
        print(f"   Probable double conversion d'unités (INST déjà en heures ?). À vérifier.")
    else:
        print(f"✓  Sunshine median {median:.0f} h/an cohérent (référence FR ~1969 h/an)")


def to_py(v):
    """Convertit NaN/NA en None pour psycopg2."""
    if v is None or (isinstance(v, float) and np.isnan(v)) or pd.isna(v):
        return None
    return v


def insert(conn, agg: pd.DataFrame) -> int:
    rows = []
    for _, r in agg.iterrows():
        sid = str(r["NUM_POSTE"])[:8]
        rows.append((
            sid,
            to_py(r["station_name"]) or sid,
            to_py(r["lat"]),
            to_py(r["lon"]),
            to_py(int(r["alti"])) if pd.notna(r["alti"]) else None,
            to_py(r["temperature_c"]),
            to_py(int(r["precipitation_mm"])) if pd.notna(r["precipitation_mm"]) else None,
            to_py(int(r["sunshine_hours"])) if pd.notna(r["sunshine_hours"]) else None,
            1991,
            2020,
            SOURCE_TAG,
            to_py(r["lon"]),  # pour ST_MakePoint
            to_py(r["lat"]),
        ))

    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            execute_values(
                cur,
                """
                INSERT INTO climate_station_normales
                  (station_id, station_name, latitude, longitude, altitude_m,
                   temperature_c, precipitation_mm, sunshine_hours,
                   period_start, period_end, source, geom)
                VALUES %s
                ON CONFLICT (station_id) DO UPDATE SET
                  station_name = EXCLUDED.station_name,
                  latitude = EXCLUDED.latitude,
                  longitude = EXCLUDED.longitude,
                  altitude_m = EXCLUDED.altitude_m,
                  temperature_c = EXCLUDED.temperature_c,
                  precipitation_mm = EXCLUDED.precipitation_mm,
                  sunshine_hours = EXCLUDED.sunshine_hours,
                  period_start = EXCLUDED.period_start,
                  period_end = EXCLUDED.period_end,
                  source = EXCLUDED.source,
                  fetched_at = NOW(),
                  geom = EXCLUDED.geom
                """,
                batch,
                template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))",
            )
    conn.commit()
    return len(rows)


def print_stats(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS total,
                   COUNT(temperature_c) AS with_t,
                   COUNT(precipitation_mm) AS with_p,
                   COUNT(sunshine_hours) AS with_s,
                   ROUND(AVG(temperature_c)::numeric, 1) AS avg_t,
                   ROUND(AVG(precipitation_mm)::numeric) AS avg_p,
                   ROUND(AVG(sunshine_hours)::numeric) AS avg_s
            FROM climate_station_normales
        """)
        total, wt, wp, ws, at, ap, as_ = cur.fetchone()
    print(f"\nTable climate_station_normales :")
    print(f"  Total stations          : {total}")
    print(f"  Avec température        : {wt}  (moy. {at} °C)")
    print(f"  Avec précipitations     : {wp}  (moy. {ap} mm/an)")
    print(f"  Avec ensoleillement     : {ws}  (moy. {as_} h/an)")
    print(f"\nRéférence FR officielle : 13.0 °C · 935 mm/an · 1969 h/an")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR,
                        help=f"Dossier contenant les *.csv.gz (def. {DEFAULT_DATA_DIR})")
    args = parser.parse_args()

    files = sorted(args.data_dir.glob("*.csv.gz")) if args.data_dir.exists() else []
    if not files:
        print(f"Aucun *.csv.gz dans {args.data_dir}", file=sys.stderr)
        print(f"Télécharge le dataset 'Données climatologiques de base - décadaires'", file=sys.stderr)
        print(f"sur meteo.data.gouv.fr (un fichier par département × période),", file=sys.stderr)
        print(f"place-les dans ce dossier puis relance.", file=sys.stderr)
        sys.exit(1)

    print(f"=== Import Météo-France décadaires 1991-2020 ===")
    print(f"Source : {args.data_dir}")
    print(f"Fichiers : {len(files)}")

    parts = []
    total_rows_kept = 0
    for i, p in enumerate(files, 1):
        df = read_one(p)
        if df is None or df.empty:
            print(f"  [{i}/{len(files)}] {p.name} → vide après filtre")
            continue
        parts.append(df)
        total_rows_kept += len(df)
        if i % 10 == 0 or i == len(files):
            print(f"  [{i}/{len(files)}] {p.name} → {total_rows_kept:,} lignes cumulées")

    if not parts:
        print("Aucune ligne 1991-2020 trouvée dans les fichiers.", file=sys.stderr)
        sys.exit(2)

    print(f"\nConcaténation : {total_rows_kept:,} lignes")
    full = pd.concat(parts, ignore_index=True)
    print(f"Agrégation par station…")
    agg = aggregate(full)
    print(f"  {len(agg)} stations finales")

    sanity_check_units(agg)

    conn = get_connection()
    try:
        n = insert(conn, agg)
        print(f"\n✓ {n} stations insérées/mises à jour.")
        print_stats(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
