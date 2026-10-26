-- Délinquance : repère « communes de même taille ».
-- Importé par scripts/import_crime.py, avec les autres tables SSMSI.
--
-- La tranche de population de chaque commune, d'après sa dernière année connue. Elle
-- choisit la ligne de `crime_reference` à tracer : code 'T1' à 'T5', calculé à l'import
-- sur toutes les communes de la tranche (rapport de sommes, comme la ligne 'FRANCE').
--
-- Les arrondissements de Paris, Lyon et Marseille prennent la tranche de leur ville : un
-- arrondissement de 20 000 habitants est un quartier de grande ville, pas une petite ville.

CREATE TABLE IF NOT EXISTS crime_commune_tranche (
  code_commune VARCHAR(5) PRIMARY KEY,
  tranche      SMALLINT   NOT NULL CHECK (tranche BETWEEN 1 AND 5),
  population   INTEGER    NOT NULL,   -- population ayant servi au classement
  annee        SMALLINT   NOT NULL    -- année de cette population
);
