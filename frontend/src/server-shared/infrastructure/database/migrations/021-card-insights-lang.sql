-- Langue des mini-synthèses « En bref » : la même adresse a désormais une phrase par
-- langue. La langue entre dans la clé du cache, à côté du mode, du modèle et de la
-- version du prompt.
--
-- Les lignes existantes sont françaises : elles prennent 'fr' par défaut et restent servies.
--
-- Rejouable : la colonne n'est ajoutée qu'une fois, et la clé primaire n'est reconstruite
-- que si elle ne contient pas encore `lang`.

ALTER TABLE card_insights_cache ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'fr';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
     WHERE i.indrelid = 'card_insights_cache'::regclass
       AND i.indisprimary
       AND a.attname = 'lang'
  ) THEN
    ALTER TABLE card_insights_cache DROP CONSTRAINT IF EXISTS card_insights_cache_pkey;
    ALTER TABLE card_insights_cache ADD PRIMARY KEY (geo_key, mode, model, version, lang);
  END IF;
END $$;
