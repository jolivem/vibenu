# État des sources de données

Bilan établi le **4 octobre 2026** : pour chaque source importée en base par les scripts de
[scripts/](scripts/), ce que le site utilise et ce qui est disponible en ligne à cette date.

À refaire périodiquement. Les sources lues à la volée par l'application (Géorisques, API Carto,
transport.data.gouv.fr, Atmo, IGN) ne sont pas concernées : elles sont toujours à jour.

## En bref

Trois sources ont des données plus récentes que ce qui est importé :

1. **DVF** — l'année 2025 est publiée, le script ne la connaît pas.
2. **Recensement INSEE à l'IRIS** — le millésime 2022 est paru, le site utilise 2021.
3. **OpenStreetMap** — l'extrait importé a presque six mois.

Les autres sources sont à jour.

## Tableau

| Source | Script | Utilisé par le site | Disponible en ligne | À intégrer ? |
|---|---|---|---|---|
| Ventes DVF géolocalisées | `import_dvf.py` | ventes 2024 seulement (base locale) | année 2025 complète, publiée le 18 mai 2026 | **Oui** |
| Recensement à l'IRIS (logement, activité, diplômes, ménages, population) | `import_insee_iris.py`, `import_iris.py` | millésime 2021 | millésime 2022, paru le 16 octobre 2025 | **Oui**, avec précaution |
| OpenStreetMap (commerces et services) | `import_osm.py` | extrait du 15 avril 2026 | extrait du 4 octobre 2026 (quotidien) | Oui, pour des commerces à jour |
| Contours IRIS (IGN) | `import_iris.py` | édition 2024 | éditions 2025 et 2026 | Non pour l'instant |
| Revenus Filosofi à l'IRIS | `import_iris.py` | 2021 | 2021 reste le dernier à l'IRIS | Non |
| Équipements BPE | `import_bpe.py` | BPE 2025 | BPE 2025, fichier actualisé le 8 septembre 2026 | À vérifier |
| Délinquance SSMSI | `import_crime.py` | fichiers du 9 juillet 2026, années 2016-2025 | inchangé | Non |
| Municipales 2026 | `import_municipales.py` | fichiers de mars 2026 | inchangé | Non |
| Présidentielle 2022 | `import_elections.py` | résultats définitifs | figé (scrutin clos) | Non |
| Fiscalité locale DGFiP | `import_local_tax.py` | importée les 3 et 4 octobre 2026 | inchangé | Non |
| Carte scolaire de Paris | `import_school_sectors_paris.py` | 770 secteurs | inchangé depuis le 3 mars 2026 | Non |
| Qualité de l'air, Paris | `import_atmo_paris.py` | années 2021-2025 | inchangé depuis le 11 mars 2026 | Non |
| Normales climatiques Météo-France | `import_climate_fiches.py` | fiches climatologiques 1991-2020 (`FICHECLIM_*.data`) | rééditées par Météo-France, mêmes normales jusqu'en 2031 | Non |
| Argiles, carte d'exposition 2026 (Géorisques) | `import_argiles.py` | `AleaRG_2025_Fxx_L93.zip`, importée le 29/10/2026 | aucune nouvelle édition annoncée | Non |
| Catastrophes naturelles (GASPAR) | `import_catnat.py` | fichier du 5/10/2026, dernier JO le 23/01/2026 | refait au fil des JO : **à relancer chaque mois** | Oui, mensuel |

Non vérifiés : `import_atmo_lyon.py` et `import_atmo_marseille.py`, qui lisent un fichier déposé à
la main et non une source en ligne.

## Détail des sources à mettre à jour

### DVF — année 2025

- Les fichiers `geo-dvf/latest/csv/2025/` existent depuis le 18 mai 2026 ; la fiche data.gouv.fr
  annonce une couverture jusqu'au 31 décembre 2025. L'année 2026 n'est pas encore publiée.
