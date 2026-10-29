"""
Climat : le site face aux fiches climatologiques officielles de Météo-France (normales
1991-2020), publiées station par station sur data.gouv.fr (« Fiches climatologiques »).

Le site reprend ces fiches (scripts/import_climate_fiches.py). Le journaliste ouvrirait la fiche
de la station nommée. Pour chaque mesure (température moyenne, cumul de pluie, durée
d'insolation) :
- si la station du site a une fiche officielle, on compare à sa valeur annuelle ;
- sinon (base ancienne, importée des relevés décadaires), on donne la valeur de la station
  officielle la plus proche — ce que le journaliste verrait — en écart de méthode s'il est notable.

Repère France : seule la température a une normale nationale publiée (12,97 °C) ; le site ne
doit donner aucun repère France pour la pluie ni l'insolation.
"""

import json
import math

from common import CACHE, ERREUR, METHODE, OK, ARRONDI, A_RELIRE, Check, cached_download, distance_m

BASE = "https://meteofrance.s3.sbg.io.cloud.ovh.net/data/synchro_ftp/REF_STATION"
PAGE = "https://www.data.gouv.fr/datasets/fiches-climatologiques/"
FRANCE_TEMPERATURE = 12.97
FRANCE_SOURCE = "https://meteofrance.com/actualites-et-dossiers/actualites/climat/de-nouvelles-normales-pour-qualifier-le-climat-en-france"
SECTIONS = {
    "temperature": ("temperatureC", "Température moyenne (Moyenne en °C)", 0.2),
    "precipitation": ("precipitationMm", "Précipitations : Hauteur moyenne mensuelle (mm)", 15),
    "sunshine": ("sunshineHours", "Durée d'insolation (Moyenne en heures)", 40),
}


def _stations() -> list[dict]:
    path = cached_download(f"{BASE}/liste_fiches_clim.geojson", CACHE / "meteo" / "liste.geojson")
    return json.loads(path.read_text())["features"]


def _annual(num: str, title: str) -> float | None:
    path = cached_download(f"{BASE}/FICHECLIM_{num}.data", CACHE / "meteo" / f"{num}.data")
    if not path:
        return None
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    for i, line in enumerate(lines):
        if line.strip().rstrip(";").startswith(title):
            for nxt in lines[i + 1 : i + 4]:
                cells = [c.strip() for c in nxt.split(";")]
                if len(cells) >= 14 and cells[0] == "":
                    try:
                        return float(cells[13])
                    except ValueError:
                        return None
    return None


def check(addr, analysis: dict) -> list[Check]:
    cl = analysis.get("climate")
    if not cl:
        return []
    stations = _stations()
    by_name = {f["properties"]["nom"].upper(): f for f in stations}
    out: list[Check] = []
    for metric, (key, title, tol) in SECTIONS.items():
        site_value = cl.get(key)
        st = (cl.get("stationsByMetric") or {}).get(metric) or cl.get("station") or {}
        if site_value is None:
            continue
        official = by_name.get((st.get("name") or "").upper())
        if official:
            v = _annual(official["properties"]["num"], title)
            if v is None:
                out.append(Check("Climat", f"{key} ({st.get('name')})", site_value, "absent de la fiche", A_RELIRE, official["properties"]["chemin"]))
                continue
            d = abs(site_value - v)
            out.append(Check("Climat", f"{key} — station {st.get('name')}", site_value, v,
                             OK if d <= tol else ARRONDI if d <= 2 * tol else ERREUR, official["properties"]["chemin"],
                             "normale officielle de la même station"))
            continue
        # Pas de fiche officielle pour la station du site : la station officielle la plus proche
        # qui publie la mesure, comme le ferait un journaliste.
        nearest = None
        for f in sorted(stations, key=lambda f: distance_m(addr.lat, addr.lon, f["geometry"]["coordinates"][1], f["geometry"]["coordinates"][0])):
            v = _annual(f["properties"]["num"], title)
            if v is not None:
                nearest = (f, v)
                break
            if distance_m(addr.lat, addr.lon, f["geometry"]["coordinates"][1], f["geometry"]["coordinates"][0]) > 60_000:
                break
        if not nearest:
            out.append(Check("Climat", f"{key} — station {st.get('name')}", site_value, "aucune fiche à moins de 60 km", A_RELIRE, PAGE))
            continue
        f, v = nearest
        dist = distance_m(addr.lat, addr.lon, f["geometry"]["coordinates"][1], f["geometry"]["coordinates"][0]) / 1000
        d = abs(site_value - v)
        out.append(Check(
            "Climat", f"{key} — station {st.get('name')} (sans fiche officielle)", site_value,
            f"{v} ({f['properties']['nom']}, {dist:.0f} km)",
            OK if d <= tol else ARRONDI if d <= 2 * tol else METHODE, f["properties"]["chemin"],
            "le site calcule la normale sur une station sans fiche officielle ; un journaliste lirait la fiche de la station officielle la plus proche",
        ))
    nat = cl.get("national") or {}
    t = nat.get("temperatureC")
    out.append(Check("Climat", "repère France — température", t, FRANCE_TEMPERATURE,
                     OK if t is not None and abs(t - FRANCE_TEMPERATURE) <= 0.05 else ERREUR, FRANCE_SOURCE,
                     "normale 1991-2020 de l'indicateur thermique national"))
    for key in ("precipitationMm", "sunshineHours"):
        if nat.get(key) is not None:
            out.append(Check("Climat", f"repère France — {key}", nat[key], "aucune normale nationale publiée",
                             ERREUR, FRANCE_SOURCE, "chiffre sans source : à retirer"))
    return out
