import type { AggregateStatsDto, DemographicsAnalysisDto, ScopedStatsDto } from "@/types/location-analysis";
import type { AnalysisMode } from "@/server-shared/types/location-analysis.dto";
import { CardInsight } from "@/components/CardInsight";
import { AgeChart } from "./AgeChart";
import {
  IndicatorBlock,
  absoluteComparison,
  ratioComparison,
  type Indicator,
} from "./IndicatorBlock";
import { viewForMode } from "./inseeChart";
import { formatDensity, formatPct, formatRevenu } from "./demographicsFormat";

interface Props {
  demographics: DemographicsAnalysisDto;
  mode: AnalysisMode;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}

/**
 * Densité, revenus et pauvreté du périmètre analysé, plus la pyramide des âges.
 *
 * La population totale n'y figure plus : elle ne se compare pas — les 67 millions
 * d'habitants de la France ne sont pas un repère pour un quartier de 2 000 — et
 * `PopulationScope` nomme déjà la zone en tête de section, pour les quatre cards.
 */
const INDICATORS: Array<Indicator<AggregateStatsDto>> = [
  {
    key: "densite",
    title: "Densité",
    unit: "habitants au km²",
    pick: (s) => s.density,
    format: formatDensity,
    // En rapport et non en écart : « 479 fois la moyenne française » se lit, « 50 615
    // hab./km² de plus » ne dit rien à l'œil.
    comparison: ratioComparison(formatDensity),
  },
  {
    key: "revenu",
    title: "Revenu médian",
    unit: "revenu disponible médian par unité de consommation",
    pick: (s) => s.revenuMedian,
    format: formatRevenu,
    comparison: absoluteComparison(formatRevenu),
  },
  {
    key: "pauvrete",
    title: "Taux de pauvreté",
    unit: "part de la population sous le seuil de 60 % du niveau de vie médian",
    pick: (s) => s.tauxPauvrete,
    format: formatPct,
  },
];

export function DemographicsCard({ demographics, mode, insight }: Props) {
  /**
   * Les champs du quartier sont à plat sur le DTO, là où les trois autres axes de la
   * rubrique suivent `{ iris, commune, france }` — irrégularité documentée dans
   * `DemographicsAnalysisDto`. On la replie ici pour réutiliser `viewForMode`, qui règle
   * d'un coup ce que cette card traitait en deux branches : en mode commune, la commune
   * devient la série principale comparée à la seule France ; en mode adresse, la colonne
   * communale s'efface quand la commune n'a qu'un IRIS.
   */
  const scoped: ScopedStatsDto<AggregateStatsDto> = {
    iris: {
      population: demographics.population,
      density: demographics.density,
      ageDistribution: demographics.ageDistribution,
      revenuMedian: demographics.revenuMedian,
      tauxPauvrete: demographics.tauxPauvrete,
    },
    commune: demographics.communeStats,
    france: demographics.nationalStats,
  };

  const view = viewForMode(scoped, mode, demographics);
  if (!view) return null;

  const local = view.scoped.iris;
  const communeAges = view.showCommune ? view.scoped.commune?.ageDistribution : null;

  return (
    <section className="card">
      <h2>Démographie</h2>

      <CardInsight text={insight} />

      {INDICATORS.map((indicator) => (
        <IndicatorBlock key={indicator.key} indicator={indicator} view={view} />
      ))}

      {/* `.insee-metric` : même gabarit que les blocs d'indicateurs ci-dessus et que les
          graphes des autres cards — titre en `h3` de plein rang, puis ligne d'unité.
          L'ancienne classe `.demographics-age` composait ce titre en légende (0,85 rem,
          gris, centré), ce qui le faisait lire comme le sous-titre du graphe plutôt que
          comme un titre de section. */}
      {local?.ageDistribution && (
        <div className="insee-metric">
          <h3>Répartition par âge</h3>
          <p className="metric-unit">en % de la population</p>
          <AgeChart
            iris={local.ageDistribution}
            commune={communeAges ?? null}
            france={view.scoped.france?.ageDistribution ?? null}
            showCommune={view.showCommune}
            mainSeriesName={view.localName}
          />
        </div>
      )}

      <p className="demographics-footnote">
        {mode === "commune"
          ? "Moyennes pondérées par population, agrégées à partir des quartiers IRIS de la commune."
          : "Commune et France : moyennes pondérées par population, calculées à partir des quartiers."}{" "}
        Le revenu médian et le taux de pauvreté ne sont publiés que pour les quartiers
        assez peuplés, plutôt urbains : ils manquent souvent à l&apos;échelle du quartier,
        et le repère France s&apos;en trouve un peu plus élevé que le taux national.
      </p>
    </section>
  );
}
