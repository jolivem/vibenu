"""
Article « Collège de secteur à Paris : le trouver, et lire ses résultats ».

Collèges de Paris (`school_establishment`, type `college`, communes 751xx), leur indice de
position sociale (IPS, dernière rentrée publiée) et leurs résultats au brevet (indicateurs
de valeur ajoutée, dernière session). Agrégats par arrondissement : l'article ne classe pas
les collèges un à un.

Les secteurs (`school_sector`) ne portent pas de code d'établissement, seulement un nom :
on compte les collèges qu'ils désignent, sans les relier aux résultats.

    python scripts/articles/college_paris.py
"""

from statistics import mean, median

from common import connect, fetch, write_snapshot

SLUG = "college-de-secteur-paris"


def pearson(xs, ys):
    mx, my = mean(xs), mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = (sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) ** 0.5
    return round(num / den, 2) if den else None


def dernier(conn, dataset):
    return fetch(
        conn,
        """
        SELECT DISTINCT ON (uai) uai, annee, data FROM school_data
        WHERE dataset = %s AND uai IN (
          SELECT uai FROM school_establishment WHERE type = 'college' AND code_commune LIKE '751%%'
        )
        ORDER BY uai, annee DESC
        """,
        (dataset,),
    )


def main():
    conn = connect()
    colleges = fetch(
        conn,
        "SELECT uai, secteur, code_commune FROM school_establishment WHERE type = 'college' AND code_commune LIKE '751%%'",
    )
    ips = {r["uai"]: r for r in dernier(conn, "fr-en-ips-colleges-ap2023")}
    va = {r["uai"]: r for r in dernier(conn, "fr-en-indicateurs-valeur-ajoutee-colleges")}
    # Les 770 lignes de la carte scolaire sont des morceaux de zone : on compte les collèges.
    nb_colleges_secteur = fetch(
        conn, "SELECT count(DISTINCT nom_etablissement)::int AS n FROM school_sector WHERE territoire = 'paris'"
    )[0]["n"]

    rentree = max(r["data"].get("rentree_scolaire", "") for r in ips.values())
    session = max(int(r["data"]["session"]) for r in va.values())
    ref = next(r["data"] for r in ips.values() if r["data"].get("rentree_scolaire") == rentree)

    lignes = []
    for c in colleges:
        i = ips.get(c["uai"])
        v = va.get(c["uai"])
        i_ok = i and i["data"].get("rentree_scolaire") == rentree and i["data"].get("ips") is not None
        v_ok = v and int(v["data"]["session"]) == session
        lignes.append({
            "uai": c["uai"],
            "public": c["secteur"] == "public",
            "arr": int(c["code_commune"][3:]),
            "ips": float(i["data"]["ips"]) if i_ok else None,
            "reussite": float(v["data"]["taux_de_reussite_g"]) if v_ok and v["data"].get("taux_de_reussite_g") is not None else None,
            "va": float(v["data"]["va_du_taux_de_reussite_g"]) if v_ok and v["data"].get("va_du_taux_de_reussite_g") is not None else None,
        })

    publics = [l for l in lignes if l["public"]]
    prives = [l for l in lignes if not l["public"]]
    pub_ips = [l["ips"] for l in publics if l["ips"] is not None]
    pub_reussite = [l for l in publics if l["ips"] is not None and l["reussite"] is not None]
    pub_va = [l for l in publics if l["ips"] is not None and l["va"] is not None]

    arrondissements = []
    for arr in range(1, 21):
        p = [l for l in publics if l["arr"] == arr]
        pi = [l["ips"] for l in p if l["ips"] is not None]
        pr = [l["reussite"] for l in p if l["reussite"] is not None]
        arrondissements.append({
            "arr": arr,
            "code": f"751{arr:02d}",
            "nbPublics": len(p),
            "nbPrives": sum(1 for l in prives if l["arr"] == arr),
            "ipsMedian": round(median(pi), 1) if pi else None,
            "ipsMin": round(min(pi), 1) if pi else None,
            "ipsMax": round(max(pi), 1) if pi else None,
            "reussiteMoyenne": round(mean(pr)) if pr else None,
        })

    avec_ips = [a for a in arrondissements if a["ipsMedian"] is not None]
    haut = max(avec_ips, key=lambda a: a["ipsMedian"])
    bas = min(avec_ips, key=lambda a: a["ipsMedian"])

    write_snapshot(SLUG, {
        "rentree": rentree,
        "session": session,
        "nbCollegesSectorises": nb_colleges_secteur,
        "nbColleges": len(lignes),
        "nbPublics": len(publics),
        "nbPrives": len(prives),
        "references": {
            "ipsNational": float(ref["ips_national"]),
            "ipsNationalPublic": float(ref["ips_national_public"]),
            "ipsNationalPrive": float(ref["ips_national_prive"]),
            "ipsParisPublic": float(ref["ips_departemental_public"]),
            "ipsParisPrive": float(ref["ips_departemental_prive"]),
        },
        "faits": {
            "ipsPublicMin": round(min(pub_ips), 1),
            "ipsPublicMax": round(max(pub_ips), 1),
            "arrIpsHaut": haut["arr"],
            "arrIpsBas": bas["arr"],
            "reussitePubliqueMoyenne": round(mean(l["reussite"] for l in pub_reussite)),
            "reussitePriveeMoyenne": round(mean(l["reussite"] for l in prives if l["reussite"] is not None)),
            "nbPublicsVaPositive": sum(1 for l in pub_va if l["va"] > 0),
            "nbPublicsVaNegative": sum(1 for l in pub_va if l["va"] < 0),
            "nbPublicsAvecVa": len(pub_va),
            # Corrélation entre le milieu social et la réussite : forte pour le taux brut, faible
            # pour la valeur ajoutée, qui retire justement l'effet du recrutement.
            "correlationIpsReussite": pearson([l["ips"] for l in pub_reussite], [l["reussite"] for l in pub_reussite]),
            "correlationIpsVa": pearson([l["ips"] for l in pub_va], [l["va"] for l in pub_va]),
        },
        "arrondissements": arrondissements,
    })


if __name__ == "__main__":
    main()
