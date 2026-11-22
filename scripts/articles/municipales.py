"""
Article « Municipales 2026, un an après : participation et résultats des grandes villes ».

Résultats des municipales des 15 et 22 mars 2026 par commune (`municipales_2026_commune`,
`municipales_2026_listes`), pour les communes d'au moins 100 000 habitants (population
DGFiP). Le tour décisif est le second s'il a eu lieu, le premier sinon, comme sur la card
Municipales. La liste gagnante est celle qui obtient le plus de sièges au conseil municipal.

Participation nationale : rapport des sommes de votants et d'inscrits de toutes les communes.
Aucun commentaire politique : le texte s'en tient aux nuances attribuées par l'État.

    python scripts/articles/municipales.py
"""

from collections import Counter

from common import connect, departement, fetch, noms_communes, write_snapshot

SLUG = "municipales-2026-grandes-villes"
SEUIL_POPULATION = 100000

# Libellés des nuances : ceux de la card Élections (i18n/messages/fr/analysis/elections.ts),
# complétés des codes qu'elle ne nomme pas.
NUANCES = {
    "LEXG": "Extrême gauche", "LFI": "La France insoumise", "LCOM": "Communiste", "LSOC": "Socialiste",
    "LUG": "Union de la gauche", "LVEC": "Écologiste", "LDVG": "Divers gauche", "LDIV": "Divers",
    "LREG": "Régionaliste", "LDVC": "Divers centre", "LENS": "Ensemble", "LMDM": "Modem", "LUDI": "UDI",
    "LLR": "Les Républicains", "LDVD": "Divers droite", "LUD": "Union de la droite",
    "LRN": "Rassemblement national", "LEXD": "Extrême droite", "LUXD": "Union extrême droite",
    "LUC": "Union du centre", "LREC": "Reconquête", "LHOR": "Horizons",
}


def pct(a, b):
    return round(a / b * 100, 1) if b else None


def main():
    conn = connect()
    noms = noms_communes(conn)
    villes = fetch(
        conn,
        """
        SELECT code_commune, population FROM local_tax_commune
        WHERE annee = (SELECT max(annee) FROM local_tax_commune) AND population >= %s
        ORDER BY population DESC
        """,
        (SEUIL_POPULATION,),
    )
    national = {
        r["tour"]: r
        for r in fetch(
            conn,
            "SELECT tour, sum(inscrits)::bigint AS inscrits, sum(votants)::bigint AS votants, count(*)::int AS communes "
            "FROM municipales_2026_commune GROUP BY tour",
        )
    }
    participation_t1 = pct(national[1]["votants"], national[1]["inscrits"])

    lignes = []
    for v in villes:
        code = v["code_commune"]
        tours = {r["tour"]: r for r in fetch(conn, "SELECT * FROM municipales_2026_commune WHERE code_commune = %s", (code,))}
        if 1 not in tours:
            continue
        decisif = 2 if 2 in tours else 1
        listes = fetch(
            conn,
            "SELECT * FROM municipales_2026_listes WHERE code_commune = %s AND tour = %s ORDER BY sieges_cm DESC NULLS LAST, voix DESC",
            (code, decisif),
        )
        nb_listes_t1 = fetch(
            conn, "SELECT count(*)::int AS n FROM municipales_2026_listes WHERE code_commune = %s AND tour = 1", (code,)
        )[0]["n"]
        gagnante = listes[0]
        seconde = listes[1] if len(listes) > 1 else None
        lignes.append({
            "code": code,
            "nom": noms.get(code, code),
            "dep": departement(code),
            "population": v["population"],
            "tourDecisif": decisif,
            "participationT1": pct(tours[1]["votants"], tours[1]["inscrits"]),
            "participationT2": pct(tours[2]["votants"], tours[2]["inscrits"]) if 2 in tours else None,
            "nbListesT1": nb_listes_t1,
            "nbListesDecisif": len(listes),
            "gagnante": {
                "nuance": gagnante["nuance"],
                "nuanceLibelle": NUANCES.get(gagnante["nuance"], gagnante["nuance"] or "Sans nuance"),
                "tete": gagnante["tete_de_liste"] or None,
                "liste": gagnante["libelle"],
                "pct": float(gagnante["pct_exprimes"]),
                "sieges": gagnante["sieges_cm"],
            },
            "ecartPoints": round(float(gagnante["pct_exprimes"]) - float(seconde["pct_exprimes"]), 1) if seconde else None,
        })

    t1 = [l for l in lignes if l["tourDecisif"] == 1]
    participations = sorted(lignes, key=lambda l: l["participationT1"])
    nuances = Counter(l["gagnante"]["nuanceLibelle"] for l in lignes)
    serre = min((l for l in lignes if l["ecartPoints"] is not None), key=lambda l: l["ecartPoints"])

    write_snapshot(SLUG, {
        "jourT1": 15,
        "jourT2": 22,
        "annee": 2026,
        "seuilPopulation": SEUIL_POPULATION,
        "nbVilles": len(lignes),
        "national": {
            "communes": national[1]["communes"],
            "communesT2": national[2]["communes"] if 2 in national else 0,
            "participationT1": participation_t1,
        },
        "faits": {
            "nbDecideesT1": len(t1),
            "nbDecideesT2": len(lignes) - len(t1),
            "participationMin": participations[0]["code"],
            "participationMax": participations[-1]["code"],
            "nbSousNationale": sum(1 for l in lignes if l["participationT1"] < participation_t1),
            "plusSerre": serre["code"],
            "nbListesMax": max(l["nbListesT1"] for l in lignes),
        },
        "nuancesGagnantes": [{"nuance": n, "villes": c} for n, c in nuances.most_common()],
        "villes": lignes,
    })


if __name__ == "__main__":
    main()
