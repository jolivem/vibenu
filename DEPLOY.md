ensure token to push docker image from to dockerhiub is OK
ensure toekn to pull docker image form Hetzner is OK
if not generate a classic token with crite:read package right.


## 1. Build and Push to GH package
```bash
cd clairimmo
./buildPush.sh
```
## 2. Dump depuis le local

Avant le dump, la base locale doit avoir reçu tous les imports du moment (voir SOURCES.md).
Contrôle rapide, DVF sur toutes les années publiées :
`psql "$POSTGRES_URL" -c "select extract(year from date_mutation), count(*) from dvf_transactions group by 1 order by 1"`

Les caches des textes de l'IA sont exclus du dump (structure gardée, lignes non) : ceux de la
production sont sauvegardés et rechargés à l'étape 4, ce qui évite de redemander à Mistral les
textes des pages `/commune/*`.

```bash
cd ~/github/clairimmo
source frontend/.env
pg_dump -Fc --no-owner --no-acl --schema=public \
  --exclude-table-data=card_insights_cache \
  --exclude-table-data=commune_narrative_cache \
  --exclude-table-data=narrative_cache \
  -f claire_adresse.dump "$POSTGRES_URL"

# ou en pointant explicitement
pg_dump --host=localhost --port=5432 --username=bienvu \
  --format=custom --no-owner --no-privileges \
  --exclude-table-data=card_insights_cache \
  --exclude-table-data=commune_narrative_cache \
  --exclude-table-data=narrative_cache \
  --file=claire_adresse.dump claire_immo

scp claire_adresse.dump michel@178.104.51.131:/tmp/
```


## 3. Mode maintenance géré par cady
```bash
ssh michel@178.104.51.131
cd vibenu
touch maintenance/ON     # couper le site (restore de la base, grosse migration…)
```


## 4. Restore DB sur le VPS

```bash
cd vibenu
# Sauvegarder les caches des textes de l'IA de la production (rechargés plus bas)
docker compose exec -T postgres pg_dump -U claireadresse -d cadb -Fc --data-only \
  -t card_insights_cache -t commune_narrative_cache > /tmp/caches.dump

docker compose exec postgres dropdb -U claireadresse --if-exists --force cadb
docker compose exec postgres createdb -U claireadresse -O claireadresse cadb
docker compose exec postgres psql -U claireadresse -d cadb -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker compose cp /tmp/claire_adresse.dump postgres:/tmp/
docker compose exec -T postgres pg_restore \
  -U claireadresse -d cadb \
  --no-owner --no-privileges \
  /tmp/claire_adresse.dump

# Recharger les caches de la production
docker compose cp /tmp/caches.dump postgres:/tmp/
docker compose exec -T postgres pg_restore -U claireadresse -d cadb --data-only /tmp/caches.dump
```

Avec un restore, les scripts d'import n'ont pas à tourner sur le VPS : les données arrivent
déjà importées.

## 5. Mettre à jour l'app : nouvelle image, migrations, redémarrage
```bash
./update.sh                 # (update classique)
./update.sh --full          # (pull + restart de tout)
./update.sh --maintenance   # (site en maintenance pendant l'update, cumulable)
```

## 6. Rouvrir le site
```bash
rm maintenance/ON
```