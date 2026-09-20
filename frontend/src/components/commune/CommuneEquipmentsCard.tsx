import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { CITIES } from "@/lib/commune-slugs";
import { equipementsAffichables, formatInt, formatDensityPer10k, formatDelta } from "./format";
import { CardInsight } from "@/components/CardInsight";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";

interface Props {
  /** Légende IA de la section, rendue côté serveur. */
  legendes?: CommuneLegendes;
  stats: CommuneStats;
}

export function CommuneEquipmentsCard({ stats, legendes }: Props) {
  const equipements = equipementsAffichables(stats);
  const cityDef = CITIES[stats.city];

  return (
    <section className="card">
      <h2>Équipements de proximité</h2>

      <CardInsight text={legendes?.legende_equipements} animate={false} />

      <div className="commune-equip-grid">
        {equipements.map((eq) => {
          const ratio = eq.ratioVsBenchmark;
          const deltaPct = ratio !== null ? (ratio - 1) * 100 : null;
          return (
            <article key={eq.domain} className="commune-equip-card">
              <h3 className="commune-equip-title">{eq.label}</h3>
              <div className="commune-equip-count-line">
                <span className="commune-equip-nb">{formatInt(eq.nb)}</span>
                <span className="commune-equip-count-suffix">
                  {eq.nb > 1 ? "équipements" : "équipement"}
                </span>
              </div>
              <div className="commune-equip-density-line">
                {/* La donnée reste pour 1 000 hab. (le prompt de la narrative la lit ainsi) ;
                    seul l'affichage passe pour 10 000, lisible pour les équipements rares. */}
                <span className="commune-equip-density-value">
                  {formatDensityPer10k(eq.densite1000hab)}
                </span>
                <span className="commune-equip-density-unit">pour 10 000 hab.</span>
                {deltaPct !== null && Math.abs(deltaPct) >= 5 && (
                  <span
                    className={`commune-equip-delta ${deltaPct >= 0 ? "is-up" : "is-down"}`}
                    title={`Écart de densité par habitant par rapport à la moyenne de ${cityDef.nomAffiche}`}
                  >
                    {formatDelta(deltaPct, 0)} vs {cityDef.nomAffiche}
                  </span>
                )}
                {/* L'écart est retiré côté serveur : un arrondissement qui concentre l'essentiel
                    des équipements de sa ville dans une catégorie a un nombre faussé. */}
                {eq.concentrationAnormale && (
                  <span
                    className="commune-equip-delta"
                    title={`Plus de la moitié des équipements de ${cityDef.nomAffiche} d'une catégorie sont rattachés à cet arrondissement : la BPE les localise sans doute à l'adresse de leur gestionnaire.`}
                  >
                    écart non calculé
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="elections-footnote">
        Densité pour 10 000 habitants, comparée à la moyenne {cityDef.adjectif} (équipements
        rapportés à la population). Les écarts &lt; 5 % ne sont pas affichés.
      </p>
      <p className="elections-footnote">
        La BPE rattache certains équipements à l&apos;adresse de leur gestionnaire : à
        l&apos;échelle d&apos;un arrondissement, les nombres peuvent être surestimés ou
        sous-estimés. L&apos;écart n&apos;est pas calculé quand un arrondissement concentre plus
        de la moitié des équipements de sa ville dans une catégorie. Source : INSEE BPE.
      </p>
    </section>
  );
}
