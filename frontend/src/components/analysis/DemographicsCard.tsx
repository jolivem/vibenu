import type { AgeDistributionDto, DemographicsAnalysisDto } from "@/types/location-analysis";

export function DemographicsCard({ demographics }: { demographics: DemographicsAnalysisDto }) {
  const { communeStats, nationalStats, communeIrisCount } = demographics;
  const showCommune = communeIrisCount > 1 && communeStats !== null;
  const commune = showCommune ? communeStats : null;
  const france = nationalStats;

  return (
    <section className="card">
      <h2>Démographie</h2>
      <p className="demographics-iris">
        IRIS : {demographics.nomIris || demographics.codeIris}
        {demographics.nomCommune && ` — ${demographics.nomCommune}`}
      </p>
      {!showCommune && demographics.nomCommune && (
        <p className="demographics-note">
          IRIS unique pour cette commune — les chiffres IRIS et communaux sont identiques.
        </p>
      )}

      <table className="demographics-table">
        <thead>
          <tr>
            <th scope="col">Indicateur</th>
            <th scope="col">IRIS</th>
            {showCommune && <th scope="col">Commune</th>}
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
        Commune et France : moyennes pondérées par population calculées à partir des IRIS (chiffres indicatifs).
      </p>
    </section>
  );
}

const AGE_BUCKETS: ReadonlyArray<{ label: string; key: keyof AgeDistributionDto }> = [
  { label: "0-14", key: "pct0_14" },
  { label: "15-29", key: "pct15_29" },
  { label: "30-44", key: "pct30_44" },
  { label: "45-59", key: "pct45_59" },
  { label: "60-74", key: "pct60_74" },
  { label: "75+", key: "pct75Plus" },
];

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
  const series: Array<{ name: string; color: string; data: AgeDistributionDto }> = [
    { name: "IRIS", color: "#78be20", data: iris },
  ];
  if (showCommune && commune) series.push({ name: "Commune", color: "#ea580c", data: commune });
  if (france) series.push({ name: "France", color: "#6b7280", data: france });

  const allValues = series.flatMap((s) => AGE_BUCKETS.map((b) => s.data[b.key]));
  const rawMax = Math.max(...allValues, 10);
  const maxY = Math.ceil(rawMax / 5) * 5;

  const W = 400;
  const H = 220;
  const padL = 36;
  const padR = 12;
  const padT = 10;
  const padB = 38;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const x = (i: number) => padL + (i * plotW) / (AGE_BUCKETS.length - 1);
  const y = (v: number) => padT + plotH - (v / maxY) * plotH;

  const tickCount = 4;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => (maxY * i) / tickCount);

  return (
    <div className="age-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Répartition par âge — comparaison IRIS, commune et France"
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
            <g key={s.name}>
              <polyline points={points} stroke={s.color} className="age-chart-line" />
              {AGE_BUCKETS.map((b, i) => (
                <circle key={b.label} cx={x(i)} cy={y(s.data[b.key])} r={3} fill={s.color}>
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

function formatPopulation(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} hab.`;
}

function formatDensity(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString("fr-FR")} hab./km²`;
}

function formatRevenu(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value).toLocaleString("fr-FR")} €/an`;
}

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} %`;
}
