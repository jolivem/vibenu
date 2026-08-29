-- Cache pour narratives commune (LLM, JSON structuré 4 sections).
-- Clé : (code_commune, model, version). Bump de version = nouveau prompt
-- (les anciennes entrées restent en base mais ne sont plus servies).
-- TTL appliqué en code (90 jours par défaut).
-- Utilisé par les pages programmatiques SEO /commune/[slug].

CREATE TABLE IF NOT EXISTS commune_narrative_cache (
  code_commune VARCHAR(5)  NOT NULL,
  model        TEXT        NOT NULL,
  version      INTEGER     NOT NULL DEFAULT 1,
  content      JSONB       NOT NULL,             -- {identite, marche_immobilier, cadre_de_vie, profil}
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (code_commune, model, version)
);

CREATE INDEX IF NOT EXISTS commune_narrative_cache_generated_at_idx
  ON commune_narrative_cache (generated_at);
