# Backend BienVu

Backend Fastify + TypeScript responsable de l'orchestration métier, de l'intégration aux sources externes et du calcul des analyses BienVu.

## Scripts

- `pnpm dev` : démarrage local en watch
- `pnpm build` : compilation TypeScript
- `pnpm start` : exécution du build
- `pnpm typecheck` : vérification TypeScript sans émission
- `pnpm test` : lancer les tests (vitest)
- `pnpm test:watch` : tests en mode watch

## Références API externes

### Géoplateforme IGN — Géocodage

- **Endpoint** : `https://data.geopf.fr/geocodage`
- **Usage** : autocomplétion d'adresses, géocodage inverse
- **Auth** : aucune
- **Doc** : https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage

### transport.data.gouv.fr — Arrêts GTFS

- **Endpoint** : `GET https://transport.data.gouv.fr/api/gtfs-stops`
- **Statut** : expérimental (pas de garantie de stabilité)
- **Paramètres** : bounding box (`south`, `north`, `west`, `east`)
- **Auth** : aucune
- **Limite** : 20 000 points max par requête
- **Réponse** : GeoJSON FeatureCollection avec `stop_id`, `stop_name`, `dataset_title`, `location_type`, `dataset_id`, `resource_id`
- **Swagger** : https://transport.data.gouv.fr/swaggerui
- **OpenAPI spec** : https://transport.data.gouv.fr/api/openapi
- **Limitations connues** :
  - Pas de filtre par mode de transport (train, bus, métro, tram)
  - Pas de `route_type` dans la réponse (le champ GTFS standard qui distingue tram=0, metro=1, rail=2, bus=3)
  - Pas de `parent_station` (qui lie un quai à sa gare parente)
  - `location_type` suit le standard GTFS (0=arrêt/quai, 1=station, 2=entrée) mais ne distingue pas le mode
  - Le dataset SNCF Transilien contient à la fois des gares ferroviaires et des arrêts de bus de rabattement, tous avec le même `dataset_title`
  - Le dataset IDFM contient bus, métro, RER, tram sans distinction dans les champs retournés
- **Heuristique actuelle** : on infère le mode via `dataset_title` (SNCF → rail dataset) + `location_type` + patterns dans `stop_name`. Approche fragile, documentée dans `transport-data-gouv.provider.ts`
- **Piste d'amélioration** : télécharger les GTFS complets pour accéder aux `route_type`, ou utiliser l'API IDFM/PRIM qui expose les modes directement

### Géorisques — Risques naturels et technologiques

- **Endpoint** : `GET https://www.georisques.gouv.fr/api/v1/resultats_rapport_risque`
- **Paramètres** : `latlon=lon,lat`
- **Auth** : aucune
- **Rate limit** : 1 req/s
- **Doc** : https://www.georisques.gouv.fr/doc-api

### DVF (Cerema) — Transactions immobilières

- **Endpoint** : `GET https://apidf-preprod.cerema.fr/dvf_opendata/geomutations`
- **Paramètres** : code INSEE ou bounding box
- **Auth** : aucune
- **Doc** : https://apidf-preprod.cerema.fr/

### Atmo France — Qualité de l'air

- **Endpoint** : `GET https://api.atmo-france.org/api/v1/communes/{code_insee}/indices/atmo`
- **Auth** : **token requis** (`ATMO_API_TOKEN`)
- **Comportement sans token** : score neutre par défaut

### Overpass (OpenStreetMap) — Points d'intérêt

- **Endpoint** : `POST https://overpass-api.de/api/interpreter`
- **Usage** : requêtes Overpass QL pour trouver écoles, commerces, parcs, etc.
- **Auth** : aucune
- **Timeout** : 10s configuré côté app
- **Doc** : https://wiki.openstreetmap.org/wiki/Overpass_API
