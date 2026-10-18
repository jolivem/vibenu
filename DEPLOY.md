ensure token to push docker image from to dockerhiub is OK
ensure toekn to pull docker image form Hetzner is OK
if not generate a classic token with crite:read package right.


## 1. Build and Push to GH package
```bash
cd clairimmo
./buildPush.sh
```
## 2. Dump depuis le local

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


## 3. Mode maintenance géré par cady
```bash
ssh michel@178.104.51.131
cd vibenu
touch maintenance/ON     # couper le site (restore de la base, grosse migration…)
```


## 4. Restore DB sur le VPS

```bash
cd vibenu
docker compose exec postgres dropdb -U claireadresse --if-exists --force cadb
docker compose exec postgres createdb -U claireadresse -O claireadresse cadb
docker compose exec postgres psql -U claireadresse -d cadb -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker compose cp /tmp/claire_adresse.dump postgres:/tmp/
docker compose exec -T postgres pg_restore \
  -U claireadresse -d cadb \
  --no-owner --no-privileges \
  /tmp/claire_adresse.dump
```

## 5. Mettre à jour l'app : nouvelle image, migrations, redémarrage
```bash
./update.sh
```

## 6. Rouvrir le site
```bash
rm maintenance/ON
```