# ClaireAdresse

Monorepo pour **ClaireAdresse**, une application web permettant à un citoyen de saisir une adresse en France et d'obtenir une lecture simple, cartographique et compréhensible de son environnement avant de louer ou acheter un bien.

## Vision produit

ClaireAdresse n'est pas un portail immobilier complet. Le produit est pensé comme un **assistant de décision avant location/achat**.

L'utilisateur saisit une adresse en France et obtient :
- la localisation sur une carte interactive ;
- les transports proches (bus, métro/RER, gare) ;
- les risques naturels et technologiques ;
- le cadastre et les règles d'urbanisme (zone PLU, prescriptions) ;
- les prix immobiliers du secteur avec visualisation cartographique ;
- la qualité de l'air ;
- les commerces et services de proximité ;
- un score synthétique ;
- un résumé en langage simple ;
- une **synthèse rédigée par IA** en langage courant (Mistral) ;
- un **export PDF** du rapport complet, téléchargeable en un clic.

## Architecture

- **Next.js** / React / TypeScript (frontend + API routes serveur)
- **MapLibre GL** pour la carte interactive
- **PostgreSQL / PostGIS** (Neon) pour les données OSM, DVF, IRIS et le cache des synthèses IA
- **Mistral AI** pour la synthèse en langage courant (pattern port/adapter → fournisseur LLM interchangeable)
- **@react-pdf/renderer** pour l'export PDF vectoriel côté client
- Architecture modulaire (DDD) dans `frontend/src/server-modules/`
- Cache en mémoire (TTL par source de données) + cache Postgres pour les synthèses LLM
- Couches cartographiques WMS (risques) et GeoJSON (cadastre, prix DVF)

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
| Quartier IRIS | GeoJSON (polygone) | INSEE IRIS (PostgreSQL) | oui |

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
| Synthèse IA (Mistral) | 30 jours | **PostgreSQL** (`narrative_cache`) | stable tant que les données sources ne changent pas |

La clé de cache est basée sur les coordonnées arrondies (~10m de précision). Le cache in-memory est limité à 500 entrées par source ; le cache Postgres des synthèses persiste entre redéploiements.

## Score global

Pondération des sous-scores :
- mobilité : 25 %
- risques : 25 %
- contexte immobilier : 20 %
- environnement : 10 %
- voisinage : 20 %

## API Routes (Next.js)

| Route | Description |
|-------|-------------|
| `GET /api/address/search?q=...` | Recherche d'adresse (autocomplétion) |
| `GET /api/location/analyze?lat=...&lon=...` | Analyse complète d'une adresse |
| `POST /api/location/narrative` | Synthèse rédigée par IA (corps = `LocationAnalysisDto`, réponse = `{ paragraph, generatedAt, cached }`) |

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

# Importer IRIS (démographie) — ~5 min
python import_iris.py
```

### 2. Migrations SQL applicatives

Les tables nécessaires au code applicatif (hors scripts d'import) sont dans `frontend/src/server-shared/infrastructure/database/migrations/`. À jouer une fois sur la base :

```bash
psql "$POSTGRES_URL" \
  -f frontend/src/server-shared/infrastructure/database/migrations/002-narrative-cache.sql
```

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
| `POSTGRES_URL` | URL de connexion PostgreSQL/Neon (OSM + DVF + cache synthèses) | - |
| `ATMO_USERNAME` | Email du compte Atmo France (optionnel) | - |
| `ATMO_PASSWORD` | Mot de passe du compte Atmo France (optionnel) | - |
| `NEXT_PUBLIC_DVF_SOURCE` | Source des prix DVF : `database` (PostgreSQL / data.gouv, défaut) ou `cerema` (API Cerema appelée depuis le navigateur) | `database` |
| `MISTRAL_API_KEY` | Clé API Mistral pour la synthèse LLM. Sans elle, la card « Synthèse » n'apparaît pas | - |
| `MISTRAL_MODEL` | Modèle Mistral à utiliser (optionnel) | `mistral-small-latest` |

### Choix de la source DVF

- `database` (par défaut) : lecture de la table `dvf_transactions` importée depuis data.gouv.fr. Nécessite l'import préalable via `scripts/import_dvf.py`.
- `cerema` : la route serveur renvoie des prix vides et le navigateur interroge directement l'[API Cerema](https://apidf-preprod.cerema.fr/dvf_opendata/geomutations). Utile en déploiement (ex. Vercel) où l'IP serveur est bloquée par l'API Cerema, ou lorsque PostgreSQL n'est pas configuré.

## Sources de données — notes et accès

### DVF (prix immobiliers)
- **Source** : DVF géolocalisé depuis [data.gouv.fr](https://files.data.gouv.fr/geo-dvf/latest/csv/)
- Données importées dans PostgreSQL/PostGIS via le script `scripts/import_dvf.py`
- Import de toute la France (95 départements), ventes d'appartements et maisons sur 10 ans
- Licence : Licence Ouverte Etalab 2.0
- Mise à jour : semestrielle (avril et octobre) — relancer `import_dvf.py`

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
- Données importées dans PostgreSQL/PostGIS via `scripts/import_iris.py`
- Variables : population, densité, tranches d'âge, revenu médian, taux de pauvreté
- Licence : Licence Ouverte Etalab 2.0
- Mise à jour : annuelle

## Structure du repository

```text
claireadresse/
├── README.md
├── scripts/               # Scripts Python d'import de données
│   ├── import_osm.py      # Import OpenStreetMap POIs → PostgreSQL
│   ├── import_bpe.py      # Import BPE INSEE → PostgreSQL
│   ├── import_dvf.py      # Import DVF géolocalisé → PostgreSQL
│   ├── import_iris.py     # Import INSEE IRIS (démographie) → PostgreSQL
│   ├── requirements.txt   # Dépendances Python
│   └── .env               # Config PostgreSQL locale (non versionné)
└── frontend/              # Next.js / React / MapLibre
    └── src/
        ├── app/api/              # Routes API Next.js (analyze, narrative, search)
        ├── components/
        │   ├── map/              # Carte, couches WMS, toggles
        │   ├── analysis/         # Cartes d'analyse (Mobilité, Risques, Cadastre, Narrative, etc.)
        │   └── score/            # Score global
        ├── features/
        │   ├── location-analysis/  # Hooks (useLocationAnalysis, useNarrative, useDvfRealEstate)
        │   └── analysis-pdf/       # Export PDF (react-pdf) — document, sections, capture carte
        ├── server-modules/       # Modules serveur (DDD) — incluant narrative/ pour la synthèse LLM
        ├── server-shared/
        │   ├── infrastructure/
        │   │   ├── database/     # Pool Neon + migrations SQL applicatives
        │   │   └── cache/        # InMemoryCache + buildGeoKey
        │   └── types/            # DTOs serveur
        └── types/                # DTOs frontend
```
