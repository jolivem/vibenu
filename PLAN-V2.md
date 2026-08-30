# Plan V2

Branche : `dev/v2`.

Le mode **PRO** (`SITE_VARIANT=PRO`, [site-features.ts](frontend/src/lib/site-features.ts)) est **hors
périmètre V2** — statu quo tant que la décision de le supprimer n'est pas prise. Aucun effort à y consacrer.

Trois axes :

1. Restructuration de la page d'analyse — **implémentée** (ossature seule, sans changement de données)
2. Nouvelles données — **reporté après la restructuration**
3. Remplacement d'OpenStreetMap — **fait** : fonds IGN en production, fond mixte appliqué

---

## Point 1 — Restructuration de la page d'analyse ✅

### Ce qui a été implémenté

Ossature complète : bandeau de chiffres clés, synthèse pleine largeur, carte de localisation,
sommaire collant, 6 sections dépliées, 4 cartes, voisinage regroupé en 4 familles.
Aucun changement côté données — mêmes DTO, mêmes providers, mêmes cards.

**Écarts assumés par rapport au plan ci-dessous, à reprendre plus tard :**

- **Le composant `Map` n'a pas été découpé.** Les 4 cartes sont 4 instances du composant
  existant avec des sous-ensembles de props. Deux ajouts seulement : `basemap` et
  `initialLayers` (couches allumées au montage). Le fourre-tout à 10 props reste entier.
- **Le PDF ne capture toujours qu'une carte**, celle de localisation — la seule montée
  d'emblée. Sortie inchangée par rapport à la V1. Le registre de refs et les 4 captures
  placées dans leurs sections restent à faire.
- **Montage différé** (`IntersectionObserver`) sur les 3 cartes thématiques seulement, via
  `LazyMap`. La carte de localisation est exclue, précisément parce que le PDF la capture.
- **Mode commune** : une section sans contenu disparaît de la page, du sommaire et du bandeau,
  plutôt que d'afficher un message. Même mécanique pour la variante PRO.
- **Marqueurs transport retirés** de la carte de localisation : `TransportStopDto` ne porte
  aucune coordonnée, ils étaient tous empilés sur le marqueur d'adresse.
- **Niveaux de titre** : la section porte un `h2` et les cards gardent le leur. Hiérarchie
  plate ; la descendre en `h3` demanderait de toucher les 11 cards et leur CSS.

### Constat

13 cards en masonry CSS multi-colonnes sans hiérarchie
([AnalysisScreen.tsx](frontend/src/components/analysis/AnalysisScreen.tsx)). La synthèse IA — seul
contenu qui *conclut* — est au même niveau visuel que la carte scolaire. L'ordre de lecture en
multi-colonnes est imprévisible.

### Ossature retenue

```
┌──────────────────────────────────────────────┐
│ ← ClaireAdresse            [Télécharger PDF] │
├──────────────────────────────────────────────┤
│ Analyse · Lyon · 69003                       │
│ 12 rue de la Part-Dieu                       │
├──────────────────────────────────────────────┤
│ 6 TUILES CLIQUABLES → ancre vers sa section  │
├──────────────────────────────────────────────┤
│ ✨ SYNTHÈSE IA (pleine largeur)              │
├──────────────────────────────────────────────┤
│ [   CARTE LOCALISATION (parcelle) pleine   ] │
├───────────┬──────────────────────────────────┤
│ SOMMAIRE  │  6 sections, toutes dépliées     │
│ (sticky)  │  (scroll continu)                │
└───────────┴──────────────────────────────────┘
```

**Navigation** : sommaire sticky, tout déplié, scroll continu. Pas d'onglets ni d'accordéons — le
contenu reste dans le DOM, ce qui préserve le Ctrl+F, le SEO (si la page passe un jour en SSR) et la
cohérence avec le PDF qui reprend déjà toutes les sections.

### Les 6 sections, dans l'ordre

| # | Section | Cards actuelles | Accueillera (point 2) |
|---|---|---|---|
| 1 | **Immobilier & urbanisme** | Marché DVF, Cadastre & PLU | DPE ADEME, fibre ARCEP |
| 2 | **À proximité** | Voisinage, Carte scolaire | IPS des collèges |
| 3 | **Se déplacer** | Mobilité | vélo, temps vers pôles d'emploi |
| 4 | **Environnement** | Qualité de l'air, Climat | bruit |
| 5 | **Sécurité** | Délinquance SSMSI | — |
| 6 | **Risques** | Géorisques | sites pollués (CASIAS) |
| 7 | **Population** | Démographie | délinquance par âge ? |
| 8 | **Élections** | Municipales 2026, Présidentielle 2022 | — |

