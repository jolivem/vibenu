# Réutilisation à publier sur data.gouv.fr

Guide officiel : https://guides.etalab.gouv.fr/reutilisation/publier-reutilisation/

Marche à suivre : créer un compte, bas de page « Réutilisations » → « Publier une réutilisation »,
publier en nom propre, remplir les champs ci-dessous, puis **associer chaque jeu de données**
(champ « Trouvez votre jeu de données ») : la réutilisation s'affiche ensuite sur la page de
chacun d'eux. Joindre 2 ou 3 captures d'écran (carte des prix, carte des risques, une card).

## Titre

ClaireAdresse — ce que les données publiques disent d'une adresse avant de louer ou d'acheter

## Type

Application web

## URL

https://claireadresse.fr/?utm_source=datagouv&utm_medium=reuse

## Description

ClaireAdresse est un site gratuit et sans inscription. On y saisit une adresse ou un nom de
commune, et le site rassemble sur une carte, en langage courant, ce que les données publiques en
disent : prix réels des ventes (DVF), risques naturels et technologiques, zonages des plans de
prévention du risque d'inondation, urbanisme, transports en commun, collèges et lycées alentour
avec leurs résultats (réussite aux examens, valeur ajoutée, indice de position sociale,
encadrement, langues et sections) et secteur scolaire, commerces et équipements, population,
emploi, logement et revenus du quartier, délinquance, fiscalité locale (taux de taxe foncière et
d'ordures ménagères comparés à la médiane des communes, résidences secondaires et logements
vacants, droits de mutation, comptes de la commune), loyers et zone tendue, performance
énergétique des logements (DPE) à l'adresse, climat, qualité de l'air, résultats des
élections, et cartes et photographies aériennes anciennes.

Chaque indicateur est présenté dans son unité et comparé à un repère (la commune, la France),
sans score global : le site montre, il ne note pas. De courtes phrases « En bref » aident à la
lecture ; les chiffres, eux, viennent directement des fichiers publics cités, et chaque card
indique sa source.

Le site sert les particuliers avant une visite, une location ou un achat, et toute personne qui
veut comprendre un quartier ou une commune. Un export PDF est proposé. Les données sont lues sous
Licence Ouverte 2.0 (Etalab) et ODbL (OpenStreetMap).

## Mots-clés

immobilier, logement, adresse, quartier, commune, DVF, prix, risques, PPRI, inondation, PLU,
urbanisme, INSEE, IRIS, BPE, transports, délinquance, climat, élections, cartographie,
fiscalité locale, taxe foncière, comptes des communes, collèges, lycées, valeur ajoutée, IPS,
DPE, performance énergétique, passoires thermiques, zone tendue, loyers

## Jeux de données à associer (fichiers importés dans la base)

