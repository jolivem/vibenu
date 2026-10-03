ensure token to push docker image from to dockerhiub is OK
ensure toekn to pull docker image form Hetzner is OK
if not generate a classic token with crite:read package right.

# take into account new env on vps
cd vibenu
docker compose up -d app


# Build and Push to GH package
cd clairimmo
./buildPush.sh

# Mode maintenance géré par cady
cd vibenu
touch maintenance/ON     # couper le site (restore de la base, grosse migration…)
rm maintenance/ON        # le rétablir

# Upgrade from GH
cd vibenu
./update.sh --maintenance


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
docker compose exec postgres psql -U claireadresse -d cadb -c "CREATE EXTENSION IF NOT EXISTS postgis;"
docker compose cp /tmp/claire_adresse.dump postgres:/tmp/
docker compose exec -T postgres pg_restore \
  -U claireadresse -d cadb \
  --no-owner --no-privileges \
  /tmp/clairimmo_$(date +%Y%m%d).dump
```