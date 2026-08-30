-- Élections municipales des 15 et 22 mars 2026, résultats par commune.
-- Source : Ministère de l'Intérieur via data.gouv.fr, Licence Ouverte 2.0.
-- Importé par scripts/import_municipales.py.
--
-- Deux tours sont stockés. Une commune n'apparaît au tour 2 que si le tour 1 n'a
-- pas suffi : l'écran affiche donc le tour décisif — le 2 s'il existe, le 1 sinon.
--
-- Couverture, mesurée sur le fichier : les 34 836 communes ont au moins une liste
-- avec voix et sièges, mais seules 3 282 (9 %, soit 65 % du corps électoral) ont une
-- NUANCE politique — l'État ne nuance que les communes d'une certaine taille. D'où
-- `nuance` nullable : dans un village on connaît le nom de la liste et ses sièges,
-- jamais sa couleur politique. 23 681 communes n'avaient d'ailleurs qu'une seule
-- liste, où le seul chiffre parlant est la participation.

CREATE TABLE IF NOT EXISTS municipales_2026_commune (
  code_commune VARCHAR(5) NOT NULL,
  tour         SMALLINT   NOT NULL CHECK (tour IN (1, 2)),
  inscrits     INTEGER    NOT NULL,
  votants      INTEGER    NOT NULL,
  exprimes     INTEGER    NOT NULL,
  blancs       INTEGER,
  nuls         INTEGER,
  PRIMARY KEY (code_commune, tour)
);

CREATE TABLE IF NOT EXISTS municipales_2026_listes (
  code_commune  VARCHAR(5)   NOT NULL,
  tour          SMALLINT     NOT NULL,
  panneau       SMALLINT     NOT NULL,
  -- NULL dans 91 % des communes : l'État ne nuance pas les petites.
  nuance        TEXT,
  libelle       TEXT         NOT NULL,
  -- NULL aussi dans les petites communes : pas de tête de liste publiée.
  tete_de_liste TEXT,
  voix          INTEGER      NOT NULL,
  pct_exprimes  NUMERIC(5,2) NOT NULL,
  sieges_cm     INTEGER,
  PRIMARY KEY (code_commune, tour, panneau)
);

CREATE INDEX IF NOT EXISTS municipales_listes_lookup
  ON municipales_2026_listes (code_commune, tour);

-- Agrégat national par nuance, calculé à l'import sur les seules communes nuancées —
-- même procédé que la ligne 'FRANCE' de la présidentielle. Sert de repère au profil
-- politique communal, comme le score national le fait pour la présidentielle.
CREATE TABLE IF NOT EXISTS municipales_2026_france (
  tour         SMALLINT     NOT NULL,
  nuance       TEXT         NOT NULL,
  voix         BIGINT       NOT NULL,
  pct_exprimes NUMERIC(5,2) NOT NULL,
  PRIMARY KEY (tour, nuance)
);
