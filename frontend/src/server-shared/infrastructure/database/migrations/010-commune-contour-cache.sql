-- Cache persistant des contours de communes (donnée immuable récupérée via geo.api.gouv.fr).
-- Survit aux redémarrages du serveur, contrairement au cache mémoire de CommuneContourProvider.
--
-- La présence d'une ligne indique que l'API a déjà été interrogée pour ce citycode.
-- geometry = NULL signifie que l'API a répondu sans géométrie (cas légitime à mémoriser
-- pour éviter de la retaper).

CREATE TABLE IF NOT EXISTS commune_contour_cache (
  citycode   VARCHAR(5)  PRIMARY KEY,
  geometry   JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
