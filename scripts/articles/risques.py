"""
Article « Inondation, argiles, catastrophes naturelles : vérifier les risques d'une adresse ».

Reconnaissances de l'état de catastrophe naturelle (base GASPAR de Géorisques,
`catnat_arrete` : une ligne par arrêté × commune × péril × période). Relancer
`scripts/import_catnat.py` avant ce script : la base est refaite au fil du Journal officiel.

Les règles citées (état des risques, assurance) sont écrites sous `reglementation`, avec
leur source.

    python scripts/articles/risques.py
"""

from common import DEPARTEMENTS, connect, departement, fetch, noms_communes, write_snapshot

SLUG = "risques-naturels-adresse-catastrophe-naturelle"
NB_COMMUNES = 15
ANNEE_DEBUT_SERIE = 2010

# Mêmes libellés que la card Risques (i18n/messages/fr/analysis/risks.ts, `perils`).
PERILS = {
    "ICB": "Inondations et coulées de boue",
    "SEC": "Sécheresse (retrait-gonflement des argiles)",
    "MVT": "Mouvements de terrain",
    "TMP": "Tempête",
    "CMV": "Chocs mécaniques des vagues",
    "GLT": "Glissement de terrain",
    "PDN": "Poids de la neige",
    "IRN": "Inondations par remontée de nappe",
}


def main():
    conn = connect()
    noms = noms_communes(conn)
    imp = fetch(conn, "SELECT fichier, date_fichier FROM georisques_import WHERE jeu = 'catnat'")[0]
    total = fetch(
        conn,
        """
        SELECT count(*)::int AS reconnaissances,
               count(DISTINCT code_commune)::int AS communes,
               min(date_publication_jo) AS premier_jo,
               max(date_publication_jo) AS dernier_jo
        FROM catnat_arrete
        """,
    )[0]
    nb_communes_france = fetch(
        conn,
        "SELECT count(*)::int AS n FROM local_tax_commune WHERE annee = (SELECT max(annee) FROM local_tax_commune)",
    )[0]["n"]
    communes_touchees = fetch(
        conn,
        """
        SELECT count(DISTINCT c.code_commune)::int AS n FROM catnat_arrete c
        JOIN local_tax_commune t ON t.code_commune = c.code_commune
         AND t.annee = (SELECT max(annee) FROM local_tax_commune)
        """,
    )[0]["n"]

    par_peril = [
        {"code": r["risque_code"], "libelle": PERILS[r["risque_code"]], "reconnaissances": r["n"]}
        for r in fetch(conn, "SELECT risque_code, count(*)::int AS n FROM catnat_arrete GROUP BY 1 ORDER BY 2 DESC")
        if r["risque_code"] in PERILS
    ]

    # Sécheresse par année d'événement (date de début), depuis ANNEE_DEBUT_SERIE.
    secheresse = fetch(
        conn,
        """
        SELECT EXTRACT(YEAR FROM date_debut)::int AS annee, count(*)::int AS n
        FROM catnat_arrete WHERE risque_code = 'SEC' AND date_debut >= make_date(%s, 1, 1)
        GROUP BY 1 ORDER BY 1
        """,
        (ANNEE_DEBUT_SERIE,),
    )
    record = max(secheresse, key=lambda r: r["n"])
    avant = [r["n"] for r in secheresse if r["annee"] < 2017]

    communes = fetch(
        conn,
        """
        SELECT code_commune, count(*)::int AS n,
               count(*) FILTER (WHERE risque_code = 'ICB')::int AS inondations
        FROM catnat_arrete GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT %s
        """,
        (NB_COMMUNES,),
    )

    write_snapshot(SLUG, {
        "fichier": imp["date_fichier"].isoformat(),
        "premierJo": total["premier_jo"].isoformat(),
        "dernierJo": total["dernier_jo"].isoformat(),
        "reconnaissances": total["reconnaissances"],
        "nbCommunesFrance": nb_communes_france,
        "nbCommunesTouchees": communes_touchees,
        "partCommunesToucheesPct": round(communes_touchees / nb_communes_france * 100),
        "perils": par_peril,
        "partInondationsPct": round(par_peril[0]["reconnaissances"] / total["reconnaissances"] * 100),
        "secheresse": {
            "anneeDebut": ANNEE_DEBUT_SERIE,
            "parAnnee": [{"annee": r["annee"], "reconnaissances": r["n"]} for r in secheresse],
            "anneeRecord": record["annee"],
            "record": record["n"],
            "moyenneAvant2017": round(sum(avant) / len(avant)) if avant else None,
            "anneeRupture": 2017,
        },
        "communes": [
            {
                "code": c["code_commune"],
                "nom": noms.get(c["code_commune"], c["code_commune"]),
                "dep": departement(c["code_commune"]),
                "depNom": DEPARTEMENTS.get(departement(c["code_commune"]), ""),
                "reconnaissances": c["n"],
                "inondations": c["inondations"],
            }
            for c in communes
        ],
        "reglementation": {
            "etatRisquesValiditeMois": 6,
            "declarationJours": 30,
            "franchise": 380,
            "franchiseSecheresse": 1520,
            "sismiciteNiveauMin": 2,
            "sismiciteNiveauMax": 5,
            "radonNiveau": 3,
            "sources": {
                "etatRisques": "https://www.service-public.gouv.fr/particuliers/vosdroits/F12239",
                "assurance": "https://www.service-public.gouv.fr/particuliers/vosdroits/F3076",
                "errial": "https://errial.georisques.gouv.fr/",
            },
        },
    })


if __name__ == "__main__":
    main()
