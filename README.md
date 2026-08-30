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
- les données socio-démographiques (population, âge, revenus, pauvreté) ;
- les **normales climatiques 1991-2020** (température, pluviométrie, ensoleillement) avec comparaison commune / France ;
- les **résultats de la dernière élection présidentielle** (1er tour 2022) avec comparaison commune / national ;
- un résumé en langage simple ;
- une **synthèse rédigée par IA** en langage courant (Mistral) ;
- un **export PDF** du rapport complet, téléchargeable en un clic.

## Architecture

- **Next.js** / React / TypeScript (frontend + API routes serveur)
- **MapLibre GL** pour la carte interactive (avec contour de commune en mode recherche par nom)
- **PostgreSQL / PostGIS** (auto-hébergé via Docker) pour les données OSM, DVF, IRIS, élections, normales climatiques par station et le cache des synthèses IA
- **Météo-France** (normales 1991-2020 par station) pré-importées dans PostgreSQL — composition par métrique (la station la plus proche disposant de chaque indicateur)
- **Mistral AI** pour la synthèse en langage courant (pattern port/adapter → fournisseur LLM interchangeable)
- **@react-pdf/renderer** pour l'export PDF vectoriel côté client
- Architecture modulaire (DDD) dans `frontend/src/server-modules/`
- Cache en mémoire (TTL par source de données) + cache Postgres pour les synthèses LLM
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
| `summary` | Construction du résumé textuel (règles déterministes) | - |
| `narrative` | Synthèse en langage courant générée par LLM + cache Postgres | Mistral AI (api.mistral.ai) |

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
| Synthèse IA (Mistral) | 30 jours | **PostgreSQL** (`narrative_cache`) | stable tant que les données sources ne changent pas |

La clé de cache est basée sur les coordonnées arrondies (~10m de précision). Le cache in-memory est limité à 500 entrées par source ; le cache Postgres des synthèses persiste entre redéploiements.

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

L'écran d'analyse utilise un layout **2 colonnes en mode masonry** (CSS multi-colonnes `column-count: 2`) en desktop pour éviter les vides verticaux entre cards de hauteurs inégales. La carte interactive et la card « Synthèse » (IA) sont en pleine largeur (`column-span: all`). En mobile (≤ 900 px), tout repasse en colonne unique.

## Approche d'évaluation

L'application présente les données **factuelles** sans jugement synthétique chiffré : pas de score global ni de score par module. Chaque indicateur est exposé avec ses propres unités (niveau de mobilité, niveau de risque, prix médian €/m², qualité de l'air, etc.) et — quand c'est pertinent — comparé à une référence (commune, France).

L'interprétation finale est laissée à l'utilisateur, complétée optionnellement par la **synthèse IA en langage courant** qui transforme les indicateurs en paragraphe narratif.

## API Routes (Next.js)

| Route | Description |
|-------|-------------|
| `GET /api/address/search?q=...` | Recherche d'adresse (autocomplétion) |
| `GET /api/location/analyze?lat=...&lon=...` | Analyse complète d'une adresse |
| `POST /api/location/narrative` | Synthèse rédigée par IA (corps = `LocationAnalysisDto`, réponse = `{ paragraph, generatedAt, cached }`) |

## Élections (Présidentielle 2022, 1er tour)

L'écran d'analyse expose le **profil électoral** de la commune sous forme de barres horizontales colorées par parti, triées par score communal décroissant, avec un **repère du score national** sur chaque barre et un delta en points (vert/orange) indiquant l'écart au résultat national.

- **Source** : Ministère de l'Intérieur via [data.gouv.fr — Présidentielle 2022 1er tour](https://www.data.gouv.fr/fr/datasets/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour/), niveau bureau de vote (`burvot`)
- **Granularité** : agrégation côté Python au niveau **commune** par sommation des bureaux de vote, puis recalcul des pourcentages
- **Tables Postgres** : `elections_pres_2022_t1_commune` (inscrits/votants/exprimés) + `elections_pres_2022_t1_results` (1 ligne par candidat × commune). L'agrégat France est stocké sous le pseudo-code `'FRANCE'` calculé à l'import
- **Affichage** : la card « Présidentielle 2022 — 1er tour » apparaît si la commune est trouvée. Si la table est vide ou le code INSEE inconnu, la card est silencieusement masquée
- **PDF + IA** : la section est aussi incluse dans le PDF, et le top 3 des candidats (avec écart au national) est passé au prompt Mistral pour enrichir la synthèse narrative
- **Licence** : Licence Ouverte Etalab 2.0

