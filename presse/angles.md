# Trois angles chiffrés, prêts à donner à un journaliste

Calculés le 27 septembre 2026 sur la base locale (mêmes données que la prod : DVF 2024, BPE 2025,
population INSEE). Les requêtes SQL sont données pour recalculer. Avant de citer un chiffre :
le recalculer, et le vérifier sur la page du site correspondante.

Méthode commune aux prix : médiane du prix au m² (`valeur_fonciere / surface_bati`) sur les
lignes DVF 2024, appartements ou maisons, surface d'au moins 9 m² (appartements) ou 20 m²
(maisons), prix supérieur à 10 000 €. Les ventes en l'état futur d'achèvement sont incluses. Une
mutation à plusieurs lots compte plusieurs fois : c'est un ordre de grandeur, pas une statistique
notariale.

---

## 1. À Marseille, le m² vaut 3,4 fois plus dans le 7e que dans le 15e — à Paris, l'écart entre le 6e et le 19e n'est que de 1,9

Pour : Le Parisien, Le Figaro Immobilier, BFM Immo, Les Echos, presse marseillaise et lyonnaise.

Appartements, ventes 2024, médiane du prix au m² :

| Ville | Arrondissement le plus cher | Le moins cher | Rapport |
|---|---|---|---|
| Paris | 6e : 14 629 €/m² (784 ventes) | 19e : 7 848 €/m² (1 377 ventes) | 1,9 |
| Lyon | 2e : 5 468 €/m² (405 ventes) | 9e : 3 792 €/m² (550 ventes) | 1,4 |
| Marseille | 7e : 4 847 €/m² (601 ventes) | 15e : 1 435 €/m² (364 ventes) | 3,4 |

Classement complet Paris : 6e 14 629 · 7e 14 210 · 4e 12 842 · 1er 12 586 · 8e 12 304 · 3e 11 833 ·
5e 11 828 · 2e 11 442 · 16e 10 887 · 9e 10 625 · 17e 10 095 · 11e 9 851 · 15e 9 475 · 14e 9 333 ·
10e 9 241 · 12e 8 889 · 18e 8 693 · 13e 8 684 · 20e 8 269 · 19e 7 848.

Lyon : 2e 5 468 · 6e 5 284 · 1er 5 000 · 4e 4 876 · 3e 4 557 · 7e 4 505 · 8e 4 232 · 5e 3 838 ·
9e 3 792.

Marseille : 7e 4 847 · 8e 4 348 · 6e 3 755 · 5e 3 451 · 2e 3 333 · 12e 3 295 · 1er 3 265 · 9e 3 000 ·
16e 2 985 (98 ventes seulement) · 4e 2 857 · 10e 2 652 · 11e 2 599 · 13e 2 502 · 3e 1 837 ·
14e 1 453 · 15e 1 435.

Sur le site : `/commune/paris-6e`, `/commune/marseille-15e`, etc.

```sql
WITH v AS (
  SELECT code_commune, valeur_fonciere/surface_bati AS pm2
  FROM dvf_transactions
  WHERE type_local='Appartement' AND surface_bati >= 9 AND valeur_fonciere > 10000
    AND (code_commune LIKE '751__' OR code_commune LIKE '6938_' OR code_commune LIKE '132__')
)
SELECT code_commune, count(*) AS ventes,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY pm2)) AS median_eur_m2
FROM v GROUP BY 1 HAVING count(*) >= 30 ORDER BY 3 DESC;
```

---

## 2. Dans la Loire, une maison vaut deux fois plus au m² dans la couronne stéphanoise qu'à Boën ou Roanne

Pour : Le Progrès, L'Essor Loire, ici Saint-Étienne Loire, TL7.

Maisons, ventes 2024, médiane du prix au m², sur les 40 communes de la Loire qui comptent au
moins 25 ventes dans l'année :

| Les plus chères | €/m² (ventes) | Les moins chères | €/m² (ventes) |
|---|---|---|---|
| Lorette | 2 905 (25) | Boën-sur-Lignon | 1 292 (39) |
| Sorbiers | 2 882 (50) | Panissières | 1 377 (41) |
| La Talaudière | 2 790 (41) | Balbigny | 1 699 (26) |
| Saint-Galmier | 2 773 (37) | Roanne | 1 777 (164) |
| Saint-Just-Saint-Rambert | 2 768 (103) | Commelle-Vernay | 1 838 (32) |
| Veauche | 2 697 (54) | Mably | 1 897 (59) |
| Andrézieux-Bouthéon | 2 691 (44) | Renaison | 1 897 (41) |
| Pélussin | 2 667 (27) | Le Coteau | 1 929 (33) |

