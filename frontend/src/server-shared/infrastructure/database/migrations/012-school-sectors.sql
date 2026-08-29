-- Sectorisation scolaire publique.
-- POC : collèges Paris (source : opendata.paris.fr — secteurs-scolaires-colleges).
-- Schéma extensible aux lycées et autres territoires.
-- Importé par scripts/import_school_sectors_paris.py.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS school_sector (
  id                  SERIAL PRIMARY KEY,
  niveau              VARCHAR(20) NOT NULL,   -- 'college' (phase suivante: 'lycee')
  territoire          VARCHAR(20) NOT NULL,   -- 'paris' (extensible : 'lyon', 'marseille', etc.)
  code_uai            VARCHAR(8),             -- code UAI de l'établissement attribué (rentrée publique)
  nom_etablissement   TEXT NOT NULL,
  adresse             TEXT,
  geometry            GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
  UNIQUE (niveau, territoire, code_uai)
);

CREATE INDEX IF NOT EXISTS idx_school_sector_geom
  ON school_sector USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_school_sector_niveau_territoire
  ON school_sector (niveau, territoire);
