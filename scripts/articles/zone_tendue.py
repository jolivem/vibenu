"""
Article « Zone tendue : la liste des communes et ce que ça change ».

Zonage de chaque commune (`rent_zone_tendue`, décret du 22 décembre 2025), population
DGFiP (`local_tax_commune`, dernière année), majoration de la taxe d'habitation sur les
résidences secondaires votée par les communes (même table).

Les règles de droit citées par le texte sont écrites ici, sous `reglementation`, avec leur
source : le contrôle des articles retrouve ainsi chaque nombre de la prose.

    python scripts/articles/zone_tendue.py
"""

from collections import Counter

from common import DEPARTEMENTS, connect, departement, fetch, noms_communes, write_snapshot

SLUG = "zone-tendue-liste-des-communes"
NB_PLUS_PEUPLEES = 15
SEUIL_TABLEAU = 10000  # habitants : communes listées dans le tableau complet


def pct(part, total):
    return round(part / total * 100)


def main():
    conn = connect()
    noms = noms_communes(conn)
    lignes = fetch(
        conn,
        """
        SELECT z.code_commune, z.zonage, z.decret, t.population, t.majoration_rs, t.taux_majoration_rs
        FROM rent_zone_tendue z
        LEFT JOIN local_tax_commune t
          ON t.code_commune = z.code_commune
         AND t.annee = (SELECT max(annee) FROM local_tax_commune)
        """,
    )
    annee_population = fetch(conn, "SELECT max(annee) AS a FROM local_tax_commune")[0]["a"]
    population_totale = sum(l["population"] or 0 for l in lignes)

    def commune(l):
        return {
            "code": l["code_commune"],
            "nom": noms.get(l["code_commune"], l["code_commune"]),
            "dep": departement(l["code_commune"]),
            "population": l["population"],
            "majoration": float(l["taux_majoration_rs"]) if l["majoration_rs"] and l["taux_majoration_rs"] else None,
        }

    zones = {}
    for zonage in ("tendue", "touristique"):
        membres = [l for l in lignes if l["zonage"] == zonage]
        avec_pop = sorted((l for l in membres if l["population"]), key=lambda l: -l["population"])
        population = sum(l["population"] for l in avec_pop)
        majorees = [l for l in membres if l["majoration_rs"] and l["taux_majoration_rs"]]
        par_dep = Counter(departement(l["code_commune"]) for l in membres)
        zones[zonage] = {
            "nbCommunes": len(membres),
            "population": population,
            "partPopulationPct": pct(population, population_totale),
            "nbMajoration": len(majorees),
            "partMajorationPct": pct(len(majorees), len(membres)),
            "tauxMajorationMoyen": round(sum(float(l["taux_majoration_rs"]) for l in majorees) / len(majorees)),
            "nbMajorationMax": sum(1 for l in majorees if float(l["taux_majoration_rs"]) >= 60),
            "plusPeuplees": [commune(l) for l in avec_pop[:NB_PLUS_PEUPLEES]],
            "parDepartement": [
                {"dep": d, "nom": DEPARTEMENTS.get(d, d), "nbCommunes": n} for d, n in par_dep.most_common()
            ],
            "nbDepartements": len(par_dep),
            "tableau": [commune(l) for l in avec_pop if l["population"] >= SEUIL_TABLEAU],
        }

    write_snapshot(SLUG, {
        "decret": lignes[0]["decret"].isoformat(),
        "anneePopulation": annee_population,
        "nbCommunesFrance": len(lignes),
        "populationFrance": population_totale,
        "seuilTableau": SEUIL_TABLEAU,
        "tendue": zones["tendue"],
        "touristique": zones["touristique"],
        "nbZonees": zones["tendue"]["nbCommunes"] + zones["touristique"]["nbCommunes"],
        "tauxMajorationMax": 60,
        "reglementation": {
            "seuilAgglomeration": 50000,
            "preavisMois": 1,
            "preavisNormalMois": 3,
            "tlvTauxPremiereAnnee": 17,
            "tlvTauxSuivantes": 34,
            "tlvVacanceAnnees": 1,
            "tvlhAnnee": 2027,
            "tvlhLoiFinances": 2026,
            "zonageTouristiqueLoiFinances": 2023,
            "relocationVacanceMois": 18,
            "relocationJusquau": "2027-07-31",
            "relocationDecret": "2026-644",
            "sources": {
                "preavis": "https://www.service-public.gouv.fr/particuliers/vosdroits/F1168",
                "relocation": "https://www.service-public.gouv.fr/particuliers/vosdroits/F1314",
                "tlv": "https://www.service-public.gouv.fr/particuliers/vosdroits/F17293",
                "majoration": "https://www.service-public.gouv.fr/particuliers/vosdroits/F42",
            },
        },
    })


if __name__ == "__main__":
    main()
