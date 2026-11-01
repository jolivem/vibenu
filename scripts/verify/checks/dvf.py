"""
Prix des ventes : le site face aux fichiers publics DVF géolocalisées (Etalab, data.gouv.fr).

Le journaliste ouvrirait explore.data.gouv.fr/fr/immobilier et regarderait les ventes autour
de l'adresse. On relit ici les fichiers publics par commune
(files.data.gouv.fr/geo-dvf/latest/csv/{année}/communes/{dép}/{commune}.csv), pour toutes les
communes à moins d'1 km, et on refait le calcul du site : sur les deux derniers millésimes
publiés, les 50 ventes les plus proches à moins d'1 km tous types confondus, puis une médiane
par type de bien parmi elles (appartements, maisons ; pas de médiane sous 10 ventes), une vente = une
mutation dont la surface est la somme de ses logements (chacun compté une fois), prix sous
50 000 €/m², médiane.
"""

import csv
import gzip
from collections import defaultdict
from datetime import date

from common import CACHE, ERREUR, OK, ARRONDI, A_RELIRE, Check, cached_download, distance_m, get, offset

BASE = "https://files.data.gouv.fr/geo-dvf/latest/csv"
EXPLORE = "https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&lat={lat}&lng={lon}&zoom=16"
RADIUS = 1000
LIMIT = 50  # NEARBY_SALES, dvf-database.provider.ts
MIN_FOR_MEDIAN = 10  # MIN_SALES_FOR_MEDIAN
KINDS = {"appartement": "Appartement", "maison": "Maison"}
MAX_PRICE_M2 = 50_000
CITY_TYPES = ("arrondissement-municipal", "commune-actuelle")


def _communes_around(lat: float, lon: float) -> set[str]:
    """Communes (ou arrondissements) touchant le cercle d'1 km : centre et 16 points du cercle."""
    codes: set[str] = set()
    points = [(lat, lon)] + [offset(lat, lon, d, b) for d in (500, RADIUS) for b in range(0, 360, 45)]
    for plat, plon in points:
        for t in CITY_TYPES:
            r = get("https://geo.api.gouv.fr/communes", params={"lat": plat, "lon": plon, "type": t, "fields": "code"})
            if r.status_code == 200:
                for c in r.json():
                    codes.add(c["code"])
    # Paris, Lyon, Marseille : les fichiers DVF sont par arrondissement, pas pour la ville entière.
    return {c for c in codes if c not in ("75056", "69123", "13055")}


def _available_years() -> list[int]:
    r = get(f"{BASE}/", allow_redirects=True)
    return sorted({int(y) for y in __import__("re").findall(r">(\d{4})/<", r.text)})


def _lines(dep: str, years: list[int]):
    """Lignes d'un département entier : une vente peut s'étendre sur plusieurs communes.

    Les fichiers par commune n'en donnent que la part locale. Au 67 rue de Roanne à Boën,
    une vente de 360 000 € porte sur 7 appartements, 2 à Boën et 5 dans la commune 42288 :
    lue par commune, son prix était divisé par 269 m² au lieu de 552 (1 338 €/m² contre 652).
    L'import du site lit les fichiers départementaux, et voit la vente entière.
    """
    for y in years:
        path = cached_download(f"{BASE}/{y}/departements/{dep}.csv.gz", CACHE / "dvf-dep" / str(y) / f"{dep}.csv.gz")
        if not path:
            continue
        with gzip.open(path, mode="rt", encoding="utf-8") as f:
            yield from csv.DictReader(f)


