#!/usr/bin/env python3
"""
Importe les collèges et lycées et les données publiées par établissement, dans PostgreSQL.

Source : data.education.gouv.fr — ministère de l'Éducation nationale et DEPP, Licence
Ouverte 2.0. Chaque jeu est téléchargé en entier par l'export JSON Lines de l'API
Opendatasoft (`/exports/jsonl`), puis mis en cache dans data/schools/.

Deux destinations (voir la migration 024-schools.sql) :

  - `school_establishment` : les collèges et lycées ouverts de l'Annuaire de l'éducation,
    avec leurs coordonnées. Typée et indexée spatialement.
  - `school_data` : chaque ligne de chaque jeu de DATASETS, telle que publiée (JSONB), avec
    l'UAI et l'année extraites. Seuls les libellés administratifs redondants (région,
    académie, département en toutes lettres, point géographique) sont retirés.

Chaque jeu est remplacé d'un bloc, dans sa propre transaction : relancer le script après
une nouvelle publication de la DEPP (résultats au printemps, effectifs et IPS à l'automne)
suffit. Les téléchargements en cache sont réutilisés ; --refresh les renouvelle.

Usage :
    python import_schools.py                     # tout
    python import_schools.py --only fr-en-ips-colleges-ap2023 fr-en-offre-langues-2d
    python import_schools.py --skip-annuaire     # données seulement
    python import_schools.py --refresh           # retélécharge

Pré-requis : migration 024-schools.sql appliquée.
Environnement : POSTGRES_URL
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import Json, execute_values

load_dotenv()

API = "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets"
DATA_DIR = Path(__file__).parent / "data" / "schools"

ANNUAIRE = "fr-en-annuaire-education"

# (identifiant du jeu, champ portant l'UAI, champ portant l'année ou None)
DATASETS: list[tuple[str, str, str | None]] = [
    # Offre et options
    ("fr-en-offre-langues-2d", "uai", None),
    ("fr-en-sections-internationales", "uai", "annee"),
    ("fr-en-sections-sportives-scolaires", "uai", None),
    ("fr-en-lycees-metiers", "ndeg_uai", None),
    ("fr-en-lits-internats-publics-2d", "uai", "rentree"),
    ("fr-en-mode-hebergement-eleves-etablissements-2d", "uai", "rentree"),
    # Effectifs (par niveau, sexe, langue vivante) et encadrement (taille des divisions)
    ("fr-en-college-effectifs-niveau-sexe-lv", "numero_college", "rentree_scolaire"),
    ("fr-en-lycee_gt-effectifs-niveau-sexe-lv", "numero_lycee", "rentree_scolaire"),
    ("fr-en-lycee_pro-effectifs-niveau-sexe-lv", "numero_lycee", "rentree_scolaire"),
    ("fr-en-moyens_enseignants_2d_public", "uai", "annee"),
    ("fr-en-moyens_enseignants_2d_prive", "uai", "annee"),
    # Résultats et valeur ajoutée
    ("fr-en-indicateurs-valeur-ajoutee-colleges", "uai", "session"),
    ("fr-en-indicateurs-de-resultat-des-lycees-gt_v2", "uai", "annee"),
    ("fr-en-indicateurs-de-resultat-des-lycees-pro_v2", "uai", "annee"),
    ("fr-en-dnb-par-etablissement", "numero_d_etablissement", "session"),
    ("fr-en-evaluations_nationales_6eme_par_etablissement", "uai", "annee"),
    ("fr-en-inserjeunes-lycee_pro", "uai", "annee"),
    # Profil social et isolement
    ("fr-en-ips-colleges-ap2023", "uai", "rentree_scolaire"),
    ("fr-en-ips-lycees-ap2023", "uai", "rentree_scolaire"),
    ("fr-en-ips_colleges", "uai", "rentree_scolaire"),
    ("fr-en-ips_lycees", "uai", "rentree_scolaire"),
    ("fr-en-indice_eloignement_college_ap2022", "uai", "rentree_scolaire"),
    ("fr-en-indice_eloignement_lycee_ap2020", "uai", "rentree_scolaire"),
]

# Libellés administratifs répétés sur chaque ligne : l'UAI et le code département suffisent
# à les retrouver. Les codes de département sont gardés (références « Total Département »).
DROPPED_KEY = re.compile(
    r"^(position|latitude|longitude"
    r"|(code_|libelle_)?(region|academie)(_academique|_insee|_et_assimile)?"
    r"|code_(aca|region_academique|region_insee)"
    r"|(libelle_)?departement|region_academique|libelle_region_academique)$"
)
UAI_RE = re.compile(r"^\d{7}[A-Z]$")
YEAR_RE = re.compile(r"(19|20)\d{2}")


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def download(dataset: str, refresh: bool) -> Path:
    dest = DATA_DIR / f"{dataset}.jsonl"
    if dest.exists() and not refresh:
        print(f"  déjà présent : {dest.name}")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    url = f"{API}/{dataset}/exports/jsonl"
    # Le portail répond parfois lentement : quelques tentatives avant d'abandonner.
    for attempt in range(1, 6):
        try:
            print(f"  téléchargement de {dataset}…")
            with requests.get(url, stream=True, timeout=(30, 600)) as r:
                r.raise_for_status()
                with open(tmp, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 20):
                        f.write(chunk)
            tmp.rename(dest)
            return dest
        except requests.RequestException as e:
            print(f"    échec ({e}), tentative {attempt}/5", file=sys.stderr)
            time.sleep(5 * attempt)
    raise RuntimeError(f"téléchargement impossible : {dataset}")


def read_jsonl(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                yield json.loads(line)


def year_of(value) -> int | None:
    if value is None:
        return None
    m = YEAR_RE.search(str(value))
    return int(m.group(0)) if m else None


def uai_of(value) -> str | None:
    if not value:
        return None
    v = str(value).strip().upper()
    return v if UAI_RE.match(v) else None


# --- Annuaire -------------------------------------------------------------------------------

TYPES = {"Collège": "college", "Lycée": "lycee"}

# L'annuaire donne leur propre UAI aux sections rattachées à un autre établissement (SEGPA
# d'un collège, section professionnelle d'un lycée polyvalent…), sur le même site : elles
# feraient doublon dans une liste « à proximité ». Idem pour les écoles réduites à des BTS
# ou des classes prépas, qui n'accueillent pas de lycéens.
EXCLUDED_NATURE = re.compile(r"^(SECTION |ECOLES COMPOSEES UNIQT DE STS)")


def flag(value) -> bool:
    return str(value).strip() in ("1", "True", "true", "OUI", "Oui")


def text(value) -> str | None:
    if value is None:
        return None
    v = str(value).strip()
    return v or None


def import_annuaire(conn, refresh: bool) -> None:
    print(f"{ANNUAIRE}")
    path = download(ANNUAIRE, refresh)
    rows: list[tuple] = []
    skipped = 0
    for r in read_jsonl(path):
        kind = TYPES.get(r.get("type_etablissement") or "")
        uai = uai_of(r.get("identifiant_de_l_etablissement"))
        lat, lon = r.get("latitude"), r.get("longitude")
        if not kind or not uai or r.get("etat") != "OUVERT":
            continue
        if EXCLUDED_NATURE.match(r.get("libelle_nature") or ""):
            continue
        # Hors contrat : ni résultats, ni IPS, ni encadrement publiés — une ligne vide dans
        # la liste, et souvent une école de coiffure ou de santé plutôt qu'un lycée.
        if (r.get("type_contrat_prive") or "").strip() == "HORS CONTRAT":
            continue
        code_commune = text(r.get("code_commune"))
        if lat is None or lon is None or not code_commune:
            skipped += 1
            continue
        contrat = text(r.get("type_contrat_prive"))
        adresse = ", ".join(a for a in (text(r.get(k)) for k in ("adresse_1", "adresse_2")) if a) or None
        rows.append((
            uai,
            text(r.get("nom_etablissement")) or uai,
            kind,
            text(r.get("libelle_nature")),
            "prive" if r.get("statut_public_prive") == "Privé" else "public",
            None if contrat in (None, "SANS OBJET") else contrat,
            text(r.get("appartenance_education_prioritaire")),
            flag(r.get("voie_generale")),
            flag(r.get("voie_technologique")),
            flag(r.get("voie_professionnelle")),
            flag(r.get("restauration")),
            flag(r.get("hebergement")),
            flag(r.get("ulis")),
            flag(r.get("segpa")),
            flag(r.get("post_bac")),
            flag(r.get("apprentissage")),
            flag(r.get("lycee_agricole")),
            flag(r.get("lycee_militaire")),
            flag(r.get("lycee_des_metiers")),
            flag(r.get("section_europeenne")),
            flag(r.get("section_internationale")),
            flag(r.get("section_sport")),
            flag(r.get("section_arts")),
            flag(r.get("section_cinema")),
            flag(r.get("section_theatre")),
            adresse,
            text(r.get("code_postal")),
            code_commune,
            text(r.get("nom_commune")),
            text(r.get("telephone")),
            text(r.get("mail")),
            text(r.get("web")),
            text(r.get("fiche_onisep")),
            text(r.get("date_ouverture")),
            float(lon),
            float(lat),
        ))

    with conn.cursor() as cur:
        cur.execute("TRUNCATE school_establishment")
        execute_values(
            cur,
            """
            INSERT INTO school_establishment (
              uai, nom, type, nature, secteur, contrat_prive, education_prioritaire,
              voie_generale, voie_technologique, voie_professionnelle,
              restauration, hebergement, ulis, segpa, post_bac, apprentissage,
              lycee_agricole, lycee_militaire, lycee_des_metiers,
              section_europeenne, section_internationale, section_sport,
              section_arts, section_cinema, section_theatre,
              adresse, code_postal, code_commune, nom_commune, telephone, mail,
              site_web, fiche_onisep, date_ouverture, geom
            ) VALUES %s
            ON CONFLICT (uai) DO NOTHING
            """,
            rows,
            template="(" + ", ".join(["%s"] * 34) + ", ST_SetSRID(ST_MakePoint(%s, %s), 4326))",
            page_size=2000,
        )
        record_import(cur, ANNUAIRE, len(rows))
    conn.commit()
    counts = {k: sum(1 for r in rows if r[2] == k) for k in ("college", "lycee")}
    print(f"  {counts['college']} collèges, {counts['lycee']} lycées"
          + (f" ({skipped} sans coordonnées, ignorés)" if skipped else ""))


# --- Données par établissement -------------------------------------------------------------

def import_dataset(conn, dataset: str, uai_field: str, year_field: str | None, refresh: bool) -> None:
    print(dataset)
    path = download(dataset, refresh)
    rows: list[tuple] = []
    without_uai = 0
    for r in read_jsonl(path):
        uai = uai_of(r.get(uai_field))
        if uai is None:
            without_uai += 1
        annee = year_of(r.get(year_field)) if year_field else None
        data = {k: v for k, v in r.items() if v is not None and not DROPPED_KEY.match(k)}
        rows.append((dataset, uai, annee, Json(data)))

    with conn.cursor() as cur:
        cur.execute("DELETE FROM school_data WHERE dataset = %s", (dataset,))
        execute_values(
            cur,
            "INSERT INTO school_data (dataset, uai, annee, data) VALUES %s",
            rows,
            page_size=5000,
        )
        record_import(cur, dataset, len(rows))
    conn.commit()
    years = sorted({r[2] for r in rows if r[2] is not None})
    span = f", {years[0]}–{years[-1]}" if years else ""
    print(f"  {len(rows)} lignes{span}"
          + (f" (dont {without_uai} sans UAI : références ou lignes de total)" if without_uai else ""))


def record_import(cur, dataset: str, rows: int) -> None:
    cur.execute(
        """
        INSERT INTO school_dataset_import (dataset, rows, imported_at) VALUES (%s, %s, now())
        ON CONFLICT (dataset) DO UPDATE SET rows = EXCLUDED.rows, imported_at = now()
        """,
        (dataset, rows),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import des collèges, lycées et de leurs données.")
    parser.add_argument("--only", nargs="+", metavar="DATASET", help="ne charger que ces jeux")
    parser.add_argument("--skip-annuaire", action="store_true", help="ne pas recharger l'annuaire")
    parser.add_argument("--refresh", action="store_true", help="retélécharger même si en cache")
    args = parser.parse_args()

    known = {d[0] for d in DATASETS} | {ANNUAIRE}
    if args.only:
        unknown = set(args.only) - known
        if unknown:
            print(f"Jeux inconnus : {', '.join(sorted(unknown))}", file=sys.stderr)
            sys.exit(1)

    conn = get_connection()
    failed: list[str] = []
    try:
        if not args.skip_annuaire and (not args.only or ANNUAIRE in args.only):
            import_annuaire(conn, args.refresh)
        for dataset, uai_field, year_field in DATASETS:
            if args.only and dataset not in args.only:
                continue
            try:
                import_dataset(conn, dataset, uai_field, year_field, args.refresh)
            except Exception as e:  # un jeu en panne ne bloque pas les autres
                conn.rollback()
                failed.append(dataset)
                print(f"  ÉCHEC : {e}", file=sys.stderr)
    finally:
        conn.close()
    if failed:
        print(f"Terminé avec {len(failed)} échec(s) : {', '.join(failed)}", file=sys.stderr)
        sys.exit(1)
    print("Terminé.")


if __name__ == "__main__":
    main()
