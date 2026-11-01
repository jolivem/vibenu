#!/usr/bin/env bash
#
# Restaure sur le VPS la base exportée du PC de développement — DEPLOY.md, étape 3.
#
#   1. vérifie le dump avant de toucher à quoi que ce soit ;
#   2. met le site en maintenance ;
#   3. sauvegarde la base de production entière (sauf --no-backup) et, à part, les caches des
#      textes de l'IA ;
#   4. recrée la base, restaure le dump, recharge les caches de la production ;
#   5. affiche quelques comptages de contrôle.
#
# Le site reste en maintenance à la fin : lancer ./update.sh (migrations, nouvelle image), puis
# rm maintenance/ON. En cas d'échec après la suppression de la base, la sauvegarde de l'étape 3
# se recharge avec la même commande pg_restore (voir le message d'erreur).
#
# Usage : ./importDb.sh                         (dump attendu dans /tmp/claire_adresse.dump)
#         ./importDb.sh /chemin/vers/le.dump
#         ./importDb.sh --no-backup             (sans sauvegarde complète : disque juste)

set -euo pipefail

cd "$(dirname "$0")"

DUMP="/tmp/claire_adresse.dump"
BACKUP=1
for arg in "$@"; do
  case "$arg" in
    --no-backup) BACKUP=0 ;;
    -*) echo "Option inconnue : $arg" >&2; exit 1 ;;
    *) DUMP="$arg" ;;
  esac
done

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
DB_USER="${POSTGRES_USER:-claireadresse}"
DB_NAME="${POSTGRES_DB:-cadb}"
STAMP=$(date +%Y%m%d-%H%M)
BACKUP_FILE="/tmp/${DB_NAME}-avant-import-${STAMP}.dump"
CACHES_FILE="/tmp/caches-${STAMP}.dump"

pg() { docker compose exec -T postgres "$@"; }
sql() { pg psql -U "$DB_USER" -d "$DB_NAME" -Atc "$1"; }

echo "==> contrôle du dump $DUMP"
[[ -f "$DUMP" ]] || { echo "Dump introuvable : $DUMP" >&2; exit 1; }
docker compose cp "$DUMP" postgres:/tmp/import.dump
if ! pg pg_restore --list /tmp/import.dump > /dev/null; then
  echo "Dump illisible : rien n'a été modifié." >&2
  exit 1
fi
echo "    $(du -h "$DUMP" | cut -f1), base cible : $DB_NAME (utilisateur $DB_USER)"

echo "==> site en maintenance"
mkdir -p maintenance && touch maintenance/ON

if [[ "$BACKUP" -eq 1 ]]; then
  echo "==> sauvegarde complète de la production : $BACKUP_FILE"
  pg pg_dump --verbose -U "$DB_USER" -d "$DB_NAME" -Fc > "$BACKUP_FILE"
  echo "    $(du -h "$BACKUP_FILE" | cut -f1)"
fi

echo "==> sauvegarde des caches des textes de l'IA : $CACHES_FILE"
pg pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --data-only \
  -t card_insights_cache -t commune_narrative_cache > "$CACHES_FILE"

# À partir d'ici, la base de production est supprimée : dire comment revenir en arrière.
on_error() {
  echo "!! échec pendant la restauration — le site reste en maintenance." >&2
  if [[ "$BACKUP" -eq 1 ]]; then
    echo "!! revenir à l'état d'avant :" >&2
    echo "   docker compose exec postgres dropdb -U $DB_USER --if-exists --force $DB_NAME" >&2
    echo "   docker compose exec postgres createdb -U $DB_USER -O $DB_USER $DB_NAME" >&2
    echo "   docker compose cp $BACKUP_FILE postgres:/tmp/backup.dump" >&2
    echo "   docker compose exec -T postgres pg_restore -U $DB_USER -d $DB_NAME --no-owner --no-privileges /tmp/backup.dump" >&2
  fi
}
trap on_error ERR

echo "==> recréation de la base $DB_NAME"
pg dropdb -U "$DB_USER" --if-exists --force "$DB_NAME"
pg createdb -U "$DB_USER" -O "$DB_USER" "$DB_NAME"
sql "CREATE EXTENSION IF NOT EXISTS postgis;" > /dev/null

echo "==> restauration du dump (plusieurs minutes)"
# pg_restore rend un code non nul pour de simples avertissements (objet déjà présent…) :
# on garde ses messages et on juge sur les comptages ci-dessous. --verbose affiche
# l'avancement (une ligne par table et par index), recopié dans le journal.
set +e
pg pg_restore --verbose -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges /tmp/import.dump 2>&1 \
  | tee "/tmp/pg_restore-${STAMP}.log"
RESTORE_CODE=${PIPESTATUS[0]}
set -e
if [[ "$RESTORE_CODE" -ne 0 ]]; then
  echo "    pg_restore a signalé $(grep -ci 'error' "/tmp/pg_restore-${STAMP}.log" || true) erreur(s) : /tmp/pg_restore-${STAMP}.log"
fi

echo "==> rechargement des caches de la production"
docker compose cp "$CACHES_FILE" postgres:/tmp/caches.dump
pg pg_restore -U "$DB_USER" -d "$DB_NAME" --data-only /tmp/caches.dump

pg rm -f /tmp/import.dump /tmp/caches.dump
trap - ERR

echo "==> contrôle"
echo "    ventes DVF par année :"
sql "SELECT '      ' || annee || ' : ' || n FROM (SELECT extract(year FROM date_mutation)::int AS annee, count(*) AS n FROM dvf_transactions GROUP BY 1) t ORDER BY annee"
for table in bdnb_parcelle argiles_exposition catnat_arrete card_insights_cache commune_narrative_cache; do
  printf '    %-28s %s\n' "$table" "$(sql "SELECT count(*) FROM $table" 2>/dev/null || echo 'absente')"
done

echo "==> fait. Le site est toujours en maintenance :"
echo "    ./update.sh          (migrations, nouvelle image, redémarrage)"
echo "    rm maintenance/ON    (rouvrir le site)"
[[ "$BACKUP" -eq 1 ]] && echo "    Sauvegarde d'avant import : $BACKUP_FILE (à supprimer une fois le site vérifié)"
exit 0