Lecture : le haut du tableau, c'est la plaine du Forez sud et l'est stéphanois, à moins de
30 minutes de Saint-Étienne et de l'A72 ; le bas, c'est le Roannais et le nord du Forez. Lorette
n'a que 25 ventes : citer plutôt Saint-Just-Saint-Rambert (103 ventes) en tête, plus solide.

Sur le site : `/analyze?type=municipality&citycode=42279` (Saint-Just-Saint-Rambert),
`citycode=42019` (Boën-sur-Lignon).

```sql
WITH v AS (
  SELECT code_commune, valeur_fonciere/surface_bati AS pm2
  FROM dvf_transactions
  WHERE type_local='Maison' AND surface_bati >= 20 AND valeur_fonciere > 10000
    AND code_commune LIKE '42%'
)
SELECT code_commune, count(*) AS ventes,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY pm2)) AS median_eur_m2
FROM v GROUP BY 1 HAVING count(*) >= 25 ORDER BY 3 DESC;
```

---

## 3. Dans la Loire, 234 communes sur 320 n'ont pas de pharmacie, 218 n'ont pas de médecin généraliste

Pour : Le Progrès, L'Essor Loire, ici Saint-Étienne Loire ; transposable à n'importe quel
département.

D'après la Base permanente des équipements 2025 (INSEE), sur les 320 communes de la Loire
présentes dans la base :

| Sans… | Communes |
|---|---|
| pharmacie | 234 |
| médecin généraliste | 218 |
| boulangerie | 167 |
| école maternelle ou élémentaire | 52 |
| aucun des quatre | 41 |

Les communes les plus peuplées sans pharmacie ni école (population INSEE en base) : Châteauneuf
(1 675 hab.), Écotay-l'Olme (1 265), Saint-Martin-la-Sauveté (878), Cottance (745),
Saint-Nizier-de-Fornas (656), Vérin (655), La Tourette (627), Salvizinet (615).

**Prudence sur les noms** : la BPE rattache un équipement à l'adresse de son gestionnaire et peut
manquer une école en regroupement pédagogique. Avant de citer une commune nommément, vérifier
auprès de la mairie ; les totaux départementaux, eux, sont robustes à quelques erreurs près.

Sur le site : `/analyze?type=municipality&citycode=42297` (Salvizinet), card « Équipements de la
commune ».

```sql
WITH eq AS (
  SELECT depcom,
    bool_or(typequ='D307') AS pharmacie,
    bool_or(typequ IN ('C107','C108','C109')) AS ecole,
    bool_or(typequ='B207') AS boulangerie,
    bool_or(typequ='D265') AS generaliste
  FROM bpe_equipment WHERE depcom LIKE '42%' GROUP BY 1
)
SELECT count(*) FILTER (WHERE NOT pharmacie) AS sans_pharmacie,
       count(*) FILTER (WHERE NOT generaliste) AS sans_generaliste,
       count(*) FILTER (WHERE NOT boulangerie) AS sans_boulangerie,
       count(*) FILTER (WHERE NOT ecole) AS sans_ecole,
       count(*) FILTER (WHERE NOT pharmacie AND NOT ecole AND NOT boulangerie AND NOT generaliste) AS sans_rien
FROM eq;

-- Les plus peuplées sans pharmacie ni école
WITH eq AS (
  SELECT depcom, bool_or(typequ='D307') AS pharmacie,
         bool_or(typequ IN ('C107','C108','C109')) AS ecole
  FROM bpe_equipment WHERE depcom LIKE '42%' GROUP BY 1
)
SELECT e.depcom, i.population FROM eq e JOIN insee_aggregate i ON i.scope_code = e.depcom
WHERE NOT pharmacie AND NOT ecole ORDER BY i.population DESC NULLS LAST LIMIT 8;
```

---

## Idées non chiffrées, à produire si un journaliste mord

- Part des ventes 2024 situées dans un zonage PPR inondation, par commune de la Loire ou par
  arrondissement (croisement DVF × zonages du Géoportail de l'Urbanisme ; à calculer, le site ne
  stocke pas les zonages).
- Les communes de la Loire publiées seulement par le périmètre de leur PPR, sans zonage détaillé
  (cas Brevenne-Turdine) : « la carte des risques que la commune ne vous montre pas ».
- Municipales 2026 × prix : les communes où le maire a changé sont-elles celles où les prix ont
  le plus bougé ?
