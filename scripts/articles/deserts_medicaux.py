"""
Article « Les communes de plus de 2 000 habitants sans médecin ni pharmacie ».

Base permanente des équipements 2025 de l'INSEE (`bpe_equipment`) : médecins généralistes
(D265) et pharmacies (D307), mêmes codes que la card Équipements. Population DGFiP
(`local_tax_commune`, dernière année). Les arrondissements de Paris, Lyon et Marseille sont
regroupés sous leur ville.

Prudence, déjà écrite dans presse/angles.md : la BPE rattache un équipement à l'adresse de
son gestionnaire, et un médecin installé dans une maison de santé voisine n'est pas compté
dans la commune où il consulte parfois. Les totaux sont robustes ; un nom de commune se
vérifie auprès de la mairie avant d'être cité ailleurs.

    python scripts/articles/deserts_medicaux.py
"""

from collections import Counter

from common import DEPARTEMENTS, connect, departement, fetch, noms_communes, write_snapshot

SLUG = "communes-sans-medecin-ni-pharmacie"
SEUIL = 2000
NB_LISTE = 20


def ville(code):
    if code.startswith("751"):
        return "75056"
    if code.startswith("6938"):
        return "69123"
    if code.startswith("132"):
        return "13055"
    return code


def main():
    conn = connect()
    noms = noms_communes(conn)
    equipements = {}
    for r in fetch(
        conn,
        "SELECT depcom, count(*) FILTER (WHERE typequ = 'D265')::int AS medecins, "
        "count(*) FILTER (WHERE typequ = 'D307')::int AS pharmacies "
        "FROM bpe_equipment WHERE typequ IN ('D265', 'D307') GROUP BY depcom",
    ):
        e = equipements.setdefault(ville(r["depcom"]), {"medecins": 0, "pharmacies": 0})
        e["medecins"] += r["medecins"]
        e["pharmacies"] += r["pharmacies"]

    # Mayotte n'a aucun équipement dans la BPE importée : absente, pas dépourvue. Exclue.
    communes = fetch(
        conn,
        "SELECT code_commune, population FROM local_tax_commune "
        "WHERE annee = (SELECT max(annee) FROM local_tax_commune) AND population IS NOT NULL "
        "AND code_commune NOT LIKE '976%%'",
    )
    annee_population = fetch(conn, "SELECT max(annee) AS a FROM local_tax_commune")[0]["a"]
    population_france = sum(c["population"] for c in communes)
    total_medecins = sum(e["medecins"] for e in equipements.values())
    total_pharmacies = sum(e["pharmacies"] for e in equipements.values())

    def eq(code):
        return equipements.get(code, {"medecins": 0, "pharmacies": 0})

    grandes = [c for c in communes if c["population"] >= SEUIL]
    sans_med = [c for c in grandes if eq(c["code_commune"])["medecins"] == 0]
    sans_ph = [c for c in grandes if eq(c["code_commune"])["pharmacies"] == 0]
    sans_deux = [c for c in sans_med if eq(c["code_commune"])["pharmacies"] == 0]
    toutes_sans_med = [c for c in communes if eq(c["code_commune"])["medecins"] == 0]

    def commune(c):
        e = eq(c["code_commune"])
        return {
            "code": c["code_commune"],
            "nom": noms.get(c["code_commune"], c["code_commune"]),
            "dep": departement(c["code_commune"]),
            "population": c["population"],
            "pharmacies": e["pharmacies"],
        }

    par_dep = Counter(departement(c["code_commune"]) for c in sans_med)
    sans_med_tries = sorted(sans_med, key=lambda c: -c["population"])

    write_snapshot(SLUG, {
        "millesimeBpe": 2025,
        "mayotteExclue": True,
        "anneePopulation": annee_population,
        "seuil": SEUIL,
        "nbCommunes": len(communes),
        "nbCommunesSeuil": len(grandes),
        "nbMedecins": total_medecins,
        "nbPharmacies": total_pharmacies,
        "medecinsPour10000": round(total_medecins / population_france * 10000, 1),
        "base10000": 10000,
        "nbToutesSansMedecin": len(toutes_sans_med),
        "partToutesSansMedecinPct": round(len(toutes_sans_med) / len(communes) * 100),
        "populationToutesSansMedecin": sum(c["population"] for c in toutes_sans_med),
        "populationToutesSansMedecinMillions": round(sum(c["population"] for c in toutes_sans_med) / 1e6),
        "sansMedecin": {
            "nb": len(sans_med),
            "population": sum(c["population"] for c in sans_med),
            "partPct": round(len(sans_med) / len(grandes) * 100, 1),
        },
        "sansPharmacie": {
            "nb": len(sans_ph),
            "population": sum(c["population"] for c in sans_ph),
            "partPct": round(len(sans_ph) / len(grandes) * 100, 1),
        },
        "sansLesDeux": {
            "nb": len(sans_deux),
            "population": sum(c["population"] for c in sans_deux),
        },
        "plusPeupleesSansMedecin": [commune(c) for c in sans_med_tries[:NB_LISTE]],
        "nbSansMedecinAvecPharmacie": sum(1 for c in sans_med if eq(c["code_commune"])["pharmacies"] > 0),
        "parDepartement": [
            {"dep": d, "nom": DEPARTEMENTS.get(d, d), "nb": n} for d, n in par_dep.most_common()
        ],
        "nbDepartementsConcernes": len(par_dep),
        "tableau": [commune(c) for c in sans_med_tries],
    })


if __name__ == "__main__":
    main()
