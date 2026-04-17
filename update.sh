#!/usr/bin/env bash
#
# Met à jour l'application sur le VPS :
#   1. git pull
#   2. rebuild de l'image `app` si le code front a changé
#   3. redémarre uniquement les containers nécessaires
#
# Usage : ./update.sh            (update classique)
#         ./update.sh --full     (rebuild forcé + restart de tout)

set -euo pipefail

cd "$(dirname "$0")"

FULL=0
[[ "${1:-}" == "--full" ]] && FULL=1

echo "==> git pull"
BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)

if [[ "$FULL" -eq 0 && "$BEFORE" == "$AFTER" ]]; then
  echo "==> Rien à mettre à jour."
  exit 0
fi

CHANGED_FILES=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null || echo "")

app_changed() {
  [[ "$FULL" -eq 1 ]] && return 0
  grep -qE '^(frontend/|package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|\.dockerignore)' <<<"$CHANGED_FILES"
}

caddy_changed() {
  [[ "$FULL" -eq 1 ]] && return 0
  grep -qE '^(Caddyfile|docker-compose\.yml)' <<<"$CHANGED_FILES"
}

if app_changed; then
  echo "==> rebuild + restart app"
  docker compose build app
  docker compose up -d --no-deps app
else
  echo "==> Pas de changement front, app non rebuildée."
fi

if caddy_changed; then
  echo "==> reload caddy"
  docker compose up -d --no-deps caddy
fi

echo "==> état des services"
docker compose ps
