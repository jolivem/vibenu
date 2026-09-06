# ClaireAdresse

Monorepo pour **ClaireAdresse**, une application web permettant à un citoyen de saisir une adresse en France et d'obtenir une lecture simple, cartographique et compréhensible de son environnement avant de louer ou acheter un bien.

## Vision produit

ClaireAdresse n'est pas un portail immobilier complet. Le produit est pensé comme un **assistant de décision avant location/achat**.

L'utilisateur saisit une adresse en France et obtient :
- la localisation sur une carte interactive (zoom adresse précise ou contour communal selon la recherche) ;
- les transports proches (bus, métro/RER, gare) avec extension automatique en zone rurale ;
- les risques naturels et technologiques ;
- le cadastre et les règles d'urbanisme (zone PLU, prescriptions) ;
- les prix immobiliers du secteur avec visualisation cartographique ;
- la qualité de l'air ;
- les commerces et services de proximité ;
- les données socio-démographiques (population, âge, revenus, pauvreté), le parc de logements, l'emploi et les qualifications, la composition des ménages ;
- la **délinquance enregistrée** (SSMSI) sur dix ans, comparée au département et à la France ;
- les **normales climatiques 1991-2020** (température, pluviométrie, ensoleillement) avec comparaison commune / France ;
- les **résultats de la dernière élection présidentielle** (1er tour 2022) avec comparaison commune / national ;
- le **lieu autrefois** : cartes et photographies aériennes anciennes de l'IGN, fondues sur la vue actuelle ;
- une **mini-synthèse « En bref » rédigée par IA** sous le titre de chaque card à graphiques, qui dit ce qu'il faut comprendre des courbes ;
- un **export PDF** du rapport complet, téléchargeable en un clic.

## Architecture

- **Next.js** / React / TypeScript (frontend + API routes serveur)
- **MapLibre GL** pour la carte interactive (avec contour de commune en mode recherche par nom)
- **PostgreSQL / PostGIS** (auto-hébergé via Docker) pour les données OSM, DVF, IRIS, élections, délinquance SSMSI, normales climatiques par station et les caches des textes LLM
- **Météo-France** (normales 1991-2020 par station) pré-importées dans PostgreSQL — composition par métrique (la station la plus proche disposant de chaque indicateur)
- **Mistral AI** pour les mini-synthèses des cards et la narrative des pages `/commune/*` — l'API visée est un `/chat/completions` compatible OpenAI, donc changer de fournisseur ne demande que `LLM_BASE_URL` + `LLM_API_KEY`
- **@react-pdf/renderer** pour l'export PDF vectoriel côté client
- Architecture modulaire (DDD) dans `frontend/src/server-modules/`
- Cache en mémoire (TTL par source de données) + cache Postgres pour les textes LLM
- Deux variantes du site (`PUBLIC` / `PRO`) pilotées par drapeaux de features — cf. `frontend/src/lib/site-features.ts`
- Couches cartographiques WMS (risques) et GeoJSON (cadastre, prix DVF, contour commune)

## Modules

| Module | Description | Source de données |
|--------|-------------|-------------------|
| `address` | Recherche et géocodage inverse | Géoplateforme IGN (data.geopf.fr) |
| `analysis` | Orchestration de l'analyse complète | - |
| `mobility` | Transports et mobilité | transport.data.gouv.fr (GTFS) |
| `risks` | Risques naturels/technologiques | Géorisques (georisques.gouv.fr) |
| `real-estate` | Contexte immobilier et prix | DVF géolocalisé (PostgreSQL/PostGIS) |
| `cadastre` | Parcelle, zone PLU, prescriptions | API Carto IGN (apicarto.ign.fr) |
| `air-quality` | Qualité de l'air | Atmo France (admindata.atmo-france.org) |
| `neighborhood` | Commerces et services proches | OSM + BPE INSEE (PostgreSQL/PostGIS) |
| `demographics` | Données socio-démographiques (population, revenus, âge) | INSEE IRIS (PostgreSQL/PostGIS) |
| `elections` | Résultats Présidentielle 2022 T1 (commune + agrégat national) | Ministère de l'Intérieur (PostgreSQL) |
| `climate` | Normales climatiques 1991-2020 (température, pluie, soleil) | Météo-France — normales par station pré-importées (PostgreSQL/PostGIS) ; moyenne nationale hardcodée |
| `security` | Délinquance enregistrée, 10 ans, maille communale + repères département/France | SSMSI via data.gouv.fr (PostgreSQL) |
| `school-sector` | Secteur de collège (donnée disponible pour Paris) | Ville de Paris (PostgreSQL/PostGIS) |
| `commune-stats` | Agrégats des pages SEO `/commune/*` (prix, démographie, équipements, air, élections) | PostgreSQL/PostGIS |
| `summary` | Construction du résumé textuel (règles déterministes) — toujours produit dans le DTO, **plus affiché** depuis le passage aux mini-synthèses | - |
| `narrative` | Mini-synthèses « En bref » des cards + narrative des pages `/commune/*`, avec cache Postgres | Mistral AI (api.mistral.ai) |

