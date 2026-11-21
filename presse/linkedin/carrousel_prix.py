#!/usr/bin/env python3
"""
Carrousel LinkedIn de l'article « Prix au m² par arrondissement à Paris, Lyon et Marseille ».

Lit les chiffres dans le data.json de l'article (aucun nombre tapé à la main), écrit une page
HTML de 8 visuels 1080×1350, puis le PDF que LinkedIn attend pour un carrousel (« document »),
et un aperçu PNG de chaque visuel.

    python3 presse/linkedin/carrousel_prix.py

Sortie : presse/linkedin/prix-arrondissements/ (carrousel.html, carrousel.pdf, visuel-N.png)
"""

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SLUG = "prix-m2-arrondissements-paris-lyon-marseille"
DATA = json.loads((ROOT / "frontend/src/content/articles" / SLUG / "data.json").read_text(encoding="utf-8"))
FONTS = ROOT / "frontend/src/fonts"
OUT = Path(__file__).resolve().parent / "prix-arrondissements"
CHROME = Path.home() / ".cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"

W, H = 1080, 1350
NNBSP = " "  # espace fine insécable, comme le site
NBSP = "\u00a0"  # milliers : l'espace fine de Manrope disparaît en gros caractères


def n(v):
    """14115 → « 14 115 » ; 1.8 → « 1,8 »."""
    if isinstance(v, float) and not v.is_integer():
        return str(v).replace(".", ",")
    return f"{int(v):,}".replace(",", NBSP)


def pct(v):
    signe = "+" if v > 0 else "−" if v < 0 else ""
    return f"{signe}{abs(v)}{NNBSP}%"


def euros(v):
    return f"{n(v)}{NNBSP}€/m²"


def ville(id_):
    return next(v for v in DATA["villes"] if v["id"] == id_)


def numero(code):
    """Numéro d'arrondissement d'après le code INSEE : 75106 → 6, 69382 → 2, 13215 → 15."""
    return int(code[4:]) if code.startswith("6938") else int(code[3:])


def ordinal(code):
    k = numero(code)
    return f"{k}<sup>er</sup>" if k == 1 else f"{k}<sup>e</sup>"


def arr(v, code):
    return next(a for a in v["arrondissements"] if a["code"] == code)


paris, lyon, marseille = ville("paris"), ville("lyon"), ville("marseille")
ANS = DATA["millesime"] - DATA["millesimeAvant"]
FILTRES = DATA["filtres"]


