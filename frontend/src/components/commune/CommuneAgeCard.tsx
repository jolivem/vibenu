import type { CommuneStats, DemographicsStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import type { AgeDistributionDto } from "@/types/location-analysis";
import { AgeChart } from "@/components/analysis/AgeChart";
import { formatEur, formatInt, formatPct } from "./format";
import { CardInsight } from "@/components/CardInsight";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";

interface Props {
  /** Légende IA de la section, rendue côté serveur. */
  legendes?: CommuneLegendes;
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

/**
 * Le plancher de la rubrique Population : qui vit là, avec quels revenus.
 *
 * Les trois chiffres passent en rangée au-dessus du graphe — dans la colonne de la
 * nouvelle ossature, le partage en deux colonnes de l'ancienne section pleine largeur
 * serrait trop la pyramide.
 */
export function CommuneAgeCard({ stats, nomCourt, legendes }: Props) {
  const { demo, demoFrance } = stats;
  const ageCommune = toAgeDistribution(demo);
  const ageFrance = demoFrance ? toAgeDistribution(demoFrance) : null;

  return (
    <section className="card">
      <h2>Âge et revenus</h2>

      <CardInsight text={legendes?.legende_demographie} animate={false} />

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

      {/* `.insee-metric` comme la card Démographie de l'analyse, et pour la même raison :
          le SVG est posé en `viewBox` avec `width: 100%`, donc sa largeur rendue met tout
          à l'échelle, libellés d'axes compris. Sans le plafond `--line-chart-max`, le
          graphe s'étirait sur les ~870 px de la colonne et affichait des axes deux fois
          plus gros que ceux des cards Emploi et Ménages juste en dessous. */}
      <div className="insee-metric">
        <h3>Répartition par tranche d&apos;âge</h3>
        <p className="metric-unit">en % de la population</p>
        <AgeChart
          iris={ageCommune}
          france={ageFrance}
          showCommune={false}
          mainSeriesName={nomCourt}
        />
      </div>

      <p className="elections-footnote">
        Moyennes pondérées par population calculées à partir des quartiers IRIS (INSEE) ;
        comparaison avec la France entière agrégée par la même méthode.
      </p>
    </section>
  );
}
