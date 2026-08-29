-- Résultats électoraux : Présidentielle 2022, 1er tour, niveau commune.
-- Source : Ministère de l'Intérieur via data.gouv.fr.
-- Importé par scripts/import_elections.py.
--
-- Le code commune 'FRANCE' contient l'agrégat national (calculé à l'import).

CREATE TABLE IF NOT EXISTS elections_pres_2022_t1_commune (
  code_commune TEXT PRIMARY KEY,
  inscrits     INTEGER NOT NULL,
  votants      INTEGER NOT NULL,
  exprimes     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS elections_pres_2022_t1_results (
  code_commune TEXT NOT NULL,
  candidat     TEXT NOT NULL,        -- "Macron", "Le Pen", ...
  parti        TEXT NOT NULL,        -- "REN", "RN", "LFI", ...
  panneau      INTEGER NOT NULL,     -- 1..12 (ordre officiel sur le bulletin)
  voix         INTEGER NOT NULL,
  pct_exprimes NUMERIC(5,2) NOT NULL,
  PRIMARY KEY (code_commune, candidat),
  FOREIGN KEY (code_commune) REFERENCES elections_pres_2022_t1_commune(code_commune)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS elections_pres_2022_t1_results_commune_idx
  ON elections_pres_2022_t1_results (code_commune);
