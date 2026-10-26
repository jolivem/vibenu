# DPE, zone tendue et bruit : les manques face aux concurrents

Statut (25/10/2026) : **plan à valider**. Les sources ont été interrogées le 25/10/2026, et les
volumes cités en viennent.

## Contexte

Cinq sites concurrents sont apparus en 2026 : Le Must Hub, BienVerifier, Geodiag, 1dex et
Immo Data. Trois sujets reviennent chez plusieurs d'entre eux et manquent à ClaireAdresse :

- la **performance énergétique (DPE)** ;
- la **zone tendue et l'encadrement des loyers** ;
- le **bruit**.

Ce plan ne reprend ni l'estimation de prix ni les notes : elles sont contraires au principe du
site, qui montre les faits sans noter. La fibre (ARCEP) reste en attente ; PLAN-V2 l'avait
notée « mode d'accès à vérifier ».

Ordre proposé, du meilleur rapport valeur/effort au moins bon : 1. zone tendue, 2. DPE,
3. bruit des aéroports. Les cartes de bruit des routes et des voies ferrées sont à revoir dans
quelques mois.

---

## 1. Zone tendue — effort faible

### Ce qu'on a déjà

La card Fiscalité affiche « Commune dans le périmètre de la taxe sur les logements vacants ».
Ce périmètre **est** le zonage « zone tendue ». Le fichier du ministère, « Liste des communes
selon le zonage TLV » (data.gouv.fr, Ministère de la Transition écologique, mis à jour le
30/12/2025, Licence Ouverte), compte 3 689 communes :

- 1 430 classées « Zone tendue » ;
- 2 259 classées « Zone touristique et tendue » ;
- 31 186 classées « Non tendue ».

Ce total de 3 689 est exactement le nombre de communes `tlv = true` déjà en base
(`local_tax_deliberation`).

### Ce qui manque

- **La distinction entre les deux catégories.** Le CSV a une colonne « Zonage TLV post décret
  22/12/2025 » (UTF-8, séparateur point-virgule, clé `CODGEO25`). Import : une colonne de plus,
  par un petit script ou dans `import_local_tax.py`.
- **Le dire là où ça sert.** Aujourd'hui l'information est enfouie dans la Fiscalité, en jargon
  fiscal. Pour un **locataire** ou un **bailleur**, elle a sa place dans la card **Loyers** :
  une ligne « Commune en zone tendue », suivie de ce que ça change.

### Les effets à afficher — à vérifier avant d'écrire

Les effets de la zone tendue sont des règles de droit. Il faut les relire sur service-public.fr
au moment d'écrire les textes, et ne rien avancer de mémoire. Ceux à vérifier :

- préavis du locataire réduit à un mois ;
- hausse du loyer limitée entre deux locataires ;
- taxe sur les logements vacants et majoration possible de la taxe d'habitation des résidences
  secondaires (déjà dans la Fiscalité, avec un renvoi).

### L'encadrement des loyers : attendre

L'encadrement des loyers (un plafond, et non un simple gel) est un dispositif différent. Il est
expérimental et s'applique dans environ 70 communes (Paris, Lyon, Lille, Bordeaux, Montpellier,
Est Ensemble, Plaine Commune, Pays basque…). **Il expire le 23 novembre 2026 sauf vote d'une
loi.** Une proposition de pérennisation, adoptée par l'Assemblée le 11/12/2025, devait passer au
Sénat le 21/10/2026 ; le gouvernement préférait une prolongation de deux ans sans nouvelles
communes. L'issue n'était pas connue au 25/10.

**Décision proposée** : ne rien coder avant que la loi soit fixée. Ensuite, s'il est prolongé :

- une ligne oui/non dans la card Loyers, d'après une liste des communes concernées tenue à la
  main (comme le barème des droits de mutation) ;
- plus tard, et peut-être jamais : les loyers de référence. Ils sont publiés ville par ville,
  dans des formats différents (Paris : « Logement - Encadrement des loyers », par quartier ;
  Lille et Montpellier publiés en 2023 sans licence claire). Ce serait beaucoup d'effort pour
  quelques villes.

### Travail

- import de la colonne (script + migration `ALTER TABLE` idempotente) ;
- une ligne dans `RentsCard` et dans la fiche PDF, textes fr et en ;
- un renvoi entre Loyers et Fiscalité, pour ne pas dire deux fois la même chose ;
- README (source), À propos (liste des sources).

---

## 2. Performance énergétique (DPE) — effort moyen

### Source : API de l'ADEME, en direct, sans import

« DPE Logements existants (depuis juillet 2021) », ADEME, Licence Ouverte 2.0.
API data-fair : `https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant`.

Testé le 25/10/2026 :

- 15,9 millions de DPE, 230 colonnes, mise à jour le 30/06/2026 ;
- **recherche par adresse** : `qs=identifiant_ban:"75115_2245_00023"`. C'est l'identifiant que
  la recherche d'adresse fournit déjà (`id` de la suggestion BAN) ;
- **recherche par rayon** : `geo_distance=lon,lat,300` ;
- **recherche par commune** : `qs=code_insee_ban:"42147"` ;
- **répartition déjà comptée par le serveur** : `/values_agg?field=etiquette_dpe` ;
- réponse en moins de 100 ms. Aucune limite de débit n'apparaît dans les en-têtes : à confirmer
  dans la documentation, et à prévoir avec le cache.

Exemples réels :

- au 23 rue du Commerce (Paris 15e), 15 DPE : 6 E, 6 F, 2 D, 1 C ;
- dans un rayon de 300 m, 5 219 DPE : E 1 609, D 1 494, F 856, C 745, G 492, B 22, A 1 ;
- dans toute la commune de Montbrison, 4 771 DPE, surtout C et D.