## Carte interactive

### Couches cartographiques

| Couche | Type | Source | Toggle |
|--------|------|--------|--------|
| Parcelle cadastrale | GeoJSON (polygone) | API Carto IGN | toujours visible |
| Prix immobiliers (DVF) | GeoJSON (polygones colorés par prix/m²) | DVF (PostgreSQL) | oui |
| Retrait-gonflement argiles | WMS raster | BRGM (geoservices.brgm.fr) | oui |
| Zones inondables (PPR) | WMS raster | Géorisques (mapsref.brgm.fr) | oui |
| Zonage sismique | WMS raster | BRGM | oui |
| Potentiel radon | WMS raster | Géorisques | oui |
| Zone démographique (IRIS) | GeoJSON (polygone) | INSEE IRIS (PostgreSQL) | oui |
| Contour de commune | GeoJSON (polygone) | API Découpage administratif IGN (geo.api.gouv.fr) | auto si recherche par nom de commune |
| Époques anciennes (Cassini, état-major, carte de 1950, photos aériennes 1950-65 / 1965-80 / 2000-05) | WMTS raster | Géoplateforme IGN (data.geopf.fr) | frise d'époques, card « Le lieu autrefois » |

### Card « Le lieu autrefois » — sonde de couverture

La couche historique est posée **par-dessus** l'ortho-photographie actuelle, qui reste le
fond : c'est elle le terme de comparaison. Conséquence, là où une couche n'a pas de
donnée, MapLibre ne dessine rien et le fond transparaît — l'utilisateur verrait la photo
d'aujourd'hui sous une pastille annonçant « 1965-80 ».

`historicalCoverage.ts` sonde donc une tuile par époque, au point demandé, avant de
dresser la frise : les époques sans donnée ne sont pas proposées, et une ligne sous la
frise les nomme. L'absence de donnée prend **deux formes** sur la Géoplateforme, et il
faut traiter les deux :

- un `HTTP 404` portant `<Exception>No data found</Exception>` ;
- un `HTTP 200` avec une PNG palettisée entièrement transparente (1 595 octets).

Les deux s'observent sur la même couche selon le zoom. Exemple vérifiable :
`ORTHOIMAGERY.ORTHOPHOTOS.1965-1980` renvoie un 404 à Saint-Cyr-l'École et une tuile vide
à Versailles, tandis que Paris, Lyon, Marseille, Toulouse et Rennes sont couverts.

## Cache

Le serveur utilise un cache en mémoire (`InMemoryCache`) avec des TTL adaptés à la fréquence de mise à jour de chaque source :

| Source | TTL cache | Stockage | Fréquence de mise à jour |
|--------|-----------|----------|--------------------------|
| Adresse (BAN) | 7 jours | in-memory | quasi-statique |
| DVF (prix immobiliers) | 7 jours | in-memory | semestriel |
| Cadastre / PLU | 7 jours | in-memory | trimestriel |
| Géorisques (risques) | 24 heures | in-memory | mensuel à trimestriel |
| Transport (GTFS) | 24 heures | in-memory | hebdomadaire à mensuel |
| Voisinage (OSM) | 7 jours | in-memory | quotidien (Geofabrik) |
| Qualité de l'air (Atmo) | 6 heures | in-memory | quotidien |
| Climat (Météo-France stations, normales 1991-2020) | 30 jours | in-memory (clé arrondie ~11 km) | données figées (passé) |
| Élections (Postgres local) | — | — | données figées (scrutin clos) |
| Contour commune (geo.api.gouv.fr) | 30 jours | in-memory | quasi-statique |
| Mini-synthèses « En bref » (Mistral) | 90 jours | **PostgreSQL** (`card_insights_cache`) | sources annuelles (recensement, SSMSI, normales, présidentielle) |
| Narrative des pages `/commune/*` (Mistral) | version de prompt | **PostgreSQL** (`commune_narrative_cache`) | stable tant que les données sources ne changent pas |

