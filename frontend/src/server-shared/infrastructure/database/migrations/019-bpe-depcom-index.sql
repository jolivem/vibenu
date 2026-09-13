-- Index sur le code commune de la BPE, pour la card « Équipements de la commune »
-- (mode commune de l'analyse), qui compte les équipements par `depcom`.
--
-- La table `bpe_equipment` n'est pas créée par une migration mais par
-- scripts/import_bpe.py, qui la supprime et la recrée à chaque import : d'où la garde
-- `to_regclass` (les migrations passent avant les imports sur une base neuve) et le
-- même index dans `create_indexes` du script. update.sh rejouant les migrations à
-- chaque déploiement, l'index revient aussi après un réimport.

DO $$
BEGIN
  IF to_regclass('public.bpe_equipment') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_bpe_depcom ON bpe_equipment (depcom);
  END IF;
END
$$;
