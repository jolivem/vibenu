#!/usr/bin/env bash
#
# Met à jour l'application sur le VPS :
#   1. git pull (pour récupérer les évolutions de docker-compose.yml / Caddyfile / migrations SQL)
#   2. pull de l'image `app` depuis GHCR
#   3. application des migrations SQL (idempotentes, CREATE TABLE IF NOT EXISTS)
#   4. redémarrage de l'app
#   5. reload de caddy si sa config a changé
#
# Usage : ./update.sh            (update classique)
#         ./update.sh --full     (pull + restart de tout)

set -euo pipefail

cd "$(dirname "$0")"

FULL=0
[[ "${1:-}" == "--full" ]] && FULL=1

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

echo "==> restart app"
docker compose up -d --no-deps app

if caddy_changed; then
  echo "==> reload caddy"
  docker compose up -d --no-deps caddy
fi

echo "==> nettoyage des anciennes images"
docker image prune -f

echo "==> état des services"
docker compose ps