- Le script n'essaie que les années `2024`, `2023` puis `2022` : il faut y ajouter `2025`, puis
  relancer l'import.
- C'est la mise à jour la plus visible pour un visiteur : les prix affichés datent d'un an.
- Seule la base locale a été regardée ; celle du serveur peut contenir d'autres années.

### Recensement — millésime 2022

Les cinq bases infracommunales 2022 sont parues le 16 octobre 2025 :

| Base | Page INSEE | Fichier |
|---|---|---|
| Logement | https://www.insee.fr/fr/statistiques/8647012 | `Base-ic-logement-2022_csv.zip` |
| Activité des résidents | https://www.insee.fr/fr/statistiques/8647006 | `base-ic-activite-residents-2022_csv.zip` |
| Diplômes - Formation | https://www.insee.fr/fr/statistiques/8647010 | `base-ic-diplomes-formation-2022_csv.zip` |
| Couples - Familles - Ménages | https://www.insee.fr/fr/statistiques/8647008 | `base-ic-couples-familles-menages-2022_csv.zip` |
| Population | https://www.insee.fr/fr/statistiques/8647014 | `base-ic-evol-struct-pop-2022_csv.zip` |

- Elles sont en géographie au 1er janvier 2024, comme les contours IRIS déjà utilisés : elles
  sont donc compatibles sans changer les contours.
- Le nom du fichier logement commence par une majuscule, les quatre autres par une minuscule.
- **Précaution** : les revenus Filosofi restent en 2021. La carte Population mélangerait alors
  deux millésimes, ce qu'il faudrait dire dans ses notes.
- Les textes du site citent « recensement 2021 » à plusieurs endroits (cartes Emploi, Ménages,
  Logement, page À propos, FAQ des pages commune) : à mettre à jour en même temps.
- Les bases 2021 ont été corrigées par l'INSEE le 16 décembre 2025 ; les fichiers locaux, téléchargés
  le 30 août 2026, incluent cette correction.

### OpenStreetMap

- L'extrait `france-latest.osm.pbf` est régénéré chaque jour par Geofabrik (5 Go).
- Aucun changement de code : il suffit de retélécharger et de relancer l'import.

## Sources à surveiller

- **Contours IRIS 2025 et 2026** : l'IGN ne les publie plus en Shapefile, le format lu par le
  script, mais en GeoPackage. Les adopter demande de réécrire la lecture, et n'a d'intérêt que si
  le recensement passe à une géographie plus récente que 2024.
- **Filosofi** : un millésime 2023 existe (dispositif « Filosofi 2 », paru le 6 août 2026), mais de
  la région à la commune seulement, pas à l'IRIS, et il n'est pas comparable aux années précédentes.
- **BPE** : la page INSEE indique une actualisation du fichier détail le 8 septembre 2026. La date
  du dernier import en base n'étant pas connue, on ne sait pas s'il l'inclut.
- **Recensement 2023 à l'IRIS** : les bases IRIS paraissent habituellement mi-octobre ; le
  millésime 2023 pourrait donc sortir prochainement.
- **Fiscalité locale** : le millésime 2026 des taux (celui de 2025 est paru en mai), les
  délibérations 2027 et les comptes 2026 n'existent pas encore. Le barème des droits de mutation du
  1er juin 2026 reste le dernier.

## Limites de ce bilan

- L'absence de bases IRIS 2023 et de BPE 2026 repose sur des recherches sans résultat, pas sur un
  calendrier officiel de l'INSEE.
- Les pages insee.fr ont été lues par un outil qui en restitue un résumé, pas le texte brut ; les
  noms de fichiers n'ont pas été testés par téléchargement.
- Les dates IGN sont celles du flux de téléchargement, pas une date de parution éditoriale.
- Le barème des droits de mutation a été cherché sous le même schéma d'adresse que le précédent ;
  un changement de nom du fichier ne serait pas détecté.
