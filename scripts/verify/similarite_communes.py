#!/usr/bin/env python3
"""
Mesure le texte commun aux pages d'arrondissement d'une même ville.

Google écartait la moitié des 45 pages comme quasi-doublons (« Explorée, actuellement non
indexée ») : deux arrondissements partageaient 41 % de leur texte mot pour mot. Ce script
recompte, pour chaque paire d'arrondissements voisins dans le code INSEE :

- les **blocs identiques** : paragraphes, cellules, titres rendus à l'identique (≥ 4 mots),
  en part des mots de la page — l'indicateur suivi, objectif < 20 % ;
- les **séquences de 5 mots** communes (indice de Jaccard), plus sévère : il compte aussi
  les libellés de graphes et les phrases types aux chiffres près.

Usage :
    python similarite_communes.py                            # site en ligne
    python similarite_communes.py --site http://localhost:3111
    python similarite_communes.py --detail paris-8e,paris-15e   # blocs communs d'une paire

Code de sortie 1 si une paire dépasse le seuil (--seuil, 20 % par défaut).
"""

import argparse
import html
import re
import sys
import urllib.request

ROOT_SITE = "https://claireadresse.fr"

VILLES = {
    "paris": [f"paris-{n}{'er' if n == 1 else 'e'}" for n in range(1, 21)],
    "lyon": [f"lyon-{n}{'er' if n == 1 else 'e'}" for n in range(1, 10)],
    "marseille": [f"marseille-{n}{'er' if n == 1 else 'e'}" for n in range(1, 17)],
}

BALISES_BLOC = r"<(?:p|li|h[1-6]|td|th|figcaption|summary|dt|dd|div)[^>]*>"


def fetch(site: str, slug: str) -> str:
    req = urllib.request.Request(f"{site}/commune/{slug}", headers={"User-Agent": "claireadresse-verify"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read().decode("utf-8")


def sans_code(page: str) -> str:
    return re.sub(r"<script.*?</script>|<style.*?</style>|<svg.*?</svg>", "", page, flags=re.S)


def blocs(page: str) -> list[str]:
    morceaux = re.split(BALISES_BLOC, sans_code(page))
    textes = (html.unescape(re.sub(r"<[^>]+>", " ", m)) for m in morceaux)
    return [re.sub(r"\s+", " ", t).strip() for t in textes]


def mots(page: str) -> list[str]:
    return html.unescape(re.sub(r"<[^>]+>", " ", sans_code(page))).split()


def part_blocs_identiques(a: str, b: str) -> tuple[float, list[str]]:
    ba, bb = blocs(a), set(blocs(b))
    total = sum(len(x.split()) for x in ba) or 1
    communs = [x for x in ba if x in bb and len(x.split()) >= 4]
    return sum(len(x.split()) for x in communs) / total, communs


def jaccard_5(a: str, b: str) -> float:
    def sequences(w: list[str]) -> set[tuple[str, ...]]:
        return {tuple(w[i : i + 5]) for i in range(len(w) - 4)}

    sa, sb = sequences(mots(a)), sequences(mots(b))
    return len(sa & sb) / (len(sa | sb) or 1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--site", default=ROOT_SITE)
    parser.add_argument("--seuil", type=float, default=0.20, help="part maximale de blocs identiques")
    parser.add_argument("--detail", help="deux slugs séparés par une virgule : liste les blocs communs")
    args = parser.parse_args()

    if args.detail:
        x, y = args.detail.split(",")
        part, communs = part_blocs_identiques(fetch(args.site, x), fetch(args.site, y))
        print(f"{x} / {y} : {part:.0%} de blocs identiques")
        for bloc in sorted(set(communs), key=lambda t: -len(t.split())):
            print(f"{len(bloc.split()):4d} | {bloc[:160]}")
        return 0

    depassements = 0
    for ville, slugs in VILLES.items():
        pages = {s: fetch(args.site, s) for s in slugs}
        print(f"\n{ville} — paire : blocs identiques · séquences de 5 mots")
        parts = []
        for x, y in zip(slugs, slugs[1:]):
            part, _ = part_blocs_identiques(pages[x], pages[y])
            parts.append(part)
            alerte = "  ← au-dessus du seuil" if part > args.seuil else ""
            depassements += part > args.seuil
            print(f"  {x:>14} / {y:<14} {part:5.0%} · {jaccard_5(pages[x], pages[y]):4.0%}{alerte}")
        print(f"  moyenne {sum(parts) / len(parts):.0%}, maximum {max(parts):.0%}")

    print(f"\n{depassements} paire(s) au-dessus de {args.seuil:.0%}")
    return 1 if depassements else 0


if __name__ == "__main__":
    sys.exit(main())
