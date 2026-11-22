"""
Article « Sécurité : les arrondissements de Paris, Lyon et Marseille comparés ».

Délinquance enregistrée par la police et la gendarmerie (SSMSI, `crime_commune`), par
arrondissement, pour trois indicateurs : cambriolages de logement (pour 1 000 logements),
vols sans violence contre des personnes et violences physiques hors cadre familial (pour
1 000 habitants). Repères (`crime_reference`) : la France et les communes de plus de
200 000 habitants (tranche 5), mêmes lignes que la card Sécurité.

L'évolution part de 2019 : 2020 et 2021, années de confinement, feraient croire à des
hausses qui ne sont qu'un retour à la normale. Un taux masqué par le SSMSI (trop peu de
faits) reste `None`.

    python scripts/articles/securite.py
"""

from common import connect, fetch, write_snapshot

SLUG = "securite-arrondissements-paris-lyon-marseille"
ANNEE_DEPART = 2019
INDICATEURS = {
    "cambriolages": "Cambriolages de logement",
    "vols": "Vols sans violence contre des personnes",
    "violences": "Violences physiques hors cadre familial",
}
VILLES = [
    {"id": "paris", "nom": "Paris", "code": "75056", "motif": "751__"},
    {"id": "lyon", "nom": "Lyon", "code": "69123", "motif": "6938_"},
    {"id": "marseille", "nom": "Marseille", "code": "13055", "motif": "132__"},
]
SEUIL_TRANCHE = 200000  # habitants, tranche 5 (scripts/import_crime.py, TRANCHES)


def numero(code):
    return int(code[4:]) if code.startswith("6938") else int(code[3:])


def evolution(apres, avant):
    if apres is None or not avant:
        return None
    return round((apres - avant) / avant * 100)


def main():
    conn = connect()
    annee = fetch(conn, "SELECT max(annee) AS a FROM crime_commune")[0]["a"]

    def taux(where, params):
        rows = fetch(
            conn,
            f"""
            SELECT code_commune, annee, indicateur, nombre, taux_pour_mille
            FROM crime_commune
            WHERE {where} AND annee IN (%s, %s) AND indicateur = ANY(%s)
            """,
            (*params, ANNEE_DEPART, annee, list(INDICATEURS.values())),
        )
        out = {}
        for r in rows:
            cle = next(k for k, v in INDICATEURS.items() if v == r["indicateur"])
            d = out.setdefault(r["code_commune"], {}).setdefault(cle, {})
            valeur = round(float(r["taux_pour_mille"]), 1) if r["taux_pour_mille"] is not None else None
            d["taux" if r["annee"] == annee else "tauxDepart"] = valeur
            if r["annee"] == annee:
                d["faits"] = r["nombre"]
        for indicateurs in out.values():
            for d in indicateurs.values():
                d.setdefault("taux", None)
                d.setdefault("tauxDepart", None)
                d.setdefault("faits", None)
                d["evolutionPct"] = evolution(d["taux"], d["tauxDepart"])
        return out

    references = {}
    for r in fetch(
        conn,
        "SELECT code, annee, indicateur, taux_pour_mille FROM crime_reference "
        "WHERE code IN ('FRANCE', 'T5') AND annee IN (%s, %s) AND indicateur = ANY(%s)",
        (ANNEE_DEPART, annee, list(INDICATEURS.values())),
    ):
        cle = next(k for k, v in INDICATEURS.items() if v == r["indicateur"])
        d = references.setdefault(r["code"], {}).setdefault(cle, {})
        d["taux" if r["annee"] == annee else "tauxDepart"] = round(float(r["taux_pour_mille"]), 1)
    for indicateurs in references.values():
        for d in indicateurs.values():
            d["evolutionPct"] = evolution(d.get("taux"), d.get("tauxDepart"))

    villes, tous = [], []
    for v in VILLES:
        arr = taux("code_commune LIKE %s", (v["motif"],))
        ville = taux("code_commune = %s", (v["code"],))[v["code"]]
        arrondissements = [
            {"code": code, "ville": v["id"], "numero": numero(code), **ind} for code, ind in sorted(arr.items())
        ]
        tous.extend(arrondissements)
        villes.append({"id": v["id"], "nom": v["nom"], "code": v["code"], **ville, "arrondissements": arrondissements})

    # Faits pour la prose : extrêmes sur les 45 arrondissements, par indicateur.
    faits = {}
    for cle in INDICATEURS:
        avec = [a for a in tous if a[cle]["taux"] is not None]
        haut = max(avec, key=lambda a: a[cle]["taux"])
        bas = min(avec, key=lambda a: a[cle]["taux"])
        france = references["FRANCE"][cle]["taux"]
        faits[cle] = {
            "plusHaut": haut["code"],
            "plusBas": bas["code"],
            "rapport": round(haut[cle]["taux"] / bas[cle]["taux"], 1),
            "nbAuDessusFrance": sum(1 for a in avec if a[cle]["taux"] > france),
            "nbEnBaisse": sum(1 for a in avec if a[cle]["evolutionPct"] is not None and a[cle]["evolutionPct"] < 0),
            "nbAvecEvolution": sum(1 for a in avec if a[cle]["evolutionPct"] is not None),
        }

    write_snapshot(SLUG, {
        "annee": annee,
        "anneeDepart": ANNEE_DEPART,
        "seuilTranche": SEUIL_TRANCHE,
        "base": 1000,  # taux pour 1 000 habitants ou logements
        "anneesConfinement": [2020, 2021],
        "nbArrondissements": len(tous),
        "references": references,
        "faits": faits,
        "villes": villes,
    })


if __name__ == "__main__":
    main()
