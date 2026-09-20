import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { CardInsight } from "@/components/CardInsight";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";

interface Props {
  /** Légende IA de la section, rendue côté serveur. */
  legendes?: CommuneLegendes;
  stats: CommuneStats;
}

const PARTI_COLOR: Record<string, string> = {
  LO: "#bf3f3f",
  PCF: "#cc0000",
  REN: "#ffc000",
  RES: "#7e857e",
  RN: "#0d3a6b",
  REC: "#1f4068",
  LFI: "#cc0066",
  PS: "#ff8da1",
  EELV: "#3aaa35",
  LR: "#1f5fbf",
  NPA: "#7a1f1f",
  DLF: "#205d96",
};

function formatPct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")} %`;
}

function deltaLabel(delta: number): string {
  const rounded = Math.round(delta * 10) / 10;
  if (rounded === 0) return "= national";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded).toFixed(1).replace(".", ",")} pts`;
}

export function CommuneElectionsSection({ stats, legendes }: Props) {
  if (!stats.elections) return null;
  const { elections } = stats;

  // Top 5 candidats par voix (les candidats sont déjà triés par voix dans la query SQL)
  const top = elections.candidats.slice(0, 5);
  if (top.length === 0) return null;

  // Échelle commune à toutes les barres pour comparaison visuelle cohérente
  const max = Math.max(
    ...top.flatMap((c) => [c.pctExprimes, c.pctExprimesFrance ?? 0]),
    1,
  );

  const participationPct = elections.tauxParticipation * 100;
  const participationFrancePct =
    elections.tauxParticipationFrance !== null
      ? elections.tauxParticipationFrance * 100
      : null;

  return (
    <section className="commune-section" id="elections">
      <div className="commune-section-head">
        <h2 className="commune-section-title">
          Résultats <i>électoraux</i>
        </h2>
        <span className="section-meta">
          {elections.scrutin} · Ministère de l&apos;Intérieur
        </span>
      </div>

      <CardInsight text={legendes?.legende_elections} animate={false} className="commune-legend" />

      <div className="commune-elections-wrap">
        <p className="commune-elections-participation">
          Participation : <strong>{formatPct(participationPct)}</strong>
          {participationFrancePct !== null && (
            <>
              {" · "}France : {formatPct(participationFrancePct)}
            </>
          )}
        </p>

        <ul className="elections-list">
          {top.map((c) => {
            const pctCommune = c.pctExprimes;
            const pctNational = c.pctExprimesFrance ?? 0;
            const delta = c.deltaPp ?? 0;
            const wCommune = (pctCommune / max) * 100;
            const wNational = (pctNational / max) * 100;
            const color = PARTI_COLOR[c.parti] ?? "#6b7280";
            return (
              <li key={c.candidat} className="elections-row">
                <div className="elections-row-head">
                  <span className="elections-name">
                    {c.candidat}
                    <span className="elections-parti">{c.parti}</span>
                  </span>
                  <span
                    className={
                      delta > 0
                        ? "elections-delta-pill elections-delta-up"
                        : delta < 0
                          ? "elections-delta-pill elections-delta-down"
                          : "elections-delta-pill"
                    }
                  >
                    {deltaLabel(delta)}
                  </span>
                </div>

                <div className="elections-bar-row">
                  <span className="elections-bar-label">Commune</span>
                  <div className="elections-bar">
                    <div
                      className="elections-bar-fill"
                      style={{ width: `${wCommune}%`, background: color }}
                    />
                  </div>
                  <span className="elections-bar-pct">{formatPct(pctCommune)}</span>
                </div>

                {c.pctExprimesFrance !== null && (
                  <div className="elections-bar-row">
                    <span className="elections-bar-label">France</span>
                    <div className="elections-bar">
                      <div
                        className="elections-bar-fill elections-bar-fill--national"
                        style={{ width: `${wNational}%`, background: color }}
                      />
                    </div>
                    <span className="elections-bar-pct elections-bar-pct--national">
                      {formatPct(pctNational)}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <p className="elections-footnote">
          Source : Ministère de l&apos;Intérieur · Comparaison commune ↔ France à la même échelle.
        </p>
      </div>
    </section>
  );
}
