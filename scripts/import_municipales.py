#!/usr/bin/env python3
"""
Importe les résultats des élections municipales des 15 et 22 mars 2026.

Source : Ministère de l'Intérieur via data.gouv.fr, Licence Ouverte 2.0.
  T1 https://www.data.gouv.fr/datasets/elections-municipales-2026-resultats-du-premier-tour
  T2 https://www.data.gouv.fr/datasets/elections-municipales-2026-resultats-du-second-tour

Format : CSV `;`, **large**. Les colonnes de participation sont suivies d'un bloc de
13 colonnes répété par liste (« Numéro de panneau 1 », « Nom candidat 1 », …, « Sièges au
CM 1 », puis « … 2 », etc.), jusqu'à 13 listes. On dépivote en s'arrêtant au premier bloc
sans voix.

Deux pièges de la source, traités ici :

1. `Nuance liste` est VIDE dans 91 % des communes — l'État ne nuance que les communes
   d'une certaine taille. On stocke NULL, jamais "" : c'est ce qui distingue « pas de
   couleur politique publiée » de « nuance inconnue ». Sans nuance, l'écran bascule sur
   un affichage sans couleur (participation + listes + sièges).
2. `Code commune` est déjà l'INSEE complet (75056, 2A004, 97209). Pas de concaténation
   avec le département — la faire produirait des codes à 7 caractères.

Usage :
    python import_municipales.py
    python import_municipales.py --t1-file a.csv --t2-file b.csv

Pré-requis : migration 016-municipales-2026.sql appliquée.
Environnement : POSTGRES_URL
"""

import argparse
import csv
import os
import sys
from collections import defaultdict
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

T1_DATASET = "elections-municipales-2026-resultats-du-premier-tour"
T2_DATASET = "elections-municipales-2026-resultats-du-second-tour"
RESOURCE_PREFIX = "Municipales 2026 - Résultats - Communes"

DATA_DIR = Path(__file__).parent / "data" / "municipales"
BATCH_SIZE = 2000
MAX_LISTES = 13

# csv accepte des lignes très larges ; le défaut suffit ici mais on reste explicite.
csv.field_size_limit(10_000_000)


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def resolve_url(dataset: str) -> str:
    meta = requests.get(f"https://www.data.gouv.fr/api/1/datasets/{dataset}/", timeout=60)
    meta.raise_for_status()
    for r in meta.json()["resources"]:
        if r["title"].startswith(RESOURCE_PREFIX):
            return r["url"]
    raise RuntimeError(f"Ressource « {RESOURCE_PREFIX} » introuvable dans {dataset}")


def download(dataset: str, dest: Path) -> Path:
    if dest.exists():
        print(f"  déjà présent : {dest.name}")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    url = resolve_url(dataset)
    print(f"  téléchargement de {dest.name}…")
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    return dest


def to_int(v):
    if v is None:
        return None
    v = v.strip().replace(" ", "").replace(" ", "")
    try:
        return int(v)
    except ValueError:
        return None


def to_pct(v):
    """« 50,81% » → 50.81. La source mêle virgule décimale et suffixe pourcent."""
    if not v:
        return None
    v = v.strip().rstrip("%").replace(",", ".").replace(" ", "").replace(" ", "")
    try:
        return float(v)
    except ValueError:
        return None


def blank_to_none(v):
    v = (v or "").strip()
    return v or None


def parse_tour(path: Path, tour: int):
    """Rend (lignes commune, lignes listes) pour un tour."""
    communes, listes = [], []
    with open(path, encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter=";")
        reader.fieldnames = [c.strip("﻿\"") for c in reader.fieldnames]
        for row in reader:
            code = (row.get("Code commune") or "").strip()
            inscrits = to_int(row.get("Inscrits"))
            exprimes = to_int(row.get("Exprimés"))
            if not code or inscrits is None or exprimes is None:
                continue

            communes.append((
                code, tour, inscrits,
                to_int(row.get("Votants")) or 0,
                exprimes,
                to_int(row.get("Blancs")),
                to_int(row.get("Nuls")),
            ))

            for i in range(1, MAX_LISTES + 1):
                voix = to_int(row.get(f"Voix {i}"))
                if voix is None:
                    break  # blocs contigus : le premier vide clôt la liste
                libelle = (
                    blank_to_none(row.get(f"Libellé abrégé de liste {i}"))
                    or blank_to_none(row.get(f"Libellé de liste {i}"))
                    or f"Liste {i}"
                )
                nom = blank_to_none(row.get(f"Nom candidat {i}"))
                prenom = blank_to_none(row.get(f"Prénom candidat {i}"))
                tete = f"{prenom} {nom}".strip() if (nom or prenom) else None
                listes.append((
                    code, tour, to_int(row.get(f"Numéro de panneau {i}")) or i,
                    blank_to_none(row.get(f"Nuance liste {i}")),
                    libelle,
                    tete,
                    voix,
                    to_pct(row.get(f"% Voix/exprimés {i}")) or 0.0,
                    to_int(row.get(f"Sièges au CM {i}")),
                ))
    return communes, listes