def barres(v):
    """Évolution par arrondissement, du plus cher (en haut) au moins cher.

    L'axe se place selon les valeurs : à droite si tout baisse, à gauche si tout monte, entre
    les deux sinon — une ville sans hausse ne laisse pas la moitié du graphe vide. Les
    étiquettes tiennent dans une marge réservée de chaque côté de la zone des barres.
    """
    evols = [a["evolutionPct"] for a in v["arrondissements"]]
    neg, pos = max(0, -min(evols)), max(0, max(evols))
    etendue = neg + pos
    origine = neg / etendue * 100  # position de l'axe, en % de la zone des barres
    hauteur = min(40, 740 // len(evols))
    lignes = []
    for a in v["arrondissements"]:  # déjà triés du plus cher au moins cher
        e = a["evolutionPct"]
        largeur = abs(e) / etendue * 100
        cote = "hausse" if e > 0 else "baisse"
        if e > 0:
            barre = f"left:{origine:.2f}%;width:{largeur:.2f}%"
            etiquette = f"left:calc({origine + largeur:.2f}% + 10px)"
        else:
            barre = f"right:{100 - origine:.2f}%;width:{largeur:.2f}%"
            etiquette = f"right:calc({100 - origine + largeur:.2f}% + 10px)"
        lignes.append(
            f'<div class="bar-row" style="height:{hauteur}px"><span class="bar-lbl">{ordinal(a["code"])}</span>'
            f'<span class="bar-track"><span class="bar-zone">'
            f'<span class="bar {cote}" style="{barre}"></span>'
            f'<span class="bar-val {cote}" style="{etiquette}">{pct(e)}</span></span></span>'
            f'<span class="bar-prix">{euros(a["median"])}</span></div>'
        )
    axe = f'<span class="bar-axe" style="left:{origine:.2f}%"></span>'
    return f'<div class="bars"><div class="bars-axe">{axe}</div>' + "".join(lignes) + "</div>"


def slide(i, total, corps, classe=""):
    return f"""<section class="slide {classe}">
  {corps}
  <footer><span class="brand">Claire<em>Adresse</em></span><span class="page">{i}/{total}</span></footer>
</section>"""


p6, p19 = arr(paris, paris["plusCher"]), arr(paris, paris["moinsCher"])
l_max, l_min = arr(lyon, lyon["plusCher"]), arr(lyon, lyon["moinsCher"])
l_pire = min(lyon["arrondissements"], key=lambda a: a["evolutionPct"])
m7, m15 = arr(marseille, marseille["plusCher"]), arr(marseille, marseille["moinsCher"])
m_hausse = sum(1 for a in marseille["arrondissements"] if a["evolutionPct"] > 0)
p_plus_bas = max(paris["arrondissements"], key=lambda a: a["evolutionPct"])  # la plus faible baisse
p_pire = min(paris["arrondissements"], key=lambda a: a["evolutionPct"])

contenus = [
    # 1. Couverture
    ("cover", f"""
  <p class="eyebrow">Ventes réelles · {DATA['millesimeAvant']} → {DATA['millesime']}</p>
  <h1>Prix au m²&nbsp;: <span class="hausse-t">Marseille monte</span>, <span class="baisse-t">Paris et Lyon baissent</span></h1>
  <p class="sub">Les {n(DATA['nbArrondissements'])} arrondissements des trois plus grandes villes, d'après les ventes d'appartements réellement signées (base DVF).</p>
  <p class="swipe">Faites défiler →</p>"""),
    # 2. Les trois chiffres
    ("", f"""
  <p class="eyebrow">En {ANS} ans</p>
  <h2>Le prix médian du m² des appartements vendus</h2>
  <div class="trio">
    {''.join(f'''<div class="trio-item"><span class="big {'hausse-t' if v['evolutionPct'] > 0 else 'baisse-t'}">{pct(v['evolutionPct'])}</span>
      <span class="trio-nom">{v['nom']}</span>
      <span class="trio-detail">{euros(v['median'])} en {DATA['millesime']}<br>contre {euros(v['medianAvant'])} en {DATA['millesimeAvant']}</span></div>''' for v in (paris, lyon, marseille))}
  </div>"""),
    # 3. Paris, l'écart
    ("", f"""
  <p class="eyebrow">Paris</p>
  <h2>Le m² vaut {n(paris['rapport'])} fois plus dans le {ordinal(p6['code'])} que dans le {ordinal(p19['code'])}</h2>
  <div class="duo">
    <div><span class="big">{euros(p6['median'])}</span><span class="duo-lbl">{ordinal(p6['code'])} arrondissement, le plus cher</span></div>
    <div><span class="big">{euros(p19['median'])}</span><span class="duo-lbl">{ordinal(p19['code'])} arrondissement, le moins cher</span></div>
  </div>
  <p class="note">{n(paris['ecartEuros'])}{NNBSP}€ d'écart par m².</p>"""),
    # 4. Paris, la pente
    ("", f"""
  <p class="eyebrow">Paris · évolution {DATA['millesimeAvant']} → {DATA['millesime']}</p>
  <h2>Les arrondissements les moins chers baissent le plus</h2>
  <p class="legend">Du plus cher (en haut) au moins cher. De {pct(p_plus_bas['evolutionPct'])} dans le {ordinal(p_plus_bas['code'])} à {pct(p_pire['evolutionPct'])} dans le {ordinal(p_pire['code'])}.</p>
  {barres(paris)}"""),
    # 5. Lyon
    ("", f"""
  <p class="eyebrow">Lyon · évolution {DATA['millesimeAvant']} → {DATA['millesime']}</p>
  <h2>La plus forte baisse des trois villes, jusqu'à {pct(l_pire['evolutionPct'])} dans le {ordinal(l_pire['code'])}</h2>
  <p class="legend">Du plus cher (en haut) au moins cher. Le {ordinal(l_pire['code'])}&nbsp;: {euros(l_pire['medianAvant'])} en {DATA['millesimeAvant']}, {euros(l_pire['median'])} en {DATA['millesime']}.</p>
  {barres(lyon)}"""),
    # 6. Marseille, la hausse
    ("", f"""
  <p class="eyebrow">Marseille · évolution {DATA['millesimeAvant']} → {DATA['millesime']}</p>
  <h2>{m_hausse} arrondissements sur {marseille['nbArrondissements']} en hausse</h2>
  <p class="legend">Du plus cher (en haut) au moins cher. Le {ordinal(m7['code'])} gagne {pct(m7['evolutionPct'])}&nbsp;; seul le {ordinal(m15['code'])} recule.</p>
  {barres(marseille)}"""),
    # 7. Marseille, l'écart
    ("", f"""
  <p class="eyebrow">Marseille</p>
  <h2>Le plus grand écart&nbsp;: un m² du {ordinal(m7['code'])} vaut {n(marseille['rapport'])} fois un m² du {ordinal(m15['code'])}</h2>
  <div class="duo">
    <div><span class="big">{euros(m7['median'])}</span><span class="duo-lbl">{ordinal(m7['code'])} arrondissement</span></div>
    <div><span class="big">{euros(m15['median'])}</span><span class="duo-lbl">{ordinal(m15['code'])} arrondissement</span></div>
  </div>
  <div class="ratios">
    {''.join(f'<div><span class="ratio">×{n(v["rapport"])}</span><span>{v["nom"]}</span></div>' for v in (paris, lyon, marseille))}
  </div>
  <p class="note">Rapport entre l'arrondissement le plus cher et le moins cher.</p>"""),
    # 8. Méthode et lien
    ("end", f"""
  <p class="eyebrow">Méthode</p>
  <h2>D'où viennent ces chiffres</h2>
  <ul class="methode">
    <li>Ventes d'appartements enregistrées par l'administration fiscale (base DVF, DGFiP), années {DATA['millesimeAvant']} et {DATA['millesime']}.</li>
    <li>Prix médian au m²&nbsp;: la moitié des ventes s'est faite plus cher, l'autre moins cher.</li>
    <li>Surfaces de {FILTRES['surfaceMin']} à {FILTRES['surfaceMax']}{NNBSP}m², prix de {n(FILTRES['prixM2Min'])} à {n(FILTRES['prixM2Max'])}{NNBSP}€/m²&nbsp;; au moins {DATA['seuilVentes']} ventes par arrondissement.</li>
  </ul>
  <div class="cta">
    <p>Le classement complet des {n(DATA['nbArrondissements'])} arrondissements</p>
    <p class="cta-lien">Lien en commentaire · claireadresse.fr</p>
  </div>"""),
]

CSS = f"""
@font-face {{ font-family: Manrope; src: url('{(FONTS / "manrope-latin.woff2").as_uri()}') format('woff2'); font-weight: 200 800; }}
@font-face {{ font-family: Fraunces; src: url('{(FONTS / "fraunces-latin.woff2").as_uri()}') format('woff2'); font-weight: 400 500; }}
@font-face {{ font-family: Fraunces; font-style: italic; src: url('{(FONTS / "fraunces-italic-latin.woff2").as_uri()}') format('woff2'); font-weight: 400 500; }}
@page {{ size: {W}px {H}px; margin: 0; }}
:root {{ --bg:#FAF8F2; --text:#1A1A1A; --muted:#5A5A5A; --accent:#4B9319; --line:#E2DED2;
         --hausse:#C2622D; --baisse:#3E6E9E; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: #ccc; font-family: Manrope, sans-serif; color: var(--text); }}
.slide {{ width:{W}px; height:{H}px; background: var(--bg); padding: 96px 88px 80px; position: relative;
          display:flex; flex-direction:column; break-after: page; overflow:hidden; }}
.eyebrow {{ font-size: 26px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); margin-bottom: 28px; }}
h1 {{ font-family: Fraunces, serif; font-weight: 400; font-size: 96px; line-height: 1.05; letter-spacing: -.02em; margin-bottom: 40px; }}
h2 {{ font-family: Fraunces, serif; font-weight: 400; font-size: 62px; line-height: 1.12; letter-spacing: -.015em; margin-bottom: 28px; }}
sup {{ font-size: .55em; vertical-align: .7em; line-height: 0; }}
.sub {{ font-size: 34px; line-height: 1.45; color: var(--muted); max-width: 860px; }}
.swipe {{ margin-top: auto; margin-bottom: 40px; font-size: 30px; font-weight: 700; color: var(--accent); }}
.hausse-t {{ color: var(--hausse); }} .baisse-t {{ color: var(--baisse); }}
.big {{ font-size: 88px; font-weight: 800; letter-spacing: -.02em; line-height: 1; display:block; }}
.trio {{ display: grid; gap: 28px; margin-top: 16px; }}
.trio-item {{ background:#fff; border:2px solid var(--line); border-radius: 28px; padding: 32px 40px; display:grid; grid-template-columns: 300px 1fr; align-items:center; column-gap: 32px; }}
.trio-item .big {{ grid-row: span 2; }}
.trio-nom {{ font-size: 40px; font-weight: 800; }}
.trio-detail {{ font-size: 27px; line-height: 1.4; color: var(--muted); }}
.duo {{ display:grid; gap: 28px; margin-top: 24px; }}
.duo > div {{ background:#fff; border:2px solid var(--line); border-radius: 28px; padding: 40px; }}
.duo-lbl {{ display:block; margin-top: 14px; font-size: 30px; color: var(--muted); }}
.note {{ margin-top: 32px; font-size: 32px; font-weight: 700; }}
.legend {{ font-size: 25px; line-height: 1.45; color: var(--muted); margin-bottom: 28px; }}
.bars {{ display:flex; flex-direction:column; position: relative; }}
.bar-row {{ display:grid; grid-template-columns: 70px 1fr 220px; align-items:center; font-size: 24px; }}
.bar-lbl {{ font-weight: 700; }}
.bar-track {{ position: relative; height: 100%; }}
/* Zone des barres : une marge de chaque côté accueille les étiquettes. */
.bar-zone {{ position:absolute; left: 100px; right: 100px; top: 0; bottom: 0; }}
.bars-axe {{ position:absolute; left: 170px; right: 320px; top: -6px; bottom: -6px; pointer-events:none; }}
.bar-axe {{ position:absolute; top:0; bottom:0; border-left: 2px solid var(--text); }}
.bar {{ position:absolute; top: 18%; height: 64%; border-radius: 4px; }}
.bar.hausse {{ background: var(--hausse); }} .bar.baisse {{ background: var(--baisse); }}
.bar-val {{ position:absolute; top: 50%; transform: translateY(-50%); font-weight: 800; white-space: nowrap; }}
.bar-val.hausse {{ color: var(--hausse); }} .bar-val.baisse {{ color: var(--baisse); }}
.bar-prix {{ text-align:right; color: var(--muted); font-variant-numeric: tabular-nums; }}
.ratios {{ display:grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 32px; }}
.ratios > div {{ display:flex; flex-direction:column; font-size: 28px; color: var(--muted); }}
.ratio {{ font-size: 64px; font-weight: 800; color: var(--text); }}
.ratios > div:last-child .ratio {{ color: var(--hausse); }}
.methode {{ list-style: none; display:grid; gap: 26px; font-size: 31px; line-height: 1.45; }}
.methode li {{ padding-left: 36px; position: relative; }}
.methode li::before {{ content:''; position:absolute; left:0; top: 17px; width: 14px; height: 14px; border-radius: 50%; background: var(--accent); }}
.cta {{ margin-top: auto; margin-bottom: 40px; background: var(--accent); color:#fff; border-radius: 28px; padding: 40px 44px; }}
.cta p {{ font-size: 36px; font-weight: 700; line-height: 1.3; }}
.cta .cta-lien {{ font-size: 30px; font-weight: 600; margin-top: 10px; opacity: .92; }}
footer {{ position:absolute; left: 88px; right: 88px; bottom: 56px; display:flex; justify-content: space-between; align-items: baseline; font-size: 26px; color: var(--muted); }}
.brand {{ font-family: Fraunces, serif; font-size: 34px; color: var(--text); }}
.brand em {{ font-style: normal; color: var(--accent); }}
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = len(contenus)
    corps = "\n".join(slide(i + 1, total, c, classe) for i, (classe, c) in enumerate(contenus))
    html = f'<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{corps}</body></html>'
    page = OUT / "carrousel.html"
    page.write_text(html, encoding="utf-8")

    base = [str(CHROME), "--no-sandbox", "--disable-gpu", "--allow-file-access-from-files", "--virtual-time-budget=5000"]
    subprocess.run(base + ["--no-pdf-header-footer", f"--print-to-pdf={OUT / 'carrousel.pdf'}", page.as_uri()],
                   check=True, capture_output=True)
    # Aperçus : un PNG par visuel, en n'affichant que celui-là.
    for i in range(1, total + 1):
        solo = OUT / f".visuel-{i}.html"
        solo.write_text(html.replace("</style>", f".slide{{display:none}} .slide:nth-of-type({i}){{display:flex}}</style>", 1), encoding="utf-8")
        subprocess.run(base + ["--hide-scrollbars", f"--window-size={W},{H}", f"--screenshot={OUT / f'visuel-{i}.png'}", solo.as_uri()],
                       check=True, capture_output=True)
        solo.unlink()
    print(f"→ {OUT.relative_to(ROOT)}/carrousel.pdf ({total} visuels) et visuel-1..{total}.png")


if __name__ == "__main__":
    main()
