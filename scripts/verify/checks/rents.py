"""
Loyers et zone tendue : le site face aux fichiers publics.

- Loyers : « Carte des loyers » 2025 (ANIL, ministère du Logement), un CSV par type de bien,
  lu brut (Latin-1, point-virgule, virgule décimale). Le journaliste lirait la même valeur sur
  la carte de data.gouv.fr ou dans le fichier. Comparaison à 0,1 €/m², la précision affichée.
- Zone tendue : « Liste des communes selon le zonage TLV » (décret du 22/12/2025). Paris,
  Lyon et Marseille n'y figurent qu'en ville entière.
"""

import csv
import io

from common import ARRONDI, CACHE, ERREUR, OK, A_RELIRE, Check, cached_download

BASE = "https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025"
FILES = {
    "app": f"{BASE}/20251211-145010/pred-app-mef-dhup.csv",
    "app12": f"{BASE}/20251211-144934/pred-app12-mef-dhup.csv",
    "app3": f"{BASE}/20251211-144951/pred-app3-mef-dhup.csv",
    "maison": f"{BASE}/20251211-145039/pred-mai-mef-dhup.csv",
}
LOYERS_PAGE = "https://www.data.gouv.fr/datasets/693aa2feed1bf4da603faa49/"
TLV = "https://static.data.gouv.fr/resources/liste-des-communes-selon-le-zonage-tlv-1/20251230-094759/zonage-tlv-decret-22-dec-2025.csv"
TLV_PAGE = "https://www.data.gouv.fr/datasets/657c88da2947e13be0597058/"
TLV_COLUMN = "Zonage TLV post décret 22/12/2025"
ZONAGES = {"1": "tendue", "2": "touristique", "3": "non"}
LEVELS = {"commune": "commune", "maille": "maille", "EPCI": "epci"}


def _num(s: str) -> float | None:
    s = (s or "").strip().replace(",", ".")
    return float(s) if s and s.upper() != "NA" else None


def _rents_row(kind: str, code: str) -> dict | None:
    path = cached_download(FILES[kind], CACHE / "anil" / f"{kind}.csv")
    text = path.read_bytes().decode("latin-1")
    for row in csv.DictReader(io.StringIO(text), delimiter=";"):
        if row["INSEE_C"] == code:
            return row
    return None


def _ville(code: str) -> str:
    if code.startswith("751"):
        return "75056"
    if code.startswith("6938"):
        return "69123"
    if code.startswith("132"):
        return "13055"
    return code


def check(addr, analysis: dict) -> list[Check]:
    rents = analysis.get("rents")
    out: list[Check] = []
    if not rents:
        return out
    code = rents["codeCommune"]
    for ind in rents.get("indicateurs", []):
        src = _rents_row(ind["type"], code)
        label = f"loyer {ind['type']} €/m²"
        if not src:
            out.append(Check("Loyers", label, ind["loyerM2"], "absent du fichier", ERREUR, LOYERS_PAGE))
            continue
        v = _num(src["loypredm2"])
        same = v is not None and round(ind["loyerM2"], 1) == round(v, 1)
        notes = []
        # Double arrondi : la base garde 2 décimales, l'affichage en garde 1 (30,749 → 30,75 → 30,8).
        double_rounding = not same and v is not None and abs(ind["loyerM2"] - v) < 0.01
        if double_rounding:
            notes.append(f"source {v:.4f} : arrondie au centième à l'import, puis au dixième à l'affichage")
        if LEVELS.get(src["TYPPRED"]) != ind["niveau"]:
            notes.append(f"niveau site {ind['niveau']} · source {src['TYPPRED']}")
        if int(src["nbobs_com"] or 0) != ind["nbAnnonces"]:
            notes.append(f"annonces site {ind['nbAnnonces']} · source {src['nbobs_com']}")
        statut = OK if same and not notes else ARRONDI if double_rounding and len(notes) == 1 else ERREUR
        out.append(Check("Loyers", label, round(ind["loyerM2"], 1), round(v, 1) if v else None,
                         statut, LOYERS_PAGE, " · ".join(notes)))

    zone = rents.get("zoneTendue")
    path = cached_download(TLV, CACHE / "tlv" / "zonage.csv")
    target = _ville(code)
    with open(path, encoding="utf-8-sig") as f:
        row = next((r for r in csv.DictReader(f, delimiter=";") if r["CODGEO25"] == target), None)
    expected = ZONAGES.get((row or {}).get(TLV_COLUMN, "")[:1]) if row else None
    if expected is None:
        out.append(Check("Zone tendue", "zonage", (zone or {}).get("zonage"), "commune absente du fichier", A_RELIRE, TLV_PAGE))
    else:
        got = (zone or {}).get("zonage")
        out.append(Check("Zone tendue", "zonage", got, expected, OK if got == expected else ERREUR, TLV_PAGE,
                         f"ligne {target} : « {row[TLV_COLUMN]} »"))
    return out
