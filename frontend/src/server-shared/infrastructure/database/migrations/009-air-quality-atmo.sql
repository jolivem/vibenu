-- Refactor qualité de l'air pour les pages SEO commune.
-- L'ancienne table air_quality_annual (concentrations annuelles par polluant et par
-- arrondissement) est remplacée par air_quality_atmo_paris : nombre de jours par
-- catégorie de l'indice ATMO, agrégé pour Paris.
-- Source : opendata.paris.fr — dataset "qualite-de-l-air-indice-atmo".
-- Importé par scripts/import_atmo_paris.py.

DROP TABLE IF EXISTS air_quality_annual;

CREATE TABLE IF NOT EXISTS air_quality_atmo_paris (
  annee                          INTEGER PRIMARY KEY,
  jours_bonne                    INTEGER NOT NULL DEFAULT 0,
  jours_moyenne                  INTEGER NOT NULL DEFAULT 0,
  jours_degradee                 INTEGER NOT NULL DEFAULT 0,
  jours_mauvaise                 INTEGER NOT NULL DEFAULT 0,
  jours_tres_mauvaise            INTEGER NOT NULL DEFAULT 0,
  jours_extremement_mauvaise     INTEGER NOT NULL DEFAULT 0,
  source                         TEXT
);
