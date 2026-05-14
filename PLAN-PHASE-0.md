# Phase 0 — Pages programmatiques SEO (arrondissements de Paris)

## Contexte

Le site n'a aujourd'hui qu'**une seule URL indexable** (la home). Le sitemap ne contient que `/`, `/analyze` est en disallow (URLs en query string). C'est le plafond de verre SEO.

La donnée est déjà en base (DVF, IRIS, BPE, élections, narrative Mistral). On peut générer des pages riches par commune sans effort éditorial humain. **Phase 0 = 20 arrondissements de Paris + 1 hub = 21 pages**, pour valider le template avant de massifier (Lyon, Marseille, top 500 communes, puis France entière).

Décision : démarrer petit, vérifier que Google indexe et juge la qualité, avant d'ouvrir l'arrosage.

## Décisions validées

| Sujet | Choix |
|---|---|
| Granularité phase 0 | **Arrondissements** (codes INSEE 75101..75120). Les arrondissements **sont des communes** dans INSEE → réutilisables avec le schéma `code_commune` existant partout. |
| Type de biens (DVF) | **Appartements uniquement** |
| Fenêtre temporelle | **24 mois glissants** |
| Comparatif | **Paris global** (`code_commune LIKE '751%'`) |
| Narrative | **JSON structuré 4 sections**, généré par Mistral, caché 90 jours |
| Qualité de l'air | **AirParif open data** (concentrations annuelles par arrondissement) |
| Risques détaillés | **Reporté phase 1** (Géorisques en WMS, pas en base) |

## Architecture cible

```
scripts/
  import_airparif.py                          ← nouveau (concentrations annuelles)

frontend/src/server-shared/infrastructure/database/migrations/
  00X-air-quality-annual.sql                  ← nouveau
  00Y-commune-narrative-cache.sql             ← nouveau

frontend/src/server-modules/commune-stats/
  domain/commune-stats.types.ts
  application/commune-stats.service.ts        ← orchestrateur sous-requêtes
  infrastructure/
    postgis-commune-stats.provider.ts         ← agrégations SQL + cache
    bpe-domain-mapping.ts                     ← mapping bpe.type → 8 domaines

frontend/src/server-modules/narrative/
  application/commune-narrative.service.ts    ← nouveau (vs adresse)
  infrastructure/
    commune-narrative.prompt.ts               ← prompt + schéma JSON output
    commune-narrative-cache.provider.ts       ← lecture/écriture cache 90j

frontend/src/lib/
  commune-slugs.ts                            ← mapping slug ↔ code_commune (en dur phase 0)

frontend/src/app/commune/
  page.tsx                                    ← hub Paris (liste les 20 arr.)
  [slug]/
    page.tsx                                  ← page arrondissement (ISR 24h)
    opengraph-image.tsx                       ← OG dynamique par arr.

frontend/src/components/commune/
  CommuneHero.tsx
  CommunePriceSection.tsx
  CommuneDemographicsSection.tsx
  CommuneEquipmentsSection.tsx
  CommuneAirQualitySection.tsx
  CommuneNarrativeSection.tsx                 ← rend les 4 sections JSON
  CommuneFaqSection.tsx
  CommuneRelatedLinks.tsx                     ← maillage interne
```

## Schémas SQL

```sql
CREATE TABLE air_quality_annual (
  code_commune  VARCHAR(5)  NOT NULL,
  annee         INTEGER     NOT NULL,
  polluant      VARCHAR(20) NOT NULL,         -- PM25 | PM10 | NO2 | O3
  concentration_moyenne NUMERIC NOT NULL,     -- µg/m³
  seuil_oms     NUMERIC,                      -- pour comparaison directe
  source        TEXT,
  PRIMARY KEY (code_commune, annee, polluant)
);

CREATE TABLE commune_narrative_cache (
  code_commune VARCHAR(5)  NOT NULL,
  model        TEXT        NOT NULL,
  version      INTEGER     NOT NULL DEFAULT 1,  -- bump si on change le prompt
  content      JSONB       NOT NULL,            -- {identite, marche, cadre, profil}
  generated_at TIMESTAMP   NOT NULL,
  PRIMARY KEY (code_commune, model, version)
);
```

## Requêtes d'agrégation clés

