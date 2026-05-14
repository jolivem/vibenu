import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { formatInt, formatDecimal, formatDelta } from "./format";

interface Props {
  stats: CommuneStats;
}

export function CommuneEquipmentsSection({ stats }: Props) {
  const equipements = stats.equipements.filter((e) => e.nb > 0);

  if (equipements.length === 0) {
    return null;
  }

  return (
    <section className="commune-section" id="equipements">
      <div className="commune-section-head">
        <span className="section-num">03</span>
        <h2 className="commune-section-title">
          Équipements &amp; <i>cadre de vie</i>
        </h2>
        <span className="section-meta">INSEE BPE · densité pour 1 000 hab.</span>
      </div>

      <div className="commune-equip-grid">
        {equipements.map((eq) => {
          const ratio = eq.ratioVsBenchmark;
          const deltaPct = ratio !== null ? (ratio - 1) * 100 : null;
          return (
            <article key={eq.domain} className="commune-equip-card">
              <h3 className="commune-equip-title">{eq.label}</h3>
              <div className="commune-equip-count-line">
                <span className="commune-equip-nb">{formatInt(eq.nb)}</span>
                <span className="commune-equip-count-suffix">équipements</span>
              </div>
              <div className="commune-equip-density-line">
                <span className="commune-equip-density-value">
                  {formatDecimal(eq.densite1000hab)}
                </span>
                <span className="commune-equip-density-unit">pour 1 000 hab.</span>
                {deltaPct !== null && Math.abs(deltaPct) >= 5 && (
                  <span
                    className={`commune-equip-delta ${deltaPct >= 0 ? "is-up" : "is-down"}`}
                    title="Écart de densité par habitant par rapport à la moyenne de Paris"
                  >
                    {formatDelta(deltaPct, 0)} vs Paris
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="commune-equip-note">
        Densité comparée à la moyenne parisienne (équipements rapportés à la population).
        Les écarts &lt; 5 % ne sont pas affichés.
      </p>
    </section>
  );
}
