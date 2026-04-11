# BienVu

Monorepo de démarrage pour **BienVu**, une application web permettant à un citoyen de saisir une adresse en France et d'obtenir une lecture simple, cartographique et compréhensible de son environnement avant de louer ou acheter un bien.

## Vision produit

BienVu n'est pas un portail immobilier complet. Le produit est pensé comme un **assistant de décision avant location/achat**.

L'utilisateur saisit une adresse en France et obtient :
- la localisation sur une carte ;
- les transports proches ;
- les risques principaux ;
- quelques données de contexte immobilier local ;
- un score synthétique ;
- un résumé en langage simple.

## Cible

- particuliers qui veulent louer un logement ;
- particuliers qui veulent acheter un logement ;
- parents qui aident un enfant à se loger ;
- personnes qui déménagent ;
- à terme : chasseurs immobiliers, courtiers, investisseurs.

## Problème utilisateur

Aujourd'hui, pour analyser une adresse, il faut consulter plusieurs sites et savoir interpréter des données dispersées : annonces, risques, transports, marché immobilier, qualité de l'air, etc.

## Proposition de valeur

BienVu centralise plusieurs sources d'information autour d'une adresse et les transforme en :
- carte lisible ;
- indicateurs simples ;
- score global ;
- résumé compréhensible ;
- points de vigilance.

## Périmètre MVP

### Fonction principale
L'utilisateur saisit une adresse en France et obtient une analyse cartographique et synthétique de l'environnement du bien.

### Fonctionnalités MVP obligatoires

#### 1. Recherche d'adresse
- champ de recherche d'adresse ;
- autocomplétion ;
- sélection d'une adresse ;
- centrage automatique de la carte.

#### 2. Carte interactive
- affichage de l'adresse choisie ;
- affichage des points d'intérêt liés aux transports ;
- affichage éventuel de couches ou badges de risque ;
- zoom / dézoom.

#### 3. Bloc Transports
- arrêts de transport proches ;
- distance estimée ;
- type d'arrêt si la donnée existe ;
- score mobilité simple.

#### 4. Bloc Risques
- présence ou absence de certains risques majeurs ;
- niveau simple : faible / modéré / élevé ;
- détail minimal par catégorie.

#### 5. Bloc Contexte immobilier
- informations simples du secteur ;
- prix ou ventes observées à proximité si disponible ;
- comparaison basique : cohérent / à creuser.

#### 6. Bloc Résumé
Une synthèse textuelle courte avec :
- points positifs ;
- points d'attention.

#### 7. Score global
Score de 0 à 100 calculé à partir de plusieurs sous-scores :
- mobilité ;
- risques ;
- contexte immobilier ;
- environnement.

## Hors périmètre MVP

- création de compte obligatoire ;
- système d'annonces immobilières ;
- estimation détaillée de bien ;
- comparateur de crédit ;
- génération PDF complexe ;
- simulation fiscale ;
- assistant conversationnel complet.

## Parcours utilisateur

1. L'utilisateur arrive sur la page d'accueil.
2. Il saisit une adresse.
3. Il choisit une suggestion.
4. La carte se centre sur cette adresse.
5. L'application charge les données associées.
6. L'utilisateur voit la carte, les indicateurs, le score et le résumé.
7. Il peut explorer les détails de chaque bloc.

## Règles métier

### Score global
Exemple de pondération MVP :
- mobilité : 30 %
- risques : 35 %
- contexte immobilier : 25 %
- environnement : 10 %

### Niveau de risque
Chaque catégorie de risque doit être transformée en une échelle simple :
- 0 = absent / faible ;
- 1 = modéré ;
- 2 = significatif ;
- 3 = élevé.

### Résumé généré
Le résumé doit être informatif, neutre et lisible pour un non-expert.

### Gestion des données incomplètes
Si une source ne répond pas, l'application ne doit pas échouer entièrement. Le bloc concerné affiche un état indisponible.

## Exigences non fonctionnelles

- affichage initial rapide ;
- résultats principaux en quelques secondes ;
- tolérance aux erreurs des API externes ;
- interface simple pour non-experts ;
- responsive ;
- validation des entrées ;
- rate limiting côté backend.

## Architecture choisie

Le projet démarre directement avec une **architecture frontend / backend séparés**.

### Frontend
Responsabilités :
- recherche d'adresse ;
- affichage de la carte ;
- affichage des résultats ;
- orchestration UI ;
- appels au backend.

Technos conseillées :
- Next.js ;
- TypeScript ;
- React ;
- Tailwind CSS ;
- MapLibre ou Leaflet.

### Backend
Responsabilités :
- orchestration des cas d'usage ;
- intégration avec les fournisseurs de données externes ;
- agrégation des données ;
- calcul des scores ;
- génération des résumés ;
- cache, logs, résilience.

Technos conseillées :
- Node.js ;
- TypeScript ;
- Fastify ;
- PostgreSQL ;
- Redis facultatif.

## Modules backend

- `address` : recherche et normalisation d'adresse ;
- `analysis` : orchestration de l'analyse complète ;
- `mobility` : transports et mobilité ;
- `risks` : risques naturels/technologiques ;
- `real-estate` : contexte immobilier ;
- `score` : calcul des sous-scores et du score global ;
- `summary` : construction du résumé textuel.

## Endpoints backend cibles

### Recherche d'adresse
`GET /api/address/search?q=...`

### Analyse d'adresse
`GET /api/location/analyze?lat=...&lon=...&label=...`

## Structure du repository

```text
bienvu/
├── README.md
├── frontend/
└── backend/
```

## Démarrage recommandé

1. Implémenter le backend `address` et `analysis`.
2. Exposer les premiers endpoints.
3. Construire le frontend avec recherche d'adresse.
4. Brancher l'écran d'analyse.
5. Ajouter progressivement mobilité, risques, immobilier, score, résumé.

## Priorités de développement

### Sprint 1
- recherche d'adresse ;
- carte ;
- affichage d'un résultat simple.

### Sprint 2
- module mobilité ;
- module risques.

### Sprint 3
- score global ;
- résumé textuel.
