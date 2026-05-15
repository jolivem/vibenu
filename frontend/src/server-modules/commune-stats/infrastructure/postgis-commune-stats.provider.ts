import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import type {
  CommuneStats,
  PriceStats,
  DemographicsStats,
  EquipmentDomainStats,
  AirQualityStats,
  AirQualityAtmoYear,
  ElectionsStats,
  ElectionCandidateResult,
  CommuneHighlights,
  EquipmentDomain,
} from "../domain/commune-stats.types";
import {
  DOMAIN_CONFIG,
  getDomainForCategory,
  getAllDomains,
  getDomainLabel,
} from "./bpe-domain-mapping";

const ONE_DAY = 24 * 60 * 60 * 1000;
const PARIS_BENCHMARK_KEY = "__paris_global__";

interface DvfAggRow {
  prix_m2_median: number | null;
  p25: number | null;
  p75: number | null;
  nb_transactions: number;
}

interface DvfEvolutionRow {
  annee: number;
  prix_median: number;
  nb_transactions: number;
}

interface DemoRow {
  population_totale: number | null;
  part_0_14: number | null;
  part_15_29: number | null;
  part_30_44: number | null;
  part_45_59: number | null;
  part_60_74: number | null;
  part_75_plus: number | null;
  revenu_median_pondere: number | null;
  taux_pauvrete_pondere: number | null;
}

interface BpeCategoryRow {
  category: string;
  nb: number;
}

interface AirQualityAtmoRow {
  annee: number;
  jours_bonne: number;
  jours_moyenne: number;
  jours_degradee: number;
  jours_mauvaise: number;
  jours_tres_mauvaise: number;
  jours_extremement_mauvaise: number;
}

interface ElectionsCommuneRow {
  code_commune: string;
  inscrits: number;
  votants: number;
  exprimes: number;
}

interface ElectionsResultRow {
  candidat: string;
  parti: string;
  panneau: number;
  voix: number;
  pct_exprimes: number;
}

/**
 * Provider d'agrégations Postgres pour les pages /commune/[slug].
 * Cache 24h par code_commune.
 */
export class PostgisCommuneStatsProvider {
  private static cache = new InMemoryCache<CommuneStats>(ONE_DAY);
  private static benchmarkCache = new InMemoryCache<PriceStats>(ONE_DAY);
  private static benchmarkEquipCache = new InMemoryCache<EquipmentDomainStats[]>(ONE_DAY);
  private static franceElectionsCache = new InMemoryCache<{
    commune: ElectionsCommuneRow | null;
    candidats: Map<string, number>; // candidat → pct exprimés France
  }>(ONE_DAY);
  private static franceDemoCache = new InMemoryCache<DemographicsStats>(ONE_DAY);
  private static atmoCache = new InMemoryCache<AirQualityStats | null>(ONE_DAY);

  async getStats(codeCommune: string): Promise<CommuneStats> {
    const cached = PostgisCommuneStatsProvider.cache.get(codeCommune);
    if (cached) return cached;

    // Benchmark Paris global, calculé une fois et caché
    const [
      prix,
      demo,
      bpeRows,
      airQuality,
      elections,
      prixBenchmarkParis,
      equipBenchmark,
      demoFrance,
    ] = await Promise.all([
      this.queryPriceStats({ codeCommune }),
      this.queryDemographics(codeCommune),
      this.queryBpeCounts(codeCommune),
      this.queryAirQuality(),
      this.queryElections(codeCommune),
      this.getParisBenchmarkPrice(),
      this.getParisBenchmarkEquipment(),
      this.getFranceDemographics(),
    ]);

    const equipements = this.aggregateEquipment(bpeRows, demo.populationTotale, equipBenchmark);
    const highlights = this.computeHighlights(demo, equipements, elections);

    const stats: CommuneStats = {
      codeCommune,
      prix,
      prixBenchmarkParis,
      demo,
      demoFrance,
      equipements,
      airQuality,
      elections,
      highlights,
    };
    PostgisCommuneStatsProvider.cache.set(codeCommune, stats);
    return stats;
  }

