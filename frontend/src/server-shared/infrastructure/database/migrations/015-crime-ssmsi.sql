-- Délinquance enregistrée par la police et la gendarmerie (SSMSI).
-- Source : data.gouv.fr, Licence Ouverte 2.0. Importé par scripts/import_crime.py.
--
-- Maille communale : c'est la plus fine qui existe en open data. À Paris, Lyon et
-- Marseille la commune est l'arrondissement, ailleurs c'est la ville entière.
--
-- Secret statistique : le SSMSI publie le zéro et les effectifs à partir de 5, et
-- masque 1 à 4 (fragilité des estimations sur petits effectifs + protection des
-- personnes concernées par les procédures). Une valeur masquée n'est donc PAS une
-- absence de donnée : c'est l'intervalle [1, 4] faits, que l'écran affiche en bande
-- d'incertitude. D'où `denominateur`, renseigné même quand le taux ne l'est pas.

CREATE TABLE IF NOT EXISTS crime_commune (
  code_commune     VARCHAR(5)   NOT NULL,
  annee            SMALLINT     NOT NULL,
  indicateur       TEXT         NOT NULL,
  nombre           INTEGER,                       -- NULL si masqué (valeur réelle : 1 à 4)
  taux_pour_mille  NUMERIC(8,4),                  -- NULL si masqué
  -- Population ou nombre de logements selon l'indicateur : convertit les bornes
  -- 1 et 4 faits en taux, donc donne la hauteur de la bande d'incertitude.
  denominateur     INTEGER      NOT NULL,
  PRIMARY KEY (code_commune, annee, indicateur)
);

CREATE INDEX IF NOT EXISTS crime_commune_lookup
  ON crime_commune (code_commune, indicateur, annee);

-- Départements, plus la ligne pseudo-code 'FRANCE' calculée à l'import — même procédé
-- que l'agrégat national de import_elections.py.
CREATE TABLE IF NOT EXISTS crime_reference (
  code             VARCHAR(6)   NOT NULL,         -- '75', '2A', '971', 'FRANCE'
  annee            SMALLINT     NOT NULL,
  indicateur       TEXT         NOT NULL,
  taux_pour_mille  NUMERIC(8,4) NOT NULL,
  PRIMARY KEY (code, annee, indicateur)
);

-- Base de calcul du taux, par indicateur : 'habitants' ou 'logements'. Déduite des
-- données à l'import plutôt que codée en dur, pour que l'étiquette d'axe suive la
-- source si elle change. Seuls les cambriolages sont rapportés aux logements.
CREATE TABLE IF NOT EXISTS crime_indicateur (
  indicateur TEXT PRIMARY KEY,
  base       TEXT NOT NULL CHECK (base IN ('habitants', 'logements'))
);
