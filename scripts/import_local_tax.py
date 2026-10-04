#!/usr/bin/env python3
"""
Importe la fiscalité locale et les comptes des communes (DGFiP) dans PostgreSQL.

Source : https://data.economie.gouv.fr — Licence Ouverte 2.0. Trois jeux, exportés en
CSV par l'API Opendatasoft (point-virgule, point décimal, en-tête avec BOM) :

  - taux          « Fiscalité locale des particuliers » : une ligne par commune et par
                  exercice (2021-2025, ~175 000 lignes). Clé `insee_com`.
  - deliberations « Délibérations de fiscalité directe locale des communes (hors taux) »,
                  millésime 2026 : périmètre de la taxe sur les logements vacants et
                  majoration de la taxe d'habitation sur les résidences secondaires.
  - comptes       « Comptes individuels des communes », exercices 2021 à 2025 (quatre
                  jeux) : euros par habitant (préfixe `f`) et moyenne de la strate
                  (préfixe `m`).

Les identifiants des délibérations et des comptes sont MILLÉSIMÉS : chaque année, un
nouveau jeu paraît sous une nouvelle URL. Mettre à jour les constantes ci-dessous (ajouter
le nouveau jeu de comptes à la liste), puis relancer.

Pièges :
  - Aucune ligne par arrondissement de Paris, Lyon ou Marseille : les taux sont votés
    par la ville. L'application rabat l'arrondissement sur sa ville à la lecture.
  - TEOM : un taux nul signifie que les déchets sont financés autrement (redevance ou
    budget général). On stocke NULL, jamais 0.
  - Délibérations : `depcom` est typé entier (zéros de tête perdus) et vaut NULL pour
    la Corse, qu'on reconstitue par le libellé du département.
  - Comptes : `dep` tient sur 3 caractères (« 069 », « 02A ») ; les DOM sont recodés
    101 à 106, et leur code commune se lit « 97 » + `icom`.

Les repères (départements et France) sont des MÉDIANES de communes et des décomptes
(communes en zone de taxe sur les logements vacants, communes ayant voté une majoration),
calculés ici.

Usage :
    python import_local_tax.py                     # télécharge et importe les trois jeux
    python import_local_tax.py --only taux
    python import_local_tax.py --taux-file a.csv --deliberations-file b.csv --comptes-file c.csv d.csv

Pré-requis : migration 020-local-tax.sql appliquée.
Environnement : POSTGRES_URL
"""

import argparse
import csv
import os
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlencode

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

BASE = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets"

TAUX_DATASET = "fiscalite-locale-des-particuliers"
DELIB_DATASET = "deliberations-de-fiscalite-directe-locale-des-communes-2026-hors-taux"
DELIB_ANNEE = 2026
# Un jeu par exercice ou par paire d'exercices : cinq ans, pour montrer une évolution.
COMPTES_DATASETS = [
    "comptes-individuels-des-communes-fichier-global-2021",
    "comptes-individuels-des-communes-fichier-global-2022",
    "comptes-individuels-des-communes-fichier-global-2023-2024",
    "comptes-individuels-des-communes-fichier-global-2025",
]

TAUX_COLS = [
    "exercice", "insee_com", "mpoid", "q03", "e12vote", "e32vote", "taux_global_tfb",
    "taux_plein_teom", "taux_global_th", "ind_majothrs", "thsurtaxrstau",
]
DELIB_COLS = ["dep", "depcom", "com", "libdep", "indtlv", "thsurtaxrstau"]
COMPTES_COLS = [
    "an", "dep", "icom", "pop1", "fdette", "mdette", "fimpo1", "mimpo1",
    "fequip", "mequip", "fcaf", "mcaf",
]

DATA_DIR = Path(__file__).parent / "data" / "local_tax"
BATCH_SIZE = 5000
DELIM = ";"

INSEE_RE = re.compile(r"^(\d{2}|2[AB])\d{3}$")
CORSE = {"CORSE-DU-SUD": "2A", "HAUTE-CORSE": "2B"}


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def export_url(dataset: str, cols: list[str]) -> str:
    """Export CSV limité aux colonnes utiles : le jeu des comptes en compte 249."""
    params = urlencode({"delimiter": DELIM, "select": ",".join(cols)})
    return f"{BASE}/{dataset}/exports/csv?{params}"


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
    """Rend un DictReader aux en-têtes nettoyés du BOM."""
    f = open(path, "r", encoding="utf-8")
    reader = csv.DictReader(f, delimiter=DELIM)
    reader.fieldnames = [c.strip("﻿\"") for c in reader.fieldnames]
    return f, reader


