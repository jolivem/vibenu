#!/usr/bin/env bash
#
# Met à jour l'application sur le VPS :
#   1. git pull (pour récupérer les évolutions de docker-compose.yml / Caddyfile / migrations SQL)
#   2. pull de l'image `app` depuis GHCR
#   3. application des migrations SQL (idempotentes, CREATE TABLE IF NOT EXISTS)
#   4. redémarrage de l'app
#   5. reload de caddy si sa config a changé
#
# Usage : ./update.sh                  (update classique)
#         ./update.sh --full           (pull + restart de tout)
#         ./update.sh --maintenance    (site en maintenance pendant l'update, cumulable)
#
# Maintenance à la main : `touch maintenance/ON` pour couper le site, `rm maintenance/ON`
# pour le rétablir — Caddy le teste à chaque requête, sans reload.

set -euo pipefail

cd "$(dirname "$0")"

FULL=0
MAINTENANCE=0
for arg in "$@"; do
  case "$arg" in
    --full) FULL=1 ;;
    --maintenance) MAINTENANCE=1 ;;
    *) echo "Option inconnue : $arg" >&2; exit 1 ;;
  esac
done

if [[ "$MAINTENANCE" -eq 1 ]]; then
  echo "==> site en maintenance"
  mkdir -p maintenance && touch maintenance/ON
  # Rétabli à la sortie, y compris si une étape échoue : un update raté ne doit pas
  # laisser le site coupé. En cas d'échec, remettre `touch maintenance/ON` à la main
  # si l'app est dans un état douteux.
  trap 'rm -f maintenance/ON; echo "==> maintenance levée"' EXIT
fi

# Charge les variables d'environnement du docker-compose (POSTGRES_USER, POSTGRES_DB, ...)
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "==> git pull"
BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)

CHANGED_FILES=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null || echo "")

caddy_changed() {
  [[ "$FULL" -eq 1 ]] && return 0
  grep -qE '^(Caddyfile|docker-compose\.yml)' <<<"$CHANGED_FILES"
}

echo "==> pull image app depuis GHCR"
docker compose pull app
echo "==> pull image umami"
docker compose pull umami

MIGRATIONS_DIR="frontend/src/server-shared/infrastructure/database/migrations"
if compgen -G "$MIGRATIONS_DIR/*.sql" > /dev/null; then
  echo "==> application des migrations SQL"
  for migration in "$MIGRATIONS_DIR"/*.sql; do
    echo "    - $(basename "$migration")"
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -q \
      -U "${POSTGRES_USER:-claireadresse}" \
      -d "${POSTGRES_DB:-claire_adresse}" \
      < "$migration"
  done
fi

# S'assure que la base Umami existe (idempotent : ne fait rien si déjà présente).
UMAMI_DB="${UMAMI_DB:-umami}"
echo "==> s'assurer que la base $UMAMI_DB existe"
if ! docker compose exec -T postgres psql -U "${POSTGRES_USER:-claireadresse}" -d "${POSTGRES_DB:-claire_adresse}" \
      -tAc "SELECT 1 FROM pg_database WHERE datname='$UMAMI_DB'" | grep -q 1; then
  echo "    création de la base $UMAMI_DB"
  docker compose exec -T postgres psql -U "${POSTGRES_USER:-claireadresse}" -d "${POSTGRES_DB:-claire_adresse}" \
    -c "CREATE DATABASE $UMAMI_DB"
fi

echo "==> restart app + umami"
# --remove-orphans arrête les conteneurs des services retirés du compose (app_pro).
docker compose up -d --no-deps --remove-orphans app umami

if caddy_changed; then
  echo "==> reload caddy"
  docker compose up -d --no-deps caddy
fi

echo "==> nettoyage des anciennes images"
docker image prune -f

echo "==> état des services"
docker compose ps
