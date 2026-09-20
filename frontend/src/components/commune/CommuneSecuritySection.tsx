import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";
import { CITIES } from "@/lib/commune-slugs";
import { CardInsight } from "@/components/CardInsight";
import { SecurityIndicatorChart } from "@/components/analysis/SecurityCard";

interface Props {
  /** Légende IA de la section, rendue côté serveur. */
  legendes?: CommuneLegendes;
  stats: CommuneStats;
}

/**
 * Délinquance enregistrée de l'arrondissement, face à sa ville et à la France.
 *
 * Les courbes de la card d'analyse, avec ses précautions : faits *enregistrés*, valeurs
 * masquées en fourchette, ni score ni couleur de jugement.
 */
export function CommuneSecuritySection({ stats, legendes }: Props) {
  if (!stats.securite) return null;

  const { local, ville } = stats.securite;
  const { annees } = local;
  const cityDef = CITIES[stats.city];

  return (
    <section className="commune-section" id="securite">
      <div className="commune-section-head">
        <h2 className="commune-section-title">
          Sécurité &amp; <i>délinquance</i>
        </h2>
        <span className="section-meta">
          SSMSI · {annees[0]}–{annees[annees.length - 1]}
        </span>
      </div>

      <CardInsight text={legendes?.legende_securite} animate={false} className="commune-legend" />

      <div className="commune-security-grid">
        {local.indicateurs.map((indicator) => {
          const villeIndicator = ville?.indicateurs.find((v) => v.indicateur === indicator.indicateur);
          return (
            <SecurityIndicatorChart
              key={indicator.indicateur}
              indicator={indicator}
              annees={annees}
              maille="arrondissement"
              references={[
                ...(villeIndicator ? [{ name: cityDef.nomAffiche, values: villeIndicator.commune }] : []),
                { name: "France", values: indicator.france },
              ]}
            />
          );
        })}
      </div>

      <p className="commune-equip-note">
        Faits enregistrés par la police et la gendarmerie à l&apos;échelle de
        l&apos;arrondissement, comparés à {cityDef.nomAffiche} entière et à la France. Il
        s&apos;agit de faits <strong>enregistrés</strong> : la mesure dépend aussi de la
        propension à porter plainte et de la présence policière.
      </p>
      <p className="commune-equip-note">
        Les effectifs de 1 à 4 faits ne sont pas publiés (secret statistique) : ils apparaissent
        en fourchette sur les courbes. Source : Ministère de l&apos;Intérieur (SSMSI) · Bases
        statistiques de la délinquance enregistrée.
      </p>
    </section>
  );
}