La clé de cache est basée sur les coordonnées arrondies (~10m de précision). Le cache in-memory est limité à 500 entrées par source ; les caches Postgres des textes LLM persistent entre redéploiements.

La clé de `card_insights_cache` est `(geo_key, mode, model, version)` : le modèle et la version de prompt sont **dans** la clé primaire, si bien que changer de modèle ou incrémenter `CARD_INSIGHTS_PROMPT_VERSION` cesse de servir les anciennes lignes sans qu'il y ait rien à supprimer.

⚠️ `NEXT_PUBLIC_DEBUG=true` court-circuite ce cache **en lecture et en écriture** : chaque affichage rappelle alors le modèle. À laisser à `false` dès qu'on ne débogue pas le prompt, sous peine d'épuiser le quota.

## Mode d'analyse : `address` vs `commune`

L'application détecte automatiquement le **type de la suggestion** sélectionnée (champ `type` retourné par la BAN/Géoplateforme : `housenumber`, `street`, `locality`, `municipality`) et le réduit à un **mode d'analyse binaire** :

```ts
type AnalysisMode = "address" | "commune";
```

- **`address`** : recherche par adresse précise (`housenumber`, `street`, `locality`)
- **`commune`** : recherche par nom de commune (`municipality`)

Le mode est **calculé une seule fois** dans `LocationAnalysisUseCase` et **exposé dans le DTO** sous `LocationAnalysisDto.mode`. Tous les composants (frontend, PDF) lisent ce champ — pas besoin de re-propager le `type` brut de l'URL.

### Comportement par mode

| Aspect | Mode `address` | Mode `commune` |
|---|---|---|
| Carte (zoom) | Marker bleu + zoom 17 (parcelle) ou 14 | Contour communal IGN bleu pâle 10 % + bordure 2 px, `fitBounds` automatique, marker masqué |
| Cadastre | Parcelle + zone PLU à l'adresse | Sauté (sans objet sur un territoire entier) |
| DVF (immobilier) | Rayon 1 km autour du point | Toutes les transactions de la commune (`WHERE code_commune = ?`) |
| Mobilité (bus) | Liste des arrêts dans 1 km avec distance + temps de marche | **Masquée** (les arrêts sont mesurés depuis le centroïde, peu pertinents) |
| Mobilité (gare) | Gare la plus proche dans 20 km, avec distance + temps | Nom de la gare seul, sans distance |

### Conventions de code

- Le type `AnalysisMode` est exporté depuis `frontend/src/server-shared/types/location-analysis.dto.ts` et `frontend/src/types/location-analysis.ts`
- Les services qui dépendent du mode reçoivent une option `{ mode: AnalysisMode }` (ex. `RealEstateService.getMarketData`)
- Les composants UI reçoivent une prop `mode: AnalysisMode` (ex. `MobilityCard`, `PdfMobility`)
- Aucune comparaison directe à `"municipality"` ne devrait subsister hors du use-case (qui fait la conversion `type` → `mode`)

## Layout d'analyse

L'écran d'analyse est organisé en **sections thématiques** empilées (`.analysis-sections`,
flex colonne), chacune introduite par un titre et contenant une ou plusieurs cards en
pleine largeur (`.analysis-section-body`). L'ordre et les libellés sont centralisés dans
`frontend/src/components/analysis/sections.ts`, et `SectionNav` en dérive le sommaire
latéral qui suit le défilement.

Chaque card à graphiques porte sa **mini-synthèse « En bref »** sous le titre — un
`<p class="card-insight">` avec un liseré d'accent, dont le tag sépare visuellement
l'interprétation du modèle de la donnée sourcée qui l'entoure.

## Approche d'évaluation

L'application présente les données **factuelles** sans jugement synthétique chiffré : pas de score global ni de score par module. Chaque indicateur est exposé avec ses propres unités (niveau de mobilité, niveau de risque, prix médian €/m², qualité de l'air, etc.) et — quand c'est pertinent — comparé à une référence (commune, France).

