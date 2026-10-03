# FrenchWeb — e-mail à la rédaction et tribune

Lien avec UTM : `https://claireadresse.fr/?utm_source=presse&utm_medium=email&utm_campaign=frenchweb`

Avant d'envoyer : vérifier sur frenchweb.fr s'il existe une rubrique tribunes / contributeurs
et ses consignes (longueur, exclusivité, photo). Si oui, adapter l'e-mail pour proposer la
tribune ; sinon, envoyer l'e-mail seul et garder la tribune pour Journal du Net ou LinkedIn.

---

## E-mail

**Objet :** Tribune — Pourquoi un « score de quartier » ne veut rien dire (et comment tenir une IA à l'écart des chiffres)

Bonjour,

J'ai développé seul claireadresse.fr, un outil gratuit qui lit une adresse française à travers
une vingtaine de sources publiques : prix réels des ventes, risques, urbanisme, transports,
équipements, population, délinquance, climat, élections. C'est une réutilisation référencée sur
data.gouv.fr.

Plutôt qu'une annonce de plus, je vous propose une tribune sur deux choix de conception qui vont
à contre-courant des outils du secteur : refuser de noter un quartier, et ne jamais laisser un
modèle de langage produire un chiffre. Le texte fait environ 800 mots, il est prêt et je peux
l'adapter à vos consignes.

Je le joins ci-dessous. Si le format ne vous convient pas, je reste disponible pour une
démonstration ou pour fournir des chiffres tirés de l'outil.

Bien cordialement,

Michel Jolivet
jolivet.michel@free.fr — [lien avec UTM]

---

## Tribune (premier jet, ~800 mots)

### Pourquoi un « score de quartier » ne veut rien dire

*Par Michel Jolivet, créateur de ClaireAdresse*

Tapez « analyser une adresse avant d'acheter » dans un moteur de recherche : une demi-douzaine
de sites vous promettent une note. Sept sur dix pour la sécurité, huit pour les commerces, un
« score d'adresse » en trente secondes. L'idée séduit : l'achat d'un logement est la décision
financière d'une vie, et un chiffre rassure. Elle est pourtant trompeuse, et construire un outil
de ce type m'a convaincu qu'il fallait faire l'inverse.

**Une note additionne des choses qui ne s'additionnent pas.** Combien vaut une zone inondable en
points de commerces ? Une école à 300 mètres compense-t-elle une ligne de train bruyante ? Tout
score global répond à ces questions à la place de l'acheteur, avec des pondérations qu'il ne voit
pas. Or elles n'ont pas de bonne réponse commune : une famille, un retraité et un investisseur
ne lisent pas le même quartier. En agrégeant, on ne simplifie pas l'information, on cache une
décision.

**Une note écrase les ordres de grandeur.** Dans les données de vente de 2024, un appartement se
vend en médiane 4 847 €/m² dans le 7e arrondissement de Marseille et 1 435 €/m² dans le 15e :
un rapport de 3,4. À Paris, l'écart entre le 6e et le 19e n'est que de 1,9. Transformez ces
prix en notes sur dix, et vous perdez précisément ce qui compte : l'ampleur de l'écart, et le
repère auquel le comparer.

**Une note ignore la qualité de la donnée.** Les sources publiques françaises sont riches, mais
inégales. Certains plans de prévention du risque d'inondation ne sont publiés que par leur
périmètre : un polygone de plusieurs centaines de kilomètres carrés, collines comprises. Un
algorithme de notation y verra une commune « entièrement inondable ». Dans les inventaires
d'équipements, une seule bibliothèque dans un village de 600 habitants produit une densité huit
fois supérieure à la moyenne nationale. Un chiffre agrégé propage ces artefacts sans que
personne ne puisse les repérer.

J'ai donc fait le choix inverse avec ClaireAdresse : montrer chaque indicateur dans son unité
(des euros par mètre carré, des faits de délinquance pour mille habitants, des jours de pluie),
le comparer à un repère explicite (la commune, la France), et signaler ses limites quand elles
existent. Quand un plan de prévention n'est publié que par son périmètre, la carte le dessine en
pointillés et le dit, au lieu de colorer tout un bassin versant en bleu. Quand une densité n'a
pas de sens, sous 2 000 habitants, elle n'est pas calculée.

**Reste la question de la lisibilité.** Vingt indicateurs bruts découragent. C'est là
qu'interviennent les modèles de langage, et c'est là qu'il faut être le plus prudent. Un modèle
à qui l'on confie des tableaux de chiffres finit toujours par en inventer un, arrondir de
travers ou tirer une tendance de deux points. Sur un sujet où une erreur peut peser dans
l'achat d'une maison, ce n'est pas acceptable.

La règle que j'applique est simple : **le programme calcule, le modèle rédige.** Les tendances,
les écarts à la moyenne nationale, les valeurs extrêmes sont décidés par du code, contre des
seuils écrits noir sur blanc. Le modèle ne reçoit que ces conclusions (« en baisse de 31 % »,
« au-dessus de la moyenne nationale »), jamais dix nombres bruts, et il a pour consigne de ne
rien calculer ni ajouter. Il ne produit qu'une phrase par rubrique, et si elle manque (quota
épuisé, réponse illisible), la rubrique s'affiche sans elle. Le modèle aide à lire ; il ne
fabrique jamais le contenu.

Ce parti pris a un coût. Il est moins spectaculaire qu'un score, moins partageable, moins
« viral ». Il demande au lecteur un effort de quelques minutes. Mais c'est le seul qui respecte
à la fois la complexité d'un lieu et l'intelligence de celui qui s'apprête à y vivre.

L'open data français permet aujourd'hui à n'importe qui de savoir, en quelques clics, ce qu'on
mettait des semaines à rassembler : les prix réellement payés dans la rue, les risques, les
projets d'urbanisme, l'histoire du terrain. La tentation est grande de refermer aussitôt cette
richesse dans une boîte noire notée sur dix. Je crois que la vraie valeur ajoutée d'un outil
est ailleurs : rendre ces données lisibles sans les trahir, et laisser la décision à celui qui
la prendra.

*Michel Jolivet a créé ClaireAdresse (claireadresse.fr), un outil gratuit et sans inscription
qui rassemble les données publiques sur une adresse ou une commune.*
