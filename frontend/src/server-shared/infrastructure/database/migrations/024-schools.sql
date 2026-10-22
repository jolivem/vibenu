-- Collèges et lycées : annuaire et données publiées par établissement.
--
-- Sources : data.education.gouv.fr (ministère de l'Éducation nationale / DEPP), Licence
-- Ouverte 2.0, importées par scripts/import_schools.py — la liste des jeux est dans ce script.
--
-- Deux tables, à dessein :
--   - `school_establishment`, typée et indexée spatialement : de quoi trouver les collèges et
--     lycées autour d'un point ou dans une commune ;
--   - `school_data`, chaque ligne de chaque jeu telle que publiée (JSONB), rattachée à l'UAI
--     et à l'année. L'affichage n'étant pas arrêté, rien n'est jeté ni réinterprété à
--     l'import ; des vues typées viendront avec l'écran.
--
-- Précautions du producteur : la valeur ajoutée (IVAC, IVAL) est l'écart entre la réussite
-- observée et celle qu'attendait le profil des élèves ; elle n'est pas calculée sous un seuil
-- d'effectif (champ absent ou nul, jamais 0) et la DEPP déconseille d'en tirer un palmarès.

CREATE TABLE IF NOT EXISTS school_establishment (
  uai                     VARCHAR(8)  PRIMARY KEY,
  nom                     TEXT        NOT NULL,
  type                    VARCHAR(8)  NOT NULL,   -- 'college' | 'lycee'
  nature                  TEXT,                   -- « LYCEE D ENSEIGNEMENT GENERAL »…
  secteur                 VARCHAR(8)  NOT NULL,   -- 'public' | 'prive'
  -- Privé : « CONTRAT D'ASSOCIATION TOUTES CLASSES »… ; NULL pour le public.
  contrat_prive           TEXT,
  education_prioritaire   VARCHAR(8),             -- 'REP' | 'REP+' | NULL
  voie_generale           BOOLEAN     NOT NULL DEFAULT FALSE,
  voie_technologique      BOOLEAN     NOT NULL DEFAULT FALSE,
  voie_professionnelle    BOOLEAN     NOT NULL DEFAULT FALSE,
  restauration            BOOLEAN     NOT NULL DEFAULT FALSE,
  hebergement             BOOLEAN     NOT NULL DEFAULT FALSE,
  ulis                    BOOLEAN     NOT NULL DEFAULT FALSE,
  segpa                   BOOLEAN     NOT NULL DEFAULT FALSE,
  post_bac                BOOLEAN     NOT NULL DEFAULT FALSE,
  apprentissage           BOOLEAN     NOT NULL DEFAULT FALSE,
  lycee_agricole          BOOLEAN     NOT NULL DEFAULT FALSE,
  lycee_militaire         BOOLEAN     NOT NULL DEFAULT FALSE,
  lycee_des_metiers       BOOLEAN     NOT NULL DEFAULT FALSE,
  section_europeenne      BOOLEAN     NOT NULL DEFAULT FALSE,
  section_internationale  BOOLEAN     NOT NULL DEFAULT FALSE,
  section_sport           BOOLEAN     NOT NULL DEFAULT FALSE,
  section_arts            BOOLEAN     NOT NULL DEFAULT FALSE,
  section_cinema          BOOLEAN     NOT NULL DEFAULT FALSE,
  section_theatre         BOOLEAN     NOT NULL DEFAULT FALSE,
  adresse                 TEXT,
  code_postal             VARCHAR(5),
  code_commune            VARCHAR(5)  NOT NULL,
  nom_commune             TEXT,
  telephone               TEXT,
  mail                    TEXT,
  site_web                TEXT,
  fiche_onisep            TEXT,
  date_ouverture          DATE,
  geom                    geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS school_establishment_geom_idx ON school_establishment USING GIST (geom);
CREATE INDEX IF NOT EXISTS school_establishment_commune_idx ON school_establishment (code_commune);

-- `uai` est NULL pour les lignes de référence que certains jeux publient à côté des
-- établissements (« Total Département AIN », « Total Académie »…) : elles restent, ce sont
-- les moyennes auxquelles comparer. `annee` est l'année de session ou de rentrée publiée
-- (2024 pour la rentrée 2024-2025), NULL pour les jeux sans millésime (offre de langues…).
CREATE TABLE IF NOT EXISTS school_data (
  dataset  TEXT        NOT NULL,   -- identifiant data.education.gouv.fr
  uai      VARCHAR(8),
  annee    SMALLINT,
  data     JSONB       NOT NULL
);

CREATE INDEX IF NOT EXISTS school_data_uai_idx ON school_data (uai, dataset);
CREATE INDEX IF NOT EXISTS school_data_dataset_idx ON school_data (dataset, annee);

-- Date de chaque chargement, pour afficher la fraîcheur d'une source.
CREATE TABLE IF NOT EXISTS school_dataset_import (
  dataset      TEXT        PRIMARY KEY,
  rows         INTEGER     NOT NULL,
  imported_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