L'interprétation finale est laissée à l'utilisateur, complétée optionnellement par les **mini-synthèses « En bref »** : une à deux phrases sous le titre de chaque card à graphiques, qui disent ce qu'il faut comprendre des courbes plutôt que de résumer le thème. Une mention sous les cards rappelle qu'elles sont rédigées par une IA à partir des seules données affichées.

## API Routes (Next.js)

| Route | Description |
|-------|-------------|
| `GET /api/address/search?q=...` | Recherche d'adresse (autocomplétion) |
| `GET /api/location/analyze?lat=...&lon=...` | Analyse complète d'une adresse |
| `POST /api/location/card-insights` | Mini-synthèses des cards (corps = `LocationAnalysisDto`, réponse = `{ insights, generatedAt, cached }`). Répond **toujours** 200 ou 400 : toute défaillance LLM donne `insights: {}` |
| `GET /api/health` | Sonde de vivacité |
| `GET /api/debug/pois` | Inspection des POIs voisins (debug) |

## Élections (Présidentielle 2022, 1er tour)

L'écran d'analyse expose le **profil électoral** de la commune sous forme de barres horizontales colorées par parti, triées par score communal décroissant, avec un **repère du score national** sur chaque barre et un delta en points (vert/orange) indiquant l'écart au résultat national.

- **Source** : Ministère de l'Intérieur via [data.gouv.fr — Présidentielle 2022 1er tour](https://www.data.gouv.fr/fr/datasets/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour/), niveau bureau de vote (`burvot`)
- **Granularité** : agrégation côté Python au niveau **commune** par sommation des bureaux de vote, puis recalcul des pourcentages
- **Tables Postgres** : `elections_pres_2022_t1_commune` (inscrits/votants/exprimés) + `elections_pres_2022_t1_results` (1 ligne par candidat × commune). L'agrégat France est stocké sous le pseudo-code `'FRANCE'` calculé à l'import
- **Affichage** : la card « Présidentielle 2022 — 1er tour » apparaît si la commune est trouvée. Si la table est vide ou le code INSEE inconnu, la card est silencieusement masquée
- **PDF + IA** : la section est aussi incluse dans le PDF, et le top 3 des candidats (avec écart au national) est passé au prompt Mistral, qui en tire la mini-synthèse « En bref » de la card
- **Licence** : Licence Ouverte Etalab 2.0

## Mini-synthèses IA « En bref » (Mistral)

Sous le titre de chaque card à graphiques, une à deux phrases rédigées par un LLM disent
**ce qu'il faut comprendre des courbes** — pour le lecteur qui n'a ni le temps ni les
repères pour les lire. Elles s'affichent dans l'écran d'analyse et dans l'export PDF.

- **Sept clés, un seul appel** : `securite`, `demographie`, `logement`, `emploi`,
  `menages`, `elections`, `climat`. La liste est la source unique
  (`server-shared/types/card-insights.ts`) : le type, le format de sortie du prompt, le
  parseur et le cache en dérivent tous.
- **Une clé est produite si et seulement si sa card est rendue.** `card-insights.input.ts`
  réplique la garde de chaque card ; le champ `cles_attendues` du prompt liste les
  sections effectivement affichées, et le parseur ignore tout ce qui déborde.
- **On calcule, le modèle verbalise.** Tendances, écarts au national, extrema et classes
  dominantes sont tranchés en TypeScript sur des seuils explicites. Le modèle reçoit
  « en baisse de 31 % », pas dix nombres à comparer — c'est ce qui rend la lecture
  reproductible.
- **Prompt** : système strict — 25 à 45 mots, aucun chiffre sans repère, aucune
  explication causale, seuil de saillance à 2 points (ou 5 % en relatif), pas de jargon,
  jamais « le graphique montre ». Sortie en JSON (`response_format: json_object`).
- **Cache** : table `card_insights_cache`, TTL 90 jours, clé
  `(geo_key, mode, model, version)`.
- **Dégradation silencieuse** : le service ne lève **jamais**. Clé absente, quota épuisé,
  JSON illisible ou base indisponible donnent `insights: {}` et la route répond 200 — les
  cards s'affichent alors sans phrase, exactement comme avant la fonctionnalité.
