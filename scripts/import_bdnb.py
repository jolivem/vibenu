#!/usr/bin/env python3
"""
Importe dans `bdnb_parcelle` la fiche des immeubles vendus, tirée de la Base de données
nationale des bâtiments (BDNB open, CSTB, Licence Ouverte 2.0) : usage, logements, niveaux,
période de construction, adresse. Une ligne par parcelle ayant au moins une vente DVF.

Source : une archive CSV par département, https://bdnb.io/download/ (≈ 400 Mo chacune). On
n'en télécharge que quatre tables (≈ 16 Mo par département), lues dans l'archive à distance
par requêtes HTTP « Range » :
  - rel_batiment_groupe_parcelle : groupes de bâtiments de chaque parcelle ;
  - batiment_groupe_ffo_bat      : Fichiers fonciers (usage, logements, niveaux, année) ;
  - batiment_groupe_rnc          : Registre national des copropriétés (période de construction) ;
  - batiment_groupe_adresse      : adresse principale (BAN).

Plusieurs groupes sur une parcelle : on garde celui qui a le plus de logements.

L'API ouverte (api.bdnb.io) ne convient pas au site : 10 lignes par appel et 120 appels par
minute, soit une vingtaine d'appels pour une analyse à Paris.

À lancer **après** import_dvf.py (on ne garde que les parcelles vendues), et à relancer à
chaque millésime BDNB. Reprend là où il s'est arrêté (`bdnb_import`) ; --force refait tout.

Usage :
    python import_bdnb.py
    python import_bdnb.py --dep 42 --dep 75
    python import_bdnb.py --force

Pré-requis : migration 030-bdnb-parcelle.sql appliquée ; dvf_transactions remplie.
Environnement : POSTGRES_URL
"""

import argparse
import csv
import io
import os
import sys
import zipfile

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

MILLESIME = "2026-02-b"
URL = ("https://open-data.s3.fr-par.scw.cloud/bdnb_millesime_{m}/millesime_{m}_dep{d}/"
       "open_data_millesime_{m}_dep{d}_csv.zip")
# La BDNB couvre la métropole (pas les DOM).
DEPARTMENTS = [f"{i:02d}" for i in range(1, 96) if i != 20] + ["2A", "2B"]
RNC_PERIODS = {"AVANT_1949", "DE_1949_A_1960", "DE_1961_A_1974", "DE_1975_A_1993",
               "DE_1994_A_2000", "DE_2001_A_2010", "APRES_2011"}
CHUNK = 8 << 20

csv.field_size_limit(10_000_000)


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


class RemoteFile(io.RawIOBase):
    """Fichier distant lu par requêtes « Range », par blocs de 8 Mo : zipfile n'en lit que
    le répertoire central et les membres demandés."""

    def __init__(self, url: str):
        self.url = url
        self.session = requests.Session()
        head = self.session.head(url, timeout=60)
        head.raise_for_status()
        self.size = int(head.headers["content-length"])
        self.pos = 0
        self.block_start, self.block = -1, b""

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos

    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos + offset if whence == 1 else self.size + offset
        return self.pos

    def readinto(self, buf):
        if self.pos >= self.size:
            return 0
        if not (self.block_start <= self.pos < self.block_start + len(self.block)):
            end = min(self.pos + CHUNK, self.size) - 1
            r = self.session.get(self.url, headers={"Range": f"bytes={self.pos}-{end}"}, timeout=300)
            r.raise_for_status()
            self.block_start, self.block = self.pos, r.content
        i = self.pos - self.block_start
        data = self.block[i:i + len(buf)]
        buf[:len(data)] = data
        self.pos += len(data)
        return len(data)


def rows(z: zipfile.ZipFile, table: str):
    with z.open(f"csv/{table}.csv") as fh:
        yield from csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8"), delimiter=";")


def small_int(value: str | None) -> int | None:
    try:
        n = round(float(value)) if value not in (None, "") else None
    except ValueError:
        return None
    return n if n is not None and 0 <= n < 32_000 else None


