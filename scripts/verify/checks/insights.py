"""
Phrases « En bref » : chaque nombre d'une phrase doit se retrouver dans les faits que le modèle
a reçus pour cette rubrique (`facts.json`, voir collect.py), à l'arrondi près. Ces faits sont
peu nombreux et déjà calculés — écarts, rapports, tendances — : un nombre absent est un nombre
inventé ou mal recopié.

Le faire contre tous les chiffres de la rubrique ne marche pas : avec leurs écarts et rapports,
ils couvrent presque tous les nombres possibles (76 à 100 % de faux positifs, mesuré).

Une phrase dont un nombre ne se retrouve pas, ou qui emploie un mot à risque, est à relire à la
main avant envoi. Le contrôle ne juge pas le sens de la phrase : il dit où regarder.
"""

import re

from common import A_RELIRE, OK, OUT, Check, load_json

SECTIONS = {
    "fiscalite": ["localTax"],
    "securite": ["security"],
    "demographie": ["demographics"],
    "logement": ["demographics"],
    "emploi": ["demographics"],
    "menages": ["demographics"],
    "elections": ["elections"],
    "municipales": ["municipales"],
    "climat": ["climate"],
    "air": ["airQuality"],
}
# Seuils de taille des communes, cités dans les libellés de tranche.
KNOWN = [2000, 10000, 50000, 200000]
RISKY = ["majoritaire", "majorité", "inexistant", "aucun fait", "record", "le plus", "la plus", "jamais", "toujours", "explos", "flamb", "dangereu"]
NUMBER = re.compile(r"(?<![\w,])(\d{1,3}(?:[  ]\d{3})+|\d+)(?:,(\d+))?")


def _flatten(obj, out: list[float]) -> None:
    if isinstance(obj, bool):
        return
    if isinstance(obj, (int, float)):
        out.append(float(obj))
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k not in ("irisGeojson", "geometry", "coordinates"):
                _flatten(v, out)
    elif isinstance(obj, list):
        for v in obj:
            _flatten(v, out)


def _candidates(values: list[float]) -> list[float]:
    vals = sorted(set(round(v, 4) for v in values))[:600]
    cands = set(vals)
    for a in vals:
        for b in vals:
            if a == b:
                continue
            cands.add(round(abs(a - b), 4))
            if b:
                cands.add(round(a / b, 4))
                cands.add(round(abs(a / b - 1) * 100, 4))
    return sorted(cands)


def _numbers(text: str) -> list[tuple[float, int]]:
    out = []
    for m in NUMBER.finditer(text):
        whole = re.sub(r"[  ]", "", m.group(1))
        dec = m.group(2) or ""
        out.append((float(f"{whole}.{dec}" if dec else whole), len(dec)))
    return out


def _years(n: float) -> bool:
    return 1950 <= n <= 2030 and n == int(n)


def _fact_numbers(obj, out: list[float]) -> None:
    """Les nombres des faits, y compris ceux écrits dans les phrases préparées (« 2,3 fois »)."""
    if isinstance(obj, str):
        out.extend(n for n, _ in _numbers(obj))
    elif isinstance(obj, dict):
        for v in obj.values():
            _fact_numbers(v, out)
    elif isinstance(obj, list):
        for v in obj:
            _fact_numbers(v, out)
    else:
        _flatten(obj, out)


def check(addr, analysis: dict) -> list[Check]:
    path = OUT / addr.slug / "insights.json"
    data = load_json(path) if path.exists() else None
    insights = (data or {}).get("insights") or {}
    facts_path = OUT / addr.slug / "facts.json"
    facts = load_json(facts_path) if facts_path.exists() else None
    out: list[Check] = []
    if insights and not facts:
        return [Check("En bref", "faits du modèle", "absents", "—", A_RELIRE, "",
                      "relancer collect.py avec --facts pour contrôler les phrases")]
    for key, sentence in insights.items():
        values: list[float] = []
        _fact_numbers((facts or {}).get(key), values)
        # Valeur absolue : un écart de −4,1 points s'écrit « 4 points de moins ».
        cands = sorted({abs(v) for v in values} | set(KNOWN))
        unmatched = []
        for n, decimals in _numbers(sentence):
            if _years(n):
                continue
            tol = 0.5 * 10 ** -decimals + 1e-9
            if not any(abs(c - n) <= tol for c in cands):
                unmatched.append(str(n).replace(".", ","))
        risky = [w for w in RISKY if w in sentence.lower()]
        notes = []
        if unmatched:
            notes.append(f"nombres introuvables dans les chiffres de la rubrique : {', '.join(unmatched)}")
        if risky:
            notes.append(f"mots à vérifier : {', '.join(risky)}")
        out.append(Check("En bref", key, sentence, "chiffres de la rubrique", A_RELIRE if notes else OK, "", " · ".join(notes)))
    return out
