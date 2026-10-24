# Collèges et lycées à proximité, avec leurs résultats

Statut (22/10/2026) : **données importées et section « Enseignement » livrée en V1** — carte
(cases Collèges / Lycées, secteur parisien), card Collèges, card Lycées, ligne PDF. Le détail
de la V1 est dans le plan d'affichage validé le 22/10 ; ce document garde l'historique des
choix. Restent ouverts : un rang local, les « En bref », les pages `/commune/*`, et le détail
dépliable des autres données (évaluations de 6e, effectifs, historique, Inserjeunes).

## Contexte

L'analyse ne montre aujourd'hui que le **collège de secteur**, et pour Paris seulement
(`school-sector`, table `school_sector`). Les écoles de la card Voisinage sont des points
BPE sans identifiant ni résultat. Or le choix d'un logement dépend souvent des établissements
du secondaire. L'Éducation nationale publie, établissement par établissement, la réussite au
brevet et au bac, la **valeur ajoutée** (l'écart entre la réussite observée et celle
qu'attendait le profil des élèves) et l'**indice de position sociale** (IPS).

**Objectif** : une card « Collèges et lycées » qui liste les établissements proches avec ces
indicateurs, **triée par distance par défaut**. Des en-têtes cliquables permettent de retrier
par réussite, valeur ajoutée, mentions ou IPS. Il n'y a aucun classement imposé ni note
synthétique, conformément au principe du projet et à l'avertissement du ministère contre les
palmarès. Ces choix ont été validés : tri au choix, rayon de 2 km pour les collèges et de 5 km
pour les lycées.

## Sources : portail data.education.gouv.fr, API Opendatasoft v2.1

Identifiants et colonnes vérifiés le 21/10/2026.

| Jeu (`dataset_id`) | Contenu utile | Années |
|---|---|---|
| `fr-en-annuaire-education` | `identifiant_de_l_etablissement` (UAI), `nom_etablissement`, `type_etablissement`, `statut_public_prive`, `latitude`, `longitude`, `code_commune`, `voie_generale/technologique/professionnelle`, `appartenance_education_prioritaire`, `etat`, `section_*`, `restauration`, `hebergement` | mise à jour quotidienne |
| `fr-en-indicateurs-valeur-ajoutee-colleges` (IVAC) | `uai`, `session`, `secteur`, `nb_candidats_g`, `taux_de_reussite_g`, `va_du_taux_de_reussite_g`, `note_a_l_ecrit_g`, `va_de_la_note_g`, `taux_d_acces_6eme_3eme`, `nb_mentions_*_g` | 2022 à 2025 |
| `fr-en-indicateurs-de-resultat-des-lycees-gt_v2` (IVAL GT) | `uai`, `annee`, `presents_total`, `taux_reu_total`, `va_reu_total`, `taux_acces_2nde`, `va_acces_2nde`, `taux_men_total`, `va_men_total` | 2012 à 2025 |
| `fr-en-indicateurs-de-resultat-des-lycees-pro_v2` (IVAL pro) | mêmes colonnes `*_total` | 2012 à 2025 |
| `fr-en-ips-colleges-ap2023` | `uai`, `rentree_scolaire`, `ips`, `ips_departemental`, `ips_academique`, `ips_national` (versions public et privé) | depuis 2023 |
| `fr-en-ips-lycees-ap2023` | `uai`, `ips_etab`, `ips_voie_gt`, `ips_voie_pro`, `ips_departemental_legt/lpo/lp` | depuis 2023 |
| `fr-en-sections-sportives-scolaires` | `uai`, `sections_scolaires` (liste de disciplines : « RUGBY », « GYMNASTIQUE ») | courant |
| `fr-en-lycees-metiers` | `ndeg_uai`, `intitule_du_label`, `filiere_de_rattachement` (liste) | courant |

**Fiche descriptive** : l'annuaire fournit aussi `type_contrat_prive`, `post_bac`, `apprentissage`,
`lycee_agricole`, `ulis`, `segpa`, `section_europeenne`, `section_internationale`,
`section_arts`, `section_cinema`, `section_theatre`, `fiche_onisep` (URL) et `web`. Ce sont des
indicateurs oui/non, sans détail : on ne sait ni la langue de la section européenne ni la
discipline de la section arts. Les sections sportives et le label « lycée des métiers »
apportent, eux, le détail en clair. Les langues vivantes, spécialités et options ne sont pas
publiées par établissement sur ce portail : le lien vers la fiche ONISEP y supplée.

La licence est l'Etalab 2.0 (à confirmer sur chaque fiche au moment de l'import). Les
valeurs ajoutées sont absentes sous les seuils d'effectif fixés par la DEPP : il faut
afficher « non publié », jamais 0.

## Données : migration et script d'import — FAIT (22/10/2026)

Choix fait à l'import, l'affichage n'étant pas arrêté : **récupérer le maximum, sans
réinterpréter**.

