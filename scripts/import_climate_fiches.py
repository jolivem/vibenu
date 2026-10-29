#!/usr/bin/env python3
"""
Importe les normales climatiques 1991-2020 publiées par Météo-France, station par station,
dans les fiches climatologiques officielles (data.gouv.fr, « Fiches climatologiques »).

Remplace `import_climate_stations.py`, qui calculait ses propres normales à partir des
relevés décadaires : un journaliste ouvrirait la fiche officielle de la station, et ne
retrouvait pas toujours nos chiffres. Désormais, le site reprend les valeurs de la fiche, et
seules les stations qui ont une fiche figurent en base — une station sans fiche officielle
n'est plus jamais choisie.

Source :
- liste des stations : {BASE}/liste_fiches_clim.geojson (numéro, nom, position) ;
- une fiche par station : {BASE}/FICHECLIM_<numéro>.data, texte séparé par « ; ». Chaque
  mesure est une ligne de titre suivie d'une ligne de valeurs : colonne vide, 12 mois, année.

Mesures reprises (titre exact de la fiche) :
- « Température moyenne (Moyenne en °C) » ;
- « Précipitations : Hauteur moyenne mensuelle (mm) » ;
- « Durée d'insolation (Moyenne en heures) » — absente des stations sans héliographe.

Les deux tables sont vidées puis remplies dans une même transaction : `climate_station_normales`
(valeur annuelle de la fiche) et `climate_station_monthly_normales` (les 12 mois).

Usage :
    python import_climate_fiches.py           # télécharge les fiches absentes du cache
    python import_climate_fiches.py --refresh # retélécharge tout

Pré-requis : migrations 008-climate-station-normales.sql et 013-climate-station-monthly.sql.
Environnement : POSTGRES_URL
"""

import argparse
import gzip
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_values

load_dotenv()

BASE = "https://meteofrance.s3.sbg.io.cloud.ovh.net/data/synchro_ftp/REF_STATION"
SOURCE_TAG = "meteo-france-fiches-climatologiques-1991-2020"
CACHE = Path(__file__).parent / "data" / "climate" / "fiches"
# La fiche ne donne pas le nombre d'années par mois : Météo-France ne publie une normale que
# lorsque la période 1991-2020 est assez complète. On inscrit donc la période entière.
NB_YEARS = 30

TITLES = {
    "temperature_c": "Température moyenne (Moyenne en °C)",
    "precipitation_mm": "Précipitations : Hauteur moyenne mensuelle (mm)",
    "sunshine_hours": "Durée d'insolation (Moyenne en heures)",
}

__doc__ = __doc__.replace("{BASE}", BASE)


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def fetch(url: str, dest: Path, refresh: bool) -> Path | None:
    if dest.exists() and not refresh:
        return dest
    # Le serveur annonce parfois du gzip qu'il n'envoie pas : on lit le corps brut et on ne le
    # décompresse que s'il est vraiment compressé.
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=60, stream=True)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            body = r.raw.read(decode_content=False)
            if body[:2] == b"\x1f\x8b":
                body = gzip.decompress(body)
            dest.write_bytes(body)
            return dest
        except requests.RequestException:
            if attempt == 2:
                raise
    return None


def number(cell: str) -> float | None:
    try:
        return float(cell.strip())
    except ValueError:
        return None  # « . » ou vide : valeur non publiée


def parse(text: str) -> dict:
    """Valeurs (12 mois + année) de chaque mesure, et altitude de la station."""
    lines = text.splitlines()
    out: dict = {}
    alt = re.search(r"alt\s*:\s*(-?\d+)\s*m", text)
    out["altitude_m"] = int(alt.group(1)) if alt else None
    for key, title in TITLES.items():
        for i, line in enumerate(lines):
            if line.strip().rstrip(";").strip() != title:
                continue
            for nxt in lines[i + 1 : i + 4]:
                cells = nxt.split(";")
                if len(cells) >= 14 and cells[0].strip() == "":
                    months = [number(c) for c in cells[1:13]]
                    year = number(cells[13])
                    if year is not None:
                        out[key] = (months, year)
                    break
            break
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--refresh", action="store_true", help="retélécharge la liste et les fiches")
    args = parser.parse_args()

    CACHE.mkdir(parents=True, exist_ok=True)
    liste = fetch(f"{BASE}/liste_fiches_clim.geojson", CACHE / "liste_fiches_clim.geojson", args.refresh)
    stations = json.loads(liste.read_text())["features"]
    print(f"{len(stations)} stations à fiche officielle")

    def one(f):
        num = f["properties"]["num"]
        path = fetch(f"{BASE}/FICHECLIM_{num}.data", CACHE / f"{num}.data", args.refresh)
        return f, parse(path.read_text(encoding="utf-8", errors="replace")) if path else None

    with ThreadPoolExecutor(max_workers=8) as pool:
        parsed = list(pool.map(one, stations))

    annual, monthly, missing = [], [], 0
    for f, data in parsed:
        if not data or not any(k in data for k in TITLES):
            missing += 1
            continue
        num = f["properties"]["num"]
        lon, lat = f["geometry"]["coordinates"][:2]
        get = lambda k: data[k][1] if k in data else None  # noqa: E731
        precip = get("precipitation_mm")
        sun = get("sunshine_hours")
        annual.append((
            num, f["properties"]["nom"], lat, lon, data["altitude_m"],
            get("temperature_c"),
            round(precip) if precip is not None else None,
            round(sun) if sun is not None else None,
            1991, 2020, SOURCE_TAG, lon, lat,
        ))
        for m in range(12):
            vals = [data[k][0][m] if k in data else None for k in TITLES]
            if any(v is not None for v in vals):
                monthly.append((num, m + 1, *vals, NB_YEARS))

    conn = get_connection()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("DELETE FROM climate_station_monthly_normales")
            cur.execute("DELETE FROM climate_station_normales")
            execute_values(cur, """
                INSERT INTO climate_station_normales
                  (station_id, station_name, latitude, longitude, altitude_m,
                   temperature_c, precipitation_mm, sunshine_hours,
                   period_start, period_end, source, geom)
                VALUES %s
            """, annual, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))")
            execute_values(cur, """
                INSERT INTO climate_station_monthly_normales
                  (station_id, month, temperature_c, precipitation_mm, sunshine_hours, nb_years)
                VALUES %s
            """, monthly)
    finally:
        conn.close()

    count = lambda i: sum(1 for r in annual if r[i] is not None)  # noqa: E731
    print(f"climate_station_normales : {len(annual)} stations "
          f"(température {count(5)}, pluie {count(6)}, insolation {count(7)}) ; sans fiche lisible : {missing}")
    print(f"climate_station_monthly_normales : {len(monthly)} lignes")


if __name__ == "__main__":
    main()
