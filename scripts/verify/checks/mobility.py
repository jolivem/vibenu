"""
Transports et proximité.

- Transports : l'arrêt et la gare les plus proches annoncés par le site doivent exister dans la
  base nationale des arrêts (transport.data.gouv.fr, `gtfs-stops`), à la distance annoncée
  (±15 m). Le regroupement des arrêts d'un même lieu est propre au site : on ne recompte pas.
- Proximité (commerces, services) : OpenStreetMap et la BPE de l'INSEE, dédoublonnés selon des
  règles propres au site. Rien d'officiel à quoi comparer un total : à relire sur la carte.
"""

from common import ERREUR, OK, A_RELIRE, Check, distance_m, get, offset

API = "https://transport.data.gouv.fr/api/gtfs-stops"
PAGE = "https://transport.data.gouv.fr/explore?lat={lat}&lon={lon}&zoom=16"
OSM = "https://www.openstreetmap.org/#map=17/{lat}/{lon}"


def _stops(lat: float, lon: float, radius: float) -> list[dict]:
    s, w = offset(lat, lon, radius, 180)[0], offset(lat, lon, radius, 270)[1]
    n, e = offset(lat, lon, radius, 0)[0], offset(lat, lon, radius, 90)[1]
    r = get(API, params={"south": s, "north": n, "west": w, "east": e}, timeout=60)
    r.raise_for_status()
    return r.json().get("features", [])


def check(addr, analysis: dict) -> list[Check]:
    mob = analysis.get("mobility") or {}
    out: list[Check] = []
    lien = PAGE.format(lat=addr.lat, lon=addr.lon)
    for kind, items, radius in (("arrêt le plus proche", mob.get("nearestStops") or [], 1200),
                                ("gare la plus proche", mob.get("nearestStations") or [], max([i["distanceMeters"] for i in (mob.get("nearestStations") or [])[:1]] + [0]) + 300)):
        if not items:
            continue
        first = items[0]
        feats = _stops(addr.lat, addr.lon, radius)
        best = None
        for f in feats:
            name = (f.get("properties") or {}).get("stop_name") or ""
            if name.strip().lower() != first["name"].strip().lower():
                continue
            lon, lat = f["geometry"]["coordinates"]
            d = distance_m(addr.lat, addr.lon, lat, lon)
            if best is None or d < best:
                best = d
        if best is None:
            out.append(Check("Transports", f"{kind} : {first['name']}", f"{first['distanceMeters']} m", "introuvable", ERREUR, lien))
        else:
            ok = abs(best - first["distanceMeters"]) <= 15
            out.append(Check("Transports", f"{kind} : {first['name']}", f"{first['distanceMeters']} m", f"{best:.0f} m",
                             OK if ok else ERREUR, lien, "distance à vol d'oiseau"))
    counts = (analysis.get("neighborhood") or {}).get("counts")
    if counts:
        out.append(Check("Proximité", f"équipements à moins de {counts.get('radiusMeters')} m",
                         ", ".join(f"{k} {v}" for k, v in (counts.get("byCategory") or {}).items()), "OSM + BPE",
                         A_RELIRE, OSM.format(lat=addr.lat, lon=addr.lon),
                         "comptages dédoublonnés par le site : vérifier sur la carte quelques catégories"))
    return out