- **Migration `024-schools.sql`** :
  - `school_establishment` : les collèges et lycées ouverts de l'annuaire, typés (secteur, éducation prioritaire, voies, services, sections, liens) et indexés spatialement (GIST) ;
  - `school_data (dataset, uai, annee, data JSONB)` : chaque ligne de chaque jeu, telle que publiée. `uai` est NULL pour les lignes « Total Département » / « Total Académie », qui servent de références ;
  - `school_dataset_import` : la date de chaque chargement.
- **`scripts/import_schools.py`** : 24 jeux (liste `DATASETS`), export JSON Lines en cache dans `scripts/data/schools/`, un jeu par transaction, options `--only` et `--refresh`.
  - Au-delà des jeux prévus au départ, il charge aussi : l'offre de langues, les sections internationales, les effectifs par niveau, sexe et langue, l'encadrement (élèves par division), le brevet par établissement (historique long), les évaluations de 6e, Inserjeunes (lycées pro), l'indice d'éloignement, le mode d'hébergement, les internats et l'historique des IPS 2016-2021.
- **Reste à faire, côté serveur** : des vues typées sur `school_data` (derniers résultats, IPS avec références…) une fois l'affichage décidé.

## Serveur : nouveau module `server-modules/schools/`

Il suit le découpage habituel (`domain/`, `application/`, `infrastructure/`) :

- **`domain/schools.types.ts`** : `NearbySchool` contient l'UAI, le nom, le type, le secteur, la distance, la voie, les derniers résultats (avec leur année), les résultats de l'année précédente (pour une flèche de tendance) et l'IPS avec ses références départementale et nationale.
  - Il porte aussi la **fiche** : la liste des **codes** d'offre présents (`cantine`, `internat`, `post_bac`, `apprentissage`, `agricole`, `europeenne`, `internationale`, `arts`, `cinema`, `theatre`), les disciplines sportives, le label et les filières « lycée des métiers », et les URL ONISEP et du site.
  - Le DTO transporte ces **codes**, et le client les traduit. C'est la règle du projet : le DTO porte des codes, le texte est produit à l'affichage. Les disciplines et les filières sont du texte source, affiché tel quel avec `lang="fr"`.
- **`infrastructure/postgis-schools.provider.ts`** :
  - **Mode adresse** : les collèges à moins de 2 km et les lycées à moins de 5 km, triés par distance, avec un plafond de 8 par niveau. Si le rayon en contient moins de 3, on complète avec les 3 plus proches par KNN (`ORDER BY geom <-> point`).
  - **Mode commune** : `WHERE code_commune = $citycode`, avec le même plafond, triés par nom.
  - Une seule requête par niveau, avec `LEFT JOIN LATERAL` sur la dernière et l'avant-dernière année de `school_result`, et sur la dernière rentrée de `school_ips`. Le modèle à suivre est la requête spatiale de `rents/infrastructure/rents-database.provider.ts` (`readAreas`).
  - Le provider ne lève jamais d'erreur : en cas de problème, il renvoie une liste vide.
- **`application/schools.service(.impl).ts`**, avec un `InMemoryCache` et une clé `buildGeoKey` (TTL 7 jours).
- **Câblage** : ajouter le service à `Dependencies` dans `analysis/application/location-analysis.use-case.ts` et au `Promise.all`, en suivant l'`AnalysisMode` comme `schoolSectorPromise`. Le construire dans `app/api/location/analyze/route.ts`, puis ajouter `nearbySchools?: NearbySchoolsDto` au DTO (`server-shared/types/location-analysis.dto.ts`).
- **Collège de secteur à Paris** : si son UAI figure dans la liste, le marquer (`estSecteur: true`). La card affiche alors un badge « collège de secteur », ce qui relie les deux informations.

## Client

- **`components/analysis/SchoolsCard.tsx`**, dans la section `proximite`, après la card du secteur de collège (`AnalysisScreen.tsx`, autour de la ligne 348). Deux sous-blocs, « Collèges » et « Lycées » :
  - un tableau avec une ligne par établissement : nom, distance, réussite, valeur ajoutée, mentions, IPS ;
  - **sous le nom, une ligne de badges** : « Public » ou « Privé sous contrat », « REP+ », « Collège de secteur », « Cantine », « Internat », « Section européenne », « Section sportive : rugby », « Lycée des métiers », « Post-bac »… Le libellé de chaque code est dans `i18n/messages/<locale>/analysis/schools.ts` (`Record<SchoolOfferCode, string>`) ;
  - **deux liens discrets** : « Fiche ONISEP » (formations, langues, options) et « Site de l'établissement ». Ils s'ouvrent dans un nouvel onglet ;
  - **un détail repliable** (`<details>`) pour les filières du label « lycée des métiers ». La ligne reste ainsi courte ;
  - **par défaut, tri par distance**. Les en-têtes sont des `<button>` avec `aria-sort` et le tri se fait côté client. Les valeurs « non publié » vont en fin de liste, quel que soit le sens du tri ;
  - **la valeur ajoutée est affichée signée** (« +3 », « −2 ») sans couleur rouge ou verte, pour ne pas en faire une note ;
  - **l'IPS est comparé à la moyenne du département**, comme les autres indicateurs le sont à une référence ;
  - **le classement est local**, jamais national : c'est le tri parmi les établissements alentour qui classe. Chaque chiffre reste accompagné de sa **référence départementale** (« réussite 91 % · département 87 % »), pour ne pas présenter comme bon le meilleur d'un groupe faible. **Décision encore ouverte** : faut-il en plus afficher un rang (« 2e sur 6 ») ou un repère par rapport à la médiane des établissements alentour ? En V1, le tri seul, ce qui ne ferme aucune des deux options.
  - une note sous le tableau explique en une phrase ce que mesure la valeur ajoutée, et que la DEPP déconseille les palmarès ;
  - sur mobile, le tableau devient une liste de fiches (`@media (max-width: 560px)`), pour éviter le débordement horizontal déjà corrigé ailleurs.
