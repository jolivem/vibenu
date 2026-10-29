#!/usr/bin/env python3
"""
Collecte, pour chaque adresse de `adresses.csv`, ce que le site affiche : la réponse de l'API
d'analyse (exactement ce que le PDF imprime) et celle des « En bref ».

Usage :
    python collect.py                                # site en ligne
    python collect.py --site http://localhost:3111   # un serveur de test
    python collect.py --only boen                    # les adresses dont le libellé contient « boen »
    python collect.py --facts http://localhost:3111  # + les faits donnés au modèle (voir README)

Écrit dans out/<adresse>/ : address.json, analysis.json, insights.json, et la date de collecte.
"""

import argparse
import csv
import sys
from datetime import datetime, timezone

from common import OUT, geocode, get, save_json, slugify

ROOT_SITE = "https://claireadresse.fr"


def collect(site: str, query: str, facts_site: str | None = None) -> None:
    addr = geocode(query)
    folder = OUT / addr.slug
    params = {
        "lat": addr.lat,
        "lon": addr.lon,
        "label": addr.label,
        "city": addr.extra.get("city", ""),
        "postcode": addr.extra.get("postcode", ""),
        "type": addr.type,
        "citycode": addr.citycode,
    }
    r = get(f"{site}/api/location/analyze", params=params, timeout=120)
    r.raise_for_status()
    analysis = r.json()

    # Les « En bref » et la note de sécurité : même appel que la page.
    insights = None
    try:
        ri = _session_post(f"{site}/api/location/card-insights", analysis, {"citycode": addr.citycode, "lang": "fr"})
        insights = ri
    except Exception as error:  # noqa: BLE001 — une route en panne ne doit pas arrêter la collecte
        print(f"  « En bref » indisponibles : {error}", file=sys.stderr)

    # Les faits que le modèle a reçus pour écrire les « En bref ». Le site en ligne ne les montre
    # pas ; un serveur local lancé avec CARD_INSIGHTS_FIXTURE=1 et NEXT_PUBLIC_DEBUG=true les
    # recalcule à partir de la même réponse, sans appeler le modèle.
    if facts_site:
        try:
            facts = _session_post(f"{facts_site}/api/location/card-insights", analysis, {"citycode": addr.citycode, "lang": "fr"})
            save_json(folder / "facts.json", facts.get("debugInput"))
        except Exception as error:  # noqa: BLE001
            print(f"  faits indisponibles : {error}", file=sys.stderr)

    save_json(folder / "address.json", addr.__dict__)
    save_json(folder / "analysis.json", analysis)
    save_json(folder / "insights.json", insights)
    save_json(folder / "meta.json", {"site": site, "collecte": datetime.now(timezone.utc).isoformat(), "requete": query})
    print(f"  {addr.label} → {folder.relative_to(OUT.parent)}")


def _session_post(url: str, body: dict, params: dict) -> dict:
    import requests

    from common import USER_AGENT

    r = requests.post(url, json=body, params=params, timeout=120, headers={"User-Agent": USER_AGENT})
    r.raise_for_status()
    return r.json()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--site", default=ROOT_SITE)
    parser.add_argument("--only", help="filtre sur le libellé")
    parser.add_argument("--facts", help="serveur local qui rend les faits des « En bref » (fixture + debug)")
    args = parser.parse_args()

    with open(OUT.parent / "adresses.csv", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r.get("adresse", "").strip()]
    for row in rows:
        q = row["adresse"].strip()
        if args.only and args.only.lower() not in slugify(q):
            continue
        print(f"Collecte : {q}")
        collect(args.site.rstrip("/"), q, args.facts.rstrip("/") if args.facts else None)


if __name__ == "__main__":
    main()
