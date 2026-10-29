"""
Prix des ventes : le site face aux fichiers publics DVF géolocalisées (Etalab, data.gouv.fr).

Le journaliste ouvrirait explore.data.gouv.fr/fr/immobilier et regarderait les ventes autour
de l'adresse. On relit ici les fichiers publics par commune
(files.data.gouv.fr/geo-dvf/latest/csv/{année}/communes/{dép}/{commune}.csv), pour toutes les
communes à moins d'1 km, et on refait le calcul du site : sur toutes les années publiées,
ventes d'appartements et de maisons à moins d'1 km, les 100 plus proches, une vente = une
mutation dont la surface est la somme de ses logements (chacun compté une fois), prix sous
50 000 €/m², médiane.
"""

import csv
from collections import defaultdict
from datetime import date

from common import CACHE, ERREUR, OK, ARRONDI, A_RELIRE, Check, cached_download, distance_m, get, offset

BASE = "https://files.data.gouv.fr/geo-dvf/latest/csv"
EXPLORE = "https://explore.data.gouv.fr/fr/immobilier?onglet=carte&filtre=tous&lat={lat}&lng={lon}&zoom=16"
RADIUS = 1000
LIMIT = 100
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


def _lines(code: str, years: list[int]):
    dep = code[:3] if code.startswith("97") else code[:2]
    for y in years:
        path = cached_download(f"{BASE}/{y}/communes/{dep}/{code}.csv", CACHE / "dvf" / str(y) / f"{code}.csv")
        if not path:
            continue
        with open(path, encoding="utf-8") as f:
            yield from csv.DictReader(f)


def _median_upper(values: list[float]) -> float | None:
    if not values:
        return None
    v = sorted(values)
    return v[len(v) // 2]


def check(addr, analysis: dict) -> list[Check]:
    re_ = analysis.get("realEstate") or {}
    site_median = re_.get("medianPricePerSquareMeter")
    site_count = re_.get("nearbyTransactionsCount")
    if analysis.get("mode") != "address":
        return []
    lien = EXPLORE.format(lat=addr.lat, lon=addr.lon)
    years = _available_years()
    today = date.today()
    start = date(today.year - 10, today.month, today.day).isoformat()

    by_mutation: dict[str, list[dict]] = defaultdict(list)
    first_line: dict[str, dict] = {}
    for code in sorted(_communes_around(addr.lat, addr.lon)):
        for row in _lines(code, years):
            if "vente" not in (row.get("nature_mutation") or "").lower():
                continue
            if (row.get("date_mutation") or "") < start:
                continue
            mid = row["id_mutation"]
            by_mutation[mid].append(row)
            if row.get("type_local") in ("Appartement", "Maison") and mid not in first_line:
                first_line[mid] = row

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
        sales.append((d, price / surface, len(lots)))
    sales.sort()
    nearest = sales[:LIMIT]
    multi = sum(1 for _, _, n in nearest if n > 1)
    kept = [p for _, p, _ in nearest if 0 < p < MAX_PRICE_M2]
    redo_median = _median_upper(kept)

    period = f"{years[0]}-{years[-1]}" if years else "?"
    out: list[Check] = []
    if redo_median is None:
        out.append(Check("Prix DVF", "prix médian €/m²", site_median, "aucune vente", A_RELIRE, lien))
        return out

    gap = abs(site_median - redo_median) / redo_median * 100 if site_median else 100
    out.append(Check(
        "Prix DVF", "prix médian €/m²", site_median, round(redo_median),
        OK if gap < 0.5 else ARRONDI if gap < 2 else ERREUR, lien,
        f"fichiers publics {period} : les 100 ventes les plus proches à moins d'1 km, surface totale "
        f"des logements de chaque vente ({multi} ventes à plusieurs logements) ; écart {gap:.1f} %",
    ))
    out.append(Check(
        "Prix DVF", "nombre de ventes", site_count, len(kept),
        OK if site_count == len(kept) else ERREUR, lien,
        f"la source publique couvre {period}",
    ))
    return out
