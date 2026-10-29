"""
Population : le site face aux fichiers de l'INSEE.

- Recensement 2021, bases infracommunales (IRIS) : chômage, activité, diplômés du supérieur,
  taille des ménages, personnes seules, familles monoparentales, propriétaires, logements
  vacants et résidences secondaires. Recalculés à l'IRIS, à la commune (somme de ses IRIS) et
  en France (somme de toutes les lignes) — c'est ainsi que l'INSEE construit ces chiffres.
- Filosofi 2021 : revenu médian et taux de pauvreté. Ils ne s'additionnent pas : la commune et
  la France ont leurs propres valeurs publiées, qu'un journaliste lirait sur insee.fr.
"""

import csv
import io
import zipfile
from collections import defaultdict

from common import CACHE, ERREUR, METHODE, OK, ARRONDI, Check, cached_download

INSEE = "https://www.insee.fr/fr/statistiques/fichier"
RP = {
    "logement": f"{INSEE}/8268838/base-ic-logement-2021_csv.zip",
    "activite": f"{INSEE}/8268843/base-ic-activite-residents-2021_csv.zip",
    "diplomes": f"{INSEE}/8268840/base-ic-diplomes-formation-2021_csv.zip",
    "menages": f"{INSEE}/8268828/base-ic-couples-familles-menages-2021_csv.zip",
}
FILO_IRIS = f"{INSEE}/8229323/BASE_TD_FILO_IRIS_2021_DISP_CSV.zip"
FILO_COM = f"{INSEE}/7756729/base-cc-filosofi-2021-geo2025_csv.zip"
PAGE_RP = "https://www.insee.fr/fr/statistiques/8268838"
PAGE_FILO = "https://www.insee.fr/fr/statistiques/7756729"

# (section du DTO, clé, fichier, numérateur, dénominateur, facteur)
INDICATORS = [
    ("housing", "pctProprietaires", "logement", ["P21_RP_PROP"], ["P21_RP"], 100),
    ("housing", "pctVacants", "logement", ["P21_LOGVAC"], ["P21_LOG"], 100),
    ("housing", "pctResidencesSecondaires", "logement", ["P21_RSECOCC"], ["P21_LOG"], 100),
    ("employment", "tauxChomage", "activite", ["P21_CHOM1564"], ["P21_ACT1564"], 100),
    ("employment", "tauxActivite", "activite", ["P21_ACT1564"], ["P21_POP1564"], 100),
    ("employment", "pctDiplomesSuperieur", "diplomes", ["P21_NSCOL15P_SUP2", "P21_NSCOL15P_SUP34", "P21_NSCOL15P_SUP5"], ["P21_NSCOL15P"], 100),
    ("households", "tailleMoyenne", "menages", ["C21_PMEN"], ["C21_MEN"], 1),
    ("households", "pctPersonnesSeules", "menages", ["C21_MENPSEUL"], ["C21_MEN"], 100),
    ("households", "pctFamillesMonoparentales", "menages", ["C21_MENFAMMONO"], ["C21_MEN"], 100),
]

_sums_cache: dict = {}


def _f(v) -> float:
    try:
        return float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


def _sums(kind: str, iris: str, commune: str) -> dict[str, dict[str, float]]:
    """Sommes des variables utiles pour l'IRIS, la commune et la France."""
    key = (kind, iris, commune)
    if key in _sums_cache:
        return _sums_cache[key]
    cols = {c for _, _, k, num, den, _ in INDICATORS if k == kind for c in num + den}
    path = cached_download(RP[kind], CACHE / "insee" / RP[kind].rsplit("/", 1)[1])
    z = zipfile.ZipFile(path)
    name = next(i.filename for i in z.infolist() if i.filename.lower().endswith(".csv"))
    out = {s: defaultdict(float) for s in ("iris", "commune", "france")}
    with z.open(name) as fh:
        for row in csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8"), delimiter=";"):
            for c in cols:
                v = _f(row.get(c))
                out["france"][c] += v
                if row["COM"] == commune:
                    out["commune"][c] += v
                if row["IRIS"] == iris:
                    out["iris"][c] += v
    _sums_cache[key] = out
    return out


