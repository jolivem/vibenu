-- =============================================================================
-- 017 — Enrichissement INSEE à la maille IRIS : logement, emploi, ménages
-- =============================================================================
--
-- Source : INSEE, Recensement de la population 2021, bases infracommunales (IRIS).
--   - base-ic-logement-2021                  → iris_logement
--   - base-ic-activite-residents-2021        ┐
--   - base-ic-diplomes-formation-2021        ┘ → iris_emploi
--   - base-ic-couples-familles-menages-2021  → iris_menages
-- Licence : Licence Ouverte / Open Licence (Etalab). Millésime géographique 2023.
-- Scripts d'import : scripts/import_insee_logement.py, import_insee_emploi.py,
--                    import_insee_menages.py, puis refresh_insee_aggregates.py.
--
-- POURQUOI DES EFFECTIFS BRUTS, ET JAMAIS DES POURCENTAGES
-- Toutes les colonnes ci-dessous sont des effectifs. Un repère communal ou national
-- se calcule en *rapport de sommes*, jamais en moyenne de taux : moyenner le taux de
-- propriétaires des 80 IRIS d'une ville pèserait un quartier de 900 habitants comme
-- un quartier de 3 500. Même règle que crime_reference (migration 015). Les
-- pourcentages sont dérivés une seule fois, côté TypeScript, par le même code pour
-- le quartier, la commune et la France.
--
-- PIÈGES DE DÉNOMINATEUR (ils produisent des chiffres faux, pas des erreurs)
--   1. rp_lochlmv est un SOUS-ENSEMBLE de rp_loc (« dont HLM loué vide »). Le
--      découpage du statut d'occupation est donc :
--        propriétaires | locataires privés = rp_loc - rp_lochlmv | HLM | logés gratuits
--      dénominateur rp. Empiler rp_prop + rp_loc + rp_lochlmv dépasse 100 %.
--   2. Les époques de construction (rp_ach*) somment à rp_achtot — les résidences
--      principales construites AVANT 2019 — et non à rp.
--   3. maison + appart ≈ log, avec un résidu (« autres logements »). Ne pas
--      normaliser de force à 100 % : ce serait inventer de la donnée.
--
-- TABLE HISTORIQUE : iris_demographics est reproduite ici telle qu'elle existe déjà
-- en production, `id SERIAL` compris. Elle était créée directement par
-- scripts/import_iris.py (DROP + CREATE), seule table du projet hors migrations.
-- update.sh rejoue toutes les migrations à chaque déploiement : le CREATE ci-dessous
-- sera donc un no-op en prod. C'est précisément pourquoi il doit décrire le schéma
-- *existant* à l'identique — sinon une installation neuve divergerait en silence.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- -----------------------------------------------------------------------------
-- Table historique (structure par âge + revenus Filosofi + contour IRIS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iris_demographics (
    id SERIAL PRIMARY KEY,
    code_iris VARCHAR(9) NOT NULL UNIQUE,
    nom_iris TEXT,
    nom_commune TEXT,
    population INTEGER,
    pop_0_14 INTEGER,
    pop_15_29 INTEGER,
    pop_30_44 INTEGER,
    pop_45_59 INTEGER,
    pop_60_74 INTEGER,
    pop_75_plus INTEGER,
    revenu_median NUMERIC,
    taux_pauvrete NUMERIC,
    geom GEOMETRY(MULTIPOLYGON, 4326)
);

CREATE INDEX IF NOT EXISTS idx_iris_geom ON iris_demographics USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_iris_code ON iris_demographics (code_iris);

-- -----------------------------------------------------------------------------
-- Tables sœurs — une par fichier source, jointes sur code_iris
--
-- Pas de clé étrangère vers iris_demographics, volontairement : chaque import doit
-- rester rejouable seul, dans n'importe quel ordre. Un IRIS présent dans un fichier
-- INSEE mais absent des contours devient un orphelin inoffensif — les requêtes
-- partent toujours de iris_demographics. Les orphelins sont purgés par
-- refresh_insee_aggregates.py, qui compte aussi les non-appariés : les contours sont
-- en géographie 2024, les bases RP en géographie 2023, quelques centaines d'écarts
-- sont attendus.
--
-- Pas d'`id` non plus : code_iris est la clé naturelle. L'asymétrie avec
-- iris_demographics est assumée — son `id` est un héritage de l'import initial que
-- rien ne justifie de reproduire.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS iris_logement (
    code_iris VARCHAR(9) PRIMARY KEY,
    log INTEGER,            -- parc total de logements
    rp INTEGER,             -- résidences principales
    rsecocc INTEGER,        -- résidences secondaires et logements occasionnels
    logvac INTEGER,         -- logements vacants
    maison INTEGER,
    appart INTEGER,
    rp_prop INTEGER,        -- RP occupées par leur propriétaire
    rp_loc INTEGER,         -- RP occupées par un locataire — HLM INCLUS (cf. piège 1)
    rp_lochlmv INTEGER,     -- dont HLM loué vide
    rp_grat INTEGER,        -- occupants logés gratuitement
    rp_1p INTEGER,
    rp_2p INTEGER,
    rp_3p INTEGER,
    rp_4p INTEGER,
    rp_5pp INTEGER,         -- 5 pièces ou plus
    rp_achtot INTEGER,      -- RP construites avant 2019 = dénominateur des rp_ach*
    rp_ach19 INTEGER,       -- avant 1919
    rp_ach45 INTEGER,       -- 1919-1945
    rp_ach70 INTEGER,       -- 1946-1970
    rp_ach90 INTEGER,       -- 1971-1990
    rp_ach05 INTEGER,       -- 1991-2005
    rp_ach18 INTEGER        -- 2006-2018
);

CREATE TABLE IF NOT EXISTS iris_emploi (
    code_iris VARCHAR(9) PRIMARY KEY,
    -- Activité (base-ic-activite-residents)
    pop_15_64 INTEGER,
    actifs_15_64 INTEGER,
    actifs_occ_15_64 INTEGER,
    chomeurs_15_64 INTEGER,   -- au sens du recensement (déclaratif), pas au sens du BIT
    retraites_15_64 INTEGER,
    etudiants_15_64 INTEGER,
    -- CSP des actifs OCCUPÉS de 15-64 ans (C21_ACTOCC1564_CS1..CS6). Les actifs
    -- occupés plutôt que les actifs : la CSP d'un chômeur est celle de son dernier
    -- emploi, et l'afficher doublonnerait implicitement le taux de chômage voisin.
    cs1 INTEGER,              -- agriculteurs exploitants
    cs2 INTEGER,              -- artisans, commerçants, chefs d'entreprise
    cs3 INTEGER,              -- cadres et professions intellectuelles supérieures
    cs4 INTEGER,              -- professions intermédiaires
    cs5 INTEGER,              -- employés
    cs6 INTEGER,              -- ouvriers
    -- Diplômes (base-ic-diplomes-formation). Dénominateur nscol_15p = personnes de
    -- 15 ans ou plus NON SCOLARISÉES : rapporter à la population totale ferait
    -- chuter la part de diplômés dans les quartiers étudiants.
    nscol_15p INTEGER,
    nscol_diplmin INTEGER,    -- sans diplôme ou CEP
    nscol_bepc INTEGER,
    nscol_capbep INTEGER,
    nscol_bac INTEGER,
    nscol_sup2 INTEGER,       -- Bac+2
    nscol_sup34 INTEGER,      -- Bac+3 / Bac+4
    nscol_sup5 INTEGER        -- Bac+5 et plus
);

CREATE TABLE IF NOT EXISTS iris_menages (
    code_iris VARCHAR(9) PRIMARY KEY,
    men INTEGER,              -- nombre de ménages = dénominateur de la composition
    pmen INTEGER,             -- personnes des ménages (→ taille moyenne = pmen / men)
    men_pseul INTEGER,        -- ménages d'une seule personne
    men_sfam INTEGER,         -- autres ménages sans famille
    men_fam INTEGER,          -- ménages avec au moins une famille
    men_coup_senf INTEGER,    -- couple sans enfant
    men_coup_aenf INTEGER,    -- couple avec enfant(s)
    men_fammono INTEGER,      -- famille monoparentale
    fam INTEGER,              -- nombre de familles = dénominateur des ne24f*
    ne24f0 INTEGER,           -- familles sans enfant de moins de 25 ans
    ne24f1 INTEGER,
    ne24f2 INTEGER,
    ne24f3 INTEGER,
    ne24f4p INTEGER           -- 4 enfants ou plus
);

-- -----------------------------------------------------------------------------
-- insee_aggregate — les repères commune et France, pré-calculés
--
-- Remplace deux agrégations faites à la volée à chaque cache froid, dont un
-- balayage complet des ~50 000 IRIS pour la ligne France. Une vue matérialisée
-- plutôt qu'une table peuplée en Python : contrairement à crime_reference (dont la
-- ligne FRANCE vient d'un *autre* fichier source, le secret statistique rendant la
-- somme des communes fausse), tout est ici dérivable de la base. Le SQL de
-- l'agrégat vit donc à côté des tables qu'il agrège, là où on le cherche.
--
-- GROUPING SETS : une seule passe et une seule liste d'agrégats pour les deux
-- niveaux. Le total général sort avec scope_code NULL → 'FRANCE'.
--
-- PARIS / LYON / MARSEILLE : LEFT(code_iris, 5) donne 75101…75120, pas 75056. C'est
-- cohérent avec le codeInsee que renvoie l'API adresse (la jointure fonctionne),
-- mais il n'existe pas de scope « Paris entière ». Limite héritée, assumée.
--
-- Rafraîchissement : refresh_insee_aggregates.py. Pas de REFRESH ici — update.sh
-- rejoue chaque migration à chaque déploiement, et le recalcul coûte plusieurs
-- dizaines de secondes (ST_Area sur 50 000 polygones).
-- ATTENTION : CREATE MATERIALIZED VIEW IF NOT EXISTS ne met PAS à jour une vue
-- existante. Changer la définition ci-dessous impose une migration 018 DROP + CREATE.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS insee_aggregate AS
WITH base AS (
    SELECT
        d.code_iris,
        d.population, d.pop_0_14, d.pop_15_29, d.pop_30_44,
        d.pop_45_59, d.pop_60_74, d.pop_75_plus,
        d.revenu_median, d.taux_pauvrete,
        ST_Area(d.geom::geography) / 1000000.0 AS area_km2,
        l.log, l.rp, l.rsecocc, l.logvac, l.maison, l.appart,
        l.rp_prop, l.rp_loc, l.rp_lochlmv, l.rp_grat,
        l.rp_1p, l.rp_2p, l.rp_3p, l.rp_4p, l.rp_5pp,
        l.rp_achtot, l.rp_ach19, l.rp_ach45, l.rp_ach70,
        l.rp_ach90, l.rp_ach05, l.rp_ach18,
        e.pop_15_64, e.actifs_15_64, e.actifs_occ_15_64, e.chomeurs_15_64,
        e.retraites_15_64, e.etudiants_15_64,
        e.cs1, e.cs2, e.cs3, e.cs4, e.cs5, e.cs6,
        e.nscol_15p, e.nscol_diplmin, e.nscol_bepc, e.nscol_capbep,
        e.nscol_bac, e.nscol_sup2, e.nscol_sup34, e.nscol_sup5,
        m.men, m.pmen, m.men_pseul, m.men_sfam, m.men_fam,
        m.men_coup_senf, m.men_coup_aenf, m.men_fammono,
        m.fam, m.ne24f0, m.ne24f1, m.ne24f2, m.ne24f3, m.ne24f4p
    FROM iris_demographics d
    LEFT JOIN iris_logement l ON l.code_iris = d.code_iris
    LEFT JOIN iris_emploi   e ON e.code_iris = d.code_iris
    LEFT JOIN iris_menages  m ON m.code_iris = d.code_iris
)
SELECT
    COALESCE(LEFT(code_iris, 5), 'FRANCE') AS scope_code,
    COUNT(*)::int                          AS iris_count,
    SUM(area_km2)                          AS area_km2,

    SUM(population)::bigint  AS population,
    SUM(pop_0_14)::bigint    AS pop_0_14,
    SUM(pop_15_29)::bigint   AS pop_15_29,
    SUM(pop_30_44)::bigint   AS pop_30_44,
    SUM(pop_45_59)::bigint   AS pop_45_59,
    SUM(pop_60_74)::bigint   AS pop_60_74,
    SUM(pop_75_plus)::bigint AS pop_75_plus,

    -- Revenu et pauvreté ne se somment pas : moyenne pondérée par la population des
    -- seuls IRIS renseignés (Filosofi masque les IRIS trop peu peuplés). Une moyenne
    -- pondérée de médianes n'est pas une médiane — l'écran le dit explicitement.
    SUM(revenu_median * population)
      / NULLIF(SUM(CASE WHEN revenu_median IS NOT NULL THEN population ELSE 0 END), 0)
      AS revenu_median,
    SUM(taux_pauvrete * population)
      / NULLIF(SUM(CASE WHEN taux_pauvrete IS NOT NULL THEN population ELSE 0 END), 0)
      AS taux_pauvrete,

    SUM(log)::bigint        AS log,
    SUM(rp)::bigint         AS rp,
    SUM(rsecocc)::bigint    AS rsecocc,
    SUM(logvac)::bigint     AS logvac,
    SUM(maison)::bigint     AS maison,
    SUM(appart)::bigint     AS appart,
    SUM(rp_prop)::bigint    AS rp_prop,
    SUM(rp_loc)::bigint     AS rp_loc,
    SUM(rp_lochlmv)::bigint AS rp_lochlmv,
    SUM(rp_grat)::bigint    AS rp_grat,
    SUM(rp_1p)::bigint      AS rp_1p,
    SUM(rp_2p)::bigint      AS rp_2p,
    SUM(rp_3p)::bigint      AS rp_3p,
    SUM(rp_4p)::bigint      AS rp_4p,
    SUM(rp_5pp)::bigint     AS rp_5pp,
    SUM(rp_achtot)::bigint  AS rp_achtot,
    SUM(rp_ach19)::bigint   AS rp_ach19,
    SUM(rp_ach45)::bigint   AS rp_ach45,
    SUM(rp_ach70)::bigint   AS rp_ach70,
    SUM(rp_ach90)::bigint   AS rp_ach90,
    SUM(rp_ach05)::bigint   AS rp_ach05,
    SUM(rp_ach18)::bigint   AS rp_ach18,

    SUM(pop_15_64)::bigint        AS pop_15_64,
    SUM(actifs_15_64)::bigint     AS actifs_15_64,
    SUM(actifs_occ_15_64)::bigint AS actifs_occ_15_64,
    SUM(chomeurs_15_64)::bigint   AS chomeurs_15_64,
    SUM(retraites_15_64)::bigint  AS retraites_15_64,
    SUM(etudiants_15_64)::bigint  AS etudiants_15_64,
    SUM(cs1)::bigint AS cs1,
    SUM(cs2)::bigint AS cs2,
    SUM(cs3)::bigint AS cs3,
    SUM(cs4)::bigint AS cs4,
    SUM(cs5)::bigint AS cs5,
    SUM(cs6)::bigint AS cs6,
    SUM(nscol_15p)::bigint     AS nscol_15p,
    SUM(nscol_diplmin)::bigint AS nscol_diplmin,
    SUM(nscol_bepc)::bigint    AS nscol_bepc,
    SUM(nscol_capbep)::bigint  AS nscol_capbep,
    SUM(nscol_bac)::bigint     AS nscol_bac,
    SUM(nscol_sup2)::bigint    AS nscol_sup2,
    SUM(nscol_sup34)::bigint   AS nscol_sup34,
    SUM(nscol_sup5)::bigint    AS nscol_sup5,

    SUM(men)::bigint           AS men,
    SUM(pmen)::bigint          AS pmen,
    SUM(men_pseul)::bigint     AS men_pseul,
    SUM(men_sfam)::bigint      AS men_sfam,
    SUM(men_fam)::bigint       AS men_fam,
    SUM(men_coup_senf)::bigint AS men_coup_senf,
    SUM(men_coup_aenf)::bigint AS men_coup_aenf,
    SUM(men_fammono)::bigint   AS men_fammono,
    SUM(fam)::bigint           AS fam,
    SUM(ne24f0)::bigint        AS ne24f0,
    SUM(ne24f1)::bigint        AS ne24f1,
    SUM(ne24f2)::bigint        AS ne24f2,
    SUM(ne24f3)::bigint        AS ne24f3,
    SUM(ne24f4p)::bigint       AS ne24f4p
FROM base
GROUP BY GROUPING SETS ((LEFT(code_iris, 5)), ());

-- Index UNIQUE obligatoire pour REFRESH ... CONCURRENTLY, et clé de lookup des deux
-- jointures de la requête d'analyse (commune + 'FRANCE').
CREATE UNIQUE INDEX IF NOT EXISTS insee_aggregate_scope_idx
    ON insee_aggregate (scope_code);
