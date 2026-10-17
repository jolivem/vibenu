-- Indicateurs annuels par station de mesure de la qualité de l'air :
--   - NO₂, PM2,5, PM10 : concentration moyenne annuelle, en µg/m³ (unit = 'ugm3') ;
--   - O₃ : jours où le max journalier de la moyenne sur 8 h dépasse 120 µg/m³, moyenne sur
--     3 ans (unit = 'days') — l'indicateur de la valeur cible européenne (25 jours).
-- Source : Agence européenne de l'environnement (EEA), service « AQ_Statistics_WM »,
-- statistiques validées calculées à partir des séries transmises par la France (Geod'air).
-- Importé par scripts/import_air_quality_eea.py.
--
-- Pattern d'usage : à la requête (lat, lon), on retient par polluant la station de fond
-- la plus proche dans un rayon de 20 km, et on la compare à la moyenne des stations de
-- fond françaises de la même année.

CREATE TABLE IF NOT EXISTS air_quality_station_annual (
  station_code  VARCHAR(16)  NOT NULL,           -- code EoI, ex. FR04014
  station_name  TEXT         NOT NULL,
  pollutant     VARCHAR(8)   NOT NULL,           -- 'no2' | 'pm25' | 'pm10' | 'o3'
  annee         INTEGER      NOT NULL,
  value         NUMERIC(6,1) NOT NULL,
  unit          VARCHAR(8)   NOT NULL,           -- 'ugm3' | 'days'
  area          VARCHAR(16)  NOT NULL,           -- 'urban' | 'suburban' | 'rural'
  station_type  VARCHAR(16)  NOT NULL,           -- 'background' | 'traffic' | 'industrial'
  source        TEXT         NOT NULL,
  fetched_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  geom          GEOMETRY(POINT, 4326) NOT NULL,
  PRIMARY KEY (station_code, pollutant, annee)
);

CREATE INDEX IF NOT EXISTS air_quality_station_annual_geom_gix
  ON air_quality_station_annual USING GIST (geom);
