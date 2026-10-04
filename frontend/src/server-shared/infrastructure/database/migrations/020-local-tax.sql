-- Fiscalité locale et comptes des communes (DGFiP).
-- Source : data.economie.gouv.fr, Licence Ouverte 2.0. Importé par scripts/import_local_tax.py.
--
-- Maille communale, sans ligne par arrondissement : à Paris, Lyon et Marseille les taux
-- sont votés par la ville entière. L'application rabat donc 751xx, 6938x et 132xx sur
-- 75056, 69123 et 13055 avant de lire ces tables.
--
-- Ce sont des TAUX, en % de la base d'imposition. Le montant d'une taxe dépend de la
-- valeur locative cadastrale du logement, qui n'est pas publique : rien ici ne permet
-- d'estimer un impôt en euros pour une adresse.

-- Jeu « Fiscalité locale des particuliers » : une ligne par commune et par exercice.
CREATE TABLE IF NOT EXISTS local_tax_commune (
  code_commune        VARCHAR(5)   NOT NULL,
  annee               SMALLINT     NOT NULL,
  -- Taux global de taxe foncière sur le bâti : commune + intercommunalité + syndicats
  -- + taxes spéciales (TSE, GEMAPI, TASA). N'inclut PAS la TEOM.
  taux_tfb_global     NUMERIC(6,2),
  taux_tfb_commune    NUMERIC(6,2),
  taux_tfb_epci       NUMERIC(6,2),
  -- NULL quand la source donne 0 ou rien : le service des déchets est alors financé
  -- autrement (redevance ou budget général). Ne jamais lire ce NULL comme « 0 % ».
  taux_teom           NUMERIC(6,2),
  -- Taxe d'habitation, qui ne porte plus que sur les résidences secondaires.
  taux_th             NUMERIC(6,2),
  majoration_rs       BOOLEAN,
  taux_majoration_rs  NUMERIC(5,2),
  population          INTEGER,
  nom_epci            TEXT,
  PRIMARY KEY (code_commune, annee)
);

-- Repères : départements, plus la ligne pseudo-code 'FRANCE', calculés à l'import.
-- Médiane des communes et non moyenne : elle se lit « une commune sur deux a un taux
-- plus bas », alors qu'une moyenne non pondérée ne correspond au taux de personne.
CREATE TABLE IF NOT EXISTS local_tax_reference (
  code               VARCHAR(6)   NOT NULL,         -- '75', '2A', '971', 'FRANCE'
  annee              SMALLINT     NOT NULL,
  taux_tfb_mediane   NUMERIC(6,2),
  -- Médiane des seules communes qui prélèvent une TEOM, et leur nombre.
  taux_teom_mediane  NUMERIC(6,2),
  nb_communes_teom   INTEGER      NOT NULL DEFAULT 0,
  taux_th_mediane    NUMERIC(6,2),
  nb_communes        INTEGER      NOT NULL,
  PRIMARY KEY (code, annee)
);

-- Jeu « Délibérations de fiscalité directe locale des communes (hors taux) ».
CREATE TABLE IF NOT EXISTS local_tax_deliberation (
  code_commune        VARCHAR(5)   NOT NULL,
  annee               SMALLINT     NOT NULL,
  tlv                 BOOLEAN,                      -- périmètre de la taxe sur les logements vacants
  taux_majoration_rs  NUMERIC(5,2),                 -- NULL : pas de majoration votée
  PRIMARY KEY (code_commune, annee)
);

-- Repères des délibérations, mêmes codes que `local_tax_reference` : combien de communes
-- sont dans le périmètre de la taxe sur les logements vacants, combien ont voté une
-- majoration des résidences secondaires, et à quel taux médian.
CREATE TABLE IF NOT EXISTS local_tax_deliberation_reference (
  code                     VARCHAR(6)   NOT NULL,   -- '75', '2A', '971', 'FRANCE'
  annee                    SMALLINT     NOT NULL,
  nb_communes              INTEGER      NOT NULL,
  nb_tlv                   INTEGER      NOT NULL,
  nb_majoration            INTEGER      NOT NULL,
  taux_majoration_mediane  NUMERIC(5,2),            -- parmi les communes qui en ont voté une
  PRIMARY KEY (code, annee)
);

-- Jeu « Comptes individuels des communes » : euros par habitant, et moyenne de la strate
-- (communes de taille comparable) telle que la DGFiP la publie.
CREATE TABLE IF NOT EXISTS local_tax_finances (
  code_commune       VARCHAR(5)    NOT NULL,
  annee              SMALLINT      NOT NULL,
  population         INTEGER,
  dette_hab          NUMERIC(12,2),
  dette_strate       NUMERIC(12,2),
  impots_hab         NUMERIC(12,2),
  impots_strate      NUMERIC(12,2),
  equipement_hab     NUMERIC(12,2),
  equipement_strate  NUMERIC(12,2),
  caf_hab            NUMERIC(12,2),                 -- capacité d'autofinancement (épargne brute)
  caf_strate         NUMERIC(12,2),
  PRIMARY KEY (code_commune, annee)
);