## Synthèse IA (Mistral)

En complément du résumé déterministe (points forts / points à vérifier), une **synthèse rédigée en langage courant** est générée par un LLM à partir des données d'analyse. Elle s'affiche au-dessus du résumé dans l'écran d'analyse et est incluse dans l'export PDF.

- **Fournisseur par défaut** : Mistral AI (`mistral-small-latest`). Le module suit un pattern port/adapter ([`NarrativeProvider`](frontend/src/server-modules/narrative/infrastructure/narrative.provider.ts)), ce qui permet de basculer vers un autre LLM (Claude, OpenAI, Gemini…) en implémentant une nouvelle classe.
- **Prompt** : système strict (3–4 phrases max, ton neutre, interdiction d'inventer des données, pas de jargon).
- **Cache** : table `narrative_cache` en PostgreSQL avec TTL de 30 jours, clé = coordonnées arrondies. Évite de repayer l'API à chaque chargement et survit aux redéploiements.
- **Dégradation gracieuse** : la route retourne 502 si Mistral est indisponible ; la page affiche alors silencieusement seulement le résumé déterministe.
- **Obtenir une clé** : [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys/).

## Export PDF

Un bouton **« Télécharger PDF »** dans la barre supérieure de l'écran d'analyse génère un PDF vectoriel du rapport complet, texte sélectionnable, directement dans le navigateur.

- **Technologie** : [`@react-pdf/renderer`](https://react-pdf.org) chargé dynamiquement à la demande (pas d'impact sur le bundle initial).
- **Contenu** : toutes les cards (résumé, synthèse IA, mobilité, risques, qualité de l'air, immobilier, voisinage, démographie avec graphique d'âge en SVG, cadastre).
- **Carte** : capturée comme PNG depuis la toile MapLibre (`getCanvas().toDataURL()`), avec `preserveDrawingBuffer: true` activé sur la carte.
- **Mise en cache** : aucune — le PDF est toujours généré à la volée côté client.

## Démarrage

### 1. Import des données (PostgreSQL + PostGIS requis)

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
```

### 2. Migrations SQL applicatives

Les tables nécessaires au code applicatif (hors scripts d'import) sont dans `frontend/src/server-shared/infrastructure/database/migrations/`. À jouer **dans l'ordre** sur la base, ou en boucle :

```bash
for f in frontend/src/server-shared/infrastructure/database/migrations/*.sql; do
  psql "$POSTGRES_URL" -f "$f"
done
```

Migrations actuelles :
- `002-narrative-cache.sql` — table `narrative_cache` (cache des synthèses IA, TTL 30j)
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
| `POSTGRES_URL` | URL de connexion PostgreSQL (OSM + DVF + cache synthèses) | - |
| `ATMO_USERNAME` | Email du compte Atmo France (optionnel) | - |
| `ATMO_PASSWORD` | Mot de passe du compte Atmo France (optionnel) | - |
| `MISTRAL_API_KEY` | Clé API Mistral pour la synthèse LLM. Sans elle, la card « Synthèse » n'apparaît pas | - |
| `MISTRAL_MODEL` | Modèle Mistral à utiliser (optionnel) | `mistral-small-latest` |

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
│   ├── requirements.txt     # Dépendances Python
│   └── .env                 # Config PostgreSQL locale (non versionné)
└── frontend/              # Next.js / React / MapLibre
    └── src/
        ├── app/api/              # Routes API Next.js (analyze, narrative, search)
        ├── components/
        │   ├── map/              # Carte, couches WMS, toggles, contour communal
        │   └── analysis/         # Cards d'analyse (Mobilité, Risques, Cadastre, Élections, Narrative, etc.)
        ├── features/
        │   ├── location-analysis/  # Hooks (useLocationAnalysis, useNarrative)
        │   └── analysis-pdf/       # Export PDF (react-pdf) — document, sections, capture carte
        ├── server-modules/       # Modules serveur (DDD) : address, mobility, risks, real-estate, cadastre, air-quality, neighborhood, demographics, elections, climate, summary, narrative
        ├── server-shared/
        │   ├── infrastructure/
        │   │   ├── database/     # Pool PostgreSQL + migrations SQL applicatives
        │   │   └── cache/        # InMemoryCache + buildGeoKey
        │   └── types/            # DTOs serveur
        └── types/                # DTOs frontend
```
