# Memo opérationnel

Notes d'exploitation : env, build, déploiement, base de données.

---

## Dev local

```bash
cd frontend
pnpm dev              # mode PUBLIC (défaut)
pnpm dev:pro          # mode PRO (voisinage + mobilité uniquement)
pnpm dev:public       # mode PUBLIC explicite
```

Variable d'environnement lue au démarrage : `NEXT_PUBLIC_SITE_VARIANT`. Modification = relancer `pnpm dev` (pas de hot reload pour les `NEXT_PUBLIC_*`).

Voir [`frontend/src/lib/site-features.ts`](frontend/src/lib/site-features.ts) pour la liste des features par variante.

---

## Carte des fichiers `.env`

Chaque outil cherche ses vars dans **son propre répertoire courant**. D'où la dispersion :

| Fichier | Lu par | Rôle | Dans Git ? |
|---|---|---|---|
| `.env` (racine) | **Docker Compose** | Env prod : `DOMAIN`, `POSTGRES_*`, `SITE_URL`, `SITE_URL_PRO`, `ATMO_*`, `MISTRAL_*` | ✗ jamais |
| `.env.example` (racine) | template | Copier en `.env` puis remplir | ✓ |
| `.env.hetzner` (racine) | backup perso | Snapshot du `.env` du VPS — mémo en cas de réinstall | ✗ |
| `frontend/.env` | **Next.js dev local** | `POSTGRES_URL`, `MISTRAL_API_KEY`, `ATMO_*`, etc. pour `pnpm dev` | ✗ |
| `frontend/.env.local` | **Next.js dev local** (surcharge) | Overrides prioritaires sur `.env` (ex. `DISABLE_CACHE=1` ponctuel) | ✗ |
| `frontend/.env.example` | template | Template du `frontend/.env` | ✓ |
| `scripts/.env` | **scripts Python** (import_dvf, import_iris…) | `POSTGRES_URL` pour pointer la DB cible | ✗ |

**Pourquoi 3 emplacements ?**
- `docker compose` lit `.env` à côté de `docker-compose.yml` → racine
- `next dev` lit `.env*` dans le dossier de `package.json` → `frontend/`
- `python script.py` avec `python-dotenv` lit `.env` dans le dossier courant → `scripts/`

**Que tu édites régulièrement** :
- `frontend/.env.local` pour le dev quotidien
- `.env` du VPS Hetzner (en SSH) pour la prod
- `scripts/.env` quand tu changes de DB cible pour les imports

---

## Login GHCR

```bash
docker login ghcr.io -u jolivem    # PAT avec write:packages
```

---

## Build & push des images

Architecture : 2 images, 2 containers sur le même VPS, dispatch Caddy par sous-domaine.

```
claireadresse.fr      → container `app`     (image vibenu:latest,    SITE_VARIANT=PUBLIC)
pro.claireadresse.fr  → container `app_pro` (image vibenu:pro-latest, SITE_VARIANT=PRO)
```

### Variante PUBLIC

```bash
docker build --build-arg SITE_URL=https://claireadresse.fr --build-arg SITE_VARIANT=PUBLIC \
  -f frontend/Dockerfile -t ghcr.io/jolivem/vibenu:latest .
docker push ghcr.io/jolivem/vibenu:latest
```

### Variante PRO

```bash
docker build --build-arg SITE_URL=https://pro.claireadresse.fr --build-arg SITE_VARIANT=PRO \
  -f frontend/Dockerfile -t ghcr.io/jolivem/vibenu:pro-latest .
docker push ghcr.io/jolivem/vibenu:pro-latest
```

### Tester localement les 2 variantes (sans Docker)

```bash
cd frontend
pnpm run build:public    # build PUBLIC seul
pnpm run build:pro       # build PRO seul
pnpm run build:all       # les 2 enchaînés (utile en CI pour détecter les régressions cross-variante)
```

---

## Déploiement Hetzner

### Prérequis (une fois)

1. **DNS** : enregistrement A `pro.claireadresse.fr` → IP du VPS.
2. **`.env`** du VPS (à côté de `docker-compose.yml`) doit contenir au moins :
   ```env
   DOMAIN=claireadresse.fr
   SITE_URL=https://claireadresse.fr
   SITE_URL_PRO=https://pro.claireadresse.fr
   POSTGRES_USER=...
   POSTGRES_PASSWORD=...
   POSTGRES_DB=cadb
   ATMO_USERNAME=...
   ATMO_PASSWORD=...
   MISTRAL_API_KEY=...
   ```

Caddy demande automatiquement le cert Let's Encrypt au premier accès HTTPS.

### Update classique

```bash
ssh michel@178.104.51.131
cd vibenu
./update.sh             # git pull + pull images + migrations + restart app/app_pro
```

### Update manuel

