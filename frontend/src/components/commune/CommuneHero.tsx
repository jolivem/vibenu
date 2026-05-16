import type { CommuneStats } from "@/server-modules/commune-stats/domain/commune-stats.types";
import { CITIES, type CommuneSlugEntry } from "@/lib/commune-slugs";
import { formatEur, formatInt, formatDelta, pctDelta } from "./format";

interface Props {
  commune: CommuneSlugEntry;
  stats: CommuneStats;
}

export function CommuneHero({ commune, stats }: Props) {
  const deltaPrix = pctDelta(stats.prix.prixM2Median, stats.prixBenchmarkVille.prixM2Median);
  const villeNom = CITIES[stats.city].nomAffiche;

  return (
    <section className="commune-hero">
      <span className="landing-eyebrow">
        {commune.parentNom ? `${commune.parentNom} · Arrondissement` : "Métropole"}
      </span>
      <h1 className="commune-title">{commune.nomAffiche}</h1>
      <p className="commune-lead">
        Analyse complète de l&apos;arrondissement : prix immobilier, démographie, équipements
        et qualité de l&apos;air. Données publiques actualisées.
      </p>
      <div className="commune-hero-stats">
        <div className="commune-stat">
          <span className="commune-stat-label">Population</span>
          <span className="commune-stat-value">{formatInt(stats.demo.populationTotale)}</span>
        </div>
        <div className="commune-stat">
          <span className="commune-stat-label">Prix m² médian</span>
          <span className="commune-stat-value">{formatEur(stats.prix.prixM2Median)}</span>
          {deltaPrix !== null && (
            <span className={`commune-stat-delta ${deltaPrix >= 0 ? "is-up" : "is-down"}`}>
              {formatDelta(deltaPrix)} vs {villeNom}
            </span>
          )}
        </div>
        <div className="commune-stat">
          <span className="commune-stat-label">Revenu médian</span>
          <span className="commune-stat-value">{formatEur(stats.demo.revenuMedianPondere)}</span>
        </div>
        <div className="commune-stat">
          <span className="commune-stat-label">Transactions 24 mois</span>
          <span className="commune-stat-value">{formatInt(stats.prix.nbTransactions)}</span>
        </div>
      </div>
    </section>
  );
}