### Prix immo (DVF, appartements, 24 mois)
```sql
SELECT
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valeur_fonciere/surface_bati) AS prix_m2_median,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY valeur_fonciere/surface_bati) AS p25,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY valeur_fonciere/surface_bati) AS p75,
  COUNT(*) AS nb_transactions
FROM dvf_transactions
WHERE code_commune = $1
  AND type_local = 'Appartement'
  AND date_mutation >= NOW() - INTERVAL '24 months'
  AND surface_bati BETWEEN 9 AND 300
  AND (valeur_fonciere/surface_bati) BETWEEN 1000 AND 30000;
```
Benchmark Paris global : même requête avec `code_commune LIKE '751%'`.

### Démographie (IRIS agrégé)
```sql
SELECT
  SUM(population) AS population_totale,
  SUM(pop_0_14)::float/SUM(population)     AS part_0_14,
  -- ... idem pour les autres tranches
  SUM(revenu_median * population) / SUM(population) AS revenu_median_pondere,
  SUM(taux_pauvrete  * population) / SUM(population) AS taux_pauvrete_pondere
FROM iris_demographics
WHERE LEFT(code_iris, 5) = $1;
```
**À documenter dans l'UI** : "Revenu médian estimé (moyenne pondérée des médianes IRIS)" — limite méthodologique honnête.

### Équipements (BPE)
COUNT par domaine (8 domaines = Alimentaire · Restauration · Santé · Éducation · Sports/Loisirs · Culture · Services publics · Transports). Mapping `bpe.type_code → domaine` en TS (~50 entrées).

Sur ces COUNT, calculer en TS : densité (×1000/population), delta vs Paris, et générer 2-3 "highlights" (domaines avec ratio > 1.5×Paris ou < 0.5×Paris).

### Qualité air
```sql
SELECT polluant, concentration_moyenne, seuil_oms,
       (concentration_moyenne / NULLIF(seuil_oms,0)) AS ratio_oms
FROM air_quality_annual
WHERE code_commune = $1
ORDER BY annee DESC LIMIT 4;
```

## Narrative Mistral — sortie JSON structurée

**Input** : `{ identite_basique, prix_data, demo_data, equipement_data, air_data, highlights_precalcules }`.

**Output forcé** :
```json
{
  "identite":           "...",  // ~100 mots
  "marche_immobilier":  "...",  // ~150 mots
  "cadre_de_vie":       "...",  // ~150 mots
  "profil":             "..."   // ~100 mots
}
```

**Prompt système strict** :
- "Utiliser uniquement les données fournies. Ne jamais inventer."
- "Citer des nombres concrets quand disponibles."
- "Pas de superlatifs sans chiffre comparatif."
- "Si une donnée manque, l'omettre, ne pas tenter de combler."

Chaque section devient un `<section>` HTML avec un `<h2>` dans la page → 4 H2 sémantiques pour le SEO + table des matières crawlable.

**Cache** : `commune_narrative_cache`, TTL 90 jours. Régénération via bump de `version` (change de prompt = nouvelle entrée).

## SEO on-page par arrondissement

### Metadata
```ts
{
  title: "Paris 11e — Prix immobilier, démographie, cadre de vie · ClaireAdresse",
  description: `${prix} €/m² · ${population} habitants · ${revenu} € de revenu médian. Analyse complète du 11e arrondissement.`,
  alternates: { canonical: "/commune/paris-11e" },
}
```

### JSON-LD
- `Place` (name, geo coordinates centroid, containedInPlace=Paris)
- `BreadcrumbList` : Accueil > Paris > Paris 11e
- `FAQPage` : 5-6 questions auto-générées avec réponses chiffrées

### Maillage interne
- Hub `/commune/paris` liste les 20 arrondissements avec un mini-indicateur (prix m²)
- Chaque page arrondissement renvoie :
  - Vers `/commune/paris` (parent)
  - Vers les 4-5 arrondissements limitrophes (table de voisinage en dur, 20 lignes)
  - Vers la home / `/analyze` (CTA "Analyser une adresse précise dans le 11e")

### Sitemap
[frontend/src/app/sitemap.ts](frontend/src/app/sitemap.ts) — ajouter 21 URLs Paris (priority 0.8, changeFreq monthly).

### Robots
[frontend/src/app/robots.ts](frontend/src/app/robots.ts) — `/commune/*` autorisé par défaut, vérifier qu'aucune règle ne le bloque.

## Phasage futur (post phase 0)

