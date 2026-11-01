"""
Fiche des immeubles vendus : le site face à l'API ouverte de la BDNB (CSTB, api.bdnb.io).

Pour les trois premiers immeubles du tableau des ventes, on relit la BDNB par son API (et non
par la table importée) : groupes de bâtiments de la parcelle, puis Fichiers fonciers et
Registre national des copropriétés. On applique la règle du site — le groupe qui a le plus de
logements, la période du registre d'abord, sinon l'année des Fichiers fonciers ramenée à une
période — et on compare logements, niveaux et période.
"""

from common import A_RELIRE, ERREUR, OK, Check, get

API = "https://api.bdnb.io/v1/bdnb/donnees"
FICHE = "https://bdnb.io/services/services_api/"
SAMPLE = 3


def _period_of_year(year: int) -> str:
    for limit, code in ((1948, "AVANT_1949"), (1960, "DE_1949_A_1960"), (1974, "DE_1961_A_1974"),
                        (1993, "DE_1975_A_1993"), (2000, "DE_1994_A_2000"), (2010, "DE_2001_A_2010")):
        if year <= limit:
            return code
    return "APRES_2011"


def _rows(table: str, params: dict) -> list[dict]:
    # API ouverte : 120 appels par minute, on espace.
    r = get(f"{API}/{table}", params=params, min_interval=0.6)
    return r.json() if r.status_code == 200 else []


def _expected(parcel: str) -> dict | None:
    groups = [g["batiment_groupe_id"] for g in _rows("rel_batiment_groupe_parcelle", {"parcelle_id": f"eq.{parcel}"})]
    if not groups:
        return None
    ids = f"in.({','.join(groups)})"
    ffo = {r["batiment_groupe_id"]: r for r in _rows("batiment_groupe_ffo_bat", {"batiment_groupe_id": ids})}
    rnc = {}
    for r in _rows("batiment_groupe_rnc", {"batiment_groupe_id": ids}):
        if r.get("periode_construction_max"):
            rnc.setdefault(r["batiment_groupe_id"], r["periode_construction_max"])
    best = max(groups, key=lambda g: (round(float((ffo.get(g) or {}).get("nb_log") or 0)), g in ffo, g in rnc))
    f = ffo.get(best) or {}
    year = f.get("annee_construction")
    period = rnc.get(best) or (_period_of_year(int(year)) if year else None)
    return {"dwellings": f.get("nb_log"), "floors": f.get("nb_niveau"), "period": period}


def check(addr, analysis: dict) -> list[Check]:
    if analysis.get("mode") != "address":
        return []
    buildings = [b for b in (analysis.get("realEstate") or {}).get("buildings") or [] if b.get("parcelId")]
    out: list[Check] = []
    for b in buildings[:SAMPLE]:
        parcel, info = b["parcelId"], b.get("building") or {}
        expected = _expected(parcel)
        if expected is None:
            out.append(Check("Immeubles (BDNB)", f"{parcel}", "fiche" if info else "sans fiche",
                             "absente de la BDNB", OK if not info else A_RELIRE, FICHE))
            continue
        for label, site, source in (
            ("logements", info.get("dwellings"), expected["dwellings"]),
            ("niveaux", info.get("floors"), expected["floors"]),
            ("période de construction", info.get("periodCode"), expected["period"]),
        ):
            same = (site is None and source is None) or (
                site is not None and source is not None and str(site) == str(round(float(source)) if label != "période de construction" else source)
            )
            out.append(Check("Immeubles (BDNB)", f"{parcel} — {label}", site, source,
                             OK if same else ERREUR, FICHE, info.get("address") or ""))
    return out
