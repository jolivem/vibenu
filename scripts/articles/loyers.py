"""
Article « Loyer au m² des 50 plus grandes villes de France ».

Loyers d'annonce de l'ANIL (`rent_commune`) : charges comprises, logements non meublés,
estimés à l'échelle de la commune. Mêmes règles que la card Loyers de l'analyse :
- un indicateur n'est « fiable » qu'avec au moins 30 annonces et un R² d'au moins 0,5
  (`rents-database.provider.ts`, `MIN_ANNONCES`, `MIN_R2`) ;
- Paris, Lyon et Marseille n'ont de loyer que par arrondissement : la ville reçoit la moyenne
  des arrondissements pondérée par leur nombre d'annonces, comme les pages commune
  (`components/commune/methode.ts`).

    python scripts/articles/loyers.py
"""

from statistics import median

from common import VILLES_PLM, connect, departement, fetch, noms_communes, write_snapshot

SLUG = "loyer-m2-50-plus-grandes-villes"
NB_VILLES = 50
MIN_ANNONCES = 30
MIN_R2 = 0.5
SURFACE_EXEMPLE = 40  # m², un deux-pièces
TYPES = ("app", "app12", "app3", "maison")
MOTIFS_PLM = {"75056": "751__", "69123": "6938_", "13055": "132__"}


def main():
    conn = connect()
    noms = noms_communes(conn)
    annee = fetch(conn, "SELECT max(annee) AS a FROM rent_commune")[0]["a"]
    villes = fetch(
        conn,
        """
        SELECT code_commune, population FROM local_tax_commune
        WHERE annee = (SELECT max(annee) FROM local_tax_commune)
        ORDER BY population DESC LIMIT %s
        """,
        (NB_VILLES,),
    )

    def loyers(code):
        """Un indicateur par type de bien ; agrégé pour Paris, Lyon et Marseille."""
        if code in MOTIFS_PLM:
            rows = fetch(
                conn,
                """
                SELECT type_bien,
                       sum(loyer_m2 * nb_annonces) / sum(nb_annonces) AS loyer_m2,
                       sum(nb_annonces)::int AS nb_annonces,
                       bool_and(niveau = 'commune') AS commune,
                       min(r2) AS r2
                FROM rent_commune WHERE annee = %s AND code_commune LIKE %s
                GROUP BY type_bien
                """,
                (annee, MOTIFS_PLM[code]),
            )
            return {
                r["type_bien"]: {
                    "loyer": round(float(r["loyer_m2"]), 1),
                    "annonces": r["nb_annonces"],
                    "niveau": "commune" if r["commune"] else "mixte",
                    "fiable": r["nb_annonces"] >= MIN_ANNONCES and r["r2"] is not None and float(r["r2"]) >= MIN_R2,
                }
                for r in rows
            }
        rows = fetch(
            conn,
            "SELECT type_bien, loyer_m2, nb_annonces, niveau, r2 FROM rent_commune WHERE annee = %s AND code_commune = %s",
            (annee, code),
        )
        return {
            r["type_bien"]: {
                "loyer": round(float(r["loyer_m2"]), 1),
                "annonces": r["nb_annonces"],
                "niveau": r["niveau"],
                "fiable": r["nb_annonces"] >= MIN_ANNONCES and r["r2"] is not None and float(r["r2"]) >= MIN_R2,
            }
            for r in rows
        }

    lignes = []
    for v in villes:
        l = loyers(v["code_commune"])
        if "app" not in l:
            continue
        lignes.append({
            "code": v["code_commune"],
            "nom": noms.get(v["code_commune"], v["code_commune"]),
            "dep": departement(v["code_commune"]),
            "population": v["population"],
            **{t: l.get(t) for t in TYPES},
        })
    lignes.sort(key=lambda l: -l["app"]["loyer"])
    for rang, l in enumerate(lignes, start=1):
        l["rang"] = rang
        l["exempleMensuel"] = round(l["app12"]["loyer"] * SURFACE_EXEMPLE) if l.get("app12") else None
        if l.get("app12") and l.get("app3"):
            l["primePetitsPct"] = round((l["app12"]["loyer"] / l["app3"]["loyer"] - 1) * 100)

    haut, bas = lignes[0], lignes[-1]
    loyers_app = [l["app"]["loyer"] for l in lignes]
    par_code = {l["code"]: l for l in lignes}
    hors_paris = lignes[1]

    write_snapshot(SLUG, {
        "annee": annee,
        "trimestre": 3,
        "nbVilles": len(lignes),
        "minAnnonces": MIN_ANNONCES,
        "minR2": MIN_R2,
        "surfaceExemple": SURFACE_EXEMPLE,
        "faits": {
            "plusCher": haut["code"],
            "moinsCher": bas["code"],
            "rapport": round(haut["app"]["loyer"] / bas["app"]["loyer"], 1),
            "secondPlusCher": hors_paris["code"],
            "rapportParisSecond": round(haut["app"]["loyer"] / hors_paris["app"]["loyer"], 1),
            "mediane": round(median(loyers_app), 1),
            "nbAuDessus15": sum(1 for x in loyers_app if x >= 15),
            "nbSous11": sum(1 for x in loyers_app if x < 11),
            "primePetitsMediane": round(median(l["primePetitsPct"] for l in lignes if "primePetitsPct" in l)),
            "ecartExemple": (haut["exempleMensuel"] or 0) - (bas["exempleMensuel"] or 0),
        },
        "seuils": {"haut": 15, "bas": 11},
        "villesPLM": list(VILLES_PLM),
        "villes": lignes,
    })


if __name__ == "__main__":
    main()
