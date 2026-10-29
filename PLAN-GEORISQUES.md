# Géorisques : dépendre moins de l'API

Statut (29/10/2026) : **plan à valider**. Les adresses et les volumes ont été relevés le
29/10/2026.

## Pourquoi

La card Risques repose sur un seul appel, `resultats_rapport_risque` de l'API Géorisques,
limité à **un appel par seconde**. Au-delà, Géorisques coupe la connexion (`ECONNRESET`) puis
refuse tout appel de notre adresse IP pendant plusieurs minutes, alors que son site reste
joignable. On l'a constaté le 29/10/2026 : au 12 rue Pasteur à Bordeaux, les argiles, en
rouge sur la carte, s'affichaient « Non renseigné ».

En production, tous les visiteurs passent par l'adresse du serveur. Un régulateur (un appel
toutes les 1,1 s, deux tentatives, 6 s de délai, pastille « Indisponible ») limite la casse,
mais la card reste à la merci d'un service tiers. Ce plan propose de récupérer en local ce qui
peut l'être.

## Ce qui se télécharge

Géorisques n'offre pas « sa base » : l'API assemble des jeux publiés à part. Les liens directs
viennent du service qui alimente les formulaires de téléchargement du site :
`https://www.georisques.gouv.fr/webappReport/ws/telechargements/formats/{format}/{clé}?echelle=nationale`
(ou `echelle=departementale&codeDepartement=33`). Il rend l'URL et la taille de chaque fichier.

| Donnée | Clé | Fichier | Taille | Maille |
|---|---|---|---|---|
| Argiles, carte d'exposition 2026 (arrêté du 9/01/2026, en vigueur au 1/07/2026 ; hors ville de Paris) | `alearg_25` | `https://files.georisques.fr/argiles/2025/AleaRG_2025_Fxx_L93.zip` | 623 Mo (Gironde seule : 4 Mo) | Zones, Shapefile L93 |
| Arrêtés de catastrophe naturelle, PPR, AZI, DICRIM (base GASPAR) | `gaspar` | `https://files.georisques.fr/GASPAR/gaspar.zip` | 5 Mo (≈ 72 Mo décompressés, 8 CSV) | Commune |
| Remontée de nappe | `remnappes` | `https://files.georisques.fr/REMNAPPES/Dept_{dep}.zip`, par département seulement | 17,5 Mo pour la Gironde | Zones, Shapefile |
| Zonages inondation, rapportage 2020 | `tri_2020` | `https://files.georisques.fr/di_2020/tri_2020_sig_di.zip` | 4,5 Go | Zones (territoires à risque important) |
| Installations classées | `icpe` | WFS BRGM `georisques_dl`, couche `InstallationsClassees`, CSV | 5 Mo | Points |
| Secteurs d'information sur les sols | `sis` | WFS BRGM `georisques_dl`, couche `classification`, CSV | 9 Mo | Zones |
| Sites et sols pollués | `basol` | `…/ws/infosols/export/excel?national=true` | 2 Mo | Points |
| Anciens sites industriels (CASIAS), mouvements de terrain, cavités | `basias`, `mvmt`, `cavites` | CSV par département seulement | — | Points |
| Radon, potentiel par commune (ASNR) | — | `https://static.data.gouv.fr/resources/connaitre-le-potentiel-radon-de-ma-commune/20190506-174309/radon.csv` | 1,2 Mo, 36 094 communes | Commune, codes de 2019 |
| Zonage sismique | — | Pas de fichier : WFS Géorisques, couche `ms:risq_zonage_sismique` | 36 719 communes, par pages | Commune |

GASPAR, relevé du 29/10/2026 : 247 140 arrêtés de catastrophe naturelle (fichier du
05/10/2026, dernier arrêté publié au JO le 23/01/2026, à vérifier). Bordeaux en compte 50,
dont 22 pour sécheresse, ce qui recoupe directement les argiles. Paris n'existe qu'en `75056` :
un arrondissement prend les arrêtés de sa ville (`communeMere`).

## Une seconde voie : le WFS de Géorisques au point

`https://www.georisques.gouv.fr/services` est un WFS (MapServer, 176 couches) interrogeable
par une petite emprise autour du point. Testé au 12 rue Pasteur :
`typeNames=ms:ALEARG_REALISE` rend la zone d'argile (`id` = 3, cohérent avec
« Risque Existant - important »), en moins d'une seconde. Couches utiles : `ALEARG_REALISE`
(argiles), `MVT_LOCALISE`, `CAVITE_LOCALISEE`, `risq_zonage_sismique`,
`PPRN_COMMUNE_*` (communes couvertes par un PPR), `ALEA_SYNT_*` (surfaces inondables).

À vérifier avant de s'y fier :
- **limite d'appels** : le WFS n'annonce pas celle de l'API, mais il est servi par la même
  infrastructure ;
- **édition des argiles** : `ALEARG_REALISE` est-elle la carte 2020 ou celle de 2026 ?
- **codes d'exposition** : 1, 2, 3 = faible, moyen, fort, à confirmer sur la documentation.

## Proposition : une approche mixte, en trois temps

### 1. Importer ce qui est stable et national (effort moyen)

- **Argiles 2026** : 623 Mo, une fois par édition (la prochaine n'est pas annoncée). Table
  PostGIS simplifiée, lue au point. C'est le risque le plus lourd pour un acheteur, et la
  source de notre incident.
- **Radon** et **zonage sismique** : deux tables à la commune, quelques Mo. Le radon est en
  codes de 2019 : prévoir la table de passage des communes fusionnées.
- **GASPAR** : arrêtés de catastrophe naturelle et PPR par commune. Import mensuel (le
  fichier est refait au fil des publications).

### 2. Ajouter ce qu'on n'affiche pas aujourd'hui (effort faible une fois GASPAR importé)

- **L'historique des catastrophes naturelles de la commune** dans la card Risques : « 22
  arrêtés sécheresse depuis 1989, le dernier en 2022 ». Fait fort, facile à lire, et que
  l'état des risques remis à l'acheteur mentionne aussi.

### 3. Garder l'API en complément

- Pour ce qui n'est pas importé (nappes, inondation hors TRI, industries) et pour les
  libellés de statut à l'adresse, que la loi reprend dans l'état des risques.
- Si une source locale répond, l'API n'est plus bloquante : la card s'affiche avec les
  données locales, et complète quand l'API répond.

## Précautions

- **Écart avec le document officiel** : l'état des risques (ERRIAL) remis à l'acheteur suit
  la lecture de Géorisques. En lisant les couches nous-mêmes, on peut diverger ; il faut le
  dire sur la card, et garder les libellés de l'API quand on les a.
- **Volume** : 623 Mo pour les argiles, 4,5 Go pour les zonages inondation (non retenus en
  phase 1). Simplifier les géométries à l'import, comme pour `commune_shape`.
- **Fraîcheur** : GASPAR bouge chaque mois, les autres rarement. Le README devra le dire,
  comme pour la zone tendue.
- **Paris** : la carte d'exposition aux argiles 2026 ne couvre pas la ville. Il faut le dire
  sur la card plutôt qu'afficher une absence.
- **Téléchargement** : les adresses viennent d'un service interne au site de Géorisques, non
  documenté. Elles peuvent changer ; le script d'import doit échouer bruyamment.

## Questions à trancher

1. Phase 1 : les quatre jeux (argiles, radon, séisme, GASPAR), ou d'abord argiles et GASPAR ?
2. L'historique des catastrophes naturelles : dans la card Risques, ou dans une card à part ?
3. Le WFS au point : à tester sérieusement comme remplaçant de l'API, ou seulement en secours ?