| Donnée | Titre à chercher sur data.gouv.fr | Script d'import |
|---|---|---|
| Prix des ventes | Demandes de valeurs foncières géolocalisées | `import_dvf.py` |
| Parcelles (pour DVF) | Cadastre (Etalab) | `import_dvf.py` |
| Contours des quartiers | Contours IRIS | `import_iris.py` |
| Équipements | Base permanente des équipements (BPE) | `import_bpe.py` |
| Délinquance | Bases statistiques communale, départementale et régionale de la délinquance enregistrée par la police et la gendarmerie nationales | `import_crime.py` |
| Présidentielle 2022 | Élection présidentielle des 10 et 24 avril 2022 – Résultats définitifs du 1er tour | `import_elections.py` |
| Municipales 2026 | Élections municipales 2026 – Résultats du premier tour / du second tour | `import_municipales.py` |
| Climat | Fiches climatologiques (Météo-France) | `import_climate_fiches.py` |
| Fiscalité locale : taux | Fiscalité locale des particuliers | `import_local_tax.py` |
| Fiscalité locale : résidences secondaires, logements vacants | Délibérations de fiscalité directe locale des communes 2026 (hors taux) | `import_local_tax.py` |
| Comptes de la commune | Comptes individuels des communes (fichier global) 2021 · 2022 · 2023-2024 · 2025 (quatre jeux) | `import_local_tax.py` |
| Collèges et lycées | Annuaire de l'éducation | `import_schools.py` |
| Résultats des collèges | Indicateurs de valeur ajoutée des collèges | `import_schools.py` |
| Résultats des lycées | Indicateurs de valeur ajoutée des lycées d'enseignement général et technologique | `import_schools.py` |
| Résultats des lycées pro | Indicateurs de valeur ajoutée des lycées d'enseignement professionnel | `import_schools.py` |
| Profil social des élèves | Indices de position sociale des collèges (à partir de 2023) | `import_schools.py` |
| Profil social des élèves | Indices de position sociale des lycées (à partir de 2023) | `import_schools.py` |
| Élèves par classe | Indicateurs d'encadrement H/E et E/S à la rentrée dans le secteur public | `import_schools.py` |
| Élèves par classe | Indicateurs d'encadrement H/E et E/S à la rentrée dans le secteur privé sous contrat | `import_schools.py` |
| Langues | Offre de langues dans les collèges et lycées | `import_schools.py` |
| Sections sportives | Sections Sportives Scolaires | `import_schools.py` |
| Lycées des métiers | Lycées des métiers | `import_schools.py` |
| Zone tendue | Liste des communes selon le zonage TLV | `import_zone_tendue.py` |
| Insertion des lycées pro | Inserjeunes Voie professionnelle scolaire par établissement relevant du ministère de l'éducation nationale | `import_schools.py` |

Tous ces titres ont été vérifiés sur data.gouv.fr le 25 octobre 2026. Plusieurs ont des homonymes
publiés par une collectivité (« … de Seine-Saint-Denis », « … franciliens ») ou une « ancienne
version » : choisir le jeu publié par **Ministères de l'Éducation nationale** ou **Ministères
économiques et financiers**.

Hors data.gouv.fr, à citer dans la description :
- INSEE (insee.fr) : recensement 2021 à l'IRIS (population, logement, activité, diplômes,
  ménages) et Filosofi 2021 (revenus) ;
- Ville de Paris (opendata.paris.fr) : secteurs scolaires des collèges, indice Atmo à Paris ;
- DGFiP (impots.gouv.fr) : barème des droits de mutation à titre onéreux, publié en PDF ;
- Atmo Auvergne-Rhône-Alpes et AtmoSud : indice Atmo à Lyon et à Marseille ;
- OpenStreetMap via Geofabrik (ODbL) : commerces et lieux du voisinage.

## API à associer (appelées en direct à chaque analyse)

| Usage | API |
|---|---|
| Recherche d'adresse | Service de géocodage de la Géoplateforme (`data.geopf.fr/geocodage`, Base Adresse Nationale) |
| Contour des communes | API Découpage administratif (`geo.api.gouv.fr`) |
| Risques à l'adresse | API Géorisques (`georisques.gouv.fr/api/v1`) |
| Carte argiles et séisme | Services cartographiques du BRGM (`geoservices.brgm.fr/risques`) |
| Parcelle cadastrale | API Carto – module Cadastre (`apicarto.ign.fr`) |
| Zonage PLU | API Carto – module GPU (Géoportail de l'Urbanisme) |
| Zones inondables (PPR) | Géoplateforme – service WFS (servitudes PM1 du Géoportail de l'Urbanisme) |
| Fonds de carte, cartes anciennes, photos aériennes | Géoplateforme – WMTS et tuiles vectorielles (Plan IGN, Cassini, état-major, orthophotos historiques) |
| Arrêts et gares | API transport.data.gouv.fr (arrêts des GTFS) |
| Qualité de l'air à l'adresse | API Atmo Data (Atmo France) |
| Performance énergétique (DPE) | DPE Logements existants (depuis juillet 2021) — API data-fair de l'ADEME (`data.ademe.fr`) |
