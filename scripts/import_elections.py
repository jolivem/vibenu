#!/usr/bin/env python3
"""
Import results of the 2022 French presidential election (1st round) into PostgreSQL,
aggregated at the commune level + national aggregate.

Source : Ministère de l'Intérieur via data.gouv.fr.
Page :   https://www.data.gouv.fr/fr/datasets/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour/

Recommended file : "resultats-par-niveau-burvot-t1-france-entiere.xlsx" (31,9 Mo)
The script aggregates the per-bureau-de-vote rows into commune totals.

Usage :
    python import_elections.py --file /path/to/resultats-par-niveau-burvot-t1-france-entiere.xlsx

Environment :
    POSTGRES_URL - PostgreSQL connection string
"""

import argparse
import io
import os
import sys

import pandas as pd
import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

# Référentiel candidats T1 2022 (ordre du panneau officiel — invariant)
CANDIDATS = [
    ("Arthaud", "LO"),
    ("Roussel", "PCF"),
    ("Macron", "REN"),
    ("Lassalle", "RES"),
    ("Le Pen", "RN"),
    ("Zemmour", "REC"),
    ("Mélenchon", "LFI"),
    ("Hidalgo", "PS"),
    ("Jadot", "EELV"),
    ("Pécresse", "LR"),
    ("Poutou", "NPA"),
    ("Dupont-Aignan", "DLF"),
]

BATCH_SIZE = 1000


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def load_xlsx(file_path: str | None, url: str | None) -> pd.DataFrame:
    if file_path:
        print(f"Reading {file_path}")
        return pd.read_excel(file_path, header=0, engine="openpyxl")
    if url:
        print(f"Downloading {url}")
        resp = requests.get(url, stream=True, timeout=300)
        resp.raise_for_status()
        return pd.read_excel(io.BytesIO(resp.content), header=0, engine="openpyxl")
    print("Error: provide --file or --url.", file=sys.stderr)
    sys.exit(1)


def find_col(cols, *substrings: str) -> str:
    for c in cols:
        n = str(c).lower().strip()
        if all(s in n for s in substrings):
            return c
    raise KeyError(
        f"No column matches all of {substrings}. Available (first 30): {list(cols)[:30]}"
    )


def parse_dataframe(df: pd.DataFrame):
    """
    Aggregate any granularity (burvot, com, subcom) into commune-level rows
    by GROUP BY (code_dep + code_com), summing inscrits/votants/exprimes/voix,
    then recomputing percentages.

    Returns :
      commune_rows : (code_commune, inscrits, votants, exprimes)
      result_rows  : (code_commune, candidat, parti, panneau, voix, pct_exprimes)
    """
    cols = list(df.columns)

    # Métadonnées commune (par nom de colonne)
    code_dep_col = find_col(cols, "code", "dép") if any("dép" in str(c).lower() for c in cols) else find_col(cols, "code", "dep")
    code_com_col = find_col(cols, "code", "commune")
    inscrits_col = find_col(cols, "inscrits")
    votants_col = find_col(cols, "votants")
    exprimes_col = find_col(cols, "exprim")

    # Localisation des blocs candidats (par position).
    # Le fichier officiel a un en-tête à 2 niveaux : seul le 1er bloc est nommé
    # ("N°Panneau"..."% Voix/Exp"), les 11 suivants apparaissent comme "Unnamed: NN".
    # Structure d'un bloc : [N°Panneau, Sexe, Nom, Prénom, Voix, %Voix/Ins, %Voix/Exp]
    try:
        first_panneau_idx = cols.index(find_col(cols, "n°panneau") if any("n°panneau" in str(c).lower() for c in cols) else find_col(cols, "panneau"))
    except KeyError:
        # Fallback : 1er bloc commence après "% Exp/Vot" (col 20 typiquement)
        first_panneau_idx = next(
            (i for i, c in enumerate(cols) if "exp/vot" in str(c).lower()), -1,
        ) + 1
    BLOCK_SIZE = 7
    NUM_CANDIDATES = 12
    voix_cols = []
    pct_exp_cols = []
    for k in range(NUM_CANDIDATES):
        base = first_panneau_idx + k * BLOCK_SIZE
        if base + 6 >= len(cols):
            break
        voix_cols.append(cols[base + 4])      # offset 4 = Voix
        pct_exp_cols.append(cols[base + 6])   # offset 6 = % Voix/Exp

    if len(voix_cols) != NUM_CANDIDATES or len(pct_exp_cols) != NUM_CANDIDATES:
        print(
            f"Error: expected {NUM_CANDIDATES} candidate blocks (positional), "
            f"found voix={len(voix_cols)}, pct_exp={len(pct_exp_cols)}, "
            f"first_panneau_idx={first_panneau_idx}, total cols={len(cols)}",
            file=sys.stderr,
        )
        print(f"All columns:\n{cols}", file=sys.stderr)
        sys.exit(1)

    print(f"Detected granularity : {len(df)} input rows.")
    print("Building commune-level aggregates (GROUP BY code_commune)...")

    # Construire le code commune INSEE = dep + com (3 chiffres)
    df = df.copy()
    df["_code_dep"] = df[code_dep_col].astype(str).str.strip().str.zfill(2)
    df["_code_com"] = df[code_com_col].astype(str).str.strip().str.zfill(3)
    df["_code_commune"] = (df["_code_dep"] + df["_code_com"]).str[:5]

    # Forcer les numériques pour pouvoir sommer
    df["_inscrits"] = pd.to_numeric(df[inscrits_col], errors="coerce").fillna(0).astype(int)
    df["_votants"] = pd.to_numeric(df[votants_col], errors="coerce").fillna(0).astype(int)
    df["_exprimes"] = pd.to_numeric(df[exprimes_col], errors="coerce").fillna(0).astype(int)
    for vc in voix_cols:
        df[vc] = pd.to_numeric(df[vc], errors="coerce").fillna(0).astype(int)

    agg = (
        df.groupby("_code_commune")
        .agg(
            inscrits=("_inscrits", "sum"),
            votants=("_votants", "sum"),
            exprimes=("_exprimes", "sum"),
            **{f"_voix_{i}": (vc, "sum") for i, vc in enumerate(voix_cols)},
        )
        .reset_index()
    )

    print(f"Aggregated to {len(agg)} unique communes.")

    commune_rows = []
    result_rows = []

    for _, row in agg.iterrows():
        code_commune = str(row["_code_commune"])
        inscrits = int(row["inscrits"])
        votants = int(row["votants"])
        exprimes = int(row["exprimes"])
        if exprimes <= 0:
            continue
        commune_rows.append((code_commune, inscrits, votants, exprimes))

        for i, (candidat, parti) in enumerate(CANDIDATS):
            voix = int(row[f"_voix_{i}"])
            pct_exprimes = round(100.0 * voix / exprimes, 2)
            result_rows.append((code_commune, candidat, parti, i + 1, voix, pct_exprimes))

    return commune_rows, result_rows


