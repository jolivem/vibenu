"""
Qualité de l'air : le site face aux statistiques annuelles de l'Agence européenne de
l'environnement (service « AQ Statistics »), station par station.

Le journaliste lirait la moyenne annuelle de la station dans la visionneuse de l'AEE ou chez
l'association agréée (Atmo). On relit la statistique de la station et de l'année affichées
(moyenne annuelle pour NO₂, PM2,5, PM10 ; jours de dépassement pour l'ozone). Le site arrondit
à l'unité : tolérance de 0,5.
"""

from common import ERREUR, OK, A_RELIRE, Check, get

API = "https://forest.discomap.eea.europa.eu/arcgis/rest/services/AirQuality/AQ_Statistics_WM/MapServer/0/query"
VIEWER = "https://discomap.eea.europa.eu/App/AQViewer/index.html?fqn=Airquality_Dissem.b2g.AirQualityStatistics"
POLLUTANTS = {
    "no2": ("NO2", "Annual mean / average"),
    "pm25": ("PM2.5", "Annual mean / average"),
    "pm10": ("PM10", "Annual mean / average"),
    "o3": ("O3", "Days in exceedance averaged over 3 calendar years"),
}


def check(addr, analysis: dict) -> list[Check]:
    aq = analysis.get("airQuality") or {}
    out: list[Check] = []
    for a in aq.get("annual", []):
        pollutant, metric = POLLUTANTS[a["code"]]
        name = a["stationName"].replace("'", "''")
        r = get(API, params={
            "where": f"Country='France' AND StationName='{name}' AND AirPollutant='{pollutant}' "
                     f"AND ReportingMetric='{metric}' AND YearOfStatistics={a['year']}",
            "outFields": "StationName,AirPollutionLevel,DataCoverage,Preliminary,AirQualityEoICode",
            "f": "json",
        }, timeout=90)
        label = f"{a['code']} {a['year']} — {a['stationName']}"
        feats = (r.json() if r.status_code == 200 else {}).get("features", [])
        if not feats:
            out.append(Check("Air", label, a["value"], "introuvable", A_RELIRE, VIEWER))
            continue
        # Plusieurs lignes possibles (une par point de prélèvement) : on garde la plus couverte.
        best = max(feats, key=lambda f: f["attributes"].get("DataCoverage") or 0)["attributes"]
        v = best.get("AirPollutionLevel")
        ok = v is not None and abs(round(v) - a["value"]) <= 0.5 if a["code"] != "o3" else v is not None and abs(v - a["value"]) <= 1
        out.append(Check("Air", label, a["value"], round(v, 1) if v is not None else None, OK if ok else ERREUR, VIEWER,
                         f"station {best.get('AirQualityEoICode')}, couverture {best.get('DataCoverage')} %, "
                         f"{'provisoire' if str(best.get('Preliminary')) == '1' else 'définitif'}"))
    return out
