# Message pour le forum #TeamOpenData (teamopendata.org)

Catégorie : celle des réutilisations / présentations de projets si elle existe, sinon la
catégorie générale. Joindre 2 ou 3 captures (carte des prix, carte des risques avec un
périmètre PPR en pointillés, une card).

---

**Titre :** ClaireAdresse — une adresse lue à travers une vingtaine de sources publiques, et ce
que ça nous a appris sur ces données

Bonjour à toutes et à tous,

Je vous présente [claireadresse.fr](https://claireadresse.fr/?utm_source=teamopendata), une
réutilisation que je développe seul : on saisit une adresse ou une commune, et le site
rassemble sur une carte ce que les données publiques en disent (prix DVF, Géorisques, zonages
PPR, PLU, arrêts de transport, BPE, recensement à l'IRIS, délinquance SSMSI, climat
Météo-France, élections, cartes et photos aériennes anciennes de l'IGN). Gratuit, sans
inscription, sans score global : chaque indicateur est montré dans son unité et comparé à la
commune ou à la France.

Au-delà de la présentation, je voulais partager quelques constats faits en croisant ces
sources, qui intéresseront peut-être des producteurs ou d'autres réutilisateurs.

**1. Des PPR publiés par leur seul périmètre.** Sur le WFS de la Géoplateforme, les servitudes
PM1 mélangent sous le même `typeass` (« Enveloppe des zonages réglementaires ») l'emprise des
zones réglementaires et, quand le zonage n'a pas été numérisé, le périmètre du plan. Le PPRNi
Brevenne Turdine (69) est ainsi un seul polygone de 427 km² : deux bassins versants entiers,
collines comprises. Même cas pour l'Yzeron (141 km²) et le Garon. Affiché tel quel, ça fait
passer des coteaux pour des zones inondables. Je les repère à leur forme (plus grand polygone
≥ 5 km², compacité de Polsby-Popper ≥ 0,25, ≥ 90 % de la surface) et je les dessine en contour
pointillé. Existe-t-il un attribut fiable que j'aurais manqué pour distinguer les deux ?

**2. Le `code_alea` n'existe que sur le générateur.** Pour trier les PPR d'inondation, il faut
joindre l'assiette à son générateur par `idgen`. Le libellé seul rate la plupart des cas : à
Vaison-la-Romaine, 15 des 17 zonages s'appellent d'après leur rivière (`OUVEZE_SEGURET`). Les
codes (11 = inondation, 12 = argiles/cavités…) sont déduits d'observation : une nomenclature
publiée serait précieuse.

**3. Des « gares » qui n'en sont pas dans les GTFS agrégés.** Sur transport.data.gouv.fr, des
réseaux d'autocars publient des zones d'arrêt (`location_type = 1`) nommées simplement
« Gare » ou « Ancienne Gare », à des endroits qu'aucun train ne dessert. Je ne classe
désormais en gare que les arrêts des jeux SNCF / TER quand ils couvrent la zone.

**4. Géorisques : le mapfile `risques` renvoie une erreur en HTTP 200.** Sur
`mapsref.brgm.fr/wxs/georisques/risques`, toute requête répond une erreur de parsing
MapServer en `text/html` avec un code 200 ; un client cartographique la prend pour une tuile
et échoue sur le décodage. J'ai basculé sur le WFS de la Géoplateforme pour les PPR.

**5. Photos aériennes anciennes : l'absence de donnée a deux formes.** Sur le WMTS de l'IGN,
une zone non couverte répond soit un 404 avec `<Exception>No data found</Exception>`, soit un
200 avec un PNG entièrement transparent (1 595 octets). Il faut tester les deux pour ne pas
afficher la photo actuelle sous un libellé « 1965-80 ».

**6. BPE : la localisation au gestionnaire.** À Paris, Lyon et Marseille, un arrondissement
peut concentrer les équipements de toute la ville (les bibliothèques de Marseille « dans » le
1er). Je masque la comparaison nationale quand un arrondissement détient plus de la moitié
d'un type d'équipement de sa ville. À l'autre bout, dans une commune de 600 habitants, une
seule bibliothèque donne « 16 pour 10 000 hab. » : je ne calcule plus de densité sous
2 000 habitants.

Je suis preneur de vos retours : sur ces contournements (il y en a sûrement de meilleurs), sur
des sources que j'aurais manquées, ou sur des erreurs d'interprétation. Le site est aussi
référencé comme réutilisation sur data.gouv.fr.

Merci pour le travail d'ouverture sans lequel rien de tout ça n'existerait.

Michel Jolivet
