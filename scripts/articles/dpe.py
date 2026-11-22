"""
Article « Connaître le DPE d'une adresse, et ce qu'il change pour louer ou vendre ».

Pas de base locale : la répartition nationale des classes vient de l'API publique de
l'ADEME (DPE des logements existants depuis juillet 2021), avec la même requête que la card
Performance énergétique (`ademe-dpe.provider.ts`, `getFranceDistribution`) : les DPE
d'immeuble entier sont exclus, ils doublonneraient ceux des appartements.

Les règles citées (calendrier de location, gel des loyers, validité, annonces, audit,
coefficient de l'électricité) sont écrites sous `reglementation`, avec leur source,
vérifiées le 22 novembre 2026.

    python scripts/articles/dpe.py
"""

import json
import urllib.parse
import urllib.request

from common import write_snapshot

SLUG = "connaitre-dpe-adresse"
BASE = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant"
LOGEMENTS = "NOT type_batiment:immeuble"
CLASSES = ["A", "B", "C", "D", "E", "F", "G"]


def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def main():
    params = urllib.parse.urlencode({"field": "etiquette_dpe", "size": "0", "qs": LOGEMENTS})
    aggs = get(f"{BASE}/values_agg?{params}")
    maj = get(f"{BASE}?select=dataUpdatedAt").get("dataUpdatedAt", "")[:10]
    compte = {a["value"]: a["total"] for a in aggs["aggs"] if a["value"] in CLASSES}
    total = sum(compte.values())
    part = {c: round(compte.get(c, 0) / total * 100, 1) for c in CLASSES}

    write_snapshot(SLUG, {
        "miseAJourAdeme": maj,
        "depuis": "2021-07-01",
        "total": total,
        "totalMillionsPlancher": total // 1_000_000,  # « plus de 15 millions »
        "classes": [{"classe": c, "diagnostics": compte.get(c, 0), "partPct": part[c]} for c in CLASSES],
        "faits": {
            "nbFG": compte.get("F", 0) + compte.get("G", 0),
            "partFGPct": round((compte.get("F", 0) + compte.get("G", 0)) / total * 100, 1),
            "partEFGPct": round((compte.get("E", 0) + compte.get("F", 0) + compte.get("G", 0)) / total * 100, 1),
            "partABPct": round((compte.get("A", 0) + compte.get("B", 0)) / total * 100, 1),
            "classeLaPlusFrequente": max(compte, key=compte.get),
        },
        "reglementation": {
            "interdictionG": 2025,
            "interdictionF": 2028,
            "interdictionE": 2034,
            "outreMerFG": 2028,
            "gelLoyersDepuis": "2022-08",
            "validiteAns": 10,
            "dpeAnciensInvalidesDepuis": "2025-01-01",
            "dpeAnciensPeriode": [2018, 2021],
            "amendeAnnonceParticulier": 3000,
            "amendeAnnonceSociete": 15000,
            "auditClasses": ["E", "F", "G"],
            "coefficientElectricite": {"avant": 2.3, "depuis2026": 1.9, "en2027": 1.7, "annee": 2026, "anneeSuivante": 2027},
            "numeroAdemeChiffres": 13,
            # Projet de loi en discussion au 22 novembre 2026 : à suivre, rien n'est en vigueur.
            "projetLoi": {
                "titre": "projet de loi visant la relance et la décentralisation du logement",
                "adoptionSenat": "2026-07-08",
                "seanceAssemblee": "2026-11-16",
                "amendementSelonPresse": "2026-11-17",
                "etatAu": "2026-11-22",
                "sources": {
                    "assemblee": "https://www.assemblee-nationale.fr/dyn/17/dossiers/PJL_relance_decentralisation_logement_2",
                    "senat": "https://www.senat.fr/dossier-legislatif/pjl25-801.html",
                },
            },
            "sources": {
                "dpe": "https://www.service-public.gouv.fr/particuliers/vosdroits/F16096",
                "location": "https://www.service-public.gouv.fr/particuliers/vosdroits/F2042",
                "gelLoyers": "https://www.ecologie.gouv.fr/politiques-publiques/location-gel-loyers-passoires-energetiques",
                "ministere": "https://www.ecologie.gouv.fr/politiques-publiques/diagnostic-performance-energetique-dpe",
                "observatoire": "https://observatoire-dpe-audit.ademe.fr/",
            },
        },
    })


if __name__ == "__main__":
    main()
