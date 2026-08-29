-- Supprime le chemin Open-Meteo, mort depuis le passage aux stations Météo-France.
--
-- climate_national_normales portait une moyenne calculée sur 12 villes via l'API
-- Archive d'Open-Meteo. Elle n'était plus lue par personne : la référence France
-- affichée est la normale officielle homogénéisée, codée en dur dans le module
-- climat. La ligne stockée annonçait d'ailleurs 3 200 h d'ensoleillement quand la
-- France est à ~1 969 h — donnée fausse, et piège pour qui rebrancherait l'ancien
-- provider.
--
-- climate_city_normales n'était que le cache de reprise de ce même import.
--
-- Les migrations 006 et 007 qui les créaient ont été supprimées ; ce DROP existe
-- pour nettoyer les bases où elles ont déjà été jouées.

DROP TABLE IF EXISTS climate_national_normales;
DROP TABLE IF EXISTS climate_city_normales;
