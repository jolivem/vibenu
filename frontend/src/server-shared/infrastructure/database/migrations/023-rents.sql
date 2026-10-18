-- Loyers d'annonce par commune et contours simplifiés des communes.
--
-- Source des loyers : « Carte des loyers » — indicateurs de loyers d'annonce par commune,
-- ANIL et ministère du Logement (DHUP), Licence Ouverte 2.0. Une édition par an (décembre),
-- estimée sur les annonces du 3e trimestre. Les éditions successives ne se comparent PAS
-- entre elles (méthode et maillage changent) : aucune série dans le temps n'est construite.
-- Importé par scripts/import_rents.py.
--
-- Précautions du producteur : la plupart des communes (86 % en 2025) sont estimées au niveau
-- d'une « maille », un groupe de communes voisines faute d'annonces suffisantes ; prudence
-- sous 30 annonces ou sous un R² ajusté de 0,5. Les arrondissements de Paris, Lyon et
-- Marseille ont leurs propres lignes ; les villes entières n'en ont pas.

CREATE TABLE IF NOT EXISTS rent_commune (
  code_commune  VARCHAR(5)   NOT NULL,
  -- Libellé de la source : « Paris 15e Arrondissement », là où les IRIS ne disent que « Paris ».
  nom           TEXT,
  annee         SMALLINT     NOT NULL,
  type_bien     VARCHAR(8)   NOT NULL,   -- 'app' | 'app12' | 'app3' | 'maison'
  loyer_m2      NUMERIC(6,2) NOT NULL,   -- €/m², charges comprises, hors meublé
  ic_bas        NUMERIC(6,2),            -- intervalle de prédiction à 95 %
  ic_haut       NUMERIC(6,2),
  niveau        VARCHAR(8)   NOT NULL,   -- 'commune' | 'maille' | 'epci'
  nb_annonces   INTEGER      NOT NULL,   -- annonces de la commune elle-même
  r2            NUMERIC(4,3),
  PRIMARY KEY (code_commune, annee, type_bien)
);

-- Contours des communes, reconstitués à partir des IRIS (`iris_demographics`, dont le code
-- commence par celui de la commune) puis simplifiés : de quoi colorier les communes autour
-- d'une adresse. Fusionner les IRIS à la volée coûte une dizaine de secondes pour 25
-- communes ; la table précalculée rend la lecture instantanée. Reconstruite par
-- scripts/import_rents.py.
CREATE TABLE IF NOT EXISTS commune_shape (
  code_commune  VARCHAR(5) PRIMARY KEY,
  nom           TEXT,
  geom          GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS commune_shape_geom_gix ON commune_shape USING GIST (geom);
