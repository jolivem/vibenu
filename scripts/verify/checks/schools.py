"""
Collèges et lycées : le site face aux jeux du ministère de l'Éducation nationale
(data.education.gouv.fr), dernière session publiée de chaque établissement.

Le journaliste consulterait la fiche de l'établissement ou ces jeux : taux de réussite au
brevet ou au bac, valeur ajoutée, indice de position sociale (IPS).
"""

from common import ERREUR, METHODE, OK, Check, get

BASE = "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets"
PAGE = "https://data.education.gouv.fr/explore/dataset/{ds}/table/?q={uai}"

# (jeu, champ de l'année, champ du taux, champ de la valeur ajoutée, clé du site)
EXAMS = [
    ("fr-en-indicateurs-valeur-ajoutee-colleges", "session", "taux_de_reussite_g", "va_du_taux_de_reussite_g", "brevet"),
    ("fr-en-indicateurs-de-resultat-des-lycees-gt_v2", "annee", "taux_reu_total", "va_reu_total", "bacGt"),
    ("fr-en-indicateurs-de-resultat-des-lycees-pro_v2", "annee", "taux_reu_total", "va_reu_total", "bacPro"),
]
IPS = {
    "college": ("fr-en-ips-colleges-ap2023", "ips"),
    "lycee": ("fr-en-ips-lycees-ap2023", "ips_etab"),
}


def _latest(ds: str, year_field: str, uais: list[str]) -> dict[str, dict]:
    if not uais:
        return {}
    where = "uai in (" + ",".join(f'"{u}"' for u in uais) + ")"
    r = get(f"{BASE}/{ds}/records", params={"where": where, "limit": 100, "order_by": f"{year_field} desc"}, timeout=60)
    r.raise_for_status()
    out: dict[str, dict] = {}
    for row in r.json().get("results", []):
        out.setdefault(row["uai"], row)  # trié par année décroissante : la première est la dernière session
    return out


def _year(v) -> int | None:
    try:
        return int(str(v)[:4])
    except (TypeError, ValueError):
        return None


def check(addr, analysis: dict) -> list[Check]:
    sc = analysis.get("schools") or {}
    schools = [(s, "college") for s in sc.get("colleges", [])] + [(s, "lycee") for s in sc.get("lycees", [])]
    if not schools:
        return []
    out: list[Check] = []
    uais = [s["uai"] for s, _ in schools]

    latest_year: dict[str, int] = {}
    for ds, yf, tf, vf, key in EXAMS:
        src = _latest(ds, yf, uais)
        r = get(f"{BASE}/{ds}/records", params={"select": f"max({yf}) as y", "limit": 1}, timeout=60)
        latest_year[ds] = _year((r.json().get("results") or [{}])[0].get("y")) or 0
        for s, level in schools:
            if key == "brevet" and level != "college" or key != "brevet" and level != "lycee":
                continue
            site = s.get(key)
            row = src.get(s["uai"])
            lien = PAGE.format(ds=ds, uai=s["uai"])
            if not row:
                if site:
                    out.append(Check("Écoles", f"{s['nom']} — {key}", site.get("tauxReussite"), "absent du jeu", ERREUR, lien))
                continue
            if not site:
                if row.get(tf) is not None:
                    stale = (_year(row.get(yf)) or 0) < latest_year.get(ds, 0)
                    out.append(Check(
                        "Écoles", f"{s['nom']} — {key}", "non affiché", f"{row.get(tf)} % ({row.get(yf)})",
                        METHODE if stale else ERREUR, lien,
                        "dernier résultat antérieur à la dernière session publiée : le site ne l'affiche pas"
                        if stale else "la source publie un résultat de la dernière session que le site n'affiche pas",
                    ))
                continue
            same = (
                _year(row.get(yf)) == site.get("annee")
                and _num(row.get(tf)) == _num(site.get("tauxReussite"))
                and _num(row.get(vf)) == _num(site.get("vaReussite"))
            )
            out.append(Check(
                "Écoles", f"{s['nom']} — {key} {site.get('annee')}",
                f"{site.get('tauxReussite')} % · VA {site.get('vaReussite')}",
                f"{row.get(tf)} % · VA {row.get(vf)} ({row.get(yf)})",
                OK if same else ERREUR, lien,
            ))

    for level, (ds, field) in IPS.items():
        src = _latest(ds, "rentree_scolaire", [s["uai"] for s, lv in schools if lv == level])
        for s, lv in schools:
            if lv != level or not s.get("ips"):
                continue
            row = src.get(s["uai"])
            lien = PAGE.format(ds=ds, uai=s["uai"])
            v = _num((row or {}).get(field))
            same = row is not None and v is not None and abs(v - float(s["ips"]["valeur"])) < 0.05
            out.append(Check("Écoles", f"{s['nom']} — IPS", s["ips"]["valeur"], v, OK if same else ERREUR, lien,
                             f"rentrée {(row or {}).get('rentree_scolaire')}"))
    return out


def _num(v):
    try:
        return round(float(v), 1)
    except (TypeError, ValueError):
        return None
