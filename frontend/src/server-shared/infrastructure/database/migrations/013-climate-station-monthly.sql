-- Normales climatiques MENSUELLES 1991-2020 par station Météo-France.
-- Source : mêmes fichiers décadaires que climate_station_normales (Etalab 2.0),
-- second passage d'agrégation dans scripts/import_climate_stations.py.
--
-- Pattern d'usage : la sélection spatiale reste faite sur climate_station_normales
-- (qui porte la géométrie). Cette table n'est lue que par station_id, pour les
-- stations locales déjà retenues et pour les 3 villes de référence.
--
-- Le nombre d'années couvertes est stocké par (station, mois) : une station peut
-- couvrir 24 janviers et 23 février sur la période. C'est le diviseur des cumuls.

CREATE TABLE IF NOT EXISTS climate_station_monthly_normales (
  station_id        VARCHAR(8)   NOT NULL,
  month             SMALLINT     NOT NULL CHECK (month BETWEEN 1 AND 12),
  temperature_c     NUMERIC(4,1),                    -- moyenne du mois
  precipitation_mm  NUMERIC(5,1),                    -- cumul moyen du mois
  sunshine_hours    NUMERIC(5,1),                    -- cumul moyen du mois (NULL hors héliographe)
  nb_years          SMALLINT     NOT NULL,           -- années couvertes pour CE mois
  PRIMARY KEY (station_id, month)
);
