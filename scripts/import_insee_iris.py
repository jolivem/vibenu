#!/usr/bin/env python3
"""
Importe trois bases infracommunales du recensement INSEE 2021, à la maille IRIS :
logement, emploi & qualifications, ménages & familles.

Source : INSEE, Recensement de la population 2021, bases infracommunales.
  https://www.insee.fr/fr/statistiques/8268838  → base-ic-logement
  https://www.insee.fr/fr/statistiques/8268843  → base-ic-activite-residents
  https://www.insee.fr/fr/statistiques/8268840  → base-ic-diplomes-formation
  https://www.insee.fr/fr/statistiques/8268828  → base-ic-couples-familles-menages
Licence Ouverte / Open Licence (Etalab). ~105 Mo de ZIP, ~49 000 IRIS par fichier.

Un seul script pour les trois axes, comme import_iris.py couvre contours + population
+ revenus : ils partagent le format, le mécanisme de résolution des colonnes et la
table pivot. `--only` permet de n'en rejouer qu'un.

DES EFFECTIFS PONDÉRÉS, PAS DES ENTIERS
Le recensement est une enquête pondérée : les effectifs sortent en décimal
(« P21_LOG=372.387493855914 »), point décimal et non virgule. `int(v)` lève, il faut
float() puis round(). On stocke des entiers arrondis, comme le fait déjà
iris_demographics pour la population : afficher 13,41 logements HLM n'aurait pas de
sens, et l'arrondi peut au pire décaler une part de 0,3 point sur un très petit IRIS.

CE QU'ON NE CALCULE PAS ICI
Aucun pourcentage n'est stocké : ils sont dérivés côté TypeScript, par le même code
pour le quartier, la commune et la France. Les repères commune/France viennent de la
vue matérialisée insee_aggregate, qui somme ces effectifs — moyenner des taux d'IRIS
pèserait un quartier de 900 habitants comme un quartier de 3 500.

Usage :
    python import_insee_iris.py                       # télécharge ce qui manque
    python import_insee_iris.py --only logement
    python import_insee_iris.py --data-dir /chemin/vers/les/zip

Pré-requis : migration 017-insee-iris.sql appliquée, et import_iris.py joué au moins
une fois (les contours définissent quels IRIS existent).
Environnement : POSTGRES_URL
"""

import argparse
import codecs
import csv
import io
import os
import sys
import zipfile
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

BASE = "https://www.insee.fr/fr/statistiques/fichier"
DATA_DIR = Path(__file__).parent / "data" / "insee"
BATCH_SIZE = 5000
DELIM = ";"


def cand(prefix: str, suffix: str) -> list[str]:
    """
    Colonnes candidates pour une variable, du millésime le plus récent au plus ancien.

    Résoudre variable par variable, et non par préfixe global : les fichiers mêlent
    l'exploitation principale (P) et la complémentaire (C) selon l'indicateur. Le jour
    du passage au RP 2022, l'import continue de fonctionner sur un fichier 2021 resté
    en cache local, et inversement.
    """
    return [f"{prefix}{y}_{suffix}" for y in (22, 21, 20, 19)]


