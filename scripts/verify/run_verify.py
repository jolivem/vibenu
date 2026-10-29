#!/usr/bin/env python3
"""
Lance les contrôles sur les adresses collectées (collect.py), et écrit un rapport HTML par
adresse plus une synthèse : out/rapport.html.

Usage :
    python run_verify.py                     # tous les domaines
    python run_verify.py --domaines risks,dpe
"""

import argparse
import html
import importlib
import traceback
from collections import Counter
from datetime import datetime

from common import A_RELIRE, ARRONDI, ERREUR, METHODE, OK, OUT, STATUTS, Address, Check, load_json, save_json, checks_to_dicts

DOMAINES = ["risks", "dpe", "dvf", "rents", "cadastre", "fiscalite", "schools", "security", "population", "elections", "climate", "air", "mobility", "insights"]

LIBELLES = {
    ERREUR: ("❌", "Erreur"),
    METHODE: ("🔶", "Écart de méthode"),
    ARRONDI: ("⚠️", "Arrondi"),
    A_RELIRE: ("👁", "À relire"),
    OK: ("✅", "Identique"),
}


def run(domaines: list[str]) -> list[tuple[Address, list[Check], dict]]:
    results = []
    for folder in sorted(p for p in OUT.iterdir() if (p / "analysis.json").exists()):
        addr = Address(**load_json(folder / "address.json"))
        analysis = load_json(folder / "analysis.json")
        meta = load_json(folder / "meta.json")
        checks: list[Check] = []
        print(f"Contrôle : {addr.label}")
        for d in domaines:
            try:
                checks += importlib.import_module(f"checks.{d}").check(addr, analysis)
            except Exception as error:  # noqa: BLE001 — un domaine en panne n'arrête pas les autres
                traceback.print_exc()
                checks.append(Check(d, "contrôle", "—", "—", A_RELIRE, "", f"le contrôle a échoué : {error}"))
        save_json(folder / "checks.json", checks_to_dicts(checks))
        results.append((addr, checks, meta))
    return results


def _cell(v) -> str:
    if isinstance(v, dict):
        return html.escape(", ".join(f"{k} {n}" for k, n in v.items()))
    return html.escape("—" if v is None else str(v))


def _link(url: str) -> str:
    if not url:
        return ""
    href = url.split(" ")[0]
    return f'<a href="{html.escape(href)}">{html.escape(url)}</a>' if href.startswith("http") else html.escape(url)


def report(results) -> None:
    total = Counter()
    sections = []
    for addr, checks, meta in results:
        c = Counter(ch.statut for ch in checks)
        total.update(c)
        rows = "".join(
            f"<tr class='{ch.statut}'><td>{LIBELLES[ch.statut][0]}</td><td>{html.escape(ch.domaine)}</td>"
            f"<td>{html.escape(ch.chiffre)}</td><td>{_cell(ch.site)}</td><td>{_cell(ch.source)}</td>"
            f"<td>{html.escape(ch.note)}</td><td class='lien'>{_link(ch.lien)}</td></tr>"
            for ch in sorted(checks, key=lambda x: (STATUTS.index(x.statut), x.domaine))
        )
        resume = " · ".join(f"{LIBELLES[s][0]} {c[s]}" for s in STATUTS if c[s])
        sections.append(
            f"<h2>{html.escape(addr.label)}</h2><p class='meta'>Collecte {html.escape(meta['collecte'][:16])} sur "
            f"{html.escape(meta['site'])} · {resume}</p><table><tr><th></th><th>Domaine</th><th>Chiffre</th>"
            f"<th>Site</th><th>Source publique</th><th>Note</th><th>Où vérifier</th></tr>{rows}</table>"
        )
    synthese = " · ".join(f"{LIBELLES[s][0]} {LIBELLES[s][1]} : {total[s]}" for s in STATUTS)
    page = f"""<!doctype html><html lang="fr"><meta charset="utf-8"><title>Contrôle des données</title>
<style>body{{font:14px/1.45 system-ui,sans-serif;margin:24px;max-width:1300px}}table{{border-collapse:collapse;width:100%;margin-bottom:28px}}
td,th{{border-bottom:1px solid #ddd;padding:5px 8px;text-align:left;vertical-align:top}}th{{background:#f4f4f4}}
tr.erreur td{{background:#fdecec}}tr.methode td{{background:#fff4e0}}.lien{{font-size:12px;word-break:break-all;max-width:320px}}.meta{{color:#666}}</style>
<h1>Contrôle des données du site face aux sources publiques</h1>
<p>Rapport du {datetime.now().strftime('%d/%m/%Y %H:%M')}. {synthese}</p>
<p>❌ le site affiche autre chose que la source · 🔶 le site calcule autrement que la page publique (à trancher) · ⚠️ écart d'arrondi · 👁 à relire · ✅ identique.</p>
{''.join(sections)}</html>"""
    (OUT / "rapport.html").write_text(page, encoding="utf-8")
    print(f"\n{synthese}\nRapport : {OUT / 'rapport.html'}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--domaines", default=",".join(DOMAINES))
    args = parser.parse_args()
    report(run([d.strip() for d in args.domaines.split(",") if d.strip()]))


if __name__ == "__main__":
    main()