- **Logique dans `schoolsModel.ts`**, sans texte : tri, comparaison à l'IPS départemental, tendance. **Textes dans `i18n/messages/fr|en/analysis/schools.ts`** : libellés, pluriels, phrases-fonctions, en français et en anglais dans le même commit.
- **Carte des établissements**, dans la même card :
  - Une couche de points (`circle`), une couleur par niveau, et le collège de secteur cerclé. Les points sont dessinés dans le canvas, sur le modèle de `rentAreas` dans `components/map/Map.tsx`, plutôt qu'en marqueurs DOM : ces derniers n'apparaissent pas dans la capture du PDF.
  - Un clic sur un point ouvre une bulle (nom, distance, réussite, valeur ajoutée).
  - Le cadre s'ajuste aux établissements affichés (`fitBounds`).
  - **À Paris**, le contour du secteur de collège devient une couche de cette carte. La card « Secteur de collège » est fusionnée dans « Collèges et lycées » : une seule card parle du collège de secteur.
- **`sections.ts` / `hasContent.proximite`** : la section s'affiche aussi s'il n'y a que des établissements.
- **Flag `FEATURES.showSchools`** dans `lib/site-features.ts` (PUBLIC : oui, PRO : non, PRO étant hors périmètre).
- **PDF** (`features/analysis-pdf/sections/PdfFiche.tsx`, bloc proximité) : une ligne par niveau, par exemple « Collèges : X (0,6 km, réussite 92 %, VA +3) · … », pour les 3 plus proches.

**Hors de la V1** : une clé « En bref » (`card-insights`). Elle demanderait de toucher à la liste des clés, à l'entrée et au prompt en même temps, selon l'invariant du module ; c'est un second temps une fois le rendu validé. Les pages `/commune/*` aussi.

## Fichiers principaux

- Nouveaux : `scripts/import_schools.py`, `migrations/0xx-schools.sql`, `server-modules/schools/**`, `components/analysis/SchoolsCard.tsx`, `components/analysis/schoolsModel.ts`, `i18n/messages/{fr,en}/analysis/schools.ts`.
- Modifiés : `location-analysis.use-case.ts`, `app/api/location/analyze/route.ts`, `location-analysis.dto.ts`, `AnalysisScreen.tsx`, `lib/site-features.ts`, l'index des messages d'analyse, `PdfFiche.tsx`, `styles/globals.css`, `README.md`.

## Vérification

1. **Import** : exécuter la migration puis `python import_schools.py`.
   - Contrôler par SQL les volumes : environ 7 000 collèges et 4 000 lycées ouverts, environ 6 800 lignes IVAC 2025, environ 2 700 sections sportives, environ 760 lycées des métiers.
   - Contrôler le taux de jointure UAI entre résultats et annuaire (attendu : plus de 98 %).
   - Vérifier à la main 2 ou 3 établissements connus contre les fiches du ministère et de l'ONISEP, par exemple le lycée Lavoisier (0750656F) : public, cantine, ULIS, section arts, post-bac, sans internat.
2. **API** : `curl` sur `/api/location/analyze` pour une adresse à Paris 15e (secteur et badge), à Lyon 1er, dans une commune rurale (repli KNN) et en mode commune (Rennes). Vérifier `nearbySchools`, les distances et les valeurs absentes.
3. **Rendu** : serveur de test sur le port 3111 avec `NEXT_DIST_DIR=.next-test` et `CARD_INSIGHTS_FIXTURE=1`. Captures Playwright à 384 et 1280 px ; tri par chaque en-tête ; aucun débordement (`scrollWidth`) ; contrôle avec `NEXT_PUBLIC_I18N_PSEUDO=1`.
4. **Contrôles** : `pnpm typecheck`, `pnpm build`, puis le téléchargement du PDF pour contrôler la ligne proximité.
