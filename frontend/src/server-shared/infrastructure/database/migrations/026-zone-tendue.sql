-- Zone tendue : le zonage de chaque commune.
-- Source : « Liste des communes selon le zonage TLV », ministère de la Transition écologique,
-- data.gouv.fr, Licence Ouverte. Importé par scripts/import_zone_tendue.py.
--
-- Trois catégories, d'après la colonne « Zonage TLV post décret 22/12/2025 » :
--   'tendue'      — agglomération de plus de 50 000 habitants (annexe 1° du décret
--                   n° 2013-392) : les règles de location s'y appliquent (préavis d'un
--                   mois, loyer plafonné à la relocation) ainsi que la fiscalité ;
--   'touristique' — « zone touristique et tendue » (loi de finances 2023) : la fiscalité
--                   seulement (taxe sur les logements vacants, majoration possible de la
--                   taxe d'habitation des résidences secondaires), PAS les règles de location ;
--   'non'         — hors zonage.
--
-- Maille communale, sans ligne par arrondissement : l'application rabat 751xx, 6938x et
-- 132xx sur 75056, 69123 et 13055 avant de lire la table.

CREATE TABLE IF NOT EXISTS rent_zone_tendue (
  code_commune  VARCHAR(5)  PRIMARY KEY,
  zonage        VARCHAR(12) NOT NULL CHECK (zonage IN ('tendue', 'touristique', 'non')),
  -- Date du décret dont découle le classement, pour le dire à l'écran.
  decret        DATE        NOT NULL
);
