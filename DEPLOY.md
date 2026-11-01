ensure token to push docker image from to dockerhiub is OK
ensure toekn to pull docker image form Hetzner is OK
if not generate a classic token with crite:read package right.


## 1. Build and Push to GH package
```bash
cd clairimmo
./buildPush.sh
```

## 2. Export de la base, sur le PC de dev

La base locale doit avoir reçu tous les imports du moment (voir SOURCES.md) : le script le
contrôle, puis crée `claire_adresse.dump` (caches des textes de l'IA exclus).

```bash
./exportDb.sh
scp claire_adresse.dump <vps>:/tmp/
```

## 3. Import de la base, sur le VPS

Met le site en maintenance, sauvegarde la base de production et ses caches de textes de l'IA,
restaure le dump puis recharge ces caches. Le site reste en maintenance à la fin. Aucun script
d'import n'a à tourner sur le VPS : les données arrivent déjà importées.

```bash
cd vibenu
git pull                    # pour avoir la dernière version de importDb.sh
./importDb.sh               # (--no-backup : sans sauvegarde complète de la production)
```

## 4. Mettre à jour l'app : nouvelle image, migrations, redémarrage
```bash
./update.sh                 # (update classique)
./update.sh --full          # (pull + restart de tout)
./update.sh --maintenance   # (site en maintenance pendant l'update, cumulable)
```

## 5. Rouvrir le site
```bash
rm maintenance/ON
```
