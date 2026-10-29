"""
Parcelle et PLU : le site face à l'API Carto de l'IGN, interrogée au point de l'adresse.

Le journaliste lirait la parcelle sur cadastre.gouv.fr (section, numéro, contenance) et la
zone du PLU sur le Géoportail de l'Urbanisme. On interroge ici par un point, et non par le petit
carré qu'utilise le site, pour suivre un autre chemin.
"""

import json

from common import ERREUR, OK, A_RELIRE, Check, get

API = "https://apicarto.ign.fr/api"
CADASTRE_PAGE = "https://cadastre.data.gouv.fr/map?style=ortho#17/{lat}/{lon}"
GPU_PAGE = "https://www.geoportail-urbanisme.gouv.fr/map/#tile=1&lon={lon}&lat={lat}&zoom=17"


def check(addr, analysis: dict) -> list[Check]:
    cad = analysis.get("cadastre") or {}
    if analysis.get("mode") != "address":
        return []
    point = json.dumps({"type": "Point", "coordinates": [addr.lon, addr.lat]})
    out: list[Check] = []

    parcel = cad.get("parcel")
    r = get(f"{API}/cadastre/parcelle", params={"geom": point}, timeout=30)
    lien = CADASTRE_PAGE.format(lat=addr.lat, lon=addr.lon)
    if r.status_code != 200:
        out.append(Check("Cadastre", "parcelle", (parcel or {}).get("numero"), f"HTTP {r.status_code}", A_RELIRE, lien))
    else:
        feats = r.json().get("features", [])
        src = feats[0]["properties"] if feats else None
        if not src:
            out.append(Check("Cadastre", "parcelle", (parcel or {}).get("numero"), "aucune", ERREUR if parcel else OK, lien))
        elif not parcel:
            out.append(Check("Cadastre", "parcelle", "aucune", f"{src['section']} {src['numero']}", ERREUR, lien))
        else:
            same_id = parcel["section"] == src["section"] and parcel["numero"] == src["numero"]
            out.append(Check("Cadastre", "parcelle (section, numéro)", f"{parcel['section']} {parcel['numero']}",
                             f"{src['section']} {src['numero']}", OK if same_id else ERREUR, lien))
            out.append(Check("Cadastre", "surface de la parcelle (m²)", parcel["contenance"], src.get("contenance"),
                             OK if parcel["contenance"] == src.get("contenance") else ERREUR, lien,
                             "contenance cadastrale"))

    zone = cad.get("urbanZone")
    r = get(f"{API}/gpu/zone-urba", params={"geom": point}, timeout=30)
    lien = GPU_PAGE.format(lat=addr.lat, lon=addr.lon)
    if r.status_code == 200:
        feats = r.json().get("features", [])
        src = feats[0]["properties"] if feats else None
        site_code = (zone or {}).get("code")
        src_code = (src or {}).get("libelle")
        out.append(Check("PLU", "zone du PLU", site_code, src_code, OK if site_code == src_code else ERREUR, lien,
                         (src or {}).get("libelong") or ""))
    return out
