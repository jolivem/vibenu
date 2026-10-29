-- Revenu médian et taux de pauvreté publiés par l'INSEE pour chaque commune, arrondissement
-- municipal et pour la France métropolitaine (Filosofi 2021, « Base niveau communes »).
-- Importé par scripts/import_filosofi_reference.py.
--
-- Pourquoi une table à part : `insee_aggregate` faisait la moyenne des valeurs de ses IRIS,
-- pondérée par la population. Un revenu médian ne se moyenne pas, et Filosofi ne publie la
-- pauvreté que pour les IRIS assez peuplés : le repère France sortait à 18,8 % de pauvreté et
-- 23 323 € de revenu médian, quand l'INSEE publie 14,9 % et 23 080 € (contrôle du 29/10/2026,
-- scripts/verify). Les requêtes lisent cette table d'abord ; une valeur absente ici (secret
-- statistique) reste absente, plutôt que remplacée par une moyenne que nul ne retrouverait.
--
-- `code` : code INSEE (commune ou arrondissement), ou 'FRANCE' pour la France métropolitaine
-- (Filosofi 2021 ne couvre pas tout l'outre-mer).

CREATE TABLE IF NOT EXISTS filosofi_reference (
  code           VARCHAR(6)  PRIMARY KEY,
  niveau         VARCHAR(8)  NOT NULL,     -- 'COM', 'ARM', 'FRANCE'
  annee          SMALLINT    NOT NULL,
  revenu_median  NUMERIC,                  -- € par unité de consommation (MED_SL)
  taux_pauvrete  NUMERIC                   -- % sous le seuil de 60 % du niveau de vie médian (PR_MD60)
);
