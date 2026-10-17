#!/usr/bin/env python3
"""
Importe les indicateurs annuels des stations françaises de mesure de la qualité
de l'air : concentration moyenne annuelle NO2, PM2.5 et PM10 (µg/m³), et pour
l'ozone le nombre de jours de dépassement de 120 µg/m³ sur 8 h, moyenné sur 3 ans.

Source : Agence européenne de l'environnement (EEA), service ArcGIS public
« AQ_Statistics_WM » — statistiques annuelles calculées par l'EEA à partir des
séries transmises par la France. Licence : réutilisation EEA (CC BY 4.0).
https://forest.discomap.eea.europa.eu/arcgis/rest/services/AirQuality/AQ_Statistics_WM/MapServer/0

Méthode :
1. Interroge le service (pagination par resultOffset, 1000 lignes max par page)
   pour les N dernières années disponibles, statistiques validées uniquement
   (Preliminary = '0').
2. Écarte les statistiques à couverture insuffisante (moins de 75 % de l'année pour
   une moyenne annuelle, moins de 2 années sur 3 pour l'ozone).
3. Une station a parfois plusieurs points de prélèvement pour un même polluant :
   on fait la moyenne par (station, polluant, année).
4. Remplace dans air_quality_station_annual toutes les lignes de la fenêtre importée.

Usage :
    python import_air_quality_eea.py            # 10 dernières années
    python import_air_quality_eea.py --years 5   # fenêtre plus courte

Pré-requis : migration 022-air-quality-stations.sql appliquée.
"""

import argparse
import os
import sys
import time
from collections import defaultdict

import psycopg2
import requests
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

SERVICE_URL = (
    "https://forest.discomap.eea.europa.eu/arcgis/rest/services/"
    "AirQuality/AQ_Statistics_WM/MapServer/0/query"
)
SOURCE_TAG = "eea-aq-statistics"
PAGE_SIZE = 1000

ANNUAL_MEAN = "Annual mean / average"
O3_DAYS = "Days in exceedance averaged over 3 calendar years"

# Couverture minimale (`DataCoverage`, en %) pour qu'une statistique soit retenue. Le service
# publie aussi des moyennes calculées sur quelques semaines (mise en service, panne) : 13 %
# de l'année pour les PM2,5 de La Défense en 2021, ce qui ne fait pas une moyenne annuelle.
#   - moyennes annuelles : 75 % de l'année, le seuil usuel de l'EEA ;
#   - ozone sur 3 ans : la couverture y compte les années valides (33 % = 1 an sur 3) ;
#     on en exige 2 sur 3, une seule année ne faisant pas une moyenne pluriannuelle.
ANNUAL_MIN_COVERAGE = 75
O3_MIN_COVERAGE = 66

# (AirPollutant EEA, ReportingMetric EEA)
#   → (code stocké, unité EEA attendue, unité stockée, couverture minimale)
METRICS = {
    ("NO2", ANNUAL_MEAN): ("no2", "ug.m-3", "ugm3", ANNUAL_MIN_COVERAGE),
    ("PM2.5", ANNUAL_MEAN): ("pm25", "ug.m-3", "ugm3", ANNUAL_MIN_COVERAGE),
    ("PM10", ANNUAL_MEAN): ("pm10", "ug.m-3", "ugm3", ANNUAL_MIN_COVERAGE),
    ("O3", O3_DAYS): ("o3", "count", "days", O3_MIN_COVERAGE),
}
STATION_TYPES = {"Background": "background", "Traffic": "traffic", "Industrial": "industrial"}

OUT_FIELDS = ",".join([
    "AirQualityEoICode",
    "StationName",
    "AirPollutant",
    "ReportingMetric",
    "YearOfStatistics",
    "AirPollutionLevel",
    "UnitOfAirpollutionLevel",
    "AreaOfMeasurementStation",
    "TypeOfMeasurementStation",
    "DataCoverage",
])


