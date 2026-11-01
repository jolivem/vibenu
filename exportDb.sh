#!/usr/bin/env bash
#
# Exporte la base locale (PC de développement) pour la restaurer sur le VPS — DEPLOY.md, étape 2.
#
#   1. contrôle que la base locale a reçu les imports (DVF, BDNB, Géorisques…) ;
#   2. pg_dump au format custom, sans les lignes des caches des textes de l'IA (la production
#      garde les siens : importDb.sh les sauvegarde et les recharge) ;
#
# Usage : ./exportDb.sh            (dump dans ./claire_adresse.dump)
#
# Environnement : POSTGRES_URL (lu dans frontend/.env).
# Ensuite : copier le dump dans /tmp/ du VPS (scp), puis, sur le VPS : ./importDb.sh

set -euo pipefail

cd "$(dirname "$0")"

DUMP="claire_adresse.dump"

if [[ -z "${POSTGRES_URL:-}" && -f frontend/.env ]]; then
  POSTGRES_URL=$(grep -E '^POSTGRES_URL=' frontend/.env | head -1 | cut -d= -f2-)
fi
if [[ -z "${POSTGRES_URL:-}" ]]; then
  echo "POSTGRES_URL introuvable (ni dans l'environnement, ni dans frontend/.env)." >&2
  exit 1
fi

q() { psql "$POSTGRES_URL" -Atc "$1"; }

echo "==> contrôle de la base locale"
echo "    ventes DVF par année :"
q "SELECT '      ' || annee || ' : ' || n FROM (SELECT extract(year FROM date_mutation)::int AS annee, count(*) AS n FROM dvf_transactions GROUP BY 1) t ORDER BY annee"
# Une table vide ou absente passerait inaperçue dans le dump : on s'arrête avant.
check() {
  local table="$1" min="$2" n
  n=$(q "SELECT count(*) FROM $table" 2>/dev/null || echo "absente")
  printf '    %-28s %s\n' "$table" "$n"
  if [[ "$n" == "absente" || "$n" -lt "$min" ]]; then
    echo "    !! $table : moins de $min lignes — import manquant ? (voir SOURCES.md)" >&2
    exit 1
  fi
}
check dvf_transactions 1000000
check bdnb_parcelle 1000000
check argiles_exposition 100000
check catnat_arrete 100000
check climate_station_normales 1000
check crime_commune 1000

echo "==> pg_dump vers $DUMP (caches des textes de l'IA exclus)"
# --verbose : une ligne par table sur la sortie d'erreur, pour suivre l'avancement.
pg_dump --verbose -Fc --no-owner --no-acl --schema=public \
  --exclude-table-data=card_insights_cache \
  --exclude-table-data=commune_narrative_cache \
  --exclude-table-data=narrative_cache \
  -f "$DUMP" "$POSTGRES_URL"

# Relire la table des matières : un dump tronqué échoue ici plutôt que sur le VPS.
pg_restore --list "$DUMP" > /dev/null
echo "    $(du -h "$DUMP" | cut -f1), $(pg_restore --list "$DUMP" | grep -c 'TABLE DATA') tables avec données"

echo "==> fait. Copier $DUMP dans /tmp/ du VPS (scp), puis y lancer ./importDb.sh"
