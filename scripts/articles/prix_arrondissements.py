"""
Article « Prix au m² par arrondissement à Paris, Lyon et Marseille ».

Médiane du prix au m² des appartements vendus, par arrondissement, sur une année civile
(la dernière complète en base) et sur l'année quatre ans plus tôt, pour l'évolution.
Mêmes filtres que les pages commune (`postgis-commune-stats.provider.ts`) : surface de 9 à
300 m², prix de 1 000 à 30 000 €/m². Pas de médiane sous 30 ventes.

    python scripts/articles/prix_arrondissements.py
"""

from common import connect, fetch, write_snapshot

SLUG = "prix-m2-arrondissements-paris-lyon-marseille"
SEUIL_VENTES = 30
ECART_ANNEES = 4

VILLES = [
    {"id": "paris", "nom": "Paris", "pattern": "751__"},
    {"id": "lyon", "nom": "Lyon", "pattern": "6938_"},
    {"id": "marseille", "nom": "Marseille", "pattern": "132__"},
]

FILTRES = """
  type_local = 'Appartement'
  AND surface_bati BETWEEN 9 AND 300
  AND valeur_fonciere IS NOT NULL
  AND (valeur_fonciere / surface_bati) BETWEEN 1000 AND 30000
"""


def medianes(conn, pattern, annee, par_commune):
    group = "code_commune" if par_commune else "'ville'"
    return fetch(
        conn,
        f"""
        SELECT {group} AS code, count(*)::int AS ventes,
               round(percentile_cont(0.5) WITHIN GROUP (ORDER BY valeur_fonciere / surface_bati))::int AS median
        FROM dvf_transactions
        WHERE code_commune LIKE %s AND EXTRACT(YEAR FROM date_mutation) = %s AND {FILTRES}
        GROUP BY 1 ORDER BY 1
        """,
        (pattern, annee),
    )


def evolution(apres, avant):
    """Variation en %, arrondie à l'unité ; `None` sans point de départ."""
    if not avant:
        return None
    return round((apres - avant) / avant * 100)


def main():
    conn = connect()
    # Dernière année civile complète : décembre présent en base.
    annee = fetch(
        conn,
        "SELECT max(EXTRACT(YEAR FROM date_mutation))::int AS a FROM dvf_transactions "
        "WHERE EXTRACT(MONTH FROM date_mutation) = 12",
    )[0]["a"]
    avant = annee - ECART_ANNEES

    villes = []
    for v in VILLES:
        recent = {r["code"]: r for r in medianes(conn, v["pattern"], annee, True)}
        ancien = {r["code"]: r for r in medianes(conn, v["pattern"], avant, True)}
        ensemble = medianes(conn, v["pattern"], annee, False)[0]
        ensemble_avant = medianes(conn, v["pattern"], avant, False)[0]
        arrondissements = []
        for code, r in recent.items():
            if r["ventes"] < SEUIL_VENTES:
                continue
            a = ancien.get(code)
            median_avant = a["median"] if a and a["ventes"] >= SEUIL_VENTES else None
            arrondissements.append({
                "code": code,
                "ventes": r["ventes"],
                "median": r["median"],
                "medianAvant": median_avant,
                "evolutionPct": evolution(r["median"], median_avant),
            })
        arrondissements.sort(key=lambda r: -r["median"])
        plus_cher, moins_cher = arrondissements[0], arrondissements[-1]
        villes.append({
            "id": v["id"],
            "nom": v["nom"],
            "ventes": ensemble["ventes"],
            "median": ensemble["median"],
            "medianAvant": ensemble_avant["median"],
            "evolutionPct": evolution(ensemble["median"], ensemble_avant["median"]),
            # Faits calculés ici, pas dans la prose : le contrôle des articles retrouve chaque
            # nombre du texte dans ce fichier.
            "plusCher": plus_cher["code"],
            "moinsCher": moins_cher["code"],
            "nbArrondissements": len(arrondissements),
            "rapport": round(plus_cher["median"] / moins_cher["median"], 1),
            "ecartEuros": plus_cher["median"] - moins_cher["median"],
            "arrondissements": arrondissements,
        })

    write_snapshot(SLUG, {
        "millesime": annee,
        "millesimeAvant": avant,
        "seuilVentes": SEUIL_VENTES,
        # Repris de FILTRES : la prose les cite.
        "filtres": {"surfaceMin": 9, "surfaceMax": 300, "prixM2Min": 1000, "prixM2Max": 30000},
        "nbArrondissements": sum(len(v["arrondissements"]) for v in villes),
        "villes": villes,
    })


if __name__ == "__main__":
    main()
