import type { AgeDistributionDto, DemographicsAnalysisDto } from "@/types/location-analysis";
import { AGE_BUCKETS, AGE_CHART_DIMENSIONS, buildAgeChartModel } from "./ageChart";
import { formatDensity, formatPct, formatPopulation, formatRevenu } from "./demographicsFormat";

export function DemographicsCard({ demographics }: { demographics: DemographicsAnalysisDto }) {
  const { communeStats, nationalStats, communeIrisCount } = demographics;
  const showCommune = communeIrisCount > 1 && communeStats !== null;
  const commune = showCommune ? communeStats : null;
  const france = nationalStats;

  return (
    <section className="card">
      <h2>Démographie</h2>
      <p className="demographics-iris">
        Zone : {demographics.nomIris || demographics.codeIris}
        {demographics.nomCommune && ` — ${demographics.nomCommune}`}
      </p>
      {!showCommune && demographics.nomCommune && (
        <p className="demographics-note">
          Zone unique pour cette commune — les chiffres de la zone et de la commune sont identiques.
        </p>
      )}

      <table className="demographics-table">
        <thead>
          <tr>
            <th scope="col">Indicateur</th>
            <th scope="col">Zone</th>
            {showCommune && <th scope="col">{demographics.nomCommune || "Commune"}</th>}
            {france && <th scope="col">France</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Population</th>
            <td>{formatPopulation(demographics.population)}</td>
            {showCommune && <td>{formatPopulation(commune?.population ?? null)}</td>}
            {france && <td>{formatPopulation(france.population)}</td>}
          </tr>
          <tr>
            <th scope="row">Densité</th>
            <td>{formatDensity(demographics.density)}</td>
            {showCommune && <td>—</td>}
            {france && <td>—</td>}
          </tr>
          <tr>
            <th scope="row">Revenu médian</th>
            <td>{formatRevenu(demographics.revenuMedian)}</td>
            {showCommune && <td>{formatRevenu(commune?.revenuMedian ?? null)}</td>}
            {france && <td>{formatRevenu(france.revenuMedian)}</td>}
          </tr>
          <tr>
            <th scope="row">Taux de pauvreté</th>
            <td>{formatPct(demographics.tauxPauvrete)}</td>
            {showCommune && <td>{formatPct(commune?.tauxPauvrete ?? null)}</td>}
            {france && <td>{formatPct(france.tauxPauvrete)}</td>}
          </tr>
        </tbody>
      </table>

      {demographics.ageDistribution && (
        <div className="demographics-age">
          <h3>Répartition par âge</h3>
          <AgeChart
            iris={demographics.ageDistribution}
            commune={commune?.ageDistribution ?? null}
            france={france?.ageDistribution ?? null}
            showCommune={showCommune}
          />
        </div>
      )}

      <p className="demographics-footnote">
        Commune et France : moyennes pondérées par population calculées à partir des zones démographiques (chiffres indicatifs).
      </p>
    </section>
  );
}

function AgeChart({
  iris,
  commune,
  france,
  showCommune,
}: {
  iris: AgeDistributionDto;
  commune: AgeDistributionDto | null;
  france: AgeDistributionDto | null;
  showCommune: boolean;
}) {
  const { series, yTicks, x, y } = buildAgeChartModel({ iris, commune, france, showCommune });
  const { W, H, padL, padR, padB } = AGE_CHART_DIMENSIONS;

  return (
    <div className="age-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Répartition par âge — comparaison zone, commune et France"
        className="age-chart-svg"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} className="age-chart-grid" />
            <text x={padL - 4} y={y(t)} className="age-chart-axis age-chart-axis--y">
              {t}%
            </text>
          </g>
        ))}
        {AGE_BUCKETS.map((b, i) => (
          <text key={b.label} x={x(i)} y={H - padB + 14} className="age-chart-axis age-chart-axis--x">
            {b.label}
          </text>
        ))}
        {series.map((s) => {
          const points = AGE_BUCKETS.map((b, i) => `${x(i)},${y(s.data[b.key])}`).join(" ");
          return (
            <g key={s.name} opacity={s.opacity}>
              <polyline
                points={points}
                stroke={s.color}
                strokeWidth={s.strokeWidth}
                fill="none"
                className="age-chart-line"
              />
              {AGE_BUCKETS.map((b, i) => (
                <circle
                  key={b.label}
                  cx={x(i)}
                  cy={y(s.data[b.key])}
                  r={s.dotRadius}
                  fill={s.color}
                >
                  <title>{`${s.name} — ${b.label} : ${s.data[b.key]}%`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="age-chart-legend">
        {series.map((s) => (
          <li key={s.name}>
            <span className="age-chart-legend-dot" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