  /**
   * Prix m² médian + p25/p75 + évolution annuelle.
   * Filtres : appartements, 24 mois, anti-outliers.
   */
  private async queryPriceStats(opts: {
    codeCommune?: string;
    codeCommunePattern?: string;
  }): Promise<PriceStats> {
    const whereClause = opts.codeCommunePattern
      ? "code_commune LIKE $1"
      : "code_commune = $1";
    const paramValue = opts.codeCommunePattern ?? opts.codeCommune!;

    const aggRows = await query<DvfAggRow>(
      `SELECT
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valeur_fonciere/surface_bati) AS prix_m2_median,
         PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY valeur_fonciere/surface_bati) AS p25,
         PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY valeur_fonciere/surface_bati) AS p75,
         COUNT(*)::int AS nb_transactions
       FROM dvf_transactions
       WHERE ${whereClause}
         AND type_local = 'Appartement'
         AND date_mutation >= NOW() - INTERVAL '24 months'
         AND surface_bati BETWEEN 9 AND 300
         AND valeur_fonciere IS NOT NULL
         AND surface_bati > 0
         AND (valeur_fonciere/surface_bati) BETWEEN 1000 AND 30000`,
      [paramValue],
    );

    const evolutionRows = await query<DvfEvolutionRow>(
      `SELECT EXTRACT(YEAR FROM date_mutation)::int AS annee,
              PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY valeur_fonciere/surface_bati) AS prix_median,
              COUNT(*)::int AS nb_transactions
       FROM dvf_transactions
       WHERE ${whereClause}
         AND type_local = 'Appartement'
         AND date_mutation >= NOW() - INTERVAL '5 years'
         AND surface_bati BETWEEN 9 AND 300
         AND valeur_fonciere IS NOT NULL
         AND surface_bati > 0
         AND (valeur_fonciere/surface_bati) BETWEEN 1000 AND 30000
       GROUP BY annee
       ORDER BY annee`,
      [paramValue],
    );

    const agg = aggRows[0] ?? {
      prix_m2_median: null,
      p25: null,
      p75: null,
      nb_transactions: 0,
    };

    return {
      prixM2Median: agg.prix_m2_median !== null ? Math.round(Number(agg.prix_m2_median)) : null,
      p25: agg.p25 !== null ? Math.round(Number(agg.p25)) : null,
      p75: agg.p75 !== null ? Math.round(Number(agg.p75)) : null,
      nbTransactions: Number(agg.nb_transactions ?? 0),
      evolution: evolutionRows.map((r) => ({
        annee: r.annee,
        prixMedian: Math.round(Number(r.prix_median)),
        nbTransactions: r.nb_transactions,
      })),
    };
  }

  private async queryDemographics(codeCommune: string): Promise<DemographicsStats> {
    const rows = await query<DemoRow>(
      `SELECT
         SUM(population) AS population_totale,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_0_14)::float/SUM(population) END     AS part_0_14,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_15_29)::float/SUM(population) END    AS part_15_29,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_30_44)::float/SUM(population) END    AS part_30_44,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_45_59)::float/SUM(population) END    AS part_45_59,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_60_74)::float/SUM(population) END    AS part_60_74,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_75_plus)::float/SUM(population) END  AS part_75_plus,
         CASE WHEN SUM(population) > 0
              THEN SUM(revenu_median * population) / SUM(population) END AS revenu_median_pondere,
         CASE WHEN SUM(population) > 0
              THEN SUM(taux_pauvrete * population) / SUM(population) END AS taux_pauvrete_pondere
       FROM iris_demographics
       WHERE LEFT(code_iris, 5) = $1`,
      [codeCommune],
    );

    const row = rows[0] ?? null;
    const populationTotale = row?.population_totale ? Number(row.population_totale) : 0;

    return {
      populationTotale: Math.round(populationTotale),
      partAges: {
        part_0_14: Number(row?.part_0_14 ?? 0),
        part_15_29: Number(row?.part_15_29 ?? 0),
        part_30_44: Number(row?.part_30_44 ?? 0),
        part_45_59: Number(row?.part_45_59 ?? 0),
        part_60_74: Number(row?.part_60_74 ?? 0),
        part_75_plus: Number(row?.part_75_plus ?? 0),
      },
      revenuMedianPondere: row?.revenu_median_pondere !== null && row?.revenu_median_pondere !== undefined
        ? Math.round(Number(row.revenu_median_pondere))
        : null,
      tauxPauvretePondere: row?.taux_pauvrete_pondere !== null && row?.taux_pauvrete_pondere !== undefined
        ? Number(row.taux_pauvrete_pondere)
        : null,
    };
  }

