import type { SecurityAnalysisDto, SecurityIndicatorDto } from "@/types/location-analysis";
import { ChartLegend } from "./ChartLegend";
import { LineChart } from "./LineChart";
import {
  baseLabel,
  buildSecurityChartModel,
  formatRate,
  isArrondissement,
  LOCAL_SERIES_COLOR,
} from "./securityChart";
import { CardInsight } from "@/components/CardInsight";

function SecurityIndicatorChart({
  indicator,
  annees,
}: {
  indicator: SecurityIndicatorDto;
  annees: number[];
}) {
  const model = buildSecurityChartModel(indicator, annees);
  const unite = baseLabel(indicator.base);

  // Le graphe est gradué en ‰ alors que le secret statistique s'exprime en faits. Sans
  // cette phrase, une bande allant de 4 à 18 sur l'axe se lit à tort comme « 4 à 18 faits ».
  const bandes = model.bands;
  const conversion =
    bandes.length > 0
      ? {
          lo: Math.min(...bandes.map((b) => b.low)),
          hi: Math.max(...bandes.map((b) => b.high)),
          annees: bandes.length,
        }
      : null;

  return (
    <div className="security-metric">
      <h3>
        {indicator.indicateur} <span className="security-metric-unit">({unite})</span>
      </h3>
      <LineChart
        series={model.series}
        bands={model.bands}
        xLabels={model.xLabels}
        xTitles={model.xTitles}
        yTicks={model.yTicks}
        x={model.x}
        y={model.y}
        formatValue={formatRate}
        ariaLabel={`${indicator.indicateur}, ${unite}, de ${annees[0]} à ${annees[annees.length - 1]}`}
        bandTitle={(i, low, high) =>
          `${annees[i]} — entre 1 et 4 faits (${formatRate(low)} à ${formatRate(high)}), valeur masquée par le secret statistique`
        }
      />
      {conversion && (
        <p className="security-conversion">
          Bande violette : {conversion.annees === annees.length ? "toutes les années" : `${conversion.annees} année${conversion.annees > 1 ? "s" : ""}`}{" "}
          où le chiffre exact n&apos;est pas publié. Il s&apos;agit d&apos;<strong>1 à 4 faits</strong>{" "}
          dans l&apos;année, ce qui représente ici {formatRate(conversion.lo)} à{" "}
          {formatRate(conversion.hi)} — l&apos;échelle du graphe étant en ‰, pas en nombre de faits.
        </p>
      )}
    </div>
  );
}

/**
 * Délinquance enregistrée par la police et la gendarmerie, sur 10 ans.
 *
 * Trois précautions structurent cette card, la donnée étant sensible et facile à mal lire :
 * la maille est annoncée (commune, pas quartier), la nature de la mesure est rappelée
 * (faits *enregistrés*, donc dépendants du dépôt de plainte et de la présence policière),
 * et les valeurs masquées sont montrées comme un encadrement plutôt que comme un vide.
 *
 * Pas de score, pas de classement, pas de vert ni de rouge — c'est la ligne du reste de
 * l'application : exposer les faits, laisser l'interprétation.
 */
export function SecurityCard({
  security,
  codeInsee,
  ville,
  insight,
}: {
  security: SecurityAnalysisDto;
  codeInsee?: string;
  ville?: string;
  /** Mini-synthèse IA affichée sous le titre. Absente tant qu'elle n'est pas générée. */
  insight?: string | null;
}) {
  const { annees, indicateurs } = security;
  if (indicateurs.length === 0) return null;

  const maille = isArrondissement(codeInsee) ? "arrondissement" : "commune";
  const aucunePublication = indicateurs.every((i) => i.commune.every((v) => v === null));

  return (
    <section className="card security-card">
      <h2>Sécurité</h2>
      <p className="muted">
        Faits enregistrés par la police et la gendarmerie de {annees[0]} à{" "}
        {annees[annees.length - 1]}, à l&apos;échelle de{" "}
        {maille === "arrondissement"
          ? "l’arrondissement"
          : `la commune${ville ? ` de ${ville}` : ""}`}
        . Il n&apos;existe pas de donnée publique à l&apos;échelle du quartier.
      </p>

      <CardInsight text={insight} />

      <ChartLegend
        className="security-legend"
        items={[
          { name: `Cette ${maille}`, color: LOCAL_SERIES_COLOR },
          { name: "Département", color: "#7c8ba1" },
          { name: "France", color: "#b08968" },
          // Surtout pas « entre 1 et 4 » ici : l'axe est gradué en ‰, pas en nombre de
          // faits. Annoncer des faits à côté d'un axe de taux invite à lire la borne sur
          // l'axe. La conversion est donnée sous chaque graphe et dans les infobulles.
          { name: "Fourchette (valeur non publiée)", swatch: "band" },
        ]}
      />

      {aucunePublication && (
        <p className="security-note">
          Aucune année ne dépasse 4 faits pour les indicateurs suivis : les valeurs exactes ne
          sont pas publiées, seule leur fourchette est connue.
        </p>
      )}

      {indicateurs.map((indicator) => (
        <SecurityIndicatorChart
          key={indicator.indicateur}
          indicator={indicator}
          annees={annees}
        />
      ))}

      <p className="elections-footnote">
        Il s&apos;agit de faits <strong>enregistrés</strong> : la mesure dépend aussi de la
        propension à porter plainte et de la présence policière. Les effectifs de 1 à 4 ne sont
        pas publiés, pour ne pas permettre d&apos;identifier les personnes concernées ; ils
        apparaissent ici en fourchette.
      </p>
      <p className="elections-footnote">
        Source : Ministère de l&apos;Intérieur (SSMSI) · Bases statistiques de la délinquance
        enregistrée (licence Ouverte 2.0).
      </p>
    </section>
  );
}
