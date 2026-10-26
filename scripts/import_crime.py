#!/usr/bin/env python3
"""
Importe la délinquance enregistrée par la police et la gendarmerie (SSMSI) dans
PostgreSQL : maille communale, plus les départements et un agrégat France.

Source : https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales
Licence Ouverte 2.0.

Deux fichiers, même schéma :
  - COM (csv.gz, ~39 Mo, 5,2 M lignes) : 34 920 communes × 18 indicateurs × 10 ans
  - DEP (csv, ~2 Mo)                   : sert de référence, et sert à calculer la France

Secret statistique : `est_diffuse` vaut 'diff' ou autre chose. Le SSMSI publie le zéro
et les effectifs à partir de 5, et masque 1 à 4. Une valeur masquée n'est donc pas une
absence : c'est l'intervalle [1, 4] faits. On stocke NULL pour le nombre et le taux,
mais on renseigne TOUJOURS le dénominateur — c'est lui qui permettra à l'écran de
convertir ces bornes en taux et de dessiner la bande d'incertitude.

Les colonnes `complement_info_*` ne sont jamais affichées pour une commune : elles portent,
pour une valeur masquée, la moyenne des communes masquées du même département (leur
« nombre » est fractionnaire), pas la valeur de la commune. Elles servent seulement au
repère « communes de même taille » : additionnées, elles redonnent le total des faits
masqués du département, ce qui évite de sous-estimer les petites communes, presque toutes
sous secret.

Repère « communes de même taille » : chaque année, les communes sont réparties en cinq
tranches de population (TRANCHES) et le taux de chaque tranche est un rapport de sommes,
comme la France. Paris, Lyon et Marseille y comptent comme villes entières (le fichier
porte à la fois la ville et ses arrondissements : les deux compteraient double) ; leurs
arrondissements prennent la tranche de leur ville.

Usage :
    python import_crime.py                      # télécharge les deux fichiers
    python import_crime.py --com-file a.csv.gz --dep-file b.csv

Pré-requis : migration 015-crime-ssmsi.sql appliquée.
Environnement : POSTGRES_URL
"""

import argparse
import csv
import gzip
import os
import sys
from collections import defaultdict
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

BASE = "https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales"
COM_URL = f"{BASE}/20260709-115942/donnee-data.gouv-2025-geographie2026-produit-le2026-06-25.csv.gz"
DEP_URL = f"{BASE}/20260709-120038/donnee-dep-data.gouv-2025-geographie2026-produit-le2026-06-25.csv"

DATA_DIR = Path(__file__).parent / "data" / "crime"

# Tranches de population du repère « communes de même taille » : (code, borne basse).
# Simples à dire en une ligne ; la dernière ne compte qu'une douzaine de grandes villes.
TRANCHES = [(1, 0), (2, 2_000), (3, 10_000), (4, 50_000), (5, 200_000)]

# Arrondissements → ville entière. La ville est dans le fichier sous son propre code.
VILLE_DES_ARRONDISSEMENTS = (("751", "75056"), ("6938", "69123"), ("132", "13055"))


def tranche_of(population: int) -> int:
    return max(code for code, low in TRANCHES if population >= low)


def ville_of(code: str) -> str | None:
    """La ville d'un arrondissement de Paris, Lyon ou Marseille ; None pour une commune."""
    if code in ("75056", "69123", "13055"):
        return None
    for prefix, ville in VILLE_DES_ARRONDISSEMENTS:
        if code.startswith(prefix) and code != ville:
            return ville
    return None
BATCH_SIZE = 5000