### Phase 1 — Quartiers administratifs Paris (~80 pages)
- Import des polygones via Paris OpenData dataset `quartier_paris`
- Table `paris_quartiers (code, nom, code_ar, geom)`
- Agrégations spatiales via `ST_Within` sur le polygone
- Correspondance IRIS → quartier (table INSEE)
- Route `/quartier/[slug]`

### Phase 1 bis — Risques par arrondissement
- Pré-calcul offline des polygones d'exposition Géorisques (BRGM)
- Table `commune_risks (code_commune, type_risque, surface_exposee, pop_exposee_estimee)`
- Réutilisable pour le hub adresse aussi

### Phase 2 — Top 500 communes France
- Lyon (9 arr.), Marseille (16), Bordeaux, Lille, Toulouse, Nantes, Strasbourg, Nice...
- Toutes communes > 20 000 hab.
- Template phase 0 réutilisé à 100%
- AirParif → Atmo régional (Air Pays de la Loire, Atmo Sud, AtmoSud, Atmo Grand Est…) : un import par région ou un import unifié si LCSQA expose un dataset national
- Génération automatique des slugs depuis INSEE
- Sitemap-index multi-fichiers (la limite est 50k URLs/fichier)

### Phase 3 — 35k communes
- Activé si phase 2 montre du ranking
- Détection auto des "communes pauvres en données" → contenu minimal mais factuel + tag `noindex` si vraiment trop maigre
- Optionnel : exclure communes < 1 000 hab. (risque thin content)

### Phase 4 — Pages thématiques longue-traîne
- `/prix-immobilier/[commune]`
- `/risques/[commune]`
- `/colleges/[commune]` (croise avec le plan carte scolaire séparé)
- `/transports/[commune]`

## Risques & arbitrages

| Risque | Mitigation |
|---|---|
| Duplicate content (pages se ressemblent) | Highlights pré-calculés en TS + injectés dans le prompt comme signaux distinctifs. Comparatifs vs Paris global. |
| Hallucinations LLM | Prompt strict + output JSON typé (4 champs, longueurs cibles) + post-validation (rejet si vide ou hors plage). |
| Index Google partiel sur site jeune | Démarrer à 21 pages, monitorer Search Console 2-4 semaines, n'ouvrir phase 1 que si indexation > 80%. |
| DVF outliers (ventes anormales) | Filtres dans le SQL : `surface BETWEEN 9 AND 300`, `prix/m² BETWEEN 1000 AND 30000`, `PERCENTILE_CONT` (jamais `AVG`). |
| Revenu médian pondéré ≠ vraie médiane | Mention explicite dans l'UI : "estimation pondérée par population des IRIS". |
| Sitemap qui grossira | Anticiper sitemap-index dès phase 2. |
| Géorisques WMS, pas en base | Reporté phase 1 bis, ne bloque pas phase 0. |
| AirParif retire / change le dataset | URL versionnée dans le script, dernier import reste en base (transactionnel). |

## Vérification end-to-end

1. **Migrations SQL** appliquées localement
2. `python scripts/import_airparif.py` → `SELECT COUNT(*) FROM air_quality_annual` ≈ 20 × 4 polluants = 80
3. `pnpm dev`, ouvrir `/commune/paris-11e` → toutes les sections rendues, narrative non vide
4. Inspection manuelle des 20 pages : contenus visiblement distincts (test anti-duplicate)
5. Lighthouse SEO = 100, LCP < 2s (pages statiques)
6. Validator Google Rich Results sur `/commune/paris-11e` → 3 schémas détectés (Place, BreadcrumbList, FAQPage)
7. `curl localhost:3000/sitemap.xml` → 21 URLs Paris
8. `curl localhost:3000/commune/paris-11e` → contenu unique dans le HTML (pas seulement client-side render)

## Ordre d'implémentation

1. **Migration SQL** `air_quality_annual` + `commune_narrative_cache`
2. **Script `import_airparif.py`** + lancement local
3. **Module `commune-stats/`** : provider, service, mapping BPE
4. **Module narrative commune** : prompt builder + service + cache
5. **`lib/commune-slugs.ts`** (mapping 20 slugs → codes INSEE en dur)
6. **Route `/commune/[slug]/page.tsx`** avec `generateStaticParams` + `revalidate: 86400`
7. **Composants UI** `components/commune/*`
8. **Route hub `/commune/page.tsx`** (liste les 20)
9. **Metadata + JSON-LD** par page
10. **Sitemap** mise à jour (21 URLs)
11. **Vérification end-to-end**
