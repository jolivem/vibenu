import type { CommuneStats, SecurityStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";
import { CITIES } from "@/lib/commune-slugs";
import { CardInsight } from "@/components/CardInsight";
import { SecurityIndicatorChart } from "@/components/analysis/SecurityCard";

interface Props {
  /** Légende IA de la section, rendue côté serveur. */
  legendes?: CommuneLegendes;
  stats: CommuneStats;
  /** Passé séparément : la page a déjà vérifié sa présence pour activer la section. */
  securite: SecurityStats;
}

/**
 * Délinquance enregistrée de l'arrondissement, face à sa ville et à la France.
 *
 * Les courbes de la card d'analyse, avec ses précautions : faits *enregistrés*, valeurs
 * masquées en fourchette, ni score ni couleur de jugement.
 */
export function CommuneSecurityCard({ stats, securite, legendes }: Props) {
  const { local, ville } = securite;
  const { annees } = local;
  const cityDef = CITIES[stats.city];

  return (
    <section className="card">
      <h2>Délinquance enregistrée</h2>

      <CardInsight text={legendes?.legende_securite} animate={false} />

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

      <p className="elections-footnote">
        Faits enregistrés par la police et la gendarmerie à l&apos;échelle de
        l&apos;arrondissement, comparés à {cityDef.nomAffiche} entière et à la France. Il
        s&apos;agit de faits <strong>enregistrés</strong> : la mesure dépend aussi de la
        propension à porter plainte et de la présence policière.
      </p>
      <p className="elections-footnote">
        Les effectifs de 1 à 4 faits ne sont pas publiés (secret statistique) : ils apparaissent
        en fourchette sur les courbes. Source : Ministère de l&apos;Intérieur (SSMSI) · Bases
        statistiques de la délinquance enregistrée, {annees[0]}–{annees[annees.length - 1]}.
      </p>
    </section>
  );
}