def to_int(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def to_float(v):
    if v is None or v == "":
        return None
    try:
        return float(v.replace(",", "."))
    except ValueError:
        return None


def departement_of(code: str) -> str:
    return code[:3] if code.startswith("97") else code[:2]


def upsert(conn, sql: str, rows: list[tuple]) -> None:
    with conn.cursor() as cur:
        for i in range(0, len(rows), BATCH_SIZE):
            execute_values(cur, sql, rows[i:i + BATCH_SIZE])
    conn.commit()


def import_taux(conn, path: Path) -> tuple[int, int, int]:
    rows: list[tuple] = []
    # (code de référence, année) → taux, pour les médianes.
    tfb: dict[tuple[str, int], list[float]] = defaultdict(list)
    teom: dict[tuple[str, int], list[float]] = defaultdict(list)
    th: dict[tuple[str, int], list[float]] = defaultdict(list)
    rejets = 0

    f, reader = open_csv(path)
    with f:
        for row in reader:
            code = (row.get("insee_com") or "").strip().upper()
            annee = to_int(row.get("exercice"))
            if not INSEE_RE.match(code) or annee is None:
                rejets += 1
                continue

            taux_global = to_float(row.get("taux_global_tfb"))
            # Un taux nul veut dire « pas de TEOM », pas « TEOM à 0 % ».
            taux_teom = to_float(row.get("taux_plein_teom")) or None
            taux_th = to_float(row.get("taux_global_th"))
            majoration = {"OUI": True, "NON": False}.get((row.get("ind_majothrs") or "").strip().upper())

            rows.append((
                code, annee, taux_global,
                to_float(row.get("e12vote")), to_float(row.get("e32vote")),
                taux_teom, taux_th,
                majoration, to_float(row.get("thsurtaxrstau")) if majoration else None,
                to_int(row.get("mpoid")), (row.get("q03") or "").strip() or None,
            ))

            for ref in (departement_of(code), "FRANCE"):
                if taux_global is not None:
                    tfb[(ref, annee)].append(taux_global)
                if taux_teom is not None:
                    teom[(ref, annee)].append(taux_teom)
                if taux_th is not None:
                    th[(ref, annee)].append(taux_th)

    upsert(conn, """
        INSERT INTO local_tax_commune
          (code_commune, annee, taux_tfb_global, taux_tfb_commune, taux_tfb_epci, taux_teom,
           taux_th, majoration_rs, taux_majoration_rs, population, nom_epci)
        VALUES %s
        ON CONFLICT (code_commune, annee) DO UPDATE SET
          taux_tfb_global = EXCLUDED.taux_tfb_global,
          taux_tfb_commune = EXCLUDED.taux_tfb_commune,
          taux_tfb_epci = EXCLUDED.taux_tfb_epci,
          taux_teom = EXCLUDED.taux_teom,
          taux_th = EXCLUDED.taux_th,
          majoration_rs = EXCLUDED.majoration_rs,
          taux_majoration_rs = EXCLUDED.taux_majoration_rs,
          population = EXCLUDED.population,
          nom_epci = EXCLUDED.nom_epci
    """, rows)

    def mediane(values: list[float] | None):
        return round(statistics.median(values), 2) if values else None

    references = [
        (
            ref, annee, mediane(values),
            mediane(teom.get((ref, annee))), len(teom.get((ref, annee), [])),
            mediane(th.get((ref, annee))),
            len(values),
        )
        for (ref, annee), values in sorted(tfb.items())
    ]
    upsert(conn, """
        INSERT INTO local_tax_reference
          (code, annee, taux_tfb_mediane, taux_teom_mediane, nb_communes_teom, taux_th_mediane, nb_communes)
        VALUES %s
        ON CONFLICT (code, annee) DO UPDATE SET
          taux_tfb_mediane = EXCLUDED.taux_tfb_mediane,
          taux_teom_mediane = EXCLUDED.taux_teom_mediane,
          nb_communes_teom = EXCLUDED.nb_communes_teom,
          taux_th_mediane = EXCLUDED.taux_th_mediane,
          nb_communes = EXCLUDED.nb_communes
    """, references)

    return len(rows), len(references), rejets


def deliberation_code(row: dict) -> str | None:
    """`depcom` entier, ou — pour la Corse, où il est vide — libellé du département + `com`."""
    depcom = to_int(row.get("depcom"))
    if depcom is not None:
        code = str(depcom).zfill(5)
    else:
        prefixe = CORSE.get((row.get("libdep") or "").strip().upper())
        com = to_int(row.get("com"))
        if prefixe is None or com is None:
            return None
        code = prefixe + str(com).zfill(3)
    return code if INSEE_RE.match(code) else None


def import_deliberations(conn, path: Path) -> tuple[int, int]:
    rows: list[tuple] = []
    # code de référence → [communes, communes en zone TLV, taux de majoration votés]
    reperes: dict[str, list] = defaultdict(lambda: [0, 0, []])
    rejets = 0
    f, reader = open_csv(path)
    with f:
        for row in reader:
            code = deliberation_code(row)
            tlv = {"O": True, "N": False}.get((row.get("indtlv") or "").strip().upper())
            if code is None:
                rejets += 1
                continue
            majoration = to_float(row.get("thsurtaxrstau"))
            rows.append((code, DELIB_ANNEE, tlv, majoration))
            for ref in (departement_of(code), "FRANCE"):
                repere = reperes[ref]
                repere[0] += 1
                repere[1] += 1 if tlv else 0
                if majoration is not None:
                    repere[2].append(majoration)

    upsert(conn, """
        INSERT INTO local_tax_deliberation (code_commune, annee, tlv, taux_majoration_rs)
        VALUES %s
        ON CONFLICT (code_commune, annee) DO UPDATE SET
          tlv = EXCLUDED.tlv,
          taux_majoration_rs = EXCLUDED.taux_majoration_rs
    """, rows)

    upsert(conn, """
        INSERT INTO local_tax_deliberation_reference
          (code, annee, nb_communes, nb_tlv, nb_majoration, taux_majoration_mediane)
        VALUES %s
        ON CONFLICT (code, annee) DO UPDATE SET
          nb_communes = EXCLUDED.nb_communes,
          nb_tlv = EXCLUDED.nb_tlv,
          nb_majoration = EXCLUDED.nb_majoration,
          taux_majoration_mediane = EXCLUDED.taux_majoration_mediane
    """, [
        (ref, DELIB_ANNEE, n, n_tlv, len(taux), round(statistics.median(taux), 2) if taux else None)
        for ref, (n, n_tlv, taux) in sorted(reperes.items())
    ])
    return len(rows), rejets


def comptes_code(row: dict) -> str | None:
    dep = (row.get("dep") or "").strip().upper()
    icom = (row.get("icom") or "").strip()
    if len(dep) != 3 or len(icom) != 3:
        return None
    # DOM : `dep` recodé 101 à 106, le chiffre du département est en tête de `icom`.
    code = "97" + icom if dep.startswith("1") else dep[1:] + icom
    return code if INSEE_RE.match(code) else None


def import_comptes(conn, path: Path) -> tuple[int, int]:
    rows: list[tuple] = []
    rejets = 0
    f, reader = open_csv(path)
    with f:
        for row in reader:
            code = comptes_code(row)
            annee = to_int(row.get("an"))
            if code is None or annee is None:
                rejets += 1
                continue
            rows.append((
                code, annee, to_int(row.get("pop1")),
                to_float(row.get("fdette")), to_float(row.get("mdette")),
                to_float(row.get("fimpo1")), to_float(row.get("mimpo1")),
                to_float(row.get("fequip")), to_float(row.get("mequip")),
                to_float(row.get("fcaf")), to_float(row.get("mcaf")),
            ))

    upsert(conn, """
        INSERT INTO local_tax_finances
          (code_commune, annee, population, dette_hab, dette_strate, impots_hab, impots_strate,
           equipement_hab, equipement_strate, caf_hab, caf_strate)
        VALUES %s
        ON CONFLICT (code_commune, annee) DO UPDATE SET
          population = EXCLUDED.population,
          dette_hab = EXCLUDED.dette_hab, dette_strate = EXCLUDED.dette_strate,
          impots_hab = EXCLUDED.impots_hab, impots_strate = EXCLUDED.impots_strate,
          equipement_hab = EXCLUDED.equipement_hab, equipement_strate = EXCLUDED.equipement_strate,
          caf_hab = EXCLUDED.caf_hab, caf_strate = EXCLUDED.caf_strate
    """, rows)
    return len(rows), rejets


def print_stats(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*), COUNT(DISTINCT code_commune), MIN(annee), MAX(annee) FROM local_tax_commune")
        total, communes, amin, amax = cur.fetchone()
        if not total:
            print("\nTable local_tax_commune vide.")
            return
        cur.execute("""
            SELECT COUNT(*) FILTER (WHERE taux_teom IS NULL),
                   COUNT(*) FILTER (WHERE majoration_rs),
                   AVG(taux_tfb_global),
                   percentile_cont(ARRAY[0.25, 0.5, 0.75]) WITHIN GROUP (ORDER BY taux_tfb_global)
            FROM local_tax_commune WHERE annee = %s
        """, (amax,))
        sans_teom, majorees, moyenne, quartiles = cur.fetchone()
        cur.execute("SELECT COUNT(*), COUNT(*) FILTER (WHERE tlv) FROM local_tax_deliberation")
        delib, tlv = cur.fetchone()
        cur.execute("""
            SELECT COUNT(*) FILTER (WHERE c.code_commune IS NULL)
            FROM local_tax_deliberation d
            LEFT JOIN local_tax_commune c ON c.code_commune = d.code_commune AND c.annee = %s
        """, (amax,))
        (delib_orphelines,) = cur.fetchone()
        cur.execute("SELECT COUNT(*), MIN(annee), MAX(annee) FROM local_tax_finances")
        finances, finances_debut, finances_fin = cur.fetchone()

    print("\nTable local_tax_commune :")
    print(f"  Lignes / communes       : {total:,} / {communes:,}")
    print(f"  Années                  : {amin}-{amax}")
    print(f"  {amax} — sans TEOM         : {sans_teom:,}")
    print(f"  {amax} — majoration RS     : {majorees:,}")
    print(f"  {amax} — moyenne simple    : {float(moyenne):.2f} %")
    print(f"  {amax} — quartiles         : {' / '.join(f'{q:.2f}' for q in quartiles)} %")
    print("\nTable local_tax_deliberation :")
    print(f"  Lignes / en zone TLV    : {delib:,} / {tlv:,}")
    print(f"  Sans ligne de taux {amax} : {delib_orphelines:,}")
    print("\nTable local_tax_finances :")
    print(f"  Lignes ({finances_debut}-{finances_fin})      : {finances:,}")

    # Contrôle : valeurs relevées à la main sur data.economie.gouv.fr pour Lyon, 2025.
    attendu = {"taux_tfb_global": 32.82, "taux_tfb_commune": 31.89, "taux_tfb_epci": 0.55, "taux_teom": 5.19}
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT {', '.join(attendu)} FROM local_tax_commune WHERE code_commune = '69123' AND annee = 2025"
        )
        got = cur.fetchone()
    print("\nContrôle Lyon (69123) 2025 :")
    if got is None:
        print("  ⚠ ligne absente")
        return
    for (col, ref), v in zip(attendu.items(), got):
        ok = v is not None and abs(float(v) - ref) < 0.005
        print(f"  {'✓' if ok else '⚠'} {col:18s} {float(v) if v is not None else 0:6.2f} % (attendu {ref})")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=["taux", "deliberations", "comptes"], help="n'importer qu'un jeu")
    parser.add_argument("--taux-file", type=Path, help="csv des taux (sinon téléchargé)")
    parser.add_argument("--deliberations-file", type=Path, help="csv des délibérations (sinon téléchargé)")
    parser.add_argument("--comptes-file", type=Path, nargs="+", help="csv des comptes, un ou plusieurs (sinon téléchargés)")
    args = parser.parse_args()

    def wanted(name: str) -> bool:
        return args.only in (None, name)

    print("=== Import fiscalité locale (DGFiP) ===")
    conn = get_connection()
    try:
        if wanted("taux"):
            path = args.taux_file or download(export_url(TAUX_DATASET, TAUX_COLS), DATA_DIR / "taux.csv")
            print("Import des taux et calcul des médianes…")
            n, n_ref, rejets = import_taux(conn, path)
            print(f"  {n:,} lignes, {n_ref:,} repères, {rejets:,} rejetées")
        if wanted("deliberations"):
            path = args.deliberations_file or download(
                export_url(DELIB_DATASET, DELIB_COLS), DATA_DIR / f"deliberations-{DELIB_ANNEE}.csv"
            )
            print("Import des délibérations…")
            n, rejets = import_deliberations(conn, path)
            print(f"  {n:,} lignes, {rejets:,} rejetées")
        if wanted("comptes"):
            paths = args.comptes_file or [
                download(export_url(dataset, COMPTES_COLS), DATA_DIR / f"comptes-{dataset.split('global-')[-1]}.csv")
                for dataset in COMPTES_DATASETS
            ]
            print("Import des comptes des communes…")
            for path in paths:
                n, rejets = import_comptes(conn, path)
                print(f"  {path.name} : {n:,} lignes, {rejets:,} rejetées")
        print_stats(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
