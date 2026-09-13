import type { DemographicsAnalysisDto } from "@/types/location-analysis";
import type { AnalysisMode } from "@/server-shared/types/location-analysis.dto";
import { CardInsight } from "@/components/CardInsight";
import { AgeChart } from "./AgeChart";
import { IndicatorBlock } from "./IndicatorBlock";
import { viewForMode } from "./inseeChart";
import { DEMOGRAPHICS_INDICATORS, demographicsScoped } from "./populationIndicators";

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
export function DemographicsCard({ demographics, mode, insight }: Props) {
  const scoped = demographicsScoped(demographics);

  const view = viewForMode(scoped, mode, demographics);
  if (!view) return null;

  const local = view.scoped.iris;
  const communeAges = view.showCommune ? view.scoped.commune?.ageDistribution : null;

  return (
    <section className="card">
      <h2>Démographie</h2>

      <CardInsight text={insight} />

      {DEMOGRAPHICS_INDICATORS.map((indicator) => (
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
