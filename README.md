# BienVu

Monorepo pour **BienVu**, une application web permettant à un citoyen de saisir une adresse en France et d'obtenir une lecture simple, cartographique et compréhensible de son environnement avant de louer ou acheter un bien.

## Vision produit

BienVu n'est pas un portail immobilier complet. Le produit est pensé comme un **assistant de décision avant location/achat**.

L'utilisateur saisit une adresse en France et obtient :
- la localisation sur une carte interactive ;
- les transports proches (bus, métro/RER, gare) ;
- les risques naturels et technologiques ;
- le cadastre et les règles d'urbanisme (zone PLU, prescriptions) ;
- les prix immobiliers du secteur avec visualisation cartographique ;
- la qualité de l'air ;
- les commerces et services de proximité ;
- un score synthétique ;
- un résumé en langage simple.

## Architecture

### Frontend
- **Next.js** / React / TypeScript
- **MapLibre GL** pour la carte interactive
- Couches cartographiques WMS (risques) et GeoJSON (cadastre, prix DVF)

### Backend
- **Node.js** / TypeScript / **Fastify**
- Architecture modulaire (DDD)
- Cache en mémoire avec TTL par source de données

## Modules backend

| Module | Description | Source de données |
|--------|-------------|-------------------|
| `address` | Recherche et géocodage inverse | Géoplateforme IGN (data.geopf.fr) |
| `analysis` | Orchestration de l'analyse complète | - |
| `mobility` | Transports et mobilité | transport.data.gouv.fr (GTFS) |
| `risks` | Risques naturels/technologiques | Géorisques (georisques.gouv.fr) |
| `real-estate` | Contexte immobilier et prix | DVF Cerema (apidf-preprod.cerema.fr) |
| `cadastre` | Parcelle, zone PLU, prescriptions | API Carto IGN (apicarto.ign.fr) |
| `air-quality` | Qualité de l'air | Atmo France (api.atmo-france.org) |
| `neighborhood` | Commerces et services proches | Overpass / OpenStreetMap |
| `score` | Calcul des sous-scores et du score global | - |
| `summary` | Construction du résumé textuel | - |

## Carte interactive

### Couches cartographiques

| Couche | Type | Source | Toggle |
|--------|------|--------|--------|
| Parcelle cadastrale | GeoJSON (polygone) | API Carto IGN | toujours visible |
| Prix immobiliers (DVF) | GeoJSON (polygones colorés par prix/m²) | DVF Cerema | oui |
| Retrait-gonflement argiles | WMS raster | BRGM (geoservices.brgm.fr) | oui |
| Zones inondables (PPR) | WMS raster | Géorisques (mapsref.brgm.fr) | oui |
| Zonage sismique | WMS raster | BRGM | oui |
| Potentiel radon | WMS raster | Géorisques | oui |

## Cache

Le backend utilise un cache en mémoire (`InMemoryCache`) avec des TTL adaptés à la fréquence de mise à jour de chaque source :

| Source | TTL cache | Fréquence de mise à jour |
|--------|-----------|--------------------------|
| Adresse (BAN) | 7 jours | quasi-statique |
| DVF (prix immobiliers) | 7 jours | semestriel |
| Cadastre / PLU | 7 jours | trimestriel |
| Géorisques (risques) | 24 heures | mensuel à trimestriel |
| Transport (GTFS) | 24 heures | hebdomadaire à mensuel |
| Voisinage (Overpass) | 24 heures | hebdomadaire à mensuel |
| Qualité de l'air (Atmo) | 6 heures | quotidien |

La clé de cache est basée sur les coordonnées arrondies (~10m de précision). Le cache est limité à 500 entrées par source.

## Score global

Pondération des sous-scores :
- mobilité : 25 %
- risques : 25 %
- contexte immobilier : 20 %
- environnement : 10 %
- voisinage : 20 %

## Endpoints backend

### Recherche d'adresse
`GET /api/address/search?q=...`

### Analyse d'adresse
`GET /api/location/analyze?lat=...&lon=...&label=...&city=...&postcode=...`

## Démarrage

```bash
# Installation
pnpm install

# Backend (port 4000)
cd backend
cp .env.example .env
pnpm dev

# Frontend (port 3000)
cd frontend
pnpm dev
```

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du backend | `4000` |
| `HOST` | Hôte du backend | `0.0.0.0` |
| `FRONTEND_ORIGIN` | URL du frontend (CORS) | `http://localhost:3000` |
| `ATMO_API_TOKEN` | Token API Atmo France (optionnel) | - |

## Structure du repository

```text
vibenu/
├── README.md
├── frontend/          # Next.js / React / MapLibre
│   └── src/
│       ├── components/
│       │   ├── map/           # Carte, couches WMS, toggles
│       │   ├── analysis/      # Cartes d'analyse (Mobilité, Risques, Cadastre, etc.)
│       │   └── score/         # Score global
│       ├── features/          # Hooks (useLocationAnalysis)
│       └── types/             # DTOs frontend
└── backend/           # Fastify / Node.js
    └── src/
        ├── app/               # Serveur, routes, controllers
        ├── modules/           # Modules métier (DDD)
        │   ├── address/
        │   ├── analysis/
        │   ├── mobility/
        │   ├── risks/
        │   ├── real-estate/
        │   ├── cadastre/
        │   ├── air-quality/
        │   ├── neighborhood/
        │   ├── score/
        │   └── summary/
        └── shared/            # Types, config, cache, utilitaires
```
