# Contrôle des données du site face aux sources publiques

Avant d'envoyer des analyses (PDF) à des journalistes : vérifier que chaque chiffre affiché par
le site — donc par le PDF, qui imprime la même réponse d'API — correspond à ce qu'un lecteur
trouverait en consultant lui-même la source publique.

Le contrôle **ne réutilise pas le code du site** : il relit chaque source par son propre chemin
(API officielle ou fichier brut téléchargé) et refait les calculs. Il compare au site **en
ligne** (claireadresse.fr) par défaut : c'est lui qui produit les PDF envoyés.

## Utilisation

```bash
cd scripts/verify

# 1. Les adresses à contrôler (une par ligne, colonne « adresse »)
$EDITOR adresses.csv

# 2. Les faits donnés au modèle pour les « En bref » : un serveur local qui les recalcule sans
#    appeler Mistral, à lancer dans un autre terminal (depuis frontend/)
NEXT_DIST_DIR=.next-test CARD_INSIGHTS_FIXTURE=1 NEXT_PUBLIC_DEBUG=true pnpm exec next dev -p 3111
#    (puis, avant tout commit : git checkout -- frontend/tsconfig.json)

# 3. Collecte : réponse du site en ligne, « En bref », faits du modèle
../venv/bin/python collect.py --facts http://localhost:3111

# 4. Contrôle et rapport (out/rapport.html)
../venv/bin/python run_verify.py
../venv/bin/python run_verify.py --domaines dvf,risks   # quelques domaines seulement
```

Les fichiers publics téléchargés (DVF, SSMSI, INSEE, ANIL, élections, Météo-France) sont gardés
dans `out/cache/` : la première exécution est longue (plusieurs centaines de Mo), les suivantes
non. `out/` n'est pas versionné.

## Lire le rapport

| Statut | Sens | Que faire |
|---|---|---|
| ❌ Erreur | le site affiche autre chose que la source | corriger avant envoi |
| 🔶 Écart de méthode | le site calcule autrement que la page publique | trancher : corriger, ou l'assumer |
| ⚠️ Arrondi | écart dans la tolérance déclarée | rien, sauf à vouloir l'expliquer |
| 👁 À relire | rien d'automatique à quoi comparer | vérifier à la main (lien fourni) |
| ✅ Identique | conforme à la source publique | — |

Chaque ligne donne le lien de la page publique où un journaliste ferait la même vérification.
Règle : aucun PDF envoyé tant qu'il reste un ❌, ou un 🔶 non tranché.

## Ce que chaque domaine compare

| Domaine (`checks/`) | Source relue |
|---|---|
| `risks` | API Géorisques `resultats_rapport_risque` (un appel par 1,2 s) |
| `dpe` | API ADEME par identifiant BAN (ancien et nouveau format) et texte d'adresse ; dédoublonnage refait |
| `dvf` | fichiers DVF géolocalisées par commune ; médiane refaite selon la méthode du site, puis vente par vente |
| `rents` | CSV « Carte des loyers » 2025 (ANIL) et zonage TLV |
| `cadastre` | API Carto (parcelle, zone PLU) au point |
| `fiscalite` | API data.economie.gouv.fr (taux, comptes) ; médianes refaites sur le fichier complet |
| `schools` | API data.education.gouv.fr par UAI (examens, VA, IPS) |
| `security` | bases communale et départementale du SSMSI ; repères France et « même taille » refaits |
| `population` | bases IRIS du recensement 2021 ; Filosofi 2021 (IRIS, commune, France) |
| `elections` | résultats officiels (commune, ou bureaux de vote pour un arrondissement) |
| `climate` | fiches climatologiques officielles de Météo-France |
| `air` | statistiques annuelles de l'AEE, station par station |
| `mobility` | base nationale des arrêts ; comptages de proximité à relire |
| `insights` | chaque nombre des « En bref » face aux faits reçus par le modèle ; mots à risque |

## Vérifier le vérificateur

Glisser une erreur dans une copie d'`analysis.json` (loyer, taux, score, surface, étiquette DPE)
doit la faire ressortir en ❌ : testé le 29/10/2026, les cinq erreurs injectées ont été
détectées.