# Un axe = une table, un ou plusieurs fichiers sources, et une carte
# {colonne_db: [colonnes INSEE candidates]}.
AXES = {
    "logement": {
        "table": "iris_logement",
        "files": [("8268838", "base-ic-logement-2021_csv.zip", {
            "log": cand("P", "LOG"),
            "rp": cand("P", "RP"),
            "rsecocc": cand("P", "RSECOCC"),
            "logvac": cand("P", "LOGVAC"),
            "maison": cand("P", "MAISON"),
            "appart": cand("P", "APPART"),
            "rp_prop": cand("P", "RP_PROP"),
            "rp_loc": cand("P", "RP_LOC"),
            "rp_lochlmv": cand("P", "RP_LOCHLMV"),
            "rp_grat": cand("P", "RP_GRAT"),
            "rp_1p": cand("P", "RP_1P"),
            "rp_2p": cand("P", "RP_2P"),
            "rp_3p": cand("P", "RP_3P"),
            "rp_4p": cand("P", "RP_4P"),
            "rp_5pp": cand("P", "RP_5PP"),
            "rp_achtot": cand("P", "RP_ACHTOT"),
            "rp_ach19": cand("P", "RP_ACH19"),
            "rp_ach45": cand("P", "RP_ACH45"),
            "rp_ach70": cand("P", "RP_ACH70"),
            "rp_ach90": cand("P", "RP_ACH90"),
            "rp_ach05": cand("P", "RP_ACH05"),
            "rp_ach18": cand("P", "RP_ACH18"),
        })],
    },
    "emploi": {
        "table": "iris_emploi",
        # Deux fichiers alimentent la même table : le second complète les lignes du
        # premier par ON CONFLICT DO UPDATE, sur des colonnes disjointes.
        "files": [
            ("8268843", "base-ic-activite-residents-2021_csv.zip", {
                "pop_15_64": cand("P", "POP1564"),
                "actifs_15_64": cand("P", "ACT1564"),
                "actifs_occ_15_64": cand("P", "ACTOCC1564"),
                "chomeurs_15_64": cand("P", "CHOM1564"),
                "retraites_15_64": cand("P", "RETR1564"),
                "etudiants_15_64": cand("P", "ETUD1564"),
                # Actifs occupés et non actifs : la CSP d'un chômeur est celle de son
                # dernier emploi, et l'afficher doublonnerait le taux de chômage voisin.
                "cs1": cand("C", "ACTOCC1564_CS1"),
                "cs2": cand("C", "ACTOCC1564_CS2"),
                "cs3": cand("C", "ACTOCC1564_CS3"),
                "cs4": cand("C", "ACTOCC1564_CS4"),
                "cs5": cand("C", "ACTOCC1564_CS5"),
                "cs6": cand("C", "ACTOCC1564_CS6"),
            }),
            ("8268840", "base-ic-diplomes-formation-2021_csv.zip", {
                "nscol_15p": cand("P", "NSCOL15P"),
                "nscol_diplmin": cand("P", "NSCOL15P_DIPLMIN"),
                "nscol_bepc": cand("P", "NSCOL15P_BEPC"),
                "nscol_capbep": cand("P", "NSCOL15P_CAPBEP"),
                "nscol_bac": cand("P", "NSCOL15P_BAC"),
                "nscol_sup2": cand("P", "NSCOL15P_SUP2"),
                "nscol_sup34": cand("P", "NSCOL15P_SUP34"),
                "nscol_sup5": cand("P", "NSCOL15P_SUP5"),
            }),
        ],
    },
    "menages": {
        "table": "iris_menages",
        "files": [("8268828", "base-ic-couples-familles-menages-2021_csv.zip", {
            "men": cand("C", "MEN"),
            "pmen": cand("C", "PMEN"),
            "men_pseul": cand("C", "MENPSEUL"),
            "men_sfam": cand("C", "MENSFAM"),
            "men_fam": cand("C", "MENFAM"),
            "men_coup_senf": cand("C", "MENCOUPSENF"),
            "men_coup_aenf": cand("C", "MENCOUPAENF"),
            "men_fammono": cand("C", "MENFAMMONO"),
            "fam": cand("C", "FAM"),
            "ne24f0": cand("C", "NE24F0"),
            "ne24f1": cand("C", "NE24F1"),
            "ne24f2": cand("C", "NE24F2"),
            "ne24f3": cand("C", "NE24F3"),
            "ne24f4p": cand("C", "NE24F4P"),
        })],
    },
}


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def download(fichier_id: str, name: str, data_dir: Path) -> Path:
    dest = data_dir / name
    if dest.exists():
        print(f"  déjà présent : {name}")
        return dest
    data_dir.mkdir(parents=True, exist_ok=True)
    print(f"  téléchargement de {name}…")
    with requests.get(f"{BASE}/{fichier_id}/{name}", stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
    return dest


def open_csv_in_zip(path: Path):
    """
    Ouvre le CSV de données du ZIP en streaming.

    Chaque archive contient aussi un `meta_*.CSV` (le dictionnaire des variables) qu'il
    faut écarter. L'en-tête peut porter un BOM. Encodage UTF-8 pour ces millésimes,
    avec repli latin-1 pour les plus anciens.
    """
    zf = zipfile.ZipFile(path)
    names = [n for n in zf.namelist()
             if n.lower().endswith(".csv") and not Path(n).name.lower().startswith("meta")]
    if not names:
        raise SystemExit(f"Aucun CSV de données dans {path.name}")

    # Sonde l'encodage sur le début du fichier. Décodeur incrémental : une troncature
    # au milieu d'un caractère multi-octets ne doit pas faire conclure à du latin-1.
    with zf.open(names[0]) as probe:
        head = probe.read(1 << 16)
    encoding = "utf-8"
    try:
        codecs.getincrementaldecoder("utf-8")().decode(head)
    except UnicodeDecodeError:
        encoding = "latin-1"

    text = io.TextIOWrapper(zf.open(names[0]), encoding=encoding, newline="")
    reader = csv.DictReader(text, delimiter=DELIM)
    reader.fieldnames = [c.strip("﻿\"") for c in reader.fieldnames]
    return zf, text, reader


def to_count(v):
    """Effectif pondéré → entier. '' et 'NA' valent absence, pas zéro."""
    if v is None or v in ("", "NA", "N/A"):
        return None
    try:
        return round(float(v.replace(",", ".")))
    except (ValueError, AttributeError):
        return None


def resolve_columns(available, wanted, label):
    """
    Associe chaque colonne de destination à la première source présente.

    Le repli doit être bruyant : une colonne silencieusement absente produirait une
    base à moitié vide qu'on ne découvrirait qu'à l'écran, des jours plus tard.
    """
    resolved, missing = {}, []
    for dest, candidates in wanted.items():
        src = next((c for c in candidates if c in available), None)
        if src:
            resolved[dest] = src
        else:
            missing.append(dest)

    if missing:
        print(f"  ⚠ {label} — colonnes introuvables, laissées à NULL : {', '.join(missing)}")
    if resolved:
        millesimes = sorted({s.split("_")[0] for s in resolved.values()})
        print(f"  {label} — {len(resolved)} colonnes, millésime(s) {', '.join(millesimes)}")
    return resolved


def flush(cur, table, dest_cols, batch):
    cols = ", ".join(dest_cols)
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in dest_cols)
    execute_values(
        cur,
        f"""
        INSERT INTO {table} (code_iris, {cols}) VALUES %s
        ON CONFLICT (code_iris) DO UPDATE SET {updates}
        """,
        batch,
    )
    return len(batch)


