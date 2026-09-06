-- Cache des mini-synthèses affichées sous le titre des cards à graphiques
-- (LLM, JSON de 7 clés au plus). Utilisé par l'écran d'analyse et par le PDF.
--
-- Clé : (geo_key, mode, model, version). Reprend le design de 005, pas celui de 002 :
--   * `model` est DANS la clé primaire. Dans narrative_cache il est hors PK, avec un
--     ON CONFLICT (geo_key) : changer de modèle y provoquait des miss permanents.
--   * `version` est une colonne, au lieu du préfixe "A4:" collé dans la clé de 002.
--     Bump de version = nouveau prompt, les anciennes lignes cessent d'être servies.
--   * `mode` est une colonne à part : au même centroïde, une analyse d'adresse et une
--     analyse de commune ne disent pas la même chose, et ce n'est pas une version.
--
-- TTL appliqué en code (90 jours) : les sources sont annuelles — recensement INSEE,
-- SSMSI, normales climatiques 1991-2020, présidentielle 2022.
--
-- Dette assumée : narrative_cache (migration 002) devient inutilisée avec la
-- suppression de la card « Synthèse », mais n'est pas supprimée ici. update.sh rejoue
-- les migrations à chaque déploiement et un DROP n'a pas de retour arrière ; une
-- migration 019 la retirera une fois la présente fonctionnalité stabilisée en prod.

CREATE TABLE IF NOT EXISTS card_insights_cache (
  geo_key      TEXT        NOT NULL,   -- buildGeoKey(lat, lon) — 4 décimales, ~11 m
  mode         TEXT        NOT NULL,   -- 'address' | 'commune'
  model        TEXT        NOT NULL,
  version      INTEGER     NOT NULL,
  content      JSONB       NOT NULL,   -- Partial<Record<CardInsightKey, string>>
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (geo_key, mode, model, version)
);

CREATE INDEX IF NOT EXISTS card_insights_cache_generated_at_idx
  ON card_insights_cache (generated_at);
