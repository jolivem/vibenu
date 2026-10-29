"""
Élections : le site face aux résultats officiels du ministère de l'Intérieur (data.gouv.fr).

- Présidentielle 2022, 1er tour : fichier par commune ; pour un arrondissement de Paris, Lyon
  ou Marseille, on additionne ses bureaux de vote (le numéro de bureau commence par celui de
  l'arrondissement), comme le ferait un journaliste avec le fichier par bureau.
- Municipales 2026 : fichier « Résultats - Communes » du tour qui a décidé (2e tour s'il a eu
  lieu dans la commune, sinon 1er).
Comparaison des inscrits, de la participation et des pourcentages, au dixième près (précision
affichée).
"""

import csv
import io

from common import CACHE, ERREUR, OK, A_RELIRE, Check, cached_download, get

PRES = "election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour"
MUN = {1: "elections-municipales-2026-resultats-du-premier-tour", 2: "elections-municipales-2026-resultats-du-second-tour"}
PAGE = "https://www.data.gouv.fr/datasets/{ds}/"


def _resource(dataset: str, title_prefix: str) -> str:
    r = get(f"https://www.data.gouv.fr/api/1/datasets/{dataset}/")
    r.raise_for_status()
    return next(x["url"] for x in r.json()["resources"] if x["title"].startswith(title_prefix))


def _num(s: str) -> float:
    return float((s or "0").replace("%", "").replace(",", ".").strip() or 0)


def _pres_rows(code: str) -> tuple[dict, dict[str, int]] | None:
    """Inscrits, votants, exprimés et voix par candidat, pour une commune ou un arrondissement."""
    plm = code[:3] in ("751", "693", "132") and code not in ("75056", "69123", "13055")
    title = "resultats-par-niveau-burvot-t1-france-entiere.txt" if plm else "resultats-par-niveau-subcom-t1-france-entiere.txt"
    path = cached_download(_resource(PRES, title), CACHE / "elections" / title)
    dep, com = code[:2], code[2:]
    city = {"75": "056", "69": "123", "13": "055"}.get(dep) if plm else com
    arr = str(int(code[-2:])) if plm else None
    totals = {"inscrits": 0, "votants": 0, "exprimes": 0}
    voix: dict[str, int] = {}
    found = False
    with open(path, encoding="latin-1") as f:
        reader = csv.reader(f, delimiter=";")
        header = next(reader)
        base = header.index("N°Panneau")
        bv = header.index("Code du b.vote") if "Code du b.vote" in header else None
        c_dep, c_com = header.index("Code du département"), header.index("Code de la commune")
        for row in reader:
            if row[c_dep] != dep or row[c_com] != city:
                continue
            if plm:
                # Bureau « 1501 » : 15e arrondissement (les bureaux à 3 chiffres sont du 1er au 9e).
                b = row[bv].strip()
                if b[:-2].lstrip("0") != arr:
                    continue
            found = True
            totals["inscrits"] += int(row[header.index("Inscrits")])
            totals["votants"] += int(row[header.index("Votants")])
            totals["exprimes"] += int(row[header.index("Exprimés")])
            for i in range(base, len(row) - 6, 7):
                name = row[i + 2].strip()
                if name:
                    voix[name] = voix.get(name, 0) + int(row[i + 4] or 0)
    return (totals, voix) if found else None


def check(addr, analysis: dict) -> list[Check]:
    out: list[Check] = []
    e = analysis.get("elections")
    code = (analysis.get("security") or {}).get("codeCommune") or addr.citycode
    if e:
        got = _pres_rows(addr.citycode)
        lien = PAGE.format(ds=PRES)
        if not got:
            out.append(Check("Élections", "présidentielle 2022", e.get("inscrits"), "commune absente", A_RELIRE, lien))
        else:
            t, voix = got
            out.append(Check("Élections", "présidentielle 2022 — inscrits", e["inscrits"], t["inscrits"],
                             OK if e["inscrits"] == t["inscrits"] else ERREUR, lien))
            part = round(t["votants"] / t["inscrits"] * 100, 1)
            out.append(Check("Élections", "présidentielle 2022 — participation %", e["participationPct"], part,
                             OK if abs(e["participationPct"] - part) < 0.05 else ERREUR, lien))
            by_name = {k.lower(): v for k, v in voix.items()}
            wrong = []
            for c in e.get("candidates", []):
                v = next((n for k, n in by_name.items() if k.startswith(c["candidat"].lower().split()[0]) or c["candidat"].lower() in k), None)
                if v is None:
                    wrong.append(f"{c['candidat']} introuvable")
                    continue
                pct = round(v / t["exprimes"] * 100, 2)
                if abs(pct - c["pctCommune"]) > 0.01:
                    wrong.append(f"{c['candidat']} site {c['pctCommune']} · source {pct}")
            out.append(Check("Élections", "présidentielle 2022 — % des 12 candidats", "12 candidats",
                             "identiques" if not wrong else f"{len(wrong)} écarts", OK if not wrong else ERREUR, lien, "; ".join(wrong[:4])))

    m = analysis.get("municipales")
    if m:
        tour = m.get("tour")
        target = {"751": "75056", "693": "69123", "132": "13055"}.get(addr.citycode[:3], addr.citycode) if m.get("villeEntiere") else addr.citycode
        path = cached_download(_resource(MUN[tour], "Municipales 2026 - Résultats - Communes"), CACHE / "elections" / f"mun-t{tour}.csv")
        row = None
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f, delimiter=";"):
                if r["Code commune"] == target:
                    row = r
                    break
        lien = PAGE.format(ds=MUN[tour])
        if not row:
            out.append(Check("Élections", f"municipales 2026 (tour {tour})", m.get("inscrits"), "commune absente", ERREUR, lien))
        else:
            ins = int(row["Inscrits"])
            out.append(Check("Élections", f"municipales 2026 tour {tour} — inscrits", m["inscrits"], ins,
                             OK if m["inscrits"] == ins else ERREUR, lien))
            part = round(int(row["Votants"]) / ins * 100, 1)
            out.append(Check("Élections", f"municipales 2026 tour {tour} — participation %", m["participationPct"], part,
                             OK if abs(m["participationPct"] - part) < 0.05 else ERREUR, lien))
            src_lists = {}
            i = 1
            while f"Numéro de panneau {i}" in row and row[f"Numéro de panneau {i}"]:
                src_lists[int(row[f"Numéro de panneau {i}"])] = (_num(row[f"% Voix/exprimés {i}"]), row[f"Nom candidat {i}"])
                i += 1
            wrong = []
            for l in m.get("listes", []):
                s = src_lists.get(l["panneau"])
                if not s:
                    wrong.append(f"panneau {l['panneau']} absent")
                elif abs(s[0] - l["pctExprimes"]) > 0.01:
                    wrong.append(f"{l['teteDeListe']} site {l['pctExprimes']} · source {s[0]}")
            out.append(Check("Élections", f"municipales 2026 tour {tour} — % des listes", f"{len(m.get('listes', []))} listes",
                             "identiques" if not wrong else f"{len(wrong)} écarts", OK if not wrong else ERREUR, lien, "; ".join(wrong[:4])))
    return out
