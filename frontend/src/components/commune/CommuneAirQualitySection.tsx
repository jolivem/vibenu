import type {
  CommuneStats,
  AirQualityAtmoYear,
} from "@/server-modules/commune-stats/domain/commune-stats.types";
import { CITIES } from "@/lib/commune-slugs";
import { CardInsight } from "@/components/CardInsight";
import type { CommuneLegendes } from "@/server-modules/narrative/domain/commune-narrative.types";
import { FEATURES } from "@/lib/site-features";

interface Props {
  stats: CommuneStats;
  /** Légende IA de la section, rendue côté serveur. */
  legendes?: CommuneLegendes;
}

type CategoryKey =
  | "joursBonne"
  | "joursMoyenne"
  | "joursDegradee"
  | "joursMauvaise"
  | "joursTresMauvaise"
  | "joursExtremementMauvaise";

const ATMO_CATEGORIES: Array<{ key: CategoryKey; label: string; color: string }> = [
  { key: "joursBonne", label: "Bon", color: "#3aa17e" },
  { key: "joursMoyenne", label: "Moyen", color: "#e2c93d" },
  { key: "joursDegradee", label: "Dégradé", color: "#e89855" },
  { key: "joursMauvaise", label: "Mauvais", color: "#d8534d" },
  { key: "joursTresMauvaise", label: "Très mauvais", color: "#8a1c3b" },
  { key: "joursExtremementMauvaise", label: "Extrêmement mauvais", color: "#451029" },
];

function pct(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function StackedBar({ year, height }: { year: AirQualityAtmoYear; height: number }) {
  return (
    <div className="commune-air-bar" style={{ height }}>
      {ATMO_CATEGORIES.map((cat) => {
        const value = year[cat.key];
        if (value <= 0) return null;
        return (
          <div
            key={cat.key}
            className="commune-air-bar-seg"
            style={{
              width: `${pct(value, year.totalJours)}%`,
              background: cat.color,
            }}
            title={`${cat.label} : ${value} jours`}
          />
        );
      })}
    </div>
  );
}

export function CommuneAirQualitySection({ stats, legendes }: Props) {
  if (!FEATURES.showAirQuality) return null;

  const cityDef = CITIES[stats.city];

  if (!stats.airQuality || stats.airQuality.historique.length === 0) {
    return (
      <section className="commune-section commune-section--alt" id="qualite-air">
        <div className="commune-section-head">
          <h2 className="commune-section-title">
            Qualité de <i>l&apos;air</i>
          </h2>
        </div>
        <p className="commune-empty">
          Données {cityDef.airSourceLabel} en cours d&apos;ingestion.
        </p>
      </section>
    );
  }

  const { historique } = stats.airQuality;
  const latest = historique[0];
  const older = historique.slice(1);

  return (
    <section className="commune-section commune-section--alt" id="qualite-air">
      <div className="commune-section-head">
        <h2 className="commune-section-title">
          Qualité de <i>l&apos;air</i>
        </h2>
        <span className="section-meta">
          {cityDef.airSourceLabel} · indice ATMO {cityDef.nomAffiche} · {latest.annee}
        </span>
      </div>

      <CardInsight text={legendes?.legende_air} animate={false} className="commune-legend" />

      <div className="commune-air-wrap">
        <div className="commune-air-latest">
          <div className="commune-air-latest-head">
            <span className="commune-air-latest-year">{latest.annee}</span>
            <span className="commune-air-latest-sub">
              {latest.totalJours} jours mesurés
            </span>
          </div>
          <StackedBar year={latest} height={28} />
          <ul className="commune-air-legend">
            {ATMO_CATEGORIES.map((cat) => {
              const value = latest[cat.key];
              return (
                <li key={cat.key} className="commune-air-legend-item">
                  <span
                    className="commune-air-legend-dot"
                    style={{ background: cat.color }}
                    aria-hidden="true"
                  />
                  <span className="commune-air-legend-label">{cat.label}</span>
                  <span className="commune-air-legend-value">
                    {value} <span className="commune-air-legend-unit">j</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {older.length > 0 && (
          <div className="commune-air-history">
            <h3 className="commune-air-history-title">Années précédentes</h3>
            <ul className="commune-air-history-list">
              {older.map((year) => (
                <li key={year.annee} className="commune-air-history-row">
                  <span className="commune-air-history-year">{year.annee}</span>
                  <div className="commune-air-history-bar">
                    <StackedBar year={year} height={12} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="commune-air-note">
        L&apos;indice ATMO synthétise quotidiennement les concentrations de polluants
        (PM2.5, PM10, NO₂, O₃, SO₂) en une catégorie. La même mesure couvre l&apos;ensemble
        de {cityDef.nomAffiche}.
      </p>
    </section>
  );
}