Ordre arbitré : la question financière d'abord, le contexte territorial en dernier.
« Se déplacer » était initialement en 2, par hypothèse ; elle est passée **après** « À proximité »
à l'implémentation. Les deux répondent à « qu'y a-t-il autour de l'adresse », mais les services du
quotidien pèsent plus, et plus tôt, que les transports dans le choix d'un logement.

L'ordre a une source unique, [sections.ts](frontend/src/components/analysis/sections.ts) : il pilote
à la fois le sommaire, le bandeau de chiffres clés et le corps de la page.

### Découpage de « À proximité »

Aujourd'hui la card Voisinage affiche une liste plate de 11 rubriques OSM sans regroupement
([NeighborhoodCard.tsx:3-14](frontend/src/components/analysis/NeighborhoodCard.tsx#L3-L14)).
Les 11 catégories existantes se regroupent en 4 familles :

| Famille | Catégories POI existantes |
|---|---|
| Enseignement | `school` + la carte scolaire (secteur collège) |
| Soins | `pharmacy`, `doctor` |
| Commerces & services | `supermarket`, `bakery`, `post_office`, `bank` |
| Culture & loisirs | `library`, `park`, `sport`, `restaurant` |

### Bandeau de chiffres clés

6 tuiles, **une par section**, chacune ancrant vers la sienne — le bandeau devient un miroir du sommaire.

| Tuile | Valeur | Source dans le DTO |
|---|---|---|
| Prix médian | € / m² | `realEstate.medianPricePerSquareMeter` |
| Mobilité | niveau | `mobility.label` |
| À proximité | nb de services à < 10 min | dérivé de `neighborhood.pois` |
| Air | niveau | `airQuality.level` |
| Risques | niveau | `risks.level` |
| Population | revenu médian | `demographics.revenuMedian` |

### Quatre cartes au lieu d'une

La carte unique surchargée de toggles est éclatée : chaque carte à côté de la donnée qu'elle illustre.

| Emplacement | Couches |
|---|---|
| Haut de page — Localisation | marqueur + parcelle cadastrale (contour commune en mode commune) |
| § 1 Immobilier | transactions DVF colorées €/m² |
| § 5 Risques | les 4 WMS + toggles (argiles, inondation, sismique, radon) |
| § 6 Population | contour IRIS |

Écartées à ce stade : une carte « transports » (isochrone à concevoir) et une carte « services »
(secteur collège + POI). Le secteur collège et les arrêts restent en liste texte.

**Chantiers induits — à ne pas sous-estimer :**

- **Découper le composant `Map`.** [Map.tsx](frontend/src/components/map/Map.tsx#L48-L61) est un
  fourre-tout à 10 props (`cadastreParcel`, `dvfTransactions`, `irisGeojson`, `communeContour`,
  `schoolSector`, `risks`, `transports`…) avec ses IDs de couches en dur. → carte de base +
  composition de couches par section.
- **Le PDF casse.** [AnalysisScreen.tsx:55-59](frontend/src/components/analysis/AnalysisScreen.tsx#L55-L59)
  garde **un seul** `mapRef` et [captureMap.ts](frontend/src/features/analysis-pdf/captureMap.ts)
  capture un canvas unique. → registre de refs, 4 captures placées dans leurs sections.
- **Lazy-init des cartes** (`IntersectionObserver`) pour ne pas faire booter 4 contextes WebGL au
  chargement. ⚠️ Interaction avec le PDF : une carte jamais scrollée n'est jamais initialisée, donc
  rien à capturer — il faudra forcer l'init des 4 avant génération.
- `preserveDrawingBuffer: true` nécessaire sur les 4 (coût mémoire).
- Le style IGN pèse 288 Ko de JSON : le récupérer **une fois** et partager l'objet parsé entre les 4
  cartes, au lieu de 4 téléchargements.

### Point ouvert — mode `commune`

Les trous du mode commune deviennent visibles à l'échelle d'une **section entière** au lieu d'une card :
« À proximité » est vide (POI mesurés depuis le centroïde), « Se déplacer » se réduit au nom de la gare,
« Immobilier » perd le cadastre. À trancher à l'implémentation : masquer la section, ou afficher
« donnée disponible uniquement pour une adresse précise ».

---

## Point 2 — Nouvelles données ⏸ après la restructuration

Décision : on restructure d'abord, on branche les données ensuite. Seul arbitrage pris à ce stade —
la **délinquance SSMSI ira en section Population**, pas dans Risques (ne pas mélanger aléa naturel et
fait social).

**Révisé à l'implémentation** : elle a sa **propre section « Sécurité »**, placée après
« Environnement ». Le motif d'origine tient toujours — ce n'est pas une sous-partie de Risques —
mais elle n'avait pas davantage sa place en annexe de la démographie. Fait, voir ci-dessous.

Candidats évalués, par rapport valeur/effort décroissant :

| Source | Section | Effort | Note |
|---|---|---|---|
| **DPE ADEME** | Immobilier | moyen | Étiquette énergie **à l'adresse**. La donnée qui manque le plus à un produit « avant de louer ou acheter ». Repli utile : distribution des étiquettes du quartier. |
| **Sites pollués (CASIAS/BASOL)** | Risques | **faible** | L'API Géorisques est déjà branchée dans [brgm-risk.provider.ts](frontend/src/server-modules/risks/infrastructure/brgm-risk.provider.ts) — ce sont des endpoints supplémentaires du même service. |
| **IPS des collèges** | À proximité | faible | Jointure directe : `SchoolSectorDto` porte déjà `codeUai` ([dto:210](frontend/src/server-shared/types/location-analysis.dto.ts#L210)). |
| ~~**Délinquance SSMSI**~~ | Sécurité | — | **Fait.** Section propre, 5 indicateurs sur 10 ans en courbes, comparés au département et à la France. Maille communale — aucune donnée publique n'existe sous ce niveau, l'infra-communal (IRIS, QPV) restant réservé aux chercheurs. Le secret statistique masque les effectifs de 1 à 4 : rendus en bande d'incertitude plutôt qu'en trou, le zéro étant lui publié. |
| ~~**Municipales 2026**~~ | Élections | — | **Fait.** Les résultats ont leur propre section, avec la présidentielle. L'obstacle anticipé n'était pas le bon : le format large (13 blocs de colonnes répétés) se dépivote sans peine, mais **l'État ne publie de nuance politique que pour 3 282 communes sur 34 836** — 9 % des communes, tout de même 65 % du corps électoral. D'où deux modes d'affichage : barres colorées comparées au national là où la nuance existe, listes nues avec voix et sièges ailleurs. 23 681 communes n'avaient qu'une seule liste : aucune barre n'y est dessinée, une barre pleine à 100 % se lirait comme un plébiscite. |
| **Fibre / débit ARCEP** | Immobilier | ? | Mode d'accès à vérifier. |

**Écartés pour la V2** : le **bruit** (pas de couverture nationale homogène — Bruitparif couvre l'IDF,
ailleurs ce sont les cartes de bruit stratégiques par agglomération : beaucoup d'effort pour une donnée
absente sur la majorité des adresses) et les **antennes relais ANFR** (facile mais anxiogène plus
qu'informatif).

⚠️ Ces jeux de données n'ont **pas** été vérifiés techniquement (connaissance arrêtée à mai 2026).
Vérifier les modalités d'accès réelles avant de s'engager sur l'un d'eux.

---

## Point 3 — Remplacement d'OpenStreetMap 🔬

Deux périmètres distincts :

- **Fond de carte** — [Map.tsx:334](frontend/src/components/map/Map.tsx#L334) tape en direct sur
  `tile.openstreetmap.org` en raster. **Contraire à la tile usage policy de l'OSMF en production** :
  risque de blocage. C'est l'argument décisif, avant même l'esthétique.
- **POI du voisinage** — `scripts/import_osm.py` (4,2 Go de PBF) + BPE INSEE. **Non prioritaire** :
  [combined-neighborhood.provider.ts](frontend/src/server-modules/neighborhood/infrastructure/combined-neighborhood.provider.ts)
  contient ~300 lignes de déduplication OSM ↔ BPE patiemment mises au point. Remplacer catégorie par
  catégorie là où OSM est faible (écoles → Annuaire de l'éducation, qui apporte le code UAI et branche
  l'IPS ; santé → FINESS), pas en bloc. Commerces et loisirs : OSM reste imbattable.

### Comparateur — `/map-lab` (supprimé)

Bac à sable qui a servi à l'arbitrage : 13 fonds cochables, cartes synchronisées, vraies couches WMS
risques par-dessus, DVF et parcelle simulés, 6 lieux de test, curseurs d'opacité.

**Supprimé une fois le choix fait**, avec les entrées de catalogue qui n'existaient que pour lui
(OSM raster, ortho, parcellaire, cartes historiques). Les identifiants WMTS restent documentés
dans le tableau ci-dessous : c'est ce qui a coûté à obtenir, pas le composant.
[basemaps.ts](frontend/src/components/map/basemaps.ts) ne garde que ce que la production utilise.

### Ce qui a été vérifié

La Géoplateforme IGN (`data.geopf.fr`) **est** cartes.gouv.fr. Aucune clé API, aucun quota.
Attribution obligatoire : « IGN-F/Géoportail ». Le GetCapabilities WMTS expose **686 couches**.

**Styles vectoriels PLAN IGN** — MapLibre spec v8, sprites et fontes hébergés côté IGN, 6 variantes,
toutes en 200 :
`standard`, `classique`, `gris`, `attenue`, `accentue` (425 couches), `sans_toponymes` (291 couches).
→ `https://data.geopf.fr/annexes/ressources/vectorTiles/styles/PLAN.IGN/<nom>.json`

**Couches WMTS raster utiles.** Format, style et plage de zoom ne sont **pas devinables** — se tromper
renvoie un 400 avec une exception XML, pas une tuile vide :

| Couche | Identifiant | Format | Zooms |
|---|---|---|---|
| Photographies aériennes | `ORTHOIMAGERY.ORTHOPHOTOS` | jpeg | z0-19 |
| Parcellaire cadastral | `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` | png | z0-19 |
| Plan IGN raster | `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2` | png | z0-19 |
| Photos aériennes 1950-1965 | `ORTHOIMAGERY.ORTHOPHOTOS.1950-1965` | png | z0-18 |
| Carte 1950 (SCAN 50) | `GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN50.1950` | **jpeg** | z3-15 |
| État-major (1820-1866) | `GEOGRAPHICALGRIDSYSTEMS.ETATMAJOR40` | **jpeg** | z6-15 |
| Carte de Cassini | `BNF-IGNF_GEOGRAPHICALGRIDSYSTEMS.CASSINI` | png | z6-14 |

### Trois réponses acquises

**Peut-on poser des calques IGN sur OSM ?** Oui — fond et calques sont indépendants dans MapLibre, et
c'est déjà ce qui se passe avec les WMS BRGM. Mais **les cartes historiques ne sont pas des calques** :
ce sont des rasters opaques couvrant tout, elles *remplacent* le fond. Usage pertinent : rideau
avant/après, ou opacité partielle. Le seul vrai calque IGN superposable est le **parcellaire**
(transparent) — il montrerait toutes les parcelles en contexte sous celle surlignée via APICarto.

**Existe-t-il une ortho-photo OSM ?** Non, et ça ne peut pas exister. OSM est une base de données
vectorielle (nœuds, chemins, relations) : aucune image dedans. Les contributeurs *dessinent* d'après
des photos aériennes tierces (Bing, Esri, et en France l'ortho IGN, que l'IGN autorise pour ce
calquage), mais ces images ne sont pas rediffusées par OSM. → **L'IGN est la seule ortho gratuite et
légale sur la France.**

**Autres avantages / inconvénients.**

*Pour l'IGN* : légalité (l'argument décisif) ; les **numéros de rue** s'affichent, ce qui confirme
visuellement l'adresse analysée — vrai atout produit ; le vectoriel rend le restylage possible (mode
sombre, désaturation, masquage sélectif des libellés) ; consolidation chez un fournisseur déjà utilisé
(`data.geopf.fr` pour le géocodage, `apicarto.ign.fr` pour le cadastre).

*Contre l'IGN* : c'est plus lourd. Mesuré sur la même tuile, z13 Paris —

| Fond | Poids |
|---|---|
| OSM raster | 7,0 Ko |
| IGN Plan raster | 34,5 Ko |
| IGN Plan vectoriel | 63,5 Ko |

À nuancer : une tuile vectorielle sert plusieurs niveaux de zoom et se restyle sans re-télécharger.
Mais le premier affichage coûte plus cher, et 425 couches à rendre pèsent plus qu'une image unique —
ce qui compte sur mobile bas de gamme avec 4 cartes sur la page.

*Sur les commerces OSM* : leur absence côté IGN est un **avantage** ici. Les POI du fond font doublon
avec la couche POI maison (OSM + BPE) et la concurrencent visuellement. C'est exactement l'usage du
style `sans_toponymes`.

### Recommandation — fond mixte plutôt qu'un choix unique

| Carte | Fond | Pourquoi |
|---|---|---|
| Localisation (haut) | IGN standard, ortho en option | Les numéros de rue confirment l'adresse exacte |
| DVF, Risques, IRIS | IGN gris ou sans toponymes | Le fond doit s'effacer sous les aplats colorés |

**Appliqué** : `LOCATOR_BASEMAP = "standard"`, `THEMATIC_BASEMAP = "gris"`. L'ortho en option sur la
carte de localisation n'a pas été faite — elle demande un sélecteur de fond, hors périmètre du point 1.

### Piège rencontré à l'intégration

Un fond vectoriel n'a pas un calque mais 425, et nos surfaces s'inséraient **avant le premier calque
`symbol`**. Dans `standard`, celui-ci arrive à l'index 51 : une cote de courbe de niveau, pas un
toponyme. La parcelle et les DVF se retrouvaient donc enterrées sous le bâti (index ~122) et toute la
voirie. Avec un fond raster à un seul calque, le bug n'existait pas. Corrigé en visant la fin de la
géométrie — le dernier calque non-`symbol` — au lieu du début des libellés.