  private async queryBpeCounts(codeCommune: string): Promise<BpeCategoryRow[]> {
    return await query<BpeCategoryRow>(
      `SELECT category, COUNT(*)::int AS nb
       FROM bpe_equipment
       WHERE depcom = $1
       GROUP BY category`,
      [codeCommune],
    );
  }

  private async queryBpeCountsParis(): Promise<BpeCategoryRow[]> {
    return await query<BpeCategoryRow>(
      `SELECT category, COUNT(*)::int AS nb
       FROM bpe_equipment
       WHERE depcom LIKE '751%'
       GROUP BY category`,
    );
  }

  private async queryAirQuality(): Promise<AirQualityStats | null> {
    // Indice ATMO agrégé pour Paris global — même donnée pour tous les arrondissements.
    const cached = PostgisCommuneStatsProvider.atmoCache.get("PARIS");
    if (cached !== undefined) return cached;

    const rows = await query<AirQualityAtmoRow>(
      `SELECT annee,
              jours_bonne, jours_moyenne, jours_degradee,
              jours_mauvaise, jours_tres_mauvaise, jours_extremement_mauvaise
       FROM air_quality_atmo_paris
       ORDER BY annee DESC`,
    );

    if (rows.length === 0) {
      PostgisCommuneStatsProvider.atmoCache.set("PARIS", null);
      return null;
    }

    const historique: AirQualityAtmoYear[] = rows.map((r) => {
      const joursBonne = Number(r.jours_bonne);
      const joursMoyenne = Number(r.jours_moyenne);
      const joursDegradee = Number(r.jours_degradee);
      const joursMauvaise = Number(r.jours_mauvaise);
      const joursTresMauvaise = Number(r.jours_tres_mauvaise);
      const joursExtremementMauvaise = Number(r.jours_extremement_mauvaise);
      return {
        annee: r.annee,
        joursBonne,
        joursMoyenne,
        joursDegradee,
        joursMauvaise,
        joursTresMauvaise,
        joursExtremementMauvaise,
        totalJours:
          joursBonne + joursMoyenne + joursDegradee + joursMauvaise + joursTresMauvaise + joursExtremementMauvaise,
      };
    });

    const stats: AirQualityStats = { historique };
    PostgisCommuneStatsProvider.atmoCache.set("PARIS", stats);
    return stats;
  }

  private async getFranceDemographics(): Promise<DemographicsStats | null> {
    const cached = PostgisCommuneStatsProvider.franceDemoCache.get("FRANCE");
    if (cached) return cached;

    // Agrégat France entière (toutes les IRIS).
    const rows = await query<DemoRow>(
      `SELECT
         SUM(population) AS population_totale,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_0_14)::float/SUM(population) END     AS part_0_14,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_15_29)::float/SUM(population) END    AS part_15_29,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_30_44)::float/SUM(population) END    AS part_30_44,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_45_59)::float/SUM(population) END    AS part_45_59,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_60_74)::float/SUM(population) END    AS part_60_74,
         CASE WHEN SUM(population) > 0 THEN SUM(pop_75_plus)::float/SUM(population) END  AS part_75_plus,
         CASE WHEN SUM(population) > 0
              THEN SUM(revenu_median * population) / SUM(population) END AS revenu_median_pondere,
         CASE WHEN SUM(population) > 0
              THEN SUM(taux_pauvrete * population) / SUM(population) END AS taux_pauvrete_pondere
       FROM iris_demographics`,
    );
    const row = rows[0] ?? null;
    if (!row || !row.population_totale) return null;

    const stats: DemographicsStats = {
      populationTotale: Math.round(Number(row.population_totale)),
      partAges: {
        part_0_14: Number(row.part_0_14 ?? 0),
        part_15_29: Number(row.part_15_29 ?? 0),
        part_30_44: Number(row.part_30_44 ?? 0),
        part_45_59: Number(row.part_45_59 ?? 0),
        part_60_74: Number(row.part_60_74 ?? 0),
        part_75_plus: Number(row.part_75_plus ?? 0),
      },
      revenuMedianPondere:
        row.revenu_median_pondere !== null && row.revenu_median_pondere !== undefined
          ? Math.round(Number(row.revenu_median_pondere))
          : null,
      tauxPauvretePondere:
        row.taux_pauvrete_pondere !== null && row.taux_pauvrete_pondere !== undefined
          ? Number(row.taux_pauvrete_pondere)
          : null,
    };
    PostgisCommuneStatsProvider.franceDemoCache.set("FRANCE", stats);
    return stats;
  }

