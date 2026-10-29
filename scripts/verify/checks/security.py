"""
Sécurité : le site face aux bases statistiques du SSMSI (ministère de l'Intérieur,
data.gouv.fr), lues brutes.

Le journaliste lirait le taux de la commune dans la « base communale » : une ligne par
commune, année et indicateur ; une valeur non diffusée (1 à 4 faits) n'y a pas de nombre. On
compare :
- les taux de la commune, année par année, et les années masquées ;
- le repère France, recalculé sur la base départementale (somme des faits / somme des
  populations) ;
- le repère « communes de même taille », recalculé sur toutes les communes : tranche selon la
  population de la dernière année, arrondissements de Paris, Lyon et Marseille dans la tranche
  de leur ville, faits masqués comptés à la moyenne publiée (`complement_info_nombre`).
La note de la tuile n'a pas d'équivalent public : elle est signalée à relire.
"""

import csv
import gzip
import json
from collections import defaultdict

from common import CACHE, ERREUR, OK, ARRONDI, A_RELIRE, Check, cached_download

BASE = "https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales"
COM = f"{BASE}/20260709-115942/donnee-data.gouv-2025-geographie2026-produit-le2026-06-25.csv.gz"
DEP = f"{BASE}/20260709-120038/donnee-dep-data.gouv-2025-geographie2026-produit-le2026-06-25.csv"
PAGE = "https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales"
TRANCHES = [(1, 0), (2, 2_000), (3, 10_000), (4, 50_000), (5, 200_000)]
CITIES = (("751", "75056"), ("6938", "69123"), ("132", "13055"))


def _f(v):
    v = (v or "").strip()
    return None if v in ("", "NA") else float(v.replace(",", "."))


def _tranche(pop: float) -> int:
    return max(t for t, low in TRANCHES if pop >= low)


def _city(code: str) -> str | None:
    for prefix, city in CITIES:
        if code.startswith(prefix) and code != city:
            return city
    return None


def _bases() -> dict[str, str]:
    """
    Habitants ou logements, par indicateur : déduit de la base départementale, où le taux publié
    vaut nombre / base × 1000 (les cambriolages se rapportent aux logements).
    """
    path = cached_download(DEP, CACHE / "ssmsi" / "dep.csv")
    votes: dict[str, dict[str, int]] = defaultdict(lambda: {"habitants": 0, "logements": 0})
    with open(path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f, delimiter=";"):
            n, t, pop, log = _f(r["nombre"]), _f(r["taux_pour_mille"]), _f(r["insee_pop"]), _f(r["insee_log"])
            if not n or not t or not pop or not log:
                continue
            d = n / t * 1000
            votes[r["indicateur"]]["logements" if abs(d - log) < abs(d - pop) else "habitants"] += 1
    return {k: max(v, key=v.get) for k, v in votes.items()}


def _aggregates() -> dict:
    """Une seule passe sur la base communale, mise en cache : taux par commune et repères par tranche."""
    cache = CACHE / "ssmsi" / "aggregates.json"
    if cache.exists():
        return json.loads(cache.read_text())
    bases = _bases()
    path = cached_download(COM, CACHE / "ssmsi" / "com.csv.gz")
    rows = []
    last_pop: dict[str, tuple[int, float]] = {}
    with gzip.open(path, "rt", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f, delimiter=";"):
            code, year = r["CODGEO_2026"], int(r["annee"])
            pop = _f(r["insee_pop"]) or 0
            if code not in last_pop or year > last_pop[code][0]:
                last_pop[code] = (year, pop)
            rows.append((code, year, r["indicateur"], r["unite_de_compte"], r["est_diffuse"] == "diff",
                         _f(r["nombre"]), _f(r["taux_pour_mille"]), pop, _f(r["insee_log"]) or 0, _f(r["complement_info_nombre"])))
    city_pop: dict[str, float] = defaultdict(float)
    for code, (_, pop) in last_pop.items():
        if _city(code):
            city_pop[_city(code)] += pop
    def tranche_of(code):
        c = _city(code)
        return _tranche(city_pop[c] if c else last_pop[code][1])
    faits: dict[str, float] = defaultdict(float)
    denom: dict[str, float] = defaultdict(float)
    communes: dict[str, dict] = {}
    for code, year, ind, unit, diffuse, n, taux, pop, log, compl in rows:
        if code in ("75056", "69123", "13055") and any(_city(c) == code for c in last_pop):
            continue  # la ville et ses arrondissements : ne pas compter deux fois
        base = log if bases.get(ind) == "logements" else pop
        key = f"{tranche_of(code)}|{year}|{ind}"
        faits[key] += (n or 0) if diffuse else (compl or 0)
        denom[key] += base
        communes.setdefault(code, {})[f"{year}|{ind}"] = taux if diffuse else None
    tranche = {k: faits[k] / denom[k] * 1000 for k in faits if denom[k]}
    out = {"tranche": tranche, "communes": communes, "tranche_of": {c: tranche_of(c) for c in last_pop}}
    cache.write_text(json.dumps(out))
    return out