```bash
ssh michel@178.104.51.131
cd vibenu
docker compose pull app app_pro
docker compose up -d

# Vérification
curl -I https://claireadresse.fr        # variante PUBLIC
curl -I https://pro.claireadresse.fr    # variante PRO
```

### Tout redémarrer à blanc

```bash
ssh michel@178.104.51.131
cd vibenu
docker compose down
docker compose up -d postgres      # juste postgres
docker compose up -d               # tout d'un coup
```

---

## Backup / restore DB

### Dump depuis le local

```bash
cd ~/github/clairimmo
source frontend/.env
pg_dump -Fc --no-owner --no-acl --schema=public \
  -f clairimmo_$(date +%Y%m%d).dump "$POSTGRES_URL"

# ou en pointant explicitement
pg_dump --host=localhost --port=5432 --username=bienvu \
  --format=custom --no-owner --no-privileges \
  --file=claire_adresse.dump claire_immo

scp claire_adresse.dump michel@178.104.51.131:/tmp/
```

### Restore sur le VPS (clean slate — recommandé)

```bash
ssh michel@178.104.51.131
cd vibenu
docker compose exec postgres dropdb -U claireadresse --if-exists --force cadb
docker compose exec postgres createdb -U claireadresse -O claireadresse cadb
docker compose cp /tmp/claire_adresse.dump postgres:/tmp/
docker compose exec -T postgres pg_restore \
  -U claireadresse -d cadb \
  --no-owner --no-privileges \
  /tmp/claire_adresse.dump
```

### Restore en place (avec `--clean`)

Si tu gardes la DB existante et veux juste écraser :

```bash
docker compose exec postgres psql -U claireadresse -d cadb -c "
  DROP EXTENSION IF EXISTS postgis_topology CASCADE;
  DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE;
"
docker compose exec -T postgres pg_restore \
  -U claireadresse -d cadb \
  --no-owner --no-privileges \
  --clean --if-exists \
  < /tmp/claire_adresse.dump
```

(Le drop des extensions topology/tiger évite l'erreur `cannot drop extension postgis because other objects depend on it`.)

---

## Contrôle Postgres

```bash
# Top 10 tables par nombre de lignes
docker compose exec postgres psql -U claireadresse -d cadb -c "
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC
LIMIT 10;"

# Appliquer une migration à la main
psql $POSTGRES_URL -f frontend/src/server-shared/infrastructure/database/migrations/0XX-...sql
```

---

## Contrôle SEO post-déploiement

Après chaque deploy, vérifier :

- `https://claireadresse.fr/robots.txt` — règles présentes
- `https://claireadresse.fr/sitemap.xml` — home + pages SEO listées
- `https://claireadresse.fr/opengraph-image` — renvoie un PNG
- [Google Rich Results Test](https://search.google.com/test/rich-results) — JSON-LD valide
- [Opengraph.xyz](https://www.opengraph.xyz/) — prévisualiser le partage social
- Soumettre `sitemap.xml` dans **Google Search Console** + Bing Webmaster Tools

Idem pour `pro.claireadresse.fr` (mais pas de pages SEO `/commune/*` en PRO).

---

## Tests unitaires

```bash
pnpm --filter claireadresse-backend test
```

---

## Sources de données

### Climat (normales 1991-2020)

- Données quotidiennes Météo-France : https://www.data.gouv.fr/datasets/donnees-climatologiques-de-base-decadaires (1950-2024)
- Import : `python scripts/import_climate_stations.py` → table `climate_station_normales`

### Qualité de l'air (indice ATMO annuel — pages SEO commune)

- Paris : https://data.gouv.fr/datasets/qualite-de-lair-indice-atmo-a-partir-de-2021
- Lyon / Marseille : équivalents Atmo AuRA / AtmoSud à compléter
- Import : `python scripts/import_atmo_paris.py` → table `air_quality_atmo`

### Contour de communes

- Source live : `geo.api.gouv.fr` (API officielle Etalab)
- Cache SQL 100 jours : table `commune_contour_cache`
- Alternative bundle complet : https://adresse.data.gouv.fr/data/ban/adresses/latest/addok/addok-france-bundle.zip

---

## Vocabulaire — 3 modes de rendu

| Notre nom | Code | Localisation |
|---|---|---|
| **adresse** | `AnalysisMode = "address"` | [location-analysis.dto.ts:253](frontend/src/server-shared/types/location-analysis.dto.ts#L253) |
| **commune SEO** | pas de type — routage Next.js | [/app/commune/[slug]/page.tsx](frontend/src/app/commune/[slug]/page.tsx), [commune-slugs.ts](frontend/src/lib/commune-slugs.ts) |
| **commune utilisateur** | `AnalysisMode = "commune"` | [location-analysis.use-case.ts:44](frontend/src/server-modules/analysis/application/location-analysis.use-case.ts#L44) |
