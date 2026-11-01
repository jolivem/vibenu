-- Fiche des immeubles vendus, tirée de la Base de données nationale des bâtiments (BDNB open,
-- CSTB, Licence Ouverte 2.0). Importée par scripts/import_bdnb.py, une ligne par parcelle
-- ayant au moins une vente DVF : le tableau des ventes de la card Immobilier la lit.
--
-- Quand une parcelle porte plusieurs groupes de bâtiments, on garde celui qui a le plus de
-- logements. La période de construction vient du Registre national des copropriétés
-- (`periode_rnc`) quand l'immeuble y figure ; sinon de l'année des Fichiers fonciers
-- (`annee_ffo`), moins sûre — au 2-4 rue Sainte-Lucie (Paris 15e), elle dit 2021 pour un
-- immeuble que le registre date de 1961-1974.
CREATE TABLE IF NOT EXISTS bdnb_parcelle (
  parcelle_id         VARCHAR(14) PRIMARY KEY,
  insee_dep           VARCHAR(3)  NOT NULL,
  batiment_groupe_id  VARCHAR(30) NOT NULL,
  -- Usage des Fichiers fonciers, tel quel : « Résidentiel collectif », « Résidentiel individuel »…
  usage               TEXT,
  nb_logements        SMALLINT,
  nb_niveaux          SMALLINT,
  annee_ffo           SMALLINT,
  -- Code du registre : AVANT_1949, DE_1949_A_1960, DE_1961_A_1974, DE_1975_A_1993,
  -- DE_1994_A_2000, DE_2001_A_2010, APRES_2011.
  periode_rnc         VARCHAR(16),
  adresse             TEXT
);
CREATE INDEX IF NOT EXISTS bdnb_parcelle_dep_idx ON bdnb_parcelle (insee_dep);

-- Départements importés et millésime : l'import reprend là où il s'est arrêté.
CREATE TABLE IF NOT EXISTS bdnb_import (
  insee_dep    VARCHAR(3) PRIMARY KEY,
  millesime    VARCHAR(16) NOT NULL,
  parcelles    INTEGER     NOT NULL,
  imported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
