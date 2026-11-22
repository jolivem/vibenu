"""
Article « Taxe foncière : les taux des 50 plus grandes villes de France ».

Taux votés de taxe foncière sur le bâti (`local_tax_commune`, fichiers de fiscalité locale
de la DGFiP, 2021 à la dernière année) : taux global (commune et intercommunalité), part de
la commune et de l'intercommunalité, taxe d'enlèvement des ordures ménagères (TEOM).
Repère : la médiane des communes de France (`local_tax_reference`, code FRANCE), comme la
card Fiscalité locale.

Comme la card, l'article ne donne que des taux, jamais un montant d'impôt : le montant
dépend de la base d'imposition de chaque logement, que la base de données n'a pas.

    python scripts/articles/taxe_fonciere.py
"""

from statistics import median

from common import connect, departement, fetch, noms_communes, write_snapshot

SLUG = "taxe-fonciere-50-plus-grandes-villes"
NB_VILLES = 50


def f(v):
    return round(float(v), 2) if v is not None else None


def main():
    conn = connect()
    noms = noms_communes(conn)
    annee = fetch(conn, "SELECT max(annee) AS a FROM local_tax_commune")[0]["a"]
    depart = fetch(conn, "SELECT min(annee) AS a FROM local_tax_commune")[0]["a"]
    villes = fetch(
        conn,
        "SELECT code_commune, population FROM local_tax_commune WHERE annee = %s ORDER BY population DESC LIMIT %s",
        (annee, NB_VILLES),
    )
    france = {
        r["annee"]: r
        for r in fetch(conn, "SELECT annee, taux_tfb_mediane, taux_teom_mediane FROM local_tax_reference WHERE code = 'FRANCE'")
    }

    lignes = []
    for v in villes:
        serie = {
            r["annee"]: r
            for r in fetch(conn, "SELECT * FROM local_tax_commune WHERE code_commune = %s ORDER BY annee", (v["code_commune"],))
        }
        der, prem = serie[annee], serie.get(depart)
        if der["taux_tfb_global"] is None:
            continue
        taux = [f(serie[a]["taux_tfb_global"]) for a in sorted(serie) if serie[a]["taux_tfb_global"] is not None]
        lignes.append({
            "code": v["code_commune"],
            "nom": noms.get(v["code_commune"], v["code_commune"]),
            "dep": departement(v["code_commune"]),
            "population": v["population"],
            "taux": f(der["taux_tfb_global"]),
            "tauxCommune": f(der["taux_tfb_commune"]),
            "tauxEpci": f(der["taux_tfb_epci"]),
            "epci": der["nom_epci"],
            "teom": f(der["taux_teom"]),
            "tauxDepart": f(prem["taux_tfb_global"]) if prem else None,
            "evolutionPoints": round(f(der["taux_tfb_global"]) - f(prem["taux_tfb_global"]), 2)
            if prem and prem["taux_tfb_global"] is not None
            else None,
            "nbHausses": sum(1 for a, b in zip(taux, taux[1:]) if b > a + 0.005),
            # Année de la plus forte hausse d'une année sur l'autre (Paris : 2023).
            "anneePlusForteHausse": max(
                ((a, f(serie[a]["taux_tfb_global"]) - f(serie[a - 1]["taux_tfb_global"]))
                 for a in sorted(serie) if a - 1 in serie
                 and serie[a]["taux_tfb_global"] is not None and serie[a - 1]["taux_tfb_global"] is not None),
                key=lambda t: t[1], default=(None, 0),
            )[0],
        })
    lignes.sort(key=lambda l: -l["taux"])
    for rang, l in enumerate(lignes, start=1):
        l["rang"] = rang

    med_france = f(france[annee]["taux_tfb_mediane"])
    haut, bas = lignes[0], lignes[-1]
    avec_evol = [l for l in lignes if l["evolutionPoints"] is not None]
    plus_forte = max(avec_evol, key=lambda l: l["evolutionPoints"])
    avec_teom = [l for l in lignes if l["teom"]]

    write_snapshot(SLUG, {
        "annee": annee,
        "anneeDepart": depart,
        "nbVilles": len(lignes),
        "france": {
            "medianeTaux": med_france,
            "medianeTauxDepart": f(france[depart]["taux_tfb_mediane"]),
            "medianeTeom": f(france[annee]["taux_teom_mediane"]),
        },
        "faits": {
            "plusHaut": haut["code"],
            "plusBas": bas["code"],
            "ecartPoints": round(haut["taux"] - bas["taux"], 2),
            "mediane": round(median(l["taux"] for l in lignes), 2),
            "nbAuDessusFrance": sum(1 for l in lignes if l["taux"] > med_france),
            "plusForteHausse": plus_forte["code"],
            "nbStables": sum(1 for l in avec_evol if abs(l["evolutionPoints"]) < 0.005),
            "nbEnHausse": sum(1 for l in avec_evol if l["evolutionPoints"] >= 0.005),
            "nbSansTeom": len(lignes) - len(avec_teom),
            "teomPlusHaut": max(avec_teom, key=lambda l: l["teom"])["code"],
            "teomPlusBas": min(avec_teom, key=lambda l: l["teom"])["code"],
        },
        "villes": lignes,
        "reglementation": {
            # Base d'imposition = valeur locative cadastrale diminuée d'un abattement de 50 %.
            "abattementBasePct": 50,
            "sources": {"taxeFonciere": "https://www.service-public.gouv.fr/particuliers/vosdroits/F59"},
        },
    })


if __name__ == "__main__":
    main()
