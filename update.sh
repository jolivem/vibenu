#!/usr/bin/env bash
#
# Met à jour l'application sur le VPS :
#   1. git pull (pour récupérer les évolutions de docker-compose.yml / Caddyfile)
#   2. pull de l'image `app` depuis GHCR et redémarrage
#   3. reload de caddy si sa config a changé
#
# Usage : ./update.sh            (update classique)
#         ./update.sh --full     (pull + restart de tout)

set -euo pipefail

cd "$(dirname "$0")"

FULL=0
[[ "${1:-}" == "--full" ]] && FULL=1

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
