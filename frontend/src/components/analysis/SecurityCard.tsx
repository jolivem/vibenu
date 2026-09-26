import type { SecurityAnalysisDto, SecurityIndicatorDto } from "@/types/location-analysis";
import { ChartLegend } from "./ChartLegend";
import { LineChart } from "./LineChart";
import {
  baseLabel,
  buildSecurityChartModel,
  formatRate,
  isArrondissement,
  type SecurityChartReference,
} from "./securityChart";
import { CardInsight } from "@/components/CardInsight";

/**
 * Le graphe d'un indicateur et ses repères.
 *
 * Exporté pour les pages commune SEO, qui comparent l'arrondissement à sa ville et à la
 * France plutôt qu'au département.
 */
export function SecurityIndicatorChart({
  indicator,
  annees,
  maille,
  references,
}: {
  indicator: SecurityIndicatorDto;
  annees: number[];
  maille: "commune" | "arrondissement";
  /** Repères tracés à côté de la série locale. Par défaut : département et France. */
  references?: SecurityChartReference[];
}) {
  // « Cet arrondissement », pas « Cette arrondissement » : le genre ne suit pas la
  // variable. L'interpolation directe traînait depuis l'ancienne légende de card.
  const localName = maille === "arrondissement" ? "Cet arrondissement" : "Cette commune";
  const model = buildSecurityChartModel(indicator, annees, localName, references);
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
      <h3>{indicator.indicateur}</h3>
      <p className="metric-unit">faits enregistrés, {unite}</p>
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
      <ChartLegend
        items={[
          ...model.series.map((s) => ({ name: s.name, color: s.color })),
          // La pastille de fourchette n'a de sens que sur un graphe qui en porte : la
          // légende de card l'annonçait pour les cinq indicateurs, y compris ceux dont
          // toutes les valeurs sont publiées.
          //
          // Et surtout pas « entre 1 et 4 » comme libellé : l'axe est gradué en ‰, pas en
          // nombre de faits. Annoncer des faits à côté d'un axe de taux invite à lire la
          // borne sur l'axe. La conversion est donnée juste en dessous.
          ...(conversion ? [{ name: "Fourchette (valeur non publiée)", swatch: "band" as const }] : []),
        ]}
      />

      {conversion && (
        <p className="security-conversion">
          Bande verte : {conversion.annees === annees.length ? "toutes les années" : `${conversion.annees} année${conversion.annees > 1 ? "s" : ""}`}{" "}
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

      <CardInsight text={insight} />

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
          maille={maille}
        />
      ))}

      <p className="elections-footnote">
        Faits enregistrés par la police et la gendarmerie de {annees[0]} à{" "}
        {annees[annees.length - 1]}, à l&apos;échelle de{" "}
        {maille === "arrondissement"
          ? "l’arrondissement"
          : `la commune${ville ? ` de ${ville}` : ""}`}
        . Il n&apos;existe pas de donnée publique à l&apos;échelle du quartier.
      </p>
      <p className="elections-footnote">
        Il s&apos;agit de faits <strong>enregistrés</strong> : la mesure dépend aussi de la
        propension à porter plainte et de la présence policière. Les effectifs de 1 à 4 ne sont
        pas publiés, pour ne pas permettre d&apos;identifier les personnes concernées ; ils
        apparaissent ici en fourchette.
      </p>
    </section>
  );
}