def compute_france(communes, listes):
    """
    Score national par nuance, sur les seules communes nuancées.

    Y mêler les communes sans nuance gonflerait le dénominateur de voix qu'aucune nuance
    ne peut réclamer, et écraserait tous les pourcentages.
    """
    # Communes portant au moins une nuance : ce sont les seules dont les exprimés
    # entrent au dénominateur.
    nuancees = {liste[0] for liste in listes if liste[3]}
    exprimes_par_commune = {(c[0], c[1]): c[4] for c in communes}

    par_tour = defaultdict(lambda: [defaultdict(int), 0])  # tour -> [voix par nuance, total]
    vus = set()
    for l in listes:
        code, tour, nuance, voix = l[0], l[1], l[3], l[6]
        if code not in nuancees:
            continue
        if nuance:
            par_tour[tour][0][nuance] += voix
        if (code, tour) not in vus:
            vus.add((code, tour))
            par_tour[tour][1] += exprimes_par_commune.get((code, tour), 0)

    rows = []
    for tour, (par_nuance, total) in par_tour.items():
        if not total:
            continue
        for nuance, voix in par_nuance.items():
            rows.append((tour, nuance, voix, round(voix / total * 100, 2)))
    return rows


def insert(conn, table, columns, rows, conflict):
    if not rows:
        return 0
    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            execute_values(
                cur,
                f"INSERT INTO {table} ({', '.join(columns)}) VALUES %s ON CONFLICT {conflict}",
                rows[i:i + BATCH_SIZE],
            )
    conn.commit()
    return len(rows)


def print_stats(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT tour, COUNT(*) FROM municipales_2026_commune GROUP BY tour ORDER BY tour")
        tours = cur.fetchall()
        cur.execute("""
            SELECT COUNT(DISTINCT code_commune),
                   COUNT(DISTINCT code_commune) FILTER (WHERE nuance IS NOT NULL)
            FROM municipales_2026_listes
        """)
        avec_liste, avec_nuance = cur.fetchone()
        cur.execute("SELECT tour, COUNT(*) FROM municipales_2026_france GROUP BY tour ORDER BY tour")
        france = cur.fetchall()

    print("\nTables municipales 2026 :")
    for tour, n in tours:
        print(f"  Communes au tour {tour}   : {n:,}")
    print(f"  Communes avec liste    : {avec_liste:,}")
    print(f"  … dont nuancées        : {avec_nuance:,}  (attendu ≈ 3 282)")
    for tour, n in france:
        print(f"  Nuances France tour {tour} : {n}")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT libelle, voix, sieges_cm, nuance
            FROM municipales_2026_listes
            WHERE code_commune = '01001' AND tour = 1
        """)
        rows = cur.fetchall()
    print("\nContrôle L'Abergement-Clémenciat (01001) :")
    for libelle, voix, sieges, nuance in rows:
        print(f"  {libelle[:44]:44s} {voix:5d} voix · {sieges} sièges · nuance={nuance!r}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--t1-file", type=Path)
    parser.add_argument("--t2-file", type=Path)
    args = parser.parse_args()

    print("=== Import municipales 2026 ===")
    t1 = args.t1_file or download(T1_DATASET, DATA_DIR / "t1.csv")
    t2 = args.t2_file or download(T2_DATASET, DATA_DIR / "t2.csv")

    communes, listes = [], []
    for path, tour in ((t1, 1), (t2, 2)):
        c, l = parse_tour(path, tour)
        print(f"  tour {tour} : {len(c):,} communes, {len(l):,} listes")
        communes += c
        listes += l

    conn = get_connection()
    try:
        n = insert(
            conn, "municipales_2026_commune",
            ["code_commune", "tour", "inscrits", "votants", "exprimes", "blancs", "nuls"],
            communes,
            "(code_commune, tour) DO UPDATE SET inscrits = EXCLUDED.inscrits, "
            "votants = EXCLUDED.votants, exprimes = EXCLUDED.exprimes, "
            "blancs = EXCLUDED.blancs, nuls = EXCLUDED.nuls",
        )
        print(f"\n✓ {n:,} lignes commune")

        n = insert(
            conn, "municipales_2026_listes",
            ["code_commune", "tour", "panneau", "nuance", "libelle", "tete_de_liste",
             "voix", "pct_exprimes", "sieges_cm"],
            listes,
            "(code_commune, tour, panneau) DO UPDATE SET nuance = EXCLUDED.nuance, "
            "libelle = EXCLUDED.libelle, tete_de_liste = EXCLUDED.tete_de_liste, "
            "voix = EXCLUDED.voix, pct_exprimes = EXCLUDED.pct_exprimes, "
            "sieges_cm = EXCLUDED.sieges_cm",
        )
        print(f"✓ {n:,} lignes liste")

        fr = compute_france(communes, listes)
        n = insert(
            conn, "municipales_2026_france",
            ["tour", "nuance", "voix", "pct_exprimes"], fr,
            "(tour, nuance) DO UPDATE SET voix = EXCLUDED.voix, "
            "pct_exprimes = EXCLUDED.pct_exprimes",
        )
        print(f"✓ {n} agrégats France")
        print_stats(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