def _filo_iris(iris: str) -> dict:
    path = cached_download(FILO_IRIS, CACHE / "insee" / "filo-iris.zip")
    z = zipfile.ZipFile(path)
    name = next(i.filename for i in z.infolist() if i.filename.lower().endswith(".csv"))
    with z.open(name) as fh:
        for row in csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8"), delimiter=";"):
            if row["IRIS"] == iris:
                return row
    return {}


def _filo_geo(code: str) -> dict[str, float]:
    """Revenu médian (MED_SL) et taux de pauvreté (PR_MD60) d'une commune, ou de la France (FM)."""
    path = cached_download(FILO_COM, CACHE / "insee" / "filo-cc.zip")
    z = zipfile.ZipFile(path)
    out = {}
    with z.open("DS_FILOSOFI_CC_data.csv") as fh:
        for row in csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8"), delimiter=";"):
            if row["GEO"] == code and row["GEO_OBJECT"] in ("COM", "ARM", "FRANCE") and row["FILOSOFI_MEASURE"] in ("MED_SL", "PR_MD60"):
                out[row["FILOSOFI_MEASURE"]] = float(row["OBS_VALUE"])
    return out


def _cmp(label: str, site, source, lien: str, tol: float, note: str = "", gap_status: str = ERREUR) -> Check:
    if site is None and source is not None:
        return Check("Population", label, "non affiché", round(source, 2), METHODE, lien,
                     "l'INSEE publie ce chiffre, le site ne l'affiche pas")
    if site is None or source is None:
        return Check("Population", label, site, source, OK if site == source else gap_status, lien, note)
    d = abs(float(site) - float(source))
    return Check("Population", label, site, round(source, 2), OK if d <= tol else ARRONDI if d <= 2 * tol else gap_status, lien, note)


def check(addr, analysis: dict) -> list[Check]:
    demo = analysis.get("demographics")
    if not demo or not demo.get("codeIris"):
        return []
    iris = demo["codeIris"]
    commune = iris[:5]
    out: list[Check] = []

    for section, key, kind, num, den, factor in INDICATORS:
        sums = _sums(kind, iris, commune)
        for scale in ("iris", "commune", "france"):
            site = ((demo.get(section) or {}).get(scale) or {}).get(key)
            if site is None:
                continue
            n = sum(sums[scale][c] for c in num)
            d = sum(sums[scale][c] for c in den)
            src = n / d * factor if d else None
            tol = 0.05 if factor == 1 else 0.1
            out.append(_cmp(f"{key} — {scale}", site, src, PAGE_RP, tol))


    fi = _filo_iris(iris)
    if fi:
        out.append(_cmp("revenu médian — IRIS (€)", demo.get("revenuMedian"), _f(fi.get("DISP_MED21")) or None, PAGE_FILO, 5))
        out.append(_cmp("taux de pauvreté — IRIS (%)", demo.get("tauxPauvrete"), _f(fi.get("DISP_TP6021")) or None, PAGE_FILO, 0.5))
    com = _filo_geo(commune)
    cs = demo.get("communeStats") or {}
    note = "le site moyenne les valeurs de ses IRIS ; l'INSEE publie la valeur de la commune"
    out.append(_cmp("revenu médian — commune (€)", round(cs["revenuMedian"]) if cs.get("revenuMedian") else None, com.get("MED_SL"), PAGE_FILO, 50, note))
    out.append(_cmp("taux de pauvreté — commune (%)", round(cs["tauxPauvrete"], 1) if cs.get("tauxPauvrete") else None, com.get("PR_MD60"), PAGE_FILO, 0.5, note))
    fr = _filo_geo("FM")
    ns = demo.get("nationalStats") or {}
    note_fr = "repère France métropolitaine publié par l'INSEE ; le site moyenne les valeurs des IRIS"
    out.append(_cmp("revenu médian — France (€)", round(ns["revenuMedian"]) if ns.get("revenuMedian") else None, fr.get("MED_SL"), PAGE_FILO, 50, note_fr))
    out.append(_cmp("taux de pauvreté — France (%)", round(ns["tauxPauvrete"], 1) if ns.get("tauxPauvrete") else None, fr.get("PR_MD60"), PAGE_FILO, 0.5, note_fr))
    return out