  private async queryElections(codeCommune: string): Promise<ElectionsStats | null> {
    const [communeRows, candidatRows, franceBench] = await Promise.all([
      query<ElectionsCommuneRow>(
        `SELECT code_commune, inscrits, votants, exprimes
         FROM elections_pres_2022_t1_commune
         WHERE code_commune = $1`,
        [codeCommune],
      ),
      query<ElectionsResultRow>(
        `SELECT candidat, parti, panneau, voix, pct_exprimes
         FROM elections_pres_2022_t1_results
         WHERE code_commune = $1
         ORDER BY voix DESC`,
        [codeCommune],
      ),
      this.getFranceElectionsBenchmark(),
    ]);

    if (communeRows.length === 0 || candidatRows.length === 0) return null;
    const c = communeRows[0];
    const inscrits = Number(c.inscrits);
    const votants = Number(c.votants);
    const exprimes = Number(c.exprimes);

    const tauxParticipation = inscrits > 0 ? votants / inscrits : 0;
    const tauxParticipationFrance =
      franceBench.commune && Number(franceBench.commune.inscrits) > 0
        ? Number(franceBench.commune.votants) / Number(franceBench.commune.inscrits)
        : null;

    const candidats: ElectionCandidateResult[] = candidatRows.map((r) => {
      const pctCommune = Number(r.pct_exprimes);
      const pctFrance = franceBench.candidats.get(r.candidat) ?? null;
      return {
        candidat: r.candidat,
        parti: r.parti,
        panneau: Number(r.panneau),
        voix: Number(r.voix),
        pctExprimes: pctCommune,
        pctExprimesFrance: pctFrance,
        deltaPp: pctFrance !== null ? +(pctCommune - pctFrance).toFixed(2) : null,
      };
    });

    return {
      scrutin: "Présidentielle 2022 — 1er tour",
      inscrits,
      votants,
      exprimes,
      tauxParticipation,
      tauxParticipationFrance,
      candidats,
      totalInscritsFrance:
        franceBench.commune ? Number(franceBench.commune.inscrits) : null,
    };
  }

  private async getFranceElectionsBenchmark() {
    const cached = PostgisCommuneStatsProvider.franceElectionsCache.get("FRANCE");
    if (cached) return cached;

    const [communeRows, candidatRows] = await Promise.all([
      query<ElectionsCommuneRow>(
        `SELECT code_commune, inscrits, votants, exprimes
         FROM elections_pres_2022_t1_commune
         WHERE code_commune = 'FRANCE'`,
      ),
      query<ElectionsResultRow>(
        `SELECT candidat, parti, panneau, voix, pct_exprimes
         FROM elections_pres_2022_t1_results
         WHERE code_commune = 'FRANCE'`,
      ),
    ]);

    const candidatsMap = new Map<string, number>();
    for (const r of candidatRows) {
      candidatsMap.set(r.candidat, Number(r.pct_exprimes));
    }

    const result = {
      commune: communeRows[0] ?? null,
      candidats: candidatsMap,
    };
    PostgisCommuneStatsProvider.franceElectionsCache.set("FRANCE", result);
    return result;
  }

