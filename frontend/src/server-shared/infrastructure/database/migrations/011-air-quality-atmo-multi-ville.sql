-- Généralisation de la table indice ATMO aux villes Paris / Lyon / Marseille.
-- Avant : air_quality_atmo_paris (PK annee) — Paris uniquement
-- Après : air_quality_atmo       (PK (ville, annee)) — multi-villes
--
-- La migration est idempotente : elle gère à la fois un fresh DB (où l'ancienne
-- table n'existe pas) et un DB déjà peuplé (qu'on migre en place).

-- 1. Renommer l'ancienne table si elle existe encore sous son nom d'avant.
ALTER TABLE IF EXISTS air_quality_atmo_paris RENAME TO air_quality_atmo;

-- 2. Cas fresh DB : créer la table avec son nouveau schéma.
CREATE TABLE IF NOT EXISTS air_quality_atmo (
  ville                       VARCHAR(20) NOT NULL,
  annee                       INTEGER     NOT NULL,
  jours_bonne                 INTEGER     NOT NULL DEFAULT 0,
  jours_moyenne               INTEGER     NOT NULL DEFAULT 0,
  jours_degradee              INTEGER     NOT NULL DEFAULT 0,
  jours_mauvaise              INTEGER     NOT NULL DEFAULT 0,
  jours_tres_mauvaise         INTEGER     NOT NULL DEFAULT 0,
  jours_extremement_mauvaise  INTEGER     NOT NULL DEFAULT 0,
  source                      TEXT,
  PRIMARY KEY (ville, annee)
);

-- 3. Cas DB existant : ajouter la colonne ville (lignes existantes = Paris) si manquante.
ALTER TABLE air_quality_atmo
  ADD COLUMN IF NOT EXISTS ville VARCHAR(20) NOT NULL DEFAULT 'paris';

-- 4. Cas DB existant : si la PK est encore sur (annee) seul, la basculer sur (ville, annee).
--    Note : après un RENAME TABLE, Postgres ne renomme pas la PK constraint, donc on
--    récupère son nom réel via pg_constraint plutôt que de le supposer.
DO $$
DECLARE
  current_pk TEXT;
  pk_name    TEXT;
BEGIN
  SELECT c.conname,
         string_agg(a.attname, ',' ORDER BY array_position(c.conkey, a.attnum))
    INTO pk_name, current_pk
    FROM pg_constraint c
    JOIN pg_attribute  a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'air_quality_atmo'::regclass
      AND c.contype  = 'p'
    GROUP BY c.conname;

  IF current_pk = 'annee' THEN
    EXECUTE format('ALTER TABLE air_quality_atmo DROP CONSTRAINT %I', pk_name);
    ALTER TABLE air_quality_atmo ADD PRIMARY KEY (ville, annee);
  END IF;
END $$;
