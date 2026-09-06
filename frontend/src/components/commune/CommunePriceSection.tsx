import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { CITIES } from "@/lib/commune-slugs";
import { formatEur, formatInt, formatDelta, pctDelta } from "./format";
import { CardInsight } from "@/components/CardInsight";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";

interface Props {
  /** Légende IA de la section, rendue côté serveur. */
  legendes?: CommuneLegendes;
  stats: CommuneStats;
  nomCourt: string;
}

export function CommunePriceSection({ stats, nomCourt, legendes }: Props) {
  const { prix, prixBenchmarkVille } = stats;
  const deltaPrix = pctDelta(prix.prixM2Median, prixBenchmarkVille.prixM2Median);
  const adjectif = CITIES[stats.city].adjectif;

  // Mini courbe d'évolution (SVG inline, dépendance zéro)
  const evol = prix.evolution.filter((e) => e.nbTransactions >= 30);
  const evolutionPct =
    evol.length >= 2
      ? pctDelta(evol[evol.length - 1].prixMedian, evol[0].prixMedian)
      : null;

  return (
    <section className="commune-section" id="prix-immobilier">
      <div className="commune-section-head">
        <h2 className="commune-section-title">
          Prix <i>immobilier</i>
        </h2>
        <span className="section-meta">DVF · 24 mois · appartements</span>
      </div>

      <CardInsight text={legendes?.legende_prix} animate={false} className="commune-legend" />

      <div className="commune-price-grid">
        <div className="commune-price-main">
          <span className="commune-price-label">Prix m² médian</span>
          <span className="commune-price-value">{formatEur(prix.prixM2Median)}</span>
          {deltaPrix !== null && (
            <span className={`commune-stat-delta ${deltaPrix >= 0 ? "is-up" : "is-down"}`}>
              {formatDelta(deltaPrix)} vs moyenne {adjectif} ({formatEur(prixBenchmarkVille.prixM2Median)})
            </span>
          )}
        </div>
        <div className="commune-price-range">
          <div>
            <span className="commune-stat-label">25% inférieurs à</span>
            <span className="commune-price-sub">{formatEur(prix.p25)}</span>
          </div>
          <div>
            <span className="commune-stat-label">25% supérieurs à</span>
            <span className="commune-price-sub">{formatEur(prix.p75)}</span>
          </div>
          <div>
            <span className="commune-stat-label">Transactions analysées</span>
            <span className="commune-price-sub">{formatInt(prix.nbTransactions)}</span>
          </div>
        </div>
      </div>

      {evol.length >= 2 && (
        <div className="commune-evolution">
          <h3 className="commune-h3">Évolution du prix médian</h3>
          <PriceChart points={evol} />
          {evolutionPct !== null && (
            <p className="commune-evolution-summary">
              Entre {evol[0].annee} et {evol[evol.length - 1].annee}, le prix médian de
              l&apos;appartement à {nomCourt} a évolué de{" "}
              <strong className={evolutionPct >= 0 ? "is-up" : "is-down"}>
                {formatDelta(evolutionPct)}
              </strong>
              .
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function PriceChart({ points }: { points: Array<{ annee: number; prixMedian: number }> }) {
  const W = 600;
  const H = 160;
  const PAD = 32;
  const minY = Math.min(...points.map((p) => p.prixMedian));
  const maxY = Math.max(...points.map((p) => p.prixMedian));
  const rangeY = maxY - minY || 1;
  const stepX = (W - PAD * 2) / Math.max(1, points.length - 1);

  const coords = points.map((p, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - ((p.prixMedian - minY) / rangeY) * (H - PAD * 2);
    return { x, y, ...p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <svg
      role="img"
      aria-label="Courbe d'évolution du prix médian au m²"
      viewBox={`0 0 ${W} ${H}`}
      className="commune-chart"
    >
      <path d={path} fill="none" stroke="#78be20" strokeWidth="2" />
      {coords.map((c) => (
        <g key={c.annee}>
          <circle cx={c.x} cy={c.y} r="3.5" fill="#78be20" />
          <text x={c.x} y={H - 8} textAnchor="middle" fontSize="11" fill="#6b7280">
            {c.annee}
          </text>
          <text x={c.x} y={c.y - 8} textAnchor="middle" fontSize="11" fill="#111827" fontWeight="500">
            {formatEur(c.prixMedian)}
          </text>
        </g>
      ))}
    </svg>
  );
}
