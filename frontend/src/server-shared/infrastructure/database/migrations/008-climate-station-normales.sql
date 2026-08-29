-- Normales climatiques 1991-2020 par station Météo-France.
-- Source : data.gouv.fr / meteofrance.com (licence Etalab 2.0).
-- Importé par scripts/import_climate_stations.py.
--
-- Pattern d'usage : à la requête (lat, lon), on retourne la station
-- la plus proche dans un rayon de 30 km. Si aucune station à < 30 km,
-- la section climat est masquée côté UI.

CREATE TABLE IF NOT EXISTS climate_station_normales (
  station_id        VARCHAR(8)   PRIMARY KEY,        -- NUM_POSTE Météo-France
  station_name      TEXT         NOT NULL,
  latitude          NUMERIC(8,5) NOT NULL,
  longitude         NUMERIC(8,5) NOT NULL,
  altitude_m        INTEGER,
  temperature_c     NUMERIC(4,1),                    -- moyenne annuelle
  precipitation_mm  INTEGER,                         -- cumul annuel
  sunshine_hours    INTEGER,                         -- cumul annuel (NULL si station non-héliographe)
  period_start      INTEGER      NOT NULL,
  period_end        INTEGER      NOT NULL,
  source            TEXT         NOT NULL,           -- "meteo-france-1991-2020"
  fetched_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  geom              GEOMETRY(POINT, 4326)
);

CREATE INDEX IF NOT EXISTS climate_stations_geom_gix
  ON climate_station_normales USING GIST (geom);
