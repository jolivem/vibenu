# Articles (`/articles`)

Palmarès chiffrés et guides pratiques écrits à partir des données du site. Peu d'articles,
chacun unique, signés et datés : pas de déclinaison par lot (c'est ce qui a fait écarter
20 pages d'arrondissement par Google).

## Un dossier par article

```
content/articles/<slug>/
  meta.ts       titre, description (≤ 155 car.), chapeau, dates, sources, liens internes
  index.mdx     la prose, avec les composants de figures.tsx
  figures.tsx   tableaux et graphes qui lisent data.json (composants de components/articles/)
  data.json     instantané figé par scripts/articles/<script>.py — jamais modifié à la main
```

Un article n'est publié que s'il figure dans `index.ts` (registre : index, sitemap,
`llms.txt`, pages statiques). Un dossier absent du registre est un brouillon.

## Écrire un article

1. **Chiffres** : un script `scripts/articles/<nom>.py` (sur le modèle de
   `prix_arrondissements.py`) calcule tout ce que la prose citera — y compris les faits
   dérivés (rapports, évolutions, effectifs) et les seuils de méthode — et écrit `data.json`.
   `python scripts/articles/<nom>.py`
2. **Brouillon** : demander à Claude un premier jet à partir de `data.json` et de l'angle.
3. **Relecture** : l'auteur réécrit ; aucun chiffre tapé à la main.
4. **Contrôle** : `python scripts/articles/check_articles.py <slug>` — chaque nombre du texte
   (et du titre, de la description, du chapeau) doit exister dans `data.json`.
5. Ajouter l'article au registre, `pnpm typecheck`, build sans base.

## Mettre à jour

Au millésime suivant : relancer le script, relire le texte (les constats peuvent changer),
relancer le contrôle, avancer `updated` dans `meta.ts`.

## Liens vers les communes

Toujours par `communeHref(code)` (`components/articles/liens.ts`) : page `/commune/*` si elle
existe, rien sinon. `/analyze` est fermé aux robots. Les futures pages commune s'y brancheront.
