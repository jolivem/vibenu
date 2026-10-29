-- Géorisques en local (PLAN-GEORISQUES.md, phase 1) : la carte d'exposition aux argiles et les
-- arrêtés de catastrophe naturelle, pour ne plus dépendre du seul appel
-- `resultats_rapport_risque`, limité à un par seconde.

-- Carte d'exposition au retrait-gonflement des argiles 2026 (arrêté du 9/01/2026, en vigueur
-- au 1/07/2026), BRGM / Géorisques, Licence Ouverte. Importée par scripts/import_argiles.py,
-- simplifiée à 10 m (la carte est établie au 1/50 000).
--   niveau : 1 faible, 2 moyen, 3 fort. Hors zone : exposition nulle — sauf la ville de Paris,
--   que la carte ne couvre pas (aucune zone pour le département 75).
CREATE TABLE IF NOT EXISTS argiles_exposition (
  id         SERIAL PRIMARY KEY,
  niveau     SMALLINT   NOT NULL CHECK (niveau BETWEEN 1 AND 3),
  insee_dep  VARCHAR(3) NOT NULL,
  geom       geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS argiles_exposition_geom_idx ON argiles_exposition USING GIST (geom);

-- Arrêtés de catastrophe naturelle (base GASPAR, fichier catnat_gaspar_*.csv), une ligne par
-- reconnaissance : un arrêté, une commune, un péril, une période. Importés par
-- scripts/import_catnat.py. Maille communale, sans ligne par arrondissement : Paris, Lyon et
-- Marseille n'existent qu'en 75056, 69123 et 13055.
CREATE TABLE IF NOT EXISTS catnat_arrete (
  id_gaspar            VARCHAR(16) NOT NULL,
  code_commune         VARCHAR(5)  NOT NULL,
  -- Code du péril au Journal officiel : ICB (inondations et coulées de boue), SEC (sécheresse)…
  risque_code          VARCHAR(4)  NOT NULL,
  date_debut           DATE        NOT NULL,
  date_fin             DATE        NOT NULL,
  date_publication_jo  DATE        NOT NULL,
  PRIMARY KEY (id_gaspar, code_commune, risque_code, date_debut, date_fin)
);
CREATE INDEX IF NOT EXISTS catnat_arrete_commune_idx ON catnat_arrete (code_commune);

-- Édition de chaque jeu importé, pour la dire à l'écran (« arrêtés publiés jusqu'au … »).
CREATE TABLE IF NOT EXISTS georisques_import (
  jeu           VARCHAR(16) PRIMARY KEY,   -- 'argiles', 'catnat'
  fichier       TEXT        NOT NULL,
  -- Date du fichier source, et dernière date utile qu'il contient (dernier JO pour GASPAR).
  date_fichier  DATE,
  date_donnees  DATE,
  imported_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
