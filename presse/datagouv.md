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
prévention du risque d'inondation, urbanisme, transports en commun, écoles et secteur scolaire,
commerces et équipements, population, emploi, logement et revenus du quartier, délinquance,
climat, qualité de l'air, résultats des élections, et cartes et photographies aériennes
anciennes.

Chaque indicateur est présenté dans son unité et comparé à un repère (la commune, la France),
sans score global : le site montre, il ne note pas. De courtes phrases « En bref » aident à la
lecture ; les chiffres, eux, viennent directement des fichiers publics cités, et chaque card
indique sa source.

Le site sert les particuliers avant une visite, une location ou un achat, et toute personne qui
veut comprendre un quartier ou une commune. Un export PDF est proposé. Les données sont lues sous
Licence Ouverte 2.0 (Etalab) et ODbL (OpenStreetMap).

## Mots-clés

immobilier, logement, adresse, quartier, commune, DVF, prix, risques, PPRI, inondation, PLU,
urbanisme, INSEE, IRIS, BPE, transports, délinquance, climat, élections, cartographie

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
| Climat | Données climatologiques de base – décadaires (Météo-France) | `import_climate_stations.py` |

Hors data.gouv.fr, à citer dans la description :
- INSEE (insee.fr) : recensement 2021 à l'IRIS (population, logement, activité, diplômes,
  ménages) et Filosofi 2021 (revenus) ;
- Ville de Paris (opendata.paris.fr) : secteurs scolaires des collèges, indice Atmo à Paris ;
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