### Ce que la card montrerait

Une card **« Performance énergétique »** dans la section Immobilier, après Loyers.

- **L'essentiel** :
  - à l'adresse, la répartition des étiquettes des DPE réalisés (« 15 DPE à cette adresse depuis
    2021 : 6 en E, 6 en F… ») ;
  - autour, la même répartition à 300 m, comparée à la commune.

  Une barre empilée de A à G (le composant `StackedBar` existe), aux couleurs officielles de
  l'étiquette.
- **Le détail** :
  - la part des logements classés F et G autour (les « passoires thermiques »), avec le
    calendrier d'interdiction de louer ;
  - l'année de construction quand elle est renseignée ;
  - les précautions.
- **En mode commune** : la répartition de la commune seulement.
- **Sans DPE à l'adresse** (fréquent pour une maison) : la répartition du quartier, en le disant.

### Précautions à porter à l'écran

- **Un DPE vaut pour un logement, pas pour l'immeuble.** À une même adresse, les appartements
  ont des étiquettes différentes. Le site ne dit jamais « cet immeuble est en F ».
- **La base n'est pas représentative du parc.** On ne fait un DPE qu'à la vente ou à la
  location, depuis juillet 2021, et l'ADEME le dit. Formulation : « DPE réalisés », jamais
  « logements ».
- **Doublons** : un DPE refait remplace le précédent (`numero_dpe_remplace`). On écarte les DPE
  remplacés, à vérifier sur un échantillon.
- **Données personnelles** : chaque ligne porte l'étage et la porte. **On n'affiche aucune
  ligne individuelle**, seulement des comptes.
- **Calendrier d'interdiction de louer** : la loi Climat interdit de louer les logements G, puis
  F, puis E à des dates successives. Les dates sont à vérifier sur service-public.fr avant
  d'écrire. Elles ont fait l'objet de débats d'assouplissement.

### Travail

- module `server-modules/energy/` (domaine, service, fournisseur HTTP data-fair), cache mémoire
  de 7 jours (clé : identifiant BAN, ou point arrondi, ou code commune). Une source en panne
  rend `null`, comme les autres ;
- câblage dans `LocationAnalysisUseCase`, le DTO et la route ;
- la card, son « Voir plus », les textes fr et en, la ligne PDF ;
- facultatif : une clé « En bref » (`energie`). Elle suppose de toucher `card-insights.ts`, le
  prompt et l'entrée — c'est tout le circuit des invariants LLM ;
- README, À propos, et `presse/datagouv.md` (jeu à associer).

### Avant de coder : vérifier sur un échantillon

- la part d'adresses avec au moins un DPE, en ville et à la campagne ;
- la fiabilité du filtre sur les DPE remplacés ;
- le comportement de l'API sous plusieurs appels par seconde ;
- les « DPE logements existants avant juillet 2021 » (autre jeu, ancienne méthode) : on les
  ignore, leurs étiquettes ne se comparent pas.

---

## 3. Bruit — partiel, en deux temps

PLAN-V2 avait écarté le bruit : pas de couverture nationale. **Ça a bougé.** La Géoplateforme
publie désormais (vérifié le 25/10/2026) :

### 3a. Bruit des aéroports : plans d'exposition au bruit (PEB), DGAC — à faire

- couche nationale : WFS `dgac_peb_arrete_wfs` (224 aérodromes, avec le lien vers l'arrêté) et
  WMS `dgac_peb_plan_wmsv` (le plan, avec ses zones) ;
- la question posée au point de l'adresse : « est-elle dans une zone du plan d'exposition au
  bruit de tel aéroport, et laquelle (A à D) ? ». **Le PEB est une règle d'urbanisme
  opposable**, qui limite la construction dans ces zones. C'est un fait fort, et rarement
  connu de l'acheteur ;
- à vérifier : que la couche « plan » porte bien les zones en attributs (WFS ou GetFeatureInfo),
  et pas seulement une image.

Où l'afficher : une ligne dans la card **Cadastre & urbanisme** (c'est une contrainte
d'urbanisme), ou dans une card « Bruit » de la section Environnement, si 3b suit. Hors zone,
on n'affiche rien plutôt que « pas de bruit », qui serait faux.

### 3b. Bruit des routes et des voies ferrées : cartes de bruit stratégiques — attendre

- la Géoplateforme a commencé à publier les cartes de 2022 par département : couches
  `cbs2022_<dép>_…` (jour Lden et nuit Ln, routes et voies ferrées). **Un seul département au
  25/10/2026** : les Ardennes (008), publié le 06/10/2026 ;
- **décision proposée** : revoir dans trois mois. Si le déploiement est national, une card
  « Bruit » devient faisable, avec une lecture au point (« niveau de bruit routier estimé
  55-60 dB(A) en moyenne sur la journée ») ;
- précautions : ce sont des modélisations, sans valeur réglementaire, qui ne couvrent que les
  grands axes. Hors des zones cartographiées, il faut dire « non cartographié », pas « calme ».

---

## Ce que je ne ferais pas

- **Estimation du prix d'un bien** (Immo Data) : contraire au principe « on montre, on ne
  note pas », et risqué.
- **Antennes-relais et lignes haute tension** (Geodiag) : déjà écartées par PLAN-V2, anxiogènes
  plus qu'informatives.
- **Ensoleillement et ombres** (BienVerifier) : demande un modèle 3D du bâti, gros effort.

## Questions à trancher

1. L'ordre : zone tendue, puis DPE, puis PEB ?
2. Le DPE : card propre dans Immobilier, ou ligne dans la card Loyers ?
3. Le PEB : dans Cadastre & urbanisme, ou dans une future card Bruit ?
4. Une clé « En bref » pour le DPE dès la première version, ou plus tard ?
