-- Index sur le point de la vente, tel que la recherche « ventes à moins de 1 km » l'écrit
-- (dvf-database.provider.ts) : `geometry` est le contour de la parcelle, son index ne sert
-- pas à ce filtre. Sans lui, chaque analyse lisait la table entière — 5 s une fois les cinq
-- millésimes 2021-2025 importés.
-- scripts/import_dvf.py le recrée à chaque import ; la table n'existe qu'après le premier.
DO $$
BEGIN
  IF to_regclass('public.dvf_transactions') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_dvf_point
      ON dvf_transactions USING GIST ((ST_MakePoint(longitude, latitude)::geography));
  END IF;
END $$;
