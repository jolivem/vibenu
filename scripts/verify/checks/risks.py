"""
Risques : le site face au rapport Géorisques de l'adresse.

Le journaliste ouvrirait la page « Mes risques » de georisques.gouv.fr pour l'adresse. Elle
repose sur le même service que `resultats_rapport_risque`, qu'on relit ici (un appel par
seconde au plus : au-delà, Géorisques bloque l'adresse IP).

Pour chaque risque, on compare :
- sa présence : un risque que Géorisques dit présent doit figurer sur le site, et inversement ;
- son niveau : le statut à l'adresse (« Risque Existant - important ») doit donner le même
  niveau. Quand le site a pris le statut de la commune faute de statut à l'adresse, c'est un
  écart de méthode : la page de l'adresse ne dit pas la même chose.
"""

from common import ERREUR, METHODE, OK, A_RELIRE, Check, get

API = "https://www.georisques.gouv.fr/api/v1/resultats_rapport_risque"
PAGE = "https://www.georisques.gouv.fr/mes-risques/connaitre-les-risques-pres-de-chez-moi"


def grade(statut: str | None) -> str:
    """Lecture indépendante d'un statut Géorisques en niveau."""
    s = (statut or "").lower()
    if not s:
        return "inconnu"
    if "non concerne" in s or "non concerné" in s:
        return "absent"
    if "non connu" in s or "inconnu" in s:
        return "inconnu"
    if "important" in s or "élevé" in s or "fort" in s:
        return "élevé"
    if "modéré" in s or "moyen" in s:
        return "modéré"
    if "faible" in s:
        return "faible"
    return "présent"


def check(addr, analysis: dict) -> list[Check]:
    site = {c["code"]: c for c in (analysis.get("risks") or {}).get("categories", [])}
    r = get(API, params={"latlon": f"{addr.lon},{addr.lat}"}, min_interval=1.2, timeout=30)
    lien = f"{PAGE} (adresse : {addr.label}) · API : {r.url}"
    if r.status_code != 200:
        return [Check("Risques", "rapport Géorisques", "—", f"HTTP {r.status_code}", A_RELIRE, lien, "source injoignable, à refaire")]
    data = r.json()

    if any(c.get("unavailable") for c in site.values()):
        return [Check("Risques", "rapport Géorisques", "Indisponible", "répond", ERREUR, lien,
                      "le site était en repli au moment de la collecte : recollecter")]

    out: list[Check] = []
    source_items = {**data.get("risquesNaturels", {}), **data.get("risquesTechnologiques", {})}
    for code, raw in source_items.items():
        at_address = grade(raw.get("libelleStatutAdresse"))
        at_commune = grade(raw.get("libelleStatutCommune"))
        present = bool(raw.get("present")) and at_address != "absent"
        expected = at_address if at_address not in ("inconnu",) else at_commune
        s = site.get(code)
        name = raw.get("libelle") or code
        statut_txt = f"adresse : {raw.get('libelleStatutAdresse') or '—'} · commune : {raw.get('libelleStatutCommune') or '—'}"

        if not present or expected == "absent":
            if s and s["level"] != "absent":
                out.append(Check("Risques", name, s["level"], "absent", ERREUR, lien, statut_txt))
            continue
        if not s:
            out.append(Check("Risques", name, "absent du site", expected, ERREUR, lien, statut_txt))
            continue
        if s["level"] != expected:
            out.append(Check("Risques", name, s["level"], expected, ERREUR, lien, statut_txt))
        elif at_address == "inconnu" and at_commune != "inconnu":
            out.append(Check("Risques", name, s["level"], f"{expected} (commune) — non connu à l'adresse", METHODE, lien,
                             "le site affiche le niveau de la commune ; la page de l'adresse dit « non connu » "
                             "(la fiche PDF ne le précise pas)"))
        else:
            out.append(Check("Risques", name, s["level"], expected, OK, lien, statut_txt))
    return out