  private async getParisBenchmarkPrice(): Promise<PriceStats> {
    const cached = PostgisCommuneStatsProvider.benchmarkCache.get(PARIS_BENCHMARK_KEY);
    if (cached) return cached;
    const stats = await this.queryPriceStats({ codeCommunePattern: "751%" });
    PostgisCommuneStatsProvider.benchmarkCache.set(PARIS_BENCHMARK_KEY, stats);
    return stats;
  }

  private async getParisBenchmarkEquipment(): Promise<EquipmentDomainStats[]> {
    const cached = PostgisCommuneStatsProvider.benchmarkEquipCache.get(PARIS_BENCHMARK_KEY);
    if (cached) return cached;

    const [bpeRows, demoParis] = await Promise.all([
      this.queryBpeCountsParis(),
      this.queryDemographics("75056"), // code commune Paris global (synthèse INSEE)
    ]);

    // Si le code 75056 ne ramène rien, on agrège la pop des arrondissements
    let populationParis = demoParis.populationTotale;
    if (populationParis === 0) {
      const rows = await query<{ pop: number }>(
        `SELECT SUM(population)::int AS pop FROM iris_demographics WHERE LEFT(code_iris, 5) LIKE '751%'`,
      );
      populationParis = rows[0]?.pop ? Number(rows[0].pop) : 0;
    }

    const result = this.aggregateEquipment(bpeRows, populationParis, null);
    PostgisCommuneStatsProvider.benchmarkEquipCache.set(PARIS_BENCHMARK_KEY, result);
    return result;
  }

  private aggregateEquipment(
    bpeRows: BpeCategoryRow[],
    population: number,
    benchmark: EquipmentDomainStats[] | null,
  ): EquipmentDomainStats[] {
    const byDomain = new Map<EquipmentDomain, number>();
    for (const row of bpeRows) {
      const cfg = getDomainForCategory(row.category);
      if (!cfg) continue;
      byDomain.set(cfg.domain, (byDomain.get(cfg.domain) ?? 0) + row.nb);
    }

    return getAllDomains().map((domain) => {
      const nb = byDomain.get(domain) ?? 0;
      const densite1000hab = population > 0 ? (nb * 1000) / population : 0;
      const benchEntry = benchmark?.find((b) => b.domain === domain);
      const ratioVsBenchmark =
        benchEntry && benchEntry.densite1000hab > 0
          ? densite1000hab / benchEntry.densite1000hab
          : null;
      return {
        domain,
        label: getDomainLabel(domain),
        nb,
        densite1000hab,
        ratioVsBenchmark,
      };
    });
  }

  private computeHighlights(
    demo: DemographicsStats,
    equipements: EquipmentDomainStats[],
    elections: ElectionsStats | null,
  ): CommuneHighlights {
    // Profil âge dominant
    const ageEntries: Array<[string, number]> = [
      ["0-14 ans", demo.partAges.part_0_14],
      ["15-29 ans", demo.partAges.part_15_29],
      ["30-44 ans", demo.partAges.part_30_44],
      ["45-59 ans", demo.partAges.part_45_59],
      ["60-74 ans", demo.partAges.part_60_74],
      ["75 ans et +", demo.partAges.part_75_plus],
    ];
    ageEntries.sort((a, b) => b[1] - a[1]);
    const profilAgeDominant = ageEntries[0]?.[1] > 0 ? ageEntries[0][0] : null;

    const surperformances = equipements
      .filter((e) => e.ratioVsBenchmark !== null && e.ratioVsBenchmark >= 1.5)
      .map((e) => e.domain);
    const sousrepresentations = equipements
      .filter((e) => e.ratioVsBenchmark !== null && e.ratioVsBenchmark <= 0.5)
      .map((e) => e.domain);

    const ecartsElectorauxNotables =
      elections?.candidats
        .filter(
          (c) =>
            c.deltaPp !== null &&
            c.pctExprimesFrance !== null &&
            Math.abs(c.deltaPp) >= 5,
        )
        .map((c) => ({
          candidat: c.candidat,
          parti: c.parti,
          pctCommune: c.pctExprimes,
          pctFrance: c.pctExprimesFrance!,
          deltaPp: c.deltaPp!,
        })) ?? [];

    return {
      profilAgeDominant,
      surperformances,
      sousrepresentations,
      ecartsElectorauxNotables,
    };
  }
}
