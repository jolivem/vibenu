import type { CommuneStats, SecurityStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";
import { CITIES } from "@/lib/commune-slugs";
import { CardInsight } from "@/components/CardInsight";
import { SecurityIndicatorChart } from "@/components/analysis/SecurityCard";
import { security } from "@/i18n/messages/fr/analysis/security";
import { SourceLine } from "./SourceLine";

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
                { name: "France", values: indicator.france, france: true },
              ]}
              m={security}
            />
          );
        })}
      </div>

      <SourceLine anchor="securite">
        ministère de l&apos;Intérieur (SSMSI), faits enregistrés {annees[0]}–{annees[annees.length - 1]}
      </SourceLine>
    </section>
  );
}
