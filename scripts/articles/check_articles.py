#!/usr/bin/env python3
"""
Contrôle des articles : chaque nombre écrit dans la prose doit exister dans l'instantané.

Lit `index.mdx` (hors imports, balises et commentaires JSX) et le titre, la description et le
chapeau de `meta.ts`, en extrait les nombres (« 14 115 », « 1,8 », « −14 % »), et cherche
chacun parmi les valeurs de `data.json`. Les ordinaux (« 6e », « 1er ») sont ignorés : ce
sont des noms d'arrondissement. Un nombre absent est soit une faute de frappe, soit un calcul
fait à la main — à ajouter au script d'instantané.

    python scripts/articles/check_articles.py            # tous les articles
    python scripts/articles/check_articles.py <slug>     # un seul

Code de sortie 1 si un nombre est introuvable.
"""

import json
import re
import sys
from pathlib import Path

ARTICLES_DIR = Path(__file__).resolve().parents[2] / "frontend" / "src" / "content" / "articles"

# Milliers séparés par une espace (ordinaire, insécable ou fine), décimales après virgule.
NOMBRE = re.compile(r"(?<![\w,.])(\d{1,3}(?:[   ]\d{3})+|\d+)(?:,(\d+))?(?!\d)")
ORDINAL = re.compile(r"^(?:er|re|e|ème|ᵉ)\b")


def valeurs(node, acc):
    if isinstance(node, bool):
        return acc
    if isinstance(node, (int, float)):
        acc.add(abs(float(node)))
    elif isinstance(node, str):
        # Dates ISO (« 2025-12-22 ») et numéros de texte (« 2026-644 ») : la prose les cite en
        # morceaux (« 22 décembre 2025 »). Les adresses web sont ignorées.
        if not node.startswith("http"):
            for entier in re.findall(r"\d+", node):
                acc.add(float(int(entier)))
    elif isinstance(node, dict):
        for v in node.values():
            valeurs(v, acc)
    elif isinstance(node, list):
        for v in node:
            valeurs(v, acc)
    return acc


def prose_mdx(text):
    text = re.sub(r"\{/\*.*?\*/\}", " ", text, flags=re.S)
    text = re.sub(r"<[^>]*>", " ", text, flags=re.S)
    return "\n".join(l for l in text.splitlines() if not l.lstrip().startswith(("import ", "export ")))


def prose_meta(text):
    champs = re.findall(r'^\s*(?:title|description|lead):\s*\n?\s*"((?:[^"\\]|\\.)*)"', text, flags=re.M)
    return "\n".join(champs)


def nombres(text):
    for m in NOMBRE.finditer(text):
        if ORDINAL.match(text[m.end():]):
            continue
        entier = re.sub(r"\D", "", m.group(1))
        valeur = float(f"{entier}.{m.group(2)}" if m.group(2) else entier)
        debut = max(0, m.start() - 30)
        yield valeur, m.group(0), text[debut:m.end() + 30].replace("\n", " ")


def controler(dossier):
    data_file = dossier / "data.json"
    if not data_file.exists():
        print(f"· {dossier.name} : pas d'instantané, rien à contrôler")
        return 0
    connues = valeurs(json.loads(data_file.read_text(encoding="utf-8")), set())
    textes = [prose_mdx((dossier / "index.mdx").read_text(encoding="utf-8"))]
    if (dossier / "meta.ts").exists():
        textes.append(prose_meta((dossier / "meta.ts").read_text(encoding="utf-8")))

    manquants = [(brut, ctx) for t in textes for v, brut, ctx in nombres(t) if v not in connues]
    if not manquants:
        print(f"✅ {dossier.name}")
        return 0
    print(f"❌ {dossier.name} : {len(manquants)} nombre(s) absent(s) de data.json")
    for brut, ctx in manquants:
        print(f"   {brut!r:>10}  …{ctx}…")
    return 1


def main():
    slugs = sys.argv[1:]
    dossiers = [ARTICLES_DIR / s for s in slugs] if slugs else sorted(
        p for p in ARTICLES_DIR.iterdir() if (p / "index.mdx").exists()
    )
    sys.exit(1 if sum(controler(d) for d in dossiers) else 0)


if __name__ == "__main__":
    main()
