-- Cache for LLM-generated address narratives.
-- Key: lat/lon rounded to 4 decimals (~10m precision), see buildGeoKey().
-- TTL is enforced in application code, not by the DB.

CREATE TABLE IF NOT EXISTS narrative_cache (
  geo_key      TEXT PRIMARY KEY,
  model        TEXT NOT NULL,
  paragraph    TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS narrative_cache_generated_at_idx
  ON narrative_cache (generated_at);
