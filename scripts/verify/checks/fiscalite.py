"""
Fiscalité locale : le site face à data.economie.gouv.fr (DGFiP).

Le journaliste lirait les taux de la commune sur le jeu « Fiscalité locale des particuliers »,
et sa dette sur « Comptes individuels des communes ». On relit les deux par l'API publique, et
on recalcule les médianes (France, département) sur le fichier complet de l'année — le site les
calcule à l'import, ce ne sont pas des chiffres publiés tels quels.

Les droits de mutation sont écrits en dur dans le site d'après le barème PDF d'impots.gouv.fr :
le contrôle les signale à relire.
"""

import csv
import io
import statistics

from common import CACHE, ERREUR, OK, A_RELIRE, ARRONDI, Check, cached_download, get

BASE = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets"
TAUX = "fiscalite-locale-des-particuliers"
COMPTES = "comptes-individuels-des-communes-fichier-global-2025"
PAGE_TAUX = "https://data.economie.gouv.fr/explore/dataset/fiscalite-locale-des-particuliers/"
PAGE_COMPTES = f"https://data.economie.gouv.fr/explore/dataset/{COMPTES}/"


def _records(dataset: str, where: str, select: str) -> list[dict]:
    r = get(f"{BASE}/{dataset}/records", params={"where": where, "select": select, "limit": 100}, timeout=60)
    r.raise_for_status()
    return r.json().get("results", [])


def _year_file(year: int) -> list[dict]:
    """Tous les taux d'une année, pour refaire les médianes."""
    path = cached_download(
        f"{BASE}/{TAUX}/exports/csv?select=insee_com,taux_global_tfb,taux_plein_teom&where=exercice%3D%22{year}%22&delimiter=%3B",
        CACHE / "fiscalite" / f"taux-{year}.csv",
    )
    return list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig")), delimiter=";"))


def _median(values) -> float | None:
    v = [float(x) for x in values if x not in ("", None)]
    return round(statistics.median(v), 2) if v else None


def _cmp(label: str, site, source, lien: str, note: str = "", tol: float = 0.005) -> Check | None:
    # Le site n'affiche pas ce chiffre (Paris seule dans son département, pas de strate) : rien à comparer.
    if site is None:
        return None
    if source is None:
        return Check("Fiscalité", label, site, source, A_RELIRE if site != source else OK, lien, note)
    d = abs(float(site) - float(source))
    return Check("Fiscalité", label, site, source, OK if d <= tol else ARRONDI if d <= 0.02 else ERREUR, lien, note)


def check(addr, analysis: dict) -> list[Check]:
    lt = analysis.get("localTax")
    if not lt:
        return []
    code = lt["codeCommune"]
    out: list[Check] = []

    rows = {int(r["exercice"]): r for r in _records(TAUX, f'insee_com="{code}"', "exercice,taux_global_tfb,taux_plein_teom,taux_global_th")}
    tf = lt.get("taxeFonciere") or {}
    for year, value in zip(tf.get("annees", []), tf.get("tauxGlobal", [])):
        out.append(_cmp(f"taxe foncière {year} (taux global)", value, (rows.get(year) or {}).get("taux_global_tfb"), PAGE_TAUX))
    last = max(rows) if rows else None
    if last and tf.get("teom"):
        out.append(_cmp(f"ordures ménagères {last}", tf["teom"].get("taux"), rows[last].get("taux_plein_teom"), PAGE_TAUX))
    th = ((lt.get("residencesSecondaires") or {}).get("tauxTh") or {})
    if th and rows.get(th.get("annee")):
        out.append(_cmp(f"taxe d'habitation {th['annee']}", th.get("taux"), rows[th["annee"]].get("taux_global_th"), PAGE_TAUX))

    # Médianes refaites sur toutes les communes de l'année.
    if last and tf.get("medianeFrance"):
        allrows = _year_file(last)
        dep = lt.get("codeDepartement")
        france = _median(r["taux_global_tfb"] for r in allrows)
        depmed = _median(r["taux_global_tfb"] for r in allrows if r["insee_com"].startswith(dep)) if dep else None
        out.append(_cmp(f"médiane France taxe foncière {last}", tf["medianeFrance"][-1], france, PAGE_TAUX,
                        "médiane des communes, recalculée sur le fichier complet", tol=0.01))
        if tf.get("medianeDepartement"):
            out.append(_cmp(f"médiane département taxe foncière {last}", tf["medianeDepartement"][-1], depmed, PAGE_TAUX,
                            "recalculée", tol=0.01))

    fin = lt.get("finances") or {}
    dette = next((i for i in fin.get("indicateurs", []) if i["cle"] == "dette"), None)
    if dette and fin.get("annees") and fin["annees"][-1] == 2025:
        dep3, icom = code[:2].zfill(3), code[2:]
        src = _records(COMPTES, f'dep="{dep3}" and icom="{icom}"', "an,fdette,mdette")
        if src:
            out.append(_cmp("dette par habitant 2025 (€)", dette["parHabitant"][-1], src[0].get("fdette"), PAGE_COMPTES, tol=0.01))
            out.append(_cmp("dette, moyenne de la strate 2025 (€)", dette["moyenneStrate"][-1], src[0].get("mdette"), PAGE_COMPTES, tol=0.01))

    dmto = lt.get("dmto")
    if dmto:
        out.append(Check("Fiscalité", "droits de mutation (part départementale)", f"{dmto['tauxDepartemental']} %",
                         "barème PDF", A_RELIRE, dmto.get("sourceUrl", ""),
                         f"écrit en dur dans le site, valable au {dmto.get('valableAu')} : comparer au barème en vigueur"))
    return [c for c in out if c is not None]