def import_file(conn, table, path: Path, wanted) -> int:
    zf, text, reader = open_csv_in_zip(path)
    resolved = resolve_columns(set(reader.fieldnames), wanted, path.stem)
    if not resolved:
        zf.close()
        return 0

    iris_col = next((c for c in ("IRIS", "CODE_IRIS", "DCOMIRIS") if c in reader.fieldnames), None)
    if not iris_col:
        zf.close()
        raise SystemExit(f"Aucune colonne IRIS dans {path.name}")

    dest_cols = list(resolved)
    total, batch = 0, []
    with zf, text, conn.cursor() as cur:
        for row in reader:
            code_iris = (row.get(iris_col) or "").strip()
            if len(code_iris) < 5:
                continue
            values = [to_count(row.get(resolved[d])) for d in dest_cols]
            if all(v is None for v in values):
                continue
            batch.append((code_iris, *values))
            if len(batch) >= BATCH_SIZE:
                total += flush(cur, table, dest_cols, batch)
                batch.clear()
        if batch:
            total += flush(cur, table, dest_cols, batch)
    conn.commit()
    return total


def print_stats(conn, axes):
    """
    Contrôles de cohérence.

    Deux familles : les identités internes au fichier (une décomposition doit sommer à
    son total), et des repères nationaux publics. Un import qui passe ces contrôles ne
    peut pas être silencieusement décalé d'une colonne.
    """
    checks = {
        "logement": [
            ("rp_prop + rp_loc + rp_grat ≈ rp",
             "SELECT avg(abs(rp_prop + rp_loc + rp_grat - rp) / NULLIF(rp,0)) FROM iris_logement", 0.01),
            ("Σ rp_1p..rp_5pp ≈ rp",
             "SELECT avg(abs(rp_1p+rp_2p+rp_3p+rp_4p+rp_5pp - rp) / NULLIF(rp,0)) FROM iris_logement", 0.01),
            ("Σ rp_ach* ≈ rp_achtot",
             "SELECT avg(abs(rp_ach19+rp_ach45+rp_ach70+rp_ach90+rp_ach05+rp_ach18 - rp_achtot)"
             " / NULLIF(rp_achtot,0)) FROM iris_logement", 0.01),
            ("rp_lochlmv ≤ rp_loc partout",
             "SELECT count(*) FROM iris_logement WHERE rp_lochlmv > rp_loc + 1", 0),
        ],
        "emploi": [
            ("Σ cs1..cs6 ≈ actifs occupés",
             "SELECT avg(abs(cs1+cs2+cs3+cs4+cs5+cs6 - actifs_occ_15_64)"
             " / NULLIF(actifs_occ_15_64,0)) FROM iris_emploi", 0.02),
            ("chômeurs ≤ actifs partout",
             "SELECT count(*) FROM iris_emploi WHERE chomeurs_15_64 > actifs_15_64 + 1", 0),
        ],
        "menages": [
            ("Σ composition ≈ men",
             "SELECT avg(abs(men_pseul+men_sfam+men_coup_senf+men_coup_aenf+men_fammono - men)"
             " / NULLIF(men,0)) FROM iris_menages", 0.01),
        ],
    }

    # Repères nationaux publiés par l'INSEE pour 2021, à ±1 point.
    reperes = {
        "logement": [
            ("part de propriétaires", "SELECT 100.0*rp_prop/rp FROM insee_aggregate WHERE scope_code='FRANCE'", 57.5),
            ("part de logements vacants", "SELECT 100.0*logvac/log FROM insee_aggregate WHERE scope_code='FRANCE'", 8.2),
        ],
        "emploi": [
            ("taux de chômage (recensement)",
             "SELECT 100.0*chomeurs_15_64/actifs_15_64 FROM insee_aggregate WHERE scope_code='FRANCE'", 12.0),
        ],
        "menages": [
            ("taille moyenne des ménages",
             "SELECT 1.0*pmen/men FROM insee_aggregate WHERE scope_code='FRANCE'", 2.19),
        ],
    }

    with conn.cursor() as cur:
        for axe in axes:
            table = AXES[axe]["table"]
            cur.execute(f"SELECT count(*) FROM {table}")
            (n,) = cur.fetchone()
            cur.execute(f"""
                SELECT count(*) FROM {table} t
                WHERE NOT EXISTS (SELECT 1 FROM iris_demographics d WHERE d.code_iris = t.code_iris)
            """)
            (orphelins,) = cur.fetchone()
            print(f"\nTable {table} : {n:,} IRIS, dont {orphelins:,} sans contour")
            if orphelins:
                # Contours en géographie 2024, bases RP en géographie 2023 : quelques
                # centaines d'écarts sont normaux, quelques milliers ne le sont pas.
                print(f"    (millésimes géographiques différents — au-delà de ~1 000, vérifier)")

            for label, sql, seuil in checks[axe]:
                cur.execute(sql)
                (v,) = cur.fetchone()
                v = float(v) if v is not None else None
                ok = v is not None and v <= seuil
                detail = f"{v:.4f}" if v is not None else "—"
                print(f"  {'✓' if ok else '⚠'} {label:44s} écart {detail} (max {seuil})")

            for label, sql, attendu in reperes[axe]:
                cur.execute(sql)
                row = cur.fetchone()
                v = float(row[0]) if row and row[0] is not None else None
                ok = v is not None and abs(v - attendu) < 1.0
                detail = f"{v:.2f}" if v is not None else "—"
                print(f"  {'✓' if ok else '⚠'} France, {label:37s} {detail} (attendu ~{attendu})")


