"""
DPE à l'adresse : le site face à la base de l'ADEME.

Le journaliste chercherait les DPE de l'adresse sur l'observatoire de l'ADEME, ou par numéro de
DPE. On relit ici la base « DPE Logements existants » par l'identifiant BAN de l'adresse —
autre chemin que le site, qui cherche les DPE posés à moins de 2 m du point.

On compare :
- la liste des numéros de DPE affichés à ceux de la base (aucun DPE en trop, aucun manquant) ;
- les étiquettes de chacun ;
- le dédoublonnage : un logement diagnostiqué plusieurs fois (même surface, même complément
  d'adresse) ne garde que son DPE le plus récent, refait ici indépendamment.
"""

import re
import unicodedata

from common import ERREUR, METHODE, OK, A_RELIRE, Check, get

API = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines"
OBSERVATOIRE = "https://observatoire-dpe-audit.ademe.fr/afficher-dpe/"
FIELDS = "numero_dpe,date_etablissement_dpe,etiquette_dpe,etiquette_ges,surface_habitable_logement,conso_5_usages_par_m2_ep,complement_adresse_logement,type_batiment"


def _key(row: dict) -> str:
    c = unicodedata.normalize("NFD", (row.get("complement_adresse_logement") or "").lower())
    c = re.sub(r"[^a-z0-9]", "", c)
    return f"{row.get('surface_habitable_logement')}|{c}"


def _variants(label: str) -> set[str]:
    """Graphies que l'ADEME a pu enregistrer : accents, apostrophe droite ou typographique."""
    plain = "".join(c for c in unicodedata.normalize("NFD", label) if unicodedata.category(c) != "Mn")
    out = set()
    for v in (label, plain):
        out |= {v, v.replace("'", "’"), v.replace("'", " ")}
    return out


def _address_ids(addr) -> set[str]:
    """
    Identifiants BAN de l'adresse côté ADEME. Le service d'adresses a changé de format
    (`33063_8ajxqk_00012`) ; la base de l'ADEME garde souvent l'ancien (`33063_6975_00012`).
    On prend donc aussi ceux des DPE dont l'adresse a le même texte.
    """
    ids = {addr.ban_id} if addr.ban_id else set()
    for v in _variants(addr.label):
        r = get(API, params={"qs": f'adresse_ban:"{v}"', "size": 200, "select": "identifiant_ban,adresse_ban"}, timeout=60)
        if r.status_code == 200:
            for x in r.json().get("results", []):
                # Le champ est analysé : on ne garde que les textes réellement identiques.
                if x.get("identifiant_ban") and x.get("adresse_ban") in _variants(addr.label) | {addr.label}:
                    ids.add(x["identifiant_ban"])
    return ids


def check(addr, analysis: dict) -> list[Check]:
    energy = analysis.get("energy")
    site = (energy or {}).get("adresse")
    if not addr.ban_id or addr.type != "housenumber":
        return []
    ids = _address_ids(addr)
    qs = " OR ".join(f'identifiant_ban:"{i}"' for i in sorted(ids))
    r = get(API, params={"qs": f"({qs})", "size": 1000, "select": FIELDS}, timeout=60)
    lien = f"https://data.ademe.fr/datasets/dpe03existant (identifiant BAN {', '.join(sorted(ids))})"
    if r.status_code != 200:
        return [Check("DPE", "DPE à l'adresse", "—", f"HTTP {r.status_code}", A_RELIRE, lien)]
    rows = [x for x in r.json().get("results", []) if (x.get("type_batiment") or "") != "immeuble"]

    # Dédoublonnage indépendant : le plus récent par logement.
    latest: dict[str, dict] = {}
    for x in sorted(rows, key=lambda x: x.get("date_etablissement_dpe") or "", reverse=True):
        latest.setdefault(_key(x), x)
    source_ids = {x["numero_dpe"]: x for x in latest.values()}

    out: list[Check] = []
    if not site:
        if rows:
            out.append(Check("DPE", "DPE à l'adresse", "aucun", f"{len(source_ids)} logements", ERREUR, lien))
        return out

    site_ids = {d["numero"]: d for d in site.get("diagnostics", [])}
    missing = sorted(set(source_ids) - set(site_ids))
    extra = sorted(set(site_ids) - set(source_ids))
    out.append(Check(
        "DPE", "nombre de logements diagnostiqués", site.get("total"), len(source_ids),
        OK if site.get("total") == len(source_ids) and not missing and not extra else ERREUR, lien,
        f"{len(rows)} DPE bruts dans la base, {len(rows) - len(source_ids)} plus anciens d'un même logement écartés"
        + (f" · absents du site : {', '.join(missing[:5])}" if missing else "")
        + (f" · en trop sur le site : {', '.join(extra[:5])}" if extra else ""),
    ))
    wrong = []
    for num, d in site_ids.items():
        src = source_ids.get(num)
        if not src:
            continue
        if d["energie"] != src.get("etiquette_dpe") or (d.get("ges") or None) != (src.get("etiquette_ges") or None):
            wrong.append(f"{num} : site {d['energie']}/{d.get('ges')} · ADEME {src.get('etiquette_dpe')}/{src.get('etiquette_ges')}")
        surf_site, surf_src = d.get("surface"), src.get("surface_habitable_logement")
        if surf_site is not None and surf_src is not None and abs(float(surf_site) - float(surf_src)) > 0.05:
            wrong.append(f"{num} : surface site {surf_site} · ADEME {surf_src}")
    out.append(Check(
        "DPE", "étiquettes, surfaces des DPE listés", f"{len(site_ids)} lignes", "identiques" if not wrong else f"{len(wrong)} écarts",
        OK if not wrong else ERREUR, OBSERVATOIRE + "{numéro}", "; ".join(wrong[:5]),
    ))
    # Répartition par classe affichée dans la barre.
    counts_src: dict[str, int] = {}
    for x in latest.values():
        counts_src[x["etiquette_dpe"]] = counts_src.get(x["etiquette_dpe"], 0) + 1
    counts_site = {k: v for k, v in (site.get("counts") or {}).items() if v}
    out.append(Check("DPE", "répartition par classe (barre)", counts_site, counts_src,
                     OK if counts_site == counts_src else ERREUR, lien))
    if len(rows) != len(source_ids):
        out.append(Check("DPE", "doublons regroupés", f"{len(source_ids)} logements", f"{len(rows)} DPE dans la base",
                         METHODE, lien, "choix du site : un DPE par logement ; l'observatoire liste tous les DPE"))
    return out
