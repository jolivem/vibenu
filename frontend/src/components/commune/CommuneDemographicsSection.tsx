import type { CommuneStats, DemographicsStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import type { AgeDistributionDto } from "@/types/location-analysis";
import { AgeChart } from "@/components/analysis/AgeChart";
import { formatEur, formatInt, formatPct } from "./format";

interface Props {
  stats: CommuneStats;
  nomCourt: string;
}

/**
 * Convertit les fractions (0..1) en pourcentages (0..100) attendus par AgeChart.
 */
function toAgeDistribution(demo: DemographicsStats): AgeDistributionDto {
  return {
    pct0_14: +(demo.partAges.part_0_14 * 100).toFixed(2),
    pct15_29: +(demo.partAges.part_15_29 * 100).toFixed(2),
    pct30_44: +(demo.partAges.part_30_44 * 100).toFixed(2),
    pct45_59: +(demo.partAges.part_45_59 * 100).toFixed(2),
    pct60_74: +(demo.partAges.part_60_74 * 100).toFixed(2),
    pct75Plus: +(demo.partAges.part_75_plus * 100).toFixed(2),
  };
}

export function CommuneDemographicsSection({ stats, nomCourt }: Props) {
  const { demo, demoFrance } = stats;
  const ageCommune = toAgeDistribution(demo);
  const ageFrance = demoFrance ? toAgeDistribution(demoFrance) : null;

  return (
    <section className="commune-section commune-section--alt" id="demographie">
      <div className="commune-section-head">
        <span className="section-num">02</span>
        <h2 className="commune-section-title">
          Démographie &amp; <i>profil</i>
        </h2>
        <span className="section-meta">INSEE IRIS · agrégé arrondissement</span>
      </div>

      <div className="commune-demo-grid">
        <div className="commune-demo-stats">
          <div className="commune-stat">
            <span className="commune-stat-label">Population</span>
            <span className="commune-stat-value">{formatInt(demo.populationTotale)}</span>
          </div>
          <div className="commune-stat">
            <span className="commune-stat-label">Revenu médian estimé</span>
            <span className="commune-stat-value">{formatEur(demo.revenuMedianPondere)}</span>
            {demoFrance?.revenuMedianPondere && (
              <span className="commune-stat-meta">
                France : {formatEur(demoFrance.revenuMedianPondere)}
              </span>
            )}
          </div>
          <div className="commune-stat">
            <span className="commune-stat-label">Taux de pauvreté</span>
            <span className="commune-stat-value">{formatPct(demo.tauxPauvretePondere, 1)}</span>
            {demoFrance?.tauxPauvretePondere !== null && demoFrance?.tauxPauvretePondere !== undefined && (
              <span className="commune-stat-meta">
                France : {formatPct(demoFrance.tauxPauvretePondere, 1)}
              </span>
            )}
          </div>
        </div>

        <div className="commune-pyramid">
          <h3 className="commune-h3">Répartition par tranche d&apos;âge</h3>
          <AgeChart
            iris={ageCommune}
            france={ageFrance}
            showCommune={false}
            mainSeriesName={nomCourt}
          />
        </div>
      </div>

      <p className="commune-air-note">
        Moyennes pondérées par population calculées à partir des quartiers IRIS (INSEE) ;
        comparaison avec la France entière agrégée par la même méthode.
      </p>
    </section>
  );
}