def refresh_aggregate(conn):
    """
    Recalcule les repères commune et France, et purge les orphelins.

    À faire après les imports, jamais avant : la vue lit les quatre tables d'un coup.
    Le premier REFRESH d'une vue jamais peuplée ne peut pas être CONCURRENTLY.
    """
    with conn.cursor() as cur:
        for table in ("iris_logement", "iris_emploi", "iris_menages"):
            cur.execute(f"""
                DELETE FROM {table} t
                WHERE NOT EXISTS (SELECT 1 FROM iris_demographics d WHERE d.code_iris = t.code_iris)
            """)
            if cur.rowcount:
                print(f"  {cur.rowcount} orphelins purgés de {table}")
        conn.commit()

        cur.execute("SELECT ispopulated FROM pg_matviews WHERE matviewname = 'insee_aggregate'")
        row = cur.fetchone()
        if row is None:
            raise SystemExit("Vue insee_aggregate absente : appliquer la migration 017.")
        concurrently = "CONCURRENTLY " if row[0] else ""
        print(f"  REFRESH MATERIALIZED VIEW {concurrently}insee_aggregate…")
        cur.execute(f"REFRESH MATERIALIZED VIEW {concurrently}insee_aggregate")
    conn.commit()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=sorted(AXES), action="append",
                        help="n'importer que cet axe (répétable ; défaut : les trois)")
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR,
                        help="dossier des ZIP INSEE (téléchargés s'ils manquent)")
    parser.add_argument("--no-refresh", action="store_true",
                        help="ne pas rafraîchir insee_aggregate à la fin")
    args = parser.parse_args()

    axes = args.only or sorted(AXES)
    print(f"=== Import INSEE IRIS — {', '.join(axes)} ===")

    conn = get_connection()
    try:
        for axe in axes:
            spec = AXES[axe]
            print(f"\n--- {axe} → {spec['table']} ---")
            for fichier_id, name, wanted in spec["files"]:
                path = download(fichier_id, name, args.data_dir)
                n = import_file(conn, spec["table"], path, wanted)
                print(f"  {n:,} lignes importées")

        if not args.no_refresh:
            print("\n--- Agrégats commune / France ---")
            refresh_aggregate(conn)

        print_stats(conn, axes)
        print("\nImport terminé.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