def _france() -> dict[str, float]:
    path = cached_download(DEP, CACHE / "ssmsi" / "dep.csv")
    bases = _bases()
    faits: dict[str, float] = defaultdict(float)
    denom: dict[str, float] = defaultdict(float)
    with open(path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f, delimiter=";"):
            key = f"{r['annee']}|{r['indicateur']}"
            base = _f(r["insee_log"]) if bases.get(r["indicateur"]) == "logements" else _f(r["insee_pop"])
            faits[key] += _f(r["nombre"]) or 0
            denom[key] += base or 0
    return {k: faits[k] / denom[k] * 1000 for k in faits if denom[k]}


def _series_check(label, years, site_values, source_values, rel_tol):
    wrong = []
    for y, sv, rv in zip(years, site_values, source_values):
        if sv is None and rv is None:
            continue
        if sv is None or rv is None:
            wrong.append(f"{y} : site {sv} · source {rv}")
        elif abs(sv - rv) > max(rel_tol * abs(rv), 0.0005):
            wrong.append(f"{y} : site {sv:.4f} · source {rv:.4f}")
    return wrong


def check(addr, analysis: dict) -> list[Check]:
    sec = analysis.get("security")
    if not sec:
        return []
    agg = _aggregates()
    france = _france()
    code = addr.citycode
    years = sec["annees"]
    out: list[Check] = []
    tranche_src = agg["tranche_of"].get(code)
    if sec.get("tranche") is not None:
        out.append(Check("Sécurité", "tranche de taille", sec["tranche"], tranche_src,
                         OK if sec["tranche"] == tranche_src else ERREUR, PAGE))
    for ind in sec["indicateurs"]:
        name = ind["indicateur"]
        src = [agg["communes"].get(code, {}).get(f"{y}|{name}") for y in years]
        w = _series_check(name, years, ind["commune"], src, 0.0005)
        out.append(Check("Sécurité", f"{name} — taux de la commune (10 ans)", f"{len(years)} années",
                         "identiques" if not w else f"{len(w)} écarts", OK if not w else ERREUR, PAGE, "; ".join(w[:3])))
        w = _series_check(name, years, ind["france"], [france.get(f"{y}|{name}") for y in years], 0.002)
        out.append(Check("Sécurité", f"{name} — repère France", f"{len(years)} années",
                         "identiques" if not w else f"{len(w)} écarts", OK if not w else ERREUR, PAGE, "; ".join(w[:3])))
        if sec.get("tranche") is not None:
            w = _series_check(name, years, ind["memeTaille"], [agg["tranche"].get(f"{tranche_src}|{y}|{name}") for y in years], 0.01)
            w3 = _series_check(name, years, ind["memeTaille"], [agg["tranche"].get(f"{tranche_src}|{y}|{name}") for y in years], 0.03)
            out.append(Check("Sécurité", f"{name} — repère « même taille »", f"{len(years)} années",
                             "identiques" if not w else f"{len(w)} écarts", OK if not w else ARRONDI if not w3 else ERREUR,
                             PAGE, "recalculé sur la base communale ; " + "; ".join(w[:3])))
    out.append(Check("Sécurité", "note de la tuile", "calculée par le site", "pas d'équivalent public", A_RELIRE, PAGE,
                     "règle documentée dans le README ; vérifier qu'elle correspond aux taux ci-dessus"))
    return out