- **Développer sans clé** : `CARD_INSIGHTS_FIXTURE=1` (ou `=slow`, qui ajoute 1,2 s de
  latence pour juger le fondu à l'apparition) sert des phrases factices sans aucun appel
  au LLM.

Les pages SEO `/commune/*` ont leur propre pipeline (`commune-narrative.*`) : quatre
paragraphes éditoriaux **plus** une légende par section affichée, en un appel, avec une
règle anti-redite entre les deux familles de clés. Cache : `commune_narrative_cache`.

- **Fournisseur** : Mistral AI (`mistral-small-latest`) par défaut. L'API visée est un
  `/chat/completions` compatible OpenAI : pointer un autre fournisseur ou un modèle local
  ne demande que `LLM_BASE_URL` et `LLM_API_KEY` (qui retombe sur `MISTRAL_API_KEY`).
- **Obtenir une clé** : [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys/).
- **Vérifier une clé** (un 429 `Rate limit exceeded` signifie quota épuisé, pas clé
  invalide — et se traduit à l'écran par des cards sans phrase, sans message d'erreur) :

```bash
curl -i https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer $MISTRAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"mistral-small-latest","messages":[{"role":"user","content":"Bonjour"}]}'
```

## Export PDF

Un bouton **« Télécharger PDF »** dans la barre supérieure de l'écran d'analyse génère un PDF vectoriel du rapport complet, texte sélectionnable, directement dans le navigateur.

- **Technologie** : [`@react-pdf/renderer`](https://react-pdf.org) chargé dynamiquement à la demande (pas d'impact sur le bundle initial).
- **Contenu** : mobilité, sécurité, qualité de l'air, climat, voisinage, secteur de collège, démographie (avec graphique d'âge en SVG) et profil INSEE, élections, immobilier, cadastre — chaque chapitre concerné reprenant sa mini-synthèse « En bref » (`PdfInsight`).
- **Carte** : capturée comme PNG depuis la toile MapLibre (`getCanvas().toDataURL()`), avec `preserveDrawingBuffer: true` activé sur la carte.
- **Mise en cache** : aucune — le PDF est toujours généré à la volée côté client.

## Démarrage

### 1. Import des données (PostgreSQL + PostGIS requis)

> Jouer d'abord les **migrations SQL** (§ 2) : plusieurs scripts remplissent des tables
> qu'elles créent (`crime_*`, `municipales_2026_*`, `climate_station_*`, `school_sector`).

```bash
cd scripts
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configurer .env avec votre connexion PostgreSQL
# POSTGRES_URL=postgresql://user:pass@localhost:5432/mabase

# Importer OSM (voisinage) — télécharge france-latest.osm.pbf (~4.2 Go)
python import_osm.py

# Importer BPE (voisinage INSEE, complémentaire à OSM) — ~5 min
python import_bpe.py

# Importer DVF (prix immobiliers) — ~15-30 min
python import_dvf.py

# Importer IRIS (contours, démographie, revenus) — ~5 min
# À jouer AVANT import_insee_iris.py : les contours définissent quels IRIS existent.
python import_iris.py

# Enrichir les IRIS : logement, emploi & qualifications, ménages — ~30 s
# (~105 Mo de ZIP INSEE, mis en cache dans scripts/data/insee/)
python import_insee_iris.py
python import_insee_iris.py --only logement   # ou un seul axe

# Importer Présidentielle 2022 T1 — ~1 min
# Télécharger d'abord resultats-par-niveau-burvot-t1-france-entiere.xlsx (31,9 Mo)
# depuis https://www.data.gouv.fr/fr/datasets/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour/
python import_elections.py --file ~/Downloads/resultats-par-niveau-burvot-t1-france-entiere.xlsx

# Importer les Municipales 2026 (T1 + T2) — CSV data.gouv.fr, téléchargés si absents
python import_municipales.py

# Importer la délinquance SSMSI — COM (~39 Mo, 5,2 M lignes) + DEP, téléchargés si absents
python import_crime.py

# Importer les normales climatiques Météo-France 1991-2020 — ~10 min
# Déposer d'abord les *.csv.gz décadaires dans scripts/data/climate/
python import_climate_stations.py

# Importer les indices ATMO annuels (une ville par script)
python import_atmo_paris.py
python import_atmo_lyon.py
python import_atmo_marseille.py

# Importer les secteurs de collège de Paris (opendata.paris.fr)
python import_school_sectors_paris.py
```

### 2. Migrations SQL applicatives

Les tables nécessaires au code applicatif (hors scripts d'import) sont dans `frontend/src/server-shared/infrastructure/database/migrations/`. À jouer **dans l'ordre** sur la base, ou en boucle :

```bash
for f in frontend/src/server-shared/infrastructure/database/migrations/*.sql; do
  psql "$POSTGRES_URL" -f "$f"
done
```

Migrations actuelles :
- `002-narrative-cache.sql` — table `narrative_cache`, cache de l'ancienne card « Synthèse ». **Orpheline** depuis le passage aux mini-synthèses : plus aucune requête ne la touche. Non supprimée ici (`update.sh` rejoue les migrations, un `DROP` n'a pas de retour arrière) ; une migration 019 la retirera une fois la feature stabilisée en prod
- `003-elections.sql` — tables `elections_pres_2022_t1_commune` + `elections_pres_2022_t1_results`
- `005-commune-narrative-cache.sql` — cache des synthèses des pages `/commune/*`
- `008-climate-station-normales.sql` / `013-climate-station-monthly.sql` — normales Météo-France
- `009` / `011-air-quality-atmo*.sql` — indices Atmo multi-villes
- `010-commune-contour-cache.sql` — contours communaux
- `012-school-sectors.sql` — secteurs de collège
- `014-drop-climate-national-tables.sql` — nettoyage de deux tables climat obsolètes
- `015-crime-ssmsi.sql` — délinquance SSMSI (`crime_commune`, `crime_reference`, `crime_indicateur`)
- `016-municipales-2026.sql` — municipales 2026
- `017-insee-iris.sql` — `iris_demographics` (jusque-là créée par le script d'import),
  ses trois tables sœurs `iris_logement` / `iris_emploi` / `iris_menages`, et la vue
  matérialisée `insee_aggregate` (repères commune et France pré-calculés)
- `018-card-insights-cache.sql` — `card_insights_cache`, le cache des mini-synthèses
  « En bref ». Clé `(geo_key, mode, model, version)`. **Sans cette table, rien ne casse
  visiblement** : le provider avale ses erreurs SQL, et le seul symptôme est un appel au
  LLM à chaque affichage. Penser à la jouer sur une base locale créée avant cette
  migration — `update.sh` s'en charge en prod, rien ne le fait en dev

Le script `update.sh` exécute automatiquement toutes les migrations à chaque déploiement.
Elles sont idempotentes grâce à `CREATE TABLE IF NOT EXISTS` — avec une réserve :
`CREATE MATERIALIZED VIEW IF NOT EXISTS` ne met **pas** à jour une vue existante.
Changer la définition d'`insee_aggregate` demande une nouvelle migration `DROP + CREATE`.
Son contenu, lui, se rafraîchit avec les imports (`python import_insee_iris.py`).

### 3. Lancer l'application

```bash
# Installation
pnpm install

# Frontend (port 3000)
cd frontend
cp .env.example .env   # configurer POSTGRES_URL
pnpm dev
```

## Variables d'environnement (frontend)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `POSTGRES_URL` | URL de connexion PostgreSQL (OSM + DVF + IRIS + caches LLM) | - |
| `ATMO_USERNAME` | Email du compte Atmo France (optionnel) | - |
| `ATMO_PASSWORD` | Mot de passe du compte Atmo France (optionnel) | - |
| `MISTRAL_API_KEY` | Clé API Mistral. Sans elle, les phrases « En bref » n'apparaissent simplement pas : cards et graphiques restent identiques | - |
| `MISTRAL_MODEL` | Modèle à utiliser (optionnel) | `mistral-small-latest` |
| `LLM_BASE_URL` | Base d'une API `/chat/completions` compatible OpenAI (autre fournisseur, modèle local) | `https://api.mistral.ai/v1` |
| `LLM_API_KEY` | Clé de ce fournisseur ; retombe sur `MISTRAL_API_KEY` si absente | - |
| `CARD_INSIGHTS_FIXTURE` | Phrases factices sans appel au LLM. `slow` ajoute 1,2 s de latence | - |
| `COMMUNE_LEGENDS_FIXTURE` | Idem pour les légendes des pages `/commune/*`. À poser **au build** (pages prérendues) | - |
| `DISABLE_CACHE` | Désactive tous les caches in-memory (`1`, `true`, `yes`) | - |
| `NEXT_PUBLIC_DEBUG` | Données brutes Atmo dans la card, payload envoyé au modèle sous les cards — et **court-circuite le cache des mini-synthèses** | `false` |
| `NEXT_PUBLIC_HIDE_AIR_QUALITY` | Coupe la rubrique « Qualité de l'air » partout (card, pages `/commune/*`, PDF, landing). Le titre de section redevient « Climat » | - |
| `NEXT_PUBLIC_SITE_VARIANT` | Variante du site : `PUBLIC` (complet) ou `PRO` (voisinage + mobilité). Relu au démarrage seulement | `PUBLIC` |

## Sources de données — notes et accès

### DVF (prix immobiliers)
- **Source** : DVF géolocalisé depuis [data.gouv.fr](https://files.data.gouv.fr/geo-dvf/latest/csv/)
- Données importées dans PostgreSQL/PostGIS via le script `scripts/import_dvf.py`
- Import de toute la France (95 départements), ventes d'appartements et maisons sur 10 ans
- Licence : Licence Ouverte Etalab 2.0
- **Dernier import** : millésime DVF 2024 (transactions jusqu'au 2024-12-31), importé en DB le 2026-05-02
- Mise à jour : semestrielle (avril et octobre) — relancer `python scripts/import_dvf.py` pour récupérer le nouveau millésime data.gouv.fr

### Atmo France (qualité de l'air)
- **Inscription** : [admindata.atmo-france.org/inscription-api](https://admindata.atmo-france.org/inscription-api)
- Remplir le formulaire → validation par un administrateur → email avec lien d'activation
- **Configuration** : renseigner `ATMO_USERNAME` et `ATMO_PASSWORD` dans le `.env`. Le provider fait `POST https://admindata.atmo-france.org/api/login`, récupère un JWT et le met en cache ~55 min avant de le renouveler
- **Endpoint data** : `GET https://admindata.atmo-france.org/api/data/112/<filter_json>?withGeom=false` avec `Authorization: Bearer <token>` (`112` = indices pollution)
- Gratuit, licence ODbL (attribution obligatoire : "Source : Atmo France / AASQA")

### OpenStreetMap + BPE (voisinage)
Les deux sources sont combinées et dédupliquées pour un résultat complet :
- **OSM** : noms des établissements, restaurants, parcs — données collaboratives
  - Extrait France depuis [Geofabrik](https://download.geofabrik.de/europe/france.html) (~4.2 Go)
  - Import : `scripts/import_osm.py`
  - Licence : ODbL
- **BPE** (Base Permanente des Équipements — INSEE) : données officielles, exhaustives pour les services de base
  - Téléchargement : [insee.fr](https://www.insee.fr/fr/statistiques/8217525)
  - Import : `scripts/import_bpe.py`
  - Licence : Licence Ouverte Etalab 2.0
- Mise à jour : mensuelle (OSM) / annuelle (BPE)

### INSEE IRIS (démographie)
- **Source** : INSEE — données socio-démographiques à l'échelle IRIS (~2 000 hab. par quartier)
- **Contours** : [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/contours-iris/)
- **Population / âge** : [Recensement RP 2021](https://www.insee.fr/fr/statistiques/7632867)
- **Revenus** : [Filosofi 2021](https://www.insee.fr/fr/statistiques/7233950)
- **Logement / emploi / ménages** : bases infracommunales RP 2021
  ([logement](https://www.insee.fr/fr/statistiques/8268838),
  [activité](https://www.insee.fr/fr/statistiques/8268843),
  [diplômes](https://www.insee.fr/fr/statistiques/8268840),
  [ménages](https://www.insee.fr/fr/statistiques/8268828))
- Données importées dans PostgreSQL/PostGIS via `scripts/import_iris.py`, puis
  `scripts/import_insee_iris.py`
- Variables : population, densité, tranches d'âge, revenu médian, taux de pauvreté,
  statut d'occupation, vacance, pièces, époque de construction, chômage, CSP, diplômes,
  composition des ménages
- Licence : Licence Ouverte Etalab 2.0
- Mise à jour : annuelle

### Climat (normales 1991-2020)
- **Source locale** : [Météo-France — données SYNOP / RR quotidiennes](https://meteo.data.gouv.fr/) agrégées sur 30 ans (1991-2020) par station. Données mesurées réelles (pas de réanalyse), licence Etalab 2.0
- **Source nationale (référence)** : [Météo-France — Climat](https://meteofrance.com/climat) ; les normales France métropolitaine 1991-2020 sont **hardcodées** dans `frontend/src/server-modules/climate/infrastructure/meteo-france-stations.provider.ts` (13,0 °C / 935 mm / 1969 h). À mettre à jour vers 2031 (nouvelle période de référence WMO 2001-2030)
- Indicateurs : température annuelle moyenne, cumul annuel de précipitations (mm), ensoleillement annuel (heures)
- Pré-import dans PostgreSQL via `scripts/import_climate_stations.py` → table `climate_station_normales` (~600 stations, géométrie PostGIS pour la recherche spatiale)
- **Composition par métrique** : pour un point donné, on prend la station la plus proche **disposant de chaque indicateur**. Toutes les stations ne mesurent pas tout (l'héliographe n'équipe que ~30 stations en France) → rayon élargi pour l'ensoleillement (100 km) vs température/précipitations (30 km). La station affichée est celle de la température (la plus proche en général).
- Cache 30 jours par coordonnées arrondies (~11 km) — en pratique les normales ne bougent jamais donc le cache n'expire utilement qu'au redémarrage du serveur
- **Setup requis** : appliquer la migration `008-climate-station-normales.sql` puis lancer `python scripts/import_climate_stations.py` (téléchargement + agrégation 30 ans, ~10 min)

### Élections (Présidentielle 2022 T1)
- **Source** : Ministère de l'Intérieur — [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour/)
- **Fichier utilisé** : `resultats-par-niveau-burvot-t1-france-entiere.xlsx` (31,9 Mo, ~70 000 bureaux de vote)
- Données agrégées au niveau commune (somme des bureaux + recalcul des pourcentages) puis insérées dans PostgreSQL via `scripts/import_elections.py`
- 12 candidats T1 2022 stockés avec leur étiquette parti (REN, RN, LFI, LR, EELV, PS, REC, DLF, NPA, RES, PCF, LO)
- Agrégat national stocké sous le code commune `'FRANCE'`
- Licence : Licence Ouverte Etalab 2.0
- Mise à jour : à chaque nouveau scrutin national (relancer le script avec le nouveau fichier)

## Structure du repository

```text
claireadresse/
├── README.md
├── scripts/               # Scripts Python d'import de données
│   ├── import_osm.py        # Import OpenStreetMap POIs → PostgreSQL
│   ├── import_bpe.py        # Import BPE INSEE → PostgreSQL
│   ├── import_dvf.py        # Import DVF géolocalisé → PostgreSQL
│   ├── import_iris.py       # Import INSEE IRIS (contours, démographie, revenus)
│   ├── import_insee_iris.py # Enrichissement IRIS : logement, emploi, ménages
│   ├── import_elections.py  # Import Présidentielle 2022 T1 (agrégation par commune)
│   ├── import_municipales.py         # Import Municipales 2026 (T1 + T2)
│   ├── import_crime.py               # Import délinquance SSMSI (commune + dept + France)
│   ├── import_climate_stations.py    # Normales Météo-France 1991-2020 par station
│   ├── import_atmo_*.py              # Indices ATMO annuels (Paris, Lyon, Marseille)
│   ├── import_school_sectors_paris.py # Secteurs de collège (opendata.paris.fr)
│   ├── requirements.txt     # Dépendances Python
│   └── .env                 # Config PostgreSQL locale (non versionné)
└── frontend/              # Next.js / React / MapLibre
    └── src/
        ├── app/
        │   ├── api/              # Routes API Next.js (analyze, card-insights, search, health)
        │   └── commune/[slug]/   # Pages SEO par arrondissement
        ├── components/
        │   ├── map/              # Carte, couches WMS, toggles, contour communal, époques anciennes
        │   ├── commune/          # Sections des pages SEO /commune/*
        │   └── analysis/         # Cards d'analyse (Mobilité, Risques, Sécurité, Élections, Histoire, etc.)
        ├── features/
        │   ├── location-analysis/  # Hooks (useLocationAnalysis, useCardInsights)
        │   └── analysis-pdf/       # Export PDF (react-pdf) — document, sections, capture carte
        ├── lib/site-features.ts  # Drapeaux de features des variantes PUBLIC / PRO
        ├── server-modules/       # Modules serveur (DDD) : address, mobility, risks, real-estate, cadastre, air-quality, neighborhood, demographics, elections, climate, security, school-sector, commune-stats, summary, narrative
        ├── server-shared/
        │   ├── infrastructure/
        │   │   ├── database/     # Pool PostgreSQL + migrations SQL applicatives
        │   │   └── cache/        # InMemoryCache + buildGeoKey
        │   └── types/            # DTOs serveur
        └── types/                # DTOs frontend
```