def dvf_parcels(conn, dep: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT id_parcelle FROM dvf_transactions WHERE id_parcelle LIKE %s", (f"{dep}%",))
        return {r[0] for r in cur.fetchall()}


def import_department(conn, dep: str, millesime: str) -> int:
    wanted = dvf_parcels(conn, dep)
    if not wanted:
        print(f"  {dep} : aucune vente DVF, ignoré")
        return 0
    # La Corse s'écrit en minuscules dans les adresses des archives (« dep2a »).
    url = URL.format(m=millesime, d=dep.lower())
    z = zipfile.ZipFile(io.BufferedReader(RemoteFile(url), buffer_size=1 << 20))

    groups_by_parcel: dict[str, list[str]] = {}
    for r in rows(z, "rel_batiment_groupe_parcelle"):
        if r["parcelle_id"] in wanted:
            groups_by_parcel.setdefault(r["parcelle_id"], []).append(r["batiment_groupe_id"])
    needed = {g for gs in groups_by_parcel.values() for g in gs}

    ffo = {r["batiment_groupe_id"]: r for r in rows(z, "batiment_groupe_ffo_bat") if r["batiment_groupe_id"] in needed}
    rnc: dict[str, str] = {}
    for r in rows(z, "batiment_groupe_rnc"):
        p = r.get("periode_construction_max") or ""
        if r["batiment_groupe_id"] in needed and p in RNC_PERIODS:
            rnc.setdefault(r["batiment_groupe_id"], p)
    adresse = {r["batiment_groupe_id"]: r["libelle_adr_principale_ban"] or None
               for r in rows(z, "batiment_groupe_adresse") if r["batiment_groupe_id"] in needed}

    out = []
    for parcel, groups in groups_by_parcel.items():
        # Le groupe qui a le plus de logements ; à égalité, celui qui a une fiche.
        best = max(groups, key=lambda g: (small_int(ffo.get(g, {}).get("nb_log")) or 0, g in ffo, g in rnc))
        f = ffo.get(best, {})
        if not f and best not in rnc:
            continue
        annee = small_int(f.get("annee_construction"))
        out.append((
            parcel, dep, best, f.get("usage_niveau_1_txt") or None,
            small_int(f.get("nb_log")), small_int(f.get("nb_niveau")),
            annee if annee and 1000 <= annee <= 2100 else None,
            rnc.get(best), adresse.get(best),
        ))

    with conn, conn.cursor() as cur:
        cur.execute("DELETE FROM bdnb_parcelle WHERE insee_dep = %s", (dep,))
        execute_values(cur, """
            INSERT INTO bdnb_parcelle (parcelle_id, insee_dep, batiment_groupe_id, usage, nb_logements,
                                       nb_niveaux, annee_ffo, periode_rnc, adresse)
            VALUES %s ON CONFLICT (parcelle_id) DO NOTHING
        """, out, page_size=5000)
        cur.execute("""
            INSERT INTO bdnb_import (insee_dep, millesime, parcelles) VALUES (%s, %s, %s)
            ON CONFLICT (insee_dep) DO UPDATE SET millesime = EXCLUDED.millesime,
              parcelles = EXCLUDED.parcelles, imported_at = NOW()
        """, (dep, millesime, len(out)))
    print(f"  {dep} : {len(out):,} parcelles sur {len(wanted):,} vendues")
    return len(out)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dep", action="append", help="département (répétable) ; tous par défaut")
    parser.add_argument("--millesime", default=MILLESIME)
    parser.add_argument("--force", action="store_true", help="réimporter les départements déjà faits")
    args = parser.parse_args()

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT insee_dep FROM bdnb_import WHERE millesime = %s", (args.millesime,))
            done = {r[0] for r in cur.fetchall()}
        total, failed = 0, []
        for dep in args.dep or DEPARTMENTS:
            if dep in done and not args.force:
                continue
            try:
                total += import_department(conn, dep, args.millesime)
            except Exception as error:  # un département en échec ne bloque pas les autres
                conn.rollback()
                failed.append(dep)
                print(f"  {dep} : échec — {error}", file=sys.stderr)
    finally:
        conn.close()
    print(f"bdnb_parcelle : {total:,} parcelles importées (millésime {args.millesime})")
    if failed:
        print(f"Départements en échec, à relancer : {' '.join(failed)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