def get_connection():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("Error: POSTGRES_URL environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def base_where() -> str:
    metrics = " OR ".join(
        f"(AirPollutant='{pollutant}' AND ReportingMetric='{metric}')"
        for pollutant, metric in METRICS
    )
    return f"Country='France' AND Preliminary='0' AND ({metrics})"


def get(params: dict) -> dict:
    """GET avec quelques tentatives : le service EEA répond parfois lentement."""
    for attempt in range(4):
        try:
            r = requests.get(SERVICE_URL, params={**params, "f": "json"}, timeout=120)
            r.raise_for_status()
            data = r.json()
            if "error" in data:
                raise RuntimeError(data["error"])
            return data
        except Exception as e:  # noqa: BLE001
            if attempt == 3:
                raise
            print(f"  tentative {attempt + 1} échouée ({e}), nouvel essai…")
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("unreachable")


def latest_year() -> int:
    data = get({
        "where": base_where(),
        "outStatistics": '[{"statisticType":"max","onStatisticField":"YearOfStatistics",'
                         '"outStatisticFieldName":"y"}]',
    })
    return int(data["features"][0]["attributes"]["y"])


def fetch_rows(first_year: int) -> list[dict]:
    where = f"{base_where()} AND YearOfStatistics>={first_year}"
    rows: list[dict] = []
    offset = 0
    while True:
        data = get({
            "where": where,
            "outFields": OUT_FIELDS,
            "outSR": 4326,
            "orderByFields": "OBJECTID",
            "resultOffset": offset,
            "resultRecordCount": PAGE_SIZE,
        })
        features = data.get("features", [])
        for f in features:
            rows.append({**f["attributes"], **(f.get("geometry") or {})})
        print(f"  {len(rows)} lignes lues")
        if len(features) < PAGE_SIZE and not data.get("exceededTransferLimit"):
            break
        offset += len(features)
    return rows


def normalize_area(area: str | None) -> str | None:
    """« Rural-Regional », « Rural-Remote », « Rural-Near_city » → 'rural'."""
    if not area:
        return None
    a = area.lower()
    if a.startswith("rural"):
        return "rural"
    if a in ("urban", "suburban"):
        return a
    return None


def aggregate(rows: list[dict]) -> list[tuple]:
    groups: dict[tuple, dict] = defaultdict(lambda: {"values": []})
    skipped = 0
    low_coverage = 0
    for r in rows:
        metric = METRICS.get((r.get("AirPollutant"), r.get("ReportingMetric")))
        station_type = STATION_TYPES.get(r.get("TypeOfMeasurementStation"))
        area = normalize_area(r.get("AreaOfMeasurementStation"))
        value = r.get("AirPollutionLevel")
        code = r.get("AirQualityEoICode")
        x, y = r.get("x"), r.get("y")
        if (
            not metric or not station_type or not area or not code
            or value is None or value < 0 or x is None or y is None
            or r.get("UnitOfAirpollutionLevel") != metric[1]
        ):
            skipped += 1
            continue
        if (r.get("DataCoverage") or 0) < metric[3]:
            low_coverage += 1
            continue
        pollutant, _, unit, _ = metric
        g = groups[(code, pollutant, int(r["YearOfStatistics"]))]
        g["values"].append(float(value))
        g.update(name=(r.get("StationName") or code).strip(), area=area, unit=unit,
                 station_type=station_type, x=x, y=y)
    if skipped:
        print(f"  {skipped} lignes ignorées (champ manquant, unité ou type inattendu)")
    if low_coverage:
        print(f"  {low_coverage} lignes écartées (couverture de mesure insuffisante)")

    return [
        (code, g["name"], pollutant, year,
         round(sum(g["values"]) / len(g["values"]), 1), g["unit"],
         g["area"], g["station_type"], SOURCE_TAG, g["x"], g["y"])
        for (code, pollutant, year), g in groups.items()
    ]


def replace_years(conn, records: list[tuple], first_year: int) -> None:
    """Remplace toute la fenêtre importée : une ligne écartée par un filtre (couverture) ou
    retirée par l'EEA ne doit pas survivre d'un import précédent. Une seule transaction —
    en cas d'échec, la table reste dans son état antérieur."""
    with conn.cursor() as cur:
        cur.execute("DELETE FROM air_quality_station_annual WHERE annee >= %s", (first_year,))
        execute_values(
            cur,
            """
            INSERT INTO air_quality_station_annual
              (station_code, station_name, pollutant, annee, value, unit,
               area, station_type, source, geom)
            VALUES %s
            ON CONFLICT (station_code, pollutant, annee) DO UPDATE SET
              station_name = EXCLUDED.station_name,
              value        = EXCLUDED.value,
              unit         = EXCLUDED.unit,
              area         = EXCLUDED.area,
              station_type = EXCLUDED.station_type,
              source       = EXCLUDED.source,
              geom         = EXCLUDED.geom,
              fetched_at   = NOW()
            """,
            records,
            template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))",
            page_size=500,
        )
    conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    parser.add_argument("--years", type=int, default=10, help="nombre d'années à importer")
    args = parser.parse_args()

    last = latest_year()
    first = last - args.years + 1
    print(f"Lecture EEA {first}-{last}…")
    rows = fetch_rows(first)
    records = aggregate(rows)
    print(f"{len(records)} moyennes (station × polluant × année) à écrire")

    conn = get_connection()
    try:
        replace_years(conn, records, first)
    finally:
        conn.close()
    print("Terminé.")


if __name__ == "__main__":
    main()