def insert_data(conn, commune_rows, result_rows):
    with conn.cursor() as cur:
        print("Truncating existing tables...")
        cur.execute(
            "TRUNCATE elections_pres_2022_t1_results, elections_pres_2022_t1_commune CASCADE;"
        )

        print(f"Inserting {len(commune_rows)} communes...")
        execute_values(
            cur,
            "INSERT INTO elections_pres_2022_t1_commune (code_commune, inscrits, votants, exprimes) VALUES %s",
            commune_rows,
            page_size=BATCH_SIZE,
        )

        print(f"Inserting {len(result_rows)} candidate results...")
        execute_values(
            cur,
            "INSERT INTO elections_pres_2022_t1_results (code_commune, candidat, parti, panneau, voix, pct_exprimes) VALUES %s",
            result_rows,
            page_size=BATCH_SIZE,
        )

        # Agrégat national
        print("Computing national aggregate...")
        cur.execute("""
            INSERT INTO elections_pres_2022_t1_commune (code_commune, inscrits, votants, exprimes)
            SELECT 'FRANCE', SUM(inscrits), SUM(votants), SUM(exprimes)
            FROM elections_pres_2022_t1_commune;
        """)
        cur.execute("""
            WITH totals AS (
              SELECT SUM(voix) AS total_exprimes_national
              FROM elections_pres_2022_t1_results
              WHERE code_commune <> 'FRANCE'
            )
            INSERT INTO elections_pres_2022_t1_results
              (code_commune, candidat, parti, panneau, voix, pct_exprimes)
            SELECT
              'FRANCE',
              candidat, parti, panneau,
              SUM(voix),
              ROUND(100.0 * SUM(voix) / NULLIF((SELECT total_exprimes_national FROM totals), 0), 2)
            FROM elections_pres_2022_t1_results
            WHERE code_commune <> 'FRANCE'
            GROUP BY candidat, parti, panneau
            ORDER BY panneau;
        """)

    conn.commit()


def main():
    parser = argparse.ArgumentParser(
        description="Import présidentielle 2022 T1 — agrégé au niveau commune depuis n'importe quelle granularité."
    )
    parser.add_argument(
        "--file",
        help="Local path to resultats-par-niveau-burvot|com|subcom-t1-france-entiere.xlsx",
    )
    parser.add_argument("--url", help="Direct URL to the XLSX (fallback if --file not given)")
    args = parser.parse_args()

    df = load_xlsx(args.file, args.url)
    print(f"Loaded {len(df)} rows × {len(df.columns)} columns.")

    commune_rows, result_rows = parse_dataframe(df)
    if not commune_rows:
        print("Error: no rows parsed.", file=sys.stderr)
        sys.exit(1)

    conn = get_connection()
    try:
        insert_data(conn, commune_rows, result_rows)
        print(
            f"Done. {len(commune_rows)} communes + national aggregate, "
            f"{len(result_rows)} results."
        )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