def _median_upper(values: list[float]) -> float | None:
    if not values:
        return None
    v = sorted(values)
    return v[len(v) // 2]


def check(addr, analysis: dict) -> list[Check]:
    re_ = analysis.get("realEstate") or {}
    if analysis.get("mode") != "address":
        return []
    lien = EXPLORE.format(lat=addr.lat, lon=addr.lon)
    # Les deux derniers millésimes publiés, comme le site (RECENT_YEARS, dvf-database.provider.ts).
    years = _available_years()[-2:]
    start = date(years[0], 1, 1).isoformat() if years else "9999"

    by_mutation: dict[str, list[dict]] = defaultdict(list)
    first_line: dict[str, dict] = {}
    communes = _communes_around(addr.lat, addr.lon)
    deps = sorted({c[:3] if c.startswith("97") else c[:2] for c in communes})
    for dep in deps:
        for row in _lines(dep, years):
            if "vente" not in (row.get("nature_mutation") or "").lower():
                continue
            if (row.get("date_mutation") or "") < start:
                continue
            mid = row["id_mutation"]
            by_mutation[mid].append(row)
            if row.get("type_local") in ("Appartement", "Maison") and mid not in first_line:
                first_line[mid] = row

    # Les ventes qui touchent une commune du cercle, avec toutes leurs lignes.
    touching = {mid for mid, rows in by_mutation.items() if any(r.get("code_commune") in communes for r in rows)}
    by_mutation = {mid: rows for mid, rows in by_mutation.items() if mid in touching}

    def dist(row):
        try:
            return distance_m(addr.lat, addr.lon, float(row["latitude"]), float(row["longitude"]))
        except (TypeError, ValueError):
            return None

    # Une vente = une mutation ; sa surface = la somme de ses logements, chacun compté une fois
    # (un logement revient sur plusieurs lignes quand le terrain a plusieurs natures de culture).
    sales = []
    for mid, rows in by_mutation.items():
        lots = {}
        for r in rows:
            if r.get("type_local") not in ("Appartement", "Maison"):
                continue
            key = tuple(r.get(c, "") for c in ("id_parcelle", "numero_volume", "lot1_numero", "lot2_numero",
                                                 "lot3_numero", "type_local", "surface_reelle_bati", "nombre_pieces_principales"))
            lots.setdefault(key, r)
        if not lots:
            continue
        first = first_line[mid]
        d = dist(first)
        try:
            price = float(rows[0]["valeur_fonciere"])
            surface = sum(float(r["surface_reelle_bati"] or 0) for r in lots.values())
        except (TypeError, ValueError):
            continue
        if d is None or d > RADIUS or price <= 0 or surface <= 0:
            continue
        # Le type de la vente est celui de sa première ligne de logement, comme à l'import.
        sales.append((d, price / surface, len(lots), first["type_local"]))
    sales.sort()

    period = f"{years[0]}-{years[-1]}" if years else "?"
    out: list[Check] = []
    site_period = re_.get("period") or {}
    site_years = f"{site_period.get('from')}-{site_period.get('to')}" if site_period else None
    out.append(Check("Prix DVF", "période annoncée", site_years, period,
                     OK if site_years == period else ERREUR, lien, "les deux derniers millésimes publiés"))

    nearest = sales[:LIMIT]
    kept = [(d, p, n, t) for d, p, n, t in nearest if 0 < p < MAX_PRICE_M2]
    site_count = re_.get("nearbyTransactionsCount") or 0
    out.append(Check("Prix DVF", "nombre de ventes", site_count, len(kept),
                     OK if site_count == len(kept) else ERREUR, lien, f"la source publique couvre {period}"))
    if kept:
        radius = max(d for d, *_ in kept)
        gap_m = abs((re_.get("radiusMeters") or 0) - radius)
        # Distance géodésique (PostGIS) contre haversine ici : quelques mètres d'écart possibles.
        out.append(Check("Prix DVF", "rayon annoncé (m)", re_.get("radiusMeters"), round(radius),
                         OK if gap_m <= 3 else ARRONDI if gap_m <= 10 else ERREUR, lien,
                         "distance de la vente retenue la plus lointaine"))

    markets = re_.get("markets") or {}
    for kind, type_local in KINDS.items():
        prices = [p for _, p, _, t in kept if t == type_local]
        multi = sum(1 for _, _, n, t in kept if t == type_local and n > 1)
        site = markets.get(kind) or {}
        label = "appartements" if kind == "appartement" else "maisons"
        out.append(Check("Prix DVF", f"{label} — nombre de ventes", site.get("count", 0), len(prices),
                         OK if site.get("count", 0) == len(prices) else ERREUR, lien, f"parmi les {LIMIT} plus proches"))
        if not prices:
            continue
        redo = _median_upper(prices) if len(prices) >= MIN_FOR_MEDIAN else None
        site_median = site.get("medianPricePerSqm")
        if redo is None or site_median is None:
            out.append(Check("Prix DVF", f"{label} — prix médian €/m²", site_median, None if redo is None else round(redo),
                             OK if redo is None and site_median is None else ERREUR, lien,
                             f"pas de médiane sous {MIN_FOR_MEDIAN} ventes"))
            continue
        gap = abs(site_median - redo) / redo * 100
        out.append(Check(
            "Prix DVF", f"{label} — prix médian €/m²", site_median, round(redo),
            OK if gap < 0.5 else ARRONDI if gap < 2 else ERREUR, lien,
            f"fichiers publics {period} : les {label} parmi les {LIMIT} ventes les plus proches à moins d'1 km, "
            f"surface totale des logements de chaque vente ({multi} ventes à plusieurs logements) ; écart {gap:.1f} %",
        ))
    return out
