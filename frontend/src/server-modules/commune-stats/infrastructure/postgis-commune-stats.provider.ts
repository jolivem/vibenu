import { query } from "../../../server-shared/infrastructure/database/postgres";
import { InMemoryCache } from "../../../server-shared/infrastructure/cache/in-memory-cache";
import { CITIES, getCityForCodeInsee, type City } from "@/lib/commune-slugs";
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

/** Le driver `pg` rend les NUMERIC et les bigint en `string` : à convertir sans perdre le null. */
function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Une ligne de `insee_aggregate` : des effectifs, dont les parts sont dérivées ici. */
interface DemoRow {
  population: number | string | null;
  pop_0_14: number | string | null;
  pop_15_29: number | string | null;
  pop_30_44: number | string | null;
  pop_45_59: number | string | null;
  pop_60_74: number | string | null;
  pop_75_plus: number | string | null;
  revenu_median: number | string | null;
  taux_pauvrete: number | string | null;
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

    const city = getCityForCodeInsee(codeCommune);
    if (!city) {
      throw new Error(`No SEO city configured for codeCommune=${codeCommune}`);
    }

    const [
      prix,
      demo,
      bpeRows,
      airQuality,
      elections,
      prixBenchmarkVille,
      equipBenchmark,
      demoFrance,
    ] = await Promise.all([
      this.queryPriceStats({ codeCommune }),
      this.queryDemographics(codeCommune),
      this.queryBpeCounts(codeCommune),
      this.queryAirQuality(city),
      this.queryElections(codeCommune),
      this.getCityBenchmarkPrice(city),
      this.getCityBenchmarkEquipment(city),
      this.getFranceDemographics(),
    ]);

    const equipements = this.aggregateEquipment(bpeRows, demo.populationTotale, equipBenchmark);
    const highlights = this.computeHighlights(demo, equipements, elections);

    const stats: CommuneStats = {
      codeCommune,
      city,
      prix,
      prixBenchmarkVille,
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

  /**
   * Agrégat démographique d'un périmètre, lu dans `insee_aggregate`.
   *
   * La vue matérialisée porte déjà les sommes par commune et pour la France, calculées
   * à l'import : ce qui était deux agrégations à la volée — dont un balayage complet
   * des ~50 000 IRIS pour la France — devient un lookup par clé primaire. Surtout, il
   * n'existe plus qu'une seule définition de « l'agrégat commune » dans le code.
   *
   * Nuance héritée du passage à la vue : le revenu et le taux de pauvreté y sont
   * pondérés par la population des seuls IRIS renseignés, et non par la population
   * totale. C'est la bonne pondération — Filosofi masque les IRIS trop peu peuplés, et
   * les compter au dénominateur tirait la moyenne vers le bas.
   */
  private async queryDemographicsScope(scopeCode: string): Promise<DemographicsStats | null> {
    const rows = await query<DemoRow>(
      `SELECT population, pop_0_14, pop_15_29, pop_30_44, pop_45_59, pop_60_74,
              pop_75_plus, revenu_median, taux_pauvrete
       FROM insee_aggregate WHERE scope_code = $1`,
      [scopeCode],
    );

    const row = rows[0];
    if (!row) return null;

    const population = num(row.population) ?? 0;
    const share = (v: number | string | null) =>
      population > 0 ? (num(v) ?? 0) / population : 0;

    return {
      populationTotale: Math.round(population),
      partAges: {
        part_0_14: share(row.pop_0_14),
        part_15_29: share(row.pop_15_29),
        part_30_44: share(row.pop_30_44),
        part_45_59: share(row.pop_45_59),
        part_60_74: share(row.pop_60_74),
        part_75_plus: share(row.pop_75_plus),
      },
      revenuMedianPondere: num(row.revenu_median) !== null ? Math.round(num(row.revenu_median)!) : null,
      tauxPauvretePondere: num(row.taux_pauvrete),
    };
  }

  private async queryDemographics(codeCommune: string): Promise<DemographicsStats> {
    return (
      (await this.queryDemographicsScope(codeCommune)) ?? {
        populationTotale: 0,
        partAges: {
          part_0_14: 0,
          part_15_29: 0,
          part_30_44: 0,
          part_45_59: 0,
          part_60_74: 0,
          part_75_plus: 0,
        },
        revenuMedianPondere: null,
        tauxPauvretePondere: null,
      }
    );
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

  private async queryBpeCountsForCity(city: City): Promise<BpeCategoryRow[]> {
    return await query<BpeCategoryRow>(
      `SELECT category, COUNT(*)::int AS nb
       FROM bpe_equipment
       WHERE depcom LIKE $1
       GROUP BY category`,
      [CITIES[city].sqlPattern],
    );
  }

  private async queryAirQuality(city: City): Promise<AirQualityStats | null> {
    // Indice ATMO agrégé par ville — même donnée pour tous les arrondissements d'une ville.
    const cached = PostgisCommuneStatsProvider.atmoCache.get(city);
    if (cached !== undefined) return cached;

    const rows = await query<AirQualityAtmoRow>(
      `SELECT annee,
              jours_bonne, jours_moyenne, jours_degradee,
              jours_mauvaise, jours_tres_mauvaise, jours_extremement_mauvaise
       FROM air_quality_atmo
       WHERE ville = $1
       ORDER BY annee DESC`,
      [city],
    );

    if (rows.length === 0) {
      PostgisCommuneStatsProvider.atmoCache.set(city, null);
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
    PostgisCommuneStatsProvider.atmoCache.set(city, stats);
    return stats;
  }

  private async getFranceDemographics(): Promise<DemographicsStats | null> {
    const cached = PostgisCommuneStatsProvider.franceDemoCache.get("FRANCE");
    if (cached) return cached;

    const stats = await this.queryDemographicsScope("FRANCE");
    if (!stats || !stats.populationTotale) return null;

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

  private async getCityBenchmarkPrice(city: City): Promise<PriceStats> {
    const cached = PostgisCommuneStatsProvider.benchmarkCache.get(city);
    if (cached) return cached;
    const stats = await this.queryPriceStats({ codeCommunePattern: CITIES[city].sqlPattern });
    PostgisCommuneStatsProvider.benchmarkCache.set(city, stats);
    return stats;
  }

  private async getCityBenchmarkEquipment(city: City): Promise<EquipmentDomainStats[]> {
    const cached = PostgisCommuneStatsProvider.benchmarkEquipCache.get(city);
    if (cached) return cached;

    const cityDef = CITIES[city];
    const [bpeRows, demoCity] = await Promise.all([
      this.queryBpeCountsForCity(city),
      this.queryDemographics(cityDef.codeCommune), // code INSEE global de la ville
    ]);

    // Si le code commune global ne ramène rien (cas fréquent pour Paris/Lyon/Marseille
    // dont la "commune" INSEE peut être vide), on agrège la pop des arrondissements.
    let populationVille = demoCity.populationTotale;
    if (populationVille === 0) {
      const rows = await query<{ pop: number }>(
        `SELECT SUM(population)::int AS pop FROM iris_demographics WHERE LEFT(code_iris, 5) LIKE $1`,
        [cityDef.sqlPattern],
      );
      populationVille = rows[0]?.pop ? Number(rows[0].pop) : 0;
    }

    const result = this.aggregateEquipment(bpeRows, populationVille, null);
    PostgisCommuneStatsProvider.benchmarkEquipCache.set(city, result);
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