# Le CSV du SSMSI est en point-virgule, virgule décimale, et son en-tête porte un BOM.
DELIM = ";"


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def download(url: str, dest: Path) -> Path:
    if dest.exists():
        print(f"  déjà présent : {dest.name}")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  téléchargement de {dest.name}…")
    with requests.get(url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    return dest


def open_csv(path: Path):
    """Ouvre le fichier (gz ou non) et rend un DictReader aux en-têtes nettoyés du BOM."""
    f = gzip.open(path, "rt", encoding="utf-8") if path.suffix == ".gz" else open(path, "r", encoding="utf-8")
    reader = csv.DictReader(f, delimiter=DELIM)
    reader.fieldnames = [c.strip("﻿\"") for c in reader.fieldnames]
    return f, reader


def to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


def to_float(v):
    """Le fichier utilise la virgule décimale ; 'NA' et '' valent absence."""
    if v is None or v in ("", "NA"):
        return None
    try:
        return float(v.replace(",", "."))
    except ValueError:
        return None


def deduce_bases(dep_path: Path) -> dict[str, str]:
    """
    Détermine, pour chaque indicateur, si son taux est rapporté aux habitants ou aux
    logements — en recalculant `nombre / taux × 1000` et en comparant aux deux
    dénominateurs candidats.

    Déduit plutôt que codé en dur : si le SSMSI change la base d'un indicateur, l'import
    suit sans qu'on ait à s'en apercevoir. Le fichier départemental suffit et tient en
    2 Mo, inutile de faire ce passage sur les 5,2 M lignes communales.
    """
    votes: dict[str, defaultdict] = defaultdict(lambda: defaultdict(int))
    f, reader = open_csv(dep_path)
    with f:
        for row in reader:
            n = to_int(row.get("nombre"))
            t = to_float(row.get("taux_pour_mille"))
            pop = to_int(row.get("insee_pop"))
            log = to_int(row.get("insee_log"))
            if not n or not t or not pop or not log:
                continue
            denom = n / t * 1000
            if abs(denom - pop) / pop < 0.02:
                votes[row["indicateur"]]["habitants"] += 1
            elif abs(denom - log) / log < 0.02:
                votes[row["indicateur"]]["logements"] += 1

    bases = {}
    for ind, v in votes.items():
        bases[ind] = max(v, key=v.get)
    return bases


def import_communes(conn, com_path: Path, bases: dict[str, str]):
    """
    Insère les 5,2 M lignes communales en streaming — jamais tout en mémoire — et cumule au
    passage les faits et dénominateurs par tranche de population.

    Rend le nombre de lignes, les cumuls par (tranche, année, indicateur) et la dernière
    population connue de chaque commune.
    """
    f, reader = open_csv(com_path)
    total = 0
    batch = []
    tranches = defaultdict(lambda: [0.0, 0])  # (tranche, annee, indicateur) -> [faits, dénominateur]
    populations: dict[str, tuple[int, int]] = {}  # code -> (annee, population)
    with f, conn.cursor() as cur:
        for row in reader:
            ind = row["indicateur"]
            code = row["CODGEO_2026"]
            annee = int(row["annee"])
            base = bases.get(ind, "habitants")
            denom = to_int(row.get("insee_log" if base == "logements" else "insee_pop"))
            if not denom:
                continue  # sans dénominateur, ni taux ni bande ne sont calculables

            diffuse = row.get("est_diffuse") == "diff"
            nombre = to_int(row.get("nombre")) if diffuse else None
            batch.append((
                code,
                annee,
                ind,
                nombre,
                to_float(row.get("taux_pour_mille")) if diffuse else None,
                denom,
            ))

            pop = to_int(row.get("insee_pop"))
            if pop:
                if code not in populations or annee > populations[code][0]:
                    populations[code] = (annee, pop)
                # Les arrondissements sont déjà comptés dans leur ville.
                if ville_of(code) is None:
                    faits = nombre if diffuse else to_float(row.get("complement_info_nombre"))
                    if faits is not None:
                        acc = tranches[(tranche_of(pop), annee, ind)]
                        acc[0] += faits
                        acc[1] += denom

            if len(batch) >= BATCH_SIZE:
                total += flush_communes(cur, batch)
                batch.clear()
                if total % 500_000 < BATCH_SIZE:
                    print(f"    {total:,} lignes…")
        if batch:
            total += flush_communes(cur, batch)
    conn.commit()
    return total, tranches, populations


def import_tranches(conn, tranches, populations) -> tuple[int, int]:
    """
    Écrit les taux des tranches dans `crime_reference` (codes 'T1' à 'T5') et la tranche
    de chaque commune dans `crime_commune_tranche`.
    """
    rows = [
        (f"T{tranche}", annee, ind, round(faits / denom * 1000, 4))
        for (tranche, annee, ind), (faits, denom) in tranches.items()
        if denom
    ]
    communes = []
    for code, (annee, pop) in populations.items():
        ville = ville_of(code)
        ref_annee, ref_pop = populations.get(ville, (annee, pop)) if ville else (annee, pop)
        communes.append((code, tranche_of(ref_pop), ref_pop, ref_annee))

    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            execute_values(
                cur,
                """
                INSERT INTO crime_reference (code, annee, indicateur, taux_pour_mille)
                VALUES %s
                ON CONFLICT (code, annee, indicateur) DO UPDATE SET
                  taux_pour_mille = EXCLUDED.taux_pour_mille
                """,
                rows[i:i + BATCH_SIZE],
            )
        for i in range(0, len(communes), BATCH_SIZE):
            execute_values(
                cur,
                """
                INSERT INTO crime_commune_tranche (code_commune, tranche, population, annee)
                VALUES %s
                ON CONFLICT (code_commune) DO UPDATE SET
                  tranche = EXCLUDED.tranche,
                  population = EXCLUDED.population,
                  annee = EXCLUDED.annee
                """,
                communes[i:i + BATCH_SIZE],
            )
    conn.commit()
    return len(rows), len(communes)


def flush_communes(cur, batch) -> int:
    execute_values(
        cur,
        """
        INSERT INTO crime_commune
          (code_commune, annee, indicateur, nombre, taux_pour_mille, denominateur)
        VALUES %s
        ON CONFLICT (code_commune, annee, indicateur) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          taux_pour_mille = EXCLUDED.taux_pour_mille,
          denominateur = EXCLUDED.denominateur
        """,
        batch,
    )
    return len(batch)


def import_references(conn, dep_path: Path, bases: dict[str, str]) -> tuple[int, int]:
    """
    Insère les taux départementaux, puis calcule la France.

    La France est un rapport de sommes — SUM(nombre) / SUM(dénominateur) × 1000 — et non
    une moyenne des taux départementaux, qui pondérerait la Lozère comme le Nord.
    """
    rows = []
    france = defaultdict(lambda: [0, 0])  # (annee, indicateur) -> [faits, dénominateur]

    f, reader = open_csv(dep_path)
    with f:
        for row in reader:
            ind = row["indicateur"]
            annee = int(row["annee"])
            taux = to_float(row.get("taux_pour_mille"))
            if taux is not None:
                rows.append((row["Code_departement"], annee, ind, taux))

            base = bases.get(ind, "habitants")
            denom = to_int(row.get("insee_log" if base == "logements" else "insee_pop"))
            n = to_int(row.get("nombre"))
            if n is not None and denom:
                acc = france[(annee, ind)]
                acc[0] += n
                acc[1] += denom

    for (annee, ind), (faits, denom) in france.items():
        if denom:
            rows.append(("FRANCE", annee, ind, round(faits / denom * 1000, 4)))

    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            execute_values(
                cur,
                """
                INSERT INTO crime_reference (code, annee, indicateur, taux_pour_mille)
                VALUES %s
                ON CONFLICT (code, annee, indicateur) DO UPDATE SET
                  taux_pour_mille = EXCLUDED.taux_pour_mille
                """,
                rows[i:i + BATCH_SIZE],
            )
    conn.commit()
    return len(rows), len(france)


def insert_bases(conn, bases: dict[str, str]) -> None:
    with conn.cursor() as cur:
        execute_values(
            cur,
            """
            INSERT INTO crime_indicateur (indicateur, base) VALUES %s
            ON CONFLICT (indicateur) DO UPDATE SET base = EXCLUDED.base
            """,
            sorted(bases.items()),
        )
    conn.commit()


def print_stats(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*), COUNT(taux_pour_mille), COUNT(DISTINCT code_commune),
                   COUNT(DISTINCT indicateur), MIN(annee), MAX(annee)
            FROM crime_commune
        """)
        total, publie, communes, inds, amin, amax = cur.fetchone()
        cur.execute("SELECT COUNT(*) FROM crime_reference WHERE code = 'FRANCE'")
        (nb_fr,) = cur.fetchone()

    print("\nTable crime_commune :")
    print(f"  Lignes                  : {total:,}")
    print(f"  Dont valeur publiée     : {publie:,}  ({publie * 100 // max(total, 1)} %)")
    print(f"  Communes / indicateurs  : {communes:,} / {inds}")
    print(f"  Années                  : {amin}-{amax}")
    print(f"  Lignes FRANCE           : {nb_fr}")

    with conn.cursor() as cur:
        cur.execute("""
            SELECT t.tranche, COUNT(*), r.taux_pour_mille
              FROM crime_commune_tranche t
              LEFT JOIN crime_reference r
                ON r.code = 'T' || t.tranche AND r.annee = 2025
               AND r.indicateur = 'Cambriolages de logement'
             GROUP BY t.tranche, r.taux_pour_mille ORDER BY t.tranche
        """)
        print("\nTranches (communes classées, cambriolages 2025 pour 1 000 logements) :")
        for tranche, nb, taux in cur.fetchall():
            print(f"  T{tranche} : {nb:>6,} communes  {float(taux) if taux else 0:6.2f} ‰")

    # Contrôle : les valeurs relevées à la main sur le fichier départemental.
    attendu = {
        "Cambriolages de logement": 5.05,
        "Vols dans les véhicules": 6.61,
        "Violences physiques hors cadre familial": 5.27,
    }
    with conn.cursor() as cur:
        cur.execute("""
            SELECT indicateur, taux_pour_mille FROM crime_reference
            WHERE code = '75' AND annee = 2025 AND indicateur = ANY(%s)
        """, (list(attendu),))
        got = dict(cur.fetchall())
    print("\nContrôle Paris (dép. 75) 2025 :")
    for ind, ref in attendu.items():
        v = got.get(ind)
        ok = v is not None and abs(float(v) - ref) < 0.05
        print(f"  {'✓' if ok else '⚠'} {ind[:42]:42s} {float(v) if v else 0:6.2f} ‰ (attendu {ref})")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--com-file", type=Path, help="csv.gz communal (sinon téléchargé)")
    parser.add_argument("--dep-file", type=Path, help="csv départemental (sinon téléchargé)")
    args = parser.parse_args()

    print("=== Import délinquance SSMSI ===")
    com = args.com_file or download(COM_URL, DATA_DIR / "com.csv.gz")
    dep = args.dep_file or download(DEP_URL, DATA_DIR / "dep.csv")

    print("Déduction de la base de calcul par indicateur…")
    bases = deduce_bases(dep)
    for ind, b in sorted(bases.items()):
        if b == "logements":
            print(f"  {ind} → pour 1 000 {b}")
    print(f"  {len(bases)} indicateurs, les autres pour 1 000 habitants")

    conn = get_connection()
    try:
        insert_bases(conn, bases)
        print("Import des références départementales et de la France…")
        n_ref, n_fr = import_references(conn, dep, bases)
        print(f"  {n_ref:,} lignes ({n_fr} combinaisons France)")
        print("Import des communes (streaming)…")
        n, tranches, populations = import_communes(conn, com, bases)
        print(f"  {n:,} lignes")
        print("Repère « communes de même taille »…")
        n_t, n_c = import_tranches(conn, tranches, populations)
        print(f"  {n_t:,} taux de tranche, {n_c:,} communes classées")
        print_stats(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
